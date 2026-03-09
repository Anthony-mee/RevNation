/**
 * Main stack navigator for all screens.
 * Navigation is handled by WebNavBar at the top for all platforms.
 */
import React from "react";
import { View, StyleSheet } from "react-native";
import { createStackNavigator } from "@react-navigation/stack";
import HomeNavigator from "./HomeNavigator";
import CartNavigator from "./CartNavigator";
import UserNavigator from "./UserNavigator";
import AdminNavigator from "./AdminNavigator";
import MyOrders from "../Screens/User/MyOrders";

const Stack = createStackNavigator();

// Stack navigator that combines all screens
const ScreensNavigator = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Home" component={HomeNavigator} />
            <Stack.Screen name="Cart Screen" component={CartNavigator} />
            <Stack.Screen name="User" component={UserNavigator} />
            <Stack.Screen name="Admin" component={AdminNavigator} />
            <Stack.Screen name="My Orders" component={MyOrders} />
        </Stack.Navigator>
    );
};

const Main = () => {
    return (
        <View style={styles.container}>
            <ScreensNavigator />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0b0f1a",
    },
});

export default Main;
