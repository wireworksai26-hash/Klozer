import crypto from "crypto";
import bcrypt from "bcryptjs";
import { config } from "../config/env.js";

const ALGORITHM = "aes-256-gcm";
// Ensure master key is 32 bytes
const MASTER_KEY = crypto.createHash("sha256").update(config.dbEncryptionKey).digest();

/**
 * Encrypt sensitive plain text using AES-256-GCM
 * @param {string} plainText 
 * @returns {string} iv:authTag:cipherText
 */
export function encryptSecret(plainText) {
  if (!plainText) return "";
  try {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, MASTER_KEY, iv);
    let encrypted = cipher.update(plainText, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");
    return `${iv.toString("hex")}:${authTag}:${encrypted}`;
  } catch (err) {
    console.error("[Encryption Error]", err.message);
    return plainText;
  }
}

/**
 * Decrypt payload encrypted with AES-256-GCM
 * @param {string} encryptedPayload 
 * @returns {string} plainText
 */
export function decryptSecret(encryptedPayload) {
  if (!encryptedPayload || !encryptedPayload.includes(":")) return encryptedPayload;
  try {
    const [ivHex, authTagHex, cipherText] = encryptedPayload.split(":");
    const decipher = crypto.createDecipheriv(ALGORITHM, MASTER_KEY, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
    let decrypted = decipher.update(cipherText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    console.error("[Decryption Error]", err.message);
    return encryptedPayload;
  }
}

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compare password with hash
 */
export async function comparePassword(password, hash) {
  if (!password || !hash) return false;
  return bcrypt.compare(password, hash);
}

/**
 * Generate a clean, secure random password for auto-generated institution accounts
 */
export function generateRandomPassword(length = 10) {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const numbers = "23456789";
  const special = "!@#$%";
  const all = upper + lower + numbers + special;

  let password = "";
  password += upper[Math.floor(Math.random() * upper.length)];
  password += lower[Math.floor(Math.random() * lower.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  for (let i = 4; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  return password.split("").sort(() => 0.5 - Math.random()).join("");
}
