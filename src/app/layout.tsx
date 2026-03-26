import type { Metadata } from 'next'
import { Outfit } from 'next/font/google'
import './globals.css'

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Gestor de Tareas Pro',
  description: 'Organiza tus tareas laborales, de estudio y personales.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={outfit.variable}>
      <body className="min-h-screen bg-gray-50 text-gray-900 font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
