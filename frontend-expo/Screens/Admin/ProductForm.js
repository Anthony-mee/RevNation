import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    Image,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    Platform,
    ActivityIndicator,
    ScrollView,
    useWindowDimensions,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import Input from "../../Shared/Input";
import EasyButton from "../../Shared/StyledComponents/EasyButton";
import Toast from "react-native-toast-message";
import AsyncStorage from "@react-native-async-storage/async-storage";
import baseURL from "../../assets/common/baseurl";
import Error from "../../Shared/Error";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useNavigation } from "@react-navigation/native";
import mime from "mime";
import { Ionicons } from "@expo/vector-icons";
import { FALLBACK_IMAGE, resolveImageUrl } from "../../assets/common/imageUrl";

const ProductForm = (props) => {
    const routeProductType = props.route?.params?.productType === "resell" ? "resell" : "shop";
    const returnScreen = props.route?.params?.returnScreen || "Products";
    const [pickerValue, setPickerValue] = useState("");
    const [brand, setBrand] = useState("");
    const [name, setName] = useState("");
    const [price, setPrice] = useState("");
    const [description, setDescription] = useState("");
    const [image, setImage] = useState("");
    const [mainImage, setMainImage] = useState("");
    const [category, setCategory] = useState("");
    const [categories, setCategories] = useState([]);
    const [token, setToken] = useState("");
    const [error, setError] = useState("");
    const [countInStock, setCountInStock] = useState("");
    const [rating, setRating] = useState(0);
    const [isFeatured, setIsFeatured] = useState(false);
    const [richDescription, setRichDescription] = useState("");
    const [numReviews, setNumReviews] = useState(0);
    const [item, setItem] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [imagePicked, setImagePicked] = useState(false);
    const [loadingCategories, setLoadingCategories] = useState(true);
    const navigation = useNavigation();
    const { width } = useWindowDimensions();

    const hasCategories = categories.length > 0;
    const isDesktop = width >= 980;

    useEffect(() => {
        if (props.route?.params?.item) {
            const i = props.route.params.item;
            setItem(i);
            setBrand(i.brand || "");
            setName(i.name || "");
            setPrice(String(i.price ?? ""));
            setDescription(i.description || "");
            setRichDescription(i.richDescription || "");
            setMainImage(i.image || "");
            setImage(i.image || "");
            const catId = i.category?._id || i.category?.id || "";
            setCategory(catId);
            setPickerValue(catId);
            setCountInStock(String(i.countInStock ?? ""));
            setRating(String(i.rating ?? 0));
            setNumReviews(String(i.numReviews ?? 0));
            setIsFeatured(Boolean(i.isFeatured));
            setImagePicked(false);
            setError("");
        } else {
            setItem(null);
            setBrand("");
            setName("");
            setPrice("");
            setDescription("");
            setRichDescription("");
            setImage("");
            setMainImage("");
            setCategory("");
            setPickerValue("");
            setCountInStock("");
            setRating("0");
            setNumReviews("0");
            setIsFeatured(false);
            setImagePicked(false);
            setError("");
        }
        AsyncStorage.getItem("jwt").then((res) => setToken(res || "")).catch(() => {});
        setLoadingCategories(true);
        axios
            .get(`${baseURL}categories`)
            .then((res) => {
                const nextCategories = Array.isArray(res.data) ? res.data : [];
                setCategories(nextCategories);

                if (!props.route?.params?.item && nextCategories.length > 0) {
                    const firstCategoryId = nextCategories[0].id || nextCategories[0]._id;
                    setCategory(firstCategoryId);
                    setPickerValue(firstCategoryId);
                }
            })
            .catch(() => {
                setCategories([]);
                Toast.show({
                    topOffset: 60,
                    type: "error",
                    text1: "Error loading categories",
                });
            })
            .finally(() => setLoadingCategories(false));
        if (Platform.OS !== "web") {
            ImagePicker.requestCameraPermissionsAsync().then(({ status }) => {
                if (status !== "granted") alert("Camera roll permission needed.");
            });
        }
        return () => setCategories([]);
    }, [props.route?.params]);

    const optimizeImageForUpload = async (uri) => {
        try {
            const result = await ImageManipulator.manipulateAsync(
                uri,
                [{ resize: { width: 1280 } }],
                {
                    compress: 0.72,
                    format: ImageManipulator.SaveFormat.JPEG,
                }
            );
            return result.uri;
        } catch (_error) {
            return uri;
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });
        if (!result.canceled) {
            const rawUri = result.assets[0].uri;
            const uri = await optimizeImageForUpload(rawUri);
            setMainImage(uri);
            setImage(uri);
            setImagePicked(true);
        }
    };

    const takePhoto = async () => {
        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });
        if (!result.canceled) {
            const rawUri = result.assets[0].uri;
            const uri = await optimizeImageForUpload(rawUri);
            setMainImage(uri);
            setImage(uri);
            setImagePicked(true);
        }
    };

    const addProduct = async () => {
        if (isSubmitting) return;
        if (!hasCategories) {
            setError("Create a category first before adding products");
            Toast.show({
                topOffset: 60,
                type: "error",
                text1: "No categories found",
                text2: "Open Categories and add one first",
            });
            return;
        }
        const priceVal = price === undefined || price === null || String(price).trim() === "" ? NaN : Number(price);
        const stockVal = countInStock === undefined || countInStock === null || String(countInStock).trim() === "" ? NaN : Number(countInStock);

        if (!name || !brand || !description || !category || Number.isNaN(priceVal) || Number.isNaN(stockVal)) {
            setError("Please fill in the form correctly");
            Toast.show({
                topOffset: 60,
                type: "error",
                text1: "Please fill in all required fields",
                text2: "Price and stock may be 0 but must be numeric",
            });
            return;
        }
        setIsSubmitting(true);
        const formData = new FormData();
        formData.append("name", name);
        formData.append("brand", brand);
        formData.append("price", price);
        formData.append("description", description);
        formData.append("category", category);
        formData.append("countInStock", countInStock);
        formData.append("richDescription", richDescription);
        formData.append("rating", rating);
        formData.append("numReviews", numReviews);
        formData.append("isFeatured", isFeatured);
        formData.append("productType", routeProductType);

        if (imagePicked && image) {
            if (Platform.OS === "web") {
                try {
                    const response = await fetch(image);
                    const blob = await response.blob();
                    const fileName = `product-${Date.now()}.jpg`;
                    formData.append("image", blob, fileName);
                } catch (_error) {
                    Toast.show({
                        topOffset: 60,
                        type: "error",
                        text1: "Image processing failed",
                        text2: "Please select the image again",
                    });
                    setIsSubmitting(false);
                    return;
                }
            } else {
                const normalizedImageUri = image.startsWith("file://")
                    ? image
                    : image.replace(/^file:\/*/, "file://");
                formData.append("image", {
                    uri: normalizedImageUri,
                    type: mime.getType(normalizedImageUri) || "image/jpeg",
                    name: normalizedImageUri.split("/").pop() || `product-${Date.now()}.jpg`,
                });
            }
        }

        // Log all FormData keys/values for debugging
        if (formData && formData._parts) {
            console.log('[ProductForm] FormData keys:', formData._parts.map(([k, v]) => k));
        }
        // Only set Content-Type for web; let axios set it for native
        const config = {
            headers: {
                Authorization: "Bearer " + token,
                ...(Platform.OS === 'web' ? { 'Content-Type': 'multipart/form-data' } : {}),
            },
        };
        const productId = item?.id ?? item?._id;
        const thenNav = () => {
            Toast.show({ topOffset: 60, type: "success", text1: productId ? "Product updated" : "Product added" });
            setTimeout(() => navigation.navigate(returnScreen), 500);
        };
        const catchErr = (err) => {
            console.log('ProductForm error:', err?.response?.data || err?.message || err);
            const responseData = err?.response?.data;
            const msg =
                (typeof responseData === "string" && responseData.includes("MulterError"))
                    ? "Image is too large. Please choose a smaller photo."
                    : err?.response?.data?.message || err?.message || "Something went wrong";
            Toast.show({ topOffset: 60, type: "error", text1: msg });
        };
        const url = productId ? `${baseURL}products/${productId}` : `${baseURL}products`;
        console.log('[ProductForm] Submitting to:', url);
        console.log('[ProductForm] Config:', config);
        console.log('[ProductForm] FormData:', formData);
        // On Android/Expo Go, axios + multipart FormData can throw ERR_NETWORK even when the API is reachable.
        // Use fetch for native multipart uploads; keep axios for web.
        const submitNativeMultipart = async () => {
            try {
                const method = productId ? "PUT" : "POST";
                const res = await fetch(url, {
                    method,
                    headers: {
                        Authorization: "Bearer " + token,
                        // Do NOT set Content-Type; fetch will add the correct multipart boundary.
                    },
                    body: formData,
                });

                const text = await res.text();
                let data = null;
                try { data = JSON.parse(text); } catch (_e) { data = text; }

                console.log("[ProductForm] Success:", res.status, data);
                if (res.status === 200 || res.status === 201) {
                    thenNav();
                    return;
                }

                const message =
                    (data && typeof data === "object" && data.message)
                        ? data.message
                        : (typeof data === "string" && data.trim())
                            ? data
                            : `Request failed (${res.status})`;
                throw new Error(message);
            } catch (err) {
                console.log("[ProductForm] Error details:", {
                    url,
                    config,
                    error: err?.message || err,
                });
                catchErr(err);
            } finally {
                setIsSubmitting(false);
            }
        };

        if (Platform.OS === "web") {
            const request = productId
                ? axios.put(url, formData, config)
                : axios.post(url, formData, config);

            request
                .then((res) => {
                    console.log('[ProductForm] Success:', res?.status, res?.data);
                    (res.status === 200 || res.status === 201) && thenNav();
                })
                .catch((err) => {
                    console.log('[ProductForm] Error details:', {
                        url,
                        config,
                        error: err?.toJSON ? err.toJSON() : err,
                        response: err?.response,
                    });
                    catchErr(err);
                })
                .finally(() => setIsSubmitting(false));
        } else {
            submitNativeMultipart();
        }
    };

    const previewImageUri = mainImage
        ? mainImage
        : item?.image
            ? resolveImageUrl(item.image)
            : FALLBACK_IMAGE;

    return (
        <View style={styles.screen}>
            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
                <View style={[styles.layout, isDesktop && styles.layoutDesktop]}>
                    <View style={[styles.formPane, isDesktop && styles.formPaneDesktop]}>
                        <View style={styles.headerRow}>
                            <Text style={styles.pageTitle}>{item ? "Edit Product" : "Add New Product"}</Text>
                            <View style={styles.headerActions}>
                                <EasyButton medium secondary onPress={() => navigation.navigate(returnScreen)}>
                                    <Text style={styles.headerBtnText}>Cancel</Text>
                                </EasyButton>
                                <EasyButton
                                    medium
                                    primary
                                    onPress={addProduct}
                                    disabled={isSubmitting || loadingCategories || !hasCategories}
                                >
                                    {isSubmitting ? (
                                        <ActivityIndicator color="white" size="small" />
                                    ) : (
                                        <Text style={styles.headerBtnText}>{item ? "Update" : "Publish"}</Text>
                                    )}
                                </EasyButton>
                            </View>
                        </View>

                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Base Information</Text>
                            <Input label="Title" placeholder="Product title" value={name} onChangeText={setName} />
                            <Input label="Brand" placeholder="Brand name" value={brand} onChangeText={setBrand} />

                            <Text style={styles.fieldLabel}>Description</Text>
                            <TextInput
                                style={styles.textArea}
                                value={description}
                                onChangeText={setDescription}
                                placeholder="Short product description"
                                placeholderTextColor="#64748b"
                                multiline
                            />

                            <Text style={styles.fieldLabel}>Rich Description</Text>
                            <TextInput
                                style={styles.textArea}
                                value={richDescription}
                                onChangeText={setRichDescription}
                                placeholder="Detailed specs, materials, notes"
                                placeholderTextColor="#64748b"
                                multiline
                            />
                        </View>

                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Pictures</Text>
                            <View style={styles.imageSectionRow}>
                                <Image source={{ uri: previewImageUri }} style={styles.imagePreview} resizeMode="cover" />
                                <View style={styles.imageActionsCol}>
                                    <TouchableOpacity onPress={pickImage} style={styles.imageActionBtn}>
                                        <Ionicons name="images-outline" size={18} color="#f8fafc" />
                                        <Text style={styles.imageActionText}>Gallery</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={takePhoto} style={styles.imageActionBtnSecondary}>
                                        <Ionicons name="camera-outline" size={18} color="#f8fafc" />
                                        <Text style={styles.imageActionText}>Camera</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <Text style={styles.imageHint}>Use clear, front-facing product photos.</Text>
                        </View>

                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Details</Text>
                            <View style={styles.inlineRow}>
                                <View style={styles.inlineItem}>
                                    <Input label="Price" placeholder="0.00" value={price} keyboardType="numeric" onChangeText={setPrice} />
                                </View>
                                <View style={styles.inlineItem}>
                                    <Input label="Stock" placeholder="0" value={countInStock} keyboardType="numeric" onChangeText={setCountInStock} />
                                </View>
                            </View>

                            <View style={styles.inlineRow}>
                                <View style={styles.inlineItem}>
                                    <Input label="Rating" placeholder="0" value={String(rating)} keyboardType="numeric" onChangeText={setRating} />
                                </View>
                                <View style={styles.inlineItem}>
                                    <Input label="Reviews" placeholder="0" value={String(numReviews)} keyboardType="numeric" onChangeText={setNumReviews} />
                                </View>
                            </View>

                            <View style={styles.pickerSection}>
                                <Text style={styles.fieldLabel}>Category</Text>
                                {loadingCategories ? (
                                    <ActivityIndicator color="#ea580c" size="small" style={styles.categoryLoading} />
                                ) : hasCategories ? (
                                    <Picker
                                        style={styles.picker}
                                        itemStyle={styles.pickerItem}
                                        selectedValue={pickerValue}
                                        onValueChange={(e) => { setPickerValue(e); setCategory(e); }}
                                    >
                                        {categories.map((c) => (
                                            <Picker.Item key={c.id || c._id} label={c.name} value={c.id || c._id} />
                                        ))}
                                    </Picker>
                                ) : (
                                    <View style={styles.emptyCategoryState}>
                                        <Text style={styles.emptyCategoryText}>No categories yet. Add one before creating a product.</Text>
                                        <EasyButton medium secondary onPress={() => navigation.navigate("Categories") }>
                                            <Text style={styles.buttonText}>Open Categories</Text>
                                        </EasyButton>
                                    </View>
                                )}
                            </View>

                            <View style={styles.featuredRow}>
                                <Text style={styles.fieldLabel}>Featured Product</Text>
                                <TouchableOpacity
                                    style={[styles.featuredToggle, isFeatured && styles.featuredToggleOn]}
                                    onPress={() => setIsFeatured((prev) => !prev)}
                                >
                                    <Ionicons name={isFeatured ? "checkmark-circle" : "ellipse-outline"} size={18} color="#f8fafc" />
                                    <Text style={styles.featuredToggleText}>{isFeatured ? "Enabled" : "Disabled"}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {error ? <Error message={error} /> : null}
                    </View>

                    <View style={[styles.previewPane, isDesktop && styles.previewPaneDesktop]}>
                        <View style={styles.previewCard}>
                            <Text style={styles.previewTitle}>Preview</Text>
                            <Image source={{ uri: previewImageUri }} style={styles.previewHeroImage} resizeMode="cover" />
                            <View style={styles.previewBody}>
                                <View style={styles.previewTopRow}>
                                    <Text style={styles.previewName} numberOfLines={1}>{name || "Product Name"}</Text>
                                    <Text style={styles.previewPrice}>${Number(price || 0).toFixed(2)}</Text>
                                </View>
                                <Text style={styles.previewMeta}>{brand || "Brand"}</Text>
                                <Text style={styles.previewDesc} numberOfLines={4}>{description || "Product description preview will appear here."}</Text>
                                <View style={styles.previewTagRow}>
                                    <View style={styles.previewTag}><Text style={styles.previewTagText}>Stock: {countInStock || 0}</Text></View>
                                    <View style={styles.previewTag}><Text style={styles.previewTagText}>{isFeatured ? "Featured" : "Standard"}</Text></View>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: "#080c17",
    },
    container: {
        padding: 16,
    },
    layout: {
        gap: 14,
    },
    layoutDesktop: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    formPane: {
        gap: 12,
    },
    formPaneDesktop: {
        flex: 1.4,
    },
    previewPane: {
        width: "100%",
    },
    previewPaneDesktop: {
        flex: 1,
    },
    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 8,
        marginBottom: 2,
    },
    pageTitle: {
        color: "#f8fafc",
        fontSize: 30,
        fontWeight: "800",
    },
    headerActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    headerBtnText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 13,
    },
    card: {
        backgroundColor: "#111827",
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.18)",
        borderRadius: 16,
        padding: 14,
    },
    cardTitle: {
        color: "#f8fafc",
        fontSize: 22,
        fontWeight: "700",
        marginBottom: 10,
    },
    fieldLabel: {
        color: "#e2e8f0",
        fontSize: 13,
        fontWeight: "600",
        marginBottom: 8,
        marginLeft: 4,
    },
    textArea: {
        minHeight: 96,
        backgroundColor: "#131927",
        color: "#f8fafc",
        borderWidth: 1.5,
        borderColor: "rgba(234, 88, 12, 0.2)",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 12,
        textAlignVertical: "top",
        fontSize: 14,
        lineHeight: 20,
    },
    imageSectionRow: {
        flexDirection: "row",
        gap: 12,
        alignItems: "center",
    },
    imagePreview: {
        width: 140,
        height: 140,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.25)",
        backgroundColor: "#0b1220",
    },
    imageActionsCol: {
        flex: 1,
        gap: 8,
    },
    imageActionBtn: {
        backgroundColor: "#ea580c",
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        justifyContent: "center",
    },
    imageActionBtnSecondary: {
        backgroundColor: "#1e293b",
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.25)",
    },
    imageActionText: {
        color: "#f8fafc",
        fontWeight: "600",
    },
    imageHint: {
        color: "#94a3b8",
        marginTop: 10,
        fontSize: 12,
    },
    inlineRow: {
        flexDirection: "row",
        gap: 10,
    },
    inlineItem: {
        flex: 1,
    },
    pickerSection: {
        width: "100%",
        marginTop: 4,
    },
    picker: {
        height: 54,
        width: "100%",
        color: "#f8fafc",
        backgroundColor: "#131927",
        borderWidth: 1.5,
        borderColor: "rgba(234, 88, 12, 0.2)",
        borderRadius: 12,
    },
    pickerItem: {
        color: "#f8fafc",
        backgroundColor: "#131927",
    },
    categoryLoading: {
        marginVertical: 24,
    },
    emptyCategoryState: {
        width: "100%",
        alignSelf: "center",
        backgroundColor: "#131927",
        borderRadius: 12,
        padding: 16,
        alignItems: "center",
        gap: 12,
    },
    emptyCategoryText: {
        color: "#f1f5f9",
        textAlign: "center",
    },
    featuredRow: {
        marginTop: 6,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    featuredToggle: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#1e293b",
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.25)",
        borderRadius: 10,
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    featuredToggleOn: {
        backgroundColor: "#0f766e",
        borderColor: "rgba(45, 212, 191, 0.45)",
    },
    featuredToggleText: {
        color: "#f8fafc",
        fontWeight: "600",
    },
    previewCard: {
        backgroundColor: "#111827",
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.18)",
        borderRadius: 16,
        overflow: "hidden",
    },
    previewTitle: {
        color: "#f8fafc",
        fontSize: 20,
        fontWeight: "700",
        padding: 14,
        paddingBottom: 6,
    },
    previewHeroImage: {
        width: "100%",
        height: 230,
        backgroundColor: "#0b1220",
    },
    previewBody: {
        padding: 14,
    },
    previewTopRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 10,
        marginBottom: 4,
    },
    previewName: {
        color: "#f8fafc",
        fontSize: 18,
        fontWeight: "700",
        flex: 1,
    },
    previewPrice: {
        color: "#fb923c",
        fontSize: 18,
        fontWeight: "800",
    },
    previewMeta: {
        color: "#94a3b8",
        marginBottom: 8,
        fontSize: 13,
    },
    previewDesc: {
        color: "#cbd5e1",
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 10,
    },
    previewTagRow: {
        flexDirection: "row",
        gap: 8,
    },
    previewTag: {
        backgroundColor: "#0b1220",
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.2)",
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    previewTagText: {
        color: "#f8fafc",
        fontSize: 12,
        fontWeight: "600",
    },
    buttonText: {
        color: "white",
        fontWeight: "700",
        fontSize: 14,
    },
});

export default ProductForm;
