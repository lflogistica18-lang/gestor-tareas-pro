'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type {
  ActualizarTareaPayload,
  CrearTareaPayload,
  EstadoTarea,
  TareaConCategoria,
  Categoria,
} from '@/types'
import { ordenarTareas, esTransicionPermitida } from './useTareasUtils'

// ──────────────────────────────────────────────────────────────────────────────
// Public interface
// ──────────────────────────────────────────────────────────────────────────────

export interface UseTareasReturn {
  tareas: TareaConCategoria[]
  categorias: Categoria[]
  isLoading: boolean
  error: string | null
  cargarTareas: (panelId: string) => Promise<void>
  crearTarea: (payload: CrearTareaPayload) => Promise<void>
  actualizarTarea: (id: string, payload: ActualizarTareaPayload) => Promise<void>
  eliminarTarea: (id: string) => Promise<void>
  moverTarea: (id: string, nuevoEstado: EstadoTarea) => Promise<void>
  crearCategoria: (nombre: string, colorHex: string) => Promise<Categoria | null>
  esTransicionValida: (estadoActual: EstadoTarea, nuevoEstado: EstadoTarea) => boolean
}

// ──────────────────────────────────────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────────────────────────────────────

export function useTareas(): UseTareasReturn {
  const [tareas, setTareas] = useState<TareaConCategoria[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const panelIdRef = useRef<string | null>(null)
  const supabase = createSupabaseBrowserClient()

  // ── Cargar tareas ──────────────────────────────────────────────────────────

  const cargarTareas = useCallback(async (panelId: string) => {
    panelIdRef.current = panelId
    setIsLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('tareas')
      .select('*, categoria:categorias(id, nombre, color_hex)')
      .eq('panel_id', panelId)

    if (fetchError) {
      setError(`Error al cargar tareas: ${fetchError.message}`)
      setIsLoading(false)
      return
    }

    setTareas(ordenarTareas((data ?? []) as TareaConCategoria[]))
    
    // Cargar categorias del panel
    const { data: catData } = await supabase
      .from('categorias')
      .select('*')
      .eq('panel_id', panelId)
      .order('nombre', { ascending: true })
      
    if (catData) setCategorias(catData as Categoria[])

    setIsLoading(false)
  }, [supabase])

  // ── Crear tarea ────────────────────────────────────────────────────────────

  const crearTarea = useCallback(async (payload: CrearTareaPayload) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const optimisticId = `optimistic-${Date.now()}`
    const optimisticTarea: TareaConCategoria = {
      id: optimisticId,
      usuario_id: user.id,
      panel_id: payload.panel_id,
      categoria_id: payload.categoria_id ?? null,
      titulo: payload.titulo,
      detalle: payload.detalle ?? null,
      progreso: 0,
      estado: 'PENDIENTE',
      urgencia: payload.urgencia ?? 'MEDIA',
      esta_bloqueada: false,
      fecha_vencimiento: payload.fecha_vencimiento ?? null,
      personas_involucradas: payload.personas_involucradas ?? [],
      tiempo_total_segundos: 0,
      timer_activo_desde: null,
      estado_cambiado_en: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      categoria: null,
    }

    setTareas(prev => ordenarTareas([...prev, optimisticTarea]))

    const { data, error: insertError } = await supabase
      .from('tareas')
      .insert({
        usuario_id: user.id,
        panel_id: payload.panel_id,
        titulo: payload.titulo,
        detalle: payload.detalle ?? null,
        urgencia: payload.urgencia ?? 'MEDIA',
        fecha_vencimiento: payload.fecha_vencimiento ?? null,
        categoria_id: payload.categoria_id ?? null,
        personas_involucradas: payload.personas_involucradas ?? [],
      })
      .select('*, categoria:categorias(id, nombre, color_hex)')
      .single()

    if (insertError) {
      setTareas(prev => prev.filter(t => t.id !== optimisticId))
      setError(`Error al crear tarea: ${insertError.message}`)
      return
    }

    setTareas(prev =>
      ordenarTareas(
        prev.map(t => (t.id === optimisticId ? (data as TareaConCategoria) : t))
      )
    )
  }, [supabase])

  // ── Actualizar tarea ───────────────────────────────────────────────────────

  const actualizarTarea = useCallback(async (id: string, payload: ActualizarTareaPayload) => {
    const snapshot = tareas.find(t => t.id === id)
    if (!snapshot) return

    setTareas(prev =>
      ordenarTareas(
        prev.map(t =>
          t.id === id ? { ...t, ...payload, updated_at: new Date().toISOString() } : t
        )
      )
    )

    const { error: updateError } = await supabase
      .from('tareas')
      .update(payload)
      .eq('id', id)

    if (updateError) {
      setTareas(prev => prev.map(t => (t.id === id ? snapshot : t)))
      setError(`Error al actualizar tarea: ${updateError.message}`)
    }
  }, [supabase, tareas])

  // ── Eliminar tarea ─────────────────────────────────────────────────────────

  const eliminarTarea = useCallback(async (id: string) => {
    const snapshot = tareas.find(t => t.id === id)
    if (!snapshot) return

    setTareas(prev => prev.filter(t => t.id !== id))

    const { error: deleteError } = await supabase
      .from('tareas')
      .delete()
      .eq('id', id)

    if (deleteError) {
      setTareas(prev => ordenarTareas([...prev, snapshot]))
      setError(`Error al eliminar tarea: ${deleteError.message}`)
    }
  }, [supabase, tareas])

  // ── Crear categoría ───────────────────────────────────────────────────────

  const crearCategoria = useCallback(async (nombre: string, colorHex: string): Promise<Categoria | null> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !panelIdRef.current) return null

    const { data, error: insertError } = await supabase
      .from('categorias')
      .insert({
        usuario_id: user.id,
        panel_id: panelIdRef.current,
        nombre: nombre.trim(),
        color_hex: colorHex,
      })
      .select('*')
      .single()

    if (insertError) {
      setError(`Error al crear categoría: ${insertError.message}`)
      return null
    }

    const nuevaCat = data as Categoria
    setCategorias(prev => [...prev, nuevaCat].sort((a, b) => a.nombre.localeCompare(b.nombre)))
    return nuevaCat
  }, [supabase])

  // ── Mover tarea ────────────────────────────────────────────────────────────

  const moverTarea = useCallback(async (id: string, nuevoEstado: EstadoTarea) => {
    const tarea = tareas.find(t => t.id === id)
    if (!tarea) return
    if (!esTransicionPermitida(tarea.estado, nuevoEstado)) return

    const payload: ActualizarTareaPayload = { estado: nuevoEstado }
    // Auto-sync progreso al mover por D&D
    if (nuevoEstado === 'CERRADA') payload.progreso = 100
    if (nuevoEstado === 'PENDIENTE' && tarea.progreso > 0) payload.progreso = 0

    await actualizarTarea(id, payload)
  }, [tareas, actualizarTarea])

  // ── Realtime subscription ──────────────────────────────────────────────────

  useEffect(() => {
    const channel = supabase
      .channel('tareas-cambios')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tareas' },
        async (payload) => {
          const panelId = panelIdRef.current
          if (!panelId) return

          if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as { id?: string }).id
            if (oldId) setTareas(prev => prev.filter(t => t.id !== oldId))
            return
          }

          const record = payload.new as { panel_id?: string; id?: string }
          if (record.panel_id !== panelId || !record.id) return

          const { data } = await supabase
            .from('tareas')
            .select('*, categoria:categorias(id, nombre, color_hex)')
            .eq('id', record.id)
            .single()

          if (!data) return
          const tarea = data as TareaConCategoria

          if (payload.eventType === 'INSERT') {
            setTareas(prev => {
              const exists = prev.some(t => t.id === tarea.id)
              if (exists) return prev
              // Si hay una tarea optimistic, reemplazarla en vez de duplicar
              const hasOptimistic = prev.some(t => t.id.startsWith('optimistic-'))
              if (hasOptimistic) {
                return ordenarTareas(
                  prev.map(t => t.id.startsWith('optimistic-') ? tarea : t)
                )
              }
              return ordenarTareas([...prev, tarea])
            })
          } else {
            setTareas(prev =>
              ordenarTareas(prev.map(t => (t.id === tarea.id ? tarea : t)))
            )
          }
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [supabase])

  return {
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
    esTransicionValida: esTransicionPermitida,
  }
}
