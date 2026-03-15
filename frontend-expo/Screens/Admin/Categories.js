import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    FlatList,
    TextInput,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
} from "react-native";
import EasyButton from "../../Shared/StyledComponents/EasyButton";
import baseURL from "../../assets/common/baseurl";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const normalizeCategoryColor = (color) => {
    const value = String(color || "").trim().toLowerCase();
    if (!value || value === "#333" || value === "#333333") {
        return "#fb923c";
    }
    return color;
};

const Item = ({ item, onEdit, onDelete, isDeleting }) => (
    <View style={styles.itemCard}>
        <View style={styles.itemActions}>
            <View style={styles.categoryLabelWrap}>
                <View style={[styles.categoryDot, { backgroundColor: normalizeCategoryColor(item.color) }]} />
                <Text style={styles.categoryName}>{item.name}</Text>
            </View>
            <View>
                <TouchableOpacity style={styles.iconBtn} onPress={() => onEdit(item)}>
                    <Ionicons name="create-outline" size={16} color="#fdba74" />
                </TouchableOpacity>
            </View>
            <View style={styles.actionButton}>
                <TouchableOpacity
                    style={[styles.iconBtn, styles.deleteBtn]}
                    onPress={() => onDelete(item.id || item._id)}
                >
                    {isDeleting ? (
                        <ActivityIndicator color="#ef4444" size="small" />
                    ) : (
                        <Ionicons name="trash-outline" size={16} color="#ef4444" />
                    )}
                </TouchableOpacity>
            </View>
        </View>
    </View>
);

const Categories = () => {
    const [categories, setCategories] = useState([]);
    const [categoryName, setCategoryName] = useState("");
    const [token, setToken] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    useEffect(() => {
        AsyncStorage.getItem("jwt").then((res) => setToken(res || "")).catch(() => {});
        axios.get(`${baseURL}categories`).then((res) => setCategories(res.data)).catch(() => alert("Error loading categories"));
        return () => {
            setCategories([]);
            setToken("");
        };
    }, []);

    const resetEdit = () => {
        setEditingId(null);
        setCategoryName("");
    };

    const submitCategory = () => {
        if (!categoryName.trim() || isSubmitting) return;
        setIsSubmitting(true);
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const payload = { name: categoryName.trim() };
        const request = editingId
            ? axios.put(`${baseURL}categories/${editingId}`, payload, config)
            : axios.post(`${baseURL}categories`, payload, config);

        request
            .then((res) => {
                if (editingId) {
                    const updated = res.data;
                    setCategories((prev) =>
                        prev.map((item) =>
                            (item.id || item._id) === editingId ? updated : item
                        )
                    );
                } else {
                    setCategories((prev) => [...prev, res.data]);
                }
                resetEdit();
            })
            .catch(() => alert(editingId ? "Error updating category" : "Error adding category"))
            .finally(() => setIsSubmitting(false));
    };

    const startEdit = (item) => {
        setEditingId(item.id || item._id);
        setCategoryName(item.name || "");
    };

    const deleteCategory = (id) => {
        if (deletingId) return;
        setDeletingId(id);
        const config = { headers: { Authorization: `Bearer ${token}` } };
        axios
            .delete(`${baseURL}categories/${id}`, config)
            .then(() => {
                setCategories((prev) => prev.filter((item) => (item.id || item._id) !== id));
                if (editingId === id) resetEdit();
            })
            .catch(() => alert("Error deleting category"))
            .finally(() => setDeletingId(null));
    };

    return (
        <View style={styles.screen}>
            <LinearGradient
                colors={["#131927", "#0f172a"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.hero}
            >
                <Text style={styles.eyebrow}>Admin Workspace</Text>
                <Text style={styles.title}>Categories</Text>
                <Text style={styles.subtitle}>Organize your products with clean category groups.</Text>
                <View style={styles.metaRow}>
                    <View style={styles.metaPill}>
                        <Ionicons name="layers-outline" size={14} color="#f8fafc" />
                        <Text style={styles.metaText}>{categories.length} categories</Text>
                    </View>
                    {editingId ? (
                        <View style={styles.metaPill}>
                            <Ionicons name="create-outline" size={14} color="#f8fafc" />
                            <Text style={styles.metaText}>Editing mode</Text>
                        </View>
                    ) : null}
                </View>
            </LinearGradient>

            <View style={styles.formCard}>
                <Text style={styles.formTitle}>{editingId ? "Update Category" : "Add Category"}</Text>
                <TextInput
                    value={categoryName}
                    style={styles.input}
                    onChangeText={setCategoryName}
                    placeholder="Category name"
                    placeholderTextColor="#64748b"
                />
                <View style={styles.formActions}>
                    <EasyButton medium primary onPress={submitCategory}>
                        {isSubmitting ? (
                            <ActivityIndicator color="white" size="small" />
                        ) : (
                            <Text style={styles.formBtnText}>{editingId ? "Update" : "Submit"}</Text>
                        )}
                    </EasyButton>
                    {editingId ? (
                        <EasyButton medium secondary onPress={resetEdit}>
                            <Text style={styles.formBtnText}>Cancel</Text>
                        </EasyButton>
                    ) : null}
                </View>
            </View>

            <View style={styles.listWrap}>
                <FlatList
                    data={categories}
                    renderItem={({ item, index }) => (
                        <Item
                            item={item}
                            index={index}
                            onEdit={startEdit}
                            onDelete={deleteCategory}
                            isDeleting={deletingId === (item.id || item._id)}
                        />
                    )}
                    keyExtractor={(item) => String(item.id || item._id)}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="pricetag-outline" size={36} color="#334155" />
                            <Text style={styles.emptyTitle}>No categories yet</Text>
                            <Text style={styles.emptyText}>Create your first category using the form above.</Text>
                        </View>
                    }
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: "#080c17",
        padding: 12,
    },
    hero: {
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: "rgba(251, 146, 60, 0.2)",
        marginBottom: 12,
    },
    eyebrow: {
        color: "#94a3b8",
        fontSize: 12,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    title: {
        color: "#f8fafc",
        fontSize: 24,
        fontWeight: "800",
        marginTop: 4,
    },
    subtitle: {
        color: "#94a3b8",
        marginTop: 4,
        fontSize: 13,
        lineHeight: 18,
    },
    metaRow: {
        flexDirection: "row",
        gap: 8,
        marginTop: 12,
    },
    metaPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        backgroundColor: "rgba(15, 23, 42, 0.8)",
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.25)",
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    metaText: {
        color: "#f8fafc",
        fontSize: 12,
        fontWeight: "600",
    },
    formCard: {
        backgroundColor: "#111827",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.16)",
        padding: 12,
        marginBottom: 12,
    },
    formTitle: {
        color: "#f8fafc",
        fontSize: 16,
        fontWeight: "700",
        marginBottom: 10,
    },
    input: {
        height: 44,
        borderColor: "rgba(234, 88, 12, 0.3)",
        borderWidth: 1,
        backgroundColor: "#0b1220",
        color: "#f1f5f9",
        paddingHorizontal: 12,
        borderRadius: 10,
        fontSize: 15,
        fontWeight: "500",
    },
    formActions: {
        marginTop: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    formBtnText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 14,
    },
    listWrap: {
        flex: 1,
    },
    itemCard: {
        backgroundColor: "#111827",
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.16)",
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
    },
    categoryLabelWrap: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        flex: 1,
    },
    categoryDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: "#e2e8f0",
    },
    categoryName: {
        color: "#f8fafc",
        fontSize: 16,
        fontWeight: "600",
    },
    itemActions: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    iconBtn: {
        width: 34,
        height: 34,
        borderRadius: 9,
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.25)",
        backgroundColor: "#0b1220",
        alignItems: "center",
        justifyContent: "center",
    },
    actionButton: {
        marginLeft: 6,
    },
    deleteBtn: {
        borderColor: "rgba(239, 68, 68, 0.35)",
    },
    emptyState: {
        marginTop: 30,
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    emptyTitle: {
        color: "#f8fafc",
        fontSize: 16,
        fontWeight: "700",
    },
    emptyText: {
        color: "#94a3b8",
        fontSize: 13,
        textAlign: "center",
    },
});

export default Categories;
