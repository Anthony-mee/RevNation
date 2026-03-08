import React, { useCallback, useContext, useState } from "react";
import { View, FlatList, Text, StyleSheet } from "react-native";
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
                <Text style={{ color: "#1a1a1a", fontSize: 16 }}>Loading orders...</Text>
            </View>
        );
    }

    if (!orderList.length) {
        return (
            <View style={styles.center}>
                <Text style={{ color: "#1a1a1a", fontSize: 16 }}>No orders yet.</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={orderList}
                renderItem={({ item }) => <OrderCard item={item} update={true} isAdmin={false} />}
                keyExtractor={(item) => String(item.id || item._id)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f5f5f5" },
    center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f5f5f5" },
});

export default MyOrders;
