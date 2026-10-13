import crypto from "crypto";
import bcrypt from "bcryptjs";
import { config } from "../config/env.js";

const ALGORITHM = "aes-256-gcm";
const MASTER_KEY = Buffer.from(config.dbEncryptionKey, "hex");
const BCRYPT_ROUNDS = 12;

if (MASTER_KEY.length !== 32) {
  throw new Error("DB_ENCRYPTION_KEY harus 64 karakter hex (32 byte).");
}

/**
 * AES-256-GCM encrypt. Output format `iv:authTag:cipherText` (hex).
 * Throws on failure: silently storing a secret in plain text is worse than an error.
 */
export function encryptSecret(plainText) {
  if (plainText === null || plainText === undefined || plainText === "") {
    throw new Error("encryptSecret: nilai kosong.");
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, MASTER_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(String(plainText), "utf8"), cipher.final()]);
  return `${iv.toString("hex")}:${cipher.getAuthTag().toString("hex")}:${encrypted.toString("hex")}`;
}

/** Inverse of encryptSecret. Throws if the payload is malformed or tampered with. */
export function decryptSecret(payload) {
  const parts = String(payload || "").split(":");
  if (parts.length !== 3) throw new Error("decryptSecret: format payload tidak valid.");
  const [ivHex, tagHex, dataHex] = parts;
  const decipher = crypto.createDecipheriv(ALGORITHM, MASTER_KEY, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]).toString("utf8");
}

export function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function comparePassword(password, hash) {
  if (!password || !hash) return false;
  return bcrypt.compare(password, hash);
}

// Hash compared against when the account does not exist, so response time does
// not reveal whether an email is registered.
const DUMMY_HASH = bcrypt.hashSync("klozer-timing-equalizer", BCRYPT_ROUNDS);
export const dummyPasswordCheck = (password) => bcrypt.compare(password || "", DUMMY_HASH);

const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghjkmnpqrstuvwxyz";
const DIGITS = "23456789";
const SPECIAL = "!@#$%*?";
const ALL = UPPER + LOWER + DIGITS + SPECIAL;
const pick = (set) => set[crypto.randomInt(set.length)];

/** Cryptographically random password containing every character class (no look-alike glyphs). */
export function generateRandomPassword(length = 12) {
  const chars = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SPECIAL)];
  while (chars.length < length) chars.push(pick(ALL));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

export const randomToken = (bytes = 24) => crypto.randomBytes(bytes).toString("hex");

export function safeEqual(a, b) {
  const bufA = Buffer.from(String(a ?? ""), "utf8");
  const bufB = Buffer.from(String(b ?? ""), "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
