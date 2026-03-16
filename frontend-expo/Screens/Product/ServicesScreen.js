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
    Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Searchbar } from "react-native-paper";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { jwtDecode } from "jwt-decode";
import Toast from "react-native-toast-message";
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
    const [expandedServiceId, setExpandedServiceId] = useState("");
    const [serviceReviews, setServiceReviews] = useState({});
    const [reviewLoadingByService, setReviewLoadingByService] = useState({});
    const [reviewRatingByService, setReviewRatingByService] = useState({});
    const [reviewCommentByService, setReviewCommentByService] = useState({});
    const [reviewImageByService, setReviewImageByService] = useState({});
    const [submittingServiceId, setSubmittingServiceId] = useState("");
    const [currentUserId, setCurrentUserId] = useState("");
    const [openReviewMenuByService, setOpenReviewMenuByService] = useState({});
    const [editingCommentByService, setEditingCommentByService] = useState({});

    useFocusEffect(
        useCallback(() => {
            AsyncStorage.getItem("jwt")
                .then((token) => {
                    if (!token) return;
                    const decoded = jwtDecode(token);
                    setCurrentUserId(String(decoded?.userId || ""));
                })
                .catch(() => setCurrentUserId(""));
        }, [])
    );

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

    const getServiceId = (service) => String(service?.id || service?._id || "");

    const loadServiceReviews = async (serviceId) => {
        if (!serviceId) return;
        setReviewLoadingByService((prev) => ({ ...prev, [serviceId]: true }));
        try {
            const res = await axios.get(`${baseURL}services/${serviceId}/reviews`);
            setServiceReviews((prev) => ({
                ...prev,
                [serviceId]: Array.isArray(res.data) ? res.data : [],
            }));
        } catch (_error) {
            setServiceReviews((prev) => ({ ...prev, [serviceId]: [] }));
        } finally {
            setReviewLoadingByService((prev) => ({ ...prev, [serviceId]: false }));
        }
    };

    const toggleReviewPanel = async (service) => {
        const serviceId = getServiceId(service);
        if (!serviceId) return;

        if (expandedServiceId === serviceId) {
            setExpandedServiceId("");
            return;
        }

        setExpandedServiceId(serviceId);
        if (!serviceReviews[serviceId]) {
            await loadServiceReviews(serviceId);
        }
    };

    const submitServiceReview = async (service) => {
        const serviceId = getServiceId(service);
        const rating = Number(reviewRatingByService[serviceId] || 5);
        const comment = String(reviewCommentByService[serviceId] || "").trim();
        const reviewImageUri = reviewImageByService[serviceId] || "";
        const ownReviewExists = (serviceReviews[serviceId] || []).some(
            (review) => String(review?.user?.id || review?.user?._id || "") === currentUserId
        );
        const editingRef = editingCommentByService[serviceId] || null;

        const buildPayload = async () => {
            const payload = new FormData();
            if (!ownReviewExists) {
                payload.append("rating", String(rating));
            }
            payload.append("comment", comment);
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
            if (editingRef?.hadImage && !reviewImageUri) {
                payload.append("removeImage", "true");
            }
            return payload;
        };

        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
            Toast.show({ topOffset: 60, type: "error", text1: "Rating must be from 1 to 5" });
            return;
        }

        const token = await AsyncStorage.getItem("jwt");
        if (!token) {
            Toast.show({ topOffset: 60, type: "error", text1: "Please login to review" });
            return;
        }

        setSubmittingServiceId(serviceId);
        const config = {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "multipart/form-data",
            },
        };

        try {
            if (editingRef?.commentId) {
                await axios.put(`${baseURL}services/${serviceId}/reviews/me/comments/${editingRef.commentId}`, await buildPayload(), config);
                Toast.show({ topOffset: 60, type: "success", text1: "Comment updated" });
            } else if (ownReviewExists) {
                await axios.post(`${baseURL}services/${serviceId}/reviews/me/comments`, await buildPayload(), config);
                Toast.show({ topOffset: 60, type: "success", text1: "Comment added" });
            } else {
                await axios.post(`${baseURL}services/${serviceId}/reviews`, await buildPayload(), config);
                Toast.show({ topOffset: 60, type: "success", text1: "Review submitted" });
            }
            setReviewCommentByService((prev) => ({ ...prev, [serviceId]: "" }));
            setReviewImageByService((prev) => ({ ...prev, [serviceId]: "" }));
            setEditingCommentByService((prev) => ({ ...prev, [serviceId]: null }));
            await loadServiceReviews(serviceId);
        } catch (error) {
            const status = error?.response?.status;
            if (status === 409 && !ownReviewExists) {
                Toast.show({ topOffset: 60, type: "error", text1: "Rating can only be submitted once", text2: "You can still add more comments." });
            } else if (status === 403) {
                Toast.show({
                    topOffset: 60,
                    type: "error",
                    text1: "Verified purchase required",
                    text2: "Only shipped/delivered buyers can review.",
                });
            } else {
                Toast.show({ topOffset: 60, type: "error", text1: "Could not submit review" });
            }
        } finally {
            setSubmittingServiceId("");
        }
    };

    const pickServiceReviewImage = async (serviceId, mode) => {
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
                    setReviewImageByService((prev) => ({ ...prev, [serviceId]: result.assets[0].uri }));
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
                setReviewImageByService((prev) => ({ ...prev, [serviceId]: result.assets[0].uri }));
            }
        } catch (_error) {
            Toast.show({ topOffset: 60, type: "error", text1: "Could not attach image" });
        }
    };

    const deleteMyServiceComment = async (serviceId, commentId) => {
        const token = await AsyncStorage.getItem("jwt");
        if (!token) {
            Toast.show({ topOffset: 60, type: "error", text1: "Please login first" });
            return;
        }

        setSubmittingServiceId(serviceId);
        try {
            if (!commentId) {
                Toast.show({ topOffset: 60, type: "error", text1: "Select a comment from the 3-dot menu first" });
                return;
            }

            await axios.delete(`${baseURL}services/${serviceId}/reviews/me/comments/${commentId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setReviewCommentByService((prev) => ({ ...prev, [serviceId]: "" }));
            setReviewImageByService((prev) => ({ ...prev, [serviceId]: "" }));
            setReviewRatingByService((prev) => ({ ...prev, [serviceId]: 5 }));
            setEditingCommentByService((prev) => ({ ...prev, [serviceId]: null }));
            Toast.show({ topOffset: 60, type: "success", text1: "Comment removed" });
            await loadServiceReviews(serviceId);
        } catch (error) {
            const status = error?.response?.status;
            if (status === 404) {
                Toast.show({ topOffset: 60, type: "error", text1: "No review found to remove" });
            } else {
                Toast.show({ topOffset: 60, type: "error", text1: "Could not remove review" });
            }
        } finally {
            setSubmittingServiceId("");
        }
    };

    const startEditingServiceComment = (serviceId, comment, ratingValue) => {
        const image = comment?.image ? resolveImageUrl(comment.image) : "";
        setReviewRatingByService((prev) => ({ ...prev, [serviceId]: Number(ratingValue || 5) }));
        setReviewCommentByService((prev) => ({ ...prev, [serviceId]: String(comment?.text || "") }));
        setReviewImageByService((prev) => ({ ...prev, [serviceId]: image }));
        setEditingCommentByService((prev) => ({
            ...prev,
            [serviceId]: { commentId: comment?.id || comment?._id, hadImage: Boolean(image) },
        }));
        setOpenReviewMenuByService((prev) => ({ ...prev, [serviceId]: "" }));
    };

    const startEditingServiceReview = (serviceId, review) => {
        setReviewRatingByService((prev) => ({ ...prev, [serviceId]: Number(review?.rating || 5) }));
        setReviewCommentByService((prev) => ({ ...prev, [serviceId]: String(review?.comment || "") }));
        setReviewImageByService((prev) => ({
            ...prev,
            [serviceId]: review?.image ? resolveImageUrl(review.image) : "",
        }));
        setOpenReviewMenuByService((prev) => ({ ...prev, [serviceId]: "" }));
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
                            <View style={styles.serviceRatingRow}>
                                <Ionicons name="star" size={13} color="#fbbf24" />
                                <Text style={styles.serviceRatingText}>{Number(item.rating || 0).toFixed(1)}</Text>
                                <Text style={styles.serviceRatingCount}>• {Number(item.numReviews || 0)} reviews</Text>
                            </View>
                            <Text style={styles.meta}>{item.duration || "Custom duration"}</Text>
                            <Text style={styles.description}>{item.description || "No description available yet."}</Text>
                            {item.isFeatured ? (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>Featured</Text>
                                </View>
                            ) : null}

                            <TouchableOpacity
                                style={styles.reviewToggleButton}
                                onPress={() => toggleReviewPanel(item)}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.reviewToggleText}>
                                    {expandedServiceId === getServiceId(item) ? "Hide Reviews" : "View / Add Review"}
                                </Text>
                            </TouchableOpacity>

                            {expandedServiceId === getServiceId(item) ? (
                                <View style={styles.reviewPanel}>
                                    {(() => {
                                        const serviceId = getServiceId(item);
                                        const ownReviewExists = (serviceReviews[serviceId] || []).some(
                                            (review) => String(review?.user?.id || review?.user?._id || "") === currentUserId
                                        );
                                        return (
                                            <>
                                    <View style={styles.starRow}>
                                        {[1, 2, 3, 4, 5].map((star) => {
                                            const selected = Number(reviewRatingByService[serviceId] || 5);
                                            return (
                                                <TouchableOpacity
                                                    key={star}
                                                    onPress={() => setReviewRatingByService((prev) => ({ ...prev, [serviceId]: star }))}
                                                >
                                                    <Ionicons
                                                        name={selected >= star ? "star" : "star-outline"}
                                                        size={20}
                                                        color={selected >= star ? "#fbbf24" : "#64748b"}
                                                    />
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>

                                    <TextInput
                                        style={styles.reviewInput}
                                        multiline
                                        numberOfLines={3}
                                        value={reviewCommentByService[getServiceId(item)] || ""}
                                        onChangeText={(value) => setReviewCommentByService((prev) => ({
                                            ...prev,
                                            [getServiceId(item)]: value,
                                        }))}
                                        placeholder="Share your service experience..."
                                        placeholderTextColor="#64748b"
                                    />

                                    <View style={styles.reviewActionRow}>
                                        <TouchableOpacity
                                            style={styles.reviewIconButton}
                                            onPress={() => pickServiceReviewImage(getServiceId(item), "camera")}
                                        >
                                            <Ionicons name="camera-outline" size={18} color="#f8fafc" />
                                            <Text style={styles.reviewIconLabel}>Camera</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.reviewIconButton}
                                            onPress={() => pickServiceReviewImage(getServiceId(item), "gallery")}
                                        >
                                            <Ionicons name="image-outline" size={18} color="#f8fafc" />
                                            <Text style={styles.reviewIconLabel}>Photo</Text>
                                        </TouchableOpacity>
                                        {reviewImageByService[getServiceId(item)] ? (
                                            <TouchableOpacity
                                                style={styles.reviewIconButtonMuted}
                                                onPress={() => setReviewImageByService((prev) => ({ ...prev, [getServiceId(item)]: "" }))}
                                            >
                                                <Ionicons name="close-circle-outline" size={18} color="#f8fafc" />
                                                <Text style={styles.reviewIconLabel}>Remove Photo</Text>
                                            </TouchableOpacity>
                                        ) : null}
                                    </View>

                                    {reviewImageByService[getServiceId(item)] ? (
                                        <Image
                                            source={{ uri: reviewImageByService[getServiceId(item)] }}
                                            style={styles.reviewPreview}
                                            resizeMode="cover"
                                        />
                                    ) : null}

                                    <TouchableOpacity
                                        style={styles.reviewSubmitButton}
                                        onPress={() => submitServiceReview(item)}
                                        disabled={submittingServiceId === getServiceId(item)}
                                    >
                                        {submittingServiceId === getServiceId(item) ? (
                                            <ActivityIndicator size="small" color="#fff" />
                                        ) : (
                                            <Text style={styles.reviewSubmitText}>
                                                {editingCommentByService[serviceId] ? "Update Comment" : ownReviewExists ? "Add Comment" : "Submit Review"}
                                            </Text>
                                        )}
                                    </TouchableOpacity>

                                    {reviewLoadingByService[getServiceId(item)] ? (
                                        <Text style={styles.reviewLoading}>Loading reviews...</Text>
                                    ) : (
                                        <View style={styles.reviewList}>
                                            {(serviceReviews[getServiceId(item)] || []).length === 0 ? (
                                                <Text style={styles.noReviews}>No reviews yet.</Text>
                                            ) : (
                                                (serviceReviews[getServiceId(item)] || []).map((review) => {
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
                                                                        <View style={styles.reviewCardHeader}>
                                                                            <Text style={styles.reviewAuthor}>{review?.user?.name || "Customer"}</Text>
                                                                            <View style={styles.reviewCardHeaderRight}>
                                                                                <Text style={styles.reviewStars}>{"★".repeat(Number(review.rating || 0))}</Text>
                                                                                {mine ? (
                                                                                    <TouchableOpacity
                                                                                        style={styles.reviewMenuTrigger}
                                                                                        onPress={() => setOpenReviewMenuByService((prev) => ({
                                                                                            ...prev,
                                                                                            [serviceId]: prev[serviceId] === menuId ? "" : menuId,
                                                                                        }))}
                                                                                    >
                                                                                        <Ionicons name="ellipsis-vertical" size={16} color="#f8fafc" />
                                                                                    </TouchableOpacity>
                                                                                ) : null}
                                                                            </View>
                                                                        </View>
                                                                        {openReviewMenuByService[serviceId] === menuId ? (
                                                                            <View style={styles.reviewMenuBox}>
                                                                                <TouchableOpacity
                                                                                    style={styles.reviewMenuItem}
                                                                                    onPress={() => startEditingServiceComment(serviceId, comment, review.rating)}
                                                                                >
                                                                                    <Ionicons name="create-outline" size={14} color="#f8fafc" />
                                                                                    <Text style={styles.reviewMenuText}>Edit</Text>
                                                                                </TouchableOpacity>
                                                                                <TouchableOpacity
                                                                                    style={styles.reviewMenuItem}
                                                                                    onPress={() => deleteMyServiceComment(serviceId, comment.id || comment._id)}
                                                                                >
                                                                                    <Ionicons name="trash-outline" size={14} color="#fecaca" />
                                                                                    <Text style={styles.reviewMenuTextDanger}>Remove</Text>
                                                                                </TouchableOpacity>
                                                                            </View>
                                                                        ) : null}
                                                                        <Text style={styles.reviewBody}>{comment.text || "No written feedback"}</Text>
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
                                            </>
                                        );
                                    })()}
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
    serviceRatingRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: 6,
    },
    serviceRatingText: {
        color: "#fbbf24",
        fontSize: 13,
        fontWeight: "700",
    },
    serviceRatingCount: {
        color: "#94a3b8",
        fontSize: 12,
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
    reviewToggleButton: {
        marginTop: 12,
        alignSelf: "flex-start",
        backgroundColor: "#1e293b",
        borderWidth: 1,
        borderColor: "rgba(251, 146, 60, 0.3)",
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    reviewToggleText: {
        color: "#f8fafc",
        fontSize: 12,
        fontWeight: "700",
    },
    reviewPanel: {
        marginTop: 10,
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.2)",
        borderRadius: 12,
        backgroundColor: "#0b1220",
        padding: 10,
    },
    starRow: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 10,
    },
    reviewInput: {
        minHeight: 72,
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.2)",
        borderRadius: 10,
        color: "#f8fafc",
        backgroundColor: "#111827",
        paddingHorizontal: 10,
        paddingVertical: 8,
        textAlignVertical: "top",
    },
    reviewActionRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 10,
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
        marginTop: 10,
        backgroundColor: "#111827",
    },
    reviewSubmitButton: {
        marginTop: 10,
        backgroundColor: "#ea580c",
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
    },
    reviewSubmitText: {
        color: "#fff",
        fontWeight: "800",
        fontSize: 12,
    },
    reviewLoading: {
        marginTop: 10,
        color: "#94a3b8",
        fontSize: 12,
    },
    reviewList: {
        marginTop: 10,
        gap: 8,
    },
    noReviews: {
        color: "#94a3b8",
        fontSize: 12,
    },
    reviewCard: {
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.2)",
        borderRadius: 10,
        backgroundColor: "#111827",
        padding: 8,
    },
    commentBlock: {
        borderTopWidth: 1,
        borderTopColor: "rgba(148, 163, 184, 0.16)",
        paddingTop: 8,
        marginTop: 6,
    },
    reviewCardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 4,
        gap: 8,
    },
    reviewCardHeaderRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
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
    reviewAuthor: {
        color: "#f8fafc",
        fontSize: 12,
        fontWeight: "700",
    },
    reviewStars: {
        color: "#fbbf24",
        fontSize: 11,
        fontWeight: "700",
    },
    reviewBody: {
        color: "#cbd5e1",
        fontSize: 12,
        lineHeight: 17,
    },
    reviewPhoto: {
        width: "100%",
        height: 110,
        borderRadius: 8,
        marginTop: 8,
        backgroundColor: "#0b1220",
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