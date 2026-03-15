import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import ProductContainer from "../Screens/Product/ProductContainer";
import ProductsScreen from "../Screens/Product/ProductsScreen";
import ServicesScreen from "../Screens/Product/ServicesScreen";
import SingleProduct from "../Screens/Product/SingleProduct";
import ProductForm from "../Screens/Admin/ProductForm";

const Stack = createStackNavigator();

function MyStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen
                name="Main"
                component={ProductContainer}
            />
            <Stack.Screen
                name="ShopProducts"
                component={ProductsScreen}
                initialParams={{ productType: "shop" }}
            />
            <Stack.Screen
                name="ResellProducts"
                component={ProductsScreen}
                initialParams={{ productType: "resell" }}
            />
            <Stack.Screen
                name="Services"
                component={ServicesScreen}
            />
            <Stack.Screen
                name="ResellProductForm"
                component={ProductForm}
                initialParams={{ productType: "resell", returnScreen: "ResellProducts" }}
            />
            <Stack.Screen
                name="Product Detail"
                component={SingleProduct}
            />
        </Stack.Navigator>
    );
}

export default function HomeNavigator() {
    return <MyStack />;
}
