import { jwtDecode } from "jwt-decode";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import baseURL from "../../assets/common/baseurl";
import { setAuthToken, getAuthToken, removeAuthToken } from "../../assets/common/tokenStorage";

export const SET_CURRENT_USER = "SET_CURRENT_USER";
const REQUEST_TIMEOUT_MS = 12000;

const fetchWithTimeout = (url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    return fetch(url, { ...options, signal: controller.signal })
        .finally(() => clearTimeout(timeoutId));
};

export const loginUser = (user, dispatch) => {
    return fetchWithTimeout(`${baseURL}users/login`, {
        method: "POST",
        body: JSON.stringify(user),
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
    })
        .then(async (res) => {
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data?.message || "Login failed");
            }
            if (!data?.token) {
                throw new Error("Login failed: missing token");
            }

            await setAuthToken(data.token);
            const decoded = jwtDecode(data.token);
            dispatch(setCurrentUser(decoded, data?.user || user));
            return data;
        })
        .catch((err) => {
            const isInvalidCredentials = /invalid credentials/i.test(String(err?.message));
            const isNetworkError = /network request failed|aborted|timed out|timeout/i.test(String(err?.message));
            Toast.show({
                topOffset: 60,
                type: "error",
                text1: isInvalidCredentials
                    ? "Invalid email or password"
                    : isNetworkError
                        ? "Cannot reach server"
                        : "Login failed",
                text2: isInvalidCredentials
                    ? "Please try again"
                    : isNetworkError
                        ? `Server unreachable. Check baseurl.js (${baseURL}), same WiFi, and HTTP/HTTPS config.`
                        : String(err?.message || "Please try again"),
            });
            console.log(err);
            logoutUser(dispatch);
        });
};

export const getUserProfile = (id) => {
    fetch(`${baseURL}users/${id}`, {
        method: "GET",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
    })
        .then((res) => res.json())
        .then((data) => console.log(data));
};

export const logoutUser = async (dispatch) => {
    try {
        const jwt = await getAuthToken();
        const pushToken = await AsyncStorage.getItem("pushToken");

        if (jwt && pushToken) {
            await fetch(`${baseURL}users/push-token`, {
                method: "DELETE",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${jwt}`,
                },
                body: JSON.stringify({ token: pushToken }),
            }).catch(() => null);
        }

        await AsyncStorage.removeItem("pushToken");
        await removeAuthToken();
    } finally {
        dispatch(setCurrentUser({}));
    }
};

export const setCurrentUser = (decoded, user) => {
    return {
        type: SET_CURRENT_USER,
        payload: decoded,
        userProfile: user,
    };
};
