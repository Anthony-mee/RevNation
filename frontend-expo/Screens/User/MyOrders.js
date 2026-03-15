import React, { useCallback, useContext, useState } from "react";
import { View, FlatList, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import baseURL from "../../assets/common/baseurl";
import AuthGlobal from "../../Context/Store/AuthGlobal";
import OrderCard from "../../Shared/OrderCard";

const MyOrders = () => {
    const [orderList, setOrderList] = useState([]);
    const [loading, setLoading] = useState(true);
    const context = useContext(AuthGlobal);
    const navigation = useNavigation();

    useFocusEffect(
        useCallback(() => {
            let isMounted = true;

            if (context.stateUser.isAuthenticated === false || context.stateUser.isAuthenticated === null) {
                navigation.navigate("User", { screen: "Login" });
                return () => {};
            }

            AsyncStorage.getItem("jwt")
                .then((res) =>
                    axios.get(`${baseURL}orders`, {
                        headers: { Authorization: `Bearer ${res || ""}` },
                    })
                )
                .then((res) => {
                    if (isMounted) {
                        setOrderList(res.data || []);
                        setLoading(false);
                    }
                })
                .catch(() => {
                    if (isMounted) setLoading(false);
                });

            return () => {
                isMounted = false;
                setOrderList([]);
                setLoading(true);
            };
        }, [context.stateUser.isAuthenticated, navigation])
    );

    if (loading) {
        return (
            <View style={styles.center}>
                <Text style={{ color: "#f1f5f9", fontSize: 16 }}>Loading orders...</Text>
            </View>
        );
    }

    if (!orderList.length) {
        return (
            <View style={styles.center}>
                <Text style={{ color: "#f1f5f9", fontSize: 16 }}>No orders yet.</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={orderList}
                renderItem={({ item }) => <OrderCard item={item} update={true} isAdmin={false} />}
                keyExtractor={(item) => String(item.id || item._id)}
                ListHeaderComponent={
                    <View style={styles.headerCard}>
                        <View style={styles.headerRow}>
                            <Ionicons name="receipt-outline" size={20} color="#fb923c" />
                            <Text style={styles.headerTitle}>My Orders</Text>
                        </View>
                        <Text style={styles.headerSubtitle}>
                            Track your current order status, review past purchases, and update eligible orders.
                        </Text>
                    </View>
                }
                contentContainerStyle={styles.listContent}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0b0f1a" },
    center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0b0f1a" },
    listContent: {
        paddingBottom: 24,
    },
    headerCard: {
        backgroundColor: "#131927",
        borderBottomWidth: 1,
        borderBottomColor: "rgba(234, 88, 12, 0.15)",
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 14,
        marginBottom: 4,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 6,
    },
    headerTitle: {
        color: "#f8fafc",
        fontSize: 24,
        fontWeight: "800",
    },
    headerSubtitle: {
        color: "#94a3b8",
        fontSize: 13,
        lineHeight: 19,
    },
});

export default MyOrders;
