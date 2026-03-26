'use client'

import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

/**
 * Client Component that handles sign-out.
 * Kept separate so the parent PanelLayout can remain a Server Component.
 */
export default function SignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error al cerrar sesión:', error.message)
    }
    // Redirect to /login regardless of signOut result — session will be
    // invalidated by the server on the next request via middleware.
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleSignOut}
      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-500 transition-colors duration-150 hover:bg-slate-800/60 hover:text-slate-300"
    >
      <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
        />
      </svg>
      Cerrar sesión
    </button>
  )
}
