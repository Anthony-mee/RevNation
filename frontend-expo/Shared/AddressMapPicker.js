import React, { useEffect, useMemo, useState, useRef } from "react";
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
} from "react-native";
import * as Location from "expo-location";

const FALLBACK = { latitude: 14.5995, longitude: 120.9842 }; // Manila
let WebViewComponent = null;
try {
    WebViewComponent = require("react-native-webview").WebView;
} catch {
    WebViewComponent = null;
}

const AddressMapPicker = ({ visible, onClose, onPicked, initialLocation }) => {
    const [center, setCenter] = useState(FALLBACK);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const webRef = useRef(null);
    const markerRef = useRef(FALLBACK);

    const hasInit = useMemo(
        () =>
            Number.isFinite(initialLocation?.latitude) &&
            Number.isFinite(initialLocation?.longitude),
        [initialLocation]
    );

    useEffect(() => {
        if (!visible) return;
        const init = async () => {
            setLoading(true);
            try {
                if (hasInit) {
                    const c = {
                        latitude: Number(initialLocation.latitude),
                        longitude: Number(initialLocation.longitude),
                    };
                    setCenter(c);
                    markerRef.current = c;
                    return;
                }
                const perm = await Location.requestForegroundPermissionsAsync();
                if (perm.status !== "granted") {
                    setCenter(FALLBACK);
                    markerRef.current = FALLBACK;
                    return;
                }
                const loc = await Location.getCurrentPositionAsync({});
                const c = {
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                };
                setCenter(c);
                markerRef.current = c;
            } catch {
                setCenter(FALLBACK);
                markerRef.current = FALLBACK;
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [visible, hasInit, initialLocation]);

    const handleUse = async () => {
        setSaving(true);
        try {
            const coord = markerRef.current;
            const latText = Number(coord?.latitude || 0).toFixed(6);
            const lngText = Number(coord?.longitude || 0).toFixed(6);
            let addr = {};
            try {
                const reverse = await Location.reverseGeocodeAsync(coord);
                addr = reverse?.[0] || {};
            } catch {
                addr = {};
            }

            const road = [addr.streetNumber, addr.street].filter(Boolean).join(" ").trim();
            const district = addr.district || addr.subregion || "";
            const geocodedAddress = [road, district].filter(Boolean).join(", ").trim();
            const address1 = geocodedAddress || `Pinned location (${latText}, ${lngText})`;

            onPicked?.({
                coordinate: coord,
                address1,
                city: addr.city || addr.subregion || "",
                zip: addr.postalCode || "",
                country: addr.country || "Philippines",
            });
        } finally {
            setSaving(false);
        }
    };

    const onMessage = (event) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === "markerMoved") {
                markerRef.current = { latitude: data.lat, longitude: data.lng };
            }
        } catch {}
    };

    const leafletHtml = `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{margin:0;padding:0;width:100%;height:100%}</style>
</head>
<body>
<div id="map"></div>
<script>
var lat=${center.latitude},lng=${center.longitude};
var map=L.map('map').setView([lat,lng],16);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
  maxZoom:19,attribution:'OSM'
}).addTo(map);
var marker=L.marker([lat,lng],{draggable:true}).addTo(map);
marker.on('dragend',function(){
  var p=marker.getLatLng();
  window.ReactNativeWebView.postMessage(JSON.stringify({type:'markerMoved',lat:p.lat,lng:p.lng}));
});
map.on('click',function(e){
  marker.setLatLng(e.latlng);
  window.ReactNativeWebView.postMessage(JSON.stringify({type:'markerMoved',lat:e.latlng.lat,lng:e.latlng.lng}));
});
</script>
</body>
</html>`;

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <View style={styles.container}>
                <Text style={styles.title}>Drag pin or tap to set location</Text>
                {loading ? (
                    <View style={styles.loader}>
                        <ActivityIndicator size="large" />
                        <Text style={styles.loaderText}>Getting location...</Text>
                    </View>
                ) : !WebViewComponent ? (
                    <View style={styles.unavailableContainer}>
                        <Text style={styles.unavailableTitle}>Map is unavailable in this build</Text>
                        <Text style={styles.unavailableText}>
                            `react-native-webview` is installed, but this runtime did not load its native module.
                            Start Expo from `frontend-expo` with `npx expo start -c` and open with Expo Go, then try again.
                        </Text>
                        <Text style={styles.unavailableCoords}>
                            Lat: {markerRef.current.latitude.toFixed(6)} | Lng: {markerRef.current.longitude.toFixed(6)}
                        </Text>
                    </View>
                ) : (
                    <WebViewComponent
                        ref={webRef}
                        originWhitelist={["*"]}
                        source={{ html: leafletHtml }}
                        style={styles.map}
                        onMessage={onMessage}
                        javaScriptEnabled
                    />
                )}
                {saving ? (
                    <View style={styles.savingRow}>
                        <ActivityIndicator size="small" color="#2e7d32" />
                        <Text style={styles.savingText}>Saving location...</Text>
                    </View>
                ) : null}
                <View style={styles.buttonRow}>
                    <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={saving}>
                        <Text style={styles.buttonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.saveButton}
                        onPress={handleUse}
                        disabled={saving}
                    >
                        <Text style={styles.buttonText}>
                            {saving ? "Saving location..." : "Use this location"}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#fff", paddingTop: 40 },
    title: { fontSize: 18, fontWeight: "600", textAlign: "center", marginBottom: 12, color: "#1a1a1a" },
    map: { flex: 1 },
    loader: { flex: 1, alignItems: "center", justifyContent: "center" },
    loaderText: { marginTop: 8, color: "#333" },
    savingRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 8,
        backgroundColor: "#eef7ee",
    },
    savingText: {
        marginLeft: 8,
        color: "#2e7d32",
        fontWeight: "600",
    },
    unavailableContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
        backgroundColor: "#f7f7f7",
    },
    unavailableTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1a1a1a",
        marginBottom: 8,
        textAlign: "center",
    },
    unavailableText: {
        fontSize: 14,
        color: "#444",
        textAlign: "center",
        marginBottom: 10,
    },
    unavailableCoords: {
        fontSize: 13,
        color: "#666",
        textAlign: "center",
    },
    buttonRow: { flexDirection: "row", justifyContent: "space-between", padding: 12 },
    cancelButton: {
        flex: 1, marginRight: 8, backgroundColor: "#9e9e9e",
        paddingVertical: 12, borderRadius: 8, alignItems: "center",
    },
    saveButton: {
        flex: 1, marginLeft: 8, backgroundColor: "#2e7d32",
        paddingVertical: 12, borderRadius: 8, alignItems: "center",
    },
    buttonText: { color: "white", fontWeight: "600" },
});

export default AddressMapPicker;
