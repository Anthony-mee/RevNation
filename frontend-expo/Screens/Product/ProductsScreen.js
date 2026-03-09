import React, { useState, useCallback, useContext } from "react";
import {
    View,
    StyleSheet,
    Dimensions,
    ScrollView,
    Text,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
} from "react-native";
import { Searchbar } from "react-native-paper";
import ProductList from "./ProductList";
import axios from "axios";
import baseURL from "../../assets/common/baseurl";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import AuthGlobal from "../../Context/Store/AuthGlobal";

var { height, width } = Dimensions.get("window");

const ProductsScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const context = useContext(AuthGlobal);
    const productType = route?.params?.productType === "resell" ? "resell" : "shop";
    const isAdmin = context?.stateUser?.user?.isAdmin === true;
    const isAuthenticated = context?.stateUser?.isAuthenticated === true;
    const canAddHere = productType === "resell" ? isAuthenticated : isAdmin;
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState("grid"); // grid or list

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            Promise.all([
                axios.get(`${baseURL}products?type=${productType}`),
                axios.get(`${baseURL}categories`)
            ])
                .then(([productsRes, categoriesRes]) => {
                    setProducts(productsRes.data);
                    setFilteredProducts(productsRes.data);
                    setCategories(categoriesRes.data);
                    setLoading(false);
                })
                .catch((error) => {
                    console.log("Error loading data:", error);
                    setLoading(false);
                });

            return () => {
                setProducts([]);
                setCategories([]);
                setFilteredProducts([]);
                setSelectedCategory("all");
                setSearchQuery("");
            };
        }, [productType])
    );

    const filterProducts = (category, query) => {
        let filtered = products;

        // Filter by category
        if (category !== "all") {
            filtered = filtered.filter(
                (item) => item.category?._id === category || item.category?.id === category
            );
        }

        // Filter by search query
        if (query) {
            filtered = filtered.filter((item) =>
                item.name.toLowerCase().includes(query.toLowerCase()) ||
                item.brand?.toLowerCase().includes(query.toLowerCase())
            );
        }

        setFilteredProducts(filtered);
    };

    const handleCategoryChange = (categoryId) => {
        setSelectedCategory(categoryId);
        filterProducts(categoryId, searchQuery);
    };

    const handleSearch = (query) => {
        setSearchQuery(query);
        filterProducts(selectedCategory, query);
    };

    const CategoryChip = ({ category, isSelected }) => (
        <TouchableOpacity
            style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
            onPress={() => handleCategoryChange(category.id || category._id)}
        >
            <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}>
                {category.name}
            </Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.headerTitle}>{productType === "resell" ? "Resell Products" : "Shop Products"}</Text>
                        <Text style={styles.headerSubtitle}>
                            {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} available
                        </Text>
                    </View>
                    <View style={styles.viewToggle}>
                        <TouchableOpacity
                            style={[styles.viewButton, viewMode === "grid" && styles.viewButtonActive]}
                            onPress={() => setViewMode("grid")}
                        >
                            <Ionicons 
                                name="grid-outline" 
                                size={20} 
                                color={viewMode === "grid" ? "#ffffff" : "#94a3b8"} 
                            />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.viewButton, viewMode === "list" && styles.viewButtonActive]}
                            onPress={() => setViewMode("list")}
                        >
                            <Ionicons 
                                name="list-outline" 
                                size={20} 
                                color={viewMode === "list" ? "#ffffff" : "#94a3b8"} 
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                {canAddHere && (
                    <TouchableOpacity
                        style={styles.addProductButton}
                        onPress={() => {
                            if (productType === "resell") {
                                navigation.navigate("ResellProductForm", { productType: "resell", returnScreen: "ResellProducts" });
                                return;
                            }
                            navigation.navigate("Admin");
                        }}
                    >
                        <Ionicons name="add-circle-outline" size={18} color="#ffffff" />
                        <Text style={styles.addProductText}>
                            {productType === "resell" ? "Add Resell Product" : "Add Shop Product"}
                        </Text>
                    </TouchableOpacity>
                )}

                {/* Search Bar */}
                <Searchbar
                    placeholder="Search products..."
                    onChangeText={handleSearch}
                    value={searchQuery}
                    style={styles.searchBar}
                    iconColor="#60a5fa"
                    inputStyle={styles.searchInput}
                    placeholderTextColor="#64748b"
                    theme={{ colors: { text: '#ffffff' } }}
                />

                {/* Category Filter */}
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.categoriesScroll}
                    contentContainerStyle={styles.categoriesContainer}
                >
                    <TouchableOpacity
                        style={[styles.categoryChip, selectedCategory === "all" && styles.categoryChipActive]}
                        onPress={() => handleCategoryChange("all")}
                    >
                        <Text style={[styles.categoryChipText, selectedCategory === "all" && styles.categoryChipTextActive]}>
                            All Products
                        </Text>
                    </TouchableOpacity>
                    {categories.map((cat) => (
                        <CategoryChip
                            key={cat.id || cat._id}
                            category={cat}
                            isSelected={selectedCategory === (cat.id || cat._id)}
                        />
                    ))}
                </ScrollView>
            </View>

            {/* Products Grid/List */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#60a5fa" />
                    <Text style={styles.loadingText}>Loading products...</Text>
                </View>
            ) : filteredProducts.length > 0 ? (
                <ScrollView 
                    style={styles.productsScroll}
                    contentContainerStyle={styles.productsContainer}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={viewMode === "grid" ? styles.productsGrid : styles.productsList}>
                        {filteredProducts.map((item) => (
                            <View 
                                key={item.id || item._id} 
                                style={viewMode === "grid" ? styles.gridItem : styles.listItem}
                            >
                                <ProductList item={item} />
                            </View>
                        ))}
                    </View>
                </ScrollView>
            ) : (
                <View style={styles.emptyContainer}>
                    <Ionicons name="search-outline" size={80} color="#475569" />
                    <Text style={styles.emptyTitle}>No Products Found</Text>
                    <Text style={styles.emptySubtitle}>
                        {searchQuery 
                            ? `No results for "${searchQuery}"`
                            : "Try selecting a different category"
                        }
                    </Text>
                    {(searchQuery || selectedCategory !== "all") && (
                        <TouchableOpacity
                            style={styles.resetButton}
                            onPress={() => {
                                setSearchQuery("");
                                setSelectedCategory("all");
                                setFilteredProducts(products);
                            }}
                        >
                            <Text style={styles.resetButtonText}>Clear Filters</Text>
                        </TouchableOpacity>
                    )}
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
        backgroundColor: "#131927",
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(234, 88, 12, 0.15)",
    },
    headerTop: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#ffffff",
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: "#94a3b8",
    },
    viewToggle: {
        flexDirection: "row",
        backgroundColor: "rgba(37, 99, 235, 0.1)",
        borderRadius: 8,
        padding: 4,
    },
    viewButton: {
        padding: 8,
        borderRadius: 6,
    },
    viewButtonActive: {
        backgroundColor: "#ea580c",
    },
    searchBar: {
        marginBottom: 12,
        elevation: 0,
        backgroundColor: "#0b0f1a",
        borderRadius: 12,
    },
    searchInput: {
        fontSize: 14,
        color: "#ffffff",
    },
    addProductButton: {
        marginBottom: 12,
        backgroundColor: "#ea580c",
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    addProductText: {
        color: "#ffffff",
        fontSize: 14,
        fontWeight: "700",
    },
    categoriesScroll: {
        marginTop: 4,
    },
    categoriesContainer: {
        paddingVertical: 8,
        gap: 8,
    },
    categoryChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: "rgba(234, 88, 12, 0.15)",
        borderWidth: 1,
        borderColor: "rgba(234, 88, 12, 0.3)",
        marginRight: 8,
    },
    categoryChipActive: {
        backgroundColor: "#ea580c",
        borderColor: "#ea580c",
    },
    categoryChipText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#94a3b8",
    },
    categoryChipTextActive: {
        color: "#ffffff",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#0b0f1a",
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: "#94a3b8",
    },
    productsScroll: {
        flex: 1,
        backgroundColor: "#0b0f1a",
    },
    productsContainer: {
        padding: 12,
        paddingBottom: 100,
    },
    productsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
    },
    productsList: {
        flexDirection: "column",
    },
    gridItem: {
        width: "48%",
        marginBottom: 16,
    },
    listItem: {
        width: "100%",
        marginBottom: 16,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 40,
        backgroundColor: "#0b0f1a",
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#ffffff",
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 15,
        color: "#94a3b8",
        textAlign: "center",
        marginBottom: 24,
    },
    resetButton: {
        backgroundColor: "#ea580c",
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 20,
    },
    resetButtonText: {
        color: "#ffffff",
        fontSize: 15,
        fontWeight: "600",
    },
});

export default ProductsScreen;
