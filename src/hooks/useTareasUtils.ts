import type { EstadoTarea, TareaConCategoria, UrgenciaTarea } from '@/types'

// ──────────────────────────────────────────────────────────────────────────────
// Ordering helpers
// ──────────────────────────────────────────────────────────────────────────────

export const URGENCIA_ORDEN: Record<UrgenciaTarea, number> = {
  CRITICA: 0,
  ALTA: 1,
  MEDIA: 2,
  BAJA: 3,
}

export function ordenarTareas(tareas: TareaConCategoria[]): TareaConCategoria[] {
  return [...tareas].sort((a, b) => {
    const urgDiff = URGENCIA_ORDEN[a.urgencia] - URGENCIA_ORDEN[b.urgencia]
    if (urgDiff !== 0) return urgDiff
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// Transition rules
// ──────────────────────────────────────────────────────────────────────────────

export const TRANSICIONES_VALIDAS: Record<EstadoTarea, EstadoTarea[]> = {
  PENDIENTE: ['EN_PROGRESO'],
  EN_PROGRESO: ['CURACION'],
  CURACION: ['EN_PROGRESO', 'CERRADA'],
  CERRADA: [],
}

export function esTransicionPermitida(
  estadoActual: EstadoTarea,
  nuevoEstado: EstadoTarea,
): boolean {
  return TRANSICIONES_VALIDAS[estadoActual].includes(nuevoEstado)
}
