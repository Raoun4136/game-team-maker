import { compare, hash } from "bcryptjs";

export async function hashGroupPassword(password: string) {
  return hash(password, 10);
}

export async function verifyGroupPassword(password: string, passwordHash: string) {
  return compare(password, passwordHash);
}

export function buildUnlockExpiresAt(
  minutes: number,
  now = new Date(),
) {
  return new Date(now.getTime() + minutes * 60_000);
}

export function isUnlockExpired(
  expiresAt: Date,
  now = new Date(),
) {
  return now >= expiresAt;
}
