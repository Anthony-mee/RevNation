import React, { useEffect, useState } from "react";
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
import Toast from "react-native-toast-message";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useNavigation } from "@react-navigation/native";
import mime from "mime";
import { Ionicons } from "@expo/vector-icons";
import baseURL from "../../assets/common/baseurl";
import Input from "../../Shared/Input";
import EasyButton from "../../Shared/StyledComponents/EasyButton";
import Error from "../../Shared/Error";
import { FALLBACK_IMAGE, resolveImageUrl } from "../../assets/common/imageUrl";

const ServiceForm = (props) => {
    const returnScreen = props.route?.params?.returnScreen || "Services";
    const [name, setName] = useState("");
    const [price, setPrice] = useState("");
    const [description, setDescription] = useState("");
    const [richDescription, setRichDescription] = useState("");
    const [duration, setDuration] = useState("");
    const [image, setImage] = useState("");
    const [mainImage, setMainImage] = useState("");
    const [token, setToken] = useState("");
    const [error, setError] = useState("");
    const [item, setItem] = useState(null);
    const [isFeatured, setIsFeatured] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [imagePicked, setImagePicked] = useState(false);
    const navigation = useNavigation();
    const { width } = useWindowDimensions();

    const isDesktop = width >= 980;

    useEffect(() => {
        if (props.route?.params?.item) {
            const currentItem = props.route.params.item;
            setItem(currentItem);
            setName(currentItem.name || "");
            setPrice(String(currentItem.price ?? ""));
            setDescription(currentItem.description || "");
            setRichDescription(currentItem.richDescription || "");
            setDuration(currentItem.duration || "");
            setMainImage(currentItem.image || "");
            setImage(currentItem.image || "");
            setIsFeatured(Boolean(currentItem.isFeatured));
        } else {
            setItem(null);
        }

        AsyncStorage.getItem("jwt").then((res) => setToken(res || "")).catch(() => {});

        if (Platform.OS !== "web") {
            ImagePicker.requestCameraPermissionsAsync().then(({ status }) => {
                if (status !== "granted") {
                    alert("Camera permission needed.");
                }
            });
        }
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

    const saveService = async () => {
        if (isSubmitting) return;
        if (!name || !price) {
            setError("Please fill in the service name and price");
            return;
        }

        setIsSubmitting(true);
        const formData = new FormData();
        formData.append("name", name);
        formData.append("price", price);
        formData.append("description", description);
        formData.append("richDescription", richDescription);
        formData.append("duration", duration);
        formData.append("isFeatured", isFeatured);

        if (imagePicked && image) {
            if (Platform.OS === "web") {
                try {
                    const response = await fetch(image);
                    const blob = await response.blob();
                    const fileName = `service-${Date.now()}.jpg`;
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
                    name: normalizedImageUri.split("/").pop() || `service-${Date.now()}.jpg`,
                });
            }
        }

        const config = {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        };

        const serviceId = item?.id ?? item?._id;

        const handleError = (err) => {
            const responseData = err?.response?.data;
            const message =
                (typeof responseData === "string" && responseData.includes("MulterError"))
                    ? "Image is too large. Please choose a smaller photo."
                    : err?.response?.data?.message || err?.message || "Something went wrong";
            Toast.show({ topOffset: 60, type: "error", text1: message });
        };

        const handleSuccess = () => {
            Toast.show({
                topOffset: 60,
                type: "success",
                text1: serviceId ? "Service updated" : "Service added",
            });
            setTimeout(() => navigation.navigate(returnScreen), 500);
        };

        const submitNativeMultipart = async () => {
            try {
                const method = serviceId ? "PUT" : "POST";
                const url = serviceId ? `${baseURL}services/${serviceId}` : `${baseURL}services`;
                const res = await fetch(url, {
                    method,
                    headers: {
                        Authorization: `Bearer ${token}`,
                        // Let fetch set the multipart boundary.
                    },
                    body: formData,
                });

                const text = await res.text();
                let data = null;
                try { data = JSON.parse(text); } catch (_e) { data = text; }

                console.log("[ServiceForm] Success:", res.status, data);
                if (res.status === 200 || res.status === 201) {
                    handleSuccess();
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
                console.log("[ServiceForm] Error:", err?.message || err);
                handleError(err);
            } finally {
                setIsSubmitting(false);
            }
        };

        if (Platform.OS === "web") {
            const request = serviceId
                ? axios.put(`${baseURL}services/${serviceId}`, formData, config)
                : axios.post(`${baseURL}services`, formData, config);

            request
                .then((res) => {
                    if (res.status === 200 || res.status === 201) {
                        handleSuccess();
                    }
                })
                .catch((err) => {
                    handleError(err);
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
                            <Text style={styles.pageTitle}>{item ? "Edit Service" : "Add New Service"}</Text>
                            <View style={styles.headerActions}>
                                <EasyButton medium secondary onPress={() => navigation.navigate(returnScreen)}>
                                    <Text style={styles.headerBtnText}>Cancel</Text>
                                </EasyButton>
                                <EasyButton medium primary onPress={saveService} disabled={isSubmitting}>
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
                            <Input label="Service Name" placeholder="Enter service name" value={name} onChangeText={setName} />
                            <Input label="Price" placeholder="0.00" value={price} keyboardType="numeric" onChangeText={setPrice} />
                            <Input label="Duration" placeholder="e.g. 60 minutes" value={duration} onChangeText={setDuration} />

                            <Text style={styles.fieldLabel}>Description</Text>
                            <TextInput
                                style={styles.textArea}
                                value={description}
                                onChangeText={setDescription}
                                placeholder="Short service summary"
                                placeholderTextColor="#64748b"
                                multiline
                            />

                            <Text style={styles.fieldLabel}>Rich Description</Text>
                            <TextInput
                                style={styles.textArea}
                                value={richDescription}
                                onChangeText={setRichDescription}
                                placeholder="Detailed scope, benefits, or notes"
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
                            <Text style={styles.imageHint}>Use a clean service cover or portfolio image.</Text>
                        </View>

                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Visibility</Text>
                            <View style={styles.featuredRow}>
                                <Text style={styles.fieldLabel}>Featured Service</Text>
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
                                    <Text style={styles.previewName} numberOfLines={1}>{name || "Service Name"}</Text>
                                    <Text style={styles.previewPrice}>${Number(price || 0).toFixed(2)}</Text>
                                </View>
                                <Text style={styles.previewMeta}>{duration || "Flexible duration"}</Text>
                                <Text style={styles.previewDesc} numberOfLines={4}>{description || "Service description preview will appear here."}</Text>
                                <View style={styles.previewTagRow}>
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
});

export default ServiceForm;