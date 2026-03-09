import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    Image,
    StyleSheet,
    TouchableOpacity,
    Platform,
    ActivityIndicator,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import FormContainer from "../../Shared/FormContainer";
import Input from "../../Shared/Input";
import EasyButton from "../../Shared/StyledComponents/EasyButton";
import Toast from "react-native-toast-message";
import AsyncStorage from "@react-native-async-storage/async-storage";
import baseURL from "../../assets/common/baseurl";
import Error from "../../Shared/Error";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";
import mime from "mime";
import { Ionicons } from "@expo/vector-icons";

const ProductForm = (props) => {
    const routeProductType = props.route?.params?.productType === "resell" ? "resell" : "shop";
    const returnScreen = props.route?.params?.returnScreen || "Products";
    const [pickerValue, setPickerValue] = useState("");
    const [brand, setBrand] = useState("");
    const [name, setName] = useState("");
    const [price, setPrice] = useState("");
    const [description, setDescription] = useState("");
    const [image, setImage] = useState("");
    const [mainImage, setMainImage] = useState("");
    const [category, setCategory] = useState("");
    const [categories, setCategories] = useState([]);
    const [token, setToken] = useState("");
    const [error, setError] = useState("");
    const [countInStock, setCountInStock] = useState("");
    const [rating, setRating] = useState(0);
    const [isFeatured, setIsFeatured] = useState(false);
    const [richDescription, setRichDescription] = useState("");
    const [numReviews, setNumReviews] = useState(0);
    const [item, setItem] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [imagePicked, setImagePicked] = useState(false);
    const navigation = useNavigation();

    useEffect(() => {
        if (props.route?.params?.item) {
            const i = props.route.params.item;
            setItem(i);
            setBrand(i.brand || "");
            setName(i.name || "");
            setPrice(String(i.price ?? ""));
            setDescription(i.description || "");
            setMainImage(i.image || "");
            setImage(i.image || "");
            const catId = i.category?._id || i.category?.id || "";
            setCategory(catId);
            setPickerValue(catId);
            setCountInStock(String(i.countInStock ?? ""));
        } else {
            setItem(null);
        }
        AsyncStorage.getItem("jwt").then((res) => setToken(res || "")).catch(() => {});
        axios.get(`${baseURL}categories`).then((res) => setCategories(res.data)).catch(() => alert("Error loading categories"));
        if (Platform.OS !== "web") {
            ImagePicker.requestCameraPermissionsAsync().then(({ status }) => {
                if (status !== "granted") alert("Camera roll permission needed.");
            });
        }
        return () => setCategories([]);
    }, [props.route?.params]);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });
        if (!result.canceled) {
            const uri = result.assets[0].uri;
            setMainImage(uri);
            setImage(uri);
            setImagePicked(true);
        }
    };

    const takePhoto = async () => {
        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });
        if (!result.canceled) {
            const uri = result.assets[0].uri;
            setMainImage(uri);
            setImage(uri);
            setImagePicked(true);
        }
    };

    const addProduct = () => {
        if (isSubmitting) return;
        if (!name || !brand || !price || !description || !category || !countInStock) {
            setError("Please fill in the form correctly");
            return;
        }
        setIsSubmitting(true);
        const formData = new FormData();
        formData.append("name", name);
        formData.append("brand", brand);
        formData.append("price", price);
        formData.append("description", description);
        formData.append("category", category);
        formData.append("countInStock", countInStock);
        formData.append("richDescription", richDescription);
        formData.append("rating", rating);
        formData.append("numReviews", numReviews);
        formData.append("isFeatured", isFeatured);
        formData.append("productType", routeProductType);
        if (imagePicked && image) {
            const newImageUri = "file:///" + image.split("file:/").join("");
            formData.append("image", {
                uri: newImageUri,
                type: mime.getType(newImageUri) || "image/jpeg",
                name: newImageUri.split("/").pop(),
            });
        }
        const config = {
            headers: {
                "Content-Type": "multipart/form-data",
                Authorization: "Bearer " + token,
            },
        };
        const productId = item?.id ?? item?._id;
        const thenNav = () => {
            Toast.show({ topOffset: 60, type: "success", text1: productId ? "Product updated" : "Product added" });
            setTimeout(() => navigation.navigate(returnScreen), 500);
        };
        const catchErr = (err) => {
            console.log('ProductForm error:', err?.response?.data || err?.message || err);
            const msg = err?.response?.data?.message || err?.message || "Something went wrong";
            Toast.show({ topOffset: 60, type: "error", text1: msg });
        };
        const request = productId
            ? axios.put(`${baseURL}products/${productId}`, formData, config)
            : axios.post(`${baseURL}products`, formData, config);

        request
            .then((res) => (res.status === 200 || res.status === 201) && thenNav())
            .catch(catchErr)
            .finally(() => setIsSubmitting(false));
    };

    return (
        <FormContainer title={item ? "Edit Product" : routeProductType === "resell" ? "Add Resell Product" : "Add Product"}>
            <View style={styles.imageContainer}>
                <Image style={styles.image} source={mainImage ? { uri: mainImage } : null} />
                <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
                    <Ionicons name="images" size={20} color="white" />
                </TouchableOpacity>
                <TouchableOpacity onPress={takePhoto} style={styles.cameraPicker}>
                    <Ionicons name="camera" size={20} color="white" />
                </TouchableOpacity>
            </View>
            <View style={styles.label}><Text style={styles.labelText}>Brand</Text></View>
            <Input placeholder="Brand" name="brand" id="brand" value={brand} onChangeText={setBrand} />
            <View style={styles.label}><Text style={styles.labelText}>Name</Text></View>
            <Input placeholder="Name" name="name" id="name" value={name} onChangeText={setName} />
            <View style={styles.label}><Text style={styles.labelText}>Price</Text></View>
            <Input placeholder="Price" name="price" id="price" value={price} keyboardType="numeric" onChangeText={setPrice} />
            <View style={styles.label}><Text style={styles.labelText}>Count in Stock</Text></View>
            <Input placeholder="Stock" name="stock" id="stock" value={countInStock} keyboardType="numeric" onChangeText={setCountInStock} />
            <View style={styles.label}><Text style={styles.labelText}>Description</Text></View>
            <Input placeholder="Description" name="description" id="description" value={description} onChangeText={setDescription} />
            <View>
                <Picker style={{ height: 100, width: 300 }} selectedValue={pickerValue} onValueChange={(e) => { setPickerValue(e); setCategory(e); }}>
                    {categories.map((c) => (
                        <Picker.Item key={c.id || c._id} label={c.name} value={c.id || c._id} />
                    ))}
                </Picker>
            </View>
            {error ? <Error message={error} /> : null}
            <View style={styles.buttonContainer}>
                <EasyButton large primary onPress={addProduct}>
                    {isSubmitting ? (
                        <ActivityIndicator color="white" size="small" />
                    ) : (
                        <Text style={styles.buttonText}>Confirm</Text>
                    )}
                </EasyButton>
            </View>
        </FormContainer>
    );
};

const styles = StyleSheet.create({
    label: { width: "80%", marginTop: 10 },
    labelText: { textDecorationLine: "underline", color: "#f1f5f9", fontWeight: "600" },
    buttonContainer: { width: "80%", marginBottom: 100, marginTop: 20, alignItems: "center" },
    buttonText: { color: "white" },
    imageContainer: {
        width: 200,
        height: 200,
        borderStyle: "solid",
        borderWidth: 8,
        padding: 0,
        justifyContent: "center",
        borderRadius: 100,
        borderColor: "#ea580c",
        elevation: 10,
    },
    image: { width: "100%", height: "100%", borderRadius: 100 },
    imagePicker: {
        position: "absolute",
        right: 5,
        bottom: 5,
        backgroundColor: "#ea580c",
        padding: 8,
        borderRadius: 100,
        elevation: 20,
    },
    cameraPicker: {
        position: "absolute",
        left: 5,
        bottom: 5,
        backgroundColor: "#c2410c",
        padding: 8,
        borderRadius: 100,
        elevation: 20,
    },
});

export default ProductForm;
