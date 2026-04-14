'use client'

import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { useRef } from 'react'

// Utilidad nativa para no requerir date-fns
export function getLocalDateString(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

interface DayNavigatorProps {
  selectedDate: string // YYYY-MM-DD
  onDateChange: (date: string) => void
}

export function DayNavigator({ selectedDate, onDateChange }: DayNavigatorProps) {
  const dateInputRef = useRef<HTMLInputElement>(null)

  // Parse selectedDate de forma segura asumiendo la timezone local
  const [year, month, day] = selectedDate.split('-').map(Number) as [number, number, number]
  const current = new Date(year, month - 1, day)

  const goBack = () => {
    const d = new Date(current)
    d.setDate(d.getDate() - 1)
    onDateChange(getLocalDateString(d))
  }

  const goForward = () => {
    const d = new Date(current)
    d.setDate(d.getDate() + 1)
    onDateChange(getLocalDateString(d))
  }

  const goToday = () => {
    onDateChange(getLocalDateString(new Date()))
  }

  const handleOpenPicker = () => {
    if (!dateInputRef.current) return
    try {
      dateInputRef.current.showPicker()
    } catch {
      dateInputRef.current.click()
    }
  }

  const todayStr = getLocalDateString(new Date())

  let labelBase = current.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  labelBase = labelBase.charAt(0).toUpperCase() + labelBase.slice(1)

  const label = selectedDate === todayStr ? 'Hoy' : labelBase

  const isToday = selectedDate === todayStr

  return (
    <div className="relative mx-auto mb-6 flex w-full max-w-md items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm">
      {/* Input de fecha oculto — abre el picker nativo del navegador */}
      <input
        ref={dateInputRef}
        type="date"
        value={selectedDate}
        onChange={(e) => {
          if (e.target.value) onDateChange(e.target.value)
        }}
        className="pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0"
        tabIndex={-1}
        aria-hidden="true"
      />

      <button
        onClick={goBack}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
        title="Día anterior"
      >
        <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
      </button>

      <div className="flex items-center gap-1">
        <button
          onClick={handleOpenPicker}
          className="group flex flex-col items-center justify-center rounded-lg px-3 py-1 transition-colors hover:bg-teal-50"
          title="Seleccionar fecha"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 transition-colors group-hover:text-teal-700">
            <Calendar className="h-4.5 w-4.5 text-teal-600" strokeWidth={2.5} />
            <span>{label}</span>
          </div>
        </button>

        {!isToday && (
          <button
            onClick={goToday}
            className="ml-1 rounded-md px-2 py-0.5 text-xs font-medium text-teal-600 transition-colors hover:bg-teal-50 hover:text-teal-800"
            title="Ir a hoy"
          >
            Hoy
          </button>
        )}
      </div>

      <button
        onClick={goForward}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
        title="Día siguiente"
      >
        <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
      </button>
    </div>
  )
}
