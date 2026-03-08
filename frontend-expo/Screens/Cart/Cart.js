import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { Text, View, Image, StyleSheet, Dimensions, TouchableOpacity, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SwipeListView } from "react-native-swipe-list-view";
import { removeFromCart, clearCart } from "../../Redux/Actions/cartActions";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

var { height, width } = Dimensions.get("window");
const FALLBACK = "https://cdn.pixabay.com/photo/2012/04/01/17/29/box-23649_960_720.png";

const Cart = () => {
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const cartItems = useSelector((s) => s.cartItems);
    let total = 0;
    cartItems.forEach((c) => (total += c.price));

    const renderItem = ({ item }) => (
        <View style={styles.cartItem}>
            <View style={styles.imageContainer}>
                <Image 
                    style={styles.productImage} 
                    source={{ uri: item.image || FALLBACK }}
                    resizeMode="cover"
                />
            </View>
            <View style={styles.itemDetails}>
                <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.productBrand}>{item.brand || "Unknown Brand"}</Text>
                <View style={styles.priceRow}>
                    <Text style={styles.productPrice}>${item.price.toFixed(2)}</Text>
                    <View style={styles.quantityBadge}>
                        <Ionicons name="cube-outline" size={14} color="#666" />
                        <Text style={styles.quantityText}>Qty: 1</Text>
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
        <TouchableOpacity onPress={() => dispatch(removeFromCart(rowData.item))}>
            <View style={styles.hiddenButton}>
                <Ionicons name="trash" color="white" size={30} />
                <Text style={styles.hiddenButtonText}>Delete</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {cartItems.length > 0 ? (
                <>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Shopping Cart</Text>
                        <Text style={styles.headerSubtitle}>{cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}</Text>
                    </View>
                    <SwipeListView
                        data={cartItems}
                        renderItem={renderItem}
                        renderHiddenItem={renderHiddenItem}
                        disableRightSwipe
                        rightOpenValue={-75}
                        keyExtractor={(item, i) => String(item.id || item._id || i)}
                        contentContainerStyle={styles.listContent}
                    />
                </>
            ) : (
                <View style={styles.emptyContainer}>
                    <Ionicons name="cart-outline" size={100} color="#E0E0E0" />
                    <Text style={styles.emptyTitle}>Your Cart is Empty</Text>
                    <Text style={styles.emptySubtitle}>Add some products to get started</Text>
                    <TouchableOpacity 
                        style={styles.shopButton}
                        onPress={() => navigation.navigate("Home")}
                    >
                        <Text style={styles.shopButtonText}>Start Shopping</Text>
                    </TouchableOpacity>
                </View>
            )}
            {cartItems.length > 0 && (
                <View style={styles.bottomContainer}>
                    <View style={styles.totalSection}>
                        <Text style={styles.totalLabel}>Total Amount</Text>
                        <Text style={styles.totalPrice}>${total.toFixed(2)}</Text>
                    </View>
                    <View style={styles.actionButtons}>
                        <TouchableOpacity 
                            style={styles.clearButton}
                            onPress={() => dispatch(clearCart())}
                        >
                            <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                            <Text style={styles.clearButtonText}>Clear Cart</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.checkoutButton}
                            onPress={() => navigation.navigate("Checkout")}
                        >
                            <LinearGradient
                                colors={['#4CAF50', '#45a049']}
                                style={styles.checkoutGradient}
                            >
                                <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
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
        backgroundColor: "#F5F7FA",
    },
    header: {
        backgroundColor: "white",
        padding: 20,
        paddingTop: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#E8ECEF",
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#2C3E50",
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: "#7F8C8D",
    },
    listContent: {
        padding: 12,
        paddingBottom: 180,
    },
    cartItem: {
        backgroundColor: "white",
        borderRadius: 12,
        marginBottom: 12,
        padding: 12,
        flexDirection: "row",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    imageContainer: {
        width: 80,
        height: 80,
        borderRadius: 8,
        overflow: "hidden",
        backgroundColor: "#F8F9FA",
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
        color: "#2C3E50",
        marginBottom: 4,
    },
    productBrand: {
        fontSize: 13,
        color: "#95A5A6",
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
        color: "#27AE60",
    },
    quantityBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F0F3F5",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    quantityText: {
        fontSize: 12,
        color: "#666",
        marginLeft: 4,
        fontWeight: "500",
    },
    deleteButton: {
        padding: 8,
        marginLeft: 8,
    },
    hiddenButton: {
        backgroundColor: "#FF6B6B",
        justifyContent: "center",
        alignItems: "center",
        width: 75,
        height: "92%",
        marginBottom: 12,
        marginRight: 12,
        borderRadius: 12,
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
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#2C3E50",
        marginTop: 20,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 15,
        color: "#7F8C8D",
        textAlign: "center",
        marginBottom: 30,
    },
    shopButton: {
        backgroundColor: "#3498DB",
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
        backgroundColor: "white",
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 20,
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
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#E8ECEF",
    },
    totalLabel: {
        fontSize: 16,
        color: "#7F8C8D",
        fontWeight: "500",
    },
    totalPrice: {
        fontSize: 26,
        fontWeight: "bold",
        color: "#2C3E50",
    },
    actionButtons: {
        flexDirection: "row",
        gap: 12,
    },
    clearButton: {
        flex: 0.35,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FFE8E8",
        paddingVertical: 14,
        borderRadius: 12,
        gap: 6,
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
});

export default Cart;
