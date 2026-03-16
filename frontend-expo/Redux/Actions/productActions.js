import axios from "axios";
import {
    FETCH_PRODUCTS_REQUEST,
    FETCH_PRODUCTS_SUCCESS,
    FETCH_PRODUCTS_FAIL,
} from "../constants";
import baseURL from "../../assets/common/baseurl";

/**
 * Fetch the products list from the API.
 * type: 'shop' | 'service' | undefined (all)
 */
export const fetchProducts = (type = "shop") => async (dispatch) => {
    dispatch({ type: FETCH_PRODUCTS_REQUEST });
    try {
        const url = type ? `${baseURL}products?type=${type}` : `${baseURL}products`;
        const res = await axios.get(url);
        dispatch({ type: FETCH_PRODUCTS_SUCCESS, payload: res.data });
    } catch (error) {
        dispatch({
            type: FETCH_PRODUCTS_FAIL,
            payload: error?.response?.data?.message || "Failed to load products",
        });
    }
};
