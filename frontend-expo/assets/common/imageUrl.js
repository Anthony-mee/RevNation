import baseURL from "./baseurl";

export const FALLBACK_IMAGE = "https://cdn.pixabay.com/photo/2012/04/01/17/29/box-23649_960_720.png";

const backendOrigin = baseURL.replace(/\/api\/v1\/?$/, "");

export function resolveImageUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== "string") {
        return FALLBACK_IMAGE;
    }

    const trimmed = rawUrl.trim();
    if (!trimmed) {
        return FALLBACK_IMAGE;
    }

    // Support relative paths like /uploads/file.jpg or uploads/file.jpg
    if (trimmed.startsWith("/")) {
        return `${backendOrigin}${trimmed}`;
    }

    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
        return `${backendOrigin}/${trimmed.replace(/^\/+/, "")}`;
    }

    // Remap any absolute /uploads URL to current backend host (covers localhost and stale LAN IPs).
    try {
        const parsed = new URL(trimmed);
        if (parsed.pathname.startsWith("/uploads/")) {
            return `${backendOrigin}${parsed.pathname}${parsed.search}`;
        }
    } catch (_error) {
        // Keep existing behavior for non-URL strings.
    }

    return trimmed
        .replace("via.placeholder.com", "placehold.co")
        .replace("placeholder.com", "placehold.co");
}
