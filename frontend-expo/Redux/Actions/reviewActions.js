import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    FETCH_REVIEWS_REQUEST,
    FETCH_REVIEWS_SUCCESS,
    FETCH_REVIEWS_FAIL,
    SUBMIT_REVIEW_REQUEST,
    SUBMIT_REVIEW_SUCCESS,
    SUBMIT_REVIEW_FAIL,
} from "../constants";
import baseURL from "../../assets/common/baseurl";

/**
 * Fetch all reviews for a product.
 */
export const fetchReviews = (productId) => async (dispatch) => {
    if (!productId) return;
    dispatch({ type: FETCH_REVIEWS_REQUEST });
    try {
        const res = await axios.get(`${baseURL}products/${productId}/reviews`);
        dispatch({ type: FETCH_REVIEWS_SUCCESS, payload: Array.isArray(res.data) ? res.data : [] });
    } catch (error) {
        dispatch({
            type: FETCH_REVIEWS_FAIL,
            payload: error?.response?.data?.message || "Failed to load reviews",
        });
    }
};

/**
 * Submit or update a review / comment for a product.
 * mode: 'create' | 'addComment' | 'editComment'
 * commentId: required when mode === 'editComment'
 */
export const submitReview = (productId, formData, mode = "create", commentId = null) => async (dispatch) => {
    dispatch({ type: SUBMIT_REVIEW_REQUEST });
    try {
        const token = await AsyncStorage.getItem("jwt");
        const config = {
            headers: {
                Authorization: `Bearer ${token || ""}`,
                "Content-Type": "multipart/form-data",
            },
        };

        if (mode === "editComment" && commentId) {
            await axios.put(
                `${baseURL}products/${productId}/reviews/me/comments/${commentId}`,
                formData,
                config
            );
        } else if (mode === "addComment") {
            await axios.post(`${baseURL}products/${productId}/reviews/me/comments`, formData, config);
        } else {
            await axios.post(`${baseURL}products/${productId}/reviews`, formData, config);
        }

        dispatch({ type: SUBMIT_REVIEW_SUCCESS });
        // Re-fetch reviews so the store is up to date
        dispatch(fetchReviews(productId));
    } catch (error) {
        dispatch({
            type: SUBMIT_REVIEW_FAIL,
            payload: error?.response?.data?.message || "Failed to submit review",
        });
        // Re-throw so the calling component can handle toast messages
        throw error;
    }
};

/**
 * Delete a specific comment on the user's own review.
 */
export const deleteReviewComment = (productId, commentId) => async (dispatch) => {
    dispatch({ type: SUBMIT_REVIEW_REQUEST });
    try {
        const token = await AsyncStorage.getItem("jwt");
        await axios.delete(
            `${baseURL}products/${productId}/reviews/me/comments/${commentId}`,
            { headers: { Authorization: `Bearer ${token || ""}` } }
        );
        dispatch({ type: SUBMIT_REVIEW_SUCCESS });
        dispatch(fetchReviews(productId));
    } catch (error) {
        dispatch({
            type: SUBMIT_REVIEW_FAIL,
            payload: error?.response?.data?.message || "Failed to delete comment",
        });
        throw error;
    }
};
