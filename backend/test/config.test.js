import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const VALID_PROD = {
  NODE_ENV: "production",
  JWT_SECRET: "a".repeat(10) + "q9Zx3vLmN8pRt2YkW5cBdHfJ7sUgE4oA",
  DB_ENCRYPTION_KEY: "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff",
  DB_HOST: "db",
  DB_USER: "klozer_user",
  DB_PASSWORD: "S0me-Long-Db-Password!",
  DB_NAME: "klozer_db",
  FRONTEND_URL: "https://app.klozer.id",
  CORS_ORIGINS: "https://app.klozer.id",
};

function bootConfig(env) {
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", 'import("./src/config/env.js").then(()=>console.log("CONFIG_OK"))'], {
    cwd: backendDir,
    // never inherit the developer's shell or .env
    env: { PATH: process.env.PATH, DOTENV_CONFIG_PATH: path.join(backendDir, "does-not-exist.env"), ...env },
    encoding: "utf8",
  });
  return { code: result.status, out: result.stdout, err: result.stderr };
}

describe("production configuration fails fast", () => {
  test("refuses to start with no secrets at all", () => {
    const r = bootConfig({ NODE_ENV: "production" });
    assert.equal(r.code, 1);
    for (const name of ["JWT_SECRET", "DB_ENCRYPTION_KEY", "DB_PASSWORD", "DB_HOST"]) assert.match(r.err, new RegExp(name));
  });

  test("refuses the old built-in default secrets and .env.example placeholders", () => {
    const placeholder = bootConfig({ ...VALID_PROD, JWT_SECRET: "your_ultra_secure_jwt_secret_key_here_change_in_production" });
    assert.equal(placeholder.code, 1);
    assert.match(placeholder.err, /JWT_SECRET/);
    const oldDefault = bootConfig({ ...VALID_PROD, JWT_SECRET: "klozer_ultra_secure_jwt_secret_key_2026_dev_mode" });
    assert.equal(oldDefault.code, 1);
    assert.match(oldDefault.err, /pernah dipublikasikan/);
    const oldKey = bootConfig({ ...VALID_PROD, DB_ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef" });
    assert.equal(oldKey.code, 1);
    const composePw = bootConfig({ ...VALID_PROD, DB_PASSWORD: "klozer_secure_pass_2026" });
    assert.equal(composePw.code, 1);
  });

  test("refuses short JWT secrets, malformed encryption keys and weak DB passwords", () => {
    assert.equal(bootConfig({ ...VALID_PROD, JWT_SECRET: "short" }).code, 1);
    assert.equal(bootConfig({ ...VALID_PROD, DB_ENCRYPTION_KEY: "not-hex" }).code, 1);
    assert.equal(bootConfig({ ...VALID_PROD, DB_PASSWORD: "short" }).code, 1);
  });

  test("refuses wildcard CORS", () => {
    const r = bootConfig({ ...VALID_PROD, CORS_ORIGINS: "*" });
    assert.equal(r.code, 1);
    assert.match(r.err, /CORS_ORIGINS/);
  });

  test("starts with a complete, valid configuration", () => {
    const r = bootConfig(VALID_PROD);
    assert.equal(r.code, 0, r.err);
    assert.match(r.out, /CONFIG_OK/);
  });

  test("development stays zero-config", () => {
    const r = bootConfig({ NODE_ENV: "development" });
    assert.equal(r.code, 0, r.err);
  });
});
