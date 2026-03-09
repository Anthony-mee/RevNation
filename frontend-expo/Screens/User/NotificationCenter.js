import React, { useState, useCallback } from "react";
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    RefreshControl,
    TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { useFocusEffect } from "@react-navigation/native";

const NotificationCenter = () => {
    const [notifications, setNotifications] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    const loadNotifications = useCallback(async () => {
        setRefreshing(true);
        try {
            // Get delivered notifications from the system tray
            const delivered = await Notifications.getPresentedNotificationsAsync();
            const mapped = delivered.map((n) => ({
                id: n.request.identifier,
                title: n.request.content.title || "Notification",
                body: n.request.content.body || "",
                date: n.date ? new Date(n.date) : new Date(),
            }));
            // Sort newest first
            mapped.sort((a, b) => b.date - a.date);
            setNotifications(mapped);
        } catch (err) {
            console.log("Error loading notifications:", err.message);
        }
        setRefreshing(false);
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadNotifications();
        }, [loadNotifications])
    );

    const clearAll = async () => {
        await Notifications.dismissAllNotificationsAsync();
        setNotifications([]);
    };

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.iconContainer}>
                <Ionicons name="notifications" size={24} color="#ea580c" />
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.body}>{item.body}</Text>
                <Text style={styles.date}>
                    {item.date.toLocaleDateString()} {item.date.toLocaleTimeString()}
                </Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            {notifications.length > 0 && (
                <TouchableOpacity style={styles.clearBtn} onPress={clearAll}>
                    <Text style={styles.clearText}>Clear All</Text>
                </TouchableOpacity>
            )}
            <FlatList
                data={notifications}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={loadNotifications} />
                }
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Ionicons name="notifications-off-outline" size={60} color="#94a3b8" />
                        <Text style={styles.emptyText}>No notifications yet</Text>
                        <Text style={styles.emptySubtext}>
                            Notifications will appear here when you receive stock alerts, order updates, etc.
                        </Text>
                    </View>
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0b0f1a" },
    clearBtn: {
        alignSelf: "flex-end",
        padding: 12,
        paddingBottom: 4,
    },
    clearText: { color: "#ea580c", fontWeight: "600" },
    card: {
        flexDirection: "row",
        backgroundColor: "#131927",
        marginHorizontal: 12,
        marginVertical: 4,
        padding: 14,
        borderRadius: 10,
        elevation: 2,
    },
    iconContainer: {
        width: 40,
        alignItems: "center",
        justifyContent: "center",
    },
    textContainer: { flex: 1 },
    title: { fontSize: 15, fontWeight: "700", color: "#f1f5f9", marginBottom: 2 },
    body: { fontSize: 13, color: "#94a3b8", marginBottom: 4 },
    date: { fontSize: 11, color: "#64748b" },
    empty: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 120,
        paddingHorizontal: 40,
    },
    emptyText: { fontSize: 18, fontWeight: "600", color: "#94a3b8", marginTop: 16 },
    emptySubtext: { fontSize: 13, color: "#64748b", textAlign: "center", marginTop: 8 },
});

export default NotificationCenter;
