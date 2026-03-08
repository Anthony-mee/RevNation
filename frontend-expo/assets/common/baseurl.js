import { Platform } from "react-native";

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
const LAN_BACKEND_HOST = "http://192.168.100.111:4000";
const LOCAL_BACKEND_HOST = "http://localhost:4000";
const BACKEND_HOST = Platform.OS === "web" ? LOCAL_BACKEND_HOST : LAN_BACKEND_HOST;
const baseURL = `${BACKEND_HOST}/api/v1/`;

export default baseURL;
