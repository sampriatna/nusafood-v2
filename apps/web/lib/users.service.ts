import bcrypt from "bcryptjs"
import { prisma, type StaffRole } from "@nusafood/database"
import { generateUserId } from "@/lib/id"

export type PublicUser = {
  id: string
  userId: string
  username: string
  displayName: string
  role: StaffRole
  staffId: string | null
  isOwner: boolean
  canApproveSp: boolean
  loginEnabled: boolean
  lastLogin: string | null
  createdAt: string
  updatedAt: string
}

type UserRow = {
  id: string
  userId: string
  username: string
  role: StaffRole
  staffId: string | null
  isOwner: boolean
  canApproveSp: boolean
  loginEnabled: boolean
  lastLogin: Date | null
  createdAt: Date
  updatedAt: Date
  staff?: { name: string; outlet?: { id: string; code: string; name: string } } | null
}

function toPublic(user: UserRow): PublicUser {
  return {
    id: user.id,
    userId: user.userId,
    username: user.username,
    displayName: user.staff?.name || user.username,
    role: user.role,
    staffId: user.staffId,
    isOwner: user.isOwner,
    canApproveSp: user.canApproveSp,
    loginEnabled: user.loginEnabled,
    lastLogin: user.lastLogin?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }
}

const withStaff = {
  staff: { select: { name: true, outlet: { select: { id: true, code: true, name: true } } } },
} as const

export async function listUsers(): Promise<PublicUser[]> {
  const rows = await prisma.userAccount.findMany({
    include: withStaff,
    orderBy: [{ role: "asc" }, { username: "asc" }],
  })
  return rows.map(toPublic)
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

export async function getUserById(id: string): Promise<PublicUser | null> {
  const row = await prisma.userAccount.findFirst({
    where: isUuid(id) ? { id } : { userId: id },
    include: withStaff,
  })
  return row ? toPublic(row) : null
}

export async function findUserForLogin(username: string) {
  return prisma.userAccount.findUnique({
    where: { username },
    include: withStaff,
  })
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash)
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10)
}

export async function touchLastLogin(id: string) {
  await prisma.userAccount.update({
    where: { id },
    data: { lastLogin: new Date() },
  })
}

export async function createUser(input: {
  username: string
  password: string
  role: StaffRole
  staffId?: string | null
  loginEnabled?: boolean
  userId?: string
  isOwner?: boolean
  canApproveSp?: boolean
}) {
  const username = input.username.trim().toLowerCase()
  if (!username || !input.password) {
    throw new Error("username dan password wajib diisi")
  }
  if (input.password.length < 6) {
    throw new Error("password minimal 6 karakter")
  }

  const existing = await prisma.userAccount.findUnique({ where: { username } })
  if (existing) throw new Error("username sudah dipakai")

  if (input.staffId) {
    const staff = await prisma.staff.findUnique({
      where: { staffId: input.staffId },
    })
    if (!staff) throw new Error("staffId tidak ditemukan")
  }

  const isOwner = Boolean(input.isOwner)
  const canApproveSp = isOwner || Boolean(input.canApproveSp)

  const row = await prisma.userAccount.create({
    data: {
      userId: input.userId || generateUserId(),
      username,
      passwordHash: await hashPassword(input.password),
      role: input.role,
      staffId: input.staffId || null,
      loginEnabled: input.loginEnabled ?? true,
      isOwner,
      canApproveSp,
    },
    include: withStaff,
  })
  return toPublic(row)
}

export async function updateUser(
  id: string,
  input: {
    role?: StaffRole
    staffId?: string | null
    loginEnabled?: boolean
    password?: string
    isOwner?: boolean
    canApproveSp?: boolean
  }
) {
  const existing = await prisma.userAccount.findFirst({
    where: isUuid(id) ? { id } : { userId: id },
  })
  if (!existing) return null

  if (input.staffId) {
    const staff = await prisma.staff.findUnique({
      where: { staffId: input.staffId },
    })
    if (!staff) throw new Error("staffId tidak ditemukan")
  }

  if (input.password && input.password.length < 6) {
    throw new Error("password minimal 6 karakter")
  }

  const nextIsOwner =
    input.isOwner !== undefined ? Boolean(input.isOwner) : existing.isOwner
  let nextCanApprove =
    input.canApproveSp !== undefined
      ? Boolean(input.canApproveSp)
      : existing.canApproveSp
  // Owner selalu punya capability approve
  if (nextIsOwner) nextCanApprove = true

  const row = await prisma.userAccount.update({
    where: { id: existing.id },
    data: {
      role: input.role,
      staffId: input.staffId === undefined ? undefined : input.staffId || null,
      loginEnabled: input.loginEnabled,
      isOwner: input.isOwner !== undefined ? nextIsOwner : undefined,
      canApproveSp:
        input.canApproveSp !== undefined || input.isOwner !== undefined
          ? nextCanApprove
          : undefined,
      passwordHash: input.password
        ? await hashPassword(input.password)
        : undefined,
    },
    include: withStaff,
  })
  return toPublic(row)
}

export async function deleteUser(id: string): Promise<boolean> {
  const existing = await prisma.userAccount.findFirst({
    where: isUuid(id) ? { id } : { userId: id },
  })
  if (!existing) return false

  await prisma.userAccount.delete({ where: { id: existing.id } })
  return true
}

/** Buat admin default jika tabel user masih kosong. */
export async function ensureBootstrapAdmin() {
  const count = await prisma.userAccount.count()
  if (count > 0) return null

  const password = process.env.ADMIN_PASSWORD
  if (!password || password === "change-me") {
    throw new Error(
      "ADMIN_PASSWORD wajib di-set sebelum bootstrap admin (min. bukan 'change-me')",
    )
  }

  return createUser({
    username: "admin",
    password,
    role: "ADMIN",
    userId: "USR-BOOTSTRAP-001",
    isOwner: true,
    canApproveSp: true,
  })
}
