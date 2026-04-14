import type { Metadata } from 'next'
import { Outfit } from 'next/font/google'
import './globals.css'
import PWARegister from '@/components/PWARegister'

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Gestor de Tareas Pro',
  description: 'Organiza tus tareas laborales, de estudio y personales.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Tareas Pro',
  },
  formatDetection: {
    telephone: false,
  },
  themeColor: '#115e59',
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={outfit.variable}>
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className="min-h-screen bg-gray-50 text-gray-900 font-sans antialiased">
        <PWARegister />
        {children}
      </body>
    </html>
  )
}
