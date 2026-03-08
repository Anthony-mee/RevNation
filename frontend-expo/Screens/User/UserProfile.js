import React, { useContext, useState, useCallback } from "react";
import { View, Text, ScrollView, Button, StyleSheet, TouchableOpacity } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
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
                        .then((user) => hydrateProfileForm(user.data));
                })
                .catch((error) => console.log(error));
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

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.subContainer}>
                <Text style={{ fontSize: 28, fontWeight: "700", color: "#1a1a1a" }}>
                    {userProfile ? userProfile.name : ""}
                </Text>
                {userProfile && userProfile.isAdmin ? (
                    <View style={styles.adminBadge}>
                        <Text style={styles.adminBadgeText}>ADMIN</Text>
                    </View>
                ) : null}
                <View style={[styles.completionBadge, isCheckoutReady ? styles.completeBadge : styles.incompleteBadge]}>
                    <Text style={styles.completionBadgeText}>
                        {isCheckoutReady ? "✓ Checkout Ready" : "⚠ Profile Incomplete"}
                    </Text>
                </View>
                {!isCheckoutReady ? (
                    <Text style={styles.missingFieldsText}>
                        Missing: {missingRequiredFields.join(", ")}
                    </Text>
                ) : null}
                <View style={{ marginTop: 20, width: "100%", alignItems: "center" }}>
                    <Text style={styles.sectionHeader}>Account Info</Text>
                    <Text style={styles.emailText}>
                        {userProfile ? userProfile.email : ""}
                    </Text>
                    <Input label="Name" placeholder="Your name" value={name} onChangeText={setName} />
                    <Input label="Phone" placeholder="Your phone number" value={phone} keyboardType="numeric" onChangeText={setPhone} />

                    <Text style={styles.sectionHeader}>Delivery Address</Text>
                    <Input label="Address Line 1" placeholder="Street, building, etc." value={deliveryAddress1} onChangeText={setDeliveryAddress1} />
                    <Input label="Address Line 2 (optional)" placeholder="Unit, floor, etc." value={deliveryAddress2} onChangeText={setDeliveryAddress2} />
                    <Input label="City" placeholder="City or municipality" value={deliveryCity} onChangeText={setDeliveryCity} />
                    <Input label="Zip Code" placeholder="Postal/Zip code" value={deliveryZip} keyboardType="numeric" onChangeText={setDeliveryZip} />
                    <Input label="Country" placeholder="Country" value={deliveryCountry} onChangeText={setDeliveryCountry} />
                    <TouchableOpacity style={styles.mapButton} onPress={() => setMapVisible(true)}>
                        <Text style={styles.mapButtonText}>📍 Set Address from Map</Text>
                    </TouchableOpacity>
                    <View style={{ width: "88%", marginTop: 8 }}>
                        <Button title={isSaving ? "Saving..." : "Save Profile"} disabled={isSaving} onPress={saveProfile} />
                    </View>
                </View>
                <View style={{ marginTop: 30, width: "88%" }}>
                    <Button
                        title="Sign Out"
                        color="#d32f2f"
                        onPress={() => {
                            AsyncStorage.removeItem("jwt");
                            logoutUser(context.dispatch);
                        }}
                    />
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
        alignItems: "center",
        backgroundColor: "#f5f5f5",
    },
    subContainer: {
        alignItems: "center",
        marginTop: 20,
        paddingBottom: 40,
        paddingHorizontal: 16,
    },
    adminBadge: {
        backgroundColor: "#e91e63",
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 4,
        marginTop: 8,
    },
    adminBadgeText: {
        color: "white",
        fontWeight: "bold",
        fontSize: 13,
        letterSpacing: 1,
    },
    mapButton: {
        backgroundColor: "#1976d2",
        marginHorizontal: 10,
        marginVertical: 10,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: "center",
    },
    mapButtonText: {
        color: "white",
        fontWeight: "600",
    },
    completionBadge: {
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 6,
        marginTop: 12,
    },
    completeBadge: {
        backgroundColor: "#2e7d32",
    },
    incompleteBadge: {
        backgroundColor: "#d32f2f",
    },
    completionBadgeText: {
        color: "white",
        fontWeight: "700",
        letterSpacing: 0.4,
    },
    missingFieldsText: {
        marginTop: 8,
        color: "#b71c1c",
        fontSize: 12,
        marginHorizontal: 16,
        textAlign: "center",
    },
    sectionHeader: {
        fontSize: 16,
        fontWeight: "700",
        color: "#333",
        alignSelf: "flex-start",
        marginLeft: "6%",
        marginTop: 20,
        marginBottom: 6,
    },
    emailText: {
        fontSize: 15,
        color: "#555",
        marginBottom: 4,
    },
});

export default UserProfile;
