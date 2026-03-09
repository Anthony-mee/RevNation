import React, { useState, useContext, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import FormContainer from "../../Shared/FormContainer";
import AuthGlobal from "../../Context/Store/AuthGlobal";
import { loginUser } from "../../Context/Actions/Auth.actions";
import Input from "../../Shared/Input";
import Toast from "react-native-toast-message";

const Login = () => {
    const context = useContext(AuthGlobal);
    const navigation = useNavigation();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = () => {
        const user = { email, password };
        if (email === "" || password === "") {
            setError("Please fill in your credentials");
        } else {
            setError("");
            setIsSubmitting(true);
            loginUser(user, context.dispatch).finally(() => setIsSubmitting(false));
        }
    };

    const handleGoogleLogin = () => {
        Toast.show({
            topOffset: 60,
            type: "info",
            text1: "Google Login",
            text2: "Google authentication coming soon",
        });
    };

    const handleFacebookLogin = () => {
        Toast.show({
            topOffset: 60,
            type: "info",
            text1: "Facebook Login",
            text2: "Facebook authentication coming soon",
        });
    };

    useEffect(() => {
        if (context.stateUser.isAuthenticated === true) {
            navigation.navigate("Home", { screen: "Main" });
        }
    }, [context.stateUser.isAuthenticated]);

    return (
        <FormContainer title="">
            <View style={styles.brandingSection}>
                <Image
                    source={require("../../assets/images/logo.png")}
                    resizeMode="contain"
                    style={styles.logoBrand}
                />
                <Text style={styles.brandTitle}>RevNation</Text>
                <Text style={styles.brandSubtitle}>Premium Motorcycle Customization</Text>
            </View>
            
            <View style={styles.formCard}>
                <Text style={styles.formTitle}>Welcome Back</Text>
                <Text style={styles.formSubtitle}>Sign in to your account</Text>
                
                <Input
                    label="Email"
                    placeholder="Enter your email"
                    name="email"
                    id="email"
                    value={email}
                    onChangeText={(text) => setEmail(text.toLowerCase())}
                    autoCapitalize="none"
                    keyboardType="email-address"
                />
                <Input
                    label="Password"
                    placeholder="Enter your password"
                    name="password"
                    id="password"
                    secureTextEntry={true}
                    showToggle={true}
                    value={password}
                    onChangeText={(text) => setPassword(text)}
                />
                
                <View style={styles.buttonGroup}>
                    {error ? <Text style={styles.errorText}>{error}</Text> : null}
                    {isSubmitting ? (
                        <View style={styles.loadingRow}>
                            <ActivityIndicator size="small" color="#60a5fa" />
                            <Text style={styles.loadingText}>Signing in...</Text>
                        </View>
                    ) : null}
                    <TouchableOpacity 
                        style={[styles.loginButton, isSubmitting && styles.buttonDisabled]} 
                        onPress={() => handleSubmit()} 
                        disabled={isSubmitting}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.loginButtonText}>SIGN IN</Text>
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
                        onPress={handleGoogleLogin}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="logo-google" size={20} color="#ffffff" />
                        <Text style={styles.socialButtonText}>Continue with Google</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={styles.facebookButton}
                        onPress={handleFacebookLogin}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="logo-facebook" size={20} color="#ffffff" />
                        <Text style={styles.socialButtonText}>Continue with Facebook</Text>
                    </TouchableOpacity>
                </View>
                
                <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                </View>
                
                <View style={styles.registerSection}>
                    <Text style={styles.middleText}>Don't have an account?</Text>
                    <TouchableOpacity 
                        style={styles.registerButton}
                        onPress={() => navigation.navigate("Register")}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.registerButtonText}>CREATE ACCOUNT</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </FormContainer>
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
        backgroundColor: "#131927",
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
        marginTop: 8,
    },
    loadingRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    loadingText: {
        marginLeft: 8,
        color: "#3b82f6",
        fontSize: 14,
    },
    errorText: {
        color: "#ef4444",
        marginBottom: 12,
        fontWeight: "600",
        fontSize: 14,
    },
    loginButton: {
        width: "100%",
        height: 52,
        backgroundColor: "#ea580c",
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 8,
        elevation: 3,
        shadowColor: "#ea580c",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    loginButtonText: {
        color: "#ffffff",
        fontSize: 16,
        fontWeight: "700",
        letterSpacing: 1,
    },
    buttonDisabled: {
        backgroundColor: "#60a5fa",
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
    registerSection: {
        width: "100%",
        alignItems: "center",
    },
    middleText: {
        marginBottom: 12,
        alignSelf: "center",
        color: "#94a3b8",
        fontSize: 14,
    },
    registerButton: {
        width: "100%",
        height: 52,
        backgroundColor: "transparent",
        borderRadius: 12,
        borderWidth: 2,
        borderColor: "#ea580c",
        justifyContent: "center",
        alignItems: "center",
    },
    registerButtonText: {
        color: "#fb923c",
        fontSize: 16,
        fontWeight: "700",
        letterSpacing: 1,
    },
});

export default Login;
