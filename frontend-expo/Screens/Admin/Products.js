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
import ListItem from "./ListItem";
import axios from "axios";
import baseURL from "../../assets/common/baseurl";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";

const LOW_STOCK_THRESHOLD = 10;

const Products = () => {
    const [productList, setProductList] = useState([]);
    const [productFilter, setProductFilter] = useState([]);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState("");
    const [refreshing, setRefreshing] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const navigation = useNavigation();

    const stats = useMemo(() => {
        const totalProducts = productList.length;
        const featuredProducts = productList.filter((item) => item.isFeatured).length;
        const lowStock = productList.filter((item) => Number(item.countInStock || 0) <= LOW_STOCK_THRESHOLD).length;
        const categories = new Set(
            productList
                .map((item) => item.category?.id || item.category?._id)
                .filter(Boolean)
        ).size;

        return {
            totalProducts,
            featuredProducts,
            lowStock,
            categories,
        };
    }, [productList]);

    const searchProduct = (text) => {
        const query = String(text || "").trim();
        if (query === "") {
            setProductFilter(productList);
            return;
        }
        setProductFilter(
            productList.filter((i) =>
                String(i.name || "").toLowerCase().includes(query.toLowerCase())
                || String(i.brand || "").toLowerCase().includes(query.toLowerCase())
            )
        );
    };

    const deleteProduct = (id) => {
        if (deletingId) return;
        setDeletingId(id);
        axios
            .delete(`${baseURL}products/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => {
                const filter = (items) => items.filter((item) => (item.id || item._id) !== id);
                setProductList((prev) => filter(prev));
                setProductFilter((prev) => filter(prev));
            })
            .catch((error) => console.log(error))
            .finally(() => setDeletingId(null));
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        axios.get(`${baseURL}products?type=shop`).then((res) => {
            setProductList(res.data);
            setProductFilter(res.data);
            setRefreshing(false);
        });
    }, []);

    useFocusEffect(
        useCallback(() => {
            AsyncStorage.getItem("jwt")
                .then((res) => setToken(res || ""))
                .catch((error) => console.log(error));
            axios
                .get(`${baseURL}products?type=shop`)
                .then((res) => {
                    setProductList(res.data);
                    setProductFilter(res.data);
                    setLoading(false);
                })
                .catch(() => setLoading(false));

            return () => {
                setProductList([]);
                setProductFilter([]);
                setLoading(true);
            };
        }, [])
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
                        <Text style={styles.heroTitle}>Products Dashboard</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.primaryAction}
                        onPress={() => navigation.navigate("ProductForm", { productType: "shop", returnScreen: "Products" })}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="add" size={18} color="#0b0f1a" />
                        <Text style={styles.primaryActionText}>New Product</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{stats.totalProducts}</Text>
                        <Text style={styles.statLabel}>Total Products</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{stats.categories}</Text>
                        <Text style={styles.statLabel}>Categories</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{stats.featuredProducts}</Text>
                        <Text style={styles.statLabel}>Featured</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{stats.lowStock}</Text>
                        <Text style={styles.statLabel}>Low Stock</Text>
                    </View>
                </View>
            </LinearGradient>

            <View style={styles.quickActionsCard}>
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <View style={styles.quickActionsRow}>
                    <TouchableOpacity style={styles.quickActionBtn} onPress={() => navigation.navigate("Orders")} activeOpacity={0.85}>
                        <Ionicons name="bag-outline" size={16} color="#fb923c" />
                        <Text style={styles.quickActionText}>Orders</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.quickActionBtn} onPress={() => navigation.navigate("Services")} activeOpacity={0.85}>
                        <Ionicons name="construct-outline" size={16} color="#fb923c" />
                        <Text style={styles.quickActionText}>Services</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.quickActionBtn} onPress={() => navigation.navigate("Categories")} activeOpacity={0.85}>
                        <Ionicons name="pricetag-outline" size={16} color="#fb923c" />
                        <Text style={styles.quickActionText}>Categories</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.quickActionBtn} onPress={() => navigation.navigate("Stock Alerts")} activeOpacity={0.85}>
                        <Ionicons name="warning-outline" size={16} color="#fb923c" />
                        <Text style={styles.quickActionText}>Stock Alerts</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.quickActionBtn} 
                        onPress={() => {
                            try {
                                console.log('🔘 User Management button PRESSED');
                                navigation.navigate("User Management");
                            } catch (error) {
                                console.error('Navigation error:', error);
                            }
                        }}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="people-outline" size={16} color="#fb923c" />
                        <Text style={styles.quickActionText}>User Management</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.quickActionBtn} onPress={() => navigation.navigate("Coupons")} activeOpacity={0.85}>
                        <Ionicons name="ticket-outline" size={16} color="#fb923c" />
                        <Text style={styles.quickActionText}>Coupons</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.quickActionBtn} onPress={() => navigation.navigate("Promotions")} activeOpacity={0.85}>
                        <Ionicons name="megaphone-outline" size={16} color="#fb923c" />
                        <Text style={styles.quickActionText}>Promotions</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.searchWrap}>
                <Searchbar
                    placeholder="Search by product or brand"
                    placeholderTextColor="#94a3b8"
                    iconColor="#fb923c"
                    inputStyle={styles.searchInput}
                    style={styles.searchbar}
                    onChangeText={(text) => searchProduct(text)}
                />
            </View>

            <View style={styles.listHeaderRow}>
                <Text style={styles.listTitle}>Shop Products</Text>
                <Text style={styles.listCount}>{productFilter.length} items</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.screen}>
            <FlatList
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ea580c" />
                }
                ListHeaderComponent={<DashboardHeader />}
                contentContainerStyle={styles.listContent}
                data={loading ? [] : productFilter}
                renderItem={({ item, index }) => (
                    <ListItem
                        item={item}
                        index={index}
                        deleteProduct={deleteProduct}
                        isDeleting={deletingId === (item.id || item._id)}
                    />
                )}
                keyExtractor={(item) => String(item.id || item._id)}
                ListEmptyComponent={
                    loading ? (
                        <View style={styles.spinner}>
                            <ActivityIndicator size="large" color="#ea580c" />
                            <Text style={styles.loadingText}>Loading products...</Text>
                        </View>
                    ) : (
                        <View style={styles.emptyState}>
                            <Ionicons name="cube-outline" size={42} color="#334155" />
                            <Text style={styles.emptyStateTitle}>No matching products</Text>
                            <Text style={styles.emptyStateText}>Try another keyword or add a new product.</Text>
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
    quickActionsCard: {
        backgroundColor: "#111827",
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.16)",
        padding: 14,
    },
    sectionTitle: {
        color: "#f1f5f9",
        fontSize: 16,
        fontWeight: "700",
        marginBottom: 12,
    },
    quickActionsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    quickActionBtn: {
        minWidth: "48%",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        backgroundColor: "#0b1220",
        borderWidth: 1,
        borderColor: "rgba(251, 146, 60, 0.3)",
        paddingVertical: 12,
        borderRadius: 12,
    },
    quickActionText: {
        color: "#f8fafc",
        fontSize: 12,
        fontWeight: "700",
    },
    searchWrap: {
        marginTop: 2,
    },
    searchbar: {
        backgroundColor: "#111827",
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.2)",
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
        marginTop: 6,
        marginBottom: 10,
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
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
    },
    loadingText: {
        color: "#94a3b8",
        fontSize: 13,
    },
    emptyState: {
        marginTop: 60,
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    emptyStateTitle: {
        color: "#f1f5f9",
        fontSize: 16,
        fontWeight: "700",
    },
    emptyStateText: {
        color: "#94a3b8",
        fontSize: 13,
    },
});

export default Products;
