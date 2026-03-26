'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Panel } from '@/types'
import SignOutButton from '@/app/panel/[slug]/SignOutButton'
import { Hexagon, LayoutDashboard, Briefcase, BookOpen, User, Folder } from 'lucide-react'

export function SidebarNav({ paneles }: { paneles: Panel[] }) {
  const pathname = usePathname()
  // /panel/laboral → 'laboral', /panel/dashboard → 'dashboard'
  const activeSlug = pathname.split('/')[2] ?? ''

  return (
    <aside className="flex w-64 shrink-0 flex-col justify-between bg-teal-800 px-4 py-6 shadow-xl border-r border-teal-700/50">
      {/* Logo */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3 px-2 pb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-teal-500 text-teal-950 shadow-md">
            <Hexagon className="h-4 w-4" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-white leading-none">Gestor Pro</span>
            <span className="text-[10px] text-teal-200/80 font-medium tracking-wide">Tareas Inteligentes</span>
          </div>
        </div>

        {/* Paneles nav */}
        <div className="flex flex-col gap-0.5">
          <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-teal-200/70">
            Paneles
          </p>
          {paneles.map((panel) => {
            const isActive = panel.slug === activeSlug
            let PanelIcon = Folder
            const nameLower = panel.nombre.toLowerCase()
            if (nameLower.includes('trabajo') || nameLower.includes('work') || nameLower.includes('laboral')) PanelIcon = Briefcase
            else if (nameLower.includes('estudio') || nameLower.includes('study')) PanelIcon = BookOpen
            else if (nameLower.includes('personal')) PanelIcon = User

            return (
              <Link
                key={panel.id}
                href={`/panel/${panel.slug}`}
                className={[
                  'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200',
                  isActive
                    ? 'bg-teal-700/60 text-white shadow-sm ring-1 ring-inset ring-teal-600/50'
                    : 'text-teal-100 hover:bg-teal-700/40 hover:text-white',
                ].join(' ')}
              >
                <PanelIcon className="h-4 w-4" strokeWidth={2.5} style={{ color: panel.color_hex }} />
                {panel.nombre}
                {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-teal-400" />}
              </Link>
            )
          })}
        </div>

        {/* Dashboard link */}
        <div className="mt-4 flex flex-col gap-1 border-t border-teal-700/50 pt-4">
          <Link
            href="/panel/dashboard"
            className={[
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200',
              activeSlug === 'dashboard'
                ? 'bg-teal-700/60 text-white shadow-sm ring-1 ring-inset ring-teal-600/50'
                : 'text-teal-100 hover:bg-teal-700/40 hover:text-white',
            ].join(' ')}
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" strokeWidth={2.5} />
            Dashboard
          </Link>
        </div>
      </div>

      <SignOutButton />
    </aside>
  )
}
