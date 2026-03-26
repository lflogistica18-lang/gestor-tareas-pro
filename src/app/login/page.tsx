'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

interface LoginFormState {
  email: string
  password: string
  error: string | null
  loading: boolean
}

/**
 * Login page (/login).
 * Uses Supabase signInWithPassword. On success redirects to /panel/laboral.
 */
export default function LoginPage() {
  const router = useRouter()
  const [state, setState] = useState<LoginFormState>({
    email: '',
    password: '',
    error: null,
    loading: false,
  })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setState((prev) => ({ ...prev, loading: true, error: null }))

    const supabase = createSupabaseBrowserClient()

    const { error } = await supabase.auth.signInWithPassword({
      email: state.email.trim(),
      password: state.password,
    })

    if (error !== null) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error.message,
      }))
      return
    }

    router.push('/panel/laboral')
    router.refresh()
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F4F9F9] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-800 shadow-lg shadow-teal-900/30">
            <svg
              className="h-7 w-7 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-tight text-gray-900">Gestor Pro</h1>
            <p className="text-sm text-gray-500">Iniciá sesión para continuar</p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-7 shadow-lg">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-xs font-medium text-gray-600">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={state.email}
                onChange={(e) =>
                  setState((prev) => ({ ...prev, email: e.target.value }))
                }
                className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors duration-150 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                placeholder="tu@email.com"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-xs font-medium text-gray-600">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={state.password}
                onChange={(e) =>
                  setState((prev) => ({ ...prev, password: e.target.value }))
                }
                className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors duration-150 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                placeholder="••••••••"
              />
            </div>

            {state.error !== null && (
              <p
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600"
              >
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={state.loading}
              className="mt-1 rounded-lg bg-teal-800 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {state.loading ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
