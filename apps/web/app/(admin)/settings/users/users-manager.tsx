"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export type UserRow = {
  id: string
  userId: string
  username: string
  displayName: string
  role: string
  staffId: string | null
  loginEnabled: boolean
  lastLogin: string | null
}

type Props = {
  users: UserRow[]
  canManage: boolean
}

export function UsersManager({ users, canManage }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    const form = event.currentTarget
    const formData = new FormData(form)

    startTransition(async () => {
      try {
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: String(formData.get("username") || ""),
            password: String(formData.get("password") || ""),
            role: String(formData.get("role") || "LEADER"),
            staff_id: String(formData.get("staff_id") || "") || null,
          }),
        })
        const json = (await res.json()) as {
          success?: boolean
          error?: string
        }
        if (!res.ok || json.success === false) {
          setError(json.error || "Gagal membuat user")
          return
        }
        form.reset()
        setMessage("User dibuat")
        router.refresh()
      } catch {
        setError("Tidak bisa menghubungi server")
      }
    })
  }

  function toggleLogin(user: UserRow) {
    startTransition(async () => {
      setError(null)
      const res = await fetch(`/api/users/${user.userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login_enabled: !user.loginEnabled }),
      })
      const json = (await res.json()) as { success?: boolean; error?: string }
      if (!res.ok || json.success === false) {
        setError(json.error || "Gagal update user")
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="space-y-8">
      <ul className="divide-y divide-border text-sm">
        {users.map((user) => (
          <li
            key={user.id}
            className="flex flex-wrap items-center justify-between gap-3 py-3"
          >
            <div>
              <p className="font-medium">
                {user.displayName}{" "}
                <span className="font-normal text-muted-foreground">
                  @{user.username}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                {user.userId} · {user.role}
                {user.staffId ? ` · ${user.staffId}` : ""}
                {user.loginEnabled ? "" : " · disabled"}
              </p>
            </div>
            {canManage ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => toggleLogin(user)}
              >
                {user.loginEnabled ? "Nonaktifkan" : "Aktifkan"}
              </Button>
            ) : null}
          </li>
        ))}
        {users.length === 0 ? (
          <li className="py-3 text-sm text-muted-foreground">Belum ada user.</li>
        ) : null}
      </ul>

      {canManage ? (
        <form onSubmit={handleCreate} className="space-y-4 border-t border-border pt-6">
          <h2 className="text-lg font-medium">Tambah user</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" name="username" required disabled={pending} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                disabled={pending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                name="role"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                defaultValue="LEADER"
                disabled={pending}
              >
                <option value="ADMIN">ADMIN</option>
                <option value="LEADER">LEADER</option>
                <option value="STAFF">STAFF</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff_id">Staff ID (opsional)</Label>
              <Input id="staff_id" name="staff_id" placeholder="STF-..." disabled={pending} />
            </div>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {message ? <p className="text-sm text-accent">{message}</p> : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Menyimpan..." : "Buat user"}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">
          Hanya ADMIN yang bisa menambah/menonaktifkan user.
        </p>
      )}
    </div>
  )
}
