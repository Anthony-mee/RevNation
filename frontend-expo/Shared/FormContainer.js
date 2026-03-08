import React from "react";
import { ScrollView, Dimensions, StyleSheet, Text } from "react-native";

var { width } = Dimensions.get("window");

const FormContainer = ({ children, title }) => {
    return (
        <ScrollView contentContainerStyle={styles.container}>
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {children}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: 0,
        marginBottom: 0,
        width: width,
        minHeight: "100%",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#0a1628",
        paddingVertical: 40,
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: "700",
        color: "#f8fafc",
        marginBottom: 32,
    },
});

export default FormContainer;
