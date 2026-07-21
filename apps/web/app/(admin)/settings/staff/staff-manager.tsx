"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { Staff } from "@nusafood/types";
import { Loader2, Pencil, Plus, UserMinus, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { useToast } from "@/hooks/use-toast";
import {
  POSITION_GROUP_LABELS,
  REPORT_POSITION_GROUPS,
  getPositionGroupLabel,
  resolveStaffPositionGroup,
} from "@/lib/position-groups";

type Option = { value: string; label: string; outlet?: string | null };

type Props = {
  staff: Staff[];
  outlets: Option[];
  areas: Option[];
  canManage: boolean;
};

type FormState = {
  name: string;
  position: string;
  outlet: string;
  area: string;
  wa_number: string;
  role: string;
};

const emptyForm = (outlet: string, area: string): FormState => ({
  name: "",
  position: REPORT_POSITION_GROUPS[0],
  outlet,
  area,
  wa_number: "",
  role: "STAFF",
});

export function StaffManager({ staff, outlets, areas, canManage }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [form, setForm] = useState<FormState>(
    emptyForm(outlets[0]?.value ?? "KBU", ""),
  );

  const filteredAreas = useMemo(
    () =>
      areas.filter(
        (a) =>
          !a.outlet ||
          a.outlet.toUpperCase() === form.outlet.toUpperCase(),
      ),
    [areas, form.outlet],
  );

  function openCreate() {
    const outlet = outlets[0]?.value ?? "KBU";
    const nextAreas = areas.filter(
      (a) => !a.outlet || a.outlet.toUpperCase() === outlet.toUpperCase(),
    );
    setEditing(null);
    setForm(emptyForm(outlet, nextAreas[0]?.value ?? ""));
    setDialogOpen(true);
  }

  function openEdit(member: Staff) {
    const outletValue =
      outlets.find(
        (o) =>
          o.value.toUpperCase() === String(member.outlet).toUpperCase() ||
          o.label.toUpperCase() === String(member.outlet).toUpperCase(),
      )?.value ?? String(member.outlet);
    setEditing(member);
    setForm({
      name: member.name,
      position:
        resolveStaffPositionGroup(member.position ?? "") ||
        REPORT_POSITION_GROUPS[0],
      outlet: outletValue,
      area: String(member.area ?? ""),
      wa_number: member.wa_number,
      role: member.role,
    });
    setDialogOpen(true);
  }

  function saveStaff() {
    startTransition(async () => {
      const payload = {
        name: form.name,
        position: form.position,
        outlet: form.outlet,
        area: form.area,
        wa_number: form.wa_number,
        role: form.role,
      };

      const res = await fetch(
        editing ? `/api/staff/${editing.staff_id}` : "/api/staff",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            editing ? { ...payload, staff_id: editing.staff_id } : payload,
          ),
        },
      );
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || json.success === false) {
        toast({
          title: "Gagal menyimpan",
          description: json.error || "Coba lagi",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: editing ? "Staff diperbarui" : "Staff ditambahkan",
        description: form.name,
      });
      setDialogOpen(false);
      router.refresh();
    });
  }

  function toggleStatus(member: Staff) {
    const action =
      member.status === "ACTIVE" ? "deactivate" : "activate";
    startTransition(async () => {
      const res = await fetch(`/api/staff/${member.staff_id}/${action}`, {
        method: "PATCH",
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || json.success === false) {
        toast({
          title: "Gagal update status",
          description: json.error || "Coba lagi",
          variant: "destructive",
        });
        return;
      }
      toast({
        title:
          member.status === "ACTIVE"
            ? "Staff dinonaktifkan"
            : "Staff diaktifkan",
        description: member.name,
      });
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {canManage ? (
        <Button onClick={openCreate} disabled={pending}>
          <Plus className="mr-2 size-4" />
          Tambah Staff
        </Button>
      ) : null}

      {staff.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Belum ada data staff.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {staff.map((member) => (
            <Card key={member.staff_id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{member.name}</p>
                      <Badge variant="outline">{member.role}</Badge>
                      <Badge
                        variant={
                          member.status === "ACTIVE" ? "default" : "secondary"
                        }
                      >
                        {member.status === "ACTIVE" ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {member.outlet}
                      {member.area ? ` · ${member.area}` : ""}
                      {member.position
                        ? ` · ${getPositionGroupLabel(member.position)}`
                        : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {member.staff_id} · {member.wa_number}
                    </p>
                  </div>
                  {canManage ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        onClick={() => openEdit(member)}
                      >
                        <Pencil className="mr-1 size-4" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        onClick={() => toggleStatus(member)}
                      >
                        {member.status === "ACTIVE" ? (
                          <>
                            <UserMinus className="mr-1 size-4" />
                            Nonaktifkan
                          </>
                        ) : (
                          <>
                            <UserPlus className="mr-1 size-4" />
                            Aktifkan
                          </>
                        )}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Staff" : "Tambah Staff"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Nama</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Posisi / Jabatan</Label>
              <Select
                value={form.position}
                onValueChange={(position) => setForm({ ...form, position })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih posisi" />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_POSITION_GROUPS.map((group) => (
                    <SelectItem key={group} value={group}>
                      {POSITION_GROUP_LABELS[group]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Harus sama persis dengan posisi di template kegiatan harian
                (contoh: PA, Kasir, Gudang, Produksi FnB).
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Outlet</Label>
                <Select
                  value={form.outlet}
                  onValueChange={(outlet) =>
                    setForm({ ...form, outlet, area: "" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {outlets.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Area</Label>
                <Select
                  value={form.area}
                  onValueChange={(area) => setForm({ ...form, area })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih area" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredAreas.map((a) => (
                      <SelectItem key={a.value} value={a.value}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nomor WA</Label>
              <Input
                value={form.wa_number}
                onChange={(e) =>
                  setForm({ ...form, wa_number: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(role) => setForm({ ...form, role })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STAFF">STAFF</SelectItem>
                  <SelectItem value="LEADER">LEADER</SelectItem>
                  <SelectItem value="ADMIN">ADMIN</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={saveStaff} disabled={pending}>
              {pending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              Simpan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
