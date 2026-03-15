import React, { useState, useCallback, useMemo } from "react";
import {
    View,
    Text,
    FlatList,
    ActivityIndicator,
    StyleSheet,
    RefreshControl,
    TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Searchbar } from "react-native-paper";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import baseURL from "../../assets/common/baseurl";
import ServiceListItem from "./ServiceListItem";

const Services = () => {
    const [serviceList, setServiceList] = useState([]);
    const [serviceFilter, setServiceFilter] = useState([]);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState("");
    const [refreshing, setRefreshing] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const navigation = useNavigation();

    const stats = useMemo(() => {
        const totalServices = serviceList.length;
        const featuredServices = serviceList.filter((item) => item.isFeatured).length;
        const pricedServices = serviceList.filter((item) => Number(item.price || 0) > 0);
        const averagePrice = pricedServices.length
            ? pricedServices.reduce((sum, item) => sum + Number(item.price || 0), 0) / pricedServices.length
            : 0;

        return {
            totalServices,
            featuredServices,
            averagePrice,
        };
    }, [serviceList]);

    const fetchServices = useCallback(() => {
        return axios
            .get(`${baseURL}services`)
            .then((res) => {
                setServiceList(res.data || []);
                setServiceFilter(res.data || []);
            })
            .catch(() => {
                setServiceList([]);
                setServiceFilter([]);
            })
            .finally(() => setLoading(false));
    }, []);

    const searchService = (text) => {
        const query = String(text || "").trim().toLowerCase();
        if (!query) {
            setServiceFilter(serviceList);
            return;
        }

        setServiceFilter(
            serviceList.filter((item) =>
                String(item.name || "").toLowerCase().includes(query)
                || String(item.description || "").toLowerCase().includes(query)
                || String(item.duration || "").toLowerCase().includes(query)
            )
        );
    };

    const deleteService = (id) => {
        if (deletingId) return;
        setDeletingId(id);
        axios
            .delete(`${baseURL}services/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then(() => {
                const filter = (items) => items.filter((item) => (item.id || item._id) !== id);
                setServiceList((prev) => filter(prev));
                setServiceFilter((prev) => filter(prev));
            })
            .catch((error) => console.log(error))
            .finally(() => setDeletingId(null));
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchServices().finally(() => setRefreshing(false));
    }, [fetchServices]);

    useFocusEffect(
        useCallback(() => {
            AsyncStorage.getItem("jwt")
                .then((res) => setToken(res || ""))
                .catch((error) => console.log(error));

            fetchServices();

            return () => {
                setServiceList([]);
                setServiceFilter([]);
                setLoading(true);
            };
        }, [fetchServices])
    );

    const DashboardHeader = () => (
        <View style={styles.topSection}>
            <LinearGradient
                colors={["#131927", "#0f172a"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroCard}
            >
                <View style={styles.heroTopRow}>
                    <View>
                        <Text style={styles.heroEyebrow}>Admin Workspace</Text>
                        <Text style={styles.heroTitle}>Services Dashboard</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.primaryAction}
                        onPress={() => navigation.navigate("ServiceForm", { returnScreen: "Services" })}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="add" size={18} color="#0b0f1a" />
                        <Text style={styles.primaryActionText}>New Service</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{stats.totalServices}</Text>
                        <Text style={styles.statLabel}>Total Services</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{stats.featuredServices}</Text>
                        <Text style={styles.statLabel}>Featured</Text>
                    </View>
                    <View style={styles.statCardWide}>
                        <Text style={styles.statValue}>${stats.averagePrice.toFixed(2)}</Text>
                        <Text style={styles.statLabel}>Average Price</Text>
                    </View>
                </View>
            </LinearGradient>

            <View style={styles.searchWrap}>
                <Searchbar
                    placeholder="Search by service or duration"
                    placeholderTextColor="#94a3b8"
                    iconColor="#fb923c"
                    inputStyle={styles.searchInput}
                    style={styles.searchbar}
                    onChangeText={searchService}
                />
            </View>

            <View style={styles.listHeaderRow}>
                <Text style={styles.listTitle}>All Services</Text>
                <Text style={styles.listCount}>{serviceFilter.length} items</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.screen}>
            <FlatList
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ea580c" />}
                ListHeaderComponent={<DashboardHeader />}
                contentContainerStyle={styles.listContent}
                data={loading ? [] : serviceFilter}
                renderItem={({ item }) => (
                    <ServiceListItem
                        item={item}
                        deleteService={deleteService}
                        isDeleting={deletingId === (item.id || item._id)}
                    />
                )}
                keyExtractor={(item) => String(item.id || item._id)}
                ListEmptyComponent={
                    loading ? (
                        <View style={styles.spinner}>
                            <ActivityIndicator size="large" color="#ea580c" />
                            <Text style={styles.loadingText}>Loading services...</Text>
                        </View>
                    ) : (
                        <View style={styles.emptyState}>
                            <Ionicons name="construct-outline" size={42} color="#334155" />
                            <Text style={styles.emptyStateTitle}>No matching services</Text>
                            <Text style={styles.emptyStateText}>Try another keyword or add a new service.</Text>
                        </View>
                    )
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: "#080c17",
    },
    topSection: {
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 14,
        gap: 14,
    },
    heroCard: {
        borderRadius: 24,
        padding: 18,
        borderWidth: 1,
        borderColor: "rgba(251, 146, 60, 0.18)",
    },
    heroTopRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 18,
        gap: 10,
    },
    heroEyebrow: {
        color: "#94a3b8",
        fontSize: 12,
        textTransform: "uppercase",
        letterSpacing: 0.6,
    },
    heroTitle: {
        color: "#f8fafc",
        fontSize: 24,
        fontWeight: "800",
        marginTop: 4,
    },
    primaryAction: {
        backgroundColor: "#fb923c",
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 8,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    primaryActionText: {
        color: "#0f172a",
        fontWeight: "700",
        fontSize: 13,
    },
    statsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    },
    statCard: {
        width: "48%",
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.2)",
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 12,
    },
    statCardWide: {
        width: "100%",
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.2)",
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 12,
    },
    statValue: {
        color: "#f8fafc",
        fontSize: 22,
        fontWeight: "800",
    },
    statLabel: {
        color: "#94a3b8",
        marginTop: 2,
        fontSize: 12,
    },
    searchWrap: {
        backgroundColor: "#111827",
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.16)",
        padding: 12,
    },
    searchbar: {
        backgroundColor: "#0f172a",
        borderRadius: 14,
        elevation: 0,
    },
    searchInput: {
        color: "#f8fafc",
        fontSize: 14,
    },
    listHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    listTitle: {
        color: "#f8fafc",
        fontSize: 18,
        fontWeight: "800",
    },
    listCount: {
        color: "#94a3b8",
        fontSize: 12,
        fontWeight: "600",
    },
    listContent: {
        paddingBottom: 24,
    },
    spinner: {
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 60,
        gap: 10,
    },
    loadingText: {
        color: "#94a3b8",
        fontSize: 13,
    },
    emptyState: {
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 48,
        gap: 8,
    },
    emptyStateTitle: {
        color: "#f8fafc",
        fontSize: 16,
        fontWeight: "700",
    },
    emptyStateText: {
        color: "#94a3b8",
        fontSize: 13,
    },
});

export default Services;