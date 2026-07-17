"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Staff } from "@nusafood/types";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type UserRow = {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  role: string;
  staffId: string | null;
  loginEnabled: boolean;
  lastLogin: string | null;
};

type Props = {
  users: UserRow[];
  staff: Staff[];
  canManage: boolean;
};

export function UsersManager({ users, staff, canManage }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editRole, setEditRole] = useState("LEADER");
  const [editStaffId, setEditStaffId] = useState("");
  const [editPassword, setEditPassword] = useState("");

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const form = event.currentTarget;
    const formData = new FormData(form);

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
        });
        const json = (await res.json()) as {
          success?: boolean;
          error?: string;
        };
        if (!res.ok || json.success === false) {
          setError(json.error || "Gagal membuat user");
          return;
        }
        form.reset();
        setMessage("User dibuat");
        router.refresh();
      } catch {
        setError("Tidak bisa menghubungi server");
      }
    });
  }

  function toggleLogin(user: UserRow) {
    startTransition(async () => {
      setError(null);
      const res = await fetch(`/api/users/${user.userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login_enabled: !user.loginEnabled }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || json.success === false) {
        setError(json.error || "Gagal update user");
        return;
      }
      router.refresh();
    });
  }

  function openEdit(user: UserRow) {
    setEditUser(user);
    setEditRole(user.role);
    setEditStaffId(user.staffId ?? "");
    setEditPassword("");
  }

  function saveEdit() {
    if (!editUser) return;
    startTransition(async () => {
      setError(null);
      const res = await fetch(`/api/users/${editUser.userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: editRole,
          staff_id: editStaffId || null,
          password: editPassword || undefined,
        }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || json.success === false) {
        setError(json.error || "Gagal update user");
        return;
      }
      setEditUser(null);
      setMessage("User diperbarui");
      router.refresh();
    });
  }

  function deleteUser(user: UserRow) {
    startTransition(async () => {
      setError(null);
      const res = await fetch(`/api/users/${user.userId}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || json.success === false) {
        setError(json.error || "Gagal menghapus user");
        return;
      }
      setMessage("User dihapus");
      router.refresh();
    });
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
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => openEdit(user)}
                >
                  <Pencil className="mr-1 size-4" />
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => toggleLogin(user)}
                >
                  {user.loginEnabled ? "Nonaktifkan" : "Aktifkan"}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={pending}
                    >
                      <Trash2 className="mr-1 size-4" />
                      Hapus
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Hapus user?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Akun @{user.username} akan dihapus permanen.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Batal</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteUser(user)}>
                        Hapus
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ) : null}
          </li>
        ))}
        {users.length === 0 ? (
          <li className="py-3 text-sm text-muted-foreground">Belum ada user.</li>
        ) : null}
      </ul>

      {canManage ? (
        <form
          onSubmit={handleCreate}
          className="space-y-4 border-t border-border pt-6"
        >
          <h2 className="text-lg font-medium">Tambah user</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                required
                disabled={pending}
              />
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
              <Label htmlFor="staff_id">Staff</Label>
              <select
                id="staff_id"
                name="staff_id"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                defaultValue=""
                disabled={pending}
              >
                <option value="">— Tanpa staff —</option>
                {staff
                  .filter((s) => s.status === "ACTIVE")
                  .map((s) => (
                    <option key={s.staff_id} value={s.staff_id}>
                      {s.name} ({s.outlet})
                    </option>
                  ))}
              </select>
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
          Hanya ADMIN yang bisa mengelola user.
        </p>
      )}

      <Dialog open={Boolean(editUser)} onOpenChange={() => setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {editUser ? (
            <div className="grid gap-4">
              <p className="text-sm text-muted-foreground">
                @{editUser.username}
              </p>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={editRole} onValueChange={setEditRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">ADMIN</SelectItem>
                    <SelectItem value="LEADER">LEADER</SelectItem>
                    <SelectItem value="STAFF">STAFF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Staff</Label>
                <Select
                  value={editStaffId || "__none__"}
                  onValueChange={(v) =>
                    setEditStaffId(v === "__none__" ? "" : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Tanpa staff —</SelectItem>
                    {staff
                      .filter((s) => s.status === "ACTIVE")
                      .map((s) => (
                        <SelectItem key={s.staff_id} value={s.staff_id}>
                          {s.name} ({s.outlet})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Password baru (opsional)</Label>
                <Input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  minLength={6}
                />
              </div>
              <Button onClick={saveEdit} disabled={pending}>
                {pending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                Simpan
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
