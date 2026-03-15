import {
    ADD_TO_CART,
    REMOVE_FROM_CART,
    CLEAR_CART,
    SET_CART_ITEMS,
} from '../constants';
import {
    loadCartItems,
    saveCartItems,
    clearCartItemsStorage,
} from '../../assets/common/cartStorage';

export const addToCart = (payload) => {
    return async (dispatch, getState) => {
        dispatch({ type: ADD_TO_CART, payload });
        await saveCartItems(getState().cartItems);
    };
};

export const removeFromCart = (payload) => {
    return async (dispatch, getState) => {
        dispatch({ type: REMOVE_FROM_CART, payload });
        await saveCartItems(getState().cartItems);
    };
};

export const clearCart = () => {
    return async (dispatch) => {
        dispatch({ type: CLEAR_CART });
        await clearCartItemsStorage();
    };
};

export const hydrateCartFromStorage = () => {
    return async (dispatch) => {
        const items = await loadCartItems();
        dispatch({ type: SET_CART_ITEMS, payload: items });
    };
};

export const persistCurrentCart = () => {
    return async (_dispatch, getState) => {
        await saveCartItems(getState().cartItems);
    };
};
