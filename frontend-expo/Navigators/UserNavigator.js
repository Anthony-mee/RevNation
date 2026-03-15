import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import Login from "../Screens/User/Login";
import Register from "../Screens/User/Register";
import UserProfile from "../Screens/User/UserProfile";
import MyOrders from "../Screens/User/MyOrders";
import NotificationCenter from "../Screens/User/NotificationCenter";
import Favorites from "../Screens/User/Favorites";
import Wallet from "../Screens/User/Wallet";

const Stack = createStackNavigator();

const UserNavigator = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={Login} />
            <Stack.Screen name="Register" component={Register} />
            <Stack.Screen name="User Profile" component={UserProfile} />
            <Stack.Screen name="My Orders" component={MyOrders} />
            <Stack.Screen name="Notifications" component={NotificationCenter} />
            <Stack.Screen name="Favorites" component={Favorites} />
            <Stack.Screen name="Wallet" component={Wallet} />
        </Stack.Navigator>
    );
};

export default UserNavigator;
