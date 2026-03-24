import React, { useMemo } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useDispatch } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Toast from "react-native-toast-message";
import baseURL from "../../assets/common/baseurl";
import { clearCart } from "../../Redux/Actions/cartActions";
import { resolveImageUrl } from "../../assets/common/imageUrl";

const Confirm = ({ route }) => {
    const order = route.params?.order;
    const paymentMethod = route.params?.paymentMethod || "Payment";
    const paymentMethodKey = route.params?.paymentMethodKey || "cod";
    const dispatch = useDispatch();
    const navigation = useNavigation();

    const [placingOrder, setPlacingOrder] = React.useState(false);
    const [userProfile, setUserProfile] = React.useState(null);
    const [loadingProfile, setLoadingProfile] = React.useState(true);

    const { subtotal, shipping, total, itemCount, couponDiscount } = useMemo(() => {
        const safeItems = order?.orderItems || [];
        const computedSubtotal = safeItems.reduce(
            (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
            0
        );
        const computedCount = safeItems.reduce((sum, item) => sum + Number(item.quantity || 1), 0);
        const computedShipping = computedSubtotal > 0 ? 159 : 0;
        const computedCouponDiscount = order?.couponDiscount || 0;

        return {
            subtotal: computedSubtotal,
            shipping: computedShipping,
            total: computedSubtotal + computedShipping - computedCouponDiscount,
            itemCount: computedCount,
            couponDiscount: computedCouponDiscount,
        };
    }, [order]);

    // Load user profile to check ban status
    React.useEffect(() => {
        let isMounted = true;

        const loadUserProfile = async () => {
            setLoadingProfile(true);
            try {
                const jwt = await AsyncStorage.getItem("jwt");
                if (!jwt || !order?.user) {
                    if (isMounted) setUserProfile(null);
                    return;
                }

                const res = await axios.get(`${baseURL}users/${order.user}`, {
                    headers: { Authorization: `Bearer ${jwt}` },
                });

                if (isMounted) {
                    setUserProfile(res.data);
                }
            } catch (error) {
                if (isMounted) setUserProfile(null);
            } finally {
                if (isMounted) setLoadingProfile(false);
            }
        };

        loadUserProfile();

        return () => {
            isMounted = false;
        };
    }, [order?.user]);

    const confirmOrder = async () => {
        try {
            if (placingOrder) {
                return;
            }

            // Check if user is banned
            if (userProfile && userProfile.isBanned) {
                Toast.show({
                    topOffset: 60,
                    type: "error",
                    text1: "Account Banned",
                    text2: "Your account is banned. You cannot place orders.",
                });
                return;
            }

            if (!order?.orderItems?.length) {
                Toast.show({
                    topOffset: 60,
                    type: "error",
                    text1: "Your cart is empty",
                    text2: "Add products before placing an order",
                });
                navigation.navigate("Cart Screen", { screen: "Cart" });
                return;
            }

            const jwt = await AsyncStorage.getItem("jwt");
            if (!jwt) {
                Toast.show({
                    topOffset: 60,
                    type: "error",
                    text1: "Please login first",
                    text2: "Your session has expired",
                });
                navigation.navigate("User", { screen: "Login" });
                return;
            }

            setPlacingOrder(true);
            const response = await axios.post(`${baseURL}orders`, {
                ...order,
                paymentMethod: paymentMethodKey,
            }, {
                headers: { Authorization: `Bearer ${jwt}` },
            });

            const receiptEmail = response?.data?.receiptEmail;
            const receiptMessage = receiptEmail
                ? (receiptEmail.sent
                    ? receiptEmail.message
                    : `Receipt not delivered: ${receiptEmail.message}`)
                : "Receipt status unavailable. Restart backend to use the latest receipt email code.";

            Toast.show({
                topOffset: 60,
                type: "success",
                text1: "Order completed",
                text2: receiptMessage,
            });

            await dispatch(clearCart());
            navigation.navigate("Cart Screen", { screen: "Cart" });
        } catch (error) {
            const message = error?.response?.data?.message || "Please try again";
            const errorCode = error?.response?.data?.code || "";
            const needsProfile = /delivery details|complete your profile/i.test(message);

            if (errorCode === "INSUFFICIENT_WALLET_BALANCE") {
                Toast.show({
                    topOffset: 60,
                    type: "error",
                    text1: "Insufficient wallet balance",
                    text2: "Use another payment method or add mock wallet funds",
                });
                navigation.navigate("Payment", { order });
                return;
            }

            Toast.show({
                topOffset: 60,
                type: "error",
                text1: needsProfile ? "Complete your profile first" : "Order failed",
                text2: message,
            });

            if (needsProfile) {
                navigation.navigate("User", { screen: "User Profile" });
            }
        } finally {
            setPlacingOrder(false);
        }
    };

    if (!order) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No order data found.</Text>
            </View>
        );
    }

    return (
        <View style={styles.screen}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Banned User Warning */}
                {userProfile && userProfile.isBanned && (
                    <View style={styles.bannedWarning}>
                        <Ionicons name="warning" size={20} color="#ef4444" />
                        <View style={styles.bannedWarningText}>
                            <Text style={styles.bannedWarningTitle}>Account Banned</Text>
                            <Text style={styles.bannedWarningSub}>You cannot place orders while your account is banned.</Text>
                        </View>
                    </View>
                )}
                <View style={styles.bannerCard}>
                    <Ionicons name="flame-outline" size={16} color="#fb923c" />
                    <Text style={styles.bannerText}>Ready to place your order</Text>
                </View>

                <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="location-outline" size={18} color="#c2410c" />
                        <Text style={styles.sectionTitle}>Delivery Address</Text>
                    </View>
                    <Text style={styles.addressName}>Receiver</Text>
                    <Text style={styles.addressText}>{order.shippingAddress1}</Text>
                    {order.shippingAddress2 ? <Text style={styles.addressText}>{order.shippingAddress2}</Text> : null}
                    <Text style={styles.addressText}>{order.city}, {order.zip}</Text>
                    <Text style={styles.addressText}>{order.country}</Text>
                    <View style={styles.noticeBox}>
                        <Text style={styles.noticeText}>Verify your address before placing the order.</Text>
                    </View>
                </View>

                <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="cube-outline" size={18} color="#c2410c" />
                        <Text style={styles.sectionTitle}>Items ({itemCount})</Text>
                    </View>
                    {order.orderItems?.map((item, index) => (
                        <View
                            key={item.id || item._id || `${item.name}-${index}`}
                            style={[styles.itemRow, index === order.orderItems.length - 1 && styles.itemRowLast]}
                        >
                            <Image source={{ uri: resolveImageUrl(item.image) }} style={styles.itemImage} resizeMode="cover" />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.itemName} numberOfLines={2}>{item.name || "Product"}</Text>
                                <Text style={styles.itemMeta}>{item.brand || "Brand"}</Text>
                                <Text style={styles.itemQty}>Qty: {Number(item.quantity || 1)}</Text>
                            </View>
                            <Text style={styles.itemPrice}>P{(Number(item.price || 0) * Number(item.quantity || 1)).toFixed(2)}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="receipt-outline" size={18} color="#c2410c" />
                        <Text style={styles.sectionTitle}>Order Summary</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Product subtotal</Text>
                        <Text style={styles.infoValue}>P{subtotal.toFixed(2)}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Shipping subtotal</Text>
                        <Text style={styles.infoValue}>P{shipping.toFixed(2)}</Text>
                    </View>
                    {couponDiscount > 0 && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Coupon discount</Text>
                            <Text style={[styles.infoValue, styles.discountValue]}>-P{couponDiscount.toFixed(2)}</Text>
                        </View>
                    )}
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Total</Text>
                        <Text style={styles.totalValue}>P{total.toFixed(2)}</Text>
                    </View>
                </View>

                <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="card-outline" size={18} color="#c2410c" />
                        <Text style={styles.sectionTitle}>Payment Method</Text>
                    </View>
                    <Text style={styles.paymentMethodText}>{paymentMethod}</Text>
                </View>
            </ScrollView>

            <View style={styles.bottomBar}>
                <View>
                    <Text style={styles.bottomTotalLabel}>Total ({itemCount} {itemCount === 1 ? "item" : "items"})</Text>
                    <Text style={styles.bottomTotalValue}>P{total.toFixed(2)}</Text>
                </View>
                <TouchableOpacity
                    style={[styles.placeOrderBtn, (placingOrder || (userProfile && userProfile.isBanned)) && styles.placeOrderBtnDisabled]}
                    onPress={confirmOrder}
                    disabled={placingOrder || (userProfile && userProfile.isBanned)}
                    activeOpacity={0.9}
                >
                    {placingOrder ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.placeOrderText}>Place Order</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: "#0b0f1a",
    },
    content: {
        padding: 14,
        paddingBottom: 96,
    },
    bannedWarning: {
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        borderWidth: 1,
        borderColor: "rgba(239, 68, 68, 0.3)",
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    bannedWarningText: {
        flex: 1,
    },
    bannedWarningTitle: {
        color: "#ef4444",
        fontSize: 16,
        fontWeight: "700",
        marginBottom: 2,
    },
    bannedWarningSub: {
        color: "#f87171",
        fontSize: 14,
        lineHeight: 20,
    },
    bannerCard: {
        backgroundColor: "#131927",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "rgba(234, 88, 12, 0.18)",
        paddingVertical: 12,
        paddingHorizontal: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 12,
    },
    bannerText: {
        color: "#f8fafc",
        fontSize: 16,
        fontWeight: "700",
    },
    sectionCard: {
        backgroundColor: "#131927",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "rgba(234, 88, 12, 0.18)",
        padding: 14,
        marginBottom: 12,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 10,
    },
    sectionTitle: {
        color: "#f8fafc",
        fontSize: 17,
        fontWeight: "800",
    },
    addressName: {
        color: "#f8fafc",
        fontSize: 14,
        fontWeight: "700",
        marginBottom: 6,
    },
    addressText: {
        color: "#94a3b8",
        fontSize: 14,
        marginBottom: 2,
    },
    noticeBox: {
        marginTop: 10,
        backgroundColor: "#0f172a",
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.18)",
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    noticeText: {
        color: "#94a3b8",
        fontSize: 13,
        fontWeight: "600",
    },
    itemRow: {
        flexDirection: "row",
        gap: 10,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(148, 163, 184, 0.15)",
    },
    itemRowLast: {
        borderBottomWidth: 0,
        paddingBottom: 0,
    },
    itemImage: {
        width: 64,
        height: 64,
        borderRadius: 10,
        backgroundColor: "#0f172a",
    },
    itemName: {
        color: "#f8fafc",
        fontSize: 14,
        fontWeight: "700",
    },
    itemMeta: {
        color: "#94a3b8",
        fontSize: 12,
        marginTop: 2,
    },
    itemQty: {
        color: "#94a3b8",
        fontSize: 12,
        marginTop: 4,
        fontWeight: "600",
    },
    itemPrice: {
        color: "#f8fafc",
        fontSize: 14,
        fontWeight: "800",
    },
    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(148, 163, 184, 0.15)",
    },
    infoLabel: {
        color: "#94a3b8",
        fontSize: 13,
    },
    infoValue: {
        color: "#f8fafc",
        fontSize: 14,
        fontWeight: "600",
    },
    totalRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: 10,
    },
    totalLabel: {
        color: "#f8fafc",
        fontSize: 21,
        fontWeight: "900",
    },
    totalValue: {
        color: "#fb923c",
        fontSize: 33,
        fontWeight: "900",
    },
    discountValue: {
        color: "#10b981",
    },
    paymentMethodText: {
        color: "#f8fafc",
        fontSize: 15,
        fontWeight: "700",
    },
    bottomBar: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "#0b1220",
        borderTopWidth: 1,
        borderTopColor: "rgba(148, 163, 184, 0.18)",
        paddingHorizontal: 14,
        paddingVertical: 10,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
    },
    bottomTotalLabel: {
        color: "#94a3b8",
        fontSize: 12,
        fontWeight: "700",
    },
    bottomTotalValue: {
        color: "#fb923c",
        fontSize: 26,
        fontWeight: "900",
    },
    placeOrderBtn: {
        backgroundColor: "#ea580c",
        borderRadius: 999,
        paddingHorizontal: 20,
        paddingVertical: 13,
        minWidth: 140,
        alignItems: "center",
    },
    placeOrderBtnDisabled: {
        backgroundColor: "#334155",
    },
    placeOrderText: {
        color: "#fff",
        fontSize: 17,
        fontWeight: "800",
    },
    emptyContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0b0f1a",
    },
    emptyText: {
        color: "#94a3b8",
        fontSize: 16,
        fontWeight: "600",
    },
});

export default Confirm;
