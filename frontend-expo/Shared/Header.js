import React from "react";
import { StyleSheet, Image, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/**
 * Replace the image for logo here with your file.
 * Location: assets/images/logo-sample.png (or your filename, e.g. logo.png).
 */
const Header = () => {
    return (
        <SafeAreaView style={styles.header} edges={["top"]}>
            <Image
                source={require("../assets/images/logo.png")}
                resizeMode="contain"
                style={{ height: 60, width: 180 }}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    header: {
        width: "100%",
        flexDirection: "row",
        alignContent: "center",
        justifyContent: "center",
        paddingVertical: 12,
        paddingHorizontal: 20,
    },
});

export default Header;
