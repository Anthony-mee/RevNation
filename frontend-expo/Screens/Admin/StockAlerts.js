import React, { useCallback, useState } from "react";
import { View, FlatList, Text, StyleSheet, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import baseURL from "../../assets/common/baseurl";

const StockAlerts = () => {
    const [alerts, setAlerts] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    const loadAlerts = () => {
        return AsyncStorage.getItem("jwt")
            .then((res) =>
                axios.get(`${baseURL}stock-alerts`, {
                    headers: { Authorization: `Bearer ${res || ""}` },
                })
            )
            .then((res) => setAlerts(res.data || []))
            .catch(() => setAlerts([]));
    };

    useFocusEffect(
        useCallback(() => {
            let isMounted = true;
            loadAlerts().then(() => {
                if (!isMounted) return;
            });
            return () => {
                isMounted = false;
                setAlerts([]);
            };
        }, [])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadAlerts().finally(() => setRefreshing(false));
    }, []);

    return (
        <View style={styles.container}>
            {alerts.length === 0 ? (
                <View style={styles.center}>
                    <Text>No stock alerts.</Text>
                </View>
            ) : (
                <FlatList
                    data={alerts}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    keyExtractor={(item) => String(item.id || item._id)}
                    renderItem={({ item }) => (
                        <View style={styles.card}>
                            <Text style={styles.title}>{item.product?.name || "Unknown product"}</Text>
                            <Text>Type: {item.type}</Text>
                            <Text>Stock: {item.countInStock}</Text>
                            <Text>Threshold: {item.threshold}</Text>
                            <Text>Status: {item.resolved ? "resolved" : "active"}</Text>
                        </View>
                    )}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 12 },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    card: {
        backgroundColor: "white",
        padding: 12,
        borderRadius: 8,
        marginBottom: 10,
        elevation: 2,
    },
    title: { fontWeight: "700", marginBottom: 4 },
});

export default StockAlerts;
