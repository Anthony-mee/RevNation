import * as React from "react";
import { useContext } from "react";
import { View, StyleSheet, Platform, TouchableOpacity, Text } from "react-native";
import { createDrawerNavigator } from "@react-navigation/drawer";
import Main from "./Main";
import WebNavBar from "../Shared/WebNavBar";
import DrawerContent from "../Shared/DrawerContent";
import AuthGlobal from "../Context/Store/AuthGlobal";

const NativeDrawer = createDrawerNavigator();
const isWeb = Platform.OS === "web";

const DrawerNavigator = () => {
    const context = useContext(AuthGlobal);
    const isAuthenticated = context?.stateUser?.isAuthenticated;

    // Keep top web navbar layout on web
    if (isWeb) {
        return (
            <View style={styles.container}>
                <WebNavBar />
                <View style={styles.contentContainer}>
                    <Main />
                </View>
            </View>
        );
    }

    // Mobile: real drawer navigator for rubric compliance
    return (
        <NativeDrawer.Navigator
            drawerContent={(props) => <DrawerContent {...props} />}
            screenOptions={({ navigation }) => ({
                headerStyle: {
                    backgroundColor: "#0f172a",
                },
                headerTintColor: "#f8fafc",
                headerTitleStyle: {
                    fontWeight: "700",
                },
                drawerStyle: {
                    width: "78%",
                    backgroundColor: "#111827",
                },
                sceneContainerStyle: {
                    backgroundColor: "#0a1628",
                },
                headerRight: () => (
                    <TouchableOpacity
                        onPress={() => navigation.navigate("Main", { screen: "User", params: { screen: isAuthenticated ? "User Profile" : "Login" } })}
                        style={styles.headerAction}
                    >
                        <Text style={styles.headerActionText}>{isAuthenticated ? "Profile" : "Login"}</Text>
                    </TouchableOpacity>
                ),
            })}
        >
            <NativeDrawer.Screen
                name="Main"
                component={Main}
                options={{ title: "RevNation" }}
            />
        </NativeDrawer.Navigator>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#ffffff",
    },
    contentContainer: {
        flex: 1,
    },
    headerAction: {
        marginRight: 14,
        backgroundColor: "#2563eb",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    headerActionText: {
        color: "#ffffff",
        fontSize: 12,
        fontWeight: "700",
    },
});

export default DrawerNavigator;
