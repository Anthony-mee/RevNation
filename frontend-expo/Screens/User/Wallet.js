import React, { useCallback, useContext, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Toast from "react-native-toast-message";
import { Ionicons } from "@expo/vector-icons";
import AuthGlobal from "../../Context/Store/AuthGlobal";
import baseURL from "../../assets/common/baseurl";

const PAYMENT_TABS = ["Card", "Bank", "Loyalty", "Other"];
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "back"];

const formatCurrency = (amount) => {
    const num = Number(amount || 0);
    return num.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

const Wallet = () => {
    const context = useContext(AuthGlobal);
    const [walletBalance, setWalletBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    const [toppingUp, setToppingUp] = useState(false);
    const [amountInput, setAmountInput] = useState("0");
    const [activeTab, setActiveTab] = useState("Card");
    const [lastTopup, setLastTopup] = useState(0);
    const [successVisible, setSuccessVisible] = useState(false);

    const topupAmount = useMemo(() => {
        const parsed = Number(amountInput || 0);
        if (!Number.isFinite(parsed)) return 0;
        return Math.max(0, parsed);
    }, [amountInput]);

    const canTopUp = topupAmount > 0 && !toppingUp;

    const loadWallet = useCallback(async () => {
        try {
            setLoading(true);
            const jwt = await AsyncStorage.getItem("jwt");
            if (!jwt || !context?.stateUser?.isAuthenticated) {
                setWalletBalance(0);
                return;
            }

            const res = await axios.get(`${baseURL}users/wallet/me`, {
                headers: { Authorization: `Bearer ${jwt}` },
            });

            setWalletBalance(Number(res?.data?.walletBalance || 0));
        } catch (_error) {
            setWalletBalance(0);
        } finally {
            setLoading(false);
        }
    }, [context?.stateUser?.isAuthenticated]);

    useFocusEffect(
        useCallback(() => {
            loadWallet();
        }, [loadWallet])
    );

    const appendDigit = (key) => {
        if (key === "back") {
            setAmountInput((prev) => {
                const next = prev.slice(0, -1);
                return next.length > 0 ? next : "0";
            });
            return;
        }

        setAmountInput((prev) => {
            const base = prev === "0" ? "" : prev;
            const next = `${base}${key}`;
            if (next.length > 8) {
                return prev;
            }
            return next;
        });
    };

    const setPresetAmount = (amount) => {
        setAmountInput(String(amount));
    };

    const topUpWallet = async (amount) => {
        try {
            if (toppingUp) {
                return;
            }

            if (!Number.isFinite(amount) || amount <= 0) {
                Toast.show({ topOffset: 60, type: "error", text1: "Enter a valid amount" });
                return;
            }

            const jwt = await AsyncStorage.getItem("jwt");
            if (!jwt) {
                Toast.show({ topOffset: 60, type: "error", text1: "Please login first" });
                return;
            }

            setToppingUp(true);

            const res = await axios.post(
                `${baseURL}users/wallet/topup`,
                { amount },
                { headers: { Authorization: `Bearer ${jwt}` } }
            );

            const nextBalance = Number(res?.data?.walletBalance || walletBalance);
            setWalletBalance(nextBalance);
            setLastTopup(amount);
            setSuccessVisible(true);
            setAmountInput("0");
        } catch (error) {
            const message = error?.response?.data?.message || "Top-up failed";
            Toast.show({ topOffset: 60, type: "error", text1: "Top-up failed", text2: message });
        } finally {
            setToppingUp(false);
        }
    };

    return (
        <View style={styles.screen}>
            <View pointerEvents="none" style={styles.bgGlowTop} />
            <View pointerEvents="none" style={styles.bgGlowBottom} />
            {successVisible ? (
                <View style={styles.successContainer}>
                    <View style={styles.successIconWrap}>
                        <View style={styles.successIconInner}>
                            <Ionicons name="checkmark" size={34} color="#ffffff" />
                        </View>
                    </View>
                    <Text style={styles.successTitle}>Top up success!</Text>
                    <Text style={styles.successSub}>P{formatCurrency(lastTopup)} was added to your wallet.</Text>
                    <Text style={styles.successBalance}>New Balance: P{formatCurrency(walletBalance)}</Text>
                    <TouchableOpacity
                        style={styles.successBtn}
                        onPress={() => setSuccessVisible(false)}
                        activeOpacity={0.9}
                    >
                        <Text style={styles.successBtnText}>Back to Wallet</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <View style={styles.topBar}>
                        <Text style={styles.topBarTitle}>Top Up</Text>
                        <View style={styles.currencyPill}>
                            <Text style={styles.currencyText}>PHP</Text>
                            <Ionicons name="chevron-down" size={14} color="#fb923c" />
                        </View>
                    </View>

                    <View style={styles.amountBlock}>
                        <Text style={styles.balanceLabel}>Current balance</Text>
                        {loading ? (
                            <ActivityIndicator color="#fb923c" size="small" style={{ marginTop: 8 }} />
                        ) : (
                            <Text style={styles.balanceValue}>P{formatCurrency(walletBalance)}</Text>
                        )}
                        <Text style={styles.amountMain}>P {formatCurrency(topupAmount)}</Text>
                        <Text style={styles.pointsHint}>You will earn +{Math.floor(topupAmount * 0.15)} points</Text>
                    </View>

                    <View style={styles.presetRow}>
                        <TouchableOpacity style={styles.presetBtn} onPress={() => setPresetAmount(500)}>
                            <Text style={styles.presetText}>500</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.presetBtn} onPress={() => setPresetAmount(1000)}>
                            <Text style={styles.presetText}>1000</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.presetBtn} onPress={() => setPresetAmount(10000)}>
                            <Text style={styles.presetText}>10K</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.presetBtn} onPress={() => setPresetAmount(15000)}>
                            <Text style={styles.presetText}>15K</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.keypadWrap}>
                        {KEYS.map((key) => (
                            <TouchableOpacity
                                key={key}
                                style={styles.keyBtn}
                                onPress={() => appendDigit(key)}
                                activeOpacity={0.82}
                            >
                                {key === "back" ? (
                                    <Ionicons name="backspace-outline" size={22} color="#fb923c" />
                                ) : (
                                    <Text style={styles.keyText}>{key}</Text>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={styles.paymentCard}>
                        <Text style={styles.sectionTitle}>Payment Method</Text>
                        <View style={styles.tabRow}>
                            {PAYMENT_TABS.map((tab) => {
                                const active = tab === activeTab;
                                return (
                                    <TouchableOpacity
                                        key={tab}
                                        onPress={() => setActiveTab(tab)}
                                        style={[styles.tabBtn, active && styles.tabBtnActive]}
                                        activeOpacity={0.85}
                                    >
                                        <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <View style={styles.mockCard}>
                            <Text style={styles.mockCardBrand}>REVNATION PAY</Text>
                            <Text style={styles.mockCardNumber}>**** **** **** 2314</Text>
                            <View style={styles.mockCardFooter}>
                                <Text style={styles.mockCardName}>Rider Wallet</Text>
                                <Text style={styles.mockCardExpiry}>04/31</Text>
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.topUpButton, !canTopUp && styles.topUpButtonDisabled]}
                        onPress={() => topUpWallet(topupAmount)}
                        disabled={!canTopUp}
                        activeOpacity={0.9}
                    >
                        {toppingUp ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.topUpButtonText}>Top Up</Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: "#070d1a",
    },
    bgGlowTop: {
        position: "absolute",
        top: -120,
        right: -80,
        width: 260,
        height: 260,
        borderRadius: 130,
        backgroundColor: "rgba(234, 88, 12, 0.16)",
        zIndex: 0,
    },
    bgGlowBottom: {
        position: "absolute",
        bottom: -130,
        left: -100,
        width: 280,
        height: 280,
        borderRadius: 140,
        backgroundColor: "rgba(56, 189, 248, 0.08)",
        zIndex: 0,
    },
    content: {
        padding: 18,
        paddingBottom: 32,
        zIndex: 1,
    },
    topBar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 20,
    },
    topBarTitle: {
        color: "#f8fafc",
        fontSize: 20,
        fontWeight: "800",
    },
    currencyPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "#101a30",
        borderWidth: 1,
        borderColor: "rgba(234, 88, 12, 0.55)",
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    currencyText: {
        color: "#fb923c",
        fontSize: 11,
        fontWeight: "800",
    },
    amountBlock: {
        alignItems: "center",
        marginBottom: 18,
        backgroundColor: "#101a30",
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "rgba(59, 130, 246, 0.26)",
        paddingVertical: 20,
    },
    balanceLabel: {
        color: "#94a3b8",
        fontSize: 12,
        letterSpacing: 0.5,
    },
    balanceValue: {
        color: "#fb923c",
        fontSize: 26,
        fontWeight: "900",
        marginTop: 5,
    },
    amountMain: {
        color: "#ffffff",
        fontSize: 44,
        fontWeight: "900",
        marginTop: 14,
    },
    pointsHint: {
        color: "#9fb0c7",
        fontSize: 13,
        marginTop: 4,
    },
    presetRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 14,
    },
    presetBtn: {
        minWidth: 64,
        alignItems: "center",
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "rgba(56, 189, 248, 0.26)",
        backgroundColor: "#0f1a2d",
    },
    presetText: {
        color: "#f8fafc",
        fontSize: 12,
        fontWeight: "700",
    },
    keypadWrap: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginBottom: 16,
        backgroundColor: "#0d1628",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "rgba(56, 189, 248, 0.16)",
        paddingVertical: 2,
    },
    keyBtn: {
        width: "33.33%",
        paddingVertical: 18,
        alignItems: "center",
        justifyContent: "center",
    },
    keyText: {
        color: "#e2e8f0",
        fontSize: 34,
        fontWeight: "300",
    },
    paymentCard: {
        backgroundColor: "#101a30",
        borderWidth: 1,
        borderColor: "rgba(234, 88, 12, 0.28)",
        borderRadius: 16,
        padding: 14,
        marginBottom: 16,
    },
    sectionTitle: {
        color: "#f8fafc",
        fontSize: 16,
        fontWeight: "700",
        marginBottom: 10,
    },
    tabRow: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 10,
        flexWrap: "wrap",
    },
    tabBtn: {
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.28)",
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: "#0b1426",
    },
    tabBtnActive: {
        backgroundColor: "rgba(234, 88, 12, 0.2)",
        borderColor: "rgba(234, 88, 12, 0.5)",
    },
    tabText: {
        color: "#b8c5d8",
        fontSize: 11,
        fontWeight: "600",
    },
    tabTextActive: {
        color: "#ffffff",
    },
    mockCard: {
        borderRadius: 16,
        padding: 14,
        minHeight: 145,
        justifyContent: "space-between",
        backgroundColor: "#0b1324",
        borderWidth: 1,
        borderColor: "rgba(251, 146, 60, 0.38)",
    },
    mockCardBrand: {
        color: "#fb923c",
        fontSize: 12,
        fontWeight: "800",
        letterSpacing: 0.6,
    },
    mockCardNumber: {
        color: "#ffffff",
        fontSize: 21,
        fontWeight: "800",
        letterSpacing: 1,
    },
    mockCardFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    mockCardName: {
        color: "#e2e8f0",
        fontSize: 12,
        fontWeight: "600",
    },
    mockCardExpiry: {
        color: "#e2e8f0",
        fontSize: 12,
        fontWeight: "700",
    },
    topUpButton: {
        backgroundColor: "#f97316",
        borderRadius: 999,
        paddingVertical: 14,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#f97316",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 5,
    },
    topUpButtonDisabled: {
        backgroundColor: "#4b5563",
    },
    topUpButtonText: {
        color: "#fff",
        fontSize: 17,
        fontWeight: "800",
    },
    successContainer: {
        flex: 1,
        paddingHorizontal: 24,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1,
    },
    successIconWrap: {
        marginBottom: 24,
    },
    successIconInner: {
        width: 88,
        height: 88,
        borderRadius: 44,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f97316",
    },
    successTitle: {
        color: "#ffffff",
        fontSize: 34,
        fontWeight: "900",
        marginBottom: 8,
    },
    successSub: {
        color: "#94a3b8",
        fontSize: 15,
        textAlign: "center",
        marginBottom: 8,
    },
    successBalance: {
        color: "#fb923c",
        fontSize: 18,
        fontWeight: "800",
        marginBottom: 24,
    },
    successBtn: {
        backgroundColor: "#f97316",
        borderRadius: 999,
        paddingHorizontal: 28,
        paddingVertical: 13,
    },
    successBtnText: {
        color: "#fff",
        fontSize: 15,
        fontWeight: "800",
    },
});

export default Wallet;
