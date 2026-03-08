import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    ActivityIndicator,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import FormContainer from "../../Shared/FormContainer";
import Input from "../../Shared/Input";
import axios from "axios";
import baseURL from "../../assets/common/baseurl";
import Toast from "react-native-toast-message";
import { Camera } from "expo-camera";
import mime from "mime";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";

const Register = () => {
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [hasCameraPermission, setHasCameraPermission] = useState(null);
    const [image, setImage] = useState(null);
    const [mainImage, setMainImage] = useState("");
    const [location, setLocation] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigation = useNavigation();

    const takePhoto = async () => {
        const c = await ImagePicker.requestCameraPermissionsAsync();
        if (c.status === "granted") {
            let result = await ImagePicker.launchCameraAsync({
                aspect: [4, 3],
                quality: 1,
            });
            if (!result.canceled) {
                setMainImage(result.assets[0].uri);
                setImage(result.assets[0].uri);
            }
        }
    };

    const register = () => {
        if (email === "" || name === "" || phone === "" || password === "") {
            setError("Please fill in the form correctly");
            return;
        }
        setError("");
        setIsSubmitting(true);

        let formData = new FormData();
        formData.append("name", name);
        formData.append("email", email);
        formData.append("password", password);
        formData.append("phone", phone);
        formData.append("isAdmin", false);

        if (image) {
            const newImageUri = "file:///" + image.split("file:/").join("");
            formData.append("image", {
                uri: newImageUri,
                type: mime.getType(newImageUri),
                name: newImageUri.split("/").pop(),
            });
        }

        const config = {
            headers: { "Content-Type": "multipart/form-data" },
        };

        axios
            .post(`${baseURL}users/register`, formData, config)
            .then((res) => {
                if (res.status === 200 || res.status === 201) {
                    const verificationPending = res?.data?.emailSent === false;
                    Toast.show({
                        topOffset: 60,
                        type: verificationPending ? "info" : "success",
                        text1: verificationPending ? "Account created" : "Registration Succeeded",
                        text2: res?.data?.message || "Please verify your email before login",
                    });
                    setTimeout(() => navigation.navigate("Login"), 500);
                }
            })
            .catch((err) => {
                const serverMessage = err?.response?.data?.message;
                Toast.show({
                    position: "bottom",
                    bottomOffset: 20,
                    type: "error",
                    text1: "Something went wrong",
                    text2: serverMessage || "Please try again",
                });
                console.log(err);
            })
            .finally(() => setIsSubmitting(false));
    };

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });
        if (!result.canceled) {
            setImage(result.assets[0].uri);
            setMainImage(result.assets[0].uri);
        }
    };

    const handleGoogleSignup = () => {
        Toast.show({
            topOffset: 60,
            type: "info",
            text1: "Google Sign Up",
            text2: "Google authentication coming soon",
        });
    };

    const handleFacebookSignup = () => {
        Toast.show({
            topOffset: 60,
            type: "info",
            text1: "Facebook Sign Up",
            text2: "Facebook authentication coming soon",
        });
    };

    useEffect(() => {
        (async () => {
            const cameraStatus = await Camera.requestCameraPermissionsAsync();
            setHasCameraPermission(cameraStatus.status === "granted");
        })();
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") {
                setErrorMsg("Permission to access location was denied");
                return;
            }
            let loc = await Location.getCurrentPositionAsync({});
            setLocation(loc);
        })();
    }, []);

    return (
        <KeyboardAwareScrollView
            viewIsInsideTabBar={true}
            extraHeight={200}
            enableOnAndroid={true}
        >
            <FormContainer title="">
                <View style={styles.brandingSection}>
                    <Image
                        source={require("../../assets/images/logo.png")}
                        resizeMode="contain"
                        style={styles.logoBrand}
                    />
                    <Text style={styles.brandTitle}>Join RevNation</Text>
                    <Text style={styles.brandSubtitle}>Create your account today</Text>
                </View>
                
                <View style={styles.formCard}>
                    <Text style={styles.formTitle}>Create Account</Text>
                    <Text style={styles.formSubtitle}>Fill in your details to get started</Text>
                    
                    <View style={styles.imageContainer}>
                        <Image
                            style={styles.image}
                            source={mainImage ? { uri: mainImage } : null}
                        />
                        {!mainImage && <Text style={styles.imagePlaceholder}>Profile Photo</Text>}
                        <TouchableOpacity onPress={takePhoto} style={styles.imagePicker}>
                            <Ionicons name="camera" size={20} color="white" />
                        </TouchableOpacity>
                    </View>
                    
                    <Input
                        label="Email"
                        placeholder="Enter your email"
                        name="email"
                        id="email"
                        autoCapitalize="none"
                        keyboardType="email-address"
                        onChangeText={(text) => setEmail(text.toLowerCase())}
                    />
                    <Input
                        label="Full Name"
                        placeholder="Enter your name"
                        name="name"
                        id="name"
                        onChangeText={(text) => setName(text)}
                    />
                    <Input
                        label="Phone Number"
                        placeholder="Enter your phone number"
                        name="phone"
                        id="phone"
                        keyboardType="numeric"
                        onChangeText={(text) => setPhone(text)}
                    />
                    <Input
                        label="Password"
                        placeholder="Create a password"
                        name="password"
                        id="password"
                        secureTextEntry={true}
                        showToggle={true}
                        onChangeText={(text) => setPassword(text)}
                    />
                    
                    <View style={styles.buttonGroup}>
                        {error ? <Text style={styles.errorText}>{error}</Text> : null}
                        {isSubmitting ? (
                            <View style={styles.loadingRow}>
                                <ActivityIndicator size="small" color="#60a5fa" />
                                <Text style={styles.loadingText}>Creating account...</Text>
                            </View>
                        ) : null}
                    </View>
                    
                    <View style={styles.buttonGroup}>
                        <TouchableOpacity 
                            style={[styles.registerButton, isSubmitting && styles.buttonDisabled]} 
                            onPress={() => register()} 
                            disabled={isSubmitting}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.registerButtonText}>CREATE ACCOUNT</Text>
                        </TouchableOpacity>
                    </View>
                    
                    <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>OR</Text>
                        <View style={styles.dividerLine} />
                    </View>
                    
                    <View style={styles.socialButtons}>
                        <TouchableOpacity 
                            style={styles.googleButton}
                            onPress={handleGoogleSignup}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="logo-google" size={20} color="#ffffff" />
                            <Text style={styles.socialButtonText}>Sign up with Google</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={styles.facebookButton}
                            onPress={handleFacebookSignup}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="logo-facebook" size={20} color="#ffffff" />
                            <Text style={styles.socialButtonText}>Sign up with Facebook</Text>
                        </TouchableOpacity>
                    </View>
                    
                    <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                    </View>
                    
                    <View style={styles.loginSection}>
                        <Text style={styles.middleText}>Already have an account?</Text>
                        <TouchableOpacity 
                            style={styles.loginButton}
                            onPress={() => navigation.navigate("Login")}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.loginButtonText}>SIGN IN</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </FormContainer>
        </KeyboardAwareScrollView>
    );
};

const styles = StyleSheet.create({
    brandingSection: {
        alignItems: "center",
        paddingVertical: 32,
        marginBottom: 24,
    },
    logoBrand: {
        height: 100,
        width: 200,
        marginBottom: 16,
    },
    brandTitle: {
        fontSize: 28,
        fontWeight: "700",
        color: "#f8fafc",
        marginBottom: 4,
    },
    brandSubtitle: {
        fontSize: 13,
        color: "#94a3b8",
        textAlign: "center",
    },
    formCard: {
        width: "100%",
        paddingHorizontal: 24,
        paddingVertical: 32,
        backgroundColor: "#0f1729",
        borderRadius: 24,
        marginBottom: 20,
        elevation: 2,
    },
    formTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: "#f8fafc",
        marginBottom: 8,
        textAlign: "center",
    },
    formSubtitle: {
        fontSize: 14,
        color: "#94a3b8",
        marginBottom: 24,
        textAlign: "center",
    },
    buttonGroup: {
        width: "100%",
        alignItems: "center",
        marginTop: 4,
    },
    loadingRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 8,
    },
    loadingText: {
        marginLeft: 8,
        color: "#60a5fa",
        fontSize: 14,
    },
    errorText: {
        color: "#ef4444",
        marginBottom: 12,
        fontWeight: "600",
        fontSize: 14,
    },
    registerButton: {
        width: "100%",
        height: 52,
        backgroundColor: "#2563eb",
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 8,
        elevation: 3,
        shadowColor: "#2563eb",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    registerButtonText: {
        color: "#ffffff",
        fontSize: 16,
        fontWeight: "700",
        letterSpacing: 1,
    },
    buttonDisabled: {
        backgroundColor: "#1e40af",
        opacity: 0.6,
    },
    divider: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 24,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: "#1a2332",
    },
    dividerText: {
        paddingHorizontal: 16,
        color: "#64748b",
        fontSize: 12,
        fontWeight: "600",
    },
    socialButtons: {
        width: "100%",
        gap: 12,
    },
    googleButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: 52,
        backgroundColor: "#DB4437",
        borderRadius: 12,
        gap: 12,
        elevation: 2,
    },
    facebookButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: 52,
        backgroundColor: "#1877F2",
        borderRadius: 12,
        gap: 12,
        elevation: 2,
    },
    socialButtonText: {
        color: "#ffffff",
        fontSize: 15,
        fontWeight: "600",
    },
    loginSection: {
        width: "100%",
        alignItems: "center",
    },
    middleText: {
        marginBottom: 12,
        alignSelf: "center",
        color: "#94a3b8",
        fontSize: 14,
    },
    loginButton: {
        width: "100%",
        height: 52,
        backgroundColor: "transparent",
        borderRadius: 12,
        borderWidth: 2,
        borderColor: "#2563eb",
        justifyContent: "center",
        alignItems: "center",
    },
    loginButtonText: {
        color: "#60a5fa",
        fontSize: 16,
        fontWeight: "700",
        letterSpacing: 1,
    },
    imageContainer: {
        width: 100,
        height: 100,
        borderWidth: 3,
        padding: 0,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 50,
        borderColor: "#2563eb",
        elevation: 4,
        marginBottom: 24,
        backgroundColor: "#1a2332",
        alignSelf: "center",
    },
    image: {
        width: "100%",
        height: "100%",
        borderRadius: 50,
    },
    imagePlaceholder: {
        color: "#64748b",
        fontSize: 12,
        fontWeight: "600",
    },
    imagePicker: {
        position: "absolute",
        right: 0,
        bottom: 0,
        backgroundColor: "#2563eb",
        padding: 8,
        borderRadius: 20,
        elevation: 6,
    },
});

export default Register;
