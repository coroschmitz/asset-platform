import type { Metadata } from "next"
import "./globals.css"
import { Providers } from "./providers"

export const metadata: Metadata = {
  title: "Corovan Asset Platform",
  description: "National Commercial Furniture Asset Management",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="h-screen flex overflow-hidden antialiased font-sans">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
