import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Input from "../../Shared/Input";
import FormContainer from "../../Shared/FormContainer";
import Toast from "react-native-toast-message";
import baseURL from "../../assets/common/baseurl";

const ForgotPassword = () => {
    const navigation = useNavigation();
    const [email, setEmail] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleSubmit = async () => {
        if (!email) {
            setError("Please enter your email address");
            return;
        }

        if (!email.includes("@")) {
            setError("Please enter a valid email address");
            return;
        }

        setIsSubmitting(true);
        setError("");
        setSuccess("");

        try {
            const response = await fetch(`${baseURL}users/forgot-password`, {
                method: "POST",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to send reset email");
            }

            setSuccess("Password reset email sent! Please check your inbox.");
            setEmail("");
            
            Toast.show({
                topOffset: 60,
                type: "success",
                text1: "Email Sent",
                text2: "Please check your inbox for reset instructions.",
            });

        } catch (err) {
            setError(err.message || "Failed to send reset email");
            Toast.show({
                topOffset: 60,
                type: "error",
                text1: "Request Failed",
                text2: err.message || "Please try again.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <FormContainer title="Forgot Password">
            <View style={styles.container}>
                <View style={styles.headerSection}>
                    <Text style={styles.title}>Reset Your Password</Text>
                    <Text style={styles.subtitle}>
                        Enter your email address and we'll send you instructions to reset your password.
                    </Text>
                </View>

                <View style={styles.formSection}>
                    <Input
                        label="Email Address"
                        placeholder="Enter your email"
                        name="email"
                        id="email"
                        value={email}
                        onChangeText={(text) => setEmail(text.toLowerCase())}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />

                    {error ? <Text style={styles.errorText}>{error}</Text> : null}
                    {success ? <Text style={styles.successText}>{success}</Text> : null}

                    <View style={styles.buttonContainer}>
                        {isSubmitting ? (
                            <View style={styles.loadingRow}>
                                <ActivityIndicator size="small" color="#ffffff" />
                                <Text style={styles.loadingText}>Sending...</Text>
                            </View>
                        ) : (
                            <TouchableOpacity 
                                style={styles.submitButton} 
                                onPress={handleSubmit}
                                disabled={isSubmitting}
                            >
                                <Text style={styles.submitButtonText}>Send Reset Email</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                <View style={styles.backSection}>
                    <TouchableOpacity 
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.backButtonText}>← Back to Login</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </FormContainer>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 24,
    },
    headerSection: {
        alignItems: "center",
        marginBottom: 32,
    },
    title: {
        fontSize: 24,
        fontWeight: "700",
        color: "#f8fafc",
        marginBottom: 8,
        textAlign: "center",
    },
    subtitle: {
        fontSize: 14,
        color: "#94a3b8",
        textAlign: "center",
        lineHeight: 20,
        marginBottom: 32,
    },
    formSection: {
        width: "100%",
    },
    errorText: {
        color: "#ef4444",
        marginBottom: 16,
        fontWeight: "600",
        fontSize: 14,
        textAlign: "center",
    },
    successText: {
        color: "#10b981",
        marginBottom: 16,
        fontWeight: "600",
        fontSize: 14,
        textAlign: "center",
    },
    buttonContainer: {
        width: "100%",
        alignItems: "center",
        marginTop: 24,
    },
    loadingRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    loadingText: {
        marginLeft: 8,
        color: "#ffffff",
        fontSize: 14,
    },
    submitButton: {
        width: "100%",
        height: 52,
        backgroundColor: "#ea580c",
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        elevation: 3,
        shadowColor: "#ea580c",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    submitButtonText: {
        color: "#ffffff",
        fontSize: 16,
        fontWeight: "700",
        letterSpacing: 1,
    },
    backSection: {
        width: "100%",
        alignItems: "center",
        marginTop: 32,
    },
    backButton: {
        width: "100%",
        height: 52,
        backgroundColor: "transparent",
        borderRadius: 12,
        borderWidth: 2,
        borderColor: "#ea580c",
        justifyContent: "center",
        alignItems: "center",
    },
    backButtonText: {
        color: "#ea580c",
        fontSize: 16,
        fontWeight: "600",
    },
});

export default ForgotPassword;
