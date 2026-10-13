import { errorHandler } from "../src/middlewares/errorHandler.js";

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  return res;
}

const req = { id: "req_test_12345", method: "GET", path: "/test" };

console.log("=== RUNNING BE-04 ERROR HANDLER HARDENING TESTS ===\n");

// Test 1: Generic Unexpected Database / System Crash Error
const dbError = new Error("Connection lost: select * from users where password = 'secret'");
dbError.code = "PROTOCOL_CONNECTION_LOST";
dbError.stack = "Error: Connection lost\n    at Connection.query (C:\\Apps\\Klozer-main\\src\\config\\db.js:10:5)";

const res1 = mockRes();
errorHandler(dbError, req, res1, () => {});

console.log("Test 1 - DB Connection Lost Error:");
console.log("Status Code :", res1.statusCode);
console.log("Response    :", JSON.stringify(res1.body, null, 2));

const pass1 =
  res1.statusCode === 503 &&
  res1.body.code === "DATABASE_UNAVAILABLE" &&
  res1.body.stack === undefined &&
  !JSON.stringify(res1.body).includes("password") &&
  !JSON.stringify(res1.body).includes("Klozer-main");

console.log("Test 1 Result:", pass1 ? "PASS (Zero Leaks) ✅" : "FAIL ❌\n");

// Test 2: Unhandled Query Syntax / Schema Error
const syntaxError = new Error("Table 'klozer_db.secret_admin_table' doesn't exist");
syntaxError.code = "ER_NO_SUCH_TABLE";
syntaxError.sql = "SELECT * FROM secret_admin_table";
syntaxError.stack = "Error: ER_NO_SUCH_TABLE at query (C:\\Apps\\Klozer-main\\src\\database.js:45)";

const res2 = mockRes();
errorHandler(syntaxError, req, res2, () => {});

console.log("\nTest 2 - DB Schema Query Error:");
console.log("Status Code :", res2.statusCode);
console.log("Response    :", JSON.stringify(res2.body, null, 2));

const pass2 =
  res2.statusCode === 500 &&
  res2.body.code === "DATABASE_ERROR" &&
  res2.body.stack === undefined &&
  !JSON.stringify(res2.body).includes("secret_admin_table") &&
  !JSON.stringify(res2.body).includes("Klozer-main");

console.log("Test 2 Result:", pass2 ? "PASS (Zero Leaks) ✅" : "FAIL ❌\n");

// Test 3: Malformed JSON body
const jsonError = new SyntaxError("Unexpected token in JSON at position 4");
jsonError.type = "entity.parse.failed";

const res3 = mockRes();
errorHandler(jsonError, req, res3, () => {});

console.log("\nTest 3 - Malformed JSON Request:");
console.log("Status Code :", res3.statusCode);
console.log("Response    :", JSON.stringify(res3.body, null, 2));

const pass3 =
  res3.statusCode === 400 &&
  res3.body.code === "INVALID_JSON" &&
  res3.body.stack === undefined;

console.log("Test 3 Result:", pass3 ? "PASS ✅" : "FAIL ❌\n");

// Test 4: Live HTTP test against backend
async function testLiveHttp() {
  console.log("Test 4 - Live HTTP Invalid JSON Payload to /api/v1/auth/login:");
  const res = await fetch("http://localhost:5000/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{ malformed json...",
  });
  const body = await res.json();
  console.log("Live HTTP Status  :", res.status);
  console.log("Live HTTP Response:", JSON.stringify(body, null, 2));

  const pass4 =
    res.status === 400 &&
    body.code === "INVALID_JSON" &&
    body.stack === undefined;

  console.log("Test 4 Result     :", pass4 ? "PASS ✅" : "FAIL ❌\n");

  if (pass1 && pass2 && pass3 && pass4) {
    console.log(">>> ALL BE-04 ERROR HANDLING TESTS PASSED! ZERO INFORMATION DISCLOSURE! <<<");
    process.exit(0);
  } else {
    process.exit(1);
  }
}

testLiveHttp().catch((err) => {
  console.error("Live test failed:", err);
  process.exit(1);
});
