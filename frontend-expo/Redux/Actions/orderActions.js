import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    FETCH_ORDERS_REQUEST,
    FETCH_ORDERS_SUCCESS,
    FETCH_ORDERS_FAIL,
} from "../constants";
import baseURL from "../../assets/common/baseurl";

/**
 * Fetch the authenticated user's orders from the API.
 */
export const fetchMyOrders = () => async (dispatch) => {
    dispatch({ type: FETCH_ORDERS_REQUEST });
    try {
        const token = await AsyncStorage.getItem("jwt");
        const res = await axios.get(`${baseURL}orders`, {
            headers: { Authorization: `Bearer ${token || ""}` },
        });
        dispatch({ type: FETCH_ORDERS_SUCCESS, payload: res.data || [] });
    } catch (error) {
        dispatch({
            type: FETCH_ORDERS_FAIL,
            payload: error?.response?.data?.message || "Failed to load orders",
        });
    }
};
