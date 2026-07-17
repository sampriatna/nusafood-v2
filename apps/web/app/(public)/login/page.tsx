import { Suspense } from "react"
import { LoginForm } from "./login-form"

export default function LoginPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,oklch(0.93_0.04_45),transparent_45%),radial-gradient(circle_at_bottom_right,oklch(0.93_0.03_145),transparent_40%),oklch(0.985_0.002_240)] px-6 py-16">
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center space-y-8">
        <div className="space-y-2">
          <p className="text-sm font-medium tracking-wide text-primary">
            TaskNF3
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Nusa Food
          </h1>
          <p className="text-sm text-muted-foreground">
            Login leader/admin untuk mengelola tugas operasional.
          </p>
        </div>
        <Suspense fallback={<p className="text-sm text-muted-foreground">Memuat...</p>}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  )
}
