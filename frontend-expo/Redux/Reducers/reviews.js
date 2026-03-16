import {
    FETCH_REVIEWS_REQUEST,
    FETCH_REVIEWS_SUCCESS,
    FETCH_REVIEWS_FAIL,
    SUBMIT_REVIEW_REQUEST,
    SUBMIT_REVIEW_SUCCESS,
    SUBMIT_REVIEW_FAIL,
} from "../constants";

const initialState = {
    loading: false,
    items: [],
    submitting: false,
    error: null,
};

const reviews = (state = initialState, action) => {
    switch (action.type) {
        case FETCH_REVIEWS_REQUEST:
            return { ...state, loading: true, error: null };
        case FETCH_REVIEWS_SUCCESS:
            return { ...state, loading: false, items: action.payload };
        case FETCH_REVIEWS_FAIL:
            return { ...state, loading: false, error: action.payload };
        case SUBMIT_REVIEW_REQUEST:
            return { ...state, submitting: true, error: null };
        case SUBMIT_REVIEW_SUCCESS:
            return { ...state, submitting: false };
        case SUBMIT_REVIEW_FAIL:
            return { ...state, submitting: false, error: action.payload };
        default:
            return state;
    }
};

export default reviews;
