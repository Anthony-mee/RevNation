import {
    ADD_TO_CART,
    REMOVE_FROM_CART,
    CLEAR_CART,
} from '../constants';

const getItemKey = (item) => String(item?.id || item?._id || "");

const cartItems = (state = [], action) => {
    switch (action.type) {
        case ADD_TO_CART: {
            const incoming = action.payload || {};
            const key = getItemKey(incoming);
            if (!key) return state;

            const incomingQty = Number(incoming.quantity || 1);
            const existingIndex = state.findIndex((cartItem) => getItemKey(cartItem) === key);
            if (existingIndex === -1) {
                return [...state, { ...incoming, quantity: incomingQty > 0 ? incomingQty : 1 }];
            }

            return state.map((cartItem, idx) => {
                if (idx !== existingIndex) return cartItem;
                const currentQty = Number(cartItem.quantity || 1);
                return { ...cartItem, quantity: currentQty + (incomingQty > 0 ? incomingQty : 1) };
            });
        }
        case REMOVE_FROM_CART: {
            const target = action.payload || {};
            const key = getItemKey(target);
            if (!key) return state;

            return state
                .map((cartItem) => {
                    if (getItemKey(cartItem) !== key) return cartItem;
                    const currentQty = Number(cartItem.quantity || 1);
                    return { ...cartItem, quantity: currentQty - 1 };
                })
                .filter((cartItem) => Number(cartItem.quantity || 0) > 0);
        }
        case CLEAR_CART:
            return (state = []);
        default:
            return state;
    }
};

export default cartItems;
