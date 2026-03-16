import React, { useEffect, useState } from "react";
import {
    Image,
    View,
    StyleSheet,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Platform,
} from "react-native";
import { Surface } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { jwtDecode } from "jwt-decode";
import { useDispatch, useSelector } from "react-redux";
import Toast from "react-native-toast-message";
import { addToCart } from "../../Redux/Actions/cartActions";
import { fetchReviews, submitReview, deleteReviewComment } from "../../Redux/Actions/reviewActions";
import { resolveImageUrl } from "../../assets/common/imageUrl";
import { isFavoriteItem, toggleFavoriteItem } from "../../assets/common/favorites";

const SingleProduct = ({ route }) => {
    const [item] = useState(route.params?.item || {});
    const [isFavorite, setIsFavorite] = useState(false);
    const dispatch = useDispatch();

    // ── Redux state for reviews ──
    const { items: reviews, loading: reviewLoading, submitting: reviewSubmitting } = useSelector((state) => state.reviews);

    const stock = Number(item.countInStock || 0);
    const isOutOfStock = stock <= 0;
    const categoryName = item.category?.name || "Uncategorized";
    const price = Number(item.price || 0).toFixed(2);
    const reviewCount = Number(item.numReviews || 0);
    const rating = Number(item.rating || 0).toFixed(1);
    const richDescription = item.richDescription || item.description || "No additional details available.";
    const itemId = String(item.id || item._id || item.name || "");
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewComment, setReviewComment] = useState("");
    const [reviewImageUri, setReviewImageUri] = useState("");
    const [currentUserId, setCurrentUserId] = useState("");
    const [openReviewMenuId, setOpenReviewMenuId] = useState("");
    const [editingCommentRef, setEditingCommentRef] = useState(null);

    const avgRating = reviews.length > 0
        ? (reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length).toFixed(1)
        : rating;
    const totalReviews = reviews.length > 0 ? reviews.length : reviewCount;
    const ownReviewExists = reviews.some((review) => String(review?.user?.id || review?.user?._id || "") === currentUserId);

    const buildReviewFormData = async () => {
        const payload = new FormData();
        if (!ownReviewExists) {
            payload.append("rating", String(Number(reviewRating)));
        }
        payload.append("comment", String(reviewComment || "").trim());
        if (reviewImageUri) {
            if (!reviewImageUri.startsWith("http://") && !reviewImageUri.startsWith("https://")) {
                const fileName = reviewImageUri.split("/").pop() || `review-${Date.now()}.jpg`;
                if (Platform.OS === "web") {
                    const blob = await fetch(reviewImageUri).then((res) => res.blob());
                    payload.append("image", blob, fileName);
                } else {
                    payload.append("image", {
                        uri: reviewImageUri,
                        name: fileName,
                        type: "image/jpeg",
                    });
                }
            }
        }
        if (editingCommentRef?.hadImage && !reviewImageUri) {
            payload.append("removeImage", "true");
        }
        return payload;
    };

    const loadReviews = () => {
        dispatch(fetchReviews(itemId));
    };

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

    useEffect(() => {
        loadReviews();
    }, [itemId]);

    useEffect(() => {
        AsyncStorage.getItem("jwt")
            .then((token) => {
                if (!token) return;
                const decoded = jwtDecode(token);
                setCurrentUserId(String(decoded?.userId || ""));
            })
            .catch(() => setCurrentUserId(""));
    }, []);

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

    const submitOrUpdateReview = async () => {
        const normalizedRating = Number(reviewRating);

        if (!Number.isInteger(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
            Toast.show({
                topOffset: 60,
                type: "error",
                text1: "Rating must be from 1 to 5",
            });
            return;
        }

        const token = await AsyncStorage.getItem("jwt");
        if (!token) {
            Toast.show({
                topOffset: 60,
                type: "error",
                text1: "Please login to review",
            });
            return;
        }

        try {
            const formData = await buildReviewFormData();
            let mode = "create";
            let commentId = null;
            if (editingCommentRef?.commentId) {
                mode = "editComment";
                commentId = editingCommentRef.commentId;
            } else if (ownReviewExists) {
                mode = "addComment";
            }

            await dispatch(submitReview(itemId, formData, mode, commentId));

            if (mode === "editComment") {
                Toast.show({ topOffset: 60, type: "success", text1: "Comment updated" });
            } else if (mode === "addComment") {
                Toast.show({ topOffset: 60, type: "success", text1: "Comment added" });
            } else {
                Toast.show({ topOffset: 60, type: "success", text1: "Review submitted" });
            }

            setReviewComment("");
            setReviewRating(5);
            setReviewImageUri("");
            setEditingCommentRef(null);
        } catch (error) {
            const status = error?.response?.status;
            if (status === 409 && !ownReviewExists) {
                Toast.show({
                    topOffset: 60,
                    type: "error",
                    text1: "Rating can only be submitted once",
                    text2: "You can still add more comments.",
                });
            } else if (status === 403) {
                Toast.show({
                    topOffset: 60,
                    type: "error",
                    text1: "Verified purchase required",
                    text2: "Only shipped/delivered buyers can review.",
                });
            } else {
                Toast.show({
                    topOffset: 60,
                    type: "error",
                    text1: "Could not submit review",
                });
            }
        }
    };

    const pickReviewImage = async (mode) => {
        try {
            if (mode === "camera") {
                const permission = await ImagePicker.requestCameraPermissionsAsync();
                if (!permission.granted) {
                    Toast.show({ topOffset: 60, type: "error", text1: "Camera permission denied" });
                    return;
                }
                const result = await ImagePicker.launchCameraAsync({
                    mediaTypes: ["images"],
                    quality: 0.7,
                });
                if (!result.canceled && result.assets?.[0]?.uri) {
                    setReviewImageUri(result.assets[0].uri);
                }
                return;
            }

            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
                Toast.show({ topOffset: 60, type: "error", text1: "Gallery permission denied" });
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ["images"],
                allowsEditing: true,
                quality: 0.7,
            });
            if (!result.canceled && result.assets?.[0]?.uri) {
                setReviewImageUri(result.assets[0].uri);
            }
        } catch (_error) {
            Toast.show({ topOffset: 60, type: "error", text1: "Could not attach image" });
        }
    };

    const deleteMyComment = async (commentId) => {
        const token = await AsyncStorage.getItem("jwt");
        if (!token) {
            Toast.show({ topOffset: 60, type: "error", text1: "Please login first" });
            return;
        }

        try {
            if (!ownReviewExists) {
                Toast.show({ topOffset: 60, type: "error", text1: "You have no review to remove" });
                return;
            }

            if (!commentId) {
                Toast.show({ topOffset: 60, type: "error", text1: "Select a comment from the 3-dot menu first" });
                return;
            }

            // Dispatch Redux action — re-fetch is handled inside deleteReviewComment
            await dispatch(deleteReviewComment(itemId, commentId));
            setReviewComment("");
            setReviewImageUri("");
            setReviewRating(5);
            setEditingCommentRef(null);
            setOpenReviewMenuId("");
            Toast.show({ topOffset: 60, type: "success", text1: "Comment removed" });
        } catch (error) {
            const status = error?.response?.status;
            if (status === 404) {
                Toast.show({ topOffset: 60, type: "error", text1: "No review found to remove" });
            } else {
                Toast.show({ topOffset: 60, type: "error", text1: "Could not remove review" });
            }
        }
    };

    const startEditingComment = (comment, ratingValue) => {
        setReviewRating(Number(ratingValue || 5));
        setReviewComment(String(comment?.text || comment?.comment || ""));
        const image = comment?.image ? resolveImageUrl(comment.image) : "";
        setReviewImageUri(String(image));
        setEditingCommentRef({
            commentId: comment?.id || comment?._id,
            hadImage: Boolean(image),
        });
        setOpenReviewMenuId("");
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
                            <Text style={styles.ratingText}>{avgRating}</Text>
                            <Text style={styles.ratingCount}>• {totalReviews} reviews</Text>
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

                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Reviews & Ratings</Text>
                        <Text style={styles.reviewHint}>Leave a rating from 1 to 5. If you already reviewed, this updates your review.</Text>

                        <View style={styles.starRow}>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <TouchableOpacity key={star} onPress={() => setReviewRating(star)}>
                                    <Ionicons
                                        name={reviewRating >= star ? "star" : "star-outline"}
                                        size={22}
                                        color={reviewRating >= star ? "#fbbf24" : "#64748b"}
                                    />
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TextInput
                            style={styles.reviewInput}
                            multiline
                            numberOfLines={3}
                            value={reviewComment}
                            onChangeText={setReviewComment}
                            placeholder="Share your experience..."
                            placeholderTextColor="#64748b"
                        />

                        <View style={styles.reviewActionRow}>
                            <TouchableOpacity style={styles.reviewIconButton} onPress={() => pickReviewImage("camera")}>
                                <Ionicons name="camera-outline" size={18} color="#f8fafc" />
                                <Text style={styles.reviewIconLabel}>Camera</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.reviewIconButton} onPress={() => pickReviewImage("gallery")}>
                                <Ionicons name="image-outline" size={18} color="#f8fafc" />
                                <Text style={styles.reviewIconLabel}>Photo</Text>
                            </TouchableOpacity>
                            {reviewImageUri ? (
                                <TouchableOpacity style={styles.reviewIconButtonMuted} onPress={() => setReviewImageUri("")}>
                                    <Ionicons name="close-circle-outline" size={18} color="#f8fafc" />
                                    <Text style={styles.reviewIconLabel}>Remove Photo</Text>
                                </TouchableOpacity>
                            ) : null}
                        </View>

                        {reviewImageUri ? (
                            <Image source={{ uri: reviewImageUri }} style={styles.reviewPreview} resizeMode="cover" />
                        ) : null}

                        <TouchableOpacity
                            style={[styles.reviewButton, reviewSubmitting && styles.reviewButtonDisabled]}
                            onPress={submitOrUpdateReview}
                            disabled={reviewSubmitting}
                            activeOpacity={0.85}
                        >
                            {reviewSubmitting ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text style={styles.reviewButtonText}>
                                    {editingCommentRef ? "Update Comment" : ownReviewExists ? "Add Comment" : "Submit Review"}
                                </Text>
                            )}
                        </TouchableOpacity>

                        {reviewLoading ? (
                            <View style={styles.reviewLoadingWrap}>
                                <ActivityIndicator size="small" color="#fb923c" />
                                <Text style={styles.reviewLoadingText}>Loading reviews...</Text>
                            </View>
                        ) : (
                            <View style={styles.reviewList}>
                                {reviews.length === 0 ? (
                                    <Text style={styles.noReviews}>No reviews yet.</Text>
                                ) : (
                                    reviews.map((review) => {
                                        const comments = Array.isArray(review.comments) && review.comments.length > 0
                                            ? review.comments
                                            : [{
                                                id: `legacy-${review.id || review._id}`,
                                                text: review.comment || "",
                                                image: review.image || "",
                                            }];

                                        return (
                                        <View key={review.id || review._id} style={styles.reviewCard}>
                                            {comments.map((comment, index) => {
                                                const menuId = `${review.id || review._id}:${comment.id || comment._id || index}`;
                                                const mine = String(review?.user?.id || review?.user?._id || "") === currentUserId;
                                                return (
                                                    <View key={menuId} style={styles.commentBlock}>
                                                        <View style={styles.reviewHeader}>
                                                            <Text style={styles.reviewAuthor}>{review?.user?.name || "Customer"}</Text>
                                                            <View style={styles.reviewHeaderRight}>
                                                                <Text style={styles.reviewStars}>{"★".repeat(Number(review.rating || 0))}</Text>
                                                                {mine ? (
                                                                    <TouchableOpacity
                                                                        style={styles.reviewMenuTrigger}
                                                                        onPress={() => setOpenReviewMenuId(openReviewMenuId === menuId ? "" : menuId)}
                                                                    >
                                                                        <Ionicons name="ellipsis-vertical" size={16} color="#f8fafc" />
                                                                    </TouchableOpacity>
                                                                ) : null}
                                                            </View>
                                                        </View>
                                                        {openReviewMenuId === menuId ? (
                                                            <View style={styles.reviewMenuBox}>
                                                                <TouchableOpacity style={styles.reviewMenuItem} onPress={() => startEditingComment(comment, review.rating)}>
                                                                    <Ionicons name="create-outline" size={14} color="#f8fafc" />
                                                                    <Text style={styles.reviewMenuText}>Edit</Text>
                                                                </TouchableOpacity>
                                                                <TouchableOpacity
                                                                    style={styles.reviewMenuItem}
                                                                    onPress={() => deleteMyComment(comment.id || comment._id)}
                                                                >
                                                                    <Ionicons name="trash-outline" size={14} color="#fecaca" />
                                                                    <Text style={styles.reviewMenuTextDanger}>Remove</Text>
                                                                </TouchableOpacity>
                                                            </View>
                                                        ) : null}
                                                        <Text style={styles.reviewComment}>{comment.text || "No written feedback"}</Text>
                                                        {comment.image ? (
                                                            <Image source={{ uri: resolveImageUrl(comment.image) }} style={styles.reviewPhoto} resizeMode="cover" />
                                                        ) : null}
                                                    </View>
                                                );
                                            })}
                                        </View>
                                        );
                                    })
                                )}
                            </View>
                        )}
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
    reviewHint: {
        color: "#94a3b8",
        fontSize: 12,
        marginBottom: 10,
    },
    starRow: {
        flexDirection: "row",
        gap: 10,
        marginBottom: 10,
    },
    reviewInput: {
        minHeight: 82,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.2)",
        backgroundColor: "#0b1220",
        color: "#f8fafc",
        paddingHorizontal: 10,
        paddingVertical: 10,
        textAlignVertical: "top",
        marginBottom: 10,
    },
    reviewActionRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 10,
    },
    reviewIconButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#1e293b",
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.2)",
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    reviewIconButtonMuted: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#475569",
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    reviewIconLabel: {
        color: "#f8fafc",
        fontSize: 12,
        fontWeight: "700",
    },
    reviewPreview: {
        width: "100%",
        height: 130,
        borderRadius: 10,
        marginBottom: 10,
        backgroundColor: "#111827",
    },
    reviewButton: {
        backgroundColor: "#ea580c",
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 11,
        marginBottom: 12,
    },
    reviewButtonDisabled: {
        opacity: 0.7,
    },
    reviewButtonText: {
        color: "#fff",
        fontWeight: "800",
    },
    reviewLoadingWrap: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    reviewLoadingText: {
        color: "#94a3b8",
        fontSize: 12,
    },
    reviewList: {
        gap: 8,
    },
    noReviews: {
        color: "#94a3b8",
        fontSize: 13,
    },
    reviewCard: {
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.18)",
        borderRadius: 12,
        backgroundColor: "#0b1220",
        padding: 10,
        gap: 6,
    },
    commentBlock: {
        borderTopWidth: 1,
        borderTopColor: "rgba(148, 163, 184, 0.16)",
        paddingTop: 8,
        marginTop: 6,
    },
    reviewHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 8,
    },
    reviewHeaderRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    reviewAuthor: {
        color: "#f8fafc",
        fontSize: 13,
        fontWeight: "700",
    },
    reviewMenuTrigger: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#1e293b",
    },
    reviewMenuBox: {
        marginTop: 6,
        marginBottom: 6,
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.2)",
        backgroundColor: "#0f172a",
        borderRadius: 8,
        padding: 6,
        gap: 4,
        alignSelf: "flex-end",
    },
    reviewMenuItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 8,
        paddingVertical: 6,
    },
    reviewMenuText: {
        color: "#f8fafc",
        fontSize: 12,
        fontWeight: "700",
    },
    reviewMenuTextDanger: {
        color: "#fecaca",
        fontSize: 12,
        fontWeight: "700",
    },
    reviewStars: {
        color: "#fbbf24",
        fontSize: 12,
        fontWeight: "700",
    },
    reviewComment: {
        color: "#cbd5e1",
        fontSize: 13,
        lineHeight: 18,
    },
    reviewPhoto: {
        width: "100%",
        height: 120,
        borderRadius: 8,
        marginTop: 8,
        backgroundColor: "#111827",
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
