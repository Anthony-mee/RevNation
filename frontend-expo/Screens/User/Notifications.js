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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Searchbar } from "react-native-paper";
import axios from "axios";
import baseURL from "../../assets/common/baseurl";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { Badge } from "react-native-paper";

const Notifications = () => {
    const [notificationList, setNotificationsList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState("all"); // all, read, unread
    const [unreadCount, setUnreadCount] = useState(0);
    const navigation = useNavigation();

    const fetchNotifications = useCallback(async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem("jwt");
            if (!token) return;

            const response = await axios.get(`${baseURL}notifications?filter=${filter}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setNotificationsList(response.data.notifications || []);
            setUnreadCount(response.data.unreadCount || 0);
        } catch (error) {
            console.error("Error fetching notifications:", error);
            Alert.alert("Error", "Failed to fetch notifications");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [filter]);

    useFocusEffect(
        useCallback(() => {
            fetchNotifications();
        }, [fetchNotifications])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchNotifications();
    };

    const markAsRead = async (notificationId) => {
        try {
            const token = await AsyncStorage.getItem("jwt");
            await axios.post(`${baseURL}notifications/${notificationId}/read`, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });
            
            // Update local state
            setNotificationsList(prev => 
                prev.map(notification => 
                    notification.id === notificationId 
                        ? { ...notification, read: true, readAt: new Date() }
                        : notification
                )
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            Alert.alert("Error", "Failed to mark notification as read");
        }
    };

    const markAllAsRead = async () => {
        try {
            const token = await AsyncStorage.getItem("jwt");
            await axios.post(`${baseURL}notifications/read-all`, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });
            
            // Update local state
            setNotificationsList(prev => 
                prev.map(notification => ({ ...notification, read: true, readAt: new Date() }))
            );
            setUnreadCount(0);
            Alert.alert("Success", "All notifications marked as read");
        } catch (error) {
            Alert.alert("Error", "Failed to mark all notifications as read");
        }
    };

    const deleteNotification = (notificationId) => {
        Alert.alert(
            "Delete Notification",
            "Are you sure you want to delete this notification?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const token = await AsyncStorage.getItem("jwt");
                            await axios.delete(`${baseURL}notifications/${notificationId}`, {
                                headers: { Authorization: `Bearer ${token}` },
                            });
                            
                            // Update local state
                            setNotificationsList(prev => {
                                const deleted = prev.find(n => n.id === notificationId);
                                if (deleted && !deleted.read) {
                                    setUnreadCount(count => Math.max(0, count - 1));
                                }
                                return prev.filter(n => n.id !== notificationId);
                            });
                        } catch (error) {
                            Alert.alert("Error", "Failed to delete notification");
                        }
                    },
                },
            ]
        );
    };

    const clearAllNotifications = () => {
        Alert.alert(
            "Clear All Notifications",
            "Are you sure you want to delete all notifications?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Clear All",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const token = await AsyncStorage.getItem("jwt");
                            await axios.delete(`${baseURL}notifications`, {
                                headers: { Authorization: `Bearer ${token}` },
                            });
                            
                            setNotificationsList([]);
                            setUnreadCount(0);
                            Alert.alert("Success", "All notifications cleared");
                        } catch (error) {
                            Alert.alert("Error", "Failed to clear notifications");
                        }
                    },
                },
            ]
        );
    };

    const handleNotificationPress = (notification) => {
        if (!notification.read) {
            markAsRead(notification.id);
        }

        // Navigate based on notification type
        if (notification.type === 'order_confirmed' || notification.type === 'order_status_update' || notification.type === 'new_order') {
            if (notification.data?.orderId) {
                navigation.navigate('My Orders', { screen: 'OrderDetails', params: { orderId: notification.data.orderId } });
            }
        } else if (notification.type === 'promotion' || notification.type === 'discount') {
            if (notification.data?.productId) {
                navigation.navigate('Product', { screen: 'SingleProduct', params: { id: notification.data.productId } });
            } else if (notification.data?.categoryId) {
                navigation.navigate('Product', { screen: 'Products', params: { categoryId: notification.data.categoryId } });
            } else {
                navigation.navigate('Product', { screen: 'Products' });
            }
        }
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'order_confirmed':
                return 'checkmark-circle';
            case 'order_status_update':
                return 'sync-circle';
            case 'new_order':
                return 'bag';
            case 'promotion':
                return 'megaphone';
            case 'discount':
                return 'pricetag';
            case 'account_banned':
                return 'warning';
            case 'account_unbanned':
                return 'checkmark-circle';
            case 'warning':
                return 'alert-circle';
            default:
                return 'notifications';
        }
    };

    const getNotificationColor = (type) => {
        switch (type) {
            case 'order_confirmed':
                return '#10b981';
            case 'order_status_update':
                return '#3b82f6';
            case 'new_order':
                return '#8b5cf6';
            case 'promotion':
            case 'discount':
                return '#f59e0b';
            case 'account_banned':
                return '#ef4444';
            case 'account_unbanned':
                return '#10b981';
            case 'warning':
                return '#f59e0b';
            default:
                return '#64748b';
        }
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    const renderNotificationItem = ({ item }) => (
        <TouchableOpacity
            style={[
                styles.notificationCard,
                !item.read && styles.unreadCard
            ]}
            onPress={() => handleNotificationPress(item)}
        >
            <View style={styles.notificationHeader}>
                <View style={styles.notificationIcon}>
                    <Ionicons 
                        name={getNotificationIcon(item.type)} 
                        size={20} 
                        color={getNotificationColor(item.type)} 
                    />
                </View>
                <View style={styles.notificationInfo}>
                    <Text style={[
                        styles.notificationTitle,
                        !item.read && styles.unreadTitle
                    ]}>{item.title}</Text>
                    <Text style={styles.notificationTime}>{formatTime(item.createdAt)}</Text>
                </View>
                <View style={styles.notificationActions}>
                    {!item.read && (
                        <TouchableOpacity 
                            style={styles.markReadButton}
                            onPress={() => markAsRead(item.id)}
                        >
                            <Ionicons name="checkmark" size={16} color="#10b981" />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity 
                        style={styles.deleteButton}
                        onPress={() => deleteNotification(item.id)}
                    >
                        <Ionicons name="trash-outline" size={16} color="#ef4444" />
                    </TouchableOpacity>
                </View>
            </View>
            
            <Text style={styles.notificationBody}>{item.body}</Text>
            
            {item.isRecent && (
                <View style={styles.recentBadge}>
                    <Text style={styles.recentBadgeText}>New</Text>
                </View>
            )}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <LinearGradient colors={["#ea580c", "#dc2626"]} style={styles.header}>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Notifications</Text>
                    {unreadCount > 0 && (
                        <View style={styles.unreadCountBadge}>
                            <Text style={styles.unreadCountText}>{unreadCount}</Text>
                        </View>
                    )}
                </View>
                
                <View style={styles.filterButtons}>
                    {["all", "unread", "read"].map((filterType) => (
                        <TouchableOpacity
                            key={filterType}
                            style={[
                                styles.filterButton,
                                filter === filterType && styles.filterButtonActive
                            ]}
                            onPress={() => setFilter(filterType)}
                        >
                            <Text style={[
                                styles.filterButtonText,
                                filter === filterType && styles.filterButtonTextActive
                            ]}>
                                {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                                {filterType === "unread" && unreadCount > 0 && ` (${unreadCount})`}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </LinearGradient>

            {notificationList.length > 0 && (
                <View style={styles.actionBar}>
                    <TouchableOpacity style={styles.actionButton} onPress={markAllAsRead}>
                        <Ionicons name="checkmark-done" size={16} color="#10b981" />
                        <Text style={styles.actionButtonText}>Mark All Read</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={clearAllNotifications}>
                        <Ionicons name="trash" size={16} color="#ef4444" />
                        <Text style={styles.actionButtonText}>Clear All</Text>
                    </TouchableOpacity>
                </View>
            )}

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#ea580c" />
                </View>
            ) : (
                <FlatList
                    data={notificationList}
                    renderItem={renderNotificationItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContainer}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="notifications-off-outline" size={48} color="#94a3b8" />
                            <Text style={styles.emptyText}>
                                {filter === "unread" ? "No unread notifications" : 
                                 filter === "read" ? "No read notifications" : 
                                 "No notifications"}
                            </Text>
                            <Text style={styles.emptySubText}>
                                {filter === "all" && "You're all caught up!"}
                            </Text>
                        </View>
                    }
                />
            )}
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
    unreadCountBadge: {
        backgroundColor: "#ef4444",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    unreadCountText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#fff",
    },
    filterButtons: {
        flexDirection: "row",
        gap: 8,
    },
    filterButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: "rgba(255, 255, 255, 0.1)",
    },
    filterButtonActive: {
        backgroundColor: "rgba(255, 255, 255, 0.3)",
    },
    filterButtonText: {
        fontSize: 14,
        fontWeight: "600",
        color: "rgba(255, 255, 255, 0.7)",
    },
    filterButtonTextActive: {
        color: "#fff",
    },
    actionBar: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: "#1e293b",
        borderBottomWidth: 1,
        borderBottomColor: "rgba(148, 163, 184, 0.1)",
    },
    actionButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    actionButtonText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#94a3b8",
    },
    listContainer: {
        padding: 20,
    },
    notificationCard: {
        backgroundColor: "#1e293b",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.1)",
    },
    unreadCard: {
        backgroundColor: "#1e293b",
        borderWidth: 1,
        borderColor: "rgba(234, 88, 12, 0.3)",
    },
    notificationHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 8,
    },
    notificationIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(148, 163, 184, 0.1)",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    notificationInfo: {
        flex: 1,
    },
    notificationTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#f8fafc",
        marginBottom: 2,
    },
    unreadTitle: {
        color: "#fff",
        fontWeight: "700",
    },
    notificationTime: {
        fontSize: 12,
        color: "#64748b",
    },
    notificationActions: {
        flexDirection: "row",
        gap: 8,
        alignItems: "center",
    },
    markReadButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        justifyContent: "center",
        alignItems: "center",
    },
    deleteButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        justifyContent: "center",
        alignItems: "center",
    },
    notificationBody: {
        fontSize: 14,
        color: "#94a3b8",
        lineHeight: 20,
        marginBottom: 8,
    },
    recentBadge: {
        position: "absolute",
        top: 12,
        right: 12,
        backgroundColor: "#ea580c",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },
    recentBadgeText: {
        fontSize: 10,
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
        fontWeight: "600",
    },
    emptySubText: {
        fontSize: 14,
        color: "#64748b",
        marginTop: 4,
    },
});

export default Notifications;
