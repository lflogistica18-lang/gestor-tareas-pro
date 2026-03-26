'use client'

import { useState } from 'react'
import type { EstadoTarea, UrgenciaTarea, Categoria } from '@/types'
import { COLORES_URGENCIA } from '@/types'
import type { TareaFormState, UseTareaFormReturn } from './useTareaForm'

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-medium text-gray-500 mb-1">
      {children}
    </label>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────────────────────────────────────

interface TareaModalFieldsProps {
  state: TareaFormState
  dispatch: UseTareaFormReturn['dispatch']
  isSubmitting: boolean
  esEdicion: boolean
  estadosPermitidos: EstadoTarea[]
  categorias: Categoria[]
  onCrearCategoria: (nombre: string, colorHex: string) => Promise<Categoria | null>
}

// ──────────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────────

const COLORES_CATEGORIA = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316',
]

export function TareaModalFields({
  state,
  dispatch,
  isSubmitting,
  esEdicion,
  estadosPermitidos,
  categorias,
  onCrearCategoria,
}: TareaModalFieldsProps) {
  const [showNewCat, setShowNewCat] = useState(false)
  const [newCatNombre, setNewCatNombre] = useState('')
  const [newCatColor, setNewCatColor] = useState<string>(COLORES_CATEGORIA[0] ?? '#3b82f6')
  const [creandoCat, setCreandoCat] = useState(false)

  const handleCrearCategoria = async () => {
    if (!newCatNombre.trim()) return
    setCreandoCat(true)
    const cat = await onCrearCategoria(newCatNombre.trim(), newCatColor)
    setCreandoCat(false)
    if (cat) {
      dispatch({ type: 'SET_CATEGORIA', value: cat.id })
      setShowNewCat(false)
      setNewCatNombre('')
      setNewCatColor(COLORES_CATEGORIA[0] ?? '#3b82f6')
    }
  }
  return (
    <>
      {/* Título */}
      <div>
        <FieldLabel htmlFor="titulo">Título *</FieldLabel>
        <input
          id="titulo"
          type="text"
          required
          value={state.titulo}
          onChange={e => dispatch({ type: 'SET_TITULO', value: e.target.value })}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30"
          placeholder="¿Qué hay que hacer?"
          disabled={isSubmitting}
        />
      </div>

      {/* Detalle */}
      <div>
        <FieldLabel htmlFor="detalle">Detalle</FieldLabel>
        <textarea
          id="detalle"
          rows={3}
          value={state.detalle}
          onChange={e => dispatch({ type: 'SET_DETALLE', value: e.target.value })}
          className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30"
          placeholder="Descripción opcional..."
          disabled={isSubmitting}
        />
      </div>

      {/* Urgencia + Estado */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel htmlFor="urgencia">Urgencia</FieldLabel>
          <select
            id="urgencia"
            value={state.urgencia}
            onChange={e => dispatch({ type: 'SET_URGENCIA', value: e.target.value as UrgenciaTarea })}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-teal-500"
            disabled={isSubmitting}
          >
            {(['CRITICA', 'ALTA', 'MEDIA', 'BAJA'] as UrgenciaTarea[]).map(u => (
              <option key={u} value={u} style={{ color: COLORES_URGENCIA[u] }}>
                {u}
              </option>
            ))}
          </select>
        </div>

        {esEdicion && (
          <div>
            <FieldLabel htmlFor="estado">Estado</FieldLabel>
            <select
              id="estado"
              value={state.estado}
              onChange={e => dispatch({ type: 'SET_ESTADO', value: e.target.value as EstadoTarea })}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-teal-500"
              disabled={isSubmitting}
            >
              {estadosPermitidos.map(est => (
                <option key={est} value={est}>{est.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Categoria */}
      <div>
        <FieldLabel htmlFor="categoria">Categoría</FieldLabel>
        <div className="flex gap-2">
          <select
            id="categoria"
            value={state.categoriaId}
            onChange={e => dispatch({ type: 'SET_CATEGORIA', value: e.target.value })}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-teal-500"
            disabled={isSubmitting}
          >
            <option value="">Sin categoría</option>
            {categorias.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.nombre}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowNewCat(!showNewCat)}
            className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-200 disabled:opacity-40"
            disabled={isSubmitting}
            title="Nueva categoría"
          >
            +
          </button>
        </div>

        {showNewCat && (
          <div className="mt-2 flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50/50 p-3">
            <input
              type="text"
              value={newCatNombre}
              onChange={e => setNewCatNombre(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void handleCrearCategoria() } }}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-teal-500"
              placeholder="Nombre de la categoría"
              disabled={creandoCat}
            />
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">Color:</span>
              <div className="flex gap-1.5">
                {COLORES_CATEGORIA.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewCatColor(c)}
                    className={`h-5 w-5 rounded-full transition-all ${newCatColor === c ? 'ring-2 ring-white ring-offset-1 ring-offset-gray-50 scale-110' : 'opacity-60 hover:opacity-100'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void handleCrearCategoria()}
                disabled={creandoCat || !newCatNombre.trim()}
                className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-teal-500 disabled:opacity-40"
              >
                {creandoCat ? 'Creando…' : 'Crear categoría'}
              </button>
              <button
                type="button"
                onClick={() => { setShowNewCat(false); setNewCatNombre('') }}
                className="rounded-lg px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Progreso */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <FieldLabel htmlFor="progreso">Progreso</FieldLabel>
          <span className="text-xs font-medium text-gray-500 tabular-nums">{state.progreso}%</span>
        </div>
        <input
          id="progreso"
          type="range"
          min={0}
          max={100}
          value={state.progreso}
          onChange={e => dispatch({ type: 'SET_PROGRESO', value: Number(e.target.value) })}
          className="w-full accent-teal-500 disabled:opacity-40"
          disabled={isSubmitting || state.estaBloqueada}
        />
        {state.estaBloqueada && (
          <p className="mt-1 text-[11px] text-red-400">
            El progreso no se puede editar mientras la tarea está bloqueada.
          </p>
        )}
      </div>

      {/* Fecha vencimiento */}
      <div>
        <FieldLabel htmlFor="fecha">Fecha de vencimiento</FieldLabel>
        <input
          id="fecha"
          type="date"
          value={state.fechaVencimiento}
          onChange={e => dispatch({ type: 'SET_FECHA_VENCIMIENTO', value: e.target.value })}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-teal-500"
          disabled={isSubmitting}
        />
      </div>

      {/* Personas involucradas */}
      <div>
        <FieldLabel htmlFor="personas">Personas involucradas</FieldLabel>
        <div className="flex gap-2">
          <input
            id="personas"
            type="text"
            value={state.personasInput}
            onChange={e => dispatch({ type: 'SET_PERSONAS_INPUT', value: e.target.value })}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                dispatch({ type: 'ADD_PERSONA' })
              }
            }}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-teal-500"
            placeholder="Nombre y Enter para agregar"
            disabled={isSubmitting}
          />
          <button
            type="button"
            onClick={() => dispatch({ type: 'ADD_PERSONA' })}
            className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-200 disabled:opacity-40"
            disabled={isSubmitting || !state.personasInput.trim()}
          >
            +
          </button>
        </div>
        {state.personas.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {state.personas.map((persona, i) => (
              <span
                key={i}
                className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
              >
                {persona}
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'REMOVE_PERSONA', index: i })}
                  className="ml-0.5 text-gray-400 hover:text-red-500 transition-colors"
                  disabled={isSubmitting}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Bloqueada toggle */}
      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
        <div>
          <p className="text-sm font-medium text-gray-900">Bloqueada</p>
          <p className="text-xs text-gray-500">Impide editar el progreso</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={state.estaBloqueada}
          onClick={() => dispatch({ type: 'SET_BLOQUEADA', value: !state.estaBloqueada })}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${
            state.estaBloqueada ? 'bg-red-500' : 'bg-gray-300'
          }`}
          disabled={isSubmitting}
        >
          <span
            className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-200 ${
              state.estaBloqueada ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>
    </>
  )
}
