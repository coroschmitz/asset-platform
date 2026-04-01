import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function PartnerLoginPage() {
  async function handleLogin(formData: FormData) {
    "use server"
    const email = formData.get("email") as string
    if (!email) return redirect("/partner?error=Email+is+required")

    const partner = await prisma.partner.findFirst({
      where: { contactEmail: email },
    })

    if (!partner) return redirect("/partner?error=No+partner+found+with+that+email")

    redirect(`/partner/orders?pid=${partner.id}`)
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col items-center justify-center gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-[#ea580c]">Partner Portal</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your email to access your work orders
        </p>
      </div>
      <form action={handleLogin} className="flex w-full flex-col gap-4">
        <Input
          name="email"
          type="email"
          placeholder="partner@example.com"
          required
          className="h-12 text-base"
        />
        <Button type="submit" className="h-12 w-full text-base font-semibold">
          Access Portal
        </Button>
      </form>
    </div>
  )
}
