import React, { useState } from "react";
import { Image, View, StyleSheet, Text, ScrollView } from "react-native";
import { Surface } from "react-native-paper";

const FALLBACK_IMAGE = "https://cdn.pixabay.com/photo/2012/04/01/17/29/box-23649_960_720.png";

const SingleProduct = ({ route }) => {
    const [item] = useState(route.params?.item || {});

    return (
        <Surface style={styles.container}>
            <ScrollView style={{ marginBottom: 80, padding: 5 }}>
                <View>
                    <Image
                        source={{
                            uri: item.image ? item.image : FALLBACK_IMAGE,
                        }}
                        resizeMode="contain"
                        style={styles.image}
                    />
                </View>
                <View style={styles.contentContainer}>
                    <Text style={styles.contentHeader}>{item.name}</Text>
                    <Text style={styles.contentText}>{item.brand}</Text>
                </View>
                <View style={styles.availabilityContainer}>
                    <Text>{item.description}</Text>
                </View>
            </ScrollView>
        </Surface>
    );
};

const styles = StyleSheet.create({
    container: {
        position: "relative",
        height: "100%",
    },
    image: {
        width: "100%",
        height: 250,
    },
    contentContainer: {
        marginTop: 20,
        justifyContent: "center",
        alignItems: "center",
    },
    contentHeader: {
        fontWeight: "bold",
        marginBottom: 20,
    },
    contentText: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 20,
    },
    availabilityContainer: {
        marginBottom: 20,
        alignItems: "center",
    },
});

export default SingleProduct;
