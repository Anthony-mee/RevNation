import React, { useEffect, useState } from "react";
import {
    Image,
    View,
    StyleSheet,
    Text,
    ScrollView,
    TouchableOpacity,
} from "react-native";
import { Surface } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useDispatch } from "react-redux";
import Toast from "react-native-toast-message";
import { addToCart } from "../../Redux/Actions/cartActions";
import { resolveImageUrl } from "../../assets/common/imageUrl";
import { isFavoriteItem, toggleFavoriteItem } from "../../assets/common/favorites";

const SingleProduct = ({ route }) => {
    const [item] = useState(route.params?.item || {});
    const [isFavorite, setIsFavorite] = useState(false);
    const dispatch = useDispatch();
    const stock = Number(item.countInStock || 0);
    const isOutOfStock = stock <= 0;
    const categoryName = item.category?.name || "Uncategorized";
    const price = Number(item.price || 0).toFixed(2);
    const reviewCount = Number(item.numReviews || 0);
    const rating = Number(item.rating || 0).toFixed(1);
    const richDescription = item.richDescription || item.description || "No additional details available.";
    const itemId = String(item.id || item._id || item.name || "");

    useEffect(() => {
        let isMounted = true;

        isFavoriteItem(itemId)
            .then((favorite) => {
                if (!isMounted) {
                    return;
                }

                setIsFavorite(Boolean(favorite));
            })
            .catch(() => {
                if (isMounted) {
                    setIsFavorite(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [itemId]);

    const handleAddToCart = () => {
        if (isOutOfStock) {
            return;
        }

        dispatch(addToCart({ ...item, quantity: 1 }));
        Toast.show({
            topOffset: 60,
            type: "success",
            text1: `${item.name || "Product"} added to Cart`,
            text2: "Go to your cart to complete order",
        });
    };

    const handleToggleFavorite = async () => {
        try {
            const result = await toggleFavoriteItem(item);
            setIsFavorite(result.isFavorite);

            Toast.show({
                topOffset: 60,
                type: "success",
                text1: result.isFavorite ? "Saved to favorites" : "Removed from favorites",
                text2: item.name || "Product",
            });
        } catch (_error) {
            Toast.show({
                topOffset: 60,
                type: "error",
                text1: "Could not update favorites",
            });
        }
    };

    return (
        <Surface style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.heroShell}>
                    <View style={styles.heroHeaderRow}>
                        <View style={styles.statusPill}>
                            <Ionicons name="sparkles-outline" size={12} color="#fb923c" />
                            <Text style={styles.statusPillText}>{item.isFeatured ? "Featured" : "In Catalog"}</Text>
                        </View>
                        <View style={[styles.stockBadge, isOutOfStock ? styles.stockOut : styles.stockIn]}>
                            <Ionicons name={isOutOfStock ? "close-circle" : "checkmark-circle"} size={12} color="#fff" />
                            <Text style={styles.stockBadgeText}>{isOutOfStock ? "Unavailable" : `${stock} in stock`}</Text>
                        </View>
                    </View>

                    <View style={styles.imageCard}>
                        <Image
                            source={{ uri: resolveImageUrl(item.image) }}
                            resizeMode="contain"
                            style={styles.image}
                        />
                    </View>

                    <View style={styles.quickSpecsRow}>
                        <View style={styles.quickSpecCard}>
                            <Text style={styles.quickSpecLabel}>Brand</Text>
                            <Text style={styles.quickSpecValue}>{item.brand || "Unknown"}</Text>
                        </View>
                        <View style={styles.quickSpecCard}>
                            <Text style={styles.quickSpecLabel}>Category</Text>
                            <Text style={styles.quickSpecValue}>{categoryName}</Text>
                        </View>
                        <View style={styles.quickSpecCard}>
                            <Text style={styles.quickSpecLabel}>Rating</Text>
                            <Text style={styles.quickSpecValue}>{rating}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.contentCard}>
                    <Text style={styles.eyebrow}>{categoryName}</Text>
                    <View style={styles.titleRow}>
                        <Text style={styles.title}>{item.name || "Product"}</Text>
                        <TouchableOpacity style={[styles.iconButton, isFavorite && styles.iconButtonActive]} activeOpacity={0.85} onPress={handleToggleFavorite}>
                            <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={18} color={isFavorite ? "#fb923c" : "#f8fafc"} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.priceRow}>
                        <Text style={styles.currentPrice}>P{price}</Text>
                        <View style={styles.ratingRow}>
                            <Ionicons name="star" size={14} color="#fbbf24" />
                            <Text style={styles.ratingText}>{rating}</Text>
                            <Text style={styles.ratingCount}>• {reviewCount} reviews</Text>
                        </View>
                    </View>

                    <Text style={styles.description}>{item.description || "No description available."}</Text>

                    <View style={styles.featureStrip}>
                        <View style={styles.featureItem}>
                            <Ionicons name="shield-checkmark-outline" size={17} color="#fb923c" />
                            <Text style={styles.featureText}>Protected checkout</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <Ionicons name="cube-outline" size={17} color="#fb923c" />
                            <Text style={styles.featureText}>Ready to dispatch</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <Ionicons name="ribbon-outline" size={17} color="#fb923c" />
                            <Text style={styles.featureText}>Quality selected</Text>
                        </View>
                    </View>

                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Overview</Text>
                        <Text style={styles.sectionBody}>{richDescription}</Text>
                    </View>

                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Purchase Details</Text>
                        <View style={styles.infoRowCard}>
                            <View style={styles.infoIconWrap}>
                                <Ionicons name="car-sport-outline" size={18} color="#fb923c" />
                            </View>
                            <View style={styles.infoCopy}>
                                <Text style={styles.infoHeadline}>Shipping</Text>
                                <Text style={styles.infoSubtext}>Calculated during checkout</Text>
                                <Text style={styles.infoMeta}>Delivery options depend on your location</Text>
                            </View>
                        </View>
                        <View style={styles.infoRowCard}>
                            <View style={styles.infoIconWrap}>
                                <Ionicons name="wallet-outline" size={18} color="#fb923c" />
                            </View>
                            <View style={styles.infoCopy}>
                                <Text style={styles.infoHeadline}>Payment</Text>
                                <Text style={styles.infoSubtext}>Secure payment flow</Text>
                                <Text style={styles.infoMeta}>Checkout options are shown before order confirmation</Text>
                            </View>
                        </View>
                    </View>

                    <Text style={styles.sectionTitle}>Key Specs</Text>
                    <View style={styles.infoGrid}>
                        <View style={styles.infoCard}>
                            <Text style={styles.infoLabel}>Brand</Text>
                            <Text style={styles.infoValue}>{item.brand || "N/A"}</Text>
                        </View>
                        <View style={styles.infoCard}>
                            <Text style={styles.infoLabel}>Category</Text>
                            <Text style={styles.infoValue}>{categoryName}</Text>
                        </View>
                        <View style={styles.infoCard}>
                            <Text style={styles.infoLabel}>Stock</Text>
                            <Text style={styles.infoValue}>{stock}</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>

            <View style={styles.bottomBar}>
                <TouchableOpacity style={styles.cartFab} onPress={handleAddToCart} disabled={isOutOfStock} activeOpacity={0.85}>
                    <Ionicons name="cart-outline" size={22} color="#fb923c" />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.buyBar, isOutOfStock && styles.buyBarDisabled]}
                    onPress={handleAddToCart}
                    disabled={isOutOfStock}
                    activeOpacity={0.9}
                >
                    <Text style={styles.buyBarTitle}>{isOutOfStock ? "Unavailable" : "Add to Cart"}</Text>
                    <Text style={styles.buyBarPrice}>P{price} • Ready for checkout</Text>
                </TouchableOpacity>
            </View>
        </Surface>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0b0f1a",
    },
    scrollContent: {
        paddingBottom: 104,
    },
    heroShell: {
        padding: 14,
        gap: 12,
        backgroundColor: "#080c17",
    },
    heroHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },
    statusPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "rgba(15, 23, 42, 0.9)",
        borderWidth: 1,
        borderColor: "rgba(251, 146, 60, 0.25)",
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    statusPillText: {
        color: "#e2e8f0",
        fontSize: 12,
        fontWeight: "700",
    },
    stockBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    stockIn: {
        backgroundColor: "rgba(34, 197, 94, 0.18)",
        borderWidth: 1,
        borderColor: "rgba(34, 197, 94, 0.35)",
    },
    stockOut: {
        backgroundColor: "rgba(239, 68, 68, 0.18)",
        borderWidth: 1,
        borderColor: "rgba(239, 68, 68, 0.35)",
    },
    stockBadgeText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "700",
    },
    imageCard: {
        backgroundColor: "#111827",
        borderRadius: 26,
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.14)",
        overflow: "hidden",
        padding: 14,
    },
    image: {
        width: "100%",
        height: 300,
        backgroundColor: "#0f172a",
    },
    quickSpecsRow: {
        flexDirection: "row",
        gap: 10,
    },
    quickSpecCard: {
        flex: 1,
        backgroundColor: "#111827",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.14)",
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    quickSpecValue: {
        color: "#f8fafc",
        fontSize: 14,
        fontWeight: "800",
    },
    quickSpecLabel: {
        color: "#94a3b8",
        fontSize: 10,
        fontWeight: "600",
        marginBottom: 4,
        textTransform: "uppercase",
    },
    contentCard: {
        backgroundColor: "#0b0f1a",
        paddingHorizontal: 14,
        paddingBottom: 8,
    },
    eyebrow: {
        color: "#94a3b8",
        fontSize: 11,
        fontWeight: "800",
        textTransform: "uppercase",
        letterSpacing: 0.6,
        marginBottom: 10,
    },
    titleRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        marginBottom: 10,
    },
    title: {
        flex: 1,
        color: "#f8fafc",
        fontSize: 24,
        lineHeight: 30,
        fontWeight: "800",
    },
    iconButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#111827",
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.14)",
        alignItems: "center",
        justifyContent: "center",
    },
    iconButtonActive: {
        borderColor: "rgba(251, 146, 60, 0.35)",
        backgroundColor: "rgba(251, 146, 60, 0.08)",
    },
    ratingRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 16,
    },
    ratingText: {
        color: "#fbbf24",
        fontSize: 14,
        fontWeight: "800",
    },
    ratingCount: {
        color: "#94a3b8",
        fontSize: 13,
        fontWeight: "600",
    },
    priceRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        marginBottom: 8,
    },
    currentPrice: {
        color: "#fb923c",
        fontSize: 30,
        fontWeight: "800",
    },
    sectionTitle: {
        color: "#f8fafc",
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 8,
    },
    description: {
        color: "#cbd5e1",
        fontSize: 14,
        lineHeight: 21,
        marginBottom: 16,
    },
    featureStrip: {
        backgroundColor: "#111827",
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.14)",
        padding: 12,
        gap: 10,
        marginBottom: 14,
    },
    featureItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    featureText: {
        color: "#e2e8f0",
        fontSize: 13,
        fontWeight: "600",
    },
    sectionCard: {
        backgroundColor: "#111827",
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.14)",
        padding: 14,
        marginBottom: 14,
    },
    sectionBody: {
        color: "#cbd5e1",
        fontSize: 14,
        lineHeight: 22,
    },
    infoRowCard: {
        backgroundColor: "#0b1220",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.12)",
        padding: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginBottom: 10,
    },
    infoIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#0b1220",
        alignItems: "center",
        justifyContent: "center",
    },
    infoCopy: {
        flex: 1,
    },
    infoHeadline: {
        color: "#f8fafc",
        fontSize: 14,
        fontWeight: "700",
    },
    infoSubtext: {
        color: "#e2e8f0",
        fontSize: 13,
        marginTop: 2,
        fontWeight: "600",
    },
    infoMeta: {
        color: "#94a3b8",
        fontSize: 12,
        marginTop: 3,
    },
    infoGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
        marginBottom: 12,
    },
    infoCard: {
        minWidth: "31%",
        flex: 1,
        backgroundColor: "#111827",
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.14)",
    },
    infoLabel: {
        color: "#94a3b8",
        fontSize: 12,
        marginBottom: 6,
    },
    infoValue: {
        color: "#f8fafc",
        fontSize: 18,
        fontWeight: "800",
    },
    bottomBar: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "#0b1220",
        borderTopWidth: 1,
        borderTopColor: "rgba(148, 163, 184, 0.14)",
        paddingHorizontal: 10,
        paddingVertical: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    cartFab: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#111827",
        borderWidth: 1,
        borderColor: "rgba(251, 146, 60, 0.18)",
        alignItems: "center",
        justifyContent: "center",
    },
    buyBar: {
        flex: 1,
        backgroundColor: "#ea580c",
        borderRadius: 16,
        paddingVertical: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    buyBarDisabled: {
        backgroundColor: "#94a3b8",
    },
    buyBarTitle: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "800",
    },
    buyBarPrice: {
        color: "rgba(255,255,255,0.92)",
        fontSize: 12,
        fontWeight: "700",
        marginTop: 2,
    },
});

export default SingleProduct;
