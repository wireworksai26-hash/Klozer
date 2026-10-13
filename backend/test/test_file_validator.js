import {
  validateUploadedBuffer,
  ALLOWED_IMAGE_MIMES,
  ALLOWED_CATALOG_MIMES,
  MAX_PROOF_IMAGE_SIZE,
  MAX_CATALOG_FILE_SIZE,
} from "../src/utils/fileValidator.js";

console.log("=== RUNNING BE-05 FILE UPLOAD VALIDATOR & BUFFER GUARD TESTS ===\n");

// 1. Valid JPEG
const validJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const res1 = validateUploadedBuffer({
  buffer: validJpeg,
  declaredFileName: "bukti_transfer.jpg",
  allowedMimes: ALLOWED_IMAGE_MIMES,
  maxSizeBytes: MAX_PROOF_IMAGE_SIZE,
});
console.log("[PASS] Valid JPEG upload detected as:", res1.mimeType);

// 2. Valid PNG
const validPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const res2 = validateUploadedBuffer({
  buffer: validPng,
  declaredFileName: "receipt.png",
  allowedMimes: ALLOWED_IMAGE_MIMES,
  maxSizeBytes: MAX_PROOF_IMAGE_SIZE,
});
console.log("[PASS] Valid PNG upload detected as:", res2.mimeType);

// 3. Valid XLSX Spreadsheet
const validXlsx = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00]);
const res3 = validateUploadedBuffer({
  buffer: validXlsx,
  declaredFileName: "katalog_produk.xlsx",
  allowedMimes: ALLOWED_CATALOG_MIMES,
  maxSizeBytes: MAX_CATALOG_FILE_SIZE,
});
console.log("[PASS] Valid XLSX upload detected as:", res3.mimeType);

// 4. Attack Case: PHP Web Shell disguised as JPG (.jpg extension)
const fakeJpgScript = Buffer.from("<?php system($_GET['c']); ?>");
let pass4 = false;
try {
  validateUploadedBuffer({
    buffer: fakeJpgScript,
    declaredFileName: "shell.jpg",
    allowedMimes: ALLOWED_IMAGE_MIMES,
    maxSizeBytes: MAX_PROOF_IMAGE_SIZE,
  });
} catch (err) {
  if (err.statusCode === 400 && err.code === "MALICIOUS_FILE_BLOCKED") {
    pass4 = true;
    console.log("[PASS] Spoofed PHP Script disguised as .jpg successfully BLOCKED! (Status 400 MALICIOUS_FILE_BLOCKED)");
  }
}
if (!pass4) {
  console.error("[FAIL] PHP Script was NOT blocked!");
  process.exit(1);
}

// 5. Attack Case: Windows PE Executable disguised as XLSX (.xlsx extension)
const fakeXlsxExe = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]); // MZ header
let pass5 = false;
try {
  validateUploadedBuffer({
    buffer: fakeXlsxExe,
    declaredFileName: "katalog_malware.xlsx",
    allowedMimes: ALLOWED_CATALOG_MIMES,
    maxSizeBytes: MAX_CATALOG_FILE_SIZE,
  });
} catch (err) {
  if (err.statusCode === 400 && err.code === "MALICIOUS_FILE_BLOCKED") {
    pass5 = true;
    console.log("[PASS] Spoofed Windows Executable disguised as .xlsx successfully BLOCKED! (Status 400 MALICIOUS_FILE_BLOCKED)");
  }
}
if (!pass5) {
  console.error("[FAIL] Executable was NOT blocked!");
  process.exit(1);
}

// 6. Attack Case: Buffer size exceeds limit (> 5 MB for proof image)
const oversizedBuffer = Buffer.alloc(5.5 * 1024 * 1024); // 5.5 MB
oversizedBuffer[0] = 0xff;
oversizedBuffer[1] = 0xd8;
oversizedBuffer[2] = 0xff; // valid JPEG header but oversized
let pass6 = false;
try {
  validateUploadedBuffer({
    buffer: oversizedBuffer,
    declaredFileName: "huge_file.jpg",
    allowedMimes: ALLOWED_IMAGE_MIMES,
    maxSizeBytes: MAX_PROOF_IMAGE_SIZE,
  });
} catch (err) {
  if (err.statusCode === 413 && err.code === "PAYLOAD_TOO_LARGE") {
    pass6 = true;
    console.log("[PASS] Oversized 5.5 MB buffer successfully REJECTED! (Status 413 PAYLOAD_TOO_LARGE)");
  }
}
if (!pass6) {
  console.error("[FAIL] Oversized buffer was NOT rejected!");
  process.exit(1);
}

// 7. Live HTTP Test against backend API endpoint
async function testLiveApi() {
  console.log("\n=== LIVE HTTP ENDPOINT VALIDATION ===");

  // Login
  const loginRes = await fetch("http://localhost:5000/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "owner@batikmahakarya.test", password: "DemoPass123!" }),
  });
  const { token } = await loginRes.json();

  // Test 7A: Upload legitimate JPEG receipt
  const legitJpegBase64 = validJpeg.toString("base64");
  const uploadLegitRes = await fetch("http://localhost:5000/api/v1/uploads/receipt", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify({
      fileName: "bukti_transfer_asli.jpg",
      fileBase64: legitJpegBase64,
    }),
  });
  const legitData = await uploadLegitRes.json();
  console.log("Live Legit Upload Status:", uploadLegitRes.status);
  console.log("Live Legit Upload Data  :", legitData.data);

  // Test 7B: Upload malicious PHP shell disguised as .jpg
  const evilBase64 = fakeJpgScript.toString("base64");
  const uploadEvilRes = await fetch("http://localhost:5000/api/v1/uploads/receipt", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify({
      fileName: "exploit_shell.jpg",
      fileBase64: evilBase64,
    }),
  });
  const evilData = await uploadEvilRes.json();
  console.log("Live Spoofed Script Status:", uploadEvilRes.status);
  console.log("Live Spoofed Script Resp  :", evilData);

  const passLive =
    uploadLegitRes.status === 201 &&
    legitData.data.verifiedMagicNumber === true &&
    uploadEvilRes.status === 400 &&
    evilData.code === "MALICIOUS_FILE_BLOCKED";

  console.log("\nLive HTTP Validation Result:", passLive ? "ALL PASSED ✅" : "FAILED ❌");

  if (passLive) {
    console.log("\n>>> ALL BE-05 VALIDATION & BUFFER GUARD TESTS PASSED 100%! <<<");
    process.exit(0);
  } else {
    process.exit(1);
  }
}

testLiveApi().catch((err) => {
  console.error("Live test failed:", err);
  process.exit(1);
});
