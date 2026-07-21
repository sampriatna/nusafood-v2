import { randomBytes } from "node:crypto";

function yyyymmdd(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

/** Format v1: TASK-YYYYMMDD-XXX */
export function generateTaskId(seq = Math.floor(Math.random() * 999) + 1) {
  return `TASK-${yyyymmdd()}-${String(seq).padStart(3, "0")}`;
}

/** Format: USR-YYYYMMDD-XXX */
export function generateUserId(seq = Math.floor(Math.random() * 999) + 1) {
  return `USR-${yyyymmdd()}-${String(seq).padStart(3, "0")}`;
}

/** Format v1: STF-YYYYMMDD-XXX */
export function generateStaffId(seq = Math.floor(Math.random() * 999) + 1) {
  return `STF-${yyyymmdd()}-${String(seq).padStart(3, "0")}`;
}

/** 32-char alphanumeric token (v1 compatible) */
export function generateToken(length = 32) {
  return randomBytes(Math.ceil(length / 2))
    .toString("hex")
    .slice(0, length);
}

export function getAppOrigin(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
}

export function buildReportLink(taskId: string, token: string) {
  const origin = getAppOrigin();
  const path = `/report/${taskId}?token=${token}`;
  return origin ? `${origin}${path}` : path;
}

export function buildChecklistLink(taskId: string, token: string) {
  const origin = getAppOrigin();
  const path = `/checklist/${taskId}?token=${token}`;
  return origin ? `${origin}${path}` : path;
}

export function generateChecklistTemplateId(
  seq = Math.floor(Math.random() * 999) + 1,
) {
  return `CHKM-${yyyymmdd()}-${String(seq).padStart(3, "0")}`;
}

export function generateChecklistItemId(
  seq = Math.floor(Math.random() * 999) + 1,
) {
  return `CHKI-${yyyymmdd()}-${String(seq).padStart(3, "0")}`;
}

export function generateChecklistReportId(
  seq = Math.floor(Math.random() * 999) + 1,
) {
  return `CHK-TSK-${yyyymmdd()}-${String(seq).padStart(3, "0")}`;
}

export function generateReportItemId(
  seq = Math.floor(Math.random() * 9999) + 1,
) {
  const rand = randomBytes(3).toString("hex");
  return `CHKRI-${yyyymmdd()}-${String(seq).padStart(4, "0")}-${rand}`;
}


export function generateRecurringTemplateId(
  seq = Math.floor(Math.random() * 999) + 1,
) {
  return `REC-${yyyymmdd()}-${String(seq).padStart(3, "0")}`;
}

