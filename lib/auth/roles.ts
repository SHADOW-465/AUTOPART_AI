export type Role = "plant_admin" | "procurement_engineer" | "quality_manager"

type Permission = "invite" | "upload" | "accept" | "validate" | "rfq"

const matrix: Record<Role, Record<Permission, boolean>> = {
  plant_admin: {
    invite: true,
    upload: true,
    accept: true,
    validate: true,
    rfq: true,
  },
  procurement_engineer: {
    invite: false,
    upload: true,
    accept: true,
    validate: true,
    rfq: true,
  },
  quality_manager: {
    invite: false,
    upload: false,
    accept: false,
    validate: true,
    rfq: false,
  },
}

export function canInvite(role: Role): boolean {
  return matrix[role].invite
}

export function canUpload(role: Role): boolean {
  return matrix[role].upload
}

export function canAccept(role: Role): boolean {
  return matrix[role].accept
}

export function canValidate(role: Role): boolean {
  return matrix[role].validate
}

export function canDraftRfq(role: Role): boolean {
  return matrix[role].rfq
}
