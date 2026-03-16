import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const JWT_KEY = "jwt";

function canUseSecureStore() {
    return typeof SecureStore?.isAvailableAsync === "function";
}

export async function setAuthToken(token) {
    const value = String(token || "");

    // Keep AsyncStorage in sync so existing screens remain compatible.
    await AsyncStorage.setItem(JWT_KEY, value);

    try {
        if (canUseSecureStore() && await SecureStore.isAvailableAsync()) {
            await SecureStore.setItemAsync(JWT_KEY, value);
        }
    } catch (_error) {
        // Fallback already persisted in AsyncStorage.
    }
}

export async function getAuthToken() {
    try {
        if (canUseSecureStore() && await SecureStore.isAvailableAsync()) {
            const secureToken = await SecureStore.getItemAsync(JWT_KEY);
            if (secureToken) {
                // Rehydrate AsyncStorage for older code paths.
                await AsyncStorage.setItem(JWT_KEY, secureToken);
                return secureToken;
            }
        }
    } catch (_error) {
        // Ignore and fall back to AsyncStorage below.
    }

    return AsyncStorage.getItem(JWT_KEY);
}

export async function removeAuthToken() {
    await AsyncStorage.removeItem(JWT_KEY);

    try {
        if (canUseSecureStore() && await SecureStore.isAvailableAsync()) {
            await SecureStore.deleteItemAsync(JWT_KEY);
        }
    } catch (_error) {
        // Ignore cleanup errors.
    }
}
