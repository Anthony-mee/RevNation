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

const STATUS_DISPLAY_ORDER = [STATUS.DELIVERED, STATUS.SHIPPED, STATUS.PENDING, STATUS.CANCELLED];

const formatStatusLabel = (value) => {
    if (!value) return "Pending";
    return String(value).charAt(0).toUpperCase() + String(value).slice(1).toLowerCase();
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
    const allowed = (transitions[currentStatus] || []).slice().sort(
        (left, right) => STATUS_DISPLAY_ORDER.indexOf(left) - STATUS_DISPLAY_ORDER.indexOf(right)
    );

    return (
        <View style={styles.card}>
            <View style={styles.headerRow}>
                <Text style={styles.orderId}>Order #{item.id}</Text>
                <View style={[styles.statusPill, { backgroundColor: cardColor }]}> 
                    <Text style={styles.statusPillText}>{formatStatusLabel(statusText)}</Text>
                </View>
            </View>

            <View style={styles.body}>
                <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>Current Status</Text>
                    <View style={styles.statusValueWrap}>
                        <Text style={styles.statusValue}>{formatStatusLabel(statusText)}</Text>
                        {orderStatus}
                    </View>
                </View>

                <View style={styles.statusGuideRow}>
                    <Text style={styles.statusGuideTitle}>Status Guide:</Text>
                    <View style={styles.statusGuideChips}>
                        <View style={[styles.statusGuideChip, styles.statusDelivered]}>
                            <Text style={styles.statusGuideChipText}>Delivered</Text>
                        </View>
                        <View style={[styles.statusGuideChip, styles.statusShipped]}>
                            <Text style={styles.statusGuideChipText}>Shipped</Text>
                        </View>
                        <View style={[styles.statusGuideChip, styles.statusPending]}>
                            <Text style={styles.statusGuideChipText}>Pending</Text>
                        </View>
                        <View style={[styles.statusGuideChip, styles.statusCancelled]}>
                            <Text style={styles.statusGuideChipText}>Cancelled</Text>
                        </View>
                    </View>
                </View>

                <Text style={styles.infoText}>
                    Address: {item.shippingAddress1} {item.shippingAddress2}
                </Text>
                <Text style={styles.infoText}>City: {item.city}</Text>
                <Text style={styles.infoText}>Country: {item.country}</Text>
                <Text style={styles.infoText}>Date Ordered: {item.dateOrdered.split("T")[0]}</Text>
                <View style={styles.priceContainer}>
                    <Text style={styles.priceLabel}>Total:</Text>
                    <Text style={styles.price}>P {Number(item.totalPrice || 0).toFixed(2)}</Text>
                </View>
                {update && allowed.length > 0 ? (
                    <View style={styles.updateSection}>
                        <Picker
                            style={styles.picker}
                            dropdownIconColor="#fb923c"
                            selectedValue={statusChange}
                            onValueChange={(e) => setStatusChange(e)}
                        >
                            {allowed.map((value) => (
                                <Picker.Item key={value} label={formatStatusLabel(value)} value={value} color="#f8fafc" />
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
    card: {
        backgroundColor: "#111827",
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.16)",
        borderRadius: 14,
        padding: 14,
        margin: 10,
    },
    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 8,
    },
    orderId: {
        color: "#f8fafc",
        fontWeight: "700",
        fontSize: 15,
    },
    statusPill: {
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    statusPillText: {
        color: "#fff",
        fontWeight: "700",
        textTransform: "capitalize",
        fontSize: 11,
    },
    body: {
        marginTop: 10,
    },
    statusRow: {
        backgroundColor: "#0b1220",
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.18)",
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 10,
    },
    statusLabel: {
        color: "#94a3b8",
        fontSize: 12,
        textTransform: "uppercase",
        fontWeight: "700",
        marginBottom: 6,
    },
    statusValueWrap: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    statusValue: {
        color: "#f8fafc",
        fontSize: 15,
        fontWeight: "800",
        textTransform: "capitalize",
    },
    infoText: {
        color: "#cbd5e1",
        fontSize: 13,
        marginBottom: 2,
    },
    statusGuideRow: {
        marginBottom: 10,
    },
    statusGuideTitle: {
        color: "#94a3b8",
        fontSize: 12,
        marginBottom: 6,
        fontWeight: "700",
    },
    statusGuideChips: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
    },
    statusGuideChip: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
    },
    statusGuideChipText: {
        color: "#ffffff",
        fontSize: 11,
        fontWeight: "700",
    },
    statusDelivered: {
        backgroundColor: "#16a34a",
    },
    statusShipped: {
        backgroundColor: "#d97706",
    },
    statusPending: {
        backgroundColor: "#dc2626",
    },
    statusCancelled: {
        backgroundColor: "#7c3aed",
    },
    priceContainer: {
        marginTop: 10,
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    priceLabel: {
        color: "#f1f5f9",
        fontWeight: "600",
    },
    price: {
        color: "#fb923c",
        fontWeight: "bold",
    },
    updateSection: {
        marginTop: 10,
        backgroundColor: "#0b1220",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.18)",
        padding: 8,
    },
    picker: {
        width: "100%",
        color: "#f8fafc",
        backgroundColor: "#111827",
        borderRadius: 8,
    },
});

export default OrderCard;
