import type { ReactNode } from 'react'

/**
 * Mobile-first app frame. Fills the viewport on phones; on wider screens
 * it centers content inside a phone-proportioned card so the app previews
 * well on tablet/desktop without a separate responsive layout.
 */
export default function MobileShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center sm:py-6 bg-bg">
      <div className="relative w-full h-screen sm:h-[860px] sm:max-h-[92vh] sm:max-w-[430px] sm:rounded-[40px] sm:shadow-2xl sm:border sm:border-border overflow-hidden bg-bg flex flex-col">
        {children}
      </div>
    </div>
  )
}
