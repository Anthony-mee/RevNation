const path = require("path");
const fs = require("fs");
const config = require("../config");

const backendRoot = path.resolve(__dirname, "..");

function getUploadDirName() {
  return String(config.uploadDir || "uploads").replace(/^\/+|\/+$/g, "") || "uploads";
}

function getUploadAbsolutePath() {
  return path.join(backendRoot, getUploadDirName());
}

function ensureUploadDirExists() {
  fs.mkdirSync(getUploadAbsolutePath(), { recursive: true });
}

function getLegacyUploadPaths() {
  const dir = getUploadDirName();
  const candidates = [
    path.resolve(process.cwd(), dir),
    path.resolve(backendRoot, "..", dir),
  ];

  const canonical = getUploadAbsolutePath();
  return candidates.filter((p) => path.resolve(p) !== path.resolve(canonical));
}

function getRequestOrigin(req) {
  if (!req) {
    return String(config.appBaseUrl || "").replace(/\/+$/g, "");
  }
  return `${req.protocol}://${req.get("host")}`;
}

function buildImageUrl(req, filename) {
  if (!filename) return "";
  const origin = getRequestOrigin(req);
  return `${origin}/${getUploadDirName()}/${filename}`;
}

function normalizeImageUrl(req, imageUrl) {
  if (!imageUrl) return "";

  const value = String(imageUrl).trim();
  const origin = getRequestOrigin(req);
  const dir = getUploadDirName();

  if (/^https?:\/\//i.test(value)) {
    try {
      const parsed = new URL(value);
      // Always normalize upload URLs to the current request host so old LAN IP/localhost values still work.
      if (parsed.pathname.startsWith(`/${dir}/`)) {
        return `${origin}${parsed.pathname}${parsed.search}`;
      }

      const hostname = parsed.hostname.toLowerCase();
      if (hostname === "localhost" || hostname === "127.0.0.1") {
        return `${origin}${parsed.pathname}${parsed.search}`;
      }
      return value;
    } catch (_error) {
      return value;
    }
  }

  if (value.startsWith("/")) {
    return `${origin}${value}`;
  }

  if (value.startsWith(`${dir}/`)) {
    return `${origin}/${value}`;
  }

  return `${origin}/${dir}/${value}`;
}

module.exports = {
  getUploadDirName,
  getUploadAbsolutePath,
  ensureUploadDirExists,
  getLegacyUploadPaths,
  buildImageUrl,
  normalizeImageUrl,
};
