import React from "react";
import {
    StyleSheet,
    View,
    Dimensions,
    Image,
    Text,
    TouchableOpacity,
} from "react-native";
import { addToCart } from "../../Redux/Actions/cartActions";
import { useDispatch } from "react-redux";
import Toast from "react-native-toast-message";
import { Ionicons } from "@expo/vector-icons";

var { width } = Dimensions.get("window");

// Product images come from the API (item.image). Fallback when no image: placeholder URL.
const FALLBACK_IMAGE = "https://cdn.pixabay.com/photo/2012/04/01/17/29/box-23649_960_720.png";

function resolveImageUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== "string") {
        return FALLBACK_IMAGE;
    }

    const trimmed = rawUrl.trim();
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
        return FALLBACK_IMAGE;
    }

    // Some seed data uses legacy placeholder hosts that may fail DNS on certain networks.
    return trimmed
        .replace("via.placeholder.com", "placehold.co")
        .replace("placeholder.com", "placehold.co");
}

const ProductCard = (props) => {
    const { name, price, image, countInStock, brand } = props;
    const dispatch = useDispatch();
    const imageUri = resolveImageUrl(image);

    return (
        <View style={styles.container}>
            <View style={styles.imageContainer}>
                <Image
                    style={styles.image}
                    resizeMode="cover"
                    source={{ uri: imageUri }}
                />
                {countInStock <= 0 && (
                    <View style={styles.outOfStockBadge}>
                        <Text style={styles.outOfStockText}>Out of Stock</Text>
                    </View>
                )}
            </View>
            <View style={styles.details}>
                {brand && <Text style={styles.brand}>{brand}</Text>}
                <Text style={styles.title} numberOfLines={2}>
                    {name}
                </Text>
                <View style={styles.footer}>
                    <Text style={styles.price}>${price.toFixed(2)}</Text>
                    {countInStock > 0 ? (
                        <TouchableOpacity
                            style={styles.addButton}
                            activeOpacity={0.8}
                            onPress={() => {
                                dispatch(addToCart({ ...props, quantity: 1 }));
                                Toast.show({
                                    topOffset: 60,
                                    type: "success",
                                    text1: `${name} added to Cart`,
                                    text2: "Go to your cart to complete order",
                                });
                            }}
                        >
                            <Ionicons name="cart-outline" size={16} color="white" />
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.unavailableIcon}>
                            <Ionicons name="close-circle" size={20} color="#E74C3C" />
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
};


const styles = StyleSheet.create({
    container: {
        backgroundColor: "#131927",
        borderRadius: 16,
        overflow: "hidden",
        marginBottom: 8,
        borderWidth: 1,
        borderColor: "rgba(234, 88, 12, 0.15)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    imageContainer: {
        width: "100%",
        height: 180,
        backgroundColor: "#0b0f1a",
        position: "relative",
    },
    image: {
        width: "100%",
        height: "100%",
    },
    outOfStockBadge: {
        position: "absolute",
        top: 12,
        right: 12,
        backgroundColor: "rgba(239, 68, 68, 0.95)",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    outOfStockText: {
        color: "white",
        fontSize: 11,
        fontWeight: "700",
    },
    details: {
        padding: 12,
    },
    brand: {
        fontSize: 11,
        color: "#fb923c",
        fontWeight: "600",
        marginBottom: 4,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    title: {
        fontSize: 15,
        fontWeight: "600",
        color: "#f8fafc",
        marginBottom: 8,
        lineHeight: 20,
        minHeight: 40,
    },
    footer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 4,
    },
    price: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#fb923c",
    },
    addButton: {
        backgroundColor: "#ea580c",
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#ea580c",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
        elevation: 4,
    },
    unavailableIcon: {
        opacity: 0.6,
    },
});

export default ProductCard;
