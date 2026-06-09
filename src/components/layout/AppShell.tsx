import type { ReactNode } from 'react'
import { Header } from './Header'

interface Props {
  children: ReactNode
  sidebar?: ReactNode
  wide?: boolean
}

export function AppShell({ children, sidebar, wide }: Props) {
  const maxWidth = sidebar || wide ? 'max-w-6xl' : 'max-w-3xl'
  return (
    <div className="min-h-screen flex flex-col relative" style={{ backgroundColor: '#f6f9fc' }}>

      {/* Watermark — behind all content via negative z-index on a positioned child */}
      <div
        aria-hidden
        className="fixed pointer-events-none select-none"
        style={{ opacity: 0.07, zIndex: 0, left: '-225px', top: '4%' }}
      >
        <img
          src={`${import.meta.env.BASE_URL}wc2026-logo.png`}
          alt=""
          style={{ height: 1200, width: 'auto' }}
        />
      </div>

      {/* All page content sits above the watermark */}
      <div className="relative flex flex-col flex-1" style={{ zIndex: 1 }}>
        <Header />
        <main className={`flex-1 ${maxWidth} mx-auto w-full px-3 py-5 sm:px-5 sm:py-8`}>
          {sidebar ? (
            <div className="flex gap-8">
              <div className="flex-1 min-w-0 flex flex-col gap-6">{children}</div>
              {sidebar}
            </div>
          ) : (
            <div className="flex flex-col gap-6">{children}</div>
          )}
        </main>
      </div>

    </div>
  )
}
