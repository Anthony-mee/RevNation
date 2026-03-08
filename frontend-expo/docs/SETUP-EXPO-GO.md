# Set up the app on your phone (Expo Go)

Follow these steps to run the **frontend-expo** app on your phone using Expo Go.

## 1. Install dependencies

From the project root (folder that contains both `frontend-expo` and the professor’s app):

```bash
cd frontend-expo
npm install
```

## 2. Point the app at your backend

Edit **`frontend-expo/assets/common/baseurl.js`**:

- Set `BACKEND_HOST` to your **laptop’s IP address** and port, for example:
  - `const BACKEND_HOST = 'http://192.168.1.105:4000';`
- To find your IP (Windows): open Command Prompt or PowerShell and run **`ipconfig`**. Use the **IPv4 Address** of the adapter that’s on the same Wi‑Fi as your phone (e.g. Wireless LAN adapter Wi-Fi).
- The backend must be running on that port (e.g. 4000) on your laptop.

Leave this as `http://localhost:4000` only if you’re testing in the browser on the same machine; for Expo Go on a phone you **must** use the laptop’s IP.

## 3. Start the backend (if you have it)

In a separate terminal, start your backend server so it listens on port 4000 (or whatever port you used in `BACKEND_HOST`). For example:

```bash
cd backend
node server.js
```

Keep it running while you use the app.

## 4. Start the Expo dev server

From the **frontend-expo** folder:

```bash
npx expo start
```

A QR code will appear in the terminal (and often in the browser).

## 5. Open the app on your phone

1. Install **Expo Go** from the App Store (iOS) or Google Play (Android).
2. Make sure your phone is on the **same Wi‑Fi network** as your laptop.
3. **Android:** Open Expo Go and tap “Scan QR code”, then scan the QR code from the terminal or browser.
4. **iOS:** Open the Camera app and scan the QR code; tap the banner to open in Expo Go.

The app should load. If you see connection or network errors, check:

- Backend is running on the correct port.
- `BACKEND_HOST` in `baseurl.js` uses your laptop’s IP (not `localhost`).
- Phone and laptop are on the same Wi‑Fi.
- Windows Firewall isn’t blocking incoming connections on the backend port (you may need to allow Node or your backend app).

## Quick checklist

- [ ] `cd frontend-expo` and `npm install`
- [ ] `baseurl.js` → `BACKEND_HOST` = `http://YOUR_LAPTOP_IP:4000`
- [ ] Backend running on port 4000
- [ ] `npx expo start` in `frontend-expo`
- [ ] Phone on same Wi‑Fi, Expo Go installed, scan QR code

---

## Troubleshooting

### "Failed to download remote update" or "Unable to connect" in Expo Go

The phone cannot reach the Metro bundler on your laptop. Try:

1. **Same Wi‑Fi:** Phone and laptop must be on the **exact same** Wi‑Fi (not guest network, not mobile hotspot unless the laptop is on that hotspot too).

2. **Windows Firewall:** Allow Node so your phone can connect to Metro (usually port **8081**):
   - Open **Windows Security** → **Firewall & network protection** → **Allow an app through firewall**
   - Click **Change settings** → **Allow another app** → **Browse**
   - Add your **Node.js** executable (e.g. `C:\Program Files\nodejs\node.exe`) and check **Private** and **Public**
   - Or when Windows prompts “Allow Node.js to communicate on networks?” when you run `npx expo start`, choose **Allow access**.

3. **Enter URL manually in Expo Go:** In the terminal, `npx expo start` shows a URL like `exp://192.168.1.x:8081`. On your phone, open **Expo Go** → **Enter URL manually** → type that `exp://...` URL and connect.

4. **School / work Wi‑Fi:** Some networks use “client isolation” so devices cannot see each other. If nothing above works, try:
   - Your phone’s **mobile hotspot**: turn it on, connect your **laptop** to the hotspot, then run `npx expo start` and scan the QR code with the phone (the host).
   - Or try from home Wi‑Fi.

### Tunnel failed (`npx expo start --tunnel`)

Tunnel mode uses an external service (e.g. ngrok) and can fail with “failed to start tunnel” or “remote gone away” due to network/firewall or service issues. Prefer **LAN mode** (plain `npx expo start`) and fix connectivity with the steps above. You can retry tunnel later or check https://status.ngrok.com/ for outages.
