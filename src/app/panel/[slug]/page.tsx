import { notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Panel } from '@/types'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { Folder, Briefcase, BookOpen, User } from 'lucide-react'

interface PanelPageProps {
  params: Promise<{ slug: string }>
}

/**
 * Panel page (/panel/[slug]).
 * Fetches the panel by slug + usuario_id (RLS enforced at DB level).
 * Returns 404 if the panel does not belong to the authenticated user.
 * Note: auth is guaranteed by middleware — no redirect needed here.
 */
export default async function PanelPage({ params }: PanelPageProps) {
  const { slug } = await params

  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // user is guaranteed non-null by middleware, but we need user.id for the query
  if (user === null) {
    notFound()
  }

  const { data: panel, error } = await supabase
    .from('paneles')
    .select('id, usuario_id, nombre, slug, color_hex, orden, created_at')
    .eq('slug', slug)
    .eq('usuario_id', user.id)
    .single<Panel>()

  // PGRST116 = PostgREST "0 rows returned" — panel not found or not owned by user
  if (error !== null && error.code !== 'PGRST116') {
    throw new Error(`Error al cargar el panel "${slug}": ${error.message}`)
  }

  if (panel === null) {
    notFound()
  }

  let PanelIcon = Folder
  const nameLower = panel.nombre.toLowerCase()
  if (nameLower.includes('trabajo') || nameLower.includes('work')) PanelIcon = Briefcase
  else if (nameLower.includes('estudio') || nameLower.includes('study')) PanelIcon = BookOpen
  else if (nameLower.includes('personal')) PanelIcon = User

  return (
    <div className="flex flex-col gap-6">
      {/* Panel header */}
      <div className="flex items-center gap-3 border-b border-gray-200 pb-5">
        <PanelIcon className="h-6 w-6 text-teal-800" strokeWidth={2.5} />
        <h1 className="text-2xl font-extrabold tracking-tight text-teal-900">{panel.nombre}</h1>
      </div>

      {/* Kanban board */}
      <KanbanBoard panelId={panel.id} />
    </div>
  )
}
