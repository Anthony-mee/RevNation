import React, { useState } from "react";
import { TextInput, StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

/**
 * Shared Input component with optional label.
 * Pass `label` for a visible label above the field.
 * Pass `showToggle` along with `secureTextEntry` for password visibility toggle.
 */
const Input = (props) => {
    const [hidden, setHidden] = useState(true);
    const isPassword = props.secureTextEntry && props.showToggle;
    const { showToggle, label, ...rest } = props;

    return (
        <View style={styles.wrapper}>
            {label ? <Text style={styles.label}>{label}</Text> : null}
            <View style={styles.inputRow}>
                <TextInput
                    style={[
                        styles.input,
                        isPassword && styles.inputWithToggle,
                        props.editable === false && styles.inputDisabled,
                    ]}
                    placeholderTextColor="#64748b"
                    {...rest}
                    secureTextEntry={isPassword ? hidden : props.secureTextEntry}
                />
                {isPassword ? (
                    <TouchableOpacity
                        style={styles.eyeButton}
                        onPress={() => setHidden((prev) => !prev)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons
                            name={hidden ? "eye-off-outline" : "eye-outline"}
                            size={22}
                            color="#94a3b8"
                        />
                    </TouchableOpacity>
                ) : null}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        width: "100%",
        marginBottom: 18,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: "#f8fafc",
        marginBottom: 8,
        marginLeft: 4,
    },
    inputRow: {
        position: "relative",
    },
    input: {
        width: "100%",
        height: 52,
        backgroundColor: "#1a2332",
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingRight: 16,
        borderWidth: 1.5,
        borderColor: "rgba(37, 99, 235, 0.2)",
        fontSize: 15,
        color: "#f8fafc",
    },
    inputWithToggle: {
        paddingRight: 48,
    },
    inputDisabled: {
        backgroundColor: "#0f1729",
        color: "#94a3b8",
    },
    eyeButton: {
        position: "absolute",
        right: 14,
        top: 0,
        bottom: 0,
        justifyContent: "center",
    },
});

export default Input;
