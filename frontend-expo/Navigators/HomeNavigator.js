import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import ProductContainer from "../Screens/Product/ProductContainer";
import ProductsScreen from "../Screens/Product/ProductsScreen";
import SingleProduct from "../Screens/Product/SingleProduct";
import ProductForm from "../Screens/Admin/ProductForm";

const Stack = createStackNavigator();

function MyStack() {
    return (
        <Stack.Navigator>
            <Stack.Screen
                name="Main"
                component={ProductContainer}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="ShopProducts"
                component={ProductsScreen}
                initialParams={{ productType: "shop" }}
                options={{
                    headerShown: true,
                    title: "Shop Products",
                    headerStyle: {
                        backgroundColor: "#1a2332",
                    },
                    headerTintColor: "#ffffff",
                    headerTitleStyle: {
                        fontWeight: "bold",
                    },
                }}
            />
            <Stack.Screen
                name="ResellProducts"
                component={ProductsScreen}
                initialParams={{ productType: "resell" }}
                options={{
                    headerShown: true,
                    title: "Resell Products",
                    headerStyle: {
                        backgroundColor: "#1a2332",
                    },
                    headerTintColor: "#ffffff",
                    headerTitleStyle: {
                        fontWeight: "bold",
                    },
                }}
            />
            <Stack.Screen
                name="ResellProductForm"
                component={ProductForm}
                initialParams={{ productType: "resell", returnScreen: "ResellProducts" }}
                options={{
                    headerShown: true,
                    title: "Add Resell Product",
                    headerStyle: {
                        backgroundColor: "#1a2332",
                    },
                    headerTintColor: "#ffffff",
                    headerTitleStyle: {
                        fontWeight: "bold",
                    },
                }}
            />
            <Stack.Screen
                name="Product Detail"
                component={SingleProduct}
                options={{ headerShown: true }}
            />
        </Stack.Navigator>
    );
}

export default function HomeNavigator() {
    return <MyStack />;
}
