'use client'

import { useEffect, useReducer, useRef, useState } from 'react'
import type {
  ActualizarTareaPayload,
  CrearTareaPayload,
  EstadoTarea,
  TareaConCategoria,
  UrgenciaTarea,
} from '@/types'
import { ORDEN_ESTADOS } from '@/types'

// ──────────────────────────────────────────────────────────────────────────────
// Transiciones válidas (espejo del hook useTareas para UI)
// ──────────────────────────────────────────────────────────────────────────────

const TRANSICIONES_VALIDAS: Record<EstadoTarea, EstadoTarea[]> = {
  PENDIENTE: ['EN_PROGRESO'],
  EN_PROGRESO: ['CURACION'],
  CURACION: ['EN_PROGRESO', 'CERRADA'],
  CERRADA: [],
}

export function estadosDisponibles(actual: EstadoTarea): EstadoTarea[] {
  return [actual, ...TRANSICIONES_VALIDAS[actual]]
}

// ──────────────────────────────────────────────────────────────────────────────
// Form state
// ──────────────────────────────────────────────────────────────────────────────

export interface TareaFormState {
  titulo: string
  detalle: string
  urgencia: UrgenciaTarea
  progreso: number
  estado: EstadoTarea
  fechaVencimiento: string
  personasInput: string
  personas: string[]
  estaBloqueada: boolean
  categoriaId: string
}

type FormAction =
  | { type: 'SET_TITULO'; value: string }
  | { type: 'SET_DETALLE'; value: string }
  | { type: 'SET_URGENCIA'; value: UrgenciaTarea }
  | { type: 'SET_PROGRESO'; value: number }
  | { type: 'SET_ESTADO'; value: EstadoTarea }
  | { type: 'SET_FECHA_VENCIMIENTO'; value: string }
  | { type: 'SET_PERSONAS_INPUT'; value: string }
  | { type: 'ADD_PERSONA' }
  | { type: 'REMOVE_PERSONA'; index: number }
  | { type: 'SET_BLOQUEADA'; value: boolean }
  | { type: 'SET_CATEGORIA'; value: string }
  | { type: 'RESET'; state: TareaFormState }

// ──────────────────────────────────────────────────────────────────────────────
// Auto-sync helpers: progreso ↔ estado
// ──────────────────────────────────────────────────────────────────────────────

function estadoDerivadoPorProgreso(progreso: number, estadoActual: EstadoTarea): EstadoTarea {
  // Progreso > 0 y sigue PENDIENTE → mover a EN_PROGRESO
  if (progreso > 0 && estadoActual === 'PENDIENTE') return 'EN_PROGRESO'
  // Progreso = 100 y está en CURACION → cerrar
  if (progreso >= 100 && estadoActual === 'CURACION') return 'CERRADA'
  // Progreso < 100 y está CERRADA → volver a CURACION
  if (progreso < 100 && estadoActual === 'CERRADA') return 'CURACION'
  return estadoActual
}

function progresoDerivadoPorEstado(estado: EstadoTarea, progresoActual: number): number {
  // Si se cierra, forzar 100%
  if (estado === 'CERRADA') return 100
  // Si vuelve a PENDIENTE, forzar 0%
  if (estado === 'PENDIENTE' && progresoActual > 0) return 0
  return progresoActual
}

function formReducer(state: TareaFormState, action: FormAction): TareaFormState {
  switch (action.type) {
    case 'SET_TITULO': return { ...state, titulo: action.value }
    case 'SET_DETALLE': return { ...state, detalle: action.value }
    case 'SET_URGENCIA': return { ...state, urgencia: action.value }
    case 'SET_PROGRESO': {
      const nuevoEstado = estadoDerivadoPorProgreso(action.value, state.estado)
      return { ...state, progreso: action.value, estado: nuevoEstado }
    }
    case 'SET_ESTADO': {
      const nuevoProgreso = progresoDerivadoPorEstado(action.value, state.progreso)
      return { ...state, estado: action.value, progreso: nuevoProgreso }
    }
    case 'SET_FECHA_VENCIMIENTO': return { ...state, fechaVencimiento: action.value }
    case 'SET_PERSONAS_INPUT': return { ...state, personasInput: action.value }
    case 'ADD_PERSONA': {
      const trimmed = state.personasInput.trim()
      if (!trimmed || state.personas.includes(trimmed)) return { ...state, personasInput: '' }
      return { ...state, personas: [...state.personas, trimmed], personasInput: '' }
    }
    case 'REMOVE_PERSONA':
      return { ...state, personas: state.personas.filter((_, i) => i !== action.index) }
    case 'SET_BLOQUEADA': return { ...state, estaBloqueada: action.value }
    case 'SET_CATEGORIA': return { ...state, categoriaId: action.value }
    case 'RESET': return action.state
  }
}

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function initialStateFromTarea(tarea: TareaConCategoria | null, defaultDate?: string, defaultCategoriaId?: string): TareaFormState {
  if (!tarea) {
    return {
      titulo: '',
      detalle: '',
      urgencia: 'MEDIA',
      progreso: 0,
      estado: 'PENDIENTE',
      fechaVencimiento: defaultDate || hoyISO(),
      personasInput: '',
      personas: [],
      estaBloqueada: false,
      categoriaId: defaultCategoriaId || '',
    }
  }
  return {
    titulo: tarea.titulo,
    detalle: tarea.detalle ?? '',
    urgencia: tarea.urgencia,
    progreso: tarea.progreso,
    estado: tarea.estado,
    fechaVencimiento: tarea.fecha_vencimiento
      ? tarea.fecha_vencimiento.slice(0, 10)
      : '',
    personasInput: '',
    personas: tarea.personas_involucradas,
    estaBloqueada: tarea.esta_bloqueada,
    categoriaId: tarea.categoria_id ?? '',
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────────────────────────────────────

interface UseTareaFormProps {
  tarea: TareaConCategoria | null
  panelId: string
  defaultDate?: string
  defaultCategoriaId?: string
  onCrear: (payload: CrearTareaPayload) => Promise<void>
  onActualizar: (id: string, payload: ActualizarTareaPayload) => Promise<void>
  onEliminar: (id: string) => Promise<void>
  onClose: () => void
}

export interface UseTareaFormReturn {
  state: TareaFormState
  dispatch: React.Dispatch<FormAction>
  isSubmitting: boolean
  confirmDelete: boolean
  setConfirmDelete: (v: boolean) => void
  handleSubmit: (e: React.FormEvent) => Promise<void>
  handleDelete: () => Promise<void>
  esEdicion: boolean
  estadosPermitidos: EstadoTarea[]
  ordenEstados: EstadoTarea[]
}

export function useTareaForm({
  tarea,
  panelId,
  defaultDate,
  onCrear,
  onActualizar,
  onEliminar,
  onClose,
  defaultCategoriaId,
}: UseTareaFormProps): UseTareaFormReturn {
  const [state, dispatch] = useReducer(formReducer, initialStateFromTarea(tarea, defaultDate, defaultCategoriaId))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const esEdicion = tarea !== null

  // Reset form when tarea changes
  const prevTareaId = useRef<string | null>(tarea?.id ?? null)
  useEffect(() => {
    if (tarea?.id !== prevTareaId.current) {
      dispatch({ type: 'RESET', state: initialStateFromTarea(tarea, defaultDate, defaultCategoriaId) })
      prevTareaId.current = tarea?.id ?? null
    }
  }, [tarea, defaultDate, defaultCategoriaId])

  const estadosPermitidos = esEdicion ? estadosDisponibles(tarea!.estado) : ['PENDIENTE' as EstadoTarea]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!state.titulo.trim()) return
    setIsSubmitting(true)
    try {
      if (esEdicion) {
        const payload: ActualizarTareaPayload = {
          titulo: state.titulo.trim(),
          detalle: state.detalle.trim() || undefined,
          urgencia: state.urgencia,
          progreso: state.progreso,
          estado: state.estado,
          esta_bloqueada: state.estaBloqueada,
          fecha_vencimiento: state.fechaVencimiento || null,
          personas_involucradas: state.personas,
          categoria_id: state.categoriaId || null,
        }
        await onActualizar(tarea!.id, payload)
      } else {
        const payload: CrearTareaPayload = {
          panel_id: panelId,
          titulo: state.titulo.trim(),
          detalle: state.detalle.trim() || undefined,
          urgencia: state.urgencia,
          fecha_vencimiento: state.fechaVencimiento || undefined,
          personas_involucradas: state.personas,
          categoria_id: state.categoriaId || undefined,
        }
        await onCrear(payload)
      }
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!tarea) return
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setIsSubmitting(true)
    try {
      await onEliminar(tarea.id)
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    state,
    dispatch,
    isSubmitting,
    confirmDelete,
    setConfirmDelete,
    handleSubmit,
    handleDelete,
    esEdicion,
    estadosPermitidos,
    ordenEstados: ORDEN_ESTADOS,
  }
}
