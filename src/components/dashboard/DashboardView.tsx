'use client'

import { useDashboardStats, type Periodo } from '@/hooks/useDashboardStats'
import { COLORES_URGENCIA, type UrgenciaTarea } from '@/types'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatTiempo(segundos: number): string {
  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function diaAbreviado(fecha: string): string {
  const dias = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
  const parts = fecha.split('-')
  const year = Number(parts[0] ?? '2000')
  const month = Number(parts[1] ?? '1')
  const day = Number(parts[2] ?? '1')
  const d = new Date(year, month - 1, day)
  return dias[d.getDay()] ?? ''
}

function diaNumero(fecha: string): string {
  const parts = fecha.split('-')
  return String(Number(parts[2] ?? '0'))
}

// ─── Skeleton ──────────────────────────────────────────────────────────────

function SkeletonDashboard() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex-1 h-28 bg-gray-200 rounded-2xl" />
        ))}
      </div>
      <div className="flex gap-6">
        <div className="flex-1 h-56 bg-gray-200 rounded-2xl" />
        <div className="w-80 h-56 bg-gray-200 rounded-2xl" />
      </div>
      <div className="h-40 bg-gray-200 rounded-2xl" />
    </div>
  )
}

// ─── Stat Card ─────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: number | string
  accent?: string
  subLabel?: string
}

function StatCard({ label, value, accent = 'text-gray-900', subLabel }: StatCardProps) {
  return (
    <div className="flex-1 min-w-0 bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
        {label}
      </span>
      <span className={`text-3xl font-bold leading-none ${accent}`}>{value}</span>
      {subLabel && <span className="text-xs text-gray-400 mt-1">{subLabel}</span>}
    </div>
  )
}

// ─── Actividad Diaria ──────────────────────────────────────────────────────

interface ActividadDiariaProps {
  data: Array<{ fecha: string; creadas: number; cerradas: number }>
  periodo: Periodo
}

function ActividadDiaria({ data, periodo }: ActividadDiariaProps) {
  const maxVal = Math.max(...data.map((d) => Math.max(d.creadas, d.cerradas)), 1)
  const BAR_MAX_H = 120 // px

  // Para mes: agrupar por semana si hay muchos días
  const isMes = periodo === 'mes'
  const mostrarCompacto = isMes && data.length > 14

  // Agrupación por semana para mes
  type SemanaDato = { semana: string; creadas: number; cerradas: number }
  const datosSemana: SemanaDato[] = []

  if (mostrarCompacto) {
    let semanaIdx = 0
    let acumCreadas = 0
    let acumCerradas = 0
    let primerFecha = data[0]?.fecha ?? ''

    data.forEach((d, i) => {
      acumCreadas += d.creadas
      acumCerradas += d.cerradas
      if ((i + 1) % 7 === 0 || i === data.length - 1) {
        datosSemana.push({
          semana: `S${semanaIdx + 1} (${primerFecha.slice(5)})`,
          creadas: acumCreadas,
          cerradas: acumCerradas,
        })
        semanaIdx++
        acumCreadas = 0
        acumCerradas = 0
        primerFecha = data[i + 1]?.fecha ?? ''
      }
    })
  }

  const itemsMostrar = mostrarCompacto ? datosSemana : data

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">Actividad Diaria</span>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm bg-teal-500" />
            Creadas
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm bg-emerald-400" />
            Cerradas
          </span>
        </div>
      </div>

      {itemsMostrar.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-gray-300 text-sm">
          Sin datos para el período
        </div>
      ) : (
        <div
          className="flex items-end gap-1 overflow-x-auto pb-1"
          style={{ minHeight: `${BAR_MAX_H + 28}px` }}
        >
          {mostrarCompacto
            ? (itemsMostrar as SemanaDato[]).map((item) => {
                const hCreadas = Math.round((item.creadas / maxVal) * BAR_MAX_H)
                const hCerradas = Math.round((item.cerradas / maxVal) * BAR_MAX_H)
                return (
                  <div key={item.semana} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                    <div
                      className="flex items-end gap-0.5 w-full justify-center"
                      style={{ height: `${BAR_MAX_H}px` }}
                    >
                      <div
                        className="bg-teal-500 rounded-t-sm w-4"
                        style={{ height: `${Math.max(hCreadas, item.creadas > 0 ? 2 : 0)}px` }}
                        title={`Creadas: ${item.creadas}`}
                      />
                      <div
                        className="bg-emerald-400 rounded-t-sm w-4"
                        style={{ height: `${Math.max(hCerradas, item.cerradas > 0 ? 2 : 0)}px` }}
                        title={`Cerradas: ${item.cerradas}`}
                      />
                    </div>
                    <span className="text-[10px] text-gray-400 truncate w-full text-center">
                      {item.semana.split(' ')[0]}
                    </span>
                  </div>
                )
              })
            : (itemsMostrar as Array<{ fecha: string; creadas: number; cerradas: number }>).map(
                (item) => {
                  const hCreadas = Math.round((item.creadas / maxVal) * BAR_MAX_H)
                  const hCerradas = Math.round((item.cerradas / maxVal) * BAR_MAX_H)
                  const label = isMes ? diaNumero(item.fecha) : diaAbreviado(item.fecha)
                  return (
                    <div
                      key={item.fecha}
                      className="flex flex-col items-center gap-1 flex-1 min-w-0"
                    >
                      <div
                        className="flex items-end gap-0.5 w-full justify-center"
                        style={{ height: `${BAR_MAX_H}px` }}
                      >
                        <div
                          className="bg-teal-500 rounded-t-sm"
                          style={{
                            width: isMes ? '3px' : '8px',
                            height: `${Math.max(hCreadas, item.creadas > 0 ? 2 : 0)}px`,
                          }}
                          title={`Creadas: ${item.creadas}`}
                        />
                        <div
                          className="bg-emerald-400 rounded-t-sm"
                          style={{
                            width: isMes ? '3px' : '8px',
                            height: `${Math.max(hCerradas, item.cerradas > 0 ? 2 : 0)}px`,
                          }}
                          title={`Cerradas: ${item.cerradas}`}
                        />
                      </div>
                      <span className="text-[10px] text-gray-400 truncate w-full text-center">
                        {label}
                      </span>
                    </div>
                  )
                }
              )}
        </div>
      )}
    </div>
  )
}

// ─── Donut Urgencia ────────────────────────────────────────────────────────

interface DonutUrgenciaProps {
  porUrgencia: Record<UrgenciaTarea, number>
}

const URGENCIA_LABELS: Record<UrgenciaTarea, string> = {
  BAJA: 'Baja',
  MEDIA: 'Media',
  ALTA: 'Alta',
  CRITICA: 'Crítica',
}

function DonutUrgencia({ porUrgencia }: DonutUrgenciaProps) {
  const urgencias: UrgenciaTarea[] = ['CRITICA', 'ALTA', 'MEDIA', 'BAJA']
  const total = urgencias.reduce((acc, u) => acc + porUrgencia[u], 0)

  const cx = 80
  const cy = 80
  const r = 60
  const stroke = 20
  const circumference = 2 * Math.PI * r // ≈ 376.99

  if (total === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4">
        <span className="text-sm font-semibold text-gray-700">Distribución por Urgencia</span>
        <div className="flex items-center justify-center">
          <svg width="160" height="160" viewBox="0 0 160 160">
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth={stroke}
            />
            <text x={cx} y={cy + 5} textAnchor="middle" className="text-xs" fill="#9ca3af" fontSize="12">
              Sin datos
            </text>
          </svg>
        </div>
      </div>
    )
  }

  // Build segments
  let offset = 0
  const segments = urgencias
    .filter((u) => porUrgencia[u] > 0)
    .map((u) => {
      const pct = porUrgencia[u] / total
      const dash = pct * circumference
      const gap = circumference - dash
      const seg = {
        urgencia: u,
        color: COLORES_URGENCIA[u],
        dasharray: `${dash} ${gap}`,
        dashoffset: -offset,
        count: porUrgencia[u],
      }
      offset += dash
      return seg
    })

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4">
      <span className="text-sm font-semibold text-gray-700">Distribución por Urgencia</span>
      <div className="flex items-center gap-6">
        <svg
          width="160"
          height="160"
          viewBox="0 0 160 160"
          style={{ flexShrink: 0 }}
        >
          {/* Track */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="#f3f4f6"
            strokeWidth={stroke}
          />
          {segments.map((seg) => (
            <circle
              key={seg.urgencia}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={stroke}
              strokeDasharray={seg.dasharray}
              strokeDashoffset={seg.dashoffset}
              style={{ transform: 'rotate(-90deg)', transformOrigin: '80px 80px' }}
            />
          ))}
          <text
            x={cx}
            y={cy - 6}
            textAnchor="middle"
            fill="#374151"
            fontSize="22"
            fontWeight="bold"
          >
            {total}
          </text>
          <text x={cx} y={cy + 12} textAnchor="middle" fill="#9ca3af" fontSize="11">
            tareas
          </text>
        </svg>

        <div className="flex flex-col gap-2">
          {urgencias.map((u) => (
            <div key={u} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: COLORES_URGENCIA[u] }}
              />
              <span className="text-xs text-gray-600 w-14">{URGENCIA_LABELS[u]}</span>
              <span className="text-xs font-semibold text-gray-800">{porUrgencia[u]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Por Panel ─────────────────────────────────────────────────────────────

interface PorPanelProps {
  porPanel: Array<{ panel: { id: string; nombre: string; color_hex: string }; count: number; cerradas: number }>
}

function PorPanel({ porPanel }: PorPanelProps) {
  const maxCount = Math.max(...porPanel.map((p) => p.count), 1)
  const visibles = porPanel.filter((p) => p.count > 0)

  if (visibles.length === 0) return null

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4">
      <span className="text-sm font-semibold text-gray-700">Actividad por Panel</span>
      <div className="flex flex-col gap-3">
        {visibles.map(({ panel, count, cerradas }) => {
          const pct = Math.round((count / maxCount) * 100)
          const pctCerradas = count > 0 ? Math.round((cerradas / count) * 100) : 0
          return (
            <div key={panel.id} className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: panel.color_hex }}
                  />
                  <span className="text-sm text-gray-700">{panel.nombre}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{cerradas}/{count}</span>
                  <span className="text-gray-300">·</span>
                  <span>{pctCerradas}% cerradas</span>
                </div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: panel.color_hex,
                    opacity: 0.8,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Filtros ───────────────────────────────────────────────────────────────

interface FiltrosProps {
  paneles: Array<{ id: string; nombre: string }>
  panelId: string | null
  setPanelId: (id: string | null) => void
  periodo: Periodo
  setPeriodo: (p: Periodo) => void
  mesSeleccionado: { year: number; month: number }
  setMesSeleccionado: (m: { year: number; month: number }) => void
}

// Nombres de meses en español
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function Filtros({ paneles, panelId, setPanelId, periodo, setPeriodo, mesSeleccionado, setMesSeleccionado }: FiltrosProps) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Panel chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setPanelId(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            panelId === null
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Todos
        </button>
        {paneles.map((p) => (
          <button
            key={p.id}
            onClick={() => setPanelId(p.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              panelId === p.id
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {p.nombre}
          </button>
        ))}
      </div>

      {/* Período chips */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1">
        <button
          onClick={() => setPeriodo('semana')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            periodo === 'semana' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
          }`}
        >
          Esta semana
        </button>
        <button
          onClick={() => setPeriodo('mes')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            periodo === 'mes' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
          }`}
        >
          Este mes
        </button>
      </div>

      {periodo === 'mes' && (
        <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 px-3 py-1.5 shadow-sm">
          <button
            onClick={() => {
              const prev = mesSeleccionado.month === 1
                ? { year: mesSeleccionado.year - 1, month: 12 }
                : { year: mesSeleccionado.year, month: mesSeleccionado.month - 1 }
              setMesSeleccionado(prev)
            }}
            className="text-gray-400 hover:text-gray-700 transition-colors p-0.5"
            aria-label="Mes anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-gray-700 min-w-[130px] text-center">
            {MESES[(mesSeleccionado.month - 1)]} {mesSeleccionado.year}
          </span>
          <button
            onClick={() => {
              const next = mesSeleccionado.month === 12
                ? { year: mesSeleccionado.year + 1, month: 1 }
                : { year: mesSeleccionado.year, month: mesSeleccionado.month + 1 }
              setMesSeleccionado(next)
            }}
            className="text-gray-400 hover:text-gray-700 transition-colors p-0.5"
            aria-label="Mes siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Dashboard View (main) ─────────────────────────────────────────────────

export function DashboardView() {
  const {
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
  } = useDashboardStats()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Análisis de Actividad</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Visualizá cómo distribuís tu tiempo
            </p>
          </div>
          <Filtros
            paneles={paneles}
            panelId={panelId}
            setPanelId={setPanelId}
            periodo={periodo}
            setPeriodo={setPeriodo}
            mesSeleccionado={mesSeleccionado}
            setMesSeleccionado={setMesSeleccionado}
          />
        </div>

        {/* Loading */}
        {isLoading && <SkeletonDashboard />}

        {/* Error */}
        {!isLoading && error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-5 flex items-center gap-3">
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
              className="flex-shrink-0"
            >
              <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M10 6v4M10 13.5v.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Content */}
        {!isLoading && !error && stats && (
          <>
            {/* Stat Cards */}
            <div className="flex flex-wrap gap-4">
              <StatCard label="Total Tareas" value={stats.totalTareas} />
              <StatCard
                label="Cerradas"
                value={stats.cerradas}
                accent="text-emerald-600"
                subLabel={
                  stats.totalTareas > 0
                    ? `${Math.round((stats.cerradas / stats.totalTareas) * 100)}% del total`
                    : undefined
                }
              />
              <StatCard label="En Progreso" value={stats.enProgreso} accent="text-teal-600" />
              <StatCard
                label="Bloqueadas"
                value={stats.bloqueadas}
                accent={stats.bloqueadas > 0 ? 'text-red-500' : 'text-gray-900'}
              />
            </div>

            {/* Tiempo total */}
            {stats.tiempoTotalSegundos > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-3 flex items-center gap-3">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  aria-hidden="true"
                  className="text-teal-500 flex-shrink-0"
                >
                  <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1.5" />
                  <path
                    d="M9 5v4l2.5 2.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="text-sm text-gray-600">
                  Tiempo total registrado:{' '}
                  <span className="font-semibold text-gray-800">
                    {formatTiempo(stats.tiempoTotalSegundos)}
                  </span>
                </span>
              </div>
            )}

            {/* Charts row */}
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1 min-w-0">
                <ActividadDiaria data={stats.actividadDiaria} periodo={periodo} />
              </div>
              <div className="w-full lg:w-80 flex-shrink-0">
                <DonutUrgencia porUrgencia={stats.porUrgencia} />
              </div>
            </div>

            {/* Por Panel (solo cuando "Todos") */}
            {panelId === null && (
              <PorPanel porPanel={stats.porPanel} />
            )}

            {/* Top categorías */}
            {stats.porCategoria.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4">
                <span className="text-sm font-semibold text-gray-700">
                  Top Categorías
                </span>
                <div className="flex flex-col gap-2">
                  {stats.porCategoria.map((cat) => (
                    <div key={cat.id} className="flex items-center gap-3">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cat.color_hex }}
                      />
                      <span className="text-sm text-gray-700 flex-1">{cat.nombre}</span>
                      <span className="text-sm font-semibold text-gray-800">{cat.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
