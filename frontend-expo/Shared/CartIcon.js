import React from "react";
import { StyleSheet, Text } from "react-native";
import { useSelector } from "react-redux";
import { Badge } from "react-native-paper";

const CartIcon = () => {
    const cartItems = useSelector((state) => state.cartItems);
    return (
        <>
            {cartItems.length ? (
                <Badge style={styles.badge}>
                    <Text style={styles.text}>{cartItems.length}</Text>
                </Badge>
            ) : null}
        </>
    );
};

const styles = StyleSheet.create({
    badge: {
        width: 20,
        position: "absolute",
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        alignContent: "center",
        top: -2,
        right: -8,
    },
    text: {
        fontSize: 12,
        width: 100,
        fontWeight: "bold",
        color: "white",
    },
});

export default CartIcon;
