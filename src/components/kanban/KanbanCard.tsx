'use client'

import type { TareaConCategoria } from '@/types'
import { COLORES_URGENCIA } from '@/types'
import { Lock, ArrowRightCircle, CheckCircle2 } from 'lucide-react'

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function estaVencida(fechaVencimiento: string | null): boolean {
  if (!fechaVencimiento) return false
  
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  const hoyStr = `${year}-${month}-${day}`
  
  return fechaVencimiento < hoyStr
}

function progresoColor(progreso: number): string {
  if (progreso >= 100) return 'bg-emerald-500'
  if (progreso >= 60) return 'bg-blue-500'
  if (progreso >= 30) return 'bg-amber-500'
  return 'bg-slate-500'
}

function initialesDeNombre(nombre: string): string {
  return nombre
    .trim()
    .split(' ')
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase() ?? '')
    .join('')
}

// ──────────────────────────────────────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────────────────────────────────────

interface KanbanCardProps {
  tarea: TareaConCategoria
  onDragStart: (tareaId: string) => void
  onClick: (tarea: TareaConCategoria) => void
  onMoverAManana?: (tarea: TareaConCategoria) => void
}

// ──────────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────────

export function KanbanCard({ tarea, onDragStart, onClick, onMoverAManana }: KanbanCardProps) {
  const vencida = estaVencida(tarea.fecha_vencimiento)
  const bloqueada = tarea.esta_bloqueada

  const cardBase =
    'group relative flex flex-col gap-2 rounded-xl border p-3 cursor-pointer select-none ' +
    'transition-all duration-150 ease-out shadow-sm ' +
    'hover:scale-[1.01] hover:-translate-y-0.5 hover:shadow-md'

  const cardColor = bloqueada
    ? 'bg-red-50 border-red-200 hover:border-red-300'
    : 'bg-white border-gray-200 hover:border-teal-300'

  return (
    <article
      draggable
      aria-label={tarea.titulo}
      className={`${cardBase} ${cardColor}`}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('tareaId', tarea.id)
        onDragStart(tarea.id)
      }}
      onClick={() => onClick(tarea)}
    >
      {/* Header row: urgencia badge + bloqueo icon */}
      <div className="flex items-center justify-between gap-2">
        <span
          className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{
            backgroundColor: `${COLORES_URGENCIA[tarea.urgencia]}22`,
            color: COLORES_URGENCIA[tarea.urgencia],
            border: `1px solid ${COLORES_URGENCIA[tarea.urgencia]}55`,
          }}
        >
          {tarea.urgencia}
        </span>

        <div className="flex items-center gap-1.5">
          {vencida && (
            <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 border border-red-200">
              Vencida
            </span>
          )}
          {bloqueada && (
            <Lock className="h-3.5 w-3.5 text-red-500 shrink-0" strokeWidth={2.5} />
          )}
          {onMoverAManana && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoverAManana(tarea);
              }}
              className="flex items-center justify-center p-1 hover:bg-teal-50 rounded text-gray-400 hover:text-teal-600 transition-colors"
              title="Mover a mañana"
              aria-label="Mover tarea a mañana"
            >
              <ArrowRightCircle className="w-4 h-4" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {/* Título y Check */}
      <div className="flex items-start gap-2 mt-0.5">
        {tarea.estado === 'CERRADA' && (
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" strokeWidth={2.5} />
        )}
        <h3 className={`text-sm font-semibold leading-snug line-clamp-2 ${tarea.estado === 'CERRADA' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
          {tarea.titulo}
        </h3>
      </div>

      {/* Categoría */}
      {tarea.categoria && (
        <div className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: tarea.categoria.color_hex }}
          />
          <span className="text-xs text-gray-500 font-medium truncate">{tarea.categoria.nombre}</span>
        </div>
      )}

      {/* Barra de progreso */}
      <div className="flex items-center gap-2">
        <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
          <div
            className={`absolute left-0 top-0 h-full rounded-full transition-all duration-300 ${progresoColor(tarea.progreso)}`}
            style={{ width: `${tarea.progreso}%` }}
          />
        </div>
        <span className="text-[10px] font-medium text-gray-500 tabular-nums w-7 text-right">
          {tarea.progreso}%
        </span>
      </div>

      {/* Footer: avatares de personas */}
      {tarea.personas_involucradas.length > 0 && (
        <div className="flex items-center gap-1 pt-0.5">
          {tarea.personas_involucradas.slice(0, 3).map((persona) => (
            <span
              key={persona}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-[9px] font-bold text-gray-500 ring-2 ring-white"
              title={persona}
            >
              {initialesDeNombre(persona)}
            </span>
          ))}
          {tarea.personas_involucradas.length > 3 && (
            <span className="flex h-5 items-center justify-center rounded-full bg-gray-50 px-1.5 text-[9px] font-medium text-gray-400 ring-2 ring-white">
              +{tarea.personas_involucradas.length - 3}
            </span>
          )}
        </div>
      )}
    </article>
  )
}
