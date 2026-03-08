import React, { useState } from "react";
import { View, Button, StyleSheet } from "react-native";
import { Surface, RadioButton, Text } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { Picker } from "@react-native-picker/picker";

const methods = [
    { name: "Cash on Delivery", value: 1 },
    { name: "Bank Transfer", value: 2 },
    { name: "Card Payment", value: 3 },
];
const paymentCards = [
    { name: "Wallet", value: 1 },
    { name: "Visa", value: 2 },
    { name: "MasterCard", value: 3 },
    { name: "Other", value: 4 },
];

const Payment = ({ route }) => {
    const order = route.params?.order;
    const [selected, setSelected] = useState("");
    const [card, setCard] = useState("");
    const navigation = useNavigation();

    return (
        <View style={styles.container}>
            <Text variant="titleLarge">Choose your payment method</Text>
            <Surface style={{ width: "100%" }}>
                <RadioButton.Group value={selected} onValueChange={setSelected}>
                    {methods.map((item, i) => (
                        <RadioButton.Item key={i} value={item.value} color="red" label={item.name} />
                    ))}
                </RadioButton.Group>
            </Surface>
            {selected === 3 && (
                <Surface>
                    <Picker style={{ height: 50, width: 300 }} selectedValue={card} onValueChange={setCard}>
                        {paymentCards.map((c) => <Picker.Item key={c.name} label={c.name} value={c.name} />)}
                    </Picker>
                </Surface>
            )}
            <View style={{ marginTop: 60 }}>
                <Button title="Confirm" onPress={() => navigation.navigate("Confirm", { order })} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "flex-start",
        alignItems: "center",
        paddingVertical: 20,
        backgroundColor: "#f5f5f5",
    },
});

export default Payment;
