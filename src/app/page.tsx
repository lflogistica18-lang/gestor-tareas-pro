import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * Landing page (/).
 * - Authenticated users are redirected to their first panel (/panel/laboral).
 * - Unauthenticated users see a CTA button leading to /login.
 */
export default async function LandingPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user !== null) {
    redirect('/panel/laboral')
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <h1 className="text-4xl font-bold tracking-tight text-white">
        Gestor de Tareas Pro
      </h1>
      <p className="max-w-md text-center text-gray-400">
        Organiza tus tareas laborales, académicas y personales en un solo lugar.
      </p>
      <Link
        href="/login"
        className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      >
        Ingresar
      </Link>
    </main>
  )
}
