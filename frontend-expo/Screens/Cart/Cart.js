import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { Text, View, Image, StyleSheet, TouchableOpacity, useWindowDimensions, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SwipeListView } from "react-native-swipe-list-view";
import { addToCart, removeFromCart, clearCart } from "../../Redux/Actions/cartActions";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const FALLBACK = "https://cdn.pixabay.com/photo/2012/04/01/17/29/box-23649_960_720.png";

const Cart = () => {
    const { width } = useWindowDimensions();
    const isSmallScreen = width < 380;
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const cartItems = useSelector((s) => s.cartItems);
    const itemCount = cartItems.reduce((sum, c) => sum + Number(c.quantity || 1), 0);
    const subtotal = cartItems.reduce((sum, c) => sum + Number(c.price || 0) * Number(c.quantity || 1), 0);
    const shipping = itemCount > 0 ? 0 : 0;
    const total = subtotal + shipping;

    const renderItem = ({ item }) => (
        <View style={[styles.cartItem, isSmallScreen && styles.cartItemSmall]}>
            <View style={styles.itemTopRow}>
                <Ionicons name="storefront-outline" size={14} color="#94a3b8" />
                <Text style={styles.shopName}>RevNation Official Shop</Text>
            </View>
            <View style={[styles.imageContainer, isSmallScreen && styles.imageContainerSmall]}>
                <Image 
                    style={styles.productImage} 
                    source={{ uri: item.image || FALLBACK }}
                    resizeMode="cover"
                />
            </View>
            <View style={styles.itemDetails}>
                <Text style={[styles.productName, isSmallScreen && styles.productNameSmall]} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.productBrand}>{item.brand || "Unknown Brand"}</Text>
                <View style={styles.priceRow}>
                    <Text style={[styles.productPrice, isSmallScreen && styles.productPriceSmall]}>${item.price.toFixed(2)}</Text>
                    <View style={styles.quantityControl}>
                        <TouchableOpacity style={styles.qtyBtn} onPress={() => dispatch(removeFromCart(item))}>
                            <Ionicons name="remove" size={14} color="#f1f5f9" />
                        </TouchableOpacity>
                        <Text style={styles.qtyText}>{Number(item.quantity || 1)}</Text>
                        <TouchableOpacity style={styles.qtyBtn} onPress={() => dispatch(addToCart({ ...item, quantity: 1 }))}>
                            <Ionicons name="add" size={14} color="#f1f5f9" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
            <TouchableOpacity 
                style={styles.deleteButton}
                onPress={() => dispatch(removeFromCart(item))}
            >
                <Ionicons name="trash-outline" size={22} color="#FF6B6B" />
            </TouchableOpacity>
        </View>
    );

    const renderHiddenItem = (rowData) => (
        <View style={styles.hiddenRow}>
            <TouchableOpacity onPress={() => dispatch(removeFromCart(rowData.item))} style={[styles.hiddenButton, isSmallScreen && styles.hiddenButtonSmall]}>
                <Ionicons name="trash" color="white" size={isSmallScreen ? 22 : 26} />
                <Text style={styles.hiddenButtonText}>Delete</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            {cartItems.length > 0 ? (
                <>
                    <View style={styles.header}>
                        <Text style={[styles.headerTitle, isSmallScreen && styles.headerTitleSmall]}>Cart</Text>
                        <Text style={styles.headerSubtitle}>All ({itemCount} {itemCount === 1 ? "item" : "items"})</Text>
                    </View>
                    <SwipeListView
                        data={cartItems}
                        renderItem={renderItem}
                        renderHiddenItem={renderHiddenItem}
                        disableRightSwipe
                        rightOpenValue={-90}
                        contentContainerStyle={[styles.listContent, isSmallScreen && styles.listContentSmall]}
                        keyExtractor={(item, i) => String(item.id || item._id || i)}
                    />
                </>
            ) : (
                <View style={styles.emptyContainer}>
                    <Ionicons name="cart-outline" size={100} color="#94a3b8" />
                    <Text style={styles.emptyTitle}>Your Cart is Empty</Text>
                    <Text style={styles.emptySubtitle}>Add some products to get started</Text>
                    <TouchableOpacity 
                        style={styles.shopButton}
                        onPress={() => navigation.navigate("Home", { screen: "ShopProducts" })}
                    >
                        <Text style={styles.shopButtonText}>Start Shopping</Text>
                    </TouchableOpacity>
                </View>
            )}
            {cartItems.length > 0 && (
                <View style={styles.bottomContainer}>
                    <View style={styles.summaryGrid}>
                        <View style={styles.summaryRow}>
                            <Text style={styles.totalLabel}>Subtotal</Text>
                            <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.totalLabel}>Shipping</Text>
                            <Text style={styles.summaryValue}>${shipping.toFixed(2)}</Text>
                        </View>
                    </View>
                    <View style={styles.totalSection}>
                        <Text style={styles.totalLabelStrong}>Total</Text>
                        <Text style={[styles.totalPrice, isSmallScreen && styles.totalPriceSmall]}>${total.toFixed(2)}</Text>
                    </View>
                    <View style={[styles.actionButtons, isSmallScreen && styles.actionButtonsSmall]}>
                        <TouchableOpacity 
                            style={[styles.clearButton, isSmallScreen && styles.clearButtonSmall]}
                            onPress={() => dispatch(clearCart())}
                        >
                            <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                            <Text style={styles.clearButtonText}>Clear Cart</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.checkoutButton, isSmallScreen && styles.checkoutButtonSmall]}
                            onPress={() => navigation.navigate("Checkout")}
                        >
                            <LinearGradient
                                colors={['#ea580c', '#c2410c']}
                                style={styles.checkoutGradient}
                            >
                                <Text style={styles.checkoutButtonText}>{isSmallScreen ? "Place Order" : "Place Order"}</Text>
                                <Ionicons name="arrow-forward" size={18} color="white" />
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
};


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0b0f1a",
    },
    header: {
        backgroundColor: "#131927",
        padding: 20,
        paddingTop: 10,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(234, 88, 12, 0.15)",
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#f1f5f9",
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: "#94a3b8",
    },
    listContent: {
        padding: 12,
        paddingBottom: 180,
    },
    listContentSmall: {
        paddingHorizontal: 10,
        paddingTop: 10,
        paddingBottom: 205,
    },
    cartItem: {
        backgroundColor: "#131927",
        borderRadius: 12,
        marginBottom: 12,
        padding: 12,
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    itemTopRow: {
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
        gap: 4,
    },
    shopName: {
        fontSize: 12,
        color: "#94a3b8",
        fontWeight: "700",
    },
    cartItemSmall: {
        padding: 10,
        marginBottom: 10,
    },
    imageContainer: {
        width: 80,
        height: 80,
        borderRadius: 8,
        overflow: "hidden",
        backgroundColor: "#0b0f1a",
    },
    imageContainerSmall: {
        width: 70,
        height: 70,
    },
    productImage: {
        width: "100%",
        height: "100%",
    },
    itemDetails: {
        flex: 1,
        marginLeft: 12,
        justifyContent: "space-between",
    },
    productName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#f1f5f9",
        marginBottom: 4,
    },
    productNameSmall: {
        fontSize: 14,
    },
    productBrand: {
        fontSize: 13,
        color: "#94a3b8",
        marginBottom: 8,
    },
    priceRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    productPrice: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#fb923c",
    },
    productPriceSmall: {
        fontSize: 16,
    },
    quantityControl: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#0b0f1a",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(234, 88, 12, 0.2)",
    },
    qtyBtn: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: "#131927",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(234, 88, 12, 0.3)",
    },
    qtyText: {
        fontSize: 13,
        color: "#f1f5f9",
        marginHorizontal: 10,
        fontWeight: "500",
    },
    deleteButton: {
        padding: 8,
        marginLeft: 8,
    },
    hiddenRow: {
        flex: 1,
        justifyContent: "center",
        alignItems: "flex-end",
        marginBottom: 12,
    },
    hiddenButton: {
        backgroundColor: "#FF6B6B",
        justifyContent: "center",
        alignItems: "center",
        width: 86,
        height: "100%",
        marginRight: 12,
        borderRadius: 12,
    },
    hiddenButtonSmall: {
        width: 78,
    },
    hiddenButtonText: {
        color: "white",
        fontWeight: "600",
        marginTop: 4,
    },
    emptyContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 40,
        backgroundColor: "#0b0f1a",
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#f1f5f9",
        marginTop: 20,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 15,
        color: "#94a3b8",
        textAlign: "center",
        marginBottom: 30,
    },
    shopButton: {
        backgroundColor: "#ea580c",
        paddingHorizontal: 30,
        paddingVertical: 14,
        borderRadius: 25,
    },
    shopButtonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "600",
    },
    bottomContainer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#131927",
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: Platform.OS === "ios" ? 28 : 18,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
    },
    totalSection: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
        paddingTop: 8,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(234, 88, 12, 0.15)",
    },
    summaryGrid: {
        marginBottom: 2,
    },
    summaryRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 4,
    },
    summaryValue: {
        fontSize: 14,
        color: "#f1f5f9",
        fontWeight: "600",
    },
    totalLabel: {
        fontSize: 14,
        color: "#94a3b8",
        fontWeight: "500",
    },
    totalLabelStrong: {
        fontSize: 16,
        color: "#f1f5f9",
        fontWeight: "700",
    },
    totalPrice: {
        fontSize: 26,
        fontWeight: "bold",
        color: "#fb923c",
    },
    totalPriceSmall: {
        fontSize: 22,
    },
    actionButtons: {
        flexDirection: "row",
        gap: 12,
    },
    actionButtonsSmall: {
        flexDirection: "column",
        gap: 10,
    },
    clearButton: {
        flex: 0.35,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255, 107, 107, 0.15)",
        paddingVertical: 14,
        borderRadius: 12,
        gap: 6,
    },
    clearButtonSmall: {
        flex: undefined,
        width: "100%",
    },
    clearButtonText: {
        color: "#FF6B6B",
        fontSize: 14,
        fontWeight: "600",
    },
    checkoutButton: {
        flex: 0.65,
        borderRadius: 12,
        overflow: "hidden",
    },
    checkoutButtonSmall: {
        flex: undefined,
        width: "100%",
    },
    checkoutGradient: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 14,
        gap: 8,
    },
    checkoutButtonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "bold",
    },
    headerTitleSmall: {
        fontSize: 21,
    },
});

export default Cart;
