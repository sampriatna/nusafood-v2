import type { Staff as DbStaff } from "@nusafood/database";
import type { Staff, StaffRole, StaffStatus } from "@nusafood/types";

type StaffWithRelations = DbStaff & {
  outlet?: { code: string; name: string } | null;
  area?: { name: string } | null;
};

export function mapStaffToApi(staff: StaffWithRelations): Staff {
  return {
    staff_id: staff.staffId,
    name: staff.name,
    position: staff.position ?? "",
    outlet: (staff.outlet?.code ?? staff.outlet?.name ?? "") as Staff["outlet"],
    area: (staff.area?.name ?? "") as Staff["area"],
    wa_number: staff.waNumber,
    role: staff.role as StaffRole,
    status: staff.status as StaffStatus,
    login_enabled: staff.loginEnabled,
    created_at: staff.createdAt.toISOString(),
    updated_at: staff.updatedAt.toISOString(),
  };
}
