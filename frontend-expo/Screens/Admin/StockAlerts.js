import React, { useCallback, useState } from "react";
import { View, FlatList, Text, StyleSheet, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import baseURL from "../../assets/common/baseurl";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const StockAlerts = () => {
    const [alerts, setAlerts] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    const loadAlerts = () => {
        return AsyncStorage.getItem("jwt")
            .then((res) =>
                axios.get(`${baseURL}stock-alerts`, {
                    headers: { Authorization: `Bearer ${res || ""}` },
                })
            )
            .then((res) => setAlerts(res.data || []))
            .catch(() => setAlerts([]));
    };

    useFocusEffect(
        useCallback(() => {
            let isMounted = true;
            loadAlerts().then(() => {
                if (!isMounted) return;
            });
            return () => {
                isMounted = false;
                setAlerts([]);
            };
        }, [])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadAlerts().finally(() => setRefreshing(false));
    }, []);

    const activeAlerts = alerts.filter((a) => !a.resolved).length;
    const resolvedAlerts = alerts.filter((a) => a.resolved).length;

    return (
        <View style={styles.container}>
            <FlatList
                data={alerts}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ea580c" />}
                keyExtractor={(item) => String(item.id || item._id)}
                ListHeaderComponent={
                    <LinearGradient
                        colors={["#131927", "#0f172a"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.hero}
                    >
                        <Text style={styles.eyebrow}>Admin Workspace</Text>
                        <Text style={styles.titleMain}>Stock Alerts</Text>
                        <Text style={styles.subtitle}>Keep inventory healthy before items run out.</Text>
                        <View style={styles.metaRow}>
                            <View style={styles.metaCard}>
                                <Text style={styles.metaValue}>{alerts.length}</Text>
                                <Text style={styles.metaLabel}>Total</Text>
                            </View>
                            <View style={styles.metaCard}>
                                <Text style={styles.metaValue}>{activeAlerts}</Text>
                                <Text style={styles.metaLabel}>Active</Text>
                            </View>
                            <View style={styles.metaCard}>
                                <Text style={styles.metaValue}>{resolvedAlerts}</Text>
                                <Text style={styles.metaLabel}>Resolved</Text>
                            </View>
                        </View>
                    </LinearGradient>
                }
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.center}>
                        <Ionicons name="shield-checkmark-outline" size={42} color="#334155" />
                        <Text style={styles.emptyTitle}>No stock alerts</Text>
                        <Text style={styles.emptyText}>Inventory is healthy right now.</Text>
                    </View>
                }
                renderItem={({ item }) => {
                    const isOut = String(item.type || "").toLowerCase() === "out";
                    const isResolved = item.resolved === true;
                    return (
                        <View style={styles.card}>
                            <View style={styles.cardTop}>
                                <Text style={styles.title}>{item.product?.name || "Unknown product"}</Text>
                                <View style={[
                                    styles.badge,
                                    isResolved ? styles.badgeResolved : isOut ? styles.badgeOut : styles.badgeLow,
                                ]}>
                                    <Text style={styles.badgeText}>{isResolved ? "resolved" : isOut ? "out" : "low"}</Text>
                                </View>
                            </View>
                            <Text style={styles.meta}>Stock: {item.countInStock}</Text>
                            <Text style={styles.meta}>Threshold: {item.threshold}</Text>
                            <Text style={styles.meta}>Status: {item.resolved ? "Resolved" : "Active"}</Text>
                        </View>
                    );
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 12,
        backgroundColor: "#080c17",
    },
    hero: {
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: "rgba(251, 146, 60, 0.2)",
        marginBottom: 12,
    },
    eyebrow: {
        color: "#94a3b8",
        fontSize: 12,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    titleMain: {
        color: "#f8fafc",
        fontSize: 24,
        fontWeight: "800",
        marginTop: 4,
    },
    subtitle: {
        color: "#94a3b8",
        marginTop: 4,
        marginBottom: 12,
        fontSize: 13,
        lineHeight: 18,
    },
    metaRow: {
        flexDirection: "row",
        gap: 8,
    },
    metaCard: {
        flex: 1,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.2)",
        backgroundColor: "rgba(15, 23, 42, 0.8)",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
    },
    metaValue: {
        color: "#f8fafc",
        fontSize: 16,
        fontWeight: "800",
    },
    metaLabel: {
        color: "#94a3b8",
        fontSize: 11,
        fontWeight: "600",
    },
    listContent: {
        paddingBottom: 18,
    },
    center: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 40,
        gap: 8,
    },
    card: {
        backgroundColor: "#111827",
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.16)",
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
    },
    cardTop: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
    },
    title: {
        fontWeight: "700",
        marginBottom: 4,
        color: "#f1f5f9",
        fontSize: 15,
        flex: 1,
    },
    badge: {
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    badgeLow: {
        backgroundColor: "#f59e0b",
    },
    badgeOut: {
        backgroundColor: "#ef4444",
    },
    badgeResolved: {
        backgroundColor: "#16a34a",
    },
    badgeText: {
        color: "#fff",
        fontSize: 11,
        fontWeight: "700",
        textTransform: "uppercase",
    },
    meta: {
        color: "#94a3b8",
        fontSize: 13,
        lineHeight: 18,
    },
    emptyTitle: {
        color: "#f8fafc",
        fontSize: 16,
        fontWeight: "700",
    },
    emptyText: {
        color: "#94a3b8",
        fontSize: 13,
        textAlign: "center",
    },
});

export default StockAlerts;
