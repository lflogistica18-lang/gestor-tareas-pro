'use client'

import { useState, useEffect, useCallback } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Panel, Categoria, Tarea, UrgenciaTarea } from '@/types'

export type Periodo = 'semana' | 'mes'

export interface DashboardStats {
  totalTareas: number
  cerradas: number
  enProgreso: number
  pendientes: number
  bloqueadas: number
  porUrgencia: Record<UrgenciaTarea, number>
  porPanel: Array<{ panel: Panel; count: number; cerradas: number }>
  porCategoria: Array<{ id: string; nombre: string; color_hex: string; count: number }>
  actividadDiaria: Array<{ fecha: string; creadas: number; cerradas: number }>
  tiempoTotalSegundos: number
}

function getLocalDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getPeriodoRange(periodo: Periodo, mesSeleccionado: { year: number; month: number }): { inicio: Date; fin: Date } {
  const now = new Date()
  if (periodo === 'semana') {
    const dow = now.getDay() // 0=dom, 1=lun, ...6=sáb
    const diffToMonday = dow === 0 ? -6 : 1 - dow // días hasta el lunes
    const lunes = new Date(now)
    lunes.setDate(now.getDate() + diffToMonday)
    lunes.setHours(0, 0, 0, 0)
    const domingo = new Date(lunes)
    domingo.setDate(lunes.getDate() + 6)
    domingo.setHours(23, 59, 59, 999)
    return { inicio: lunes, fin: domingo }
  } else {
    // Mes seleccionado: del 1 al último día del mes
    const inicio = new Date(mesSeleccionado.year, mesSeleccionado.month - 1, 1)
    inicio.setHours(0, 0, 0, 0)
    const fin = new Date(mesSeleccionado.year, mesSeleccionado.month, 0) // último día
    fin.setHours(23, 59, 59, 999)
    return { inicio, fin }
  }
}

function getDiasEnPeriodo(inicio: Date, fin: Date): string[] {
  const dias: string[] = []
  const current = new Date(inicio)
  current.setHours(0, 0, 0, 0)
  const endDate = new Date(fin)
  endDate.setHours(0, 0, 0, 0)

  while (current <= endDate) {
    dias.push(getLocalDateString(current))
    current.setDate(current.getDate() + 1)
  }
  return dias
}

function calcularStats(
  tareas: Tarea[],
  paneles: Panel[],
  categorias: Categoria[],
  diasPeriodo: string[]
): DashboardStats {
  const totalTareas = tareas.length
  const cerradas = tareas.filter((t) => t.estado === 'CERRADA').length
  const enProgreso = tareas.filter((t) => t.estado === 'EN_PROGRESO').length
  const pendientes = tareas.filter((t) => t.estado === 'PENDIENTE').length
  const bloqueadas = tareas.filter((t) => t.esta_bloqueada).length

  const porUrgencia: Record<UrgenciaTarea, number> = {
    BAJA: 0,
    MEDIA: 0,
    ALTA: 0,
    CRITICA: 0,
  }
  for (const tarea of tareas) {
    porUrgencia[tarea.urgencia]++
  }

  const porPanel: Array<{ panel: Panel; count: number; cerradas: number }> = paneles.map(
    (panel) => {
      const tareasDePan = tareas.filter((t) => t.panel_id === panel.id)
      return {
        panel,
        count: tareasDePan.length,
        cerradas: tareasDePan.filter((t) => t.estado === 'CERRADA').length,
      }
    }
  )

  const categoriaCounts = new Map<string, number>()
  for (const tarea of tareas) {
    if (tarea.categoria_id) {
      categoriaCounts.set(tarea.categoria_id, (categoriaCounts.get(tarea.categoria_id) ?? 0) + 1)
    }
  }

  const porCategoria = categorias
    .map((cat) => ({
      id: cat.id,
      nombre: cat.nombre,
      color_hex: cat.color_hex,
      count: categoriaCounts.get(cat.id) ?? 0,
    }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const actividadDiaria = diasPeriodo.map((fecha) => ({
    fecha,
    creadas: tareas.filter((t) => t.created_at.slice(0, 10) === fecha).length,
    cerradas: tareas.filter(
      (t) => t.estado === 'CERRADA' && t.estado_cambiado_en?.slice(0, 10) === fecha
    ).length,
  }))

  const tiempoTotalSegundos = tareas.reduce((acc, t) => acc + (t.tiempo_total_segundos ?? 0), 0)

  return {
    totalTareas,
    cerradas,
    enProgreso,
    pendientes,
    bloqueadas,
    porUrgencia,
    porPanel,
    porCategoria,
    actividadDiaria,
    tiempoTotalSegundos,
  }
}

interface UseDashboardStatsReturn {
  paneles: Panel[]
  stats: DashboardStats | null
  isLoading: boolean
  error: string | null
  panelId: string | null
  setPanelId: (id: string | null) => void
  periodo: Periodo
  setPeriodo: (p: Periodo) => void
  mesSeleccionado: { year: number; month: number }
  setMesSeleccionado: (m: { year: number; month: number }) => void
}

export function useDashboardStats(): UseDashboardStatsReturn {
  const [paneles, setPaneles] = useState<Panel[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [panelId, setPanelId] = useState<string | null>(null)
  const [periodo, setPeriodo] = useState<Periodo>('semana')
  const now = new Date()
  const [mesSeleccionado, setMesSeleccionado] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 })

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createSupabaseBrowserClient()

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        setError('No se pudo autenticar al usuario.')
        setIsLoading(false)
        return
      }

      const { data: panelesData, error: panelesError } = await supabase
        .from('paneles')
        .select('*')
        .eq('usuario_id', user.id)
        .order('orden', { ascending: true })

      if (panelesError) {
        setError('Error al cargar los paneles.')
        setIsLoading(false)
        return
      }

      const panelesResult = (panelesData ?? []) as Panel[]
      setPaneles(panelesResult)

      const { inicio, fin } = getPeriodoRange(periodo, mesSeleccionado)
      const inicioISO = inicio.toISOString()

      let query = supabase
        .from('tareas')
        .select('*')
        .eq('usuario_id', user.id)
        .gte('created_at', inicioISO)
        .lte('created_at', fin.toISOString())

      if (panelId) {
        query = query.eq('panel_id', panelId)
      }

      const { data: tareasData, error: tareasError } = await query

      if (tareasError) {
        setError('Error al cargar las tareas.')
        setIsLoading(false)
        return
      }

      const tareas = (tareasData ?? []) as Tarea[]

      const panelesParaCategs = panelId
        ? panelesResult.filter((p) => p.id === panelId)
        : panelesResult

      const panelIds = panelesParaCategs.map((p) => p.id)

      let categorias: Categoria[] = []
      if (panelIds.length > 0) {
        const { data: catsData, error: catsError } = await supabase
          .from('categorias')
          .select('*')
          .eq('usuario_id', user.id)
          .in('panel_id', panelIds)

        if (catsError) {
          setError('Error al cargar las categorías.')
          setIsLoading(false)
          return
        }
        categorias = (catsData ?? []) as Categoria[]
      }

      const diasPeriodo = getDiasEnPeriodo(inicio, fin)
      const calculatedStats = calcularStats(tareas, panelesResult, categorias, diasPeriodo)
      setStats(calculatedStats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado.')
    } finally {
      setIsLoading(false)
    }
  }, [panelId, periodo, mesSeleccionado])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    paneles,
    stats,
    isLoading,
    error,
    panelId,
    setPanelId,
    periodo,
    setPeriodo,
    mesSeleccionado,
    setMesSeleccionado,
  }
}
