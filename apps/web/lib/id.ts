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

/** 32-char alphanumeric token (v1 compatible) */
export function generateToken(length = 32) {
  return randomBytes(Math.ceil(length / 2))
    .toString("hex")
    .slice(0, length);
}

export function buildReportLink(taskId: string, token: string) {
  const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const path = `/report/${taskId}?token=${token}`;
  return origin ? `${origin}${path}` : path;
}
