import { Platform } from "react-native";
import Constants from "expo-constants";

/**
 * Backend API base URL. The app sends all API requests (login, products, orders, etc.) here.
 *
 * SETUP FOR EXPO GO ON YOUR PHONE:
 * 1. Run the backend on your laptop (e.g. node server.js in the backend folder, port 4000).
 * 2. Find your laptop's IP (Windows: ipconfig → IPv4; same WiFi as your phone).
 * 3. Set BACKEND_HOST below to that IP, e.g. 'http://192.168.1.105:4000'
 * 4. Run: npx expo start → scan QR with Expo Go. Your phone will call this URL.
 *
 * For web/same machine: use 'http://localhost:4000'
 * When backend is deployed to cloud: set BACKEND_HOST to that URL (e.g. https://your-api.railway.app)
 */
// If you are testing on a phone or external LAN, set this to your machine's IP:
// Note: include the port your backend is running on (default 4000).
// Do not use a public NAT IP (e.g. 119.x.x.x) unless your router is configured for port forwarding.
function normalizeHost(rawHost) {
  if (!rawHost) return "";
  const trimmed = String(rawHost).trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `http://${trimmed}`;
}

function resolveExpoLanBackendHost() {
  const hostUri =
    Constants?.expoConfig?.hostUri
    || Constants?.manifest2?.extra?.expoClient?.hostUri
    || Constants?.manifest?.debuggerHost
    || "";

  const hostCandidate = String(hostUri).trim().split(":")[0];
  const isIPv4 = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostCandidate);
  if (!isIPv4) return "";

  return `http://${hostCandidate}:4001`;
}

const envHost = normalizeHost(process.env.EXPO_PUBLIC_BACKEND_HOST || process.env.BACKEND_HOST || "");
const EXPO_LAN_BACKEND_HOST = resolveExpoLanBackendHost();
const EMULATOR_HOST = Platform.OS === "android" ? "http://10.0.2.2:4001" : "http://localhost:4001";
const LOCAL_BACKEND_HOST = "http://localhost:4001";

// RENDER DEPLOYED BACKEND - Use this for production
const RENDER_BACKEND_HOST = "https://revnation-x94f.onrender.com";

const BACKEND_HOST =
  envHost ||
  (Platform.OS === "web" ? LOCAL_BACKEND_HOST : RENDER_BACKEND_HOST) ||
  EXPO_LAN_BACKEND_HOST ||
  EMULATOR_HOST;

const baseURL = `${BACKEND_HOST}/api/v1/`;

export default baseURL;
