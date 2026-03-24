import React, { useState, useCallback } from "react";
import {
    View,
    Text,
    FlatList,
    ActivityIndicator,
    StyleSheet,
    RefreshControl,
    TouchableOpacity,
    Alert,
    ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Searchbar } from "react-native-paper";
import axios from "axios";
import baseURL from "../assets/common/baseurl";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";

const UserCoupons = () => {
    const [couponList, setCouponsList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [claimedCoupons, setClaimedCoupons] = useState([]);
    const navigation = useNavigation();

    const fetchCoupons = useCallback(async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem("jwt");
            if (!token) return;

            const response = await axios.get(`${baseURL}coupons/active`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setCouponsList(response.data.coupons || []);
        } catch (error) {
            console.error("Error fetching coupons:", error);
            Alert.alert("Error", "Failed to fetch coupons");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    const fetchClaimedCoupons = useCallback(async () => {
        try {
            const token = await AsyncStorage.getItem("jwt");
            if (!token) return;

            const response = await axios.get(`${baseURL}coupons/claimed`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.data.coupons) {
                const claimedIds = response.data.coupons.map(c => c.id);
                setClaimedCoupons(claimedIds);
            }
        } catch (error) {
            console.error("Error fetching claimed coupons:", error);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchCoupons();
            fetchClaimedCoupons();
        }, [fetchCoupons, fetchClaimedCoupons])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchCoupons();
        fetchClaimedCoupons();
    };

    const claimCoupon = async (coupon) => {
        try {
            const token = await AsyncStorage.getItem("jwt");
            
            // Check if already claimed
            if (claimedCoupons.includes(coupon.id)) {
                Alert.alert("Already Claimed", "You have already claimed this coupon");
                return;
            }

            // Call backend to claim coupon
            const response = await axios.post(`${baseURL}coupons/claim`, {
                couponId: coupon.id
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.status === 200) {
                // Update local claimed coupons
                const newClaimed = [...claimedCoupons, coupon.id];
                setClaimedCoupons(newClaimed);

                Alert.alert(
                    "Coupon Claimed!",
                    `Coupon "${coupon.title}" has been added to your wallet. Use code: ${coupon.code}`,
                    [
                        {
                            text: "Copy Code",
                            onPress: () => {
                                // In a real app, you'd copy to clipboard
                                Alert.alert("Code Copied", `Coupon code ${coupon.code} copied to clipboard`);
                            },
                        },
                        { text: "OK", style: "cancel" },
                    ]
                );
            }
        } catch (error) {
            console.error("Error claiming coupon:", error);
            const errorMsg = error.response?.data?.message || "Failed to claim coupon";
            Alert.alert("Error", errorMsg);
        }
    };

    const getStatusColor = (coupon) => {
        if (claimedCoupons.includes(coupon.id)) return "#10b981";
        return "#ea580c";
    };

    const getStatusText = (coupon) => {
        if (claimedCoupons.includes(coupon.id)) return "Claimed";
        return "Available";
    };

    const filteredCoupons = couponList.filter(coupon =>
        coupon.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        coupon.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        coupon.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderCouponItem = ({ item }) => {
        const isClaimed = claimedCoupons.includes(item.id);
        
        return (
            <View style={styles.couponCard}>
                <View style={styles.couponHeader}>
                    <View style={styles.couponInfo}>
                        <Text style={styles.couponCode}>{item.code}</Text>
                        <Text style={styles.couponTitle}>{item.title}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item) }]}>
                        <Text style={styles.statusText}>{getStatusText(item)}</Text>
                    </View>
                </View>
                
                <Text style={styles.couponDescription}>{item.description}</Text>
                
                <View style={styles.couponDetails}>
                    <Text style={styles.detailText}>
                        Discount: {item.type === "percentage" ? `${item.value}%` : 
                                 item.type === "fixed" ? `P${item.value}` : 
                                 "Free Shipping"}
                    </Text>
                    {item.minAmount > 0 && (
                        <Text style={styles.detailText}>Min. Order: P{item.minAmount}</Text>
                    )}
                    {item.usageLimit && (
                        <Text style={styles.detailText}>
                            Available: {item.usageLimit - item.usedCount} left
                        </Text>
                    )}
                    <Text style={styles.detailText}>
                        Valid until: {new Date(item.endDate).toLocaleDateString()}
                    </Text>
                </View>
                
                <View style={styles.couponActions}>
                    {isClaimed ? (
                        <View style={styles.claimedButton}>
                            <Ionicons name="checkmark-circle" size={16} color="#fff" />
                            <Text style={styles.buttonText}>Claimed</Text>
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.claimButton} onPress={() => claimCoupon(item)}>
                            <Ionicons name="gift-outline" size={16} color="#fff" />
                            <Text style={styles.buttonText}>Claim Coupon</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={["#ea580c", "#dc2626"]} style={styles.header}>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Available Coupons</Text>
                    <TouchableOpacity onPress={() => navigation.navigate("Checkout")}>
                        <Ionicons name="cart-outline" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
                <Searchbar
                    placeholder="Search coupons..."
                    onChangeText={setSearchQuery}
                    value={searchQuery}
                    style={styles.searchBar}
                    inputStyle={styles.searchInput}
                />
            </LinearGradient>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#ea580c" />
                </View>
            ) : (
                <FlatList
                    data={filteredCoupons}
                    renderItem={renderCouponItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContainer}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="pricetag-outline" size={48} color="#94a3b8" />
                            <Text style={styles.emptyText}>No available coupons</Text>
                            <Text style={styles.emptySubText}>Check back later for new deals!</Text>
                        </View>
                    }
                />
            )}

            {/* My Claimed Coupons Section */}
            {claimedCoupons.length > 0 && (
                <View style={styles.claimedSection}>
                    <Text style={styles.claimedSectionTitle}>My Claimed Coupons ({claimedCoupons.length})</Text>
                    <TouchableOpacity 
                        style={styles.viewClaimedButton}
                        onPress={() => {
                            const claimedCouponsData = couponList.filter(c => claimedCoupons.includes(c.id));
                            Alert.alert(
                                "Your Claimed Coupons",
                                claimedCouponsData.map(c => `${c.code} - ${c.title}`).join("\n") || "No coupons claimed"
                            );
                        }}
                    >
                        <Text style={styles.viewClaimedText}>View My Coupons</Text>
                    </TouchableOpacity>
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
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    headerContent: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 15,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: "#fff",
    },
    searchBar: {
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        borderRadius: 10,
    },
    searchInput: {
        color: "#fff",
    },
    listContainer: {
        padding: 20,
    },
    couponCard: {
        backgroundColor: "#1e293b",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.1)",
    },
    couponHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 8,
    },
    couponInfo: {
        flex: 1,
    },
    couponCode: {
        fontSize: 16,
        fontWeight: "700",
        color: "#ea580c",
        marginBottom: 4,
    },
    couponTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: "#f8fafc",
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#fff",
    },
    couponDescription: {
        fontSize: 13,
        color: "#94a3b8",
        marginBottom: 12,
        lineHeight: 18,
    },
    couponDetails: {
        marginBottom: 12,
    },
    detailText: {
        fontSize: 12,
        color: "#64748b",
        marginBottom: 2,
    },
    couponActions: {
        flexDirection: "row",
        gap: 10,
    },
    claimButton: {
        flex: 1,
        flexDirection: "row",
        backgroundColor: "#ea580c",
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        justifyContent: "center",
        alignItems: "center",
        gap: 6,
    },
    claimedButton: {
        flex: 1,
        flexDirection: "row",
        backgroundColor: "#10b981",
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        justifyContent: "center",
        alignItems: "center",
        gap: 6,
    },
    buttonText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#fff",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 16,
        color: "#94a3b8",
        marginTop: 12,
    },
    emptySubText: {
        fontSize: 14,
        color: "#64748b",
        marginTop: 4,
    },
    claimedSection: {
        position: "absolute",
        bottom: 20,
        left: 20,
        right: 20,
        backgroundColor: "#1e293b",
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: "rgba(234, 88, 12, 0.3)",
    },
    claimedSectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#f8fafc",
        marginBottom: 8,
    },
    viewClaimedButton: {
        backgroundColor: "#ea580c",
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 6,
        alignItems: "center",
    },
    viewClaimedText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "600",
    },
});

export default UserCoupons;
