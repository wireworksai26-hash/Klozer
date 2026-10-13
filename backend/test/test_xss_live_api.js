async function testLiveApi() {
  console.log("=== TEST LIVE API HTTP: STALLING STORED XSS ===\n");

  // 1. Login
  const loginRes = await fetch("http://localhost:5000/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "owner@batikmahakarya.test", password: "DemoPass123!" }),
  });
  const loginData = await loginRes.json();
  if (!loginData.success) {
    console.error("Login failed:", loginData);
    process.exit(1);
  }
  const token = loginData.token;
  console.log("1. Login sukses, token JWT diperoleh.");

  // 2. Create lead with XSS payloads in multiple fields
  const xssPayload = {
    name: "Budi Hartono <script>alert('XSS')</script>",
    phone_number: "0812" + Math.floor(10000000 + Math.random() * 90000000),
    notes: "Prioritas tinggi <img src=x onerror=alert(document.cookie)>",
    address_full: "Jl. Sudirman No 10 <iframe src=\"javascript:alert(1)\"></iframe>",
  };

  console.log("2. Mengirim data Lead baru dengan payload XSS:");
  console.log(JSON.stringify(xssPayload, null, 2));

  const leadRes = await fetch("http://localhost:5000/api/v1/leads", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify(xssPayload),
  });
  const leadData = await leadRes.json();
  const lead = leadData.data;

  // 3. Verify sanitization
  console.log("\n3. Data tersimpan di database setelah sanitasi otomatis:");
  console.log("   Name         :", lead.name);
  console.log("   Notes        :", lead.notes);
  console.log("   Address Full :", lead.address_full);

  const isSafe =
    !lead.name.includes("<script") &&
    !lead.name.includes("alert") &&
    !lead.notes.includes("onerror") &&
    !lead.address_full.includes("<iframe") &&
    !lead.address_full.includes("javascript:");

  console.log("\n=== HASIL VERIFIKASI KEAMANAN ===");
  if (isSafe) {
    console.log(">> STATUS: PASS - SEMUA PAYLOAD XSS BERHASIL DINETRALISIR! <<");
    console.log("   - Tag <script> telah dibersihkan");
    console.log("   - Handler jahat 'onerror' telah dibuang");
    console.log("   - Tag <iframe> dan protokol 'javascript:' telah dihilangkan");
    process.exit(0);
  } else {
    console.error(">> STATUS: FAIL - Payload XSS masih lolos ke database! <<");
    process.exit(1);
  }
}

testLiveApi().catch((err) => {
  console.error("Error running test:", err);
  process.exit(1);
});
