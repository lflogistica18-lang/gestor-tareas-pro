-- ============================================================
-- SPRINT 1: SCHEMA COMPLETO — Gestor de Tareas Personal Pro
-- Ejecutar en Supabase SQL Editor en este orden.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- EXTENSIONES
-- ────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- ENUMS (idempotentes: no fallan si ya existen)
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE estado_tarea AS ENUM ('PENDIENTE', 'EN_PROGRESO', 'CURACION', 'CERRADA');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE urgencia_tarea AS ENUM ('BAJA', 'MEDIA', 'ALTA', 'CRITICA');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE tipo_cambio_historial AS ENUM ('ESTADO', 'PROGRESO', 'FECHA', 'BLOQUEO', 'TITULO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ────────────────────────────────────────────────────────────
-- TABLA: usuarios (espejo de auth.users de Supabase)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email          TEXT NOT NULL,
  nombre_perfil  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- TABLA: paneles (vistas separadas: Laboral, Estudio, Personal)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS paneles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id  UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  slug        TEXT NOT NULL,                          -- usado en la URL /panel/[slug]
  color_hex   TEXT NOT NULL DEFAULT '#6366f1',
  orden       INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (usuario_id, slug)
);

-- ────────────────────────────────────────────────────────────
-- TABLA: categorias (pertenecen a un panel)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categorias (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id  UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  panel_id    UUID NOT NULL REFERENCES paneles(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  color_hex   TEXT NOT NULL DEFAULT '#94a3b8',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- TABLA: tareas
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tareas (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id               UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  panel_id                 UUID NOT NULL REFERENCES paneles(id) ON DELETE CASCADE,
  categoria_id             UUID REFERENCES categorias(id) ON DELETE SET NULL,
  titulo                   TEXT NOT NULL CHECK (char_length(titulo) >= 1 AND char_length(titulo) <= 255),
  detalle                  TEXT,
  progreso                 INTEGER NOT NULL DEFAULT 0 CHECK (progreso >= 0 AND progreso <= 100),
  estado                   estado_tarea NOT NULL DEFAULT 'PENDIENTE',
  urgencia                 urgencia_tarea NOT NULL DEFAULT 'MEDIA',
  esta_bloqueada           BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_vencimiento        TIMESTAMPTZ,
  personas_involucradas    TEXT[] DEFAULT '{}',
  -- Contrato Timer (UI en Sprint 5)
  tiempo_total_segundos    INTEGER NOT NULL DEFAULT 0 CHECK (tiempo_total_segundos >= 0),
  timer_activo_desde       TIMESTAMPTZ,               -- NULL = timer detenido
  -- Registra exactamente cuándo cambió el estado por última vez.
  -- A diferencia de updated_at, no se resetea con cambios a otros campos.
  -- Usado por v_tareas_estancadas_curacion para medir tiempo real en CURACIÓN.
  estado_cambiado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Regla de negocio: no cerrar sin progreso 100
CREATE OR REPLACE FUNCTION check_cierre_requiere_progreso_completo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.estado = 'CERRADA' AND NEW.progreso < 100 THEN
    RAISE EXCEPTION
      'Una tarea no puede cerrarse con progreso menor a 100. Progreso actual: %',
      NEW.progreso
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_check_cierre ON tareas;
CREATE TRIGGER tg_check_cierre
  BEFORE INSERT OR UPDATE ON tareas
  FOR EACH ROW EXECUTE FUNCTION check_cierre_requiere_progreso_completo();

-- Regla de negocio: máquina de estados — solo transiciones válidas permitidas
-- Transiciones válidas:
--   NULL        → PENDIENTE   (INSERT inicial)
--   PENDIENTE   → EN_PROGRESO
--   EN_PROGRESO → CURACION
--   CURACION    → CERRADA     (solo si progreso = 100, validado por tg_check_cierre)
--   CURACION    → EN_PROGRESO (retroceso si falla revisión)
-- Cualquier otra combinación lanza EXCEPTION con ERRCODE = 'check_violation'.
CREATE OR REPLACE FUNCTION check_transicion_estado_valida()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- En INSERT el estado anterior es siempre NULL; la única transición
  -- permitida es NULL → PENDIENTE (el DEFAULT de la columna).
  IF TG_OP = 'INSERT' THEN
    IF NEW.estado != 'PENDIENTE' THEN
      RAISE EXCEPTION
        'Transición de estado inválida en INSERT: solo se permite estado = PENDIENTE al crear una tarea. Estado recibido: %',
        NEW.estado
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;

  -- En UPDATE validamos la secuencia OLD → NEW.
  -- Si el estado no cambió no hay nada que validar.
  IF OLD.estado IS NOT DISTINCT FROM NEW.estado THEN
    RETURN NEW;
  END IF;

  -- Transiciones permitidas en UPDATE
  IF (OLD.estado = 'PENDIENTE'   AND NEW.estado = 'EN_PROGRESO') OR
     (OLD.estado = 'EN_PROGRESO' AND NEW.estado = 'CURACION')    OR
     (OLD.estado = 'CURACION'    AND NEW.estado = 'CERRADA')     OR
     (OLD.estado = 'CURACION'    AND NEW.estado = 'EN_PROGRESO')
  THEN
    RETURN NEW;
  END IF;

  -- Cualquier otra combinación es inválida
  RAISE EXCEPTION
    'Transición de estado inválida: % → % no está permitida por el flujo de trabajo.',
    OLD.estado, NEW.estado
    USING ERRCODE = 'check_violation';
END;
$$;

DROP TRIGGER IF EXISTS tg_check_transicion_estado ON tareas;
CREATE TRIGGER tg_check_transicion_estado
  BEFORE INSERT OR UPDATE ON tareas
  FOR EACH ROW EXECUTE FUNCTION check_transicion_estado_valida();

-- Regla de negocio: una tarea bloqueada no puede avanzar en progreso.
-- En INSERT: si esta_bloqueada = TRUE el progreso inicial debe ser 0.
-- En UPDATE: si esta_bloqueada = TRUE y el progreso intenta cambiar, se rechaza.
CREATE OR REPLACE FUNCTION check_bloqueo_impide_progreso()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.esta_bloqueada = TRUE AND NEW.progreso != 0 THEN
      RAISE EXCEPTION
        'No se puede crear una tarea bloqueada con progreso distinto de 0. Progreso recibido: %',
        NEW.progreso
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE: si la tarea está bloqueada y el progreso cambia, rechazar
  IF NEW.esta_bloqueada = TRUE AND OLD.progreso IS DISTINCT FROM NEW.progreso THEN
    RAISE EXCEPTION
      'No se puede modificar el progreso de una tarea bloqueada (id: %). Desbloqueá la tarea primero.',
      NEW.id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_check_bloqueo ON tareas;
CREATE TRIGGER tg_check_bloqueo
  BEFORE INSERT OR UPDATE ON tareas
  FOR EACH ROW EXECUTE FUNCTION check_bloqueo_impide_progreso();

-- Trigger: mantener estado_cambiado_en sincronizado con el momento exacto
-- en que el campo `estado` cambia. Se ejecuta BEFORE UPDATE para poder
-- modificar NEW antes de que la fila se persista.
-- (registrar_historial_tarea es AFTER y no puede tocar NEW.)
CREATE OR REPLACE FUNCTION set_estado_cambiado_en()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.estado IS DISTINCT FROM NEW.estado THEN
    NEW.estado_cambiado_en = NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_set_estado_cambiado_en ON tareas;
CREATE TRIGGER tg_set_estado_cambiado_en
  BEFORE UPDATE ON tareas
  FOR EACH ROW EXECUTE FUNCTION set_estado_cambiado_en();

-- Trigger: actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_tareas_updated_at ON tareas;
CREATE TRIGGER tg_tareas_updated_at
  BEFORE UPDATE ON tareas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ────────────────────────────────────────────────────────────
-- TABLA: sesiones_timer (log de sesiones de trabajo por tarea)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sesiones_timer (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tarea_id            UUID NOT NULL REFERENCES tareas(id) ON DELETE CASCADE,
  usuario_id          UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  iniciado_en         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finalizado_en       TIMESTAMPTZ,                    -- NULL = sesión activa
  duracion_segundos   INTEGER CHECK (duracion_segundos IS NULL OR duracion_segundos >= 0),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Invariante: una sola sesión activa por tarea y usuario al mismo tiempo
  CONSTRAINT chk_sesion_consistente CHECK (
    (finalizado_en IS NULL AND duracion_segundos IS NULL)
    OR
    (finalizado_en IS NOT NULL AND duracion_segundos IS NOT NULL AND finalizado_en > iniciado_en)
  )
);

-- ────────────────────────────────────────────────────────────
-- TABLA: historial_tareas (auditoría de cambios)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS historial_tareas (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tarea_id        UUID NOT NULL REFERENCES tareas(id) ON DELETE CASCADE,
  usuario_id      UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,  -- quién hizo el cambio
  cambio_tipo     tipo_cambio_historial NOT NULL,
  valor_anterior  TEXT,
  valor_nuevo     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: registrar cambios automáticamente en historial
-- SECURITY DEFINER para bypassear RLS al insertar desde trigger interno
CREATE OR REPLACE FUNCTION registrar_historial_tarea()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_usuario_id UUID;
BEGIN
  -- Obtener el usuario del contexto de autenticación
  v_usuario_id := auth.uid();

  -- Cambio de estado
  IF OLD.estado IS DISTINCT FROM NEW.estado THEN
    INSERT INTO historial_tareas (tarea_id, usuario_id, cambio_tipo, valor_anterior, valor_nuevo)
    VALUES (NEW.id, v_usuario_id, 'ESTADO', OLD.estado::TEXT, NEW.estado::TEXT);
  END IF;

  -- Cambio de progreso
  IF OLD.progreso IS DISTINCT FROM NEW.progreso THEN
    INSERT INTO historial_tareas (tarea_id, usuario_id, cambio_tipo, valor_anterior, valor_nuevo)
    VALUES (NEW.id, v_usuario_id, 'PROGRESO', OLD.progreso::TEXT, NEW.progreso::TEXT);
  END IF;

  -- Cambio de fecha_vencimiento
  IF OLD.fecha_vencimiento IS DISTINCT FROM NEW.fecha_vencimiento THEN
    INSERT INTO historial_tareas (tarea_id, usuario_id, cambio_tipo, valor_anterior, valor_nuevo)
    VALUES (NEW.id, v_usuario_id, 'FECHA', OLD.fecha_vencimiento::TEXT, NEW.fecha_vencimiento::TEXT);
  END IF;

  -- Cambio de bloqueo
  IF OLD.esta_bloqueada IS DISTINCT FROM NEW.esta_bloqueada THEN
    INSERT INTO historial_tareas (tarea_id, usuario_id, cambio_tipo, valor_anterior, valor_nuevo)
    VALUES (NEW.id, v_usuario_id, 'BLOQUEO', OLD.esta_bloqueada::TEXT, NEW.esta_bloqueada::TEXT);
  END IF;

  -- Cambio de título
  IF OLD.titulo IS DISTINCT FROM NEW.titulo THEN
    INSERT INTO historial_tareas (tarea_id, usuario_id, cambio_tipo, valor_anterior, valor_nuevo)
    VALUES (NEW.id, v_usuario_id, 'TITULO', OLD.titulo, NEW.titulo);
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- El historial no debe bloquear la operación principal;
    -- se loguea el error pero se permite el UPDATE de la tarea.
    RAISE WARNING 'registrar_historial_tarea: error al registrar historial para tarea %. SQLSTATE: %, SQLERRM: %',
      NEW.id, SQLSTATE, SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_historial_tareas ON tareas;
CREATE TRIGGER tg_historial_tareas
  AFTER UPDATE ON tareas
  FOR EACH ROW EXECUTE FUNCTION registrar_historial_tarea();

-- ============================================================
-- ÍNDICES DE PERFORMANCE
-- Nombrados explícitamente para facilitar DROP/REINDEX futuro.
-- CREATE INDEX CONCURRENTLY no aplica dentro de transacciones;
-- ejecutar cada sentencia por separado si la tabla ya tiene datos.
-- ============================================================

-- ── paneles ──────────────────────────────────────────────────
-- Lookup más común: todos los paneles de un usuario
CREATE INDEX IF NOT EXISTS idx_paneles_usuario_id
  ON paneles (usuario_id);

-- Lookup por URL slug dentro de un usuario
CREATE INDEX IF NOT EXISTS idx_paneles_usuario_slug
  ON paneles (usuario_id, slug);

-- ── categorias ───────────────────────────────────────────────
-- Listar categorías de un panel
CREATE INDEX IF NOT EXISTS idx_categorias_panel_id
  ON categorias (panel_id);

-- Listar categorías de un usuario (para selector global)
CREATE INDEX IF NOT EXISTS idx_categorias_usuario_id
  ON categorias (usuario_id);

-- ── tareas ───────────────────────────────────────────────────
-- Filtro principal: todas las tareas de un usuario
CREATE INDEX IF NOT EXISTS idx_tareas_usuario_id
  ON tareas (usuario_id);

-- Kanban board: tareas de un panel específico
CREATE INDEX IF NOT EXISTS idx_tareas_panel_id
  ON tareas (panel_id);

-- Filtro por estado (columnas kanban) dentro de un panel
CREATE INDEX IF NOT EXISTS idx_tareas_panel_estado
  ON tareas (panel_id, estado);

-- Dashboard de urgencias: tareas críticas activas de un usuario
CREATE INDEX IF NOT EXISTS idx_tareas_usuario_urgencia_estado
  ON tareas (usuario_id, urgencia, estado);

-- Vistas de vencimiento: tareas no cerradas con fecha próxima
CREATE INDEX IF NOT EXISTS idx_tareas_fecha_vencimiento
  ON tareas (fecha_vencimiento)
  WHERE fecha_vencimiento IS NOT NULL AND estado != 'CERRADA';

-- Categoría dentro de una tarea (JOIN frecuente)
CREATE INDEX IF NOT EXISTS idx_tareas_categoria_id
  ON tareas (categoria_id)
  WHERE categoria_id IS NOT NULL;

-- estado_cambiado_en: necesario para la vista v_tareas_estancadas_curacion
-- (reemplaza el índice anterior sobre updated_at, que medía tiempo incorrecto)
CREATE INDEX IF NOT EXISTS idx_tareas_estado_cambiado_en
  ON tareas (estado, estado_cambiado_en)
  WHERE estado = 'CURACION';

-- ── sesiones_timer ───────────────────────────────────────────
-- Historial de sesiones por tarea (drill-down dashboard)
CREATE INDEX IF NOT EXISTS idx_sesiones_timer_tarea_id
  ON sesiones_timer (tarea_id);

-- Sesiones de un usuario en un rango de fechas (stats dashboard)
CREATE INDEX IF NOT EXISTS idx_sesiones_timer_usuario_iniciado
  ON sesiones_timer (usuario_id, iniciado_en)
  WHERE finalizado_en IS NOT NULL;

-- Detectar sesión activa abierta (timer_activo_desde no NULL)
CREATE INDEX IF NOT EXISTS idx_sesiones_timer_activas
  ON sesiones_timer (tarea_id)
  WHERE finalizado_en IS NULL;

-- Invariante: una tarea no puede tener más de una sesión de timer activa
-- simultáneamente (finalizado_en IS NULL = sesión aún en curso).
-- El índice parcial único lo garantiza a nivel de base de datos, sin
-- necesidad de locks explícitos en la aplicación.
CREATE UNIQUE INDEX IF NOT EXISTS uq_sesion_activa_por_tarea
  ON sesiones_timer (tarea_id)
  WHERE finalizado_en IS NULL;

-- ── historial_tareas ─────────────────────────────────────────
-- Lookup de historial por tarea (timeline de auditoría)
CREATE INDEX IF NOT EXISTS idx_historial_tarea_id
  ON historial_tareas (tarea_id, created_at DESC);

-- Lookup por usuario (para política RLS sin subquery costosa)
CREATE INDEX IF NOT EXISTS idx_historial_usuario_id
  ON historial_tareas (usuario_id);
