import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, TextInput, Alert, Platform } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import baseURL from "../../assets/common/baseurl";
import { getAuthToken } from "../../assets/common/tokenStorage";

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchUsers();
    }, [search]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            setError(null);
            const token = await getAuthToken();
            if (!token) {
                setError("No authentication token");
                setLoading(false);
                return;
            }
            let url = `${baseURL}admin/users?page=1&limit=20`;
            if (search) url += `&search=${encodeURIComponent(search)}`;
            console.log('Fetching users from:', url);
            
            const response = await fetch(url, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });
            
            const responseText = await response.text();
            console.log('Raw response:', responseText.substring(0, 200));
            
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.error('Failed to parse JSON:', e);
                setError(`Server returned invalid JSON. Status: ${response.status}`);
                setLoading(false);
                return;
            }
            if (response.ok) {
                setUsers(data.users || []);
            } else {
                setError(data.message || "Failed to fetch");
            }
        } catch (err) {
            setError(err.message || "Network error");
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (user) => {
        if (user.isBanned) return "#ef4444";
        if (user.isDisabled) return "#f59e0b";
        return "#10b981";
    };

    const getStatusText = (user) => {
        if (user.isBanned) return "Banned";
        if (user.isDisabled) return "Disabled";
        return "Active";
    };

    const showAlert = (title, message, buttons) => {
        if (Platform.OS === 'web') {
            const result = window.confirm(`${title}\n\n${message}`);
            if (result && buttons[1]) {
                buttons[1].onPress();
            }
        } else {
            Alert.alert(title, message, buttons);
        }
    };

    const handleWarning = async (user) => {
        showAlert(
            "Send Warning",
            `Send a warning notification to ${user.name}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Send Warning",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const token = await getAuthToken();
                            let reason = "Admin Warning";
                            let message = "You have received a warning from the admin.";
                            
                            if (Platform.OS === 'web') {
                                const reasonInput = window.prompt("Enter warning reason:", reason);
                                if (reasonInput === null) return; // User cancelled
                                reason = reasonInput;
                                
                                const messageInput = window.prompt("Enter warning message:", message);
                                if (messageInput === null) return; // User cancelled
                                message = messageInput;
                            }

                            console.log('User object:', user);
                            console.log('User ID:', user._id, user.id);
                            const userId = user._id || user.id;
                            if (!userId) {
                                Platform.OS === 'web' 
                                    ? alert("Error: User ID not found")
                                    : Alert.alert("Error", "User ID not found");
                                return;
                            }
                            console.log('Sending warning to:', `${baseURL}admin/users/${userId}/warn`);
                            console.log('Request body:', { reason, message });
                            
                            const response = await fetch(`${baseURL}admin/users/${userId}/warn`, {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    reason: reason,
                                    message: message
                                })
                            });

                            console.log('Response status:', response.status);
                            console.log('Response ok:', response.ok);
                            
                            const responseText = await response.text();
                            console.log('Raw response:', responseText);

                            if (response.ok) {
                                Platform.OS === 'web' 
                                    ? alert("Success: Warning sent successfully")
                                    : Alert.alert("Success", "Warning sent successfully");
                            } else {
                                let data;
                                try {
                                    data = JSON.parse(responseText);
                                } catch (e) {
                                    data = { message: responseText };
                                }
                                const errorMsg = data.message || data.error || "Failed to send warning";
                                console.error('Error response:', data);
                                Platform.OS === 'web' 
                                    ? alert(`Error: ${errorMsg}`)
                                    : Alert.alert("Error", errorMsg);
                            }
                        } catch (error) {
                            Platform.OS === 'web' 
                                ? alert("Error: Network error occurred")
                                : Alert.alert("Error", "Network error occurred");
                        }
                    }
                }
            ]
        );
    };

    const handleBanUnban = async (user) => {
        const isBanned = user.isBanned;
        const action = isBanned ? "unban" : "ban";
        
        showAlert(
            `${isBanned ? "Unban" : "Ban"} User`,
            `${isBanned ? "Unban" : "Ban"} ${user.name}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: isBanned ? "Unban" : "Ban",
                    style: isBanned ? "default" : "destructive",
                    onPress: async () => {
                        try {
                            const token = await getAuthToken();
                            let reason = isBanned ? "Admin Unban" : "Admin Ban";
                            let message = isBanned 
                                ? "Your account has been unbanned by the admin."
                                : "Your account has been banned by the admin.";
                            
                            if (Platform.OS === 'web') {
                                const reasonInput = window.prompt(`Enter ${action} reason:`, reason);
                                if (reasonInput === null) return; // User cancelled
                                reason = reasonInput;
                                
                                const messageInput = window.prompt(`Enter ${action} message:`, message);
                                if (messageInput === null) return; // User cancelled
                                message = messageInput;
                            }

                            const userId = user._id || user.id;
                            if (!userId) {
                                Platform.OS === 'web' 
                                    ? alert("Error: User ID not found")
                                    : Alert.alert("Error", "User ID not found");
                                return;
                            }
                            console.log('Sending ban/unban to:', `${baseURL}admin/users/${userId}/${action}`);
                            
                            const response = await fetch(`${baseURL}admin/users/${userId}/${action}`, {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    reason: reason,
                                    message: message
                                })
                            });

                            if (response.ok) {
                                // Refresh the user list to ensure data is in sync with backend
                                fetchUsers();
                                const successMsg = `User ${isBanned ? "unbanned" : "banned"} successfully`;
                                Platform.OS === 'web' 
                                    ? alert(`Success: ${successMsg}`)
                                    : Alert.alert("Success", successMsg);
                            } else {
                                const data = await response.json();
                                const errorMsg = data.message || `Failed to ${action} user`;
                                Platform.OS === 'web' 
                                    ? alert(`Error: ${errorMsg}`)
                                    : Alert.alert("Error", errorMsg);
                            }
                        } catch (error) {
                            Platform.OS === 'web' 
                                ? alert("Error: Network error occurred")
                                : Alert.alert("Error", "Network error occurred");
                        }
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>User Management</Text>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search users..."
                    value={search}
                    onChangeText={setSearch}
                    placeholderTextColor="#64748b"
                />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#ea580c" />
                    <Text style={styles.loadingText}>Loading users...</Text>
                </View>
            ) : error ? (
                <View style={styles.center}>
                    <Ionicons name="alert-circle" size={48} color="#ef4444" />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={fetchUsers}>
                        <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : users.length === 0 ? (
                <View style={styles.center}>
                    <Ionicons name="people-outline" size={48} color="#64748b" />
                    <Text style={styles.emptyText}>No users found</Text>
                </View>
            ) : (
                <ScrollView style={styles.list}>
                    {users.map((user, index) => (
                        <View key={user._id || `user-${index}`} style={styles.card}>
                            <View style={styles.userInfo}>
                                <View style={styles.row}>
                                    <Text style={styles.name}>{user.name || 'No Name'}</Text>
                                    <View style={[styles.badge, { backgroundColor: getStatusColor(user) }]}>
                                        <Text style={styles.badgeText}>{getStatusText(user)}</Text>
                                    </View>
                                </View>
                                <Text style={styles.email}>{user.email || 'No Email'}</Text>
                            </View>
                            <View style={styles.actions}>
                                <TouchableOpacity style={[styles.btn, styles.warn]} onPress={() => handleWarning(user)}>
                                    <Ionicons name="warning" size={16} color="#f59e0b" />
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.btn, styles.ban]} onPress={() => handleBanUnban(user)}>
                                    <Ionicons name={user.isBanned ? "checkmark-circle" : "ban"} size={16} color={user.isBanned ? "#10b981" : "#ef4444"} />
                                </TouchableOpacity>
                                                            </View>
                        </View>
                    ))}
                </ScrollView>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0b0f1a" },
    header: { padding: 20, backgroundColor: "#111827", borderBottomWidth: 1, borderBottomColor: "#1a2332" },
    title: { fontSize: 24, fontWeight: "700", color: "#f8fafc", marginBottom: 15 },
    searchInput: { backgroundColor: "#1a2332", color: "#f8fafc", borderRadius: 8, padding: 12, fontSize: 16, borderWidth: 1, borderColor: "#374151" },
    center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
    loadingText: { color: "#94a3b8", marginTop: 10, fontSize: 16 },
    errorText: { color: "#ef4444", fontSize: 16, marginTop: 10, textAlign: "center" },
    retryButton: { backgroundColor: "#ea580c", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, marginTop: 20 },
    retryText: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
    emptyText: { color: "#94a3b8", fontSize: 18, fontWeight: "600", marginTop: 16 },
    list: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
    card: { backgroundColor: "#111827", borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#1a2332" },
    userInfo: { flex: 1, marginBottom: 12 },
    row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
    name: { fontSize: 18, fontWeight: "700", color: "#f8fafc", flex: 1 },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    badgeText: { fontSize: 12, fontWeight: "600", color: "#ffffff" },
    email: { color: "#94a3b8", fontSize: 14 },
    actions: { flexDirection: "row", gap: 8 },
    btn: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
    warn: { backgroundColor: "#fef3c7", borderWidth: 1, borderColor: "#f59e0b" },
    ban: { backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#ef4444" },
    reset: { backgroundColor: "#dbeafe", borderWidth: 1, borderColor: "#3b82f6" },
});

export default UserManagement;
