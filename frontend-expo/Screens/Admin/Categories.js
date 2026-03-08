import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    FlatList,
    Dimensions,
    TextInput,
    StyleSheet,
    ActivityIndicator,
} from "react-native";
import EasyButton from "../../Shared/StyledComponents/EasyButton";
import baseURL from "../../assets/common/baseurl";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

var { width } = Dimensions.get("window");

const Item = ({ item, onEdit, onDelete, isDeleting }) => (
    <View style={styles.item}>
        <Text>{item.name}</Text>
        <View style={styles.itemActions}>
            <View>
                <EasyButton
                    primary
                    medium
                    onPress={() => onEdit(item)}
                >
                    <Text style={{ color: "white", fontWeight: "bold" }}>Edit</Text>
                </EasyButton>
            </View>
            <View style={styles.actionButton}>
                <EasyButton
                    danger
                    medium
                    onPress={() => onDelete(item.id || item._id)}
                >
                    {isDeleting ? (
                        <ActivityIndicator color="white" size="small" />
                    ) : (
                        <Text style={{ color: "white", fontWeight: "bold" }}>Delete</Text>
                    )}
                </EasyButton>
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
        <View style={{ position: "relative", height: "100%" }}>
            <View style={{ marginBottom: 60 }}>
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
                />
            </View>
            <View style={styles.bottomBar}>
                <View><Text>{editingId ? "Update Category" : "Add Category"}</Text></View>
                <View style={{ width: width / 2.5 }}>
                    <TextInput
                        value={categoryName}
                        style={styles.input}
                        onChangeText={setCategoryName}
                        placeholder="Category name"
                    />
                </View>
                <View>
                    <EasyButton medium primary onPress={submitCategory}>
                        {isSubmitting ? (
                            <ActivityIndicator color="white" size="small" />
                        ) : (
                            <Text style={{ color: "white", fontWeight: "bold" }}>
                                {editingId ? "Update" : "Submit"}
                            </Text>
                        )}
                    </EasyButton>
                </View>
                {editingId ? (
                    <View>
                        <EasyButton medium secondary onPress={resetEdit}>
                            <Text style={{ color: "white", fontWeight: "bold" }}>Cancel</Text>
                        </EasyButton>
                    </View>
                ) : null}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    bottomBar: {
        backgroundColor: "white",
        width: width,
        height: 60,
        padding: 2,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        position: "absolute",
        bottom: 0,
        left: 0,
    },
    input: {
        height: 40,
        borderColor: "gray",
        borderWidth: 1,
    },
    item: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 1,
        elevation: 1,
        padding: 5,
        margin: 5,
        backgroundColor: "white",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderRadius: 5,
    },
    itemActions: {
        flexDirection: "row",
        alignItems: "center",
    },
    actionButton: {
        marginLeft: 8,
    },
});

export default Categories;
