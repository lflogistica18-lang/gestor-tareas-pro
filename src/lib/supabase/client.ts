import { createBrowserClient } from '@supabase/ssr'

/**
 * Supabase client for use in Client Components (browser context).
 * Call this function inside a Client Component — never at module level
 * to avoid instantiating during SSR.
 */
export function createSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY son requeridas.',
    )
  }

  return createBrowserClient(supabaseUrl, supabaseKey)
}
