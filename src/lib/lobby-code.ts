import { randomBytes } from "crypto";

const ALPH = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function randomLobbyCode(length = 6): string {
  const bytes = randomBytes(length);
  let s = "";
  for (let i = 0; i < length; i++) {
    s += ALPH[bytes[i]! % ALPH.length];
  }
  return s;
}

export function randomHostSecret(): string {
  return randomBytes(24).toString("hex");
}

export function randomLobbyId(): string {
  return randomBytes(16).toString("hex");
}

export function normalizeLobbyCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}
