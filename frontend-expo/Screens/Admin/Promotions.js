import React, { useState, useCallback } from "react";
import {
    View,
    Text,
    FlatList,
    ActivityIndicator,
    StyleSheet,
    RefreshControl,
    TouchableOpacity,
    Alert,
    Modal,
    ScrollView,
    TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Searchbar } from "react-native-paper";
import axios from "axios";
import baseURL from "../../assets/common/baseurl";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";

const Promotions = () => {
    const [promotionList, setPromotionsList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingPromotion, setEditingPromotion] = useState(null);
    const navigation = useNavigation();

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        type: "percentage",
        value: "",
        minAmount: "0",
        maxDiscount: "",
        usageLimit: "",
        usageLimitPerUser: "",
        startDate: "",
        endDate: "",
        sendNotification: false,
    });

    const fetchPromotions = useCallback(async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem("jwt");
            if (!token) return;

            const response = await axios.get(`${baseURL}promotions`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setPromotionsList(response.data.promotions || []);
        } catch (error) {
            console.error("Error fetching promotions:", error);
            Alert.alert("Error", "Failed to fetch promotions");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchPromotions();
        }, [fetchPromotions])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchPromotions();
    };

    const handleAdd = () => {
        setEditingPromotion(null);
        setFormData({
            title: "",
            description: "",
            type: "percentage",
            value: "",
            minAmount: "0",
            maxDiscount: "",
            usageLimit: "",
            usageLimitPerUser: "",
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            sendNotification: false,
        });
        setShowAddModal(true);
    };

    const handleEdit = (promotion) => {
        setEditingPromotion(promotion);
        
        // Helper function to safely convert date to ISO string
        const safeToISOString = (dateValue) => {
            if (!dateValue) return new Date().toISOString();
            try {
                const date = new Date(dateValue);
                if (isNaN(date.getTime())) {
                    console.warn('Invalid date value:', dateValue, 'using current date instead');
                    return new Date().toISOString();
                }
                return date.toISOString();
            } catch (error) {
                console.warn('Error parsing date:', dateValue, error, 'using current date instead');
                return new Date().toISOString();
            }
        };
        
        setFormData({
            title: promotion.title,
            description: promotion.description,
            type: promotion.type,
            value: promotion.value?.toString() || "",
            minAmount: promotion.minAmount?.toString() || "0",
            maxDiscount: promotion.maxDiscount?.toString() || "",
            usageLimit: promotion.usageLimit?.toString() || "",
            usageLimitPerUser: promotion.usageLimitPerUser?.toString() || "",
            startDate: safeToISOString(promotion.startDate),
            endDate: safeToISOString(promotion.endDate),
            sendNotification: false,
        });
        setShowAddModal(true);
    };

    const handleDelete = (promotionId) => {
        Alert.alert(
            "Delete Promotion",
            "Are you sure you want to delete this promotion?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            console.log("Attempting to delete promotion:", promotionId);
                            const token = await AsyncStorage.getItem("jwt");
                            
                            if (!token) {
                                Alert.alert("Error", "Please login first");
                                return;
                            }
                            
                            console.log("Making delete request...");
                            const response = await axios.delete(`${baseURL}promotions/${promotionId}`, {
                                headers: { Authorization: `Bearer ${token}` },
                            });
                            
                            console.log("Delete response:", response.data);
                            Alert.alert("Success", "Promotion deleted successfully");
                            fetchPromotions(); // Refresh the list
                            
                        } catch (error) {
                            console.error("Delete error:", error);
                            const errorMessage = error.response?.data?.message || "Failed to delete promotion";
                            Alert.alert("Error", errorMessage);
                        }
                    },
                },
            ]
        );
    };

    const handleSendNotification = async (promotionId) => {
        Alert.alert(
            "Send Promotion Notification",
            "Send this promotion to all users?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Send",
                    onPress: async () => {
                        try {
                            const token = await AsyncStorage.getItem("jwt");
                            const response = await axios.post(`${baseURL}promotions/${promotionId}/notify`, {}, {
                                headers: { Authorization: `Bearer ${token}` },
                            });
                            Alert.alert("Success", `Notification sent to ${response.data.notifiedUsers} users`);
                        } catch (error) {
                            Alert.alert("Error", "Failed to send notification");
                        }
                    },
                },
            ]
        );
    };

    const handleGenerateCoupon = async (promotionId) => {
        Alert.alert(
            "Generate Coupon from Promotion",
            "Create a coupon code based on this promotion?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Generate",
                    onPress: async () => {
                        try {
                            const token = await AsyncStorage.getItem("jwt");
                            const response = await axios.post(`${baseURL}promotions/${promotionId}/generate-coupon`, {}, {
                                headers: { Authorization: `Bearer ${token}` },
                            });
                            Alert.alert("Success", `Coupon generated: ${response.data.coupon.code}`);
                            fetchPromotions(); // Refresh to show any updates
                        } catch (error) {
                            Alert.alert("Error", error.response?.data?.message || "Failed to generate coupon");
                        }
                    },
                },
            ]
        );
    };

    const handleClaimCoupon = async (promotionId) => {
        try {
            const token = await AsyncStorage.getItem("jwt");
            const response = await axios.post(`${baseURL}promotions/${promotionId}/claim-coupon`, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });
            Alert.alert("Success", `Coupon claimed: ${response.data.coupon.code}`);
        } catch (error) {
            Alert.alert("Error", error.response?.data?.message || "Failed to claim coupon");
        }
    };

    const handleSubmit = async () => {
        try {
            const token = await AsyncStorage.getItem("jwt");
            
            // Validation
            if (!formData.title || !formData.description || !formData.startDate || !formData.endDate) {
                Alert.alert("Error", "Please fill in all required fields");
                return;
            }

            if (formData.type !== "buy_one_get_one" && formData.type !== "free_shipping" && !formData.value) {
                Alert.alert("Error", "Please enter a discount value");
                return;
            }

            const payload = {
                ...formData,
                value: (formData.type === "buy_one_get_one" || formData.type === "free_shipping") ? null : parseFloat(formData.value),
                minAmount: parseFloat(formData.minAmount) || 0,
                maxDiscount: formData.maxDiscount ? parseFloat(formData.maxDiscount) : null,
                usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : null,
                usageLimitPerUser: formData.usageLimitPerUser ? parseInt(formData.usageLimitPerUser) : null,
                sendNotification: formData.sendNotification,
            };

            if (editingPromotion) {
                await axios.put(`${baseURL}promotions/${editingPromotion.id}`, payload, {
                    headers: { Authorization: `Bearer ${token}` },
                });
            } else {
                await axios.post(`${baseURL}promotions`, payload, {
                    headers: { Authorization: `Bearer ${token}` },
                });
            }

            setShowAddModal(false);
            fetchPromotions();
            Alert.alert("Success", `Promotion ${editingPromotion ? "updated" : "created"} successfully`);
        } catch (error) {
            Alert.alert("Error", error.response?.data?.message || "Failed to save promotion");
        }
    };

    const getStatusColor = (promotion) => {
        if (promotion.isExpired) return "#ef4444";
        if (promotion.isUpcoming) return "#f59e0b";
        return "#10b981";
    };

    const getStatusText = (promotion) => {
        if (promotion.isExpired) return "Expired";
        if (promotion.isUpcoming) return "Upcoming";
        return "Active";
    };

    // Helper function to safely format date for input
    const safeFormatDate = (dateValue) => {
        if (!dateValue) return '';
        try {
            const date = new Date(dateValue);
            if (isNaN(date.getTime())) {
                console.warn('Invalid date for formatting:', dateValue);
                return '';
            }
            return date.toISOString().split('T')[0];
        } catch (error) {
            console.warn('Error formatting date:', dateValue, error);
            return '';
        }
    };

    // Helper function to safely format date for display
    const safeDisplayDate = (dateValue) => {
        if (!dateValue) return 'Invalid Date';
        try {
            const date = new Date(dateValue);
            if (isNaN(date.getTime())) {
                console.warn('Invalid date for display:', dateValue);
                return 'Invalid Date';
            }
            return date.toLocaleDateString();
        } catch (error) {
            console.warn('Error displaying date:', dateValue, error);
            return 'Invalid Date';
        }
    };

    const filteredPromotions = promotionList.filter(promotion =>
        promotion.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        promotion.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderPromotionItem = ({ item }) => (
        <View style={styles.promotionCard}>
            <View style={styles.promotionHeader}>
                <View style={styles.promotionInfo}>
                    <Text style={styles.promotionTitle}>{item.title}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item) }]}>
                    <Text style={styles.statusText}>{getStatusText(item)}</Text>
                </View>
            </View>
            
            <Text style={styles.promotionDescription}>{item.description}</Text>
            
            <View style={styles.promotionDetails}>
                <Text style={styles.detailText}>
                    Type: {item.type === "percentage" ? `${item.value}%` : 
                           item.type === "fixed" ? `P${item.value}` : 
                           item.type === "buy_one_get_one" ? "Buy 1 Get 1" : 
                           "Free Shipping"}
                </Text>
                {item.minAmount > 0 && (
                    <Text style={styles.detailText}>Min: P{item.minAmount}</Text>
                )}
                {item.usageLimit && (
                    <Text style={styles.detailText}>Usage: {item.usedCount}/{item.usageLimit}</Text>
                )}
                <Text style={styles.detailText}>
                    {safeDisplayDate(item.startDate)} - {safeDisplayDate(item.endDate)}
                </Text>
            </View>
            
            <View style={styles.promotionActions}>
                <TouchableOpacity style={styles.notifyButton} onPress={() => handleSendNotification(item.id)}>
                    <Ionicons name="notifications-outline" size={16} color="#fff" />
                    <Text style={styles.buttonText}>Notify</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.couponButton} onPress={() => handleGenerateCoupon(item.id)}>
                    <Ionicons name="ticket-outline" size={16} color="#fff" />
                    <Text style={styles.buttonText}>Generate</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.editButton} onPress={() => handleEdit(item)}>
                    <Ionicons name="create-outline" size={16} color="#fff" />
                    <Text style={styles.buttonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item.id)}>
                    <Ionicons name="trash-outline" size={16} color="#fff" />
                    <Text style={styles.buttonText}>Delete</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <LinearGradient colors={["#ea580c", "#dc2626"]} style={styles.header}>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Promotion Management</Text>
                    <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
                        <Ionicons name="add" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
                <Searchbar
                    placeholder="Search promotions..."
                    onChangeText={setSearchQuery}
                    value={searchQuery}
                    style={styles.searchBar}
                    inputStyle={styles.searchInput}
                />
            </LinearGradient>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#ea580c" />
                </View>
            ) : (
                <FlatList
                    data={filteredPromotions}
                    renderItem={renderPromotionItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContainer}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="megaphone-outline" size={48} color="#94a3b8" />
                            <Text style={styles.emptyText}>No promotions found</Text>
                        </View>
                    }
                />
            )}

            <Modal visible={showAddModal} animationType="slide" presentationStyle="page">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setShowAddModal(false)}>
                            <Ionicons name="close" size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>
                            {editingPromotion ? "Edit Promotion" : "Add Promotion"}
                        </Text>
                        <TouchableOpacity onPress={handleSubmit}>
                            <Text style={styles.saveButton}>Save</Text>
                        </TouchableOpacity>
                    </View>
                    
                    <ScrollView style={styles.modalContent}>
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Title *</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.title}
                                onChangeText={(text) => setFormData({ ...formData, title: text })}
                                placeholder="Enter promotion title"
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Description *</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={formData.description}
                                onChangeText={(text) => setFormData({ ...formData, description: text })}
                                placeholder="Enter promotion description"
                                multiline
                                numberOfLines={3}
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Type *</Text>
                            <View style={styles.typeButtons}>
                                {["percentage", "fixed", "buy_one_get_one", "free_shipping"].map((type) => (
                                    <TouchableOpacity
                                        key={type}
                                        style={[
                                            styles.typeButton,
                                            formData.type === type && styles.typeButtonActive
                                        ]}
                                        onPress={() => setFormData({ ...formData, type })}
                                    >
                                        <Text style={[
                                            styles.typeButtonText,
                                            formData.type === type && styles.typeButtonTextActive
                                        ]}>
                                            {type === "percentage" ? "%" : 
                                             type === "fixed" ? "Fixed" : 
                                             type === "buy_one_get_one" ? "BOGO" : 
                                             "Free Ship"}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {formData.type !== "buy_one_get_one" && formData.type !== "free_shipping" && (
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Value *</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.value}
                                    onChangeText={(text) => setFormData({ ...formData, value: text })}
                                    placeholder={formData.type === "percentage" ? "Enter percentage" : "Enter amount"}
                                    keyboardType="numeric"
                                />
                            </View>
                        )}

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Minimum Amount</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.minAmount}
                                onChangeText={(text) => setFormData({ ...formData, minAmount: text })}
                                placeholder="Enter minimum order amount"
                                keyboardType="numeric"
                            />
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.formGroup, { flex: 1 }]}>
                                <Text style={styles.label}>Usage Limit</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.usageLimit}
                                    onChangeText={(text) => setFormData({ ...formData, usageLimit: text })}
                                    placeholder="Total usage limit"
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={[styles.formGroup, { flex: 1, marginLeft: 10 }]}>
                                <Text style={styles.label}>Per User Limit</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.usageLimitPerUser}
                                    onChangeText={(text) => setFormData({ ...formData, usageLimitPerUser: text })}
                                    placeholder="Per user limit"
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.formGroup, { flex: 1 }]}>
                                <Text style={styles.label}>Start Date *</Text>
                                <TextInput
                                    style={styles.input}
                                    value={safeFormatDate(formData.startDate)}
                                    onChangeText={(text) => setFormData({ ...formData, startDate: new Date(text).toISOString() })}
                                    placeholder="YYYY-MM-DD"
                                />
                            </View>
                            <View style={[styles.formGroup, { flex: 1, marginLeft: 10 }]}>
                                <Text style={styles.label}>End Date *</Text>
                                <TextInput
                                    style={styles.input}
                                    value={safeFormatDate(formData.endDate)}
                                    onChangeText={(text) => setFormData({ ...formData, endDate: new Date(text).toISOString() })}
                                    placeholder="YYYY-MM-DD"
                                />
                            </View>
                        </View>

                        {!editingPromotion && (
                            <View style={styles.formGroup}>
                                <View style={styles.checkboxContainer}>
                                    <TouchableOpacity
                                        style={styles.checkbox}
                                        onPress={() => setFormData({ ...formData, sendNotification: !formData.sendNotification })}
                                    >
                                        <Ionicons
                                            name={formData.sendNotification ? "checkbox" : "square-outline"}
                                            size={20}
                                            color={formData.sendNotification ? "#ea580c" : "#94a3b8"}
                                        />
                                    </TouchableOpacity>
                                    <Text style={styles.checkboxLabel}>Send notification to all users</Text>
                                </View>
                            </View>
                        )}
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0b0f1a",
    },
    header: {
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    headerContent: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 15,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: "#fff",
    },
    addButton: {
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
    },
    searchBar: {
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        borderRadius: 10,
    },
    searchInput: {
        color: "#fff",
    },
    listContainer: {
        padding: 20,
    },
    promotionCard: {
        backgroundColor: "#1e293b",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.1)",
    },
    promotionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 8,
    },
    promotionInfo: {
        flex: 1,
    },
    promotionTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#f8fafc",
        marginBottom: 4,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#fff",
    },
    promotionDescription: {
        fontSize: 13,
        color: "#94a3b8",
        marginBottom: 12,
        lineHeight: 18,
    },
    promotionDetails: {
        marginBottom: 12,
    },
    detailText: {
        fontSize: 12,
        color: "#64748b",
        marginBottom: 2,
    },
    promotionActions: {
        flexDirection: "row",
        gap: 8,
    },
    notifyButton: {
        flex: 1,
        flexDirection: "row",
        backgroundColor: "#10b981",
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderRadius: 6,
        justifyContent: "center",
        alignItems: "center",
        gap: 4,
    },
    couponButton: {
        flex: 1,
        flexDirection: "row",
        backgroundColor: "#8b5cf6",
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderRadius: 6,
        justifyContent: "center",
        alignItems: "center",
        gap: 4,
    },
    editButton: {
        flex: 1,
        flexDirection: "row",
        backgroundColor: "#3b82f6",
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderRadius: 6,
        justifyContent: "center",
        alignItems: "center",
        gap: 4,
    },
    deleteButton: {
        flex: 1,
        flexDirection: "row",
        backgroundColor: "#ef4444",
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderRadius: 6,
        justifyContent: "center",
        alignItems: "center",
        gap: 4,
    },
    buttonText: {
        fontSize: 11,
        fontWeight: "600",
        color: "#fff",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 16,
        color: "#94a3b8",
        marginTop: 12,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: "#0b0f1a",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 20,
        backgroundColor: "#1e293b",
        borderBottomWidth: 1,
        borderBottomColor: "rgba(148, 163, 184, 0.1)",
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#fff",
    },
    saveButton: {
        fontSize: 16,
        fontWeight: "600",
        color: "#ea580c",
    },
    modalContent: {
        flex: 1,
        padding: 20,
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: "#f8fafc",
        marginBottom: 8,
    },
    input: {
        backgroundColor: "#1e293b",
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.2)",
        borderRadius: 8,
        padding: 12,
        color: "#f8fafc",
        fontSize: 14,
    },
    textArea: {
        height: 80,
        textAlignVertical: "top",
    },
    typeButtons: {
        flexDirection: "row",
        gap: 8,
    },
    typeButton: {
        flex: 1,
        padding: 10,
        borderRadius: 6,
        backgroundColor: "#1e293b",
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.2)",
        alignItems: "center",
    },
    typeButtonActive: {
        backgroundColor: "#ea580c",
        borderColor: "#ea580c",
    },
    typeButtonText: {
        fontSize: 11,
        fontWeight: "600",
        color: "#94a3b8",
    },
    typeButtonTextActive: {
        color: "#fff",
    },
    checkboxContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    checkbox: {
        padding: 4,
    },
    checkboxLabel: {
        fontSize: 14,
        color: "#f8fafc",
        flex: 1,
    },
    row: {
        flexDirection: "row",
    },
});

export default Promotions;
