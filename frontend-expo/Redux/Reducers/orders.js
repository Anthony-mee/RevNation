import {
    FETCH_ORDERS_REQUEST,
    FETCH_ORDERS_SUCCESS,
    FETCH_ORDERS_FAIL,
} from "../constants";

const initialState = {
    loading: false,
    items: [],
    error: null,
};

const orders = (state = initialState, action) => {
    switch (action.type) {
        case FETCH_ORDERS_REQUEST:
            return { ...state, loading: true, error: null };
        case FETCH_ORDERS_SUCCESS:
            return { ...state, loading: false, items: action.payload };
        case FETCH_ORDERS_FAIL:
            return { ...state, loading: false, error: action.payload };
        default:
            return state;
    }
};

export default orders;
