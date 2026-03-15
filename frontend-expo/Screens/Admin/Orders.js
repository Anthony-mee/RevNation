import React, { useCallback, useMemo, useState } from "react";
import { View, FlatList, Text, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import axios from "axios";
import baseURL from "../../assets/common/baseurl";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import OrderCard from "../../Shared/OrderCard";

const Orders = () => {
    const [orderList, setOrderList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchOrders = () => {
        return AsyncStorage.getItem("jwt")
            .then((res) => {
                const token = res || "";
                return axios.get(`${baseURL}orders`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
            })
            .then((res) => {
                setOrderList(res.data || []);
            })
            .catch((error) => {
                console.log(error);
                setOrderList([]);
            })
            .finally(() => setLoading(false));
    };

    const stats = useMemo(() => {
        const counts = { pending: 0, shipped: 0, delivered: 0, cancelled: 0 };
        orderList.forEach((order) => {
            const status = String(order.status || "").toLowerCase();
            if (counts[status] !== undefined) counts[status] += 1;
        });
        return counts;
    }, [orderList]);

    useFocusEffect(
        useCallback(() => {
            let isMounted = true;
            setLoading(true);
            fetchOrders().then(() => {
                if (!isMounted) return;
            });
            return () => {
                isMounted = false;
                setOrderList([]);
            };
        }, [])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchOrders().finally(() => setRefreshing(false));
    }, []);

    return (
        <View style={styles.screen}>
            <FlatList
                data={orderList}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ea580c" />}
                keyExtractor={(item) => String(item.id || item._id)}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={
                    <View style={styles.headerWrap}>
                        <LinearGradient
                            colors={["#131927", "#0f172a"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.hero}
                        >
                            <Text style={styles.eyebrow}>Admin Workspace</Text>
                            <Text style={styles.title}>Orders Dashboard</Text>
                            <Text style={styles.subtitle}>Track and update order statuses in one place.</Text>

                            <View style={styles.statsRow}>
                                <View style={styles.statCard}>
                                    <Ionicons name="time-outline" size={14} color="#f8fafc" />
                                    <Text style={styles.statValue}>{stats.pending}</Text>
                                    <Text style={styles.statLabel}>Pending</Text>
                                </View>
                                <View style={styles.statCard}>
                                    <Ionicons name="car-outline" size={14} color="#f8fafc" />
                                    <Text style={styles.statValue}>{stats.shipped}</Text>
                                    <Text style={styles.statLabel}>Shipped</Text>
                                </View>
                                <View style={styles.statCard}>
                                    <Ionicons name="checkmark-done-outline" size={14} color="#f8fafc" />
                                    <Text style={styles.statValue}>{stats.delivered}</Text>
                                    <Text style={styles.statLabel}>Delivered</Text>
                                </View>
                            </View>
                        </LinearGradient>
                    </View>
                }
                ListEmptyComponent={
                    loading ? (
                        <View style={styles.center}>
                            <ActivityIndicator size="large" color="#ea580c" />
                            <Text style={styles.loadingText}>Loading orders...</Text>
                        </View>
                    ) : (
                        <View style={styles.center}>
                            <Ionicons name="file-tray-outline" size={42} color="#334155" />
                            <Text style={styles.emptyTitle}>No orders yet</Text>
                            <Text style={styles.emptyText}>Placed orders will appear here.</Text>
                        </View>
                    )
                }
                renderItem={({ item }) => <OrderCard item={item} update={true} isAdmin={true} />}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: "#080c17",
    },
    listContent: {
        padding: 12,
        paddingBottom: 24,
    },
    headerWrap: {
        marginBottom: 8,
    },
    hero: {
        borderRadius: 22,
        padding: 16,
        borderWidth: 1,
        borderColor: "rgba(251, 146, 60, 0.2)",
    },
    eyebrow: {
        color: "#94a3b8",
        fontSize: 12,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    title: {
        color: "#f8fafc",
        fontSize: 24,
        fontWeight: "800",
        marginTop: 4,
    },
    subtitle: {
        color: "#94a3b8",
        marginTop: 4,
        marginBottom: 12,
    },
    statsRow: {
        flexDirection: "row",
        gap: 8,
    },
    statCard: {
        flex: 1,
        backgroundColor: "rgba(15, 23, 42, 0.8)",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.2)",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
        gap: 2,
    },
    statValue: {
        color: "#f8fafc",
        fontSize: 16,
        fontWeight: "800",
    },
    statLabel: {
        color: "#94a3b8",
        fontSize: 11,
        fontWeight: "600",
    },
    center: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 40,
        gap: 8,
    },
    loadingText: {
        color: "#94a3b8",
        fontSize: 13,
    },
    emptyTitle: {
        color: "#f8fafc",
        fontSize: 16,
        fontWeight: "700",
    },
    emptyText: {
        color: "#94a3b8",
        fontSize: 13,
    },
});

export default Orders;
