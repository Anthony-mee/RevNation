import React, { useCallback, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch } from "react-redux";
import Toast from "react-native-toast-message";
import { addToCart } from "../../Redux/Actions/cartActions";
import { resolveImageUrl } from "../../assets/common/imageUrl";
import { getFavoriteItems, removeFavoriteItem } from "../../assets/common/favorites";

const Favorites = () => {
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const [favorites, setFavorites] = useState([]);

    const loadFavorites = useCallback(() => {
        return getFavoriteItems().then((items) => setFavorites(items));
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadFavorites();
            return () => setFavorites([]);
        }, [loadFavorites])
    );

    const handleRemove = async (itemId) => {
        const nextFavorites = await removeFavoriteItem(itemId);
        setFavorites(nextFavorites);
        Toast.show({ topOffset: 60, type: "success", text1: "Removed from favorites" });
    };

    const handleAddToCart = (item) => {
        if (Number(item.countInStock || 0) <= 0) {
            Toast.show({ topOffset: 60, type: "error", text1: "Item is out of stock" });
            return;
        }

        dispatch(addToCart({ ...item, quantity: 1 }));
        Toast.show({
            topOffset: 60,
            type: "success",
            text1: `${item.name || "Product"} added to Cart`,
        });
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Favorites</Text>
                <Text style={styles.headerSubtitle}>{favorites.length} saved {favorites.length === 1 ? "item" : "items"}</Text>
            </View>

            <FlatList
                data={favorites}
                keyExtractor={(item) => String(item.id || item._id)}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="heart-outline" size={70} color="#334155" />
                        <Text style={styles.emptyTitle}>No favorites yet</Text>
                        <Text style={styles.emptySubtitle}>Tap the heart icon on any product to save it here.</Text>
                        <TouchableOpacity style={styles.shopButton} onPress={() => navigation.navigate("Home", { screen: "ShopProducts" })}>
                            <Text style={styles.shopButtonText}>Browse Products</Text>
                        </TouchableOpacity>
                    </View>
                }
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.card}
                        activeOpacity={0.9}
                        onPress={() => navigation.navigate("Home", { screen: "Product Detail", params: { item } })}
                    >
                        <Image source={{ uri: resolveImageUrl(item.image) }} style={styles.image} resizeMode="cover" />
                        <View style={styles.cardBody}>
                            <View style={styles.cardTopRow}>
                                <View style={styles.cardInfo}>
                                    <Text style={styles.brand}>{item.brand || "Brand"}</Text>
                                    <Text style={styles.name} numberOfLines={2}>{item.name || "Product"}</Text>
                                </View>
                                <TouchableOpacity style={styles.heartButton} onPress={() => handleRemove(String(item.id || item._id))}>
                                    <Ionicons name="heart" size={18} color="#fb923c" />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.description} numberOfLines={2}>{item.description || "No description available."}</Text>

                            <View style={styles.cardFooter}>
                                <View>
                                    <Text style={styles.price}>P{Number(item.price || 0).toFixed(2)}</Text>
                                    <Text style={styles.meta}>{Number(item.countInStock || 0)} in stock</Text>
                                </View>
                                <TouchableOpacity style={styles.cartButton} onPress={() => handleAddToCart(item)}>
                                    <Ionicons name="cart-outline" size={18} color="#fff" />
                                    <Text style={styles.cartButtonText}>Add</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableOpacity>
                )}
            />
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
        paddingHorizontal: 18,
        paddingTop: 14,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(234, 88, 12, 0.15)",
    },
    headerTitle: {
        color: "#f8fafc",
        fontSize: 24,
        fontWeight: "800",
    },
    headerSubtitle: {
        color: "#94a3b8",
        fontSize: 13,
        marginTop: 4,
    },
    listContent: {
        padding: 14,
        paddingBottom: 30,
        flexGrow: 1,
    },
    card: {
        backgroundColor: "#131927",
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.14)",
        overflow: "hidden",
        marginBottom: 12,
    },
    image: {
        width: "100%",
        height: 190,
        backgroundColor: "#0f172a",
    },
    cardBody: {
        padding: 14,
    },
    cardTopRow: {
        flexDirection: "row",
        gap: 10,
        marginBottom: 8,
    },
    cardInfo: {
        flex: 1,
    },
    brand: {
        color: "#fb923c",
        fontSize: 11,
        fontWeight: "700",
        textTransform: "uppercase",
        marginBottom: 4,
    },
    name: {
        color: "#f8fafc",
        fontSize: 17,
        fontWeight: "700",
        lineHeight: 23,
    },
    heartButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#111827",
        borderWidth: 1,
        borderColor: "rgba(251, 146, 60, 0.18)",
        alignItems: "center",
        justifyContent: "center",
    },
    description: {
        color: "#94a3b8",
        fontSize: 13,
        lineHeight: 19,
        marginBottom: 14,
    },
    cardFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
    },
    price: {
        color: "#f8fafc",
        fontSize: 20,
        fontWeight: "800",
    },
    meta: {
        color: "#94a3b8",
        fontSize: 12,
        marginTop: 2,
    },
    cartButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#ea580c",
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 999,
    },
    cartButtonText: {
        color: "#fff",
        fontSize: 13,
        fontWeight: "700",
    },
    emptyContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
        gap: 10,
    },
    emptyTitle: {
        color: "#f8fafc",
        fontSize: 20,
        fontWeight: "800",
    },
    emptySubtitle: {
        color: "#94a3b8",
        fontSize: 14,
        lineHeight: 21,
        textAlign: "center",
    },
    shopButton: {
        marginTop: 10,
        backgroundColor: "#ea580c",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 999,
    },
    shopButtonText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "700",
    },
});

export default Favorites;