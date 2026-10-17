import "./setupEnv.js";
// A key so the vision call is attempted (fetch is mocked in the tests, nothing leaves the machine).
process.env.NVIDIA_API_KEY = "nv-test-key";
process.env.META_APP_SECRET = "test-meta-secret";
