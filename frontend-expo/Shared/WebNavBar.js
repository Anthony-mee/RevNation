import React, { useContext, useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Dimensions,
    StatusBar,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Badge } from "react-native-paper";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import AuthGlobal from "../Context/Store/AuthGlobal";
import { logoutUser } from "../Context/Actions/Auth.actions";
import baseURL from "../assets/common/baseurl";

const { width } = Dimensions.get("window");

const WebNavBar = () => {
    const navigation = useNavigation();
    const context = useContext(AuthGlobal);
    const cartItems = useSelector((state) => state.cartItems);
    const [menuOpen, setMenuOpen] = useState(false);
    const [productsDropdownOpen, setProductsDropdownOpen] = useState(false);
    const [screenWidth, setScreenWidth] = useState(width);
    const [userProfile, setUserProfile] = useState(null);

    useEffect(() => {
        const subscription = Dimensions.addEventListener("change", ({ window }) => {
            setScreenWidth(window.width);
        });
        return () => subscription?.remove();
    }, []);

    // Fetch user profile data including image
    useEffect(() => {
        if (context.stateUser.isAuthenticated && context.stateUser.user.userId) {
            AsyncStorage.getItem("jwt")
                .then((jwt) => {
                    axios.get(`${baseURL}users/${context.stateUser.user.userId}`, {
                        headers: { Authorization: `Bearer ${jwt}` },
                    })
                    .then((response) => setUserProfile(response.data))
                    .catch((error) => console.log("[WebNavBar] Error fetching profile:", error));
                })
                .catch((error) => console.log("[WebNavBar] Auth error:", error));
        } else {
            setUserProfile(null);
        }
    }, [context.stateUser.isAuthenticated, context.stateUser.user.userId]);

    const isMobile = screenWidth < 768;

    const handleLogout = () => {
        logoutUser(context.dispatch);
        setMenuOpen(false);
        setProductsDropdownOpen(false);
    };

    return (
        <View style={[styles.root, isMobile && styles.rootMobile]} pointerEvents="box-none">
            <View style={[styles.navbar, isMobile && styles.navbarMobile]}>
                <View style={[styles.navContainer, isMobile && styles.navContainerMobile, { paddingHorizontal: Math.max(20, (screenWidth - 1200) / 2) }]}>
                    {/* Logo */}
                    {!isMobile && (
                        <TouchableOpacity 
                            onPress={() => navigation.navigate("Home", { screen: "Main" })}
                            style={[styles.logoContainer, isMobile && styles.logoContainerMobile]}
                        >
                            <Image
                                source={require("../assets/images/logo.png")}
                                resizeMode="contain"
                                style={[styles.logo, isMobile && styles.logoMobile]}
                            />
                        </TouchableOpacity>
                    )}

                    {/* Navigation Links - Hidden on mobile */}
                    {!isMobile && (
                        <View style={styles.navLinks}>
                            <TouchableOpacity 
                                style={styles.navLink}
                                onPress={() => {
                                    setProductsDropdownOpen(false);
                                    navigation.navigate("Home", { screen: "Main" });
                                }}
                            >
                                <Text style={styles.navLinkText}>Home</Text>
                            </TouchableOpacity>

                            <View style={styles.dropdownWrap}>
                                <TouchableOpacity
                                    style={[styles.navLink, styles.dropdownTrigger]}
                                    onPress={() => setProductsDropdownOpen((prev) => !prev)}
                                >
                                    <Text style={styles.navLinkText}>Products</Text>
                                    <Ionicons
                                        name={productsDropdownOpen ? "chevron-up" : "chevron-down"}
                                        size={16}
                                        color="#374151"
                                        style={styles.dropdownIcon}
                                    />
                                </TouchableOpacity>
                                {productsDropdownOpen && (
                                    <View style={styles.dropdownMenu}>
                                        <TouchableOpacity
                                            style={styles.dropdownItem}
                                            onPress={() => {
                                                navigation.navigate("Home", { screen: "ShopProducts" });
                                                setProductsDropdownOpen(false);
                                            }}
                                        >
                                            <Text style={styles.dropdownItemText}>Shop Products</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.dropdownItem}
                                            onPress={() => {
                                                navigation.navigate("Home", { screen: "ResellProducts" });
                                                setProductsDropdownOpen(false);
                                            }}
                                        >
                                            <Text style={styles.dropdownItemText}>Resell Products</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>

                            {context.stateUser.isAuthenticated && !context.stateUser.user.isAdmin && (
                                <TouchableOpacity 
                                    style={styles.navLink}
                                    onPress={() => {
                                        setProductsDropdownOpen(false);
                                        navigation.navigate("My Orders");
                                    }}
                                >
                                    <Text style={styles.navLinkText}>My Orders</Text>
                                </TouchableOpacity>
                            )}

                            {context.stateUser.isAuthenticated && context.stateUser.user.isAdmin && (
                                <TouchableOpacity 
                                    style={styles.navLink}
                                    onPress={() => {
                                        setProductsDropdownOpen(false);
                                        navigation.navigate("Admin");
                                    }}
                                >
                                    <Text style={styles.navLinkText}>Admin</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    {/* Right Actions - Desktop */}
                    {!isMobile && (
                        <View style={styles.navActions}>
                            {/* Cart */}
                            <TouchableOpacity 
                                style={styles.cartButton}
                                onPress={() => navigation.navigate("Cart Screen")}
                            >
                                <Text style={styles.cartIcon}>🛒</Text>
                                {cartItems.length > 0 && (
                                    <Badge style={styles.badge} size={20}>
                                        {cartItems.length}
                                    </Badge>
                                )}
                            </TouchableOpacity>

                            {/* User Menu */}
                            {context.stateUser.isAuthenticated ? (
                                <View style={styles.userMenu}>
                                    <TouchableOpacity
                                        style={styles.profileButton}
                                        onPress={() => navigation.navigate("User", { screen: "User Profile" })}
                                    >
                                        {userProfile?.image ? (
                                            <Image 
                                                source={{ uri: userProfile.image }} 
                                                style={styles.profileAvatar}
                                            />
                                        ) : (
                                            <View style={styles.profileAvatarPlaceholder}>
                                                <Ionicons name="person" size={16} color="#6b7280" />
                                            </View>
                                        )}
                                        <Text style={styles.profileName}>
                                            {context.stateUser.user.name || "Profile"}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.navButton, styles.logoutButton]}
                                        onPress={handleLogout}
                                    >
                                        <Text style={[styles.navButtonText, styles.logoutText]}>
                                            Logout
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={styles.loginButton}
                                    onPress={() => navigation.navigate("User", { screen: "Login" })}
                                >
                                    <Text style={styles.loginButtonText}>Login</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    {/* Mobile Layout: Left (Drawer) | Right (Profile + Cart) */}
                    {isMobile && (
                        <View style={styles.mobileBar}>
                            <TouchableOpacity
                                style={[styles.hamburgerButton, styles.mobileIconButton]}
                                onPress={() => setMenuOpen(!menuOpen)}
                            >
                                <Ionicons 
                                    name={menuOpen ? "close" : "menu"} 
                                    size={24} 
                                    color="#ffffff"
                                />
                            </TouchableOpacity>
                            <View style={styles.mobileRightActions}>
                                <TouchableOpacity 
                                    style={[styles.cartButton, styles.mobileIconButton]}
                                    onPress={() => navigation.navigate("Cart Screen")}
                                >
                                    <Ionicons name="cart-outline" size={20} color="#ffffff" />
                                    {cartItems.length > 0 && (
                                        <Badge style={styles.badge} size={20}>
                                            {cartItems.length}
                                        </Badge>
                                    )}
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.mobileProfileRow}
                                    onPress={() => navigation.navigate("User", { screen: context.stateUser.isAuthenticated ? "User Profile" : "Login" })}
                                >
                                    <View style={styles.mobileUserInfo}>
                                        <Text style={styles.mobileUserName} numberOfLines={1}>
                                            {context.stateUser.isAuthenticated
                                                ? (userProfile?.name || context.stateUser.user.name || "User")
                                                : "Guest"}
                                        </Text>
                                        <Text style={styles.mobileUserRole} numberOfLines={1}>
                                            {context.stateUser.isAuthenticated
                                                ? (context.stateUser.user.isAdmin ? "Admin" : "Customer")
                                                : "Sign in"}
                                        </Text>
                                    </View>
                                    {context.stateUser.isAuthenticated && userProfile?.image ? (
                                        <Image
                                            source={{ uri: userProfile.image }}
                                            style={styles.mobileProfileAvatar}
                                        />
                                    ) : (
                                        <View style={styles.mobileProfileAvatarPlaceholder}>
                                            <Ionicons name="person" size={18} color="#ffffff" />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>
            </View>

            {/* Mobile Menu - Retractable */}
            {isMobile && menuOpen && (
                <View style={styles.mobileMenuFloating}>
                    <View style={styles.mobileMenu}>
                    <TouchableOpacity 
                        style={styles.mobileMenuLink}
                        onPress={() => {
                            navigation.navigate("Home", { screen: "Main" });
                            setMenuOpen(false);
                        }}
                    >
                        <Text style={styles.mobileMenuLinkText}>Home</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.mobileMenuLink}
                        onPress={() => {
                            navigation.navigate("Home", { screen: "ShopProducts" });
                            setMenuOpen(false);
                        }}
                    >
                        <Text style={styles.mobileMenuLinkText}>Shop Products</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.mobileMenuLink}
                        onPress={() => {
                            navigation.navigate("Home", { screen: "ResellProducts" });
                            setMenuOpen(false);
                        }}
                    >
                        <Text style={styles.mobileMenuLinkText}>Resell Products</Text>
                    </TouchableOpacity>

                    {context.stateUser.isAuthenticated && !context.stateUser.user.isAdmin && (
                        <TouchableOpacity 
                            style={styles.mobileMenuLink}
                            onPress={() => {
                                navigation.navigate("My Orders");
                                setMenuOpen(false);
                            }}
                        >
                            <Text style={styles.mobileMenuLinkText}>My Orders</Text>
                        </TouchableOpacity>
                    )}

                    {context.stateUser.isAuthenticated && context.stateUser.user.isAdmin && (
                        <TouchableOpacity 
                            style={styles.mobileMenuLink}
                            onPress={() => {
                                navigation.navigate("Admin");
                                setMenuOpen(false);
                            }}
                        >
                            <Text style={styles.mobileMenuLinkText}>Admin</Text>
                        </TouchableOpacity>
                    )}

                    <View style={styles.mobileMenuDivider} />

                    {/* User Menu Mobile */}
                    {context.stateUser.isAuthenticated ? (
                        <>
                            <TouchableOpacity
                                style={styles.mobileMenuLink}
                                onPress={() => {
                                    navigation.navigate("User", { screen: "User Profile" });
                                    setMenuOpen(false);
                                }}
                            >
                                <Text style={styles.mobileMenuLinkText}>
                                    {context.stateUser.user.name || "Profile"}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.mobileMenuLink, styles.logoutLinkMobile]}
                                onPress={handleLogout}
                            >
                                <Text style={[styles.mobileMenuLinkText, styles.logoutLinkTextMobile]}>
                                    Logout
                                </Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <TouchableOpacity
                            style={[styles.mobileMenuLink, styles.loginLinkMobile]}
                            onPress={() => {
                                navigation.navigate("User", { screen: "Login" });
                                setMenuOpen(false);
                            }}
                        >
                            <Text style={[styles.mobileMenuLinkText, styles.loginLinkTextMobile]}>
                                Login
                            </Text>
                        </TouchableOpacity>
                    )}
                    </View>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    root: {
        zIndex: 1000,
    },
    rootMobile: {
        position: "relative",
        zIndex: 1001,
    },
    navbar: {
        backgroundColor: "#ffffff",
        borderBottomWidth: 1,
        borderBottomColor: "#e5e7eb",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
        zIndex: 1000,
    },
    navbarMobile: {
        backgroundColor: "#0a1628",
        borderBottomWidth: 0,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
        elevation: 0,
        zIndex: 1001,
    },
    navContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 16,
        maxWidth: 1400,
        marginHorizontal: "auto",
        width: "100%",
    },
    navContainerMobile: {
        paddingHorizontal: 12,
        paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 8 : 16,
        paddingBottom: 12,
        justifyContent: "center",
        alignItems: "center",
    },
    logoContainer: {
        marginRight: 40,
    },
    logoContainerMobile: {
        marginRight: 8,
        flexShrink: 1,
    },
    logo: {
        height: 60,
        width: 180,
        backgroundColor: "transparent",
    },
    logoMobile: {
        height: 42,
        width: 120,
    },
    navLinks: {
        flexDirection: "row",
        alignItems: "center",
        gap: 32,
        flex: 1,
    },
    navLink: {
        paddingVertical: 8,
        paddingHorizontal: 4,
    },
    dropdownWrap: {
        position: "relative",
    },
    dropdownTrigger: {
        flexDirection: "row",
        alignItems: "center",
    },
    dropdownIcon: {
        marginLeft: 4,
    },
    dropdownMenu: {
        position: "absolute",
        top: 36,
        left: 0,
        backgroundColor: "#ffffff",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        minWidth: 170,
        zIndex: 1200,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 8,
    },
    dropdownItem: {
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    dropdownItemText: {
        fontSize: 14,
        color: "#374151",
        fontWeight: "500",
    },
    navLinkText: {
        fontSize: 15,
        fontWeight: "500",
        color: "#374151",
        letterSpacing: 0.3,
    },
    navActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
    },
    mobileBar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
    },
    mobileRightActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    mobileProfileRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    mobileUserInfo: {
        alignItems: "flex-end",
        maxWidth: 100,
    },
    mobileUserName: {
        fontSize: 12,
        fontWeight: "700",
        color: "#ffffff",
    },
    mobileUserRole: {
        fontSize: 10,
        fontWeight: "500",
        color: "rgba(255, 255, 255, 0.7)",
    },
    mobileLoginButton: {
        backgroundColor: "#2563eb",
        borderRadius: 8,
        paddingVertical: 7,
        paddingHorizontal: 12,
    },
    mobileLoginButtonText: {
        color: "#ffffff",
        fontSize: 12,
        fontWeight: "600",
        letterSpacing: 0.3,
    },
    cartButton: {
        position: "relative",
        padding: 6,
        marginRight: 0,
    },
    mobileIconButton: {
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.3)",
        borderRadius: 8,
    },
    cartIcon: {
        fontSize: 22,
    },
    badge: {
        position: "absolute",
        top: 0,
        right: 0,
        backgroundColor: "#ef4444",
    },
    hamburgerButton: {
        padding: 6,
    },
    mobileMenuFloating: {
        position: "absolute",
        top: "100%",
        left: 0,
        right: 0,
        paddingHorizontal: 12,
        zIndex: 1002,
        elevation: 10,
    },
    mobileMenu: {
        backgroundColor: "#111827",
        borderBottomWidth: 1,
        borderBottomColor: "#1f2937",
        paddingVertical: 10,
        paddingHorizontal: 12,
        zIndex: 1002,
        elevation: 10,
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    mobileMenuLink: {
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 6,
        marginVertical: 4,
    },
    mobileMenuLinkText: {
        fontSize: 15,
        fontWeight: "500",
        color: "#e5e7eb",
        letterSpacing: 0.3,
    },
    mobileMenuDivider: {
        height: 1,
        backgroundColor: "#1f2937",
        marginVertical: 8,
    },
    logoutLinkMobile: {
        backgroundColor: "#fee2e2",
    },
    logoutLinkTextMobile: {
        color: "#dc2626",
    },
    loginLinkMobile: {
        backgroundColor: "#2563eb",
    },
    loginLinkTextMobile: {
        color: "#ffffff",
        fontWeight: "600",
    },
    userMenu: {
        flexDirection: "row",
        gap: 12,
    },
    navButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 6,
        backgroundColor: "#f3f4f6",
    },
    navButtonText: {
        fontSize: 14,
        fontWeight: "500",
        color: "#374151",
    },
    logoutButton: {
        backgroundColor: "#fee2e2",
    },
    logoutText: {
        color: "#dc2626",
    },
    loginButton: {
        paddingVertical: 10,
        paddingHorizontal: 24,
        borderRadius: 8,
        backgroundColor: "#2563eb",
    },
    loginButtonText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#ffffff",
        letterSpacing: 0.5,
    },
    profileButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: "#f3f4f6",
    },
    profileAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: "#3b82f6",
    },
    profileAvatarPlaceholder: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#e5e7eb",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: "#d1d5db",
    },
    profileName: {
        fontSize: 14,
        fontWeight: "500",
        color: "#374151",
    },
    mobileProfileButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        marginLeft: 0,
    },
    mobileProfileContainer: {
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        minHeight: 60,
    },
    mobileProfileName: {
        fontSize: 9,
        fontWeight: "700",
        color: "#ffffff",
        marginTop: 2,
        textAlign: "center",
    },
    mobileProfileAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: "#ffffff",
    },
    mobileProfileAvatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(255, 255, 255, 0.3)",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: "#ffffff",
    },
});

export default WebNavBar;
