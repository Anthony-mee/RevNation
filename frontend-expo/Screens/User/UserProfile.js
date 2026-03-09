import React, { useContext, useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Ionicons } from "@expo/vector-icons";
import baseURL from "../../assets/common/baseurl";
import AuthGlobal from "../../Context/Store/AuthGlobal";
import { logoutUser } from "../../Context/Actions/Auth.actions";
import Input from "../../Shared/Input";
import Toast from "react-native-toast-message";
import AddressMapPicker from "../../Shared/AddressMapPicker";

const UserProfile = () => {
    const context = useContext(AuthGlobal);
    const [userProfile, setUserProfile] = useState("");
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [deliveryAddress1, setDeliveryAddress1] = useState("");
    const [deliveryAddress2, setDeliveryAddress2] = useState("");
    const [deliveryCity, setDeliveryCity] = useState("");
    const [deliveryZip, setDeliveryZip] = useState("");
    const [deliveryCountry, setDeliveryCountry] = useState("Philippines");
    const [deliveryLocation, setDeliveryLocation] = useState(null);
    const [mapVisible, setMapVisible] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [profileImage, setProfileImage] = useState("");
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const navigation = useNavigation();

    const requiredProfileFields = {
        phone: String(phone || "").trim(),
        deliveryAddress1: String(deliveryAddress1 || "").trim(),
        deliveryCity: String(deliveryCity || "").trim(),
        deliveryZip: String(deliveryZip || "").trim(),
        deliveryCountry: String(deliveryCountry || "").trim(),
    };
    const missingRequiredFields = Object.entries(requiredProfileFields)
        .filter(([, value]) => !value)
        .map(([key]) => key);
    const isCheckoutReady = missingRequiredFields.length === 0;

    const hydrateProfileForm = (profile) => {
        setUserProfile(profile);
        setName(profile?.name || "");
        setPhone(profile?.phone || "");
        setDeliveryAddress1(profile?.deliveryAddress1 || "");
        setDeliveryAddress2(profile?.deliveryAddress2 || "");
        setDeliveryCity(profile?.deliveryCity || "");
        setDeliveryZip(profile?.deliveryZip || "");
        setDeliveryCountry(profile?.deliveryCountry || "Philippines");
        setProfileImage(profile?.image || "");
        if (
            Number.isFinite(profile?.deliveryLocation?.latitude)
            && Number.isFinite(profile?.deliveryLocation?.longitude)
        ) {
            setDeliveryLocation({
                latitude: Number(profile.deliveryLocation.latitude),
                longitude: Number(profile.deliveryLocation.longitude),
            });
        } else {
            setDeliveryLocation(null);
        }
    };

    useFocusEffect(
        useCallback(() => {
            if (
                context.stateUser.isAuthenticated === false ||
                context.stateUser.isAuthenticated === null
            ) {
                navigation.navigate("User", { screen: "Login" });
                return;
            }
            AsyncStorage.getItem("jwt")
                .then((res) => {
                    axios
                        .get(`${baseURL}users/${context.stateUser.user.userId}`, {
                            headers: { Authorization: `Bearer ${res}` },
                        })
                        .then((user) => {
                            console.log("[UserProfile] Profile loaded:", {
                                name: user.data.name,
                                email: user.data.email,
                                image: user.data.image,
                                phone: user.data.phone,
                            });
                            hydrateProfileForm(user.data);
                        })
                        .catch((error) => console.error("[UserProfile] Load error:", error.message));
                })
                .catch((error) => console.error("[UserProfile] Auth error:", error.message));
            return () => setUserProfile("");
        }, [context.stateUser.isAuthenticated])
    );

    const onMapPicked = (picked) => {
        setMapVisible(false);
        setDeliveryLocation(picked.coordinate);
        setDeliveryAddress1(picked.address1 || "");
        setDeliveryCity(picked.city || "");
        setDeliveryZip(picked.zip || "");
        setDeliveryCountry(picked.country || "Philippines");
        Toast.show({
            topOffset: 60,
            type: "success",
            text1: "Location selected",
            text2: "Review details, then tap Save Profile",
        });
    };

    const saveProfile = async () => {
        try {
            setIsSaving(true);
            const jwt = await AsyncStorage.getItem("jwt");
            if (!jwt) {
                Toast.show({ topOffset: 60, type: "error", text1: "Session expired", text2: "Please login again" });
                return;
            }

            const payload = {
                name,
                phone,
                deliveryAddress1,
                deliveryAddress2,
                deliveryCity,
                deliveryZip,
                deliveryCountry,
                ...(deliveryLocation ? { deliveryLocation } : {}),
            };

            const response = await axios.put(`${baseURL}users/profile`, payload, {
                headers: { Authorization: `Bearer ${jwt}` },
            });

            hydrateProfileForm(response.data);
            Toast.show({ topOffset: 60, type: "success", text1: "Profile updated" });
        } catch (_error) {
            Toast.show({ topOffset: 60, type: "error", text1: "Failed to save profile" });
        } finally {
            setIsSaving(false);
        }
    };

    const handlePhotoSelect = () => {
        Alert.alert(
            "Update Profile Photo",
            "Choose an option",
            [
                { text: "Take Photo", onPress: takePhoto },
                { text: "Choose from Library", onPress: pickImage },
                { text: "Cancel", style: "cancel" }
            ],
            { cancelable: true }
        );
    };

    const takePhoto = async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== "granted") {
                Toast.show({
                    topOffset: 60,
                    type: "error",
                    text1: "Permission denied",
                    text2: "Camera access is required"
                });
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled) {
                await uploadPhoto(result.assets[0].uri);
            }
        } catch (error) {
            Toast.show({
                topOffset: 60,
                type: "error",
                text1: "Error",
                text2: "Failed to take photo"
            });
        }
    };

    const pickImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== "granted") {
                Toast.show({
                    topOffset: 60,
                    type: "error",
                    text1: "Permission denied",
                    text2: "Photo library access is required"
                });
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ["images"],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled) {
                await uploadPhoto(result.assets[0].uri);
            }
        } catch (error) {
            Toast.show({
                topOffset: 60,
                type: "error",
                text1: "Error",
                text2: "Failed to pick image"
            });
        }
    };

    const uploadPhoto = async (uri) => {
        try {
            setIsUploadingPhoto(true);
            const jwt = await AsyncStorage.getItem("jwt");
            if (!jwt) {
                Toast.show({ topOffset: 60, type: "error", text1: "Session expired" });
                setIsUploadingPhoto(false);
                return;
            }

            console.log("[uploadPhoto] Starting upload with URI:", uri);
            
            // Resize and convert to base64
            const manipResult = await ImageManipulator.manipulateAsync(
                uri,
                [{ resize: { width: 800 } }],
                { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
            );

            const fileName = uri.split("/").pop() || "photo.jpg";
            
            console.log("[uploadPhoto] Uploading to:", `${baseURL}users/profile/photo-base64`);

            const response = await axios.post(`${baseURL}users/profile/photo-base64`, 
                {
                    imageBase64: manipResult.base64,
                    fileName: fileName
                },
                {
                    headers: {
                        Authorization: `Bearer ${jwt}`,
                        "Content-Type": "application/json",
                    },
                    timeout: 30000,
                }
            );

            console.log("[uploadPhoto] Upload successful:", response.data);
            setProfileImage(response.data.image);
            Toast.show({
                topOffset: 60,
                type: "success",
                text1: "Photo updated successfully"
            });
        } catch (error) {
            console.error("[uploadPhoto] Error:", error.message, error.response?.data);
            Toast.show({
                topOffset: 60,
                type: "error",
                text1: "Failed to upload photo",
                text2: error.response?.data?.message || error.message
            });
        } finally {
            setIsUploadingPhoto(false);
        }
    };

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Profile Header Card */}
                <View style={styles.profileHeader}>
                    <View style={styles.avatarContainer}>
                        <TouchableOpacity onPress={handlePhotoSelect} activeOpacity={0.8}>
                            {profileImage ? (
                                <Image source={{ uri: profileImage }} style={styles.avatar} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Ionicons name="person" size={60} color="#94a3b8" />
                                </View>
                            )}
                            <View style={styles.cameraButton}>
                                {isUploadingPhoto ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Ionicons name="camera" size={18} color="#fff" />
                                )}
                            </View>
                        </TouchableOpacity>
                    </View>
                    
                    <Text style={styles.userName}>{name || "User Name"}</Text>
                    <Text style={styles.userEmail}>{userProfile?.email || ""}</Text>
                    
                    <View style={styles.badgesRow}>
                        {userProfile?.isAdmin && (
                            <View style={styles.adminBadge}>
                                <Ionicons name="shield-checkmark" size={14} color="#fff" />
                                <Text style={styles.adminBadgeText}>ADMIN</Text>
                            </View>
                        )}
                        <View style={[styles.statusBadge, isCheckoutReady ? styles.completeBadge : styles.incompleteBadge]}>
                            <Ionicons 
                                name={isCheckoutReady ? "checkmark-circle" : "alert-circle"} 
                                size={14} 
                                color="#fff" 
                            />
                            <Text style={styles.statusBadgeText}>
                                {isCheckoutReady ? "Checkout Ready" : "Incomplete"}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Account Information Card */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="person-circle-outline" size={22} color="#ffffff" />
                        <Text style={styles.cardTitle}>Account Information</Text>
                    </View>
                    <View style={styles.cardContent}>
                        <Input 
                            label="Full Name" 
                            placeholder="Enter your name" 
                            value={name} 
                            onChangeText={setName}
                        />
                        <Input 
                            label="Phone Number" 
                            placeholder="Enter phone number" 
                            value={phone} 
                            keyboardType="phone-pad" 
                            onChangeText={setPhone}
                        />
                    </View>
                </View>

                {/* Delivery Address Card */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="location-outline" size={22} color="#ffffff" />
                        <Text style={styles.cardTitle}>Delivery Address</Text>
                    </View>
                    <View style={styles.cardContent}>
                        <Input 
                            label="Address Line 1" 
                            placeholder="Street, building number" 
                            value={deliveryAddress1} 
                            onChangeText={setDeliveryAddress1}
                        />
                        <Input 
                            label="Address Line 2 (Optional)" 
                            placeholder="Unit, floor, etc." 
                            value={deliveryAddress2} 
                            onChangeText={setDeliveryAddress2}
                        />
                        <View style={styles.row}>
                            <View style={styles.halfWidth}>
                                <Input 
                                    label="City" 
                                    placeholder="City" 
                                    value={deliveryCity} 
                                    onChangeText={setDeliveryCity}
                                />
                            </View>
                            <View style={styles.halfWidth}>
                                <Input 
                                    label="Zip Code" 
                                    placeholder="Postal code" 
                                    value={deliveryZip} 
                                    keyboardType="numeric" 
                                    onChangeText={setDeliveryZip}
                                />
                            </View>
                        </View>
                        <Input 
                            label="Country" 
                            placeholder="Country" 
                            value={deliveryCountry} 
                            onChangeText={setDeliveryCountry}
                        />
                        
                        <TouchableOpacity 
                            style={styles.mapButton} 
                            onPress={() => setMapVisible(true)}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="map" size={20} color="#fff" />
                            <Text style={styles.mapButtonText}>Set Address from Map</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionsContainer}>
                    <TouchableOpacity 
                        style={[styles.saveButton, isSaving && styles.buttonDisabled]} 
                        onPress={saveProfile}
                        disabled={isSaving}
                        activeOpacity={0.8}
                    >
                        {isSaving ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="save-outline" size={20} color="#fff" />
                                <Text style={styles.saveButtonText}>Save Profile</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.logoutButton}
                        onPress={() => {
                            Alert.alert(
                                "Sign Out",
                                "Are you sure you want to sign out?",
                                [
                                    { text: "Cancel", style: "cancel" },
                                    {
                                        text: "Sign Out",
                                        onPress: () => {
                                            AsyncStorage.removeItem("jwt");
                                            logoutUser(context.dispatch);
                                        },
                                        style: "destructive"
                                    }
                                ]
                            );
                        }}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                        <Text style={styles.logoutButtonText}>Sign Out</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            <AddressMapPicker
                visible={mapVisible}
                initialLocation={deliveryLocation}
                onClose={() => setMapVisible(false)}
                onPicked={onMapPicked}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0b0f1a",
    },
    scrollContent: {
        paddingBottom: 40,
    },
    profileHeader: {
        backgroundColor: "#131927",
        paddingVertical: 32,
        paddingHorizontal: 20,
        alignItems: "center",
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        marginBottom: 20,
    },
    avatarContainer: {
        marginBottom: 16,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 4,
        borderColor: "#ea580c",
    },
    avatarPlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: "#1e293b",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 4,
        borderColor: "#334155",
    },
    cameraButton: {
        position: "absolute",
        bottom: 0,
        right: 0,
        backgroundColor: "#ea580c",
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 3,
        borderColor: "#131927",
    },
    userName: {
        fontSize: 24,
        fontWeight: "700",
        color: "#f1f5f9",
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 14,
        color: "#94a3b8",
        marginBottom: 12,
    },
    badgesRow: {
        flexDirection: "row",
        gap: 8,
        marginTop: 8,
    },
    adminBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#ea580c",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 4,
    },
    adminBadgeText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: 0.5,
    },
    statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 4,
    },
    completeBadge: {
        backgroundColor: "#16a34a",
    },
    incompleteBadge: {
        backgroundColor: "#ea580c",
    },
    statusBadgeText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "600",
    },
    card: {
        backgroundColor: "#131927",
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        overflow: "hidden",
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: "#ea580c",
        borderBottomWidth: 0,
        gap: 10,
    },
    cardTitle: {
        fontSize: 17,
        fontWeight: "700",
        color: "#ffffff",
    },
    cardContent: {
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    row: {
        flexDirection: "row",
        gap: 12,
    },
    halfWidth: {
        flex: 1,
    },
    mapButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#ea580c",
        paddingVertical: 14,
        borderRadius: 12,
        marginTop: 8,
        gap: 8,
    },
    mapButtonText: {
        color: "#fff",
        fontSize: 15,
        fontWeight: "600",
    },
    actionsContainer: {
        paddingHorizontal: 16,
        marginTop: 8,
        gap: 12,
    },
    saveButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#ea580c",
        paddingVertical: 16,
        borderRadius: 12,
        gap: 8,
    },
    saveButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
    },
    logoutButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#131927",
        paddingVertical: 16,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: "#ef4444",
        gap: 8,
    },
    logoutButtonText: {
        color: "#ef4444",
        fontSize: 16,
        fontWeight: "700",
    },
    buttonDisabled: {
        opacity: 0.6,
    },
});

export default UserProfile;
