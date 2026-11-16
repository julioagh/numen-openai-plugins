import type { ReactNode } from 'react'

export const metadata = {
  title: 'Reuniones Claras MCP',
  description: 'Servidor MCP de Numen para el plugin Reuniones Claras.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
