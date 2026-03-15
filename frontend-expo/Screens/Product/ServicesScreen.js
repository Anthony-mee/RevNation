import React, { useCallback, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Image,
    RefreshControl,
    ActivityIndicator,
    ScrollView,
    TextInput,
    TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Searchbar } from "react-native-paper";
import axios from "axios";
import baseURL from "../../assets/common/baseurl";
import { resolveImageUrl } from "../../assets/common/imageUrl";

const SERVICE_CATEGORIES = [
    { key: "all", label: "All Services" },
    { key: "featured", label: "Featured" },
    { key: "standard", label: "Standard" },
];

const ServicesScreen = () => {
    const [services, setServices] = useState([]);
    const [filteredServices, setFilteredServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [minPrice, setMinPrice] = useState("");
    const [maxPrice, setMaxPrice] = useState("");

    const applyFilters = useCallback((source, category, query, min, max) => {
        let filtered = source;
        const parsedMin = Number(min);
        const parsedMax = Number(max);
        const hasMin = min !== "" && Number.isFinite(parsedMin);
        const hasMax = max !== "" && Number.isFinite(parsedMax);

        if (category === "featured") {
            filtered = filtered.filter((item) => item.isFeatured === true);
        } else if (category === "standard") {
            filtered = filtered.filter((item) => item.isFeatured !== true);
        }

        if (query) {
            const q = query.toLowerCase();
            filtered = filtered.filter((item) =>
                item.name?.toLowerCase().includes(q)
                || item.description?.toLowerCase().includes(q)
                || item.duration?.toLowerCase().includes(q)
            );
        }

        if (hasMin) {
            filtered = filtered.filter((item) => Number(item.price || 0) >= parsedMin);
        }

        if (hasMax) {
            filtered = filtered.filter((item) => Number(item.price || 0) <= parsedMax);
        }

        setFilteredServices(filtered);
    }, []);

    const fetchServices = useCallback(() => {
        return axios
            .get(`${baseURL}services`)
            .then((res) => {
                const next = res.data || [];
                setServices(next);
                applyFilters(next, selectedCategory, searchQuery, minPrice, maxPrice);
            })
            .catch(() => {
                setServices([]);
                setFilteredServices([]);
            })
            .finally(() => setLoading(false));
    }, [applyFilters, selectedCategory, searchQuery, minPrice, maxPrice]);

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            fetchServices();

            return () => {
                setServices([]);
                setFilteredServices([]);
            };
        }, [fetchServices])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchServices().finally(() => setRefreshing(false));
    }, [fetchServices]);

    const handleCategoryChange = (categoryKey) => {
        setSelectedCategory(categoryKey);
        applyFilters(services, categoryKey, searchQuery, minPrice, maxPrice);
    };

    const handleSearch = (query) => {
        setSearchQuery(query);
        applyFilters(services, selectedCategory, query, minPrice, maxPrice);
    };

    const handleMinPrice = (value) => {
        setMinPrice(value);
        applyFilters(services, selectedCategory, searchQuery, value, maxPrice);
    };

    const handleMaxPrice = (value) => {
        setMaxPrice(value);
        applyFilters(services, selectedCategory, searchQuery, minPrice, value);
    };

    return (
        <View style={styles.screen}>
            <FlatList
                data={loading ? [] : filteredServices}
                keyExtractor={(item) => String(item.id || item._id)}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ea580c" />}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={
                    <>
                        <View style={styles.hero}>
                            <Text style={styles.eyebrow}>Services</Text>
                            <Text style={styles.title}>Build, Tune, Restore</Text>
                            <Text style={styles.subtitle}>
                                Explore our workshop services, from custom fabrication to complete restoration projects.
                            </Text>
                            <Text style={styles.resultsCount}>
                                {filteredServices.length} {filteredServices.length === 1 ? "result" : "results"}
                            </Text>
                        </View>

                        <Searchbar
                            placeholder="Search services..."
                            onChangeText={handleSearch}
                            value={searchQuery}
                            style={styles.searchBar}
                            iconColor="#60a5fa"
                            inputStyle={styles.searchInput}
                            placeholderTextColor="#64748b"
                            theme={{ colors: { text: "#ffffff" } }}
                        />

                        <View style={styles.priceFilterCard}>
                            <Text style={styles.filterTitle}>Price Range</Text>
                            <View style={styles.priceInputsRow}>
                                <View style={styles.priceInputWrap}>
                                    <Text style={styles.priceInputLabel}>Min</Text>
                                    <TextInput
                                        value={minPrice}
                                        onChangeText={handleMinPrice}
                                        keyboardType="numeric"
                                        placeholder="0"
                                        placeholderTextColor="#64748b"
                                        style={styles.priceInput}
                                    />
                                </View>
                                <View style={styles.priceInputWrap}>
                                    <Text style={styles.priceInputLabel}>Max</Text>
                                    <TextInput
                                        value={maxPrice}
                                        onChangeText={handleMaxPrice}
                                        keyboardType="numeric"
                                        placeholder="Any"
                                        placeholderTextColor="#64748b"
                                        style={styles.priceInput}
                                    />
                                </View>
                            </View>
                        </View>

                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.categoryContainer}
                        >
                            {SERVICE_CATEGORIES.map((category) => {
                                const active = selectedCategory === category.key;
                                return (
                                    <TouchableOpacity
                                        key={category.key}
                                        style={[styles.categoryChip, active && styles.categoryChipActive]}
                                        onPress={() => handleCategoryChange(category.key)}
                                        activeOpacity={0.85}
                                    >
                                        <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>
                                            {category.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </>
                }
                ListEmptyComponent={
                    loading ? (
                        <View style={styles.center}>
                            <ActivityIndicator size="large" color="#ea580c" />
                            <Text style={styles.loadingText}>Loading services...</Text>
                        </View>
                    ) : (
                        <View style={styles.center}>
                            <Ionicons name="construct-outline" size={42} color="#334155" />
                            <Text style={styles.emptyTitle}>No services found</Text>
                            <Text style={styles.emptyText}>Try adjusting search, category, or price filters.</Text>
                        </View>
                    )
                }
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <Image source={{ uri: resolveImageUrl(item.image) }} style={styles.image} resizeMode="cover" />
                        <View style={styles.body}>
                            <View style={styles.row}>
                                <Text style={styles.name}>{item.name || "Service"}</Text>
                                <Text style={styles.price}>${Number(item.price || 0).toFixed(2)}</Text>
                            </View>
                            <Text style={styles.meta}>{item.duration || "Custom duration"}</Text>
                            <Text style={styles.description}>{item.description || "No description available yet."}</Text>
                            {item.isFeatured ? (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>Featured</Text>
                                </View>
                            ) : null}
                        </View>
                    </View>
                )}
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
        padding: 14,
        paddingBottom: 24,
    },
    hero: {
        backgroundColor: "#131927",
        borderRadius: 22,
        borderWidth: 1,
        borderColor: "rgba(251, 146, 60, 0.18)",
        padding: 18,
        marginBottom: 14,
    },
    eyebrow: {
        color: "#94a3b8",
        textTransform: "uppercase",
        fontSize: 12,
        letterSpacing: 0.6,
    },
    title: {
        color: "#f8fafc",
        fontSize: 26,
        fontWeight: "800",
        marginTop: 4,
    },
    subtitle: {
        color: "#cbd5e1",
        fontSize: 14,
        lineHeight: 20,
        marginTop: 8,
    },
    resultsCount: {
        color: "#94a3b8",
        marginTop: 10,
        fontSize: 12,
    },
    searchBar: {
        marginBottom: 10,
        elevation: 0,
        backgroundColor: "#111827",
        borderRadius: 12,
    },
    searchInput: {
        color: "#ffffff",
        fontSize: 14,
    },
    priceFilterCard: {
        borderWidth: 1,
        borderColor: "rgba(234, 88, 12, 0.2)",
        backgroundColor: "#111827",
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
    },
    filterTitle: {
        color: "#f1f5f9",
        fontSize: 13,
        fontWeight: "700",
        marginBottom: 8,
        textTransform: "uppercase",
        letterSpacing: 0.4,
    },
    priceInputsRow: {
        flexDirection: "row",
        gap: 10,
    },
    priceInputWrap: {
        flex: 1,
    },
    priceInputLabel: {
        color: "#94a3b8",
        fontSize: 12,
        marginBottom: 4,
    },
    priceInput: {
        backgroundColor: "#0b1220",
        color: "#ffffff",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.22)",
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontSize: 14,
    },
    categoryContainer: {
        paddingBottom: 6,
        gap: 8,
    },
    categoryChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "rgba(234, 88, 12, 0.35)",
        backgroundColor: "rgba(234, 88, 12, 0.12)",
        marginBottom: 10,
    },
    categoryChipActive: {
        backgroundColor: "#ea580c",
        borderColor: "#ea580c",
    },
    categoryChipText: {
        color: "#cbd5e1",
        fontSize: 13,
        fontWeight: "600",
    },
    categoryChipTextActive: {
        color: "#ffffff",
    },
    card: {
        backgroundColor: "#111827",
        borderRadius: 18,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.16)",
        marginBottom: 12,
    },
    image: {
        width: "100%",
        height: 180,
        backgroundColor: "#0b1220",
    },
    body: {
        padding: 14,
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 10,
    },
    name: {
        flex: 1,
        color: "#f8fafc",
        fontSize: 18,
        fontWeight: "700",
    },
    price: {
        color: "#fb923c",
        fontSize: 17,
        fontWeight: "800",
    },
    meta: {
        color: "#94a3b8",
        marginTop: 5,
        fontSize: 13,
    },
    description: {
        color: "#cbd5e1",
        marginTop: 10,
        fontSize: 13,
        lineHeight: 19,
    },
    badge: {
        alignSelf: "flex-start",
        marginTop: 12,
        backgroundColor: "#0f766e",
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    badgeText: {
        color: "#fff",
        fontSize: 11,
        fontWeight: "700",
    },
    center: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 48,
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
        textAlign: "center",
    },
});

export default ServicesScreen;