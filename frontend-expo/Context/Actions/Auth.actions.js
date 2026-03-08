import { jwtDecode } from "jwt-decode";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import baseURL from "../../assets/common/baseurl";

export const SET_CURRENT_USER = "SET_CURRENT_USER";

export const loginUser = (user, dispatch) => {
    return fetch(`${baseURL}users/login`, {
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

            await AsyncStorage.setItem("jwt", data.token);
            const decoded = jwtDecode(data.token);
            dispatch(setCurrentUser(decoded, data?.user || user));
            return data;
        })
        .catch((err) => {
            const isInvalidCredentials = /invalid credentials/i.test(String(err?.message));
            Toast.show({
                topOffset: 60,
                type: "error",
                text1: isInvalidCredentials ? "Invalid email or password" : "Login failed",
                text2: isInvalidCredentials ? "Please try again" : String(err?.message || "Please try again"),
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

export const logoutUser = (dispatch) => {
    AsyncStorage.removeItem("jwt");
    dispatch(setCurrentUser({}));
};

export const setCurrentUser = (decoded, user) => {
    return {
        type: SET_CURRENT_USER,
        payload: decoded,
        userProfile: user,
    };
};
