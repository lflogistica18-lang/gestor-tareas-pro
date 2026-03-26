-- ============================================================
-- SPRINT 1: ROW LEVEL SECURITY (RLS)
-- Ejecutar DESPUÉS de 01_schema.sql
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- HABILITAR RLS EN TODAS LAS TABLAS
-- ────────────────────────────────────────────────────────────
ALTER TABLE usuarios         ENABLE ROW LEVEL SECURITY;
ALTER TABLE paneles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tareas            ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesiones_timer   ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial_tareas ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────
-- POLÍTICAS: usuarios
--
-- FOR ALL con USING sin WITH CHECK permite que un usuario
-- inserte filas con id arbitrario. Se separan las políticas
-- por operación para control granular.
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "usuarios: solo el propio usuario" ON usuarios;

CREATE POLICY "usuarios: select propio"
  ON usuarios FOR SELECT
  USING (id = auth.uid());

-- Solo puede insertar su propio perfil; el trigger handle_new_user
-- corre como SECURITY DEFINER y bypasa esta restricción.
CREATE POLICY "usuarios: insert propio"
  ON usuarios FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "usuarios: update propio"
  ON usuarios FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- No se permite borrar el propio perfil desde el cliente;
-- el CASCADE de auth.users lo maneja Supabase internamente.
CREATE POLICY "usuarios: delete denegado"
  ON usuarios FOR DELETE
  USING (FALSE);

-- ────────────────────────────────────────────────────────────
-- POLÍTICAS: paneles
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "paneles: solo el propio usuario" ON paneles;

CREATE POLICY "paneles: select propio"
  ON paneles FOR SELECT
  USING (usuario_id = auth.uid());

CREATE POLICY "paneles: insert propio"
  ON paneles FOR INSERT
  WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "paneles: update propio"
  ON paneles FOR UPDATE
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "paneles: delete propio"
  ON paneles FOR DELETE
  USING (usuario_id = auth.uid());

-- ────────────────────────────────────────────────────────────
-- POLÍTICAS: categorias
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "categorias: solo el propio usuario" ON categorias;

CREATE POLICY "categorias: select propio"
  ON categorias FOR SELECT
  USING (usuario_id = auth.uid());

CREATE POLICY "categorias: insert propio"
  ON categorias FOR INSERT
  WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "categorias: update propio"
  ON categorias FOR UPDATE
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "categorias: delete propio"
  ON categorias FOR DELETE
  USING (usuario_id = auth.uid());

-- ────────────────────────────────────────────────────────────
-- POLÍTICAS: tareas
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "tareas: solo el propio usuario" ON tareas;

CREATE POLICY "tareas: select propio"
  ON tareas FOR SELECT
  USING (usuario_id = auth.uid());

CREATE POLICY "tareas: insert propio"
  ON tareas FOR INSERT
  WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "tareas: update propio"
  ON tareas FOR UPDATE
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "tareas: delete propio"
  ON tareas FOR DELETE
  USING (usuario_id = auth.uid());

-- ────────────────────────────────────────────────────────────
-- POLÍTICAS: sesiones_timer
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "sesiones_timer: solo el propio usuario" ON sesiones_timer;

CREATE POLICY "sesiones_timer: select propio"
  ON sesiones_timer FOR SELECT
  USING (usuario_id = auth.uid());

CREATE POLICY "sesiones_timer: insert propio"
  ON sesiones_timer FOR INSERT
  WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "sesiones_timer: update propio"
  ON sesiones_timer FOR UPDATE
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "sesiones_timer: delete propio"
  ON sesiones_timer FOR DELETE
  USING (usuario_id = auth.uid());

-- ────────────────────────────────────────────────────────────
-- POLÍTICAS: historial_tareas
--
-- Los clientes solo pueden leer su propio historial.
-- INSERT/UPDATE/DELETE solo lo hace el trigger interno que
-- corre como SECURITY DEFINER (bypasa RLS).
-- Se bloquea escritura directa desde el cliente para evitar
-- manipulación de auditoría.
-- El USING usa usuario_id directamente (idx_historial_usuario_id
-- evita el full scan que tendría la subquery original).
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "historial_tareas: lectura del propio usuario" ON historial_tareas;

CREATE POLICY "historial_tareas: select propio"
  ON historial_tareas FOR SELECT
  USING (usuario_id = auth.uid());

-- Bloqueo explícito de escritura directa desde cliente
CREATE POLICY "historial_tareas: insert denegado"
  ON historial_tareas FOR INSERT
  WITH CHECK (FALSE);

CREATE POLICY "historial_tareas: update denegado"
  ON historial_tareas FOR UPDATE
  USING (FALSE);

CREATE POLICY "historial_tareas: delete denegado"
  ON historial_tareas FOR DELETE
  USING (FALSE);

-- ────────────────────────────────────────────────────────────
-- FUNCIÓN: crear usuario al registrarse (trigger en auth.users)
--
-- SECURITY DEFINER: necesario para escribir en `usuarios` y
-- `paneles` cuando RLS está activo y auth.uid() todavía no
-- refleja al nuevo usuario en el contexto de la sesión.
--
-- SET search_path: previene ataques de search_path hijacking
-- donde un schema malicioso sobreescribe funciones de sistema.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  -- Insertar perfil en tabla usuarios
  INSERT INTO usuarios (id, email, nombre_perfil)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'nombre_perfil'), ''),
      split_part(NEW.email, '@', 1)
    )
  );

  -- Crear los 3 paneles por defecto dentro de la misma transacción
  INSERT INTO paneles (usuario_id, nombre, slug, color_hex, orden) VALUES
    (NEW.id, 'Laboral',  'laboral',  '#3b82f6', 1),
    (NEW.id, 'Estudio',  'estudio',  '#8b5cf6', 2),
    (NEW.id, 'Personal', 'personal', '#10b981', 3);

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Propaga el error para que Supabase Auth no registre
    -- un usuario sin perfil asociado (estado inconsistente).
    RAISE EXCEPTION 'handle_new_user: no se pudo crear el perfil para uid %. SQLSTATE: %, SQLERRM: %',
      NEW.id, SQLSTATE, SQLERRM;
END;
$$;

DROP TRIGGER IF EXISTS tg_on_auth_user_created ON auth.users;
CREATE TRIGGER tg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
