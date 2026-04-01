export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <span className="text-xl font-bold text-[#ea580c]">Corovan</span>
        <span className="text-sm text-muted-foreground">Partner Portal</span>
      </header>
      <main className="flex-1 p-4">{children}</main>
      <footer className="border-t py-3 text-center text-xs text-muted-foreground">
        Corovan National Platform
      </footer>
    </div>
  )
}
