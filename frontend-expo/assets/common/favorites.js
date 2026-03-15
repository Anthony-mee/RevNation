import AsyncStorage from "@react-native-async-storage/async-storage";

export const FAVORITES_STORAGE_KEY = "favoriteProducts";

function normalizeFavoriteItem(item) {
    if (!item || typeof item !== "object") {
        return null;
    }

    const id = String(item.id || item._id || item.name || "");
    if (!id) {
        return null;
    }

    return {
        id,
        _id: item._id || item.id || id,
        name: item.name || "Product",
        brand: item.brand || "",
        image: item.image || "",
        price: Number(item.price || 0),
        countInStock: Number(item.countInStock || 0),
        rating: Number(item.rating || 0),
        numReviews: Number(item.numReviews || 0),
        description: item.description || "",
        richDescription: item.richDescription || "",
        isFeatured: Boolean(item.isFeatured),
        category: item.category || null,
    };
}

async function readFavoritesRaw() {
    try {
        const stored = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
        const parsed = stored ? JSON.parse(stored) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
        return [];
    }
}

export async function getFavoriteItems() {
    const items = await readFavoritesRaw();
    return items
        .map((item) => normalizeFavoriteItem(item))
        .filter(Boolean);
}

export async function isFavoriteItem(itemId) {
    const items = await readFavoritesRaw();
    return items.some((item) => {
        if (typeof item === "string") {
            return item === itemId;
        }
        return String(item?.id || item?._id || item?.name || "") === itemId;
    });
}

export async function toggleFavoriteItem(item) {
    const normalized = normalizeFavoriteItem(item);
    if (!normalized) {
        return { favorites: [], isFavorite: false };
    }

    const current = await getFavoriteItems();
    const exists = current.some((favorite) => favorite.id === normalized.id);
    const nextFavorites = exists
        ? current.filter((favorite) => favorite.id !== normalized.id)
        : [normalized, ...current.filter((favorite) => favorite.id !== normalized.id)];

    await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(nextFavorites));

    return {
        favorites: nextFavorites,
        isFavorite: !exists,
    };
}

export async function removeFavoriteItem(itemId) {
    const current = await getFavoriteItems();
    const nextFavorites = current.filter((favorite) => favorite.id !== itemId);
    await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(nextFavorites));
    return nextFavorites;
}