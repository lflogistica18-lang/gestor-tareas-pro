-- ============================================================
-- SPRINT 1: VISTAS SQL — Bot Readiness & Dashboard
-- Ejecutar DESPUÉS de 01_schema.sql y 02_rls.sql
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- VISTA: v_tareas_criticas_proximas
-- Tareas CRITICA que vencen en los próximos 3 días
--
-- WITH (security_barrier = true): impide que un atacante
-- que tenga acceso a la vista pueda inferir filas de otros
-- usuarios usando funciones con side-effects en un JOIN.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_tareas_criticas_proximas
  WITH (security_barrier = true)
AS
SELECT
  t.id,
  t.usuario_id,
  t.panel_id,
  p.nombre           AS panel_nombre,
  t.titulo,
  t.estado,
  t.progreso,
  t.fecha_vencimiento,
  t.esta_bloqueada,
  (t.fecha_vencimiento - NOW()) AS tiempo_restante
FROM tareas t
JOIN paneles p ON p.id = t.panel_id
WHERE
  t.urgencia = 'CRITICA'
  AND t.estado != 'CERRADA'
  AND t.fecha_vencimiento IS NOT NULL
  AND t.fecha_vencimiento <= NOW() + INTERVAL '3 days'
  AND t.fecha_vencimiento >= NOW()
ORDER BY t.fecha_vencimiento ASC;

-- ────────────────────────────────────────────────────────────
-- VISTA: v_tareas_estancadas_curacion
-- Tareas en CURACION hace más de 7 días
--
-- Usa estado_cambiado_en en lugar de updated_at para medir el tiempo
-- real en CURACIÓN. updated_at se resetea con cualquier cambio al
-- registro (ej. editar el título), lo que producía falsos negativos.
-- estado_cambiado_en solo avanza cuando el campo `estado` cambia.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_tareas_estancadas_curacion
  WITH (security_barrier = true)
AS
SELECT
  t.id,
  t.usuario_id,
  t.panel_id,
  p.nombre               AS panel_nombre,
  t.titulo,
  t.progreso,
  t.estado_cambiado_en,
  NOW() - t.estado_cambiado_en AS tiempo_en_curacion
FROM tareas t
JOIN paneles p ON p.id = t.panel_id
WHERE
  t.estado = 'CURACION'
  AND t.estado_cambiado_en <= NOW() - INTERVAL '7 days'
ORDER BY t.estado_cambiado_en ASC;

-- ────────────────────────────────────────────────────────────
-- FUNCIÓN RPC: get_stats_tiempo_por_panel
-- Para el Dashboard: horas totales agrupadas por panel
-- Acepta rango de fechas para filtrar (hoy / semana / mes)
--
-- SECURITY DEFINER: la función accede a datos con privilegios
-- del definer, pero filtra estrictamente por auth.uid() para
-- garantizar que el llamante solo ve sus propios datos.
-- SET search_path: previene search_path hijacking.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_stats_tiempo_por_panel(
  p_desde TIMESTAMPTZ DEFAULT NOW() - INTERVAL '1 day',
  p_hasta TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  panel_id       UUID,
  panel_nombre   TEXT,
  panel_color    TEXT,
  total_segundos BIGINT,
  porcentaje     NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID;
BEGIN
  -- Obtener y validar uid una sola vez para evitar llamadas repetidas
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'get_stats_tiempo_por_panel: usuario no autenticado'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Validar rango de fechas para evitar consultas absurdas
  IF p_desde > p_hasta THEN
    RAISE EXCEPTION 'get_stats_tiempo_por_panel: p_desde (%) no puede ser posterior a p_hasta (%)',
      p_desde, p_hasta
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  RETURN QUERY
  WITH tiempo_por_panel AS (
    SELECT
      pan.id                                         AS panel_id,
      pan.nombre                                     AS panel_nombre,
      pan.color_hex                                  AS panel_color,
      COALESCE(SUM(st.duracion_segundos), 0)::BIGINT AS total_segundos
    FROM paneles pan
    LEFT JOIN tareas t
      ON t.panel_id    = pan.id
      AND t.usuario_id = v_uid           -- filtro explícito: evita JOIN sin predicado de usuario
    LEFT JOIN sesiones_timer st
      ON st.tarea_id        = t.id
      AND st.usuario_id     = v_uid      -- filtro doble: no confiar solo en el JOIN con tareas
      AND st.iniciado_en    >= p_desde
      AND st.iniciado_en    <= p_hasta
      AND st.finalizado_en  IS NOT NULL
    WHERE pan.usuario_id = v_uid
    GROUP BY pan.id, pan.nombre, pan.color_hex
  ),
  total AS (
    SELECT SUM(total_segundos) AS gran_total FROM tiempo_por_panel
  )
  SELECT
    tp.panel_id,
    tp.panel_nombre,
    tp.panel_color,
    tp.total_segundos,
    CASE
      WHEN t.gran_total IS NULL OR t.gran_total = 0 THEN 0::NUMERIC
      ELSE ROUND((tp.total_segundos::NUMERIC / t.gran_total) * 100, 1)
    END AS porcentaje
  FROM tiempo_por_panel tp
  CROSS JOIN total t
  ORDER BY tp.total_segundos DESC;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- FUNCIÓN RPC: get_stats_tiempo_por_tarea
-- Para el Dashboard drill-down: horas por tarea dentro de un panel
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_stats_tiempo_por_tarea(
  p_panel_id UUID,
  p_desde    TIMESTAMPTZ DEFAULT NOW() - INTERVAL '1 day',
  p_hasta    TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  tarea_id       UUID,
  tarea_titulo   TEXT,
  tarea_estado   estado_tarea,
  tarea_urgencia urgencia_tarea,
  total_segundos BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID;
BEGIN
  -- Validar autenticación
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'get_stats_tiempo_por_tarea: usuario no autenticado'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Validar parámetros
  IF p_panel_id IS NULL THEN
    RAISE EXCEPTION 'get_stats_tiempo_por_tarea: p_panel_id no puede ser NULL'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF p_desde > p_hasta THEN
    RAISE EXCEPTION 'get_stats_tiempo_por_tarea: p_desde (%) no puede ser posterior a p_hasta (%)',
      p_desde, p_hasta
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Verificar que el panel pertenece al usuario antes de consultar
  -- (defensa en profundidad: aunque el WHERE lo filtra, falla rápido
  --  con un mensaje claro en vez de devolver un resultado vacío engañoso)
  IF NOT EXISTS (
    SELECT 1 FROM paneles WHERE id = p_panel_id AND usuario_id = v_uid
  ) THEN
    RAISE EXCEPTION 'get_stats_tiempo_por_tarea: panel % no encontrado o no pertenece al usuario',
      p_panel_id
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT
    t.id                                           AS tarea_id,
    t.titulo                                       AS tarea_titulo,
    t.estado                                       AS tarea_estado,
    t.urgencia                                     AS tarea_urgencia,
    COALESCE(SUM(st.duracion_segundos), 0)::BIGINT AS total_segundos
  FROM tareas t
  LEFT JOIN sesiones_timer st
    ON st.tarea_id       = t.id
    AND st.usuario_id    = v_uid          -- filtro explícito por usuario
    AND st.iniciado_en   >= p_desde
    AND st.iniciado_en   <= p_hasta
    AND st.finalizado_en IS NOT NULL
  WHERE
    t.panel_id   = p_panel_id
    AND t.usuario_id = v_uid
  GROUP BY t.id, t.titulo, t.estado, t.urgencia
  ORDER BY total_segundos DESC;
END;
$$;
