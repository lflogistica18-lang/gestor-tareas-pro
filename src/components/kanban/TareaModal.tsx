'use client'

import { useEffect, useRef } from 'react'
import type {
  ActualizarTareaPayload,
  CrearTareaPayload,
  TareaConCategoria,
  Categoria,
} from '@/types'
import { useTareaForm } from './useTareaForm'
import { TareaModalFields } from './TareaModalFields'

// ──────────────────────────────────────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────────────────────────────────────

interface TareaModalProps {
  tarea: TareaConCategoria | null
  panelId: string
  categorias: Categoria[]
  defaultDate?: string
  defaultCategoriaId?: string | null
  onCrear: (payload: CrearTareaPayload) => Promise<void>
  onActualizar: (id: string, payload: ActualizarTareaPayload) => Promise<void>
  onEliminar: (id: string) => Promise<void>
  onCrearCategoria: (nombre: string, colorHex: string) => Promise<Categoria | null>
  onClose: () => void
}

// ──────────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────────

export function TareaModal({
  tarea,
  panelId,
  categorias,
  defaultDate,
  onCrear,
  onActualizar,
  onEliminar,
  onCrearCategoria,
  onClose,
  defaultCategoriaId,
}: TareaModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  const {
    state,
    dispatch,
    isSubmitting,
    confirmDelete,
    setConfirmDelete,
    handleSubmit,
    handleDelete,
    esEdicion,
    estadosPermitidos,
  } = useTareaForm({ tarea, panelId, defaultDate, defaultCategoriaId: defaultCategoriaId || undefined, onCrear, onActualizar, onEliminar, onClose })

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) onClose()
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={handleOverlayClick}
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-gray-200 bg-white shadow-xl flex flex-col max-h-[90vh]">

        {/* Modal header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900">
            {esEdicion ? 'Editar tarea' : 'Nueva tarea'}
          </h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Cerrar modal"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form fields */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 overflow-y-auto px-5 py-4"
        >
          <TareaModalFields
            state={state}
            dispatch={dispatch}
            isSubmitting={isSubmitting}
            esEdicion={esEdicion}
            estadosPermitidos={estadosPermitidos}
            categorias={categorias}
            onCrearCategoria={onCrearCategoria}
          />
        </form>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 flex-shrink-0">

          {/* Eliminar */}
          {esEdicion && (
            <div className="flex items-center gap-2">
              {confirmDelete ? (
                <>
                  <span className="text-xs text-red-400">¿Confirmar eliminación?</span>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isSubmitting}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-500 disabled:opacity-50"
                  >
                    Eliminar
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    disabled={isSubmitting}
                    className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs text-gray-700 transition-colors hover:bg-gray-200"
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="rounded-lg px-3 py-1.5 text-xs text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                >
                  Eliminar
                </button>
              )}
            </div>
          )}

          {/* Guardar / Cancelar */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg px-4 py-1.5 text-sm text-gray-500 transition-colors hover:text-gray-700 disabled:opacity-40"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !state.titulo.trim()}
              className="rounded-lg bg-teal-600 px-4 py-1.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-teal-500 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear tarea'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
