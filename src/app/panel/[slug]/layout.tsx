interface PanelLayoutProps {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}

export default async function PanelLayout({ children }: PanelLayoutProps) {
  return <>{children}</>
}
