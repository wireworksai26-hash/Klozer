import { sanitizeXss, deepSanitize } from "../src/utils/sanitize.js";

const testCases = [
  {
    name: "Script tag injection",
    input: "<script>alert('XSS')</script>",
    check: (out) => !out.includes("<script") && !out.includes("alert"),
  },
  {
    name: "IMG tag with onerror handler",
    input: "<img src=x onerror=alert(1)>",
    check: (out) => !out.includes("onerror") && !out.includes("<img"),
  },
  {
    name: "SVG onload injection",
    input: "<svg onload=alert(document.cookie)>",
    check: (out) => !out.includes("onload") && !out.includes("<svg"),
  },
  {
    name: "Iframe injection",
    input: "<iframe src=\"javascript:alert('pwn')\"></iframe>",
    check: (out) => !out.includes("<iframe") && !out.includes("javascript:"),
  },
  {
    name: "Legitimate customer message",
    input: "Halo kak, batik Solo ukuran XL masih ada?",
    check: (out) => out === "Halo kak, batik Solo ukuran XL masih ada?",
  },
  {
    name: "Legitimate punctuation and quotes",
    input: 'Catatan pesanan: "Tolong kirim sebelum jam 3 sore"',
    check: (out) => out === 'Catatan pesanan: "Tolong kirim sebelum jam 3 sore"',
  },
];

let allPassed = true;
console.log("=== RUNNING BE-03 XSS SANITIZATION TESTS ===\n");

for (const tc of testCases) {
  const result = sanitizeXss(tc.input);
  const passed = tc.check(result);
  console.log(`[${passed ? "PASS" : "FAIL"}] ${tc.name}`);
  console.log(`   Input : ${tc.input}`);
  console.log(`   Output: ${result}`);
  if (!passed) allPassed = false;
}

// Test deepSanitize on nested body
const payload = {
  name: "Budi <script>alert(1)</script>",
  notes: "Customer VIP <img src=x onerror=alert('hack')>",
  password: "Secret<Password>123!",
  items: [
    { title: "Kemeja <svg onload=alert(1)>" }
  ]
};

const sanitizedPayload = deepSanitize(payload);
console.log("\n=== DEEP SANITIZATION TEST ===");
console.log("Input payload:", JSON.stringify(payload, null, 2));
console.log("Sanitized payload:", JSON.stringify(sanitizedPayload, null, 2));

const deepPassed =
  !sanitizedPayload.name.includes("<script") &&
  !sanitizedPayload.notes.includes("onerror") &&
  sanitizedPayload.password === "Secret<Password>123!" && // password intact!
  !sanitizedPayload.items[0].title.includes("onload");

console.log(`[${deepPassed ? "PASS" : "FAIL"}] Nested Object & Password preservation`);

if (allPassed && deepPassed) {
  console.log("\n>>> ALL XSS TESTS PASSED SUCCESSFULLY! <<<");
  process.exit(0);
} else {
  console.error("\n>>> SOME TESTS FAILED! <<<");
  process.exit(1);
}
