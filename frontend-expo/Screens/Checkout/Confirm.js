import React, { useState, useContext } from "react";
import { View, StyleSheet, Dimensions, ScrollView, Button, Text } from "react-native";
import { Surface, Avatar, Divider } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { useDispatch } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import baseURL from "../../assets/common/baseurl";
import Toast from "react-native-toast-message";
import { clearCart } from "../../Redux/Actions/cartActions";

var { width, height } = Dimensions.get("window");
const FALLBACK_IMAGE = "https://cdn.pixabay.com/photo/2012/04/01/17/29/box-23649_960_720.png";

const Confirm = (props) => {
    const [token, setToken] = useState("");
    const finalOrder = props.route.params;
    const order = finalOrder?.order;
    const dispatch = useDispatch();
    const navigation = useNavigation();

    const confirmOrder = () => {
        AsyncStorage.getItem("jwt")
            .then((res) => {
                setToken(res || "");
                const config = { headers: { Authorization: "Bearer " + res } };
                axios
                    .post(`${baseURL}orders`, order, config)
                    .then((res) => {
                        Toast.show({
                            topOffset: 60,
                            type: "success",
                            text1: "Order completed",
                            text2: "",
                        });
                        setTimeout(() => {
                            dispatch(clearCart());
                            navigation.navigate("Cart Screen", { screen: "Cart" });
                        }, 500);
                    })
                    .catch(() => {
                        Toast.show({
                            topOffset: 60,
                            type: "error",
                            text1: "Something went wrong",
                            text2: "Please try again",
                        });
                    });
            })
            .catch(() => {});
    };

    if (!order) {
        return (
            <View style={styles.container}>
                <Text style={{ color: "#f1f5f9" }}>No order data.</Text>
            </View>
        );
    }

    return (
        <Surface style={{ backgroundColor: "#0b0f1a" }}>
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.titleContainer}>
                    <Text style={{ fontSize: 20, fontWeight: "bold", color: "#f1f5f9" }}>Confirm Order</Text>
                    <View style={{ borderWidth: 1, borderColor: "#ea580c", marginTop: 10 }}>
                        <Text style={styles.title}>Shipping to:</Text>
                        <View style={{ padding: 8 }}>
                            <Text style={{ color: "#f1f5f9" }}>Address: {order.shippingAddress1}</Text>
                            <Text style={{ color: "#f1f5f9" }}>Address2: {order.shippingAddress2}</Text>
                            <Text style={{ color: "#f1f5f9" }}>City: {order.city}</Text>
                            <Text style={{ color: "#f1f5f9" }}>Zip Code: {order.zip}</Text>
                            <Text style={{ color: "#f1f5f9" }}>Country: {order.country}</Text>
                        </View>
                        <Text style={styles.title}>Items</Text>
                        {order.orderItems?.map((item, idx) => (
                            <Surface key={item.id || item._id || idx} style={{ padding: 8, margin: 4, backgroundColor: "#131927" }}>
                                <Avatar.Image
                                    size={48}
                                    source={{ uri: item.image || FALLBACK_IMAGE }}
                                />
                                <Text style={{ color: "#f1f5f9" }}>{item.name}</Text>
                                <Divider />
                                <Text style={{ alignSelf: "flex-start", color: "#fb923c" }}>$ {item.price}</Text>
                            </Surface>
                        ))}
                    </View>
                    <View style={{ alignItems: "center", margin: 20 }}>
                        <Button title="Place order" onPress={confirmOrder} />
                    </View>
                </View>
            </ScrollView>
        </Surface>
    );
};

const styles = StyleSheet.create({
    container: {
        minHeight: height,
        padding: 8,
        alignContent: "center",
        backgroundColor: "#0b0f1a",
    },
    titleContainer: {
        justifyContent: "center",
        alignItems: "center",
        margin: 8,
    },
    title: {
        alignSelf: "center",
        margin: 8,
        fontSize: 16,
        fontWeight: "bold",
        color: "#f1f5f9",
    },
});

export default Confirm;
