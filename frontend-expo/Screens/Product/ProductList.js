import React from "react";
import { TouchableOpacity, View, Dimensions, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import ProductCard from "./ProductCard";

var { width } = Dimensions.get("window");
const isWeb = Platform.OS === "web";
const isLargeScreen = width >= 900;
const isMediumScreen = width >= 600 && width < 900;

// Determine grid columns based on platform and screen size
const getColumnWidth = () => {
    if (isWeb && isLargeScreen) {
        return "25%"; // 4 columns on large web screens
    } else if (isWeb && isMediumScreen) {
        return "33.33%"; // 3 columns on medium web screens
    } else {
        return "50%"; // 2 columns on mobile
    }
};

const ProductList = (props) => {
    const { item } = props;
    const navigation = useNavigation();

    return (
        <TouchableOpacity
            style={{ 
                width: getColumnWidth(),
                padding: isWeb && isLargeScreen ? 8 : 0,
            }}
            onPress={() => navigation.navigate("Product Detail", { item })}
        >
            <View style={{ 
                width: isWeb && isLargeScreen ? "100%" : width / 2, 
                backgroundColor: "#0b0f1a" 
            }}>
                <ProductCard {...item} />
            </View>
        </TouchableOpacity>
    );
};

export default ProductList;
