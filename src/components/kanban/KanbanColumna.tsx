'use client'

import { useState } from 'react'
import type { EstadoTarea, TareaConCategoria } from '@/types'
import { KanbanCard } from './KanbanCard'
import { Plus } from 'lucide-react'

// ──────────────────────────────────────────────────────────────────────────────
// Config visual por estado
// ──────────────────────────────────────────────────────────────────────────────

const ESTADO_CONFIG: Record<
  EstadoTarea,
  { label: string; headerBg: string; headerText: string; countBg: string }
> = {
  PENDIENTE: {
    label: 'Pendiente',
    headerBg: 'bg-orange-100/60',
    headerText: 'text-orange-800',
    countBg: 'bg-white text-orange-700 shadow-sm ring-1 ring-orange-200/50',
  },
  EN_PROGRESO: {
    label: 'En Progreso',
    headerBg: 'bg-blue-100/60',
    headerText: 'text-blue-800',
    countBg: 'bg-white text-blue-700 shadow-sm ring-1 ring-blue-200/60',
  },
  CURACION: {
    label: 'Curación',
    headerBg: 'bg-yellow-100/60',
    headerText: 'text-yellow-800',
    countBg: 'bg-white text-yellow-700 shadow-sm ring-1 ring-yellow-200/60',
  },
  CERRADA: {
    label: 'Cerrada',
    headerBg: 'bg-emerald-100/60',
    headerText: 'text-emerald-800',
    countBg: 'bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-200/60',
  },
}

// ──────────────────────────────────────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────────────────────────────────────

interface KanbanColumnaProps {
  estado: EstadoTarea
  tareas: TareaConCategoria[]
  onDragStart: (tareaId: string) => void
  onDrop: (estado: EstadoTarea) => void
  onCardClick: (tarea: TareaConCategoria) => void
  onMoverAManana?: (tarea: TareaConCategoria) => void
  onNuevaTarea?: () => void
}

// ──────────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────────

export function KanbanColumna({
  estado,
  tareas,
  onDragStart,
  onDrop,
  onCardClick,
  onMoverAManana,
  onNuevaTarea,
}: KanbanColumnaProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const config = ESTADO_CONFIG[estado]

  return (
    <section
      className={`
        flex min-w-0 flex-1 flex-col rounded-2xl border transition-all duration-150
        ${isDragOver
          ? 'border-teal-400 bg-teal-50/50 shadow-md shadow-teal-900/10'
          : 'border-teal-100/60 bg-white shadow-sm hover:shadow-md'
        }
      `}
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setIsDragOver(true)
      }}
      onDragLeave={(e) => {
        // Only fire if leaving the column entirely
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDragOver(false)
        }
      }}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragOver(false)
        onDrop(estado)
      }}
    >
      {/* Column header */}
      <div className={`flex items-center justify-between rounded-t-2xl px-4 py-3 border-b border-teal-50/50 ${config.headerBg}`}>
        <span className={`text-sm font-bold tracking-tight ${config.headerText}`}>
          {config.label}
        </span>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${config.countBg}`}>
          {tareas.length}
        </span>
      </div>

      {/* Cards list */}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
        {tareas.map(tarea => (
          <KanbanCard
            key={tarea.id}
            tarea={tarea}
            onDragStart={onDragStart}
            onClick={onCardClick}
            onMoverAManana={onMoverAManana}
          />
        ))}

        {/* Botón nueva tarea solo en PENDIENTE */}
        {estado === 'PENDIENTE' && onNuevaTarea && (
          <button
            onClick={onNuevaTarea}
            className="
              mx-1 mt-1 flex items-center justify-center gap-2 rounded-xl border border-dashed
              border-teal-200 py-2.5 text-xs font-semibold text-teal-600/70
              transition-all duration-200 hover:border-teal-400 hover:text-teal-700 hover:bg-teal-50/50
            "
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Nueva tarea
          </button>
        )}
      </div>

      {/* Drop zone highlight */}
      {isDragOver && (
        <div className="mx-2 mb-2 rounded-lg border-2 border-dashed border-teal-400 bg-teal-50 py-3 text-center text-xs text-teal-600 font-medium">
          Soltar aquí
        </div>
      )}
    </section>
  )
}
