import React, { useContext, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, TextInput, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import baseURL from "../../assets/common/baseurl";
import AuthGlobal from "../../Context/Store/AuthGlobal";

const PAYMENT_METHODS = [
    { key: "wallet", title: "RevNation Wallet", subtitle: "Use available wallet credits first", icon: "wallet-outline" },
    { key: "cod", title: "Cash on Delivery", subtitle: "Pay when your order arrives", icon: "cash-outline" },
    { key: "card", title: "Credit / Debit Card", subtitle: "Visa, Mastercard, or local cards", icon: "card-outline" },
    { key: "bank", title: "Bank Transfer", subtitle: "Manual transfer with reference", icon: "business-outline" },
];

const Payment = ({ route }) => {
    const order = route.params?.order;
    const navigation = useNavigation();
    const [selected, setSelected] = useState("wallet");
    const [walletBalance, setWalletBalance] = useState(0);
    const [walletLoading, setWalletLoading] = useState(true);
    const [userProfile, setUserProfile] = useState(null);
    const [profileLoading, setProfileLoading] = useState(true);
    const [couponCode, setCouponCode] = useState("");
    const [couponDiscount, setCouponDiscount] = useState(0);
    const [couponLoading, setCouponLoading] = useState(false);
    const [couponError, setCouponError] = useState("");
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const context = useContext(AuthGlobal);

    const subtotal = useMemo(
        () => (order?.orderItems || []).reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0),
        [order]
    );
    const shipping = subtotal > 0 ? 159 : 0;
    const total = subtotal + shipping - couponDiscount;
    const walletInsufficient = selected === "wallet" && walletBalance < total;

    useEffect(() => {
        let isMounted = true;

        const loadUserProfile = async () => {
            setProfileLoading(true);
            try {
                const jwt = await AsyncStorage.getItem("jwt");
                if (!jwt || !context?.stateUser?.user?.userId) {
                    if (isMounted) setUserProfile(null);
                    return;
                }

                const res = await axios.get(`${baseURL}users/${context.stateUser.user.userId}`, {
                    headers: { Authorization: `Bearer ${jwt}` },
                });

                if (isMounted) {
                    setUserProfile(res.data);
                }
            } catch (error) {
                if (isMounted) setUserProfile(null);
            } finally {
                if (isMounted) setProfileLoading(false);
            }
        };

        const loadWallet = async () => {
            setWalletLoading(true);
            try {
                const jwt = await AsyncStorage.getItem("jwt");
                if (!jwt || !context?.stateUser?.user?.userId) {
                    if (isMounted) setWalletBalance(0);
                    return;
                }

                const res = await axios.get(`${baseURL}users/wallet/me`, {
                    headers: { Authorization: `Bearer ${jwt}` },
                });

                if (isMounted) {
                    setWalletBalance(Number(res?.data?.walletBalance || 0));
                }
            } catch (_error) {
                if (isMounted) {
                    setWalletBalance(0);
                }
            } finally {
                if (isMounted) {
                    setWalletLoading(false);
                }
            }
        };

        loadUserProfile();
        loadWallet();

        return () => {
            isMounted = false;
        };
    }, [context?.stateUser?.user?.userId]);

    const selectedMethod = PAYMENT_METHODS.find((m) => m.key === selected);

    const validateCoupon = async () => {
        if (!couponCode.trim()) {
            setCouponError("Please enter a coupon code");
            return;
        }

        setCouponLoading(true);
        setCouponError("");

        try {
            const jwt = await AsyncStorage.getItem("jwt");
            const productIds = order?.orderItems?.map(item => item.product || item.id) || [];

            const response = await axios.post(`${baseURL}coupons/validate`, {
                code: couponCode.trim().toUpperCase(),
                orderAmount: subtotal,
                productIds
            }, {
                headers: { Authorization: `Bearer ${jwt}` }
            });

            if (response.data.valid) {
                setCouponDiscount(response.data.coupon.discount);
                setAppliedCoupon(response.data.coupon);
                setCouponError("");
            }
        } catch (error) {
            const errorMsg = error.response?.data?.message || "Invalid coupon code";
            setCouponError(errorMsg);
            setCouponDiscount(0);
            setAppliedCoupon(null);
        } finally {
            setCouponLoading(false);
        }
    };

    const applyCoupon = async () => {
        if (!couponCode.trim()) {
            setCouponError("Please enter a coupon code");
            return;
        }

        setCouponLoading(true);
        setCouponError("");

        try {
            const jwt = await AsyncStorage.getItem("jwt");
            const productIds = order?.orderItems?.map(item => item.product || item.id) || [];

            const response = await axios.post(`${baseURL}coupons/apply`, {
                code: couponCode.trim().toUpperCase(),
                orderAmount: subtotal,
                productIds
            }, {
                headers: { Authorization: `Bearer ${jwt}` }
            });

            if (response.data.applied) {
                setCouponDiscount(response.data.discount);
                setAppliedCoupon(response.data.coupon);
                setCouponError("");
                setCouponCode("");
            }
        } catch (error) {
            const errorMsg = error.response?.data?.message || "Failed to apply coupon";
            setCouponError(errorMsg);
            setCouponDiscount(0);
            setAppliedCoupon(null);
        } finally {
            setCouponLoading(false);
        }
    };

    const removeCoupon = () => {
        setCouponCode("");
        setCouponDiscount(0);
        setAppliedCoupon(null);
        setCouponError("");
    };

    const handleReviewOrder = () => {
        // Check if user is banned
        if (userProfile && userProfile.isBanned) {
            alert("Account Banned", "Your account is banned. You cannot place orders.");
            return;
        }

        navigation.navigate("Confirm", {
            order: {
                ...order,
                couponDiscount,
                appliedCoupon
            },
            paymentMethod: selectedMethod?.title || "Payment",
            paymentMethodKey: selectedMethod?.key || "cod",
        });
    };

    return (
        <View style={styles.screen}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Banned User Warning */}
                {userProfile && userProfile.isBanned && (
                    <View style={styles.bannedWarning}>
                        <Ionicons name="warning" size={20} color="#ef4444" />
                        <View style={styles.bannedWarningText}>
                            <Text style={styles.bannedWarningTitle}>Account Banned</Text>
                            <Text style={styles.bannedWarningSub}>You cannot complete payment while your account is banned.</Text>
                        </View>
                    </View>
                )}
                
                <View style={styles.heroCard}>
                    <View style={styles.heroRow}>
                        <Ionicons name="card-outline" size={20} color="#c2410c" />
                        <Text style={styles.heroTitle}>Payment Method</Text>
                    </View>
                    <Text style={styles.heroSub}>Choose how you want to complete this order.</Text>
                </View>

                <View style={styles.sectionCard}>
                    <View style={styles.couponHeader}>
                        <Text style={styles.sectionTitle}>Coupon Code</Text>
                        <TouchableOpacity 
                            style={styles.viewCouponsButton}
                            onPress={() => navigation.navigate("User Coupons")}
                        >
                            <Text style={styles.viewCouponsText}>View Coupons</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.couponContainer}>
                        <TextInput
                            style={[styles.couponInput, couponError && styles.couponInputError]}
                            placeholder="Enter coupon code"
                            value={couponCode}
                            onChangeText={setCouponCode}
                            editable={!appliedCoupon}
                            placeholderTextColor="#64748b"
                        />
                        {!appliedCoupon ? (
                            <TouchableOpacity 
                                style={[styles.couponButton, couponLoading && styles.couponButtonDisabled]}
                                onPress={applyCoupon}
                                disabled={couponLoading}
                            >
                                {couponLoading ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.couponButtonText}>Apply</Text>
                                )}
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity 
                                style={styles.removeCouponButton}
                                onPress={removeCoupon}
                            >
                                <Text style={styles.removeCouponButtonText}>Remove</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    {couponError ? (
                        <Text style={styles.couponError}>{couponError}</Text>
                    ) : appliedCoupon ? (
                        <View style={styles.appliedCouponContainer}>
                            <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                            <Text style={styles.appliedCouponText}>
                                {appliedCoupon.title} - P{couponDiscount.toFixed(2)} off
                            </Text>
                        </View>
                    ) : null}
                </View>

                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Order Summary</Text>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Product subtotal</Text>
                        <Text style={styles.infoValue}>P{subtotal.toFixed(2)}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Shipping fee</Text>
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
                    <Text style={styles.sectionTitle}>RevNation Wallet</Text>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Available balance</Text>
                        <Text style={styles.infoValue}>{walletLoading ? "Loading..." : `P${walletBalance.toFixed(2)}`}</Text>
                    </View>
                    <View style={styles.infoRowLast}>
                        <Text style={styles.infoLabel}>Needed for this order</Text>
                        <Text style={[styles.infoValue, walletInsufficient && styles.walletWarning]}>{`P${subtotal.toFixed(2)}`}</Text>
                    </View>
                    {walletInsufficient ? (
                        <Text style={styles.walletWarningText}>Not enough wallet balance. Choose another method or top up your wallet.</Text>
                    ) : null}
                </View>

                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Available Options</Text>
                    {PAYMENT_METHODS.map((method) => {
                        const isSelected = selected === method.key;

                        return (
                            <TouchableOpacity
                                key={method.key}
                                style={[styles.methodCard, isSelected && styles.methodCardSelected]}
                                onPress={() => setSelected(method.key)}
                                activeOpacity={0.85}
                            >
                                <View style={styles.methodLeft}>
                                    <View style={[styles.methodIcon, isSelected && styles.methodIconSelected]}>
                                        <Ionicons name={method.icon} size={17} color={isSelected ? "#fb923c" : "#94a3b8"} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.methodTitle}>{method.title}</Text>
                                        <Text style={styles.methodSub}>{method.subtitle}</Text>
                                    </View>
                                </View>
                                <Ionicons
                                    name={isSelected ? "radio-button-on" : "radio-button-off"}
                                    size={22}
                                    color={isSelected ? "#fb923c" : "#64748b"}
                                />
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>

            <View style={styles.bottomBar}>
                <View>
                    <Text style={styles.bottomLabel}>Selected</Text>
                    <Text style={styles.bottomMethod}>{selectedMethod?.title || "Payment"}</Text>
                </View>
                <TouchableOpacity
                    style={[styles.continueBtn, (walletInsufficient || (userProfile && userProfile.isBanned)) && styles.continueBtnDisabled]}
                    disabled={walletInsufficient || (userProfile && userProfile.isBanned)}
                    onPress={handleReviewOrder}
                    activeOpacity={0.9}
                >
                    <Text style={styles.continueText}>Review Order</Text>
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
        paddingBottom: 98,
    },
    heroCard: {
        backgroundColor: "#131927",
        borderRadius: 18,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "rgba(234, 88, 12, 0.18)",
    },
    heroRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 6,
    },
    heroTitle: {
        color: "#f8fafc",
        fontSize: 20,
        fontWeight: "800",
    },
    heroSub: {
        color: "#94a3b8",
        lineHeight: 19,
    },
    sectionCard: {
        backgroundColor: "#131927",
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: "rgba(234, 88, 12, 0.18)",
        marginBottom: 12,
    },
    sectionTitle: {
        color: "#f8fafc",
        fontSize: 16,
        fontWeight: "700",
        marginBottom: 10,
    },
    couponHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
    },
    viewCouponsButton: {
        backgroundColor: "rgba(234, 88, 12, 0.2)",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "rgba(234, 88, 12, 0.3)",
    },
    viewCouponsText: {
        color: "#ea580c",
        fontSize: 12,
        fontWeight: "600",
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
    couponContainer: {
        flexDirection: "row",
        gap: 10,
        alignItems: "center",
    },
    couponInput: {
        flex: 1,
        backgroundColor: "#1e293b",
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.2)",
        borderRadius: 8,
        padding: 12,
        color: "#f8fafc",
        fontSize: 14,
    },
    couponInputError: {
        borderColor: "#ef4444",
    },
    couponButton: {
        backgroundColor: "#ea580c",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    couponButtonDisabled: {
        backgroundColor: "#475569",
    },
    couponButtonText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "600",
    },
    removeCouponButton: {
        backgroundColor: "#ef4444",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    removeCouponButtonText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "600",
    },
    couponError: {
        color: "#ef4444",
        fontSize: 12,
        marginTop: 6,
    },
    appliedCouponContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginTop: 8,
        padding: 8,
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "rgba(16, 185, 129, 0.3)",
    },
    appliedCouponText: {
        color: "#10b981",
        fontSize: 13,
        fontWeight: "600",
    },
    discountValue: {
        color: "#10b981",
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
    infoRowLast: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: 8,
    },
    walletWarning: {
        color: "#f87171",
    },
    walletWarningText: {
        marginTop: 8,
        color: "#fda4af",
        fontSize: 12,
        lineHeight: 18,
    },
    totalRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: 10,
    },
    totalLabel: {
        color: "#f8fafc",
        fontSize: 18,
        fontWeight: "800",
    },
    totalValue: {
        color: "#fb923c",
        fontSize: 24,
        fontWeight: "900",
    },
    methodCard: {
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.22)",
        backgroundColor: "#0f172a",
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    methodCardSelected: {
        borderColor: "rgba(251, 146, 60, 0.42)",
        backgroundColor: "rgba(234, 88, 12, 0.14)",
    },
    methodLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        flex: 1,
    },
    methodIcon: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: "#111827",
        alignItems: "center",
        justifyContent: "center",
    },
    methodIconSelected: {
        backgroundColor: "rgba(234, 88, 12, 0.16)",
    },
    methodTitle: {
        color: "#f8fafc",
        fontSize: 14,
        fontWeight: "700",
    },
    methodSub: {
        color: "#94a3b8",
        fontSize: 12,
        marginTop: 2,
    },
    bottomBar: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: "#0b1220",
        borderTopWidth: 1,
        borderTopColor: "rgba(148, 163, 184, 0.18)",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
    },
    bottomLabel: {
        color: "#94a3b8",
        fontSize: 11,
        textTransform: "uppercase",
        fontWeight: "700",
    },
    bottomMethod: {
        color: "#f8fafc",
        fontSize: 14,
        fontWeight: "700",
    },
    continueBtn: {
        backgroundColor: "#ea580c",
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    continueBtnDisabled: {
        backgroundColor: "#334155",
    },
    continueText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "800",
    },
});

export default Payment;
