import React, { useState, useCallback, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    FlatList,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    RefreshControl,
    Modal,
    TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Searchbar } from "react-native-paper";
import axios from "axios";
import baseURL from "../../assets/common/baseurl";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";

const Coupons = () => {
    const [couponList, setCouponsList] = useState([]);
    const [promotionList, setPromotionList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState('coupons');
    const [showAddModal, setShowAddModal] = useState(false);
    const [deleteModal, setDeleteModal] = useState({ visible: false, type: null, id: null, name: "" });
    const [notifyModal, setNotifyModal] = useState({ visible: false, type: null, id: null, name: "" });
    const [editingCoupon, setEditingCoupon] = useState(null);
    const [editingPromotion, setEditingPromotion] = useState(null);
    const navigation = useNavigation();

    const [formData, setFormData] = useState({
        code: "",
        title: "",
        description: "",
        type: "percentage",
        value: "",
        minAmount: "0",
        maxDiscount: "",
        usageLimit: "",
        usageLimitPerUser: "",
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        applicableProducts: [],
        applicableCategories: [],
        sendNotification: false,
    });

    const [promotionFormData, setPromotionFormData] = useState({
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

    const fetchCoupons = useCallback(async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem("jwt");
            if (!token) return;

            const [couponsResponse, promotionsResponse] = await Promise.all([
                axios.get(`${baseURL}coupons`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                axios.get(`${baseURL}promotions`, {
                    headers: { Authorization: `Bearer ${token}` },
                })
            ]);

            const coupons = couponsResponse.data.coupons || [];
            const promotions = promotionsResponse.data.promotions || [];
            
            setCouponsList(coupons);
            setPromotionList(promotions);
        } catch (error) {
            console.error("Error fetching data:", error);
            if (error.response?.status === 401) {
                Alert.alert("Error", "Authentication failed - please login again");
            } else if (error.response?.status === 403) {
                Alert.alert("Error", "Admin access required");
            } else {
                Alert.alert("Error", `Failed to fetch data: ${error.message}`);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    const handleAdd = () => {
        if (activeTab === 'coupons') {
            setEditingCoupon(null);
            setFormData({
                code: "",
                title: "",
                description: "",
                type: "percentage",
                value: "",
                minAmount: "0",
                maxDiscount: "",
                usageLimit: "",
                usageLimitPerUser: "",
                startDate: new Date(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                applicableProducts: [],
                applicableCategories: [],
                sendNotification: false,
            });
        } else {
            setEditingPromotion(null);
            setPromotionFormData({
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
        }
        setShowAddModal(true);
    };

    const handleSubmit = async () => {
        try {
            const token = await AsyncStorage.getItem("jwt");
            
            if (activeTab === 'coupons') {
                // Coupon validation
                if (!formData.code || !formData.title || !formData.description) {
                    Alert.alert("Error", "Please fill in all required fields");
                    return;
                }

                const payload = {
                    code: formData.code,
                    title: formData.title,
                    description: formData.description,
                    type: formData.type,
                    value: formData.type === "free_shipping" ? null : parseFloat(formData.value),
                    minAmount: parseFloat(formData.minAmount) || 0,
                    maxDiscount: formData.maxDiscount ? parseFloat(formData.maxDiscount) : null,
                    usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : null,
                    usageLimitPerUser: formData.usageLimitPerUser ? parseInt(formData.usageLimitPerUser) : null,
                    startDate: formData.startDate.toISOString(),
                    endDate: formData.endDate.toISOString(),
                    sendNotification: formData.sendNotification,
                };

                if (editingCoupon) {
                    await axios.put(`${baseURL}coupons/${editingCoupon.id}`, payload, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                } else {
                    await axios.post(`${baseURL}coupons`, payload, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                }

                Alert.alert("Success", `Coupon ${editingCoupon ? "updated" : "created"} successfully`);
            } else {
                // Promotion validation
                if (!promotionFormData.title || !promotionFormData.description) {
                    Alert.alert("Error", "Please fill in all required fields");
                    return;
                }

                const payload = {
                    ...promotionFormData,
                    value: (promotionFormData.type === "buy_one_get_one" || promotionFormData.type === "free_shipping") ? null : parseFloat(promotionFormData.value),
                    minAmount: parseFloat(promotionFormData.minAmount) || 0,
                    maxDiscount: promotionFormData.maxDiscount ? parseFloat(promotionFormData.maxDiscount) : null,
                    usageLimit: promotionFormData.usageLimit ? parseInt(promotionFormData.usageLimit) : null,
                    usageLimitPerUser: promotionFormData.usageLimitPerUser ? parseInt(promotionFormData.usageLimitPerUser) : null,
                    sendNotification: promotionFormData.sendNotification,
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

                Alert.alert("Success", `Promotion ${editingPromotion ? "updated" : "created"} successfully`);
            }

            setShowAddModal(false);
            fetchCoupons();
        } catch (error) {
            console.error("Save error:", error);
            const errorMessage = error.response?.data?.message || error.message || "Failed to save";
            Alert.alert("Error", errorMessage);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchCoupons();
        }, [fetchCoupons]));

    useEffect(() => {
        console.log("[deleteModal] State changed:", deleteModal);
    }, [deleteModal]);

    const handleDelete = (couponId, couponName) => {
        console.log("[handleDelete] Called with:", { couponId, couponName, item: arguments[2] });
        if (!couponId) {
            console.error("[handleDelete] Missing couponId:", couponId);
            Alert.alert("Error", "Invalid coupon ID");
            return;
        }
        console.log("[handleDelete] Opening delete modal for coupon:", couponId);
        setDeleteModal({ visible: true, type: 'coupon', id: couponId, name: couponName || "this coupon" });
    };

    const handleDeletePromotion = (promotionId, promotionName) => {
        console.log("[handleDeletePromotion] Called with:", { promotionId, promotionName, item: arguments[2] });
        if (!promotionId) {
            console.error("[handleDeletePromotion] Missing promotionId:", promotionId);
            Alert.alert("Error", "Invalid promotion ID");
            return;
        }
        console.log("[handleDeletePromotion] Opening delete modal for promotion:", promotionId);
        setDeleteModal({ visible: true, type: 'promotion', id: promotionId, name: promotionName || "this promotion" });
    };

    const confirmDelete = async () => {
        console.log("[confirmDelete] Function called!");
        console.log("[confirmDelete] Current modal state:", deleteModal);
        console.log("[confirmDelete] Deleting", deleteModal.type, "with id:", deleteModal.id);
        try {
            const token = await AsyncStorage.getItem("jwt");
            console.log("[confirmDelete] Got token:", token ? "Yes" : "No");
            
            let response;
            if (deleteModal.type === 'coupon') {
                console.log("[confirmDelete] Making coupon delete request to:", `${baseURL}coupons/${deleteModal.id}`);
                response = await axios.delete(`${baseURL}coupons/${deleteModal.id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                console.log("[confirmDelete] Coupon deleted:", response.status, response.data);
            } else {
                console.log("[confirmDelete] Making promotion delete request to:", `${baseURL}promotions/${deleteModal.id}`);
                response = await axios.delete(`${baseURL}promotions/${deleteModal.id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                console.log("[confirmDelete] Promotion deleted:", response.status, response.data);
            }
            
            console.log("[confirmDelete] Refreshing data...");
            await fetchCoupons();
            console.log("[confirmDelete] Closing modal...");
            setDeleteModal({ visible: false, type: null, id: null, name: "" });
        } catch (error) {
            console.error("[confirmDelete] Error:", error);
            console.error("[confirmDelete] Error response:", error.response);
            Alert.alert("Error", `Failed to delete: ${error.response?.data?.message || error.message}`);
        }
    };

    const handleSendNotification = (couponId, couponName) => {
        console.log("[handleSendNotification] Opening notify modal for coupon:", couponId);
        setNotifyModal({ visible: true, type: 'coupon', id: couponId, name: couponName || "this coupon" });
    };

    const handleSendNotificationPromotion = (promotionId, promotionName) => {
        console.log("[handleSendNotificationPromotion] Opening notify modal for promotion:", promotionId);
        setNotifyModal({ visible: true, type: 'promotion', id: promotionId, name: promotionName || "this promotion" });
    };

    const confirmSendNotification = async () => {
        console.log("[confirmSendNotification] Sending notification for", notifyModal.type, notifyModal.id);
        try {
            const token = await AsyncStorage.getItem("jwt");
            console.log("[confirmSendNotification] Got auth token:", token ? "Yes" : "No");
            
            let response;
            if (notifyModal.type === 'coupon') {
                response = await axios.post(`${baseURL}coupons/${notifyModal.id}/notify`, {}, {
                    headers: { Authorization: `Bearer ${token}` },
                });
            } else {
                response = await axios.post(`${baseURL}promotions/${notifyModal.id}/notify`, {}, {
                    headers: { Authorization: `Bearer ${token}` },
                });
            }
            
            console.log("[confirmSendNotification] Success:", response.data);
            Alert.alert("Success", `Notification sent to ${response.data.notifiedUsers} users`);
            setNotifyModal({ visible: false, type: null, id: null, name: "" });
        } catch (error) {
            console.error("[confirmSendNotification] Error:", error);
            console.error("[confirmSendNotification] Error response:", error.response);
            const errorMsg = error.response?.data?.message || "Failed to send notification";
            Alert.alert("Error", errorMsg);
        }
    };

    const handleEditCoupon = (coupon) => {
        setEditingCoupon(coupon);
        setFormData({
            code: coupon.code || "",
            title: coupon.title || "",
            description: coupon.description || "",
            type: coupon.type || "percentage",
            value: coupon.value?.toString() || "",
            minAmount: coupon.minAmount?.toString() || "0",
            maxDiscount: coupon.maxDiscount?.toString() || "",
            usageLimit: coupon.usageLimit?.toString() || "",
            usageLimitPerUser: coupon.usageLimitPerUser?.toString() || "",
            startDate: coupon.startDate ? new Date(coupon.startDate) : new Date(),
            endDate: coupon.endDate ? new Date(coupon.endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            applicableProducts: coupon.applicableProducts || [],
            applicableCategories: coupon.applicableCategories || [],
            sendNotification: false,
        });
        setShowAddModal(true);
    };

    const handleEditPromotion = (promotion) => {
        setEditingPromotion(promotion);
        setPromotionFormData({
            title: promotion.title || "",
            description: promotion.description || "",
            type: promotion.type || "percentage",
            value: promotion.value?.toString() || "",
            minAmount: promotion.minAmount?.toString() || "0",
            maxDiscount: promotion.maxDiscount?.toString() || "",
            usageLimit: promotion.usageLimit?.toString() || "",
            usageLimitPerUser: promotion.usageLimitPerUser?.toString() || "",
            startDate: promotion.startDate || new Date().toISOString(),
            endDate: promotion.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            sendNotification: false,
        });
        setShowAddModal(true);
    };

    const renderCouponItem = ({ item }) => (
        <View style={styles.couponCard}>
            <View style={styles.couponHeader}>
                <View style={styles.couponInfo}>
                    <Text style={styles.couponCode}>{item.code}</Text>
                    <Text style={styles.couponTitle}>{item.title}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: "#10b981" }]}>
                    <Text style={styles.statusText}>Active</Text>
                </View>
            </View>
            
            <Text style={styles.couponDescription}>{item.description}</Text>
            
            <View style={styles.couponDetails}>
                <Text style={styles.detailText}>
                    {item.type === "percentage" ? `${item.value}%` : 
                     item.type === "fixed" ? `P${item.value}` : 
                     "Free Shipping"}
                </Text>
                {item.minAmount > 0 && (
                    <Text style={styles.detailText}>Min: P{item.minAmount}</Text>
                )}
            </View>
            
            <View style={styles.couponActions}>
                <TouchableOpacity 
                    style={styles.notifyButton} 
                    onPress={() => {
                        console.log("[Notify Button] CLICKED for coupon:", item.id);
                        handleSendNotification(item.id || item._id, item.title || item.code);
                    }}
                >
                    <Ionicons name="notifications-outline" size={16} color="#fff" />
                    <Text style={styles.buttonText}>Notify</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={styles.editButton}
                    onPress={() => handleEditCoupon(item)}
                >
                    <Ionicons name="create-outline" size={16} color="#fff" />
                    <Text style={styles.buttonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={styles.deleteButton} 
                    onPress={() => {
                        console.log("[Coupon Delete Button] Pressed for item:", item);
                        console.log("[Coupon Delete Button] Item ID:", item.id || item._id);
                        console.log("[Coupon Delete Button] Item Code:", item.code);
                        handleDelete(item.id || item._id, item.code);
                    }}
                >
                    <Ionicons name="trash-outline" size={16} color="#fff" />
                    <Text style={styles.buttonText}>Delete</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderPromotionItem = ({ item }) => (
        <View style={styles.couponCard}>
            <View style={styles.couponHeader}>
                <View style={styles.couponInfo}>
                    <Text style={styles.couponTitle}>{item.title}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: "#10b981" }]}>
                    <Text style={styles.statusText}>Active</Text>
                </View>
            </View>
            
            <Text style={styles.couponDescription}>{item.description}</Text>
            
            <View style={styles.couponDetails}>
                <Text style={styles.detailText}>
                    Type: {item.type === "percentage" ? `${item.value}%` : 
                           item.type === "fixed" ? `P${item.value}` : 
                           item.type === "buy_one_get_one" ? "Buy 1 Get 1" : 
                           "Free Shipping"}
                </Text>
                {item.minAmount > 0 && (
                    <Text style={styles.detailText}>Min: P{item.minAmount}</Text>
                )}
            </View>
            
            <View style={styles.couponActions}>
                <TouchableOpacity 
                    style={styles.notifyButton} 
                    onPress={() => handleSendNotificationPromotion(item.id || item._id, item.title)}
                >
                    <Ionicons name="notifications-outline" size={16} color="#fff" />
                    <Text style={styles.buttonText}>Notify</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={styles.editButton}
                    onPress={() => handleEditPromotion(item)}
                >
                    <Ionicons name="create-outline" size={16} color="#fff" />
                    <Text style={styles.buttonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={styles.deleteButton} 
                    onPress={() => {
                        console.log("[Promotion Delete Button] Pressed for item:", item);
                        console.log("[Promotion Delete Button] Item ID:", item.id || item._id);
                        console.log("[Promotion Delete Button] Item Title:", item.title);
                        handleDeletePromotion(item.id || item._id, item.title);
                    }}
                >
                    <Ionicons name="trash-outline" size={16} color="#fff" />
                    <Text style={styles.buttonText}>Delete</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <>
            <View style={styles.container}>
            <LinearGradient colors={["#ea580c", "#dc2626"]} style={styles.header}>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Promotions & Coupons</Text>
                    <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
                        <Ionicons name="add" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
                <Searchbar
                    placeholder="Search promotions and coupons..."
                    onChangeText={setSearchQuery}
                    value={searchQuery}
                    style={styles.searchBar}
                    inputStyle={styles.searchInput}
                />
                
                <View style={styles.tabContainer}>
                    <TouchableOpacity 
                        style={[styles.tabButton, activeTab === 'coupons' && styles.tabButtonActive]}
                        onPress={() => setActiveTab('coupons')}
                    >
                        <Text style={[styles.tabText, activeTab === 'coupons' && styles.tabTextActive]}>
                            Coupons
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.tabButton, activeTab === 'promotions' && styles.tabButtonActive]}
                        onPress={() => setActiveTab('promotions')}
                    >
                        <Text style={[styles.tabText, activeTab === 'promotions' && styles.tabTextActive]}>
                            Promotions
                        </Text>
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#ea580c" />
                </View>
            ) : (
                <FlatList
                    data={activeTab === 'coupons' ? couponList : promotionList}
                    renderItem={activeTab === 'coupons' ? renderCouponItem : renderPromotionItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContainer}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => {
                            setRefreshing(true);
                            fetchCoupons();
                        }} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="pricetag-outline" size={48} color="#94a3b8" />
                            <Text style={styles.emptyText}>No items found</Text>
                        </View>
                    }
                />
            )}
        </View>
        
        <Modal visible={showAddModal} animationType="slide">
            <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={() => setShowAddModal(false)}>
                        <Text style={styles.closeButton}>Close</Text>
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>
                    {activeTab === 'coupons' 
                        ? (editingCoupon ? 'Edit Coupon' : 'Add Coupon')
                        : (editingPromotion ? 'Edit Promotion' : 'Add Promotion')
                    }
                </Text>
                    <TouchableOpacity onPress={handleSubmit}>
                        <Text style={styles.saveButton}>Save</Text>
                    </TouchableOpacity>
                </View>
                
                <ScrollView style={styles.modalContent}>
                    {activeTab === 'coupons' ? (
                        <>
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Coupon Code</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.code}
                                    onChangeText={(text) => setFormData({ ...formData, code: text })}
                                    placeholder="Enter coupon code"
                                />
                            </View>
                            
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Title</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.title}
                                    onChangeText={(text) => setFormData({ ...formData, title: text })}
                                    placeholder="Enter coupon title"
                                />
                            </View>
                            
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Description</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    value={formData.description}
                                    onChangeText={(text) => setFormData({ ...formData, description: text })}
                                    placeholder="Enter coupon description"
                                    multiline
                                    numberOfLines={3}
                                />
                            </View>
                            
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Type</Text>
                                <View style={styles.typeButtons}>
                                    {["percentage", "fixed", "free_shipping"].map((type) => (
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
                                                {type === "percentage" ? "%" : type === "fixed" ? "Fixed" : "Free Ship"}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                            
                            {formData.type !== "free_shipping" && (
                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>Value</Text>
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
                                    <Text style={styles.label}>Max Discount</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={formData.maxDiscount}
                                        onChangeText={(text) => setFormData({ ...formData, maxDiscount: text })}
                                        placeholder="Max discount amount"
                                        keyboardType="numeric"
                                    />
                                </View>
                                <View style={[styles.formGroup, { flex: 1, marginLeft: 10 }]}>
                                    <Text style={styles.label}>Usage Limit</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={formData.usageLimit}
                                        onChangeText={(text) => setFormData({ ...formData, usageLimit: text })}
                                        placeholder="Total usage limit"
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Per User Limit</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.usageLimitPerUser}
                                    onChangeText={(text) => setFormData({ ...formData, usageLimitPerUser: text })}
                                    placeholder="Usage limit per user"
                                    keyboardType="numeric"
                                />
                            </View>

                            <View style={styles.row}>
                                <View style={[styles.formGroup, { flex: 1 }]}>
                                    <Text style={styles.label}>Start Date</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={formData.startDate ? new Date(formData.startDate).toISOString().split('T')[0] : ''}
                                        onChangeText={(text) => setFormData({ ...formData, startDate: new Date(text) })}
                                        placeholder="YYYY-MM-DD"
                                    />
                                </View>
                                <View style={[styles.formGroup, { flex: 1, marginLeft: 10 }]}>
                                    <Text style={styles.label}>End Date</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={formData.endDate ? new Date(formData.endDate).toISOString().split('T')[0] : ''}
                                        onChangeText={(text) => setFormData({ ...formData, endDate: new Date(text) })}
                                        placeholder="YYYY-MM-DD"
                                    />
                                </View>
                            </View>

                            {!editingCoupon && (
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
                        </>
                    ) : (
                        <>
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Title</Text>
                                <TextInput
                                    style={styles.input}
                                    value={promotionFormData.title}
                                    onChangeText={(text) => setPromotionFormData({ ...promotionFormData, title: text })}
                                    placeholder="Enter promotion title"
                                />
                            </View>
                            
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Description</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    value={promotionFormData.description}
                                    onChangeText={(text) => setPromotionFormData({ ...promotionFormData, description: text })}
                                    placeholder="Enter promotion description"
                                    multiline
                                    numberOfLines={3}
                                />
                            </View>
                            
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Type</Text>
                                <View style={styles.typeButtons}>
                                    {["percentage", "fixed", "buy_one_get_one", "free_shipping"].map((type) => (
                                        <TouchableOpacity
                                            key={type}
                                            style={[
                                                styles.typeButton,
                                                promotionFormData.type === type && styles.typeButtonActive
                                            ]}
                                            onPress={() => setPromotionFormData({ ...promotionFormData, type })}
                                        >
                                            <Text style={[
                                                styles.typeButtonText,
                                                promotionFormData.type === type && styles.typeButtonTextActive
                                            ]}>
                                                {type === "percentage" ? "%" : type === "fixed" ? "Fixed" : type === "buy_one_get_one" ? "BOGO" : "Free Ship"}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {promotionFormData.type !== "buy_one_get_one" && promotionFormData.type !== "free_shipping" && (
                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>Value</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={promotionFormData.value}
                                        onChangeText={(text) => setPromotionFormData({ ...promotionFormData, value: text })}
                                        placeholder={promotionFormData.type === "percentage" ? "Enter percentage" : "Enter amount"}
                                        keyboardType="numeric"
                                    />
                                </View>
                            )}

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Minimum Amount</Text>
                                <TextInput
                                    style={styles.input}
                                    value={promotionFormData.minAmount}
                                    onChangeText={(text) => setPromotionFormData({ ...promotionFormData, minAmount: text })}
                                    placeholder="Enter minimum order amount"
                                    keyboardType="numeric"
                                />
                            </View>

                            <View style={styles.row}>
                                <View style={[styles.formGroup, { flex: 1 }]}>
                                    <Text style={styles.label}>Max Discount</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={promotionFormData.maxDiscount}
                                        onChangeText={(text) => setPromotionFormData({ ...promotionFormData, maxDiscount: text })}
                                        placeholder="Max discount amount"
                                        keyboardType="numeric"
                                    />
                                </View>
                                <View style={[styles.formGroup, { flex: 1, marginLeft: 10 }]}>
                                    <Text style={styles.label}>Per User Limit</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={promotionFormData.usageLimitPerUser}
                                        onChangeText={(text) => setPromotionFormData({ ...promotionFormData, usageLimitPerUser: text })}
                                        placeholder="Per user limit"
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>

                            <View style={styles.row}>
                                <View style={[styles.formGroup, { flex: 1 }]}>
                                    <Text style={styles.label}>Start Date</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={promotionFormData.startDate ? new Date(promotionFormData.startDate).toISOString().split('T')[0] : ''}
                                        onChangeText={(text) => setPromotionFormData({ ...promotionFormData, startDate: new Date(text).toISOString() })}
                                        placeholder="YYYY-MM-DD"
                                    />
                                </View>
                                <View style={[styles.formGroup, { flex: 1, marginLeft: 10 }]}>
                                    <Text style={styles.label}>End Date</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={promotionFormData.endDate ? new Date(promotionFormData.endDate).toISOString().split('T')[0] : ''}
                                        onChangeText={(text) => setPromotionFormData({ ...promotionFormData, endDate: new Date(text).toISOString() })}
                                        placeholder="YYYY-MM-DD"
                                    />
                                </View>
                            </View>

                            <View style={styles.row}>
                                <View style={[styles.formGroup, { flex: 1 }]}>
                                    <Text style={styles.label}>Usage Limit</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={promotionFormData.usageLimit}
                                        onChangeText={(text) => setPromotionFormData({ ...promotionFormData, usageLimit: text })}
                                        placeholder="Total usage limit"
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>

                            {!editingPromotion && (
                                <View style={styles.formGroup}>
                                    <View style={styles.checkboxContainer}>
                                        <TouchableOpacity
                                            style={styles.checkbox}
                                            onPress={() => setPromotionFormData({ ...promotionFormData, sendNotification: !promotionFormData.sendNotification })}
                                        >
                                            <Ionicons
                                                name={promotionFormData.sendNotification ? "checkbox" : "square-outline"}
                                                size={20}
                                                color={promotionFormData.sendNotification ? "#ea580c" : "#94a3b8"}
                                            />
                                        </TouchableOpacity>
                                        <Text style={styles.checkboxLabel}>Send notification to all users</Text>
                                    </View>
                                </View>
                            )}
                        </>
                    )}
                </ScrollView>
            </View>
        </Modal>

        {/* Delete Confirmation Modal */}
        {console.log("[Render] Delete modal rendering, visible:", deleteModal.visible)}
        <Modal 
            visible={deleteModal.visible} 
            // transparent={true} 
            animationType="fade"
            style={{ zIndex: 9999 }}
        >
            {console.log("[Render] Modal content rendering")}
            <View style={styles.deleteModalOverlay}>
                <View style={styles.deleteModalContent}>
                    <Text style={styles.deleteModalTitle}>
                        Delete {deleteModal.type === 'coupon' ? 'Coupon' : 'Promotion'}
                    </Text>
                    <Text style={styles.deleteModalText}>
                        Are you sure you want to delete {deleteModal.name}?
                    </Text>
                    <View style={styles.deleteModalButtons}>
                        <TouchableOpacity 
                            style={styles.deleteModalCancelButton}
                            onPress={() => {
                                console.log("[Modal] Cancel button pressed");
                                setDeleteModal({ visible: false, type: null, id: null, name: "" });
                            }}
                        >
                            <Text style={styles.deleteModalCancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.deleteModalConfirmButton}
                            onPress={() => {
                                console.log("[Modal] Delete button pressed");
                                confirmDelete();
                            }}
                        >
                            <Text style={styles.deleteModalConfirmText}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>

        {/* Notify Confirmation Modal */}
        <Modal visible={notifyModal.visible} transparent animationType="fade">
            <View style={styles.deleteModalOverlay}>
                <View style={styles.deleteModalContent}>
                    <Text style={styles.deleteModalTitle}>
                        Send {notifyModal.type === 'coupon' ? 'Coupon' : 'Promotion'} Notification
                    </Text>
                    <Text style={styles.deleteModalText}>
                        Send notification to all users about {notifyModal.name}?
                    </Text>
                    <View style={styles.deleteModalButtons}>
                        <TouchableOpacity 
                            style={styles.deleteModalCancelButton}
                            onPress={() => setNotifyModal({ visible: false, type: null, id: null, name: "" })}
                        >
                            <Text style={styles.deleteModalCancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.deleteModalConfirmButton, { backgroundColor: "#10b981" }]}
                            onPress={confirmSendNotification}
                        >
                            <Text style={styles.deleteModalConfirmText}>Send</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
        </>
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
    tabContainer: {
        flexDirection: "row",
        marginTop: 15,
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        borderRadius: 10,
        padding: 4,
    },
    tabButton: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 6,
        alignItems: "center",
    },
    tabButtonActive: {
        backgroundColor: "#ea580c",
    },
    tabText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#94a3b8",
    },
    tabTextActive: {
        color: "#fff",
    },
    listContainer: {
        padding: 20,
    },
    couponCard: {
        backgroundColor: "#1e293b",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.1)",
    },
    couponHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 8,
    },
    couponInfo: {
        flex: 1,
    },
    couponCode: {
        fontSize: 14,
        fontWeight: "700",
        color: "#ea580c",
        marginBottom: 4,
    },
    couponTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#fff",
        marginBottom: 4,
    },
    couponDescription: {
        fontSize: 14,
        color: "#94a3b8",
        marginBottom: 12,
        lineHeight: 20,
    },
    couponDetails: {
        marginBottom: 12,
    },
    detailText: {
        fontSize: 12,
        color: "#64748b",
        marginBottom: 2,
    },
    couponActions: {
        flexDirection: "row",
        gap: 10,
    },
    notifyButton: {
        flex: 1,
        flexDirection: "row",
        backgroundColor: "#10b981",
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        justifyContent: "center",
        alignItems: "center",
        gap: 6,
    },
    editButton: {
        flex: 1,
        flexDirection: "row",
        backgroundColor: "#3b82f6",
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        justifyContent: "center",
        alignItems: "center",
        gap: 6,
    },
    deleteButton: {
        flex: 1,
        flexDirection: "row",
        backgroundColor: "#ef4444",
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        justifyContent: "center",
        alignItems: "center",
        gap: 6,
    },
    buttonText: {
        fontSize: 12,
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
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 10,
        fontWeight: "600",
        color: "#fff",
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
        borderBottomWidth: 1,
        borderBottomColor: "#334155",
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#fff",
    },
    closeButton: {
        color: "#ef4444",
        fontSize: 16,
    },
    saveButton: {
        color: "#10b981",
        fontSize: 16,
        fontWeight: "600",
    },
    modalContent: {
        flex: 1,
        padding: 20,
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: "500",
        color: "#fff",
        marginBottom: 8,
    },
    input: {
        backgroundColor: "#1e293b",
        color: "#fff",
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#334155",
    },
    textArea: {
        height: 80,
        textAlignVertical: "top",
    },
    typeButtons: {
        flexDirection: "row",
        gap: 10,
    },
    typeButton: {
        flex: 1,
        padding: 10,
        borderRadius: 6,
        backgroundColor: "#1e293b",
        borderWidth: 1,
        borderColor: "#334155",
        alignItems: "center",
    },
    typeButtonActive: {
        backgroundColor: "#ea580c",
        borderColor: "#ea580c",
    },
    typeButtonText: {
        color: "#94a3b8",
        fontSize: 12,
        fontWeight: "600",
    },
    row: {
        flexDirection: "row",
    },
    checkboxContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    checkbox: {
        padding: 4,
    },
    checkboxLabel: {
        color: "#94a3b8",
        fontSize: 14,
    },
    deleteModalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
        zIndex: 9999,
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    deleteModalContent: {
        backgroundColor: "#1e293b",
        borderRadius: 12,
        padding: 24,
        width: "100%",
        maxWidth: 400,
        alignItems: "center",
    },
    deleteModalTitle: {
        color: "#fff",
        fontSize: 20,
        fontWeight: "700",
        marginBottom: 12,
    },
    deleteModalText: {
        color: "#94a3b8",
        fontSize: 16,
        textAlign: "center",
        marginBottom: 24,
    },
    deleteModalButtons: {
        flexDirection: "row",
        gap: 12,
        width: "100%",
    },
    deleteModalCancelButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        backgroundColor: "#334155",
        alignItems: "center",
    },
    deleteModalCancelText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
    deleteModalConfirmButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        backgroundColor: "#ef4444",
        alignItems: "center",
    },
    deleteModalConfirmText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
});

export default Coupons;
