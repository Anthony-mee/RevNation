import React, { useContext, useState, useEffect } from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { Drawer } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import AuthGlobal from "../Context/Store/AuthGlobal";
import { logoutUser } from "../Context/Actions/Auth.actions";
import baseURL from "../assets/common/baseurl";

const DrawerContent = ({ navigation }) => {
    const [active, setActive] = useState("");
    const [userProfile, setUserProfile] = useState(null);
    const context = useContext(AuthGlobal);
    const isAdmin = context?.stateUser?.user?.isAdmin === true;
    const isAuthenticated = context?.stateUser?.isAuthenticated;

    useEffect(() => {
        if (isAuthenticated && context.stateUser.user.userId) {
            AsyncStorage.getItem("jwt")
                .then((jwt) => {
                    axios.get(`${baseURL}users/${context.stateUser.user.userId}`, {
                        headers: { Authorization: `Bearer ${jwt}` },
                    })
                    .then((response) => setUserProfile(response.data))
                    .catch((error) => console.log("[DrawerContent] Error fetching profile:", error));
                })
                .catch((error) => console.log("[DrawerContent] Auth error:", error));
        }
    }, [isAuthenticated, context.stateUser.user.userId]);

    const onClick = (screen) => {
        setActive(screen);
    };

    const handleLogout = () => {
        logoutUser(context.dispatch);
    };

    return (
        <View style={styles.container}>
            {/* Profile Header */}
            {isAuthenticated && (
                <View style={styles.profileHeader}>
                    <View style={styles.profileContent}>
                        <View style={styles.avatarContainer}>
                            {userProfile?.image ? (
                                <Image 
                                    source={{ uri: userProfile.image }} 
                                    style={styles.avatar}
                                />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Ionicons name="person" size={28} color="#ffffff" />
                                </View>
                            )}
                        </View>
                        <View style={styles.userInfo}>
                            <Text style={styles.userName}>
                                {context.stateUser.user.name || "User"}
                            </Text>
                            <Text style={styles.userEmail}>
                                {userProfile?.email || ""}
                            </Text>
                            {isAdmin && (
                                <View style={styles.adminBadge}>
                                    <Ionicons name="shield-checkmark" size={12} color="#fff" />
                                    <Text style={styles.adminText}>Admin</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            )}
            <Drawer.Section title="Navigation">
                <Drawer.Item
                    label="Home"
                    onPress={() => navigation.navigate("Main", { screen: "Home" })}
                    icon="home"
                />
                <Drawer.Item
                    label="Shop Products"
                    onPress={() => navigation.navigate("Main", { screen: "Home", params: { screen: "ShopProducts" } })}
                    icon="shopping"
                />
                <Drawer.Item
                    label="Resell Products"
                    onPress={() => navigation.navigate("Main", { screen: "Home", params: { screen: "ResellProducts" } })}
                    icon="tag-multiple"
                />
                <Drawer.Item
                    label="Cart"
                    onPress={() => navigation.navigate("Main", { screen: "Cart Screen" })}
                    icon="cart"
                />
                {isAuthenticated ? (
                    <>
                        <Drawer.Item
                            label="My Profile"
                            onPress={() => navigation.navigate("Main", { screen: "User", params: { screen: "User Profile" } })}
                            icon="account"
                        />
                        {!isAdmin ? (
                            <Drawer.Item
                                label="My Orders"
                                onPress={() => navigation.navigate("Main", { screen: "User", params: { screen: "My Orders" } })}
                                icon="cart-variant"
                            />
                        ) : null}
                        {isAdmin ? (
                            <Drawer.Item
                                label="Admin"
                                onPress={() => navigation.navigate("Main", { screen: "Admin" })}
                                icon="cog"
                            />
                        ) : null}
                        <Drawer.Item
                            label="Notifications"
                            active={active === "Notifications"}
                            onPress={() => {
                                setActive("Notifications");
                                navigation.navigate("Main", { screen: "User", params: { screen: "Notifications" } });
                            }}
                            icon="bell"
                        />
                    </>
                ) : (
                    <Drawer.Item
                        label="Login"
                        onPress={() => navigation.navigate("Main", { screen: "User", params: { screen: "Login" } })}
                        icon="account"
                    />
                )}
            </Drawer.Section>
            {/* Logout Button */}
            {isAuthenticated && (
                <TouchableOpacity 
                    style={styles.logoutButton}
                    onPress={handleLogout}
                    activeOpacity={0.7}
                >
                    <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                    <Text style={styles.logoutButtonText}>Logout</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0b0f1a",
    },
    profileHeader: {
        backgroundColor: "#131927",
        paddingVertical: 20,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(234, 88, 12, 0.15)",
    },
    profileContent: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    avatarContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        overflow: "hidden",
        backgroundColor: "rgba(234, 88, 12, 0.2)",
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        borderWidth: 2,
        borderColor: "#ea580c",
    },
    avatarPlaceholder: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "rgba(234, 88, 12, 0.3)",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: "#ea580c",
    },
    userInfo: {
        flex: 1,
        gap: 4,
    },
    userName: {
        color: "#ffffff",
        fontSize: 16,
        fontWeight: "700",
    },
    userEmail: {
        color: "rgba(255, 255, 255, 0.8)",
        fontSize: 12,
    },
    adminBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "rgba(234, 88, 12, 0.2)",
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
        marginTop: 4,
        alignSelf: "flex-start",
    },
    adminText: {
        color: "#ffffff",
        fontSize: 10,
        fontWeight: "700",
    },
    logoutButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginHorizontal: 16,
        marginVertical: 20,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#ef4444",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
    },
    logoutButtonText: {
        color: "#ef4444",
        fontSize: 16,
        fontWeight: "600",
    },
});

export default DrawerContent;
