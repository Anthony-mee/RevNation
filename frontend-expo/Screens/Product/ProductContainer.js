import React, { useState, useCallback } from "react";
import {
    View,
    StyleSheet,
    Dimensions,
    ScrollView,
    Text,
    Image,
    TouchableOpacity,
    Platform,
} from "react-native";
import { Surface } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import ProductList from "./ProductList";
import CategoryFilter from "./CategoryFilter";
import axios from "axios";
import baseURL from "../../assets/common/baseurl";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

var { height, width } = Dimensions.get("window");
const isWeb = Platform.OS === "web";
const isLargeScreen = width >= 900;
const isMobile = width < 768;

// Accent palette — motorcycle ember orange + dark steel
const COLORS = {
    bg: "#0b0f1a",
    card: "#131927",
    cardBorder: "rgba(234, 88, 12, 0.12)",
    accent: "#ea580c",
    accentLight: "#fb923c",
    accentGlow: "rgba(234, 88, 12, 0.15)",
    text: "#f1f5f9",
    textMuted: "#94a3b8",
    textDim: "#64748b",
    divider: "rgba(255,255,255,0.06)",
    white: "#ffffff",
};

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

                {/* ─── HERO ─── */}
                <View style={styles.hero}>
                    <Image
                        source={require("../../assets/images/carousel1-sample.png")}
                        style={styles.heroBg}
                        resizeMode="cover"
                    />
                    <View style={styles.heroOverlay} />
                    <View style={styles.heroContent}>
                        <Text style={styles.heroTagline}>BUILT TO RIDE</Text>
                        <Text style={styles.heroTitle}>Premium Custom{"\n"}Motorcycles</Text>
                        <Text style={styles.heroSub}>
                            Hand-built machines engineered for performance, style, and the open road.
                        </Text>
                        <View style={styles.heroBtns}>
                            <TouchableOpacity
                                style={styles.heroPrimary}
                                activeOpacity={0.85}
                                onPress={() => navigation.navigate("ShopProducts")}
                            >
                                <Text style={styles.heroPrimaryText}>Explore Builds</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.heroSecondary}
                                activeOpacity={0.85}
                                onPress={() => navigation.navigate("ResellProducts")}
                            >
                                <Text style={styles.heroSecondaryText}>Resell Market</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* ─── SERVICES ─── */}
                <View style={styles.servicesWrap}>
                    <Text style={styles.servicesLabel}>OUR EXPERTISE</Text>
                    <Text style={styles.servicesHeading}>What We Do Best</Text>
                    <View style={styles.servicesGrid}>
                        {[
                            { icon: "construct", title: "Custom Fabrication", desc: "Handcrafted parts tailored to your vision — from one-off exhausts to full frame builds." },
                            { icon: "speedometer", title: "Engine Tuning", desc: "Performance optimization, dyno testing, and complete diagnostics for peak output." },
                            { icon: "bicycle", title: "Full Restoration", desc: "Classic bikes brought back to life with period-correct detail and modern reliability." },
                        ].map((s, i) => (
                            <View key={i} style={styles.serviceCard}>
                                <View style={styles.serviceIconWrap}>
                                    <Ionicons name={s.icon} size={26} color={COLORS.accent} />
                                </View>
                                <Text style={styles.serviceTitle}>{s.title}</Text>
                                <Text style={styles.serviceDesc}>{s.desc}</Text>
                                <View style={styles.serviceAccent} />
                            </View>
                        ))}
                    </View>
                </View>

                {/* ─── ABOUT / WHO WE ARE ─── */}
                <View style={styles.aboutWrap}>
                    <View style={styles.aboutInner}>
                        <View style={styles.aboutLeft}>
                            <Text style={styles.aboutLabel}>WHO WE ARE</Text>
                            <Text style={styles.aboutTitle}>Crafting Excellence{"\n"}Since 2009</Text>
                            <Text style={styles.aboutDesc}>
                                We're a team of passionate mechanics and custom builders dedicated to transforming motorcycles
                                into unique works of art. Every project receives meticulous attention to detail.
                            </Text>
                        </View>
                        <View style={styles.statsRow}>
                            {[
                                { val: "250+", label: "Builds Completed" },
                                { val: "15", label: "Years in the Game" },
                                { val: "100%", label: "Client Satisfaction" },
                            ].map((s, i) => (
                                <View key={i} style={styles.statCard}>
                                    <Text style={styles.statVal}>{s.val}</Text>
                                    <Text style={styles.statLabel}>{s.label}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </View>

                {/* ─── GALLERY ─── */}
                <View style={styles.galleryWrap}>
                    <View style={styles.galleryHeader}>
                        <View>
                            <Text style={styles.galleryLabel}>WORKSHOP</Text>
                            <Text style={styles.galleryHeading}>Recent Builds</Text>
                        </View>
                    </View>
                    <View style={styles.galleryGrid}>
                        <View style={styles.galleryMain}>
                            <Image source={require("../../assets/images/carousel1-sample.png")} style={styles.galleryImgLarge} resizeMode="cover" />
                            <View style={styles.galleryImgOverlay}>
                                <Text style={styles.galleryImgTag}>FEATURED BUILD</Text>
                            </View>
                        </View>
                        <View style={styles.gallerySide}>
                            <View style={styles.gallerySideItem}>
                                <Image source={require("../../assets/images/carousel2-sample.png")} style={styles.galleryImgSmall} resizeMode="cover" />
                            </View>
                            <View style={styles.gallerySideItem}>
                                <Image source={require("../../assets/images/carousel3-sample.png")} style={styles.galleryImgSmall} resizeMode="cover" />
                            </View>
                        </View>
                    </View>
                </View>

                {/* ─── CTA ─── */}
                <View style={styles.ctaWrap}>
                    <View style={styles.ctaCard}>
                        <Ionicons name="flame" size={36} color={COLORS.accent} style={{ marginBottom: 12 }} />
                        <Text style={styles.ctaTitle}>Ready to Ride?</Text>
                        <Text style={styles.ctaDesc}>
                            Schedule a consultation and let's discuss your custom build, restoration, or dream machine.
                        </Text>
                        <TouchableOpacity style={styles.ctaBtn} activeOpacity={0.85}>
                            <Text style={styles.ctaBtnText}>Book a Consultation</Text>
                            <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ─── PRODUCTS ─── */}
                <View style={styles.productsWrap}>
                    <View style={styles.productsHeader}>
                        <View>
                            <Text style={styles.productsLabel}>SHOP</Text>
                            <Text style={styles.productsHeading}>Available Builds & Parts</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.viewAllBtn}
                            onPress={() => navigation.navigate("ShopProducts")}
                        >
                            <Text style={styles.viewAllText}>View All</Text>
                            <Ionicons name="arrow-forward" size={14} color={COLORS.accent} />
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
                            <Ionicons name="search" size={28} color={COLORS.textDim} />
                            <Text style={styles.noProductsText}>No products found</Text>
                        </View>
                    )}
                    {productsCtg.length > 4 && (
                        <TouchableOpacity
                            style={styles.shopMoreBtn}
                            onPress={() => navigation.navigate("ShopProducts")}
                        >
                            <Text style={styles.shopMoreText}>Browse All Products</Text>
                            <Ionicons name="arrow-forward" size={16} color={COLORS.white} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* ─── FOOTER ─── */}
                <View style={styles.footer}>
                    <View style={styles.footerDivider} />
                    <Text style={styles.footerText}>RevNation Motorcycles</Text>
                    <Text style={styles.footerSub}>Passion. Precision. Performance.</Text>
                </View>

            </ScrollView>
        </Surface>
    );
};

/* ═══════════════════════ STYLES ═══════════════════════ */
const pad = isWeb && isLargeScreen ? 80 : 16;

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: COLORS.bg },
    scroll: { flex: 1, backgroundColor: COLORS.bg },
    scrollContent: {
        paddingBottom: 0,
        ...(isWeb && isLargeScreen && { maxWidth: 1400, alignSelf: "center", width: "100%" }),
    },

    /* ── Hero ── */
    hero: {
        height: isMobile ? 420 : 500,
        justifyContent: "flex-end",
        overflow: "hidden",
    },
    heroBg: {
        ...StyleSheet.absoluteFillObject,
        width: "100%",
        height: "100%",
    },
    heroOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(11,15,26,0.72)",
    },
    heroContent: {
        paddingHorizontal: pad,
        paddingBottom: isMobile ? 36 : 56,
    },
    heroTagline: {
        color: COLORS.accent,
        fontSize: 12,
        fontWeight: "800",
        letterSpacing: 3,
        marginBottom: 10,
    },
    heroTitle: {
        color: COLORS.white,
        fontSize: isMobile ? 32 : 48,
        lineHeight: isMobile ? 38 : 56,
        fontWeight: "900",
        marginBottom: 12,
    },
    heroSub: {
        color: COLORS.textMuted,
        fontSize: isMobile ? 14 : 17,
        lineHeight: isMobile ? 22 : 26,
        marginBottom: 24,
        maxWidth: 480,
    },
    heroBtns: {
        flexDirection: "row",
        gap: 12,
    },
    heroPrimary: {
        backgroundColor: COLORS.accent,
        paddingHorizontal: isMobile ? 22 : 28,
        paddingVertical: isMobile ? 13 : 15,
        borderRadius: 8,
    },
    heroPrimaryText: {
        color: COLORS.white,
        fontSize: 14,
        fontWeight: "700",
        letterSpacing: 0.3,
    },
    heroSecondary: {
        borderWidth: 1.5,
        borderColor: "rgba(255,255,255,0.25)",
        paddingHorizontal: isMobile ? 22 : 28,
        paddingVertical: isMobile ? 13 : 15,
        borderRadius: 8,
    },
    heroSecondaryText: {
        color: COLORS.text,
        fontSize: 14,
        fontWeight: "600",
    },

    /* ── Services ── */
    servicesWrap: {
        paddingHorizontal: pad,
        paddingTop: 48,
        paddingBottom: 8,
    },
    servicesLabel: {
        color: COLORS.accent,
        fontSize: 11,
        fontWeight: "800",
        letterSpacing: 2.5,
        marginBottom: 6,
    },
    servicesHeading: {
        color: COLORS.white,
        fontSize: isMobile ? 24 : 34,
        fontWeight: "900",
        marginBottom: 24,
    },
    servicesGrid: {
        flexDirection: isMobile ? "column" : "row",
        gap: 14,
    },
    serviceCard: {
        flex: 1,
        backgroundColor: COLORS.card,
        borderRadius: 14,
        padding: isMobile ? 20 : 26,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
        overflow: "hidden",
    },
    serviceIconWrap: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: COLORS.accentGlow,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 14,
    },
    serviceTitle: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: "700",
        marginBottom: 8,
    },
    serviceDesc: {
        color: COLORS.textMuted,
        fontSize: 13,
        lineHeight: 20,
    },
    serviceAccent: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 3,
        backgroundColor: COLORS.accent,
        opacity: 0.5,
    },

    /* ── About ── */
    aboutWrap: {
        marginTop: 40,
        marginHorizontal: pad,
    },
    aboutInner: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: isMobile ? 22 : 36,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    aboutLeft: {
        marginBottom: 24,
    },
    aboutLabel: {
        color: COLORS.accent,
        fontSize: 11,
        fontWeight: "800",
        letterSpacing: 2.5,
        marginBottom: 8,
    },
    aboutTitle: {
        color: COLORS.white,
        fontSize: isMobile ? 26 : 36,
        lineHeight: isMobile ? 32 : 44,
        fontWeight: "900",
        marginBottom: 12,
    },
    aboutDesc: {
        color: COLORS.textMuted,
        fontSize: isMobile ? 14 : 16,
        lineHeight: isMobile ? 22 : 26,
    },
    statsRow: {
        flexDirection: isMobile ? "column" : "row",
        gap: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: COLORS.bg,
        borderRadius: 12,
        paddingVertical: 20,
        paddingHorizontal: 16,
        alignItems: "center",
        borderWidth: 1,
        borderColor: COLORS.divider,
    },
    statVal: {
        color: COLORS.accent,
        fontSize: isMobile ? 30 : 38,
        fontWeight: "900",
        marginBottom: 4,
    },
    statLabel: {
        color: COLORS.textDim,
        fontSize: 11,
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        textAlign: "center",
    },

    /* ── Gallery ── */
    galleryWrap: {
        marginTop: 40,
        paddingHorizontal: pad,
    },
    galleryHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
        marginBottom: 20,
    },
    galleryLabel: {
        color: COLORS.accent,
        fontSize: 11,
        fontWeight: "800",
        letterSpacing: 2.5,
        marginBottom: 4,
    },
    galleryHeading: {
        color: COLORS.white,
        fontSize: isMobile ? 24 : 34,
        fontWeight: "900",
    },
    galleryGrid: {
        flexDirection: isMobile ? "column" : "row",
        gap: 12,
    },
    galleryMain: {
        flex: isMobile ? 0 : 2,
        borderRadius: 14,
        overflow: "hidden",
        backgroundColor: COLORS.card,
    },
    galleryImgLarge: {
        width: "100%",
        height: isMobile ? 220 : 340,
    },
    galleryImgOverlay: {
        position: "absolute",
        bottom: 12,
        left: 12,
        backgroundColor: "rgba(234,88,12,0.9)",
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 6,
    },
    galleryImgTag: {
        color: COLORS.white,
        fontSize: 10,
        fontWeight: "800",
        letterSpacing: 1,
    },
    gallerySide: {
        flex: 1,
        gap: 12,
    },
    gallerySideItem: {
        borderRadius: 14,
        overflow: "hidden",
        backgroundColor: COLORS.card,
    },
    galleryImgSmall: {
        width: "100%",
        height: isMobile ? 160 : 164,
    },

    /* ── CTA ── */
    ctaWrap: {
        marginTop: 40,
        marginHorizontal: pad,
    },
    ctaCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: isMobile ? 28 : 44,
        alignItems: "center",
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    ctaTitle: {
        color: COLORS.white,
        fontSize: isMobile ? 24 : 32,
        fontWeight: "900",
        textAlign: "center",
        marginBottom: 10,
    },
    ctaDesc: {
        color: COLORS.textMuted,
        fontSize: isMobile ? 14 : 16,
        lineHeight: isMobile ? 22 : 26,
        textAlign: "center",
        marginBottom: 24,
        maxWidth: 480,
    },
    ctaBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: COLORS.accent,
        paddingHorizontal: isMobile ? 26 : 32,
        paddingVertical: isMobile ? 14 : 16,
        borderRadius: 10,
    },
    ctaBtnText: {
        color: COLORS.white,
        fontSize: 15,
        fontWeight: "700",
        letterSpacing: 0.3,
    },

    /* ── Products ── */
    productsWrap: {
        marginTop: 40,
        backgroundColor: COLORS.bg,
        paddingTop: 8,
        paddingBottom: 20,
        paddingHorizontal: isWeb && isLargeScreen ? pad : 0,
    },
    productsHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
        marginHorizontal: isWeb && isLargeScreen ? 0 : 16,
        marginBottom: 16,
    },
    productsLabel: {
        color: COLORS.accent,
        fontSize: 11,
        fontWeight: "800",
        letterSpacing: 2.5,
        marginBottom: 4,
    },
    productsHeading: {
        color: COLORS.white,
        fontSize: isMobile ? 24 : 34,
        fontWeight: "900",
    },
    viewAllBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        borderWidth: 1.5,
        borderColor: COLORS.accent,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    viewAllText: {
        color: COLORS.accent,
        fontSize: 13,
        fontWeight: "700",
    },
    listContainer: {
        flexDirection: "row",
        alignItems: "flex-start",
        flexWrap: "wrap",
        backgroundColor: COLORS.bg,
        paddingBottom: 20,
        gap: isWeb && isLargeScreen ? 24 : 0,
    },
    shopMoreBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: COLORS.accent,
        marginHorizontal: isWeb && isLargeScreen ? 0 : 16,
        marginTop: 20,
        paddingVertical: 16,
        borderRadius: 10,
    },
    shopMoreText: {
        color: COLORS.white,
        fontSize: 15,
        fontWeight: "700",
        letterSpacing: 0.3,
    },
    center: {
        justifyContent: "center",
        alignItems: "center",
        gap: 8,
    },
    noProductsText: {
        color: COLORS.textDim,
        fontSize: 14,
        marginTop: 4,
    },

    /* ── Footer ── */
    footer: {
        alignItems: "center",
        paddingVertical: 32,
        paddingHorizontal: pad,
    },
    footerDivider: {
        width: 40,
        height: 3,
        backgroundColor: COLORS.accent,
        borderRadius: 2,
        marginBottom: 16,
    },
    footerText: {
        color: COLORS.textMuted,
        fontSize: 14,
        fontWeight: "700",
        letterSpacing: 1,
        marginBottom: 4,
    },
    footerSub: {
        color: COLORS.textDim,
        fontSize: 12,
        fontStyle: "italic",
    },
});

export default ProductContainer;
