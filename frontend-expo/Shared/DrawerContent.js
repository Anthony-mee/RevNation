import React, { useContext, useState } from "react";
import { Drawer } from "react-native-paper";
import AuthGlobal from "../Context/Store/AuthGlobal";

const DrawerContent = ({ navigation }) => {
    const [active, setActive] = useState("");
    const context = useContext(AuthGlobal);
    const isAdmin = context?.stateUser?.user?.isAdmin === true;
    const isAuthenticated = context?.stateUser?.isAuthenticated;

    const onClick = (screen) => {
        setActive(screen);
    };

    return (
        <Drawer.Section title="Navigation">
            <Drawer.Item
                label="Home"
                onPress={() => navigation.navigate("Main", { screen: "Home" })}
                icon="home"
            />
            <Drawer.Item
                label="Cart"
                onPress={() => navigation.navigate("Main", { screen: "Cart Screen" })}
                icon="cart"
            />
            <Drawer.Item
                label={isAuthenticated ? "My Profile" : "Login"}
                onPress={() => navigation.navigate("Main", { screen: "User", params: { screen: isAuthenticated ? "User Profile" : "Login" } })}
                icon="account"
            />
            {!isAdmin ? (
                <Drawer.Item
                    label="My Orders"
                    onPress={() => navigation.navigate("Main", { screen: "User", params: { screen: "My Orders" } })}
                    icon="cart-variant"
                />
            ) : null}
            {isAdmin ? (
                <Drawer.Item
                    label="Admin"
                    onPress={() => navigation.navigate("Main", { screen: "Admin" })}
                    icon="cog"
                />
            ) : null}
            <Drawer.Item
                label="Notifications"
                active={active === "Notifications"}
                onPress={() => {
                    setActive("Notifications");
                    navigation.navigate("Main", { screen: "User", params: { screen: "Notifications" } });
                }}
                icon="bell"
            />
        </Drawer.Section>
    );
};

export default DrawerContent;
