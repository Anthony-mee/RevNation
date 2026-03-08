import React, { useState, useCallback } from "react";
import {
    View,
    StyleSheet,
    Dimensions,
    ScrollView,
    Text,
    Image,
    ImageBackground,
    TouchableOpacity,
    Platform,
} from "react-native";
import { Surface } from "react-native-paper";
import ProductList from "./ProductList";
import CategoryFilter from "./CategoryFilter";
import axios from "axios";
import baseURL from "../../assets/common/baseurl";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

var { height, width } = Dimensions.get("window");
const isWeb = Platform.OS === "web";
const isLargeScreen = width >= 900;
const isMobile = width < 768;

const ProductContainer = () => {
    const navigation = useNavigation();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [active, setActive] = useState(-1);
    const [initialState, setInitialState] = useState([]);
    const [productsCtg, setProductsCtg] = useState([]);

    const changeCtg = (ctg) => {
        if (ctg === "all") {
            setProductsCtg(initialState);
            setActive(true);
        } else {
            setProductsCtg(
                products.filter((i) => i.category != null && (i.category.id === ctg || i.category._id === ctg))
            );
            setActive(true);
        }
    };

    useFocusEffect(
        useCallback(() => {
            setActive(-1);
            axios
                .get(`${baseURL}products?type=shop`)
                .then((res) => {
                    setProducts(res.data);
                    setProductsCtg(res.data);
                    setInitialState(res.data);
                })
                .catch((error) => console.log("Api call error"));

            axios
                .get(`${baseURL}categories`)
                .then((res) => setCategories(res.data))
                .catch((error) => console.log("Api categories call error"));

            return () => {
                setProducts([]);
                setCategories([]);
                setInitialState([]);
            };
        }, [])
    );

    return (
        <Surface style={styles.screen}>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {/* Hero Section */}
                    <View style={styles.heroWrapper}>
                        <ImageBackground
                            source={require("../../assets/images/carousel1-sample.png")}
                            style={styles.hero}
                            imageStyle={styles.heroImage}
                        >
                            <View style={styles.heroGradient}>
                                <View style={styles.heroContent}>
                                    <View style={styles.heroBadge}>
                                        <Text style={styles.heroBadgeText}>PREMIUM CUSTOM GARAGE</Text>
                                    </View>
                                    <Text style={styles.heroTitle}>Build Your{'\n'}Dream Ride</Text>
                                    <Text style={styles.heroSubtitle}>
                                        Professional motorcycle customization and restoration services since 2009
                                    </Text>
                                    <View style={styles.heroActions}>
                                        <TouchableOpacity 
                                            style={styles.heroPrimaryBtn} 
                                            activeOpacity={0.85}
                                            onPress={() => navigation.navigate("ShopProducts")}
                                        >
                                            <Text style={styles.heroPrimaryBtnText}>Shop Products</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.heroSecondaryBtn} activeOpacity={0.85}>
                                            <Text style={styles.heroSecondaryBtnText}>View Gallery</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        </ImageBackground>
                    </View>

                    {/* Features Section */}
                    <View style={styles.featuresSection}>
                        <View style={styles.featureCard}>
                            <View style={styles.featureIcon}>
                                <Text style={styles.featureIconText}>⚙️</Text>
                            </View>
                            <Text style={styles.featureTitle}>Custom Fabrication</Text>
                            <Text style={styles.featureText}>Handcrafted parts tailored to your vision</Text>
                        </View>
                        <View style={styles.featureCard}>
                            <View style={styles.featureIcon}>
                                <Text style={styles.featureIconText}>🔧</Text>
                            </View>
                            <Text style={styles.featureTitle}>Engine Tuning</Text>
                            <Text style={styles.featureText}>Performance optimization and diagnostics</Text>
                        </View>
                        <View style={styles.featureCard}>
                            <View style={styles.featureIcon}>
                                <Text style={styles.featureIconText}>🏍️</Text>
                            </View>
                            <Text style={styles.featureTitle}>Full Restoration</Text>
                            <Text style={styles.featureText}>Classic bikes brought back to life</Text>
                        </View>
                    </View>

                    {/* About Section */}
                    <View style={styles.aboutSection}>
                        <Text style={styles.sectionLabel}>WHO WE ARE</Text>
                        <Text style={styles.sectionTitle}>Crafting Excellence{'\n'}Since 2009</Text>
                        <Text style={styles.sectionDescription}>
                            We're a team of passionate mechanics and custom builders dedicated to transforming motorcycles 
                            into unique works of art. Every project receives meticulous attention to detail.
                        </Text>
                        <View style={styles.statsGrid}>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>250+</Text>
                                <Text style={styles.statText}>Projects Completed</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>15</Text>
                                <Text style={styles.statText}>Years Experience</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>100%</Text>
                                <Text style={styles.statText}>Satisfaction Rate</Text>
                            </View>
                        </View>
                    </View>

                    {/* Gallery Preview */}
                    <View style={styles.gallerySection}>
                        <Text style={styles.gallerySectionTitle}>Recent Work</Text>
                        <View style={styles.galleryGrid}>
                            <Image source={require("../../assets/images/carousel1-sample.png")} style={styles.galleryImageLarge} resizeMode="cover" />
                            <View style={styles.galleryColumn}>
                                <Image source={require("../../assets/images/carousel2-sample.png")} style={styles.galleryImageSmall} resizeMode="cover" />
                                <Image source={require("../../assets/images/carousel3-sample.png")} style={styles.galleryImageSmall} resizeMode="cover" />
                            </View>
                        </View>
                    </View>

                    {/* CTA Section */}
                    <View style={styles.ctaSection}>
                        <View style={styles.ctaCard}>
                            <Text style={styles.ctaTitle}>Ready to Start Your Project?</Text>
                            <Text style={styles.ctaText}>
                                Schedule a consultation and let's discuss your custom build or restoration.
                            </Text>
                            <TouchableOpacity style={styles.ctaButton} activeOpacity={0.85}>
                                <Text style={styles.ctaButtonText}>Book Consultation</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Products Section */}
                    <View style={styles.productsSection}>
                        <View style={styles.productsSectionHeader}>
                            <View>
                                <Text style={styles.productsLabel}>SHOP</Text>
                                <Text style={styles.productsTitle}>Available Builds & Parts</Text>
                            </View>
                            <TouchableOpacity 
                                style={styles.viewAllButton}
                                onPress={() => navigation.navigate("ShopProducts")}
                            >
                                <Text style={styles.viewAllText}>View All</Text>
                            </TouchableOpacity>
                        </View>
                        <CategoryFilter
                            categories={categories}
                            categoryFilter={changeCtg}
                            productsCtg={productsCtg}
                            active={active}
                            setActive={setActive}
                        />
                        {productsCtg.length > 0 ? (
                            <View style={styles.listContainer}>
                                {productsCtg.slice(0, 4).map((item) => (
                                    <ProductList key={item.id || item._id} item={item} />
                                ))}
                            </View>
                        ) : (
                            <View style={[styles.center, { height: height / 3 }]}>
                                <Text style={styles.noProductsText}>No products found</Text>
                            </View>
                        )}
                        {productsCtg.length > 4 && (
                            <TouchableOpacity 
                                style={styles.shopMoreButton}
                                onPress={() => navigation.navigate("ShopProducts")}
                            >
                                <Text style={styles.shopMoreText}>Browse All Products</Text>
                            </TouchableOpacity>
                        )}
                    </View>
            </ScrollView>
        </Surface>
    );
};

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: "#0a1628",
    },
    scroll: {
        flex: 1,
        backgroundColor: "#0a1628",
    },
    scrollContent: {
        paddingBottom: 20,
        ...(isWeb && isLargeScreen && {
            maxWidth: 1400,
            alignSelf: "center",
            width: "100%",
        }),
    },
    // Hero Section
    heroWrapper: {
        marginTop: isWeb ? 0 : 8,
    },
    hero: {
        height: isWeb && isLargeScreen ? 600 : isLargeScreen ? 500 : isMobile ? 380 : 420,
        marginHorizontal: 0,
        overflow: "hidden",
    },
    heroImage: {
        opacity: 0.4,
    },
    heroGradient: {
        flex: 1,
        backgroundColor: "rgba(10, 22, 40, 0.85)",
        justifyContent: "center",
        alignItems: isWeb && isLargeScreen ? "flex-start" : "center",
    },
    heroContent: {
        paddingHorizontal: isWeb && isLargeScreen ? 80 : isMobile ? 18 : 24,
        paddingVertical: 32,
        maxWidth: isWeb && isLargeScreen ? 700 : "100%",
    },
    heroBadge: {
        alignSelf: "flex-start",
        backgroundColor: "rgba(37, 99, 235, 0.15)",
        borderWidth: 1,
        borderColor: "rgba(37, 99, 235, 0.3)",
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginBottom: 16,
    },
    heroBadgeText: {
        color: "#60a5fa",
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 1.2,
    },
    heroTitle: {
        color: "#ffffff",
        fontSize: isWeb && isLargeScreen ? 68 : isLargeScreen ? 58 : isMobile ? 32 : 48,
        lineHeight: isWeb && isLargeScreen ? 74 : isLargeScreen ? 62 : isMobile ? 38 : 52,
        fontWeight: "900",
        marginBottom: 14,
    },
    heroSubtitle: {
        color: "#cbd5e1",
        fontSize: isWeb && isLargeScreen ? 18 : isMobile ? 15 : 16,
        lineHeight: isWeb && isLargeScreen ? 28 : isMobile ? 22 : 24,
        maxWidth: "90%",
        marginBottom: 24,
    },
    heroActions: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
    },
    heroPrimaryBtn: {
        backgroundColor: "#2563eb",
        paddingHorizontal: isWeb && isLargeScreen ? 32 : 24,
        paddingVertical: isWeb && isLargeScreen ? 16 : 14,
        borderRadius: 8,
        elevation: 3,
        ...(isWeb && { cursor: "pointer" }),
    },
    heroPrimaryBtnText: {
        color: "#ffffff",
        fontSize: isWeb && isLargeScreen ? 16 : 15,
        fontWeight: "700",
        letterSpacing: 0.3,
    },
    heroSecondaryBtn: {
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.2)",
        paddingHorizontal: isWeb && isLargeScreen ? 32 : 24,
        paddingVertical: isWeb && isLargeScreen ? 16 : 14,
        borderRadius: 8,
        ...(isWeb && { cursor: "pointer" }),
    },
    heroSecondaryBtnText: {
        color: "#ffffff",
        fontSize: isWeb && isLargeScreen ? 16 : 15,
        fontWeight: "700",
        letterSpacing: 0.3,
    },
    // Features Section
    featuresSection: {
        flexDirection: isMobile ? "column" : "row",
        flexWrap: "wrap",
        paddingHorizontal: isWeb && isLargeScreen ? 80 : 16,
        marginTop: 24,
        gap: isWeb && isLargeScreen ? 20 : 12,
    },
    featureCard: {
        flex: 1,
        minWidth: isWeb && isLargeScreen ? 280 : isMobile ? "100%" : "30%",
        backgroundColor: "#1a2332",
        borderRadius: 12,
        padding: isWeb && isLargeScreen ? 24 : 18,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(37, 99, 235, 0.15)",
    },
    featureIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: "rgba(37, 99, 235, 0.15)",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 12,
    },
    featureIconText: {
        fontSize: 24,
    },
    featureTitle: {
        color: "#ffffff",
        fontSize: 14,
        fontWeight: "700",
        marginBottom: 6,
        textAlign: "center",
    },
    featureText: {
        color: "#94a3b8",
        fontSize: 12,
        textAlign: "center",
        lineHeight: 18,
    },
    // About Section
    aboutSection: {
        marginTop: 32,
        marginHorizontal: isWeb && isLargeScreen ? 80 : 16,
        backgroundColor: "#f8fafc",
        borderRadius: 16,
        padding: isWeb && isLargeScreen ? 48 : isMobile ? 18 : 24,
    },
    sectionLabel: {
        color: "#2563eb",
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: 1.5,
        marginBottom: 8,
    },
    sectionTitle: {
        color: "#0f172a",
        fontSize: isWeb && isLargeScreen ? 42 : isMobile ? 26 : 32,
        lineHeight: isWeb && isLargeScreen ? 48 : isMobile ? 32 : 38,
        fontWeight: "900",
        marginBottom: 12,
    },
    sectionDescription: {
        color: "#475569",
        fontSize: isWeb && isLargeScreen ? 17 : 15,
        lineHeight: isWeb && isLargeScreen ? 28 : 24,
        marginBottom: 24,
        maxWidth: isWeb && isLargeScreen ? "80%" : "100%",
    },
    statsGrid: {
        flexDirection: isMobile ? "column" : "row",
        justifyContent: "space-between",
        backgroundColor: "#ffffff",
        borderRadius: 12,
        padding: isWeb && isLargeScreen ? 32 : 20,
        elevation: 2,
        gap: isMobile ? 12 : 0,
    },
    statItem: {
        flex: 1,
        alignItems: "center",
    },
    statValue: {
        color: "#2563eb",
        fontSize: isWeb && isLargeScreen ? 42 : 32,
        fontWeight: "900",
        marginBottom: 4,
    },
    statText: {
        color: "#64748b",
        fontSize: isWeb && isLargeScreen ? 13 : 11,
        textAlign: "center",
        fontWeight: "600",
    },
    // Gallery Section
    gallerySection: {
        marginTop: 32,
        paddingHorizontal: isWeb && isLargeScreen ? 80 : 16,
    },
    gallerySectionTitle: {
        color: "#ffffff",
        fontSize: isWeb && isLargeScreen ? 36 : 28,
        fontWeight: "900",
        marginBottom: 16,
    },
    galleryGrid: {
        flexDirection: isMobile ? "column" : "row",
        gap: isWeb && isLargeScreen ? 16 : 12,
    },
    galleryImageLarge: {
        flex: isMobile ? 0 : 2,
        height: isWeb && isLargeScreen ? 360 : 280,
        borderRadius: 12,
        backgroundColor: "#1a2332",
    },
    galleryColumn: {
        flex: 1,
        gap: isWeb && isLargeScreen ? 16 : 12,
    },
    galleryImageSmall: {
        height: isWeb && isLargeScreen ? 172 : 134,
        borderRadius: 12,
        backgroundColor: "#1a2332",
    },
    // CTA Section
    ctaSection: {
        marginTop: 32,
        marginHorizontal: isWeb && isLargeScreen ? 80 : 16,
    },
    ctaCard: {
        backgroundColor: "#2563eb",
        borderRadius: 16,
        padding: isWeb && isLargeScreen ? 48 : 28,
        alignItems: "center",
    },
    ctaTitle: {
        color: "#ffffff",
        fontSize: isWeb && isLargeScreen ? 36 : 26,
        fontWeight: "900",
        textAlign: "center",
        marginBottom: 12,
    },
    ctaText: {
        color: "#dbeafe",
        fontSize: isWeb && isLargeScreen ? 17 : 15,
        lineHeight: isWeb && isLargeScreen ? 26 : 22,
        textAlign: "center",
        marginBottom: 20,
        maxWidth: isWeb && isLargeScreen ? "70%" : "90%",
    },
    ctaButton: {
        backgroundColor: "#ffffff",
        paddingHorizontal: isWeb && isLargeScreen ? 36 : 28,
        paddingVertical: isWeb && isLargeScreen ? 16 : 14,
        borderRadius: 8,
        elevation: 2,
        ...(isWeb && { cursor: "pointer" }),
    },
    ctaButtonText: {
        color: "#2563eb",
        fontSize: 15,
        fontWeight: "700",
        letterSpacing: 0.3,
    },
    // Products Section
    productsSection: {
        marginTop: 32,
        backgroundColor: "#0f1729",
        paddingTop: 24,
        paddingBottom: 20,
        paddingHorizontal: isWeb && isLargeScreen ? 80 : 0,
    },
    productsSectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
        marginHorizontal: isWeb && isLargeScreen ? 0 : 16,
        marginBottom: 16,
    },
    viewAllButton: {
        backgroundColor: "transparent",
        borderWidth: 1,
        borderColor: "#60a5fa",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    viewAllText: {
        color: "#60a5fa",
        fontSize: 13,
        fontWeight: "600",
    },
    productsLabel: {
        color: "#60a5fa",
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: 1.5,
        marginBottom: 8,
    },
    productsTitle: {
        color: "#ffffff",
        fontSize: isWeb && isLargeScreen ? 36 : 28,
        fontWeight: "900",
    },
    listContainer: {
        flexDirection: "row",
        alignItems: "flex-start",
        flexWrap: "wrap",
        backgroundColor: "#0f1729",
        paddingBottom: 20,
        gap: isWeb && isLargeScreen ? 24 : 0,
        paddingHorizontal: isWeb && isLargeScreen ? 0 : 0,
    },
    shopMoreButton: {
        backgroundColor: "#2563eb",
        marginHorizontal: isWeb && isLargeScreen ? 0 : 16,
        marginTop: 20,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: "center",
    },
    shopMoreText: {
        color: "#ffffff",
        fontSize: 16,
        fontWeight: "700",
        letterSpacing: 0.5,
    },
    center: {
        justifyContent: "center",
        alignItems: "center",
    },
    noProductsText: {
        color: "#94a3b8",
        fontSize: 14,
    },
});

export default ProductContainer;
