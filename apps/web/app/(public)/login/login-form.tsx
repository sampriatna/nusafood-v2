"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type LoginOk = {
  success: true
  data: {
    role?: string
    app_role?: string
    is_owner?: boolean
    staff_id?: string | null
  }
  error: null
}

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedNext = searchParams.get("next")
  const forbidden = searchParams.get("error") === "forbidden"
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(
    forbidden ? "Akses ditolak untuk halaman tersebut." : null,
  )

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const formData = new FormData(event.currentTarget)
    const username = String(formData.get("username") || "").trim()
    const password = String(formData.get("password") || "")

    startTransition(async () => {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        })
        const json = (await res.json()) as
          | LoginOk
          | { success?: boolean; error?: string }
        if (!res.ok || json.success === false) {
          setError(
            "error" in json && json.error ? json.error : "Login gagal",
          )
          return
        }

        const data = "data" in json && json.data ? json.data : null
        const role = data?.role
        const isStaffLogin = role === "STAFF"
        const defaultHome = isStaffLogin ? "/letters" : "/dashboard"
        // Jika next mengarah ke admin tapi user STAFF → /letters
        let next =
          requestedNext && requestedNext.startsWith("/")
            ? requestedNext
            : defaultHome
        if (
          isStaffLogin &&
          (next.startsWith("/dashboard") ||
            next.startsWith("/settings") ||
            next.startsWith("/teguran") ||
            next.startsWith("/tasks"))
        ) {
          next = "/letters"
        }
        if (!isStaffLogin && next.startsWith("/letters") && !data?.staff_id) {
          next = "/dashboard"
        }

        router.push(next)
        router.refresh()
      } catch {
        setError("Tidak bisa menghubungi server")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          name="username"
          autoComplete="username"
          placeholder="leader.kbu"
          disabled={pending}
        />
        <p className="text-xs text-muted-foreground">
          Kosongkan username untuk login owner via ADMIN_PASSWORD.
          Staff login diarahkan ke portal surat.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={pending}
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Masuk..." : "Masuk"}
      </Button>
    </form>
  )
}
