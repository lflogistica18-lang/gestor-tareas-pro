// ============================================================
// CONTRATOS DE DATOS — Compartidos entre Frontend y Backend
// Estos tipos reflejan exactamente el schema de Supabase.
// ============================================================

// ────────────────────────────────────────────────────────────
// ENUMS (espejo de los enums de PostgreSQL)
// ────────────────────────────────────────────────────────────
export type EstadoTarea = 'PENDIENTE' | 'EN_PROGRESO' | 'CURACION' | 'CERRADA'
export type UrgenciaTarea = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA'
export type TipoCambioHistorial = 'ESTADO' | 'PROGRESO' | 'FECHA' | 'BLOQUEO' | 'TITULO'

// ────────────────────────────────────────────────────────────
// ENTIDADES DE BASE DE DATOS
// ────────────────────────────────────────────────────────────
export interface Usuario {
  id: string
  email: string
  nombre_perfil: string | null
  created_at: string
}

export interface Panel {
  id: string
  usuario_id: string
  nombre: string
  slug: string
  color_hex: string
  orden: number
  created_at: string
}

export interface Categoria {
  id: string
  usuario_id: string
  panel_id: string
  nombre: string
  color_hex: string
  created_at: string
}

export interface Tarea {
  id: string
  usuario_id: string
  panel_id: string
  categoria_id: string | null
  titulo: string
  detalle: string | null
  progreso: number
  estado: EstadoTarea
  urgencia: UrgenciaTarea
  esta_bloqueada: boolean
  fecha_vencimiento: string | null
  personas_involucradas: string[]
  tiempo_total_segundos: number
  timer_activo_desde: string | null
  estado_cambiado_en: string | null
  created_at: string
  updated_at: string
}

export interface SesionTimer {
  id: string
  tarea_id: string
  usuario_id: string
  iniciado_en: string
  finalizado_en: string | null
  duracion_segundos: number | null
  created_at: string
}

export interface HistorialTarea {
  id: string
  tarea_id: string
  usuario_id: string
  cambio_tipo: TipoCambioHistorial
  valor_anterior: string | null
  valor_nuevo: string | null
  created_at: string
}

// ────────────────────────────────────────────────────────────
// TIPOS EXTENDIDOS (joins frecuentes en la UI)
// ────────────────────────────────────────────────────────────
export interface TareaConCategoria extends Tarea {
  categoria: Pick<Categoria, 'id' | 'nombre' | 'color_hex'> | null
}

// ────────────────────────────────────────────────────────────
// PAYLOADS DE FORMULARIOS (lo que envía la UI al servidor)
// ────────────────────────────────────────────────────────────
export interface CrearTareaPayload {
  panel_id: string
  titulo: string
  detalle?: string
  urgencia?: UrgenciaTarea
  fecha_vencimiento?: string
  categoria_id?: string
  personas_involucradas?: string[]
}

export interface ActualizarTareaPayload {
  titulo?: string
  detalle?: string
  progreso?: number
  estado?: EstadoTarea
  urgencia?: UrgenciaTarea
  esta_bloqueada?: boolean
  fecha_vencimiento?: string | null
  categoria_id?: string | null
  personas_involucradas?: string[]
}

// ────────────────────────────────────────────────────────────
// TIPOS PARA EL DASHBOARD DE TIEMPO
// Espejo de los RPCs definidos en 03_views.sql
// ────────────────────────────────────────────────────────────
export interface StatsTiempoPorPanel {
  panel_id: string
  panel_nombre: string
  panel_color: string
  // Supabase serializa BIGINT como number en JS; seguro hasta ~285 años de timer activo
  total_segundos: number
  porcentaje: number
}

export interface StatsTiempoPorTarea {
  tarea_id: string
  tarea_titulo: string
  tarea_estado: EstadoTarea
  tarea_urgencia: UrgenciaTarea
  // Supabase serializa BIGINT como number en JS; seguro hasta ~285 años de timer activo
  total_segundos: number
}

// ────────────────────────────────────────────────────────────
// UTILIDADES
// ────────────────────────────────────────────────────────────
export const ORDEN_ESTADOS: EstadoTarea[] = [
  'PENDIENTE',
  'EN_PROGRESO',
  'CURACION',
  'CERRADA',
]

export const COLORES_URGENCIA: Record<UrgenciaTarea, string> = {
  BAJA: '#94a3b8',
  MEDIA: '#f59e0b',
  ALTA: '#f97316',
  CRITICA: '#ef4444',
}
