import { compare, hash } from "bcryptjs";

const ROUNDS = 12;
const DUMMY_HASH =
  "$2b$12$WNN98Yxd5AsOHZfuW4Qr1OfsZacQUY5jXRepcCA60O7MuodZgoFUm";

export function validPassword(value: unknown): value is string {
  if (typeof value !== "string" || value.length < 8) return false;
  const bytes = Buffer.byteLength(value);
  return bytes >= 8 && bytes <= 72;
}

export function hashPassword(password: string) {
  return hash(password, ROUNDS);
}

export function checkPassword(password: string, passwordHash: string | undefined) {
  return compare(password, passwordHash || DUMMY_HASH);
}

export async function passwordAccepted(
  user: { passwordHash?: string } | undefined,
  password: string,
) {
  const matches = await checkPassword(password, user?.passwordHash);
  return !!user?.passwordHash && matches;
}
