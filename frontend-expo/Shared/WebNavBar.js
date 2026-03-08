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
import AuthGlobal from "../Context/Store/AuthGlobal";
import { logoutUser } from "../Context/Actions/Auth.actions";

const { width } = Dimensions.get("window");

const WebNavBar = () => {
    const navigation = useNavigation();
    const context = useContext(AuthGlobal);
    const cartItems = useSelector((state) => state.cartItems);
    const [menuOpen, setMenuOpen] = useState(false);
    const [productsDropdownOpen, setProductsDropdownOpen] = useState(false);
    const [screenWidth, setScreenWidth] = useState(width);

    useEffect(() => {
        const subscription = Dimensions.addEventListener("change", ({ window }) => {
            setScreenWidth(window.width);
        });
        return () => subscription?.remove();
    }, []);

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
                                        style={styles.navButton}
                                        onPress={() => navigation.navigate("User", { screen: "User Profile" })}
                                    >
                                        <Text style={styles.navButtonText}>
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

                    {/* Mobile Hamburger Menu */}
                    {isMobile && (
                        <View style={styles.mobileActions}>
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
                                style={styles.mobileLoginButton}
                                onPress={() => navigation.navigate("User", { screen: context.stateUser.isAuthenticated ? "User Profile" : "Login" })}
                            >
                                <Text style={styles.mobileLoginButtonText}>
                                    {context.stateUser.isAuthenticated ? "Profile" : "Login"}
                                </Text>
                            </TouchableOpacity>
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
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
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
        backgroundColor: "transparent",
        borderBottomWidth: 0,
        shadowOpacity: 0,
        elevation: 0,
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
        paddingBottom: 8,
        justifyContent: "flex-end",
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
    mobileActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
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
        backgroundColor: "rgba(148, 163, 184, 0.2)",
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.35)",
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
        paddingHorizontal: 12,
    },
    mobileMenu: {
        backgroundColor: "#111827",
        borderBottomWidth: 1,
        borderBottomColor: "#1f2937",
        paddingVertical: 10,
        paddingHorizontal: 12,
        zIndex: 999,
        elevation: 2,
        borderRadius: 12,
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
});

export default WebNavBar;
