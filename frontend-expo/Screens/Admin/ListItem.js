import React, { useState } from "react";
import {
    View,
    StyleSheet,
    Text,
    Image,
    TouchableOpacity,
    Dimensions,
    Modal,
    ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import EasyButton from "../../Shared/StyledComponents/EasyButton";

var { width } = Dimensions.get("window");

const ListItem = ({ item, index, deleteProduct, isDeleting = false }) => {
    const [modalVisible, setModalVisible] = useState(false);
    const navigation = useNavigation();
    const itemId = item.id || item._id;

    return (
        <View>
            <Modal
                animationType="fade"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.centeredView}>
                    <View style={styles.modalView}>
                        <TouchableOpacity
                            onPress={() => setModalVisible(false)}
                            style={styles.closeButton}
                        >
                            <Ionicons name="close" size={20} />
                        </TouchableOpacity>
                        <EasyButton
                            medium
                            secondary
                            onPress={() => {
                                navigation.navigate("ProductForm", { item });
                                setModalVisible(false);
                            }}
                        >
                            <Text style={styles.textStyle}>Edit</Text>
                        </EasyButton>
                        <EasyButton
                            medium
                            danger
                            onPress={() => {
                                deleteProduct(itemId);
                                setModalVisible(false);
                            }}
                        >
                            <Text style={styles.textStyle}>Delete</Text>
                        </EasyButton>
                    </View>
                </View>
            </Modal>
            <TouchableOpacity
                onPress={() =>
                    navigation.navigate("Home", {
                        screen: "Product Detail",
                        params: { item },
                    })
                }
                onLongPress={() => setModalVisible(true)}
                style={[
                    styles.container,
                    {
                        backgroundColor: index % 2 === 0 ? "white" : "gainsboro",
                    },
                ]}
            >
                <Image
                    source={item.image ? { uri: item.image } : null}
                    resizeMode="contain"
                    style={styles.image}
                />
                <Text style={styles.item}>{item.brand}</Text>
                <Text style={styles.item} numberOfLines={1} ellipsizeMode="tail">
                    {item.name || ""}
                </Text>
                <Text style={styles.item} numberOfLines={1} ellipsizeMode="tail">
                    {item.category ? item.category.name : ""}
                </Text>
                <Text style={styles.item}>$ {item.price}</Text>
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => navigation.navigate("ProductForm", { item })}
                    >
                        <Ionicons name="create-outline" size={18} color="#333" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => deleteProduct(itemId)}
                    >
                        {isDeleting ? (
                            <ActivityIndicator size="small" color="#c62828" />
                        ) : (
                            <Ionicons name="trash-outline" size={18} color="#c62828" />
                        )}
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        padding: 5,
        width: width,
    },
    image: {
        borderRadius: 50,
        width: width / 6,
        height: 20,
        margin: 2,
    },
    item: {
        flexWrap: "wrap",
        margin: 3,
        width: width / 6,
    },
    actions: {
        flexDirection: "row",
        alignItems: "center",
        marginLeft: 4,
    },
    actionButton: {
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    centeredView: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 22,
    },
    modalView: {
        margin: 20,
        backgroundColor: "white",
        borderRadius: 20,
        padding: 35,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    closeButton: {
        alignSelf: "flex-end",
        position: "absolute",
        top: 5,
        right: 10,
    },
    textStyle: {
        color: "white",
        fontWeight: "bold",
    },
});

export default ListItem;
