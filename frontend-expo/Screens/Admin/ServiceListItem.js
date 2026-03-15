import React from "react";
import {
    View,
    StyleSheet,
    Text,
    Image,
    TouchableOpacity,
    ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { resolveImageUrl } from "../../assets/common/imageUrl";

const ServiceListItem = ({ item, deleteService, isDeleting = false }) => {
    const navigation = useNavigation();
    const itemId = item.id || item._id;
    const imageUri = resolveImageUrl(item.image);

    return (
        <View style={styles.card}>
            <Image source={{ uri: imageUri }} resizeMode="cover" style={styles.image} />

            <View style={styles.content}>
                <View style={styles.topRow}>
                    <View style={styles.leftInfo}>
                        <Text style={styles.eyebrow}>{item.isFeatured ? "Featured Service" : "Service"}</Text>
                        <Text style={styles.name} numberOfLines={1}>{item.name || "Unnamed service"}</Text>
                        <Text style={styles.meta} numberOfLines={1}>{item.duration || "Custom duration"}</Text>
                    </View>

                    <Text style={styles.price}>${Number(item.price || 0).toFixed(2)}</Text>
                </View>

                <Text style={styles.description} numberOfLines={2}>
                    {item.description || "No description provided yet."}
                </Text>

                <View style={styles.bottomRow}>
                    <View style={[styles.badge, item.isFeatured ? styles.badgeFeatured : styles.badgeStandard]}>
                        <Text style={styles.badgeText}>{item.isFeatured ? "Featured" : "Standard"}</Text>
                    </View>

                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => navigation.navigate("ServiceForm", { item })}
                        >
                            <Ionicons name="create-outline" size={16} color="#fdba74" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionButton, styles.deleteAction]}
                            onPress={() => deleteService(itemId)}
                        >
                            {isDeleting ? (
                                <ActivityIndicator size="small" color="#ef4444" />
                            ) : (
                                <Ionicons name="trash-outline" size={16} color="#ef4444" />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: "#111827",
        borderRadius: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.15)",
        overflow: "hidden",
        flexDirection: "row",
    },
    image: {
        width: 88,
        height: 88,
        backgroundColor: "#0b1220",
    },
    content: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 10,
        justifyContent: "space-between",
    },
    topRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 10,
    },
    leftInfo: {
        flex: 1,
    },
    eyebrow: {
        color: "#fb923c",
        fontSize: 11,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        fontWeight: "700",
    },
    name: {
        color: "#f8fafc",
        fontSize: 15,
        fontWeight: "700",
        marginTop: 2,
    },
    meta: {
        color: "#94a3b8",
        fontSize: 12,
        marginTop: 2,
    },
    price: {
        color: "#f8fafc",
        fontSize: 16,
        fontWeight: "800",
    },
    description: {
        color: "#cbd5e1",
        fontSize: 12,
        lineHeight: 17,
        marginTop: 6,
    },
    bottomRow: {
        marginTop: 8,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 10,
    },
    badge: {
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    badgeFeatured: {
        backgroundColor: "#0f766e",
    },
    badgeStandard: {
        backgroundColor: "#334155",
    },
    badgeText: {
        color: "#fff",
        fontSize: 11,
        fontWeight: "700",
    },
    actions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    actionButton: {
        backgroundColor: "#0b1220",
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.2)",
    },
    deleteAction: {
        borderColor: "rgba(239, 68, 68, 0.35)",
    },
});

export default ServiceListItem;