import { createSupabaseServerClient } from '@/lib/supabase/server'
import { SidebarNav } from '@/components/layout/SidebarNav'
import type { Panel } from '@/types'

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: panels } = await supabase
    .from('paneles')
    .select('id, usuario_id, nombre, slug, color_hex, orden, created_at')
    .eq('usuario_id', user.id)
    .order('orden', { ascending: true })

  const userPanels: Panel[] = (panels ?? []) as Panel[]

  return (
    <div className="flex min-h-screen bg-teal-50 selection:bg-teal-200 selection:text-teal-900">
      <SidebarNav paneles={userPanels} />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  )
}
