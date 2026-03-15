import React, { useContext, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import AuthGlobal from "../../Context/Store/AuthGlobal";
import Toast from "react-native-toast-message";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import baseURL from "../../assets/common/baseurl";
import { persistCurrentCart } from "../../Redux/Actions/cartActions";

const Checkout = () => {
    const [user, setUser] = useState("");
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [profileReady, setProfileReady] = useState(false);
    const [orderItems, setOrderItems] = useState([]);
    const [address, setAddress] = useState("");
    const [address2, setAddress2] = useState("");
    const [city, setCity] = useState("");
    const [zip, setZip] = useState("");
    const [country, setCountry] = useState("Philippines");
    const [phone, setPhone] = useState("");

    const navigation = useNavigation();
    const dispatch = useDispatch();
    const cartItems = useSelector((s) => s.cartItems);
    const context = useContext(AuthGlobal);

    const itemCount = orderItems.reduce((sum, item) => sum + Number(item.quantity || 1), 0);

    const isProfileComplete = (profile) => {
        return !!(
            String(profile?.phone || "").trim()
            && String(profile?.deliveryAddress1 || "").trim()
            && String(profile?.deliveryCity || "").trim()
            && String(profile?.deliveryZip || "").trim()
            && String(profile?.deliveryCountry || "").trim()
        );
    };

    useEffect(() => {
        setOrderItems(cartItems);
        setLoadingProfile(true);

        if (context.stateUser.isAuthenticated) {
            setUser(context.stateUser.user.userId);
            AsyncStorage.getItem("jwt")
                .then((jwt) => {
                    if (!jwt) return;
                    return axios.get(`${baseURL}users/${context.stateUser.user.userId}`, {
                        headers: { Authorization: `Bearer ${jwt}` },
                    });
                })
                .then((response) => {
                    const profile = response?.data;
                    if (!profile) {
                        setProfileReady(false);
                        return;
                    }

                    if (profile.phone) setPhone(profile.phone);
                    if (profile.deliveryAddress1) setAddress(profile.deliveryAddress1);
                    if (profile.deliveryAddress2) setAddress2(profile.deliveryAddress2);
                    if (profile.deliveryCity) setCity(profile.deliveryCity);
                    if (profile.deliveryZip) setZip(profile.deliveryZip);
                    if (profile.deliveryCountry) setCountry(profile.deliveryCountry);

                    const complete = isProfileComplete(profile);
                    setProfileReady(complete);
                    if (!complete) {
                        Toast.show({
                            topOffset: 60,
                            type: "error",
                            text1: "Complete your profile first",
                            text2: "Add phone and delivery address in User Profile",
                        });
                    }
                })
                .catch(() => {
                    setProfileReady(false);
                })
                .finally(() => setLoadingProfile(false));
        } else {
            navigation.navigate("User", { screen: "Login" });
            Toast.show({ topOffset: 60, type: "error", text1: "Please login to checkout" });
            setLoadingProfile(false);
        }

        return () => setOrderItems([]);
    }, [cartItems, context.stateUser.isAuthenticated]);

    const goToPayment = async () => {
        if (loadingProfile) {
            Toast.show({ topOffset: 60, type: "info", text1: "Loading profile..." });
            return;
        }

        if (!profileReady) {
            Toast.show({
                topOffset: 60,
                type: "error",
                text1: "Profile required before checkout",
                text2: "Please complete delivery details in User Profile",
            });
            navigation.navigate("User", { screen: "User Profile" });
            return;
        }

        await dispatch(persistCurrentCart());

        navigation.navigate("Payment", {
            order: {
                city,
                country,
                dateOrdered: Date.now(),
                orderItems,
                phone,
                shippingAddress1: address,
                shippingAddress2: address2,
                status: "pending",
                user,
                zip,
            },
        });
    };

    return (
        <View style={styles.screen}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.headerCard}>
                    <View style={styles.headerTop}>
                        <Ionicons name="location-outline" size={20} color="#c2410c" />
                        <Text style={styles.headerTitle}>Shipping Details</Text>
                    </View>
                    <Text style={styles.headerSub}>Confirm your delivery information before placing your order.</Text>
                </View>

                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Contact & Address</Text>
                    {loadingProfile ? (
                        <View style={styles.loadingRow}>
                            <ActivityIndicator color="#ea580c" size="small" />
                            <Text style={styles.loadingText}>Loading your profile...</Text>
                        </View>
                    ) : (
                        <>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Phone</Text>
                                <Text style={styles.infoValue}>{phone || "Not set"}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Address</Text>
                                <Text style={styles.infoValue}>{address || "Not set"}</Text>
                            </View>
                            {address2 ? (
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Address 2</Text>
                                    <Text style={styles.infoValue}>{address2}</Text>
                                </View>
                            ) : null}
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>City / Zip</Text>
                                <Text style={styles.infoValue}>{city || "Not set"} {zip ? `, ${zip}` : ""}</Text>
                            </View>
                            <View style={styles.infoRowLast}>
                                <Text style={styles.infoLabel}>Country</Text>
                                <Text style={styles.infoValue}>{country || "Not set"}</Text>
                            </View>
                        </>
                    )}
                </View>

                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Order Snapshot</Text>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Items in Cart</Text>
                        <Text style={styles.infoValue}>{itemCount}</Text>
                    </View>
                    <View style={styles.infoRowLast}>
                        <Text style={styles.infoLabel}>Profile Status</Text>
                        <Text style={[styles.infoValue, { color: profileReady ? "#0f766e" : "#b91c1c" }]}>
                            {profileReady ? "Ready" : "Incomplete"}
                        </Text>
                    </View>
                </View>

                {!profileReady && !loadingProfile ? (
                    <TouchableOpacity
                        style={styles.profileBtn}
                        onPress={() => navigation.navigate("User", { screen: "User Profile" })}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="person-circle-outline" size={18} color="#fff" />
                        <Text style={styles.profileBtnText}>Complete Profile</Text>
                    </TouchableOpacity>
                ) : null}
            </ScrollView>

            <View style={styles.bottomBar}>
                <TouchableOpacity
                    style={[styles.ctaBtn, (!profileReady || loadingProfile) && styles.ctaBtnDisabled]}
                    onPress={goToPayment}
                    disabled={!profileReady || loadingProfile}
                    activeOpacity={0.9}
                >
                    <Text style={styles.ctaBtnTitle}>{profileReady ? "Continue to Payment" : "Profile Required"}</Text>
                    <Text style={styles.ctaBtnSub}>Shipping step</Text>
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
    headerCard: {
        backgroundColor: "#131927",
        borderRadius: 18,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "rgba(234, 88, 12, 0.18)",
    },
    headerTop: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 6,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "800",
        color: "#f8fafc",
    },
    headerSub: {
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
    loadingRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    loadingText: {
        color: "#94a3b8",
        fontSize: 13,
    },
    infoRow: {
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(148, 163, 184, 0.15)",
    },
    infoRowLast: {
        paddingTop: 8,
    },
    infoLabel: {
        color: "#94a3b8",
        fontSize: 12,
        marginBottom: 2,
    },
    infoValue: {
        color: "#f8fafc",
        fontSize: 15,
        fontWeight: "600",
    },
    profileBtn: {
        backgroundColor: "#1e293b",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(251, 146, 60, 0.35)",
        paddingVertical: 13,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    profileBtnText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 14,
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
    },
    ctaBtn: {
        backgroundColor: "#ea580c",
        borderRadius: 14,
        paddingVertical: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    ctaBtnDisabled: {
        backgroundColor: "#334155",
    },
    ctaBtnTitle: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "800",
    },
    ctaBtnSub: {
        color: "rgba(255,255,255,0.92)",
        marginTop: 2,
        fontSize: 12,
        fontWeight: "600",
    },
});

export default Checkout;
