import React, { useEffect, useState, useContext } from "react";
import { Text, View, Button } from "react-native";
import FormContainer from "../../Shared/FormContainer";
import Input from "../../Shared/Input";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSelector } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import AuthGlobal from "../../Context/Store/AuthGlobal";
import Toast from "react-native-toast-message";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import baseURL from "../../assets/common/baseurl";

const Checkout = () => {
    const [user, setUser] = useState("");
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [profileReady, setProfileReady] = useState(false);
    const [orderItems, setOrderItems] = useState([]);
    const [address, setAddress] = useState("");
    const [address2, setAddress2] = useState("");
    const [city, setCity] = useState("");
    const [zip, setZip] = useState("");
    const [country, setCountry] = useState("Philippines");
    const [phone, setPhone] = useState("");
    const navigation = useNavigation();
    const cartItems = useSelector((s) => s.cartItems);
    const context = useContext(AuthGlobal);

    const isProfileComplete = (profile) => {
        return !!(
            String(profile?.phone || "").trim()
            && String(profile?.deliveryAddress1 || "").trim()
            && String(profile?.deliveryCity || "").trim()
            && String(profile?.deliveryZip || "").trim()
            && String(profile?.deliveryCountry || "").trim()
        );
    };

    useEffect(() => {
        setOrderItems(cartItems);
        setLoadingProfile(true);

        if (context.stateUser.isAuthenticated) {
            setUser(context.stateUser.user.userId);
            AsyncStorage.getItem("jwt")
                .then((jwt) => {
                    if (!jwt) return;
                    return axios.get(`${baseURL}users/${context.stateUser.user.userId}`, {
                        headers: { Authorization: `Bearer ${jwt}` },
                    });
                })
                .then((response) => {
                    const profile = response?.data;
                    if (!profile) {
                        setProfileReady(false);
                        return;
                    }

                    if (profile.phone) setPhone(profile.phone);
                    if (profile.deliveryAddress1) setAddress(profile.deliveryAddress1);
                    if (profile.deliveryAddress2) setAddress2(profile.deliveryAddress2);
                    if (profile.deliveryCity) setCity(profile.deliveryCity);
                    if (profile.deliveryZip) setZip(profile.deliveryZip);
                    if (profile.deliveryCountry) setCountry(profile.deliveryCountry);

                    const complete = isProfileComplete(profile);
                    setProfileReady(complete);
                    if (!complete) {
                        Toast.show({
                            topOffset: 60,
                            type: "error",
                            text1: "Complete your profile first",
                            text2: "Add phone and delivery address in User Profile",
                        });
                    }
                })
                .catch(() => {
                    setProfileReady(false);
                })
                .finally(() => setLoadingProfile(false));
        } else {
            navigation.navigate("User", { screen: "Login" });
            Toast.show({ topOffset: 60, type: "error", text1: "Please login to checkout" });
            setLoadingProfile(false);
        }
        return () => setOrderItems([]);
    }, [cartItems, context.stateUser.isAuthenticated]);

    const checkOut = () => {
        if (loadingProfile) {
            Toast.show({ topOffset: 60, type: "info", text1: "Loading profile..." });
            return;
        }

        if (!profileReady) {
            Toast.show({
                topOffset: 60,
                type: "error",
                text1: "Profile required before checkout",
                text2: "Please complete delivery details in User Profile",
            });
            navigation.navigate("User", { screen: "User Profile" });
            return;
        }

        navigation.navigate("Payment", {
            order: { city, country, dateOrdered: Date.now(), orderItems, phone, shippingAddress1: address, shippingAddress2: address2, status: "pending", user, zip },
        });
    };

    return (
        <KeyboardAwareScrollView viewIsInsideTabBar extraHeight={200} enableOnAndroid style={{backgroundColor: "#f5f5f5"}}>
            <FormContainer title="Shipping Address">
                <Input label="Phone" placeholder="Phone (from profile)" value={phone} keyboardType="numeric" editable={false} />
                <Input label="Address Line 1" placeholder="Shipping Address 1 (from profile)" value={address} editable={false} />
                <Input label="Address Line 2" placeholder="Shipping Address 2 (from profile)" value={address2} editable={false} />
                <Input label="City" placeholder="City (from profile)" value={city} editable={false} />
                <Input label="Zip Code" placeholder="Zip Code (from profile)" value={zip} keyboardType="numeric" editable={false} />
                <Input label="Country" placeholder="Country (from profile)" value={country} editable={false} />
                <View style={{ width: "80%", alignItems: "center", marginTop: 20 }}>
                    <Button title={profileReady ? "Confirm" : "Complete Profile First"} onPress={checkOut} />
                </View>
                <View style={{ width: "80%", alignItems: "center", marginTop: 12 }}>
                    <Button
                        title="Go to User Profile"
                        onPress={() => navigation.navigate("User", { screen: "User Profile" })}
                    />
                </View>
            </FormContainer>
        </KeyboardAwareScrollView>
    );
};

export default Checkout;
