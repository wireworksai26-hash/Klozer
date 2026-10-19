// Must be the first import of every test file: config/env.js reads process.env at import time.
process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = process.env.TEST_LOG_LEVEL || "silent";
process.env.DB_HOST = process.env.TEST_DB_HOST || "127.0.0.1";
process.env.DB_PORT = process.env.TEST_DB_PORT || "3307";
process.env.DB_USER = process.env.TEST_DB_USER || "root";
process.env.DB_PASSWORD = process.env.TEST_DB_PASSWORD || "testroot";
process.env.DB_NAME = `klozer_test_${process.pid}`;
process.env.JWT_SECRET = "test-jwt-secret-that-is-long-enough-for-hs256-0123456789";
process.env.DB_ENCRYPTION_KEY = "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff";
process.env.CORS_ORIGINS = "http://localhost:3000";
