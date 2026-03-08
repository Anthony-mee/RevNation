import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import TrafficLight from "./StyledComponents/TrafficLight";
import EasyButton from "./StyledComponents/EasyButton";
import Toast from "react-native-toast-message";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import baseURL from "../assets/common/baseurl";
import { useNavigation } from "@react-navigation/native";

const STATUS = {
    PENDING: "pending",
    SHIPPED: "shipped",
    DELIVERED: "delivered",
    CANCELLED: "cancelled",
};

const adminTransitions = {
    [STATUS.PENDING]: [STATUS.SHIPPED, STATUS.CANCELLED],
    [STATUS.SHIPPED]: [STATUS.CANCELLED],
    [STATUS.DELIVERED]: [],
    [STATUS.CANCELLED]: [],
};

const userTransitions = {
    [STATUS.PENDING]: [STATUS.CANCELLED],
    [STATUS.SHIPPED]: [STATUS.DELIVERED, STATUS.CANCELLED],
    [STATUS.DELIVERED]: [],
    [STATUS.CANCELLED]: [],
};

const normalizeStatus = (value) => {
    if (!value) return "";
    const lowered = String(value).toLowerCase();
    if (lowered === "3") return STATUS.PENDING;
    if (lowered === "2") return STATUS.SHIPPED;
    if (lowered === "1") return STATUS.DELIVERED;
    return lowered;
};

const OrderCard = ({ item, update, isAdmin = false }) => {
    const [orderStatus, setOrderStatus] = useState("");
    const [statusText, setStatusText] = useState("");
    const [statusChange, setStatusChange] = useState(normalizeStatus(item.status));
    const [cardColor, setCardColor] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);
    const navigation = useNavigation();

    const updateOrder = () => {
        if (isUpdating) return;
        setIsUpdating(true);
        AsyncStorage.getItem("jwt")
            .then((res) => {
                const token = res || "";
                const config = {
                    headers: { Authorization: `Bearer ${token}` },
                };
                return axios.put(
                    `${baseURL}orders/${item.id || item._id}`,
                    { status: statusChange },
                    config
                );
            })
            .then((res) => {
                if (res.status === 200 || res.status === 201) {
                    Toast.show({
                        topOffset: 60,
                        type: "success",
                        text1: "Order Updated",
                        text2: "",
                    });
                    setTimeout(() => navigation.navigate("Products"), 500);
                }
            })
            .catch((error) => {
                Toast.show({
                    topOffset: 60,
                    type: "error",
                    text1: "Something went wrong",
                    text2: "Please try again",
                });
            })
            .finally(() => setIsUpdating(false));
    };

    useEffect(() => {
        const normalized = normalizeStatus(item.status);
        if (normalized === STATUS.PENDING) {
            setOrderStatus(<TrafficLight unavailable />);
            setStatusText(STATUS.PENDING);
            setCardColor("#E74C3C");
        } else if (normalized === STATUS.SHIPPED) {
            setOrderStatus(<TrafficLight limited />);
            setStatusText(STATUS.SHIPPED);
            setCardColor("#F1C40F");
        } else if (normalized === STATUS.DELIVERED) {
            setOrderStatus(<TrafficLight available />);
            setStatusText(STATUS.DELIVERED);
            setCardColor("#2ECC71");
        } else {
            setOrderStatus(<TrafficLight unavailable />);
            setStatusText(STATUS.CANCELLED);
            setCardColor("#9B59B6");
        }
        return () => {
            setOrderStatus();
            setStatusText();
            setCardColor();
        };
    }, []);

    const currentStatus = normalizeStatus(item.status);
    const transitions = isAdmin ? adminTransitions : userTransitions;
    const allowed = transitions[currentStatus] || [];

    return (
        <View style={[{ backgroundColor: cardColor }, styles.container]}>
            <View style={styles.container}>
                <Text>Order Number: #{item.id}</Text>
            </View>
            <View style={{ marginTop: 10 }}>
                <Text>
                    Status: {statusText} {orderStatus}
                </Text>
                <Text>
                    Address: {item.shippingAddress1} {item.shippingAddress2}
                </Text>
                <Text>City: {item.city}</Text>
                <Text>Country: {item.country}</Text>
                <Text>Date Ordered: {item.dateOrdered.split("T")[0]}</Text>
                <View style={styles.priceContainer}>
                    <Text>Price: </Text>
                    <Text style={styles.price}>$ {item.totalPrice}</Text>
                </View>
                {update && allowed.length > 0 ? (
                    <View>
                        <Picker
                            style={{ width: "100%" }}
                            selectedValue={statusChange}
                            onValueChange={(e) => setStatusChange(e)}
                        >
                            {allowed.map((value) => (
                                <Picker.Item key={value} label={value} value={value} />
                            ))}
                        </Picker>
                        <EasyButton secondary large onPress={() => updateOrder()}>
                            {isUpdating ? (
                                <ActivityIndicator color="white" size="small" />
                            ) : (
                                <Text style={{ color: "white" }}>Update</Text>
                            )}
                        </EasyButton>
                    </View>
                ) : null}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
        margin: 10,
        borderRadius: 10,
    },
    priceContainer: {
        marginTop: 10,
        alignSelf: "flex-end",
        flexDirection: "row",
    },
    price: {
        color: "white",
        fontWeight: "bold",
    },
});

export default OrderCard;
