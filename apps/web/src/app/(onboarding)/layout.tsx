import Link from 'next/link'

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <nav className="flex items-center justify-between px-6 py-4 max-w-2xl mx-auto w-full">
        <span className="text-xl font-bold tracking-tight">
          <span className="text-primary">0</span>ne
        </span>
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip for now
        </Link>
      </nav>
      <main className="max-w-2xl mx-auto px-6 pb-16">
        {children}
      </main>
    </div>
  )
}
