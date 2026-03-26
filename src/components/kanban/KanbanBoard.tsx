'use client'

import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import type { EstadoTarea, TareaConCategoria, UrgenciaTarea } from '@/types'
import { ORDEN_ESTADOS, COLORES_URGENCIA } from '@/types'
import type { Categoria } from '@/types'
import { useTareas } from '@/hooks/useTareas'
import { KanbanColumna } from './KanbanColumna'
import { TareaModal } from './TareaModal'
import { DayNavigator, getLocalDateString } from './DayNavigator'
import { ClipboardList, Plus } from 'lucide-react'

// ──────────────────────────────────────────────────────────────────────────────
// Loading skeleton
// ──────────────────────────────────────────────────────────────────────────────

function KanbanSkeleton() {
  return (
    <div className="flex gap-4" aria-label="Cargando tablero">
      {ORDEN_ESTADOS.map(estado => (
        <div key={estado} className="flex flex-1 flex-col gap-2 rounded-xl border border-gray-200 bg-gray-50/50 p-2">
          {/* Column header skeleton */}
          <div className="h-8 rounded-lg bg-gray-200 animate-pulse" />
          {/* Card skeletons */}
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-lg bg-white border border-gray-100 shadow-sm animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
      ))}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Error state
// ──────────────────────────────────────────────────────────────────────────────

function KanbanError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50">
      <svg className="h-8 w-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
        />
      </svg>
      <p className="text-sm text-red-600">{message}</p>
      <button
        onClick={onRetry}
        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-500"
      >
        Reintentar
      </button>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Empty state
// ──────────────────────────────────────────────────────────────────────────────

function KanbanEmpty({ onNuevaTarea }: { onNuevaTarea: () => void }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50/50">
      <ClipboardList className="h-10 w-10 text-teal-200" strokeWidth={1.5} />
      <p className="text-sm font-medium text-gray-500">No hay tareas todavía</p>
      <button
        onClick={onNuevaTarea}
        className="rounded-lg bg-teal-800 px-5 py-2.5 text-sm font-bold tracking-tight text-white transition-all hover:bg-teal-700 hover:shadow-sm"
      >
        Crear primera tarea
      </button>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────────────────────────────────────

interface KanbanBoardProps {
  panelId: string
}

// ──────────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────────

export function KanbanBoard({ panelId }: KanbanBoardProps) {
  const {
    tareas,
    categorias,
    isLoading,
    error,
    cargarTareas,
    crearTarea,
    actualizarTarea,
    eliminarTarea,
    moverTarea,
    crearCategoria,
  } = useTareas()

  const [modalOpen, setModalOpen] = useState(false)
  const [tareaSeleccionada, setTareaSeleccionada] = useState<TareaConCategoria | null>(null)
  const draggingIdRef = useRef<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>(() => getLocalDateString(new Date()))
  const [urgenciasFiltro, setUrgenciasFiltro] = useState<UrgenciaTarea[]>([])

  useEffect(() => {
    void cargarTareas(panelId)
  }, [panelId, cargarTareas])

  const [defaultCategoriaId, setDefaultCategoriaId] = useState<string | null>(null)

  const handleNuevaTarea = useCallback((catId?: string | React.MouseEvent) => {
    setDefaultCategoriaId(typeof catId === 'string' && catId !== 'sin-categoria' ? catId : null)
    setTareaSeleccionada(null)
    setModalOpen(true)
  }, [])

  const handleCardClick = useCallback((tarea: TareaConCategoria) => {
    setTareaSeleccionada(tarea)
    setModalOpen(true)
  }, [])

  const handleDragStart = useCallback((tareaId: string) => {
    draggingIdRef.current = tareaId
  }, [])

  const handleDrop = useCallback((estado: EstadoTarea) => {
    const id = draggingIdRef.current
    draggingIdRef.current = null
    if (!id) return
    void moverTarea(id, estado)
  }, [moverTarea])

  const handleCloseModal = useCallback(() => {
    setModalOpen(false)
    setTareaSeleccionada(null)
  }, [])

  const handleMoverAManana = useCallback((tarea: TareaConCategoria) => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    void actualizarTarea(tarea.id, { fecha_vencimiento: getLocalDateString(tomorrow) })
  }, [actualizarTarea])

  const categoriesWithUncategorized = useMemo(() => {
    const defaultCats = [...categorias]
    if (tareas.some(t => !t.categoria_id)) {
      defaultCats.push({ 
        id: 'sin-categoria', 
        nombre: 'Sin Categoría', 
        color_hex: '#cbd5e1', 
        panel_id: panelId,
        usuario_id: '',
        created_at: new Date().toISOString()
      })
    }
    return defaultCats
  }, [categorias, tareas, panelId])

  // ── Render states ──────────────────────────────────────────────────────────

  if (isLoading) return <KanbanSkeleton />

  if (error) {
    return (
      <KanbanError
        message={error}
        onRetry={() => void cargarTareas(panelId)}
      />
    )
  }

  if (tareas.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <DayNavigator selectedDate={selectedDate} onDateChange={setSelectedDate} />
        <KanbanEmpty onNuevaTarea={handleNuevaTarea} />
        {modalOpen && (
          <TareaModal
            tarea={null}
            panelId={panelId}
            categorias={categorias}
            defaultDate={selectedDate}
            onCrear={crearTarea}
            onActualizar={actualizarTarea}
            onEliminar={eliminarTarea}
            onCrearCategoria={crearCategoria}
            onClose={handleCloseModal}
          />
        )}
      </div>
    )
  }

  // ── Main board ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <DayNavigator selectedDate={selectedDate} onDateChange={setSelectedDate} />
        <button
          onClick={handleNuevaTarea}
          className="flex items-center gap-2 rounded-xl bg-teal-800 px-5 py-2.5 text-sm font-bold tracking-tight text-white shadow-sm transition-all hover:bg-teal-700 hover:shadow"
        >
          <Plus className="h-4.5 w-4.5" strokeWidth={2.5} />
          Nueva Tarea
        </button>
      </div>

      {/* Filtro urgencia */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        {(['BAJA', 'MEDIA', 'ALTA', 'CRITICA'] as UrgenciaTarea[]).map(urgencia => {
          const active = urgenciasFiltro.includes(urgencia)
          const color = COLORES_URGENCIA[urgencia]
          return (
            <button
              key={urgencia}
              onClick={() => setUrgenciasFiltro(prev =>
                active ? prev.filter(u => u !== urgencia) : [...prev, urgencia]
              )}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-150 ${
                active ? '' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
              }`}
              style={active ? {
                backgroundColor: `${color}18`,
                borderColor: `${color}80`,
                color: color,
              } : undefined}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: active ? color : '#9ca3af' }} />
              {urgencia}
            </button>
          )
        })}
        {urgenciasFiltro.length > 0 && (
          <button
            onClick={() => setUrgenciasFiltro([])}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-1"
          >
            Limpiar
          </button>
        )}
      </div>

      <div className="flex flex-col gap-4 overflow-y-auto pb-4" role="region" aria-label="Tablero Kanban">
        {categoriesWithUncategorized.map((categoria) => {
          const tareasFiltradasCategoria = tareas.filter(t =>
            (urgenciasFiltro.length === 0 || urgenciasFiltro.includes(t.urgencia)) &&
            (categoria.id === 'sin-categoria' ? !t.categoria_id : t.categoria_id === categoria.id) &&
            (t.fecha_vencimiento ? t.fecha_vencimiento.slice(0, 10) === selectedDate : getLocalDateString(new Date()) === selectedDate)
          )

          if (tareasFiltradasCategoria.length === 0) return null

          return (
            <div
              key={categoria.id}
              className="flex flex-col gap-3 shrink-0 bg-white rounded-2xl shadow-sm p-4 border-l-[3px]"
              style={{ borderColor: categoria.color_hex }}
            >
              <div
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg w-fit"
                style={{ backgroundColor: `${categoria.color_hex}18` }}
              >
                <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: categoria.color_hex }} />
                <h3 className="text-xs font-bold text-teal-900 tracking-widest uppercase">{categoria.nombre}</h3>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {ORDEN_ESTADOS.map(estado => {
                  const tareasColumna = tareasFiltradasCategoria.filter(t => t.estado === estado)
                  return (
                    <div key={estado} className="min-w-[240px] flex-1">
                      <KanbanColumna
                        estado={estado}
                        tareas={tareasColumna}
                        onDragStart={handleDragStart}
                        onDrop={handleDrop}
                        onCardClick={handleCardClick}
                        onMoverAManana={handleMoverAManana}
                        onNuevaTarea={estado === 'PENDIENTE' ? () => handleNuevaTarea(categoria.id) : undefined}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {modalOpen && (
        <TareaModal
          tarea={tareaSeleccionada}
          panelId={panelId}
          categorias={categorias}
          defaultDate={selectedDate}
          defaultCategoriaId={defaultCategoriaId}
          onCrear={crearTarea}
          onActualizar={actualizarTarea}
          onEliminar={eliminarTarea}
          onCrearCategoria={crearCategoria}
          onClose={handleCloseModal}
        />
      )}
    </div>
  )
}
