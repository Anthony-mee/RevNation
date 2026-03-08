const requiredKeys = ["CONNECTION_STRING", "JWT_SECRET"];

const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  apiPrefix: process.env.API_PREFIX || "/api/v1",
  connectionString: process.env.CONNECTION_STRING || "",
  dbName: process.env.DB_NAME || "ITCP_database",
  jwtSecret: process.env.JWT_SECRET || "",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  corsOrigin: process.env.CORS_ORIGIN || "*",
  uploadDir: process.env.UPLOAD_DIR || "uploads",
  maxFileSizeMb: Number(process.env.MAX_FILE_SIZE_MB || 5),
  fcmServiceAccountPath: process.env.FCM_SERVICE_ACCOUNT_PATH || "",
  appBaseUrl: process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 4000}`,
  emailFrom: process.env.EMAIL_FROM || "noreply@revnation.local",
  mailtrapHost: process.env.MAILTRAP_HOST || "",
  mailtrapPort: Number(process.env.MAILTRAP_PORT || 2525),
  mailtrapUser: process.env.MAILTRAP_USER || "",
  mailtrapPass: process.env.MAILTRAP_PASS || "",
  mailtrapApiToken: process.env.MAILTRAP_API_TOKEN || "",
  emailVerifyTtlHours: Number(process.env.EMAIL_VERIFY_TTL_HOURS || 24),
  requireEmailVerification: String(process.env.REQUIRE_EMAIL_VERIFICATION || "true").toLowerCase() === "true",
};

const missing = requiredKeys.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.warn(`[config] Missing env key(s): ${missing.join(", ")}`);
}

module.exports = config;
