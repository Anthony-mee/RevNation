import React, { useEffect, useMemo, useState, useRef } from "react";
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";

let WebView = null;
if (Platform.OS !== 'web') {
    try {
        WebView = require("react-native-webview").WebView;
    } catch (e) {
        console.log("WebView not available");
    }
}

const FALLBACK = { latitude: 14.5995, longitude: 120.9842 }; // Manila

const AddressMapPicker = ({ visible, onClose, onPicked, initialLocation }) => {
    const [center, setCenter] = useState(FALLBACK);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [markerCoordinate, setMarkerCoordinate] = useState(FALLBACK);
    const [mapReady, setMapReady] = useState(false);
    const webViewRef = useRef(null);

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
                    setMarkerCoordinate(c);
                    return;
                }
                const perm = await Location.requestForegroundPermissionsAsync();
                if (perm.status !== "granted") {
                    setCenter(FALLBACK);
                    setMarkerCoordinate(FALLBACK);
                    return;
                }
                const loc = await Location.getCurrentPositionAsync({});
                const c = {
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                };
                setCenter(c);
                setMarkerCoordinate(c);
            } catch {
                setCenter(FALLBACK);
                setMarkerCoordinate(FALLBACK);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [visible, hasInit, initialLocation]);

    const handleUse = async () => {
        setSaving(true);
        try {
            const coord = markerCoordinate;
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

    const handleUseCurrentLocation = async () => {
        setLoading(true);
        try {
            const perm = await Location.requestForegroundPermissionsAsync();
            if (perm.status !== "granted") {
                alert("Location permission is required to use current location");
                setLoading(false);
                return;
            }
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            const coord = {
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
            };
            setCenter(coord);
            setMarkerCoordinate(coord);
            
            // Update map view based on platform
            if (Platform.OS === 'web' && mapReady) {
                const iframe = document.getElementById('leaflet-map-iframe');
                if (iframe && iframe.contentWindow) {
                    iframe.contentWindow.postMessage({
                        type: 'updateCenter',
                        lat: coord.latitude,
                        lng: coord.longitude
                    }, '*');
                }
            } else if (webViewRef.current && mapReady) {
                const script = `
                    if (typeof map !== 'undefined' && typeof marker !== 'undefined') {
                        map.setView([${coord.latitude}, ${coord.longitude}], 16);
                        marker.setLatLng([${coord.latitude}, ${coord.longitude}]);
                    }
                    true;
                `;
                webViewRef.current.injectJavaScript(script);
            }
        } catch (error) {
            console.error("Failed to get location:", error);
            alert("Failed to get current location");
        } finally {
            setLoading(false);
        }
    };

    const handleMapPress = (event) => {
        const { coordinate } = event.nativeEvent;
        setMarkerCoordinate(coordinate);
    };

    const handleMarkerDragEnd = (event) => {
        const { coordinate } = event.nativeEvent;
        setMarkerCoordinate(coordinate);
    };

    const onWebViewMessage = (event) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === "markerMoved") {
                setMarkerCoordinate({ 
                    latitude: data.lat, 
                    longitude: data.lng 
                });
            } else if (data.type === "mapReady") {
                setMapReady(true);
            }
        } catch (e) {
            console.error("WebView message error:", e);
        }
    };

    // For web platform, handle messages differently
    useEffect(() => {
        if (Platform.OS === 'web') {
            const handleMessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === "markerMoved") {
                        setMarkerCoordinate({ 
                            latitude: data.lat, 
                            longitude: data.lng 
                        });
                    } else if (data.type === "mapReady") {
                        setMapReady(true);
                    }
                } catch (e) {
                    // Ignore non-JSON messages
                }
            };
            
            window.addEventListener('message', handleMessage);
            return () => window.removeEventListener('message', handleMessage);
        }
    }, []);

    // Update map when center changes (for web)
    useEffect(() => {
        if (Platform.OS === 'web' && mapReady) {
            const iframe = document.getElementById('leaflet-map-iframe');
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage({
                    type: 'updateCenter',
                    lat: center.latitude,
                    lng: center.longitude
                }, '*');
            }
        }
    }, [center, mapReady]);

    // Generate Leaflet HTML with current coordinates
    const getLeafletHTML = () => {
        const lat = center.latitude;
        const lng = center.longitude;
        const isWeb = Platform.OS === 'web';
        
        return `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
        * { margin: 0; padding: 0; }
        html, body, #map { width: 100%; height: 100%; }
        .leaflet-control-attribution { font-size: 10px; }
    </style>
</head>
<body>
    <div id="map"></div>
    <script>
        try {
            // Initialize map
            var map = L.map('map', {
                center: [${lat}, ${lng}],
                zoom: 16,
                zoomControl: true
            });
            
            // Add tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '© OpenStreetMap'
            }).addTo(map);
            
            // Create custom icon
            var customIcon = L.divIcon({
                className: 'custom-marker',
                html: '<div style="background-color: #3b82f6; width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"><div style="width: 10px; height: 10px; background: white; border-radius: 50%; position: absolute; top: 7px; left: 7px;"></div></div>',
                iconSize: [30, 30],
                iconAnchor: [15, 30]
            });
            
            // Add draggable marker
            var marker = L.marker([${lat}, ${lng}], {
                draggable: true,
                icon: customIcon
            }).addTo(map);
            
            // Post message function that works for both web and mobile
            function postMsg(data) {
                ${isWeb ? `
                    window.parent.postMessage(JSON.stringify(data), '*');
                ` : `
                    if (window.ReactNativeWebView) {
                        window.ReactNativeWebView.postMessage(JSON.stringify(data));
                    }
                `}
            }
            
            // Handle marker drag
            marker.on('dragend', function(e) {
                var pos = marker.getLatLng();
                postMsg({
                    type: 'markerMoved',
                    lat: pos.lat,
                    lng: pos.lng
                });
            });
            
            // Handle map click
            map.on('click', function(e) {
                marker.setLatLng(e.latlng);
                postMsg({
                    type: 'markerMoved',
                    lat: e.latlng.lat,
                    lng: e.latlng.lng
                });
            });
            
            // Listen for center updates (web only)
            ${isWeb ? `
                window.addEventListener('message', function(event) {
                    try {
                        var data = event.data;
                        if (typeof data === 'string') {
                            data = JSON.parse(data);
                        }
                        if (data.type === 'updateCenter') {
                            map.setView([data.lat, data.lng], 16);
                            marker.setLatLng([data.lat, data.lng]);
                        }
                    } catch (e) {
                        // Ignore
                    }
                });
            ` : ''}
            
            // Notify that map is ready
            setTimeout(function() {
                postMsg({ type: 'mapReady' });
            }, 500);
            
        } catch (error) {
            console.error('Map initialization error:', error);
        }
    </script>
</body>
</html>`;
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>Set Delivery Location</Text>
                        <Text style={styles.subtitle}>Drag pin or tap on map</Text>
                    </View>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close" size={24} color="#64748b" />
                    </TouchableOpacity>
                </View>
                
                <TouchableOpacity 
                    style={styles.currentLocationButton}
                    onPress={handleUseCurrentLocation}
                    disabled={loading}
                    activeOpacity={0.8}
                >
                    <Ionicons name="locate" size={20} color="#fff" />
                    <Text style={styles.currentLocationText}>Use Current Location</Text>
                </TouchableOpacity>
                
                {loading ? (
                    <View style={styles.loader}>
                        <ActivityIndicator size="large" color="#3b82f6" />
                        <Text style={styles.loaderText}>Getting location...</Text>
                    </View>
                ) : Platform.OS === 'web' ? (
                    // Web platform - use iframe
                    <iframe
                        id="leaflet-map-iframe"
                        srcDoc={getLeafletHTML()}
                        style={{
                            flex: 1,
                            width: '100%',
                            border: 'none',
                        }}
                        title="Map"
                    />
                ) : !WebView ? (
                    <View style={styles.unavailableContainer}>
                        <Ionicons name="map-outline" size={64} color="#94a3b8" />
                        <Text style={styles.unavailableTitle}>Map Not Available</Text>
                        <Text style={styles.unavailableText}>
                            WebView is required to display the map. You can still set coordinates manually.
                        </Text>
                        <View style={styles.coordsBox}>
                            <Text style={styles.coordsLabel}>Current Location:</Text>
                            <Text style={styles.coordsText}>
                                Lat: {markerCoordinate.latitude.toFixed(6)}
                            </Text>
                            <Text style={styles.coordsText}>
                                Lng: {markerCoordinate.longitude.toFixed(6)}
                            </Text>
                        </View>
                    </View>
                ) : (
                    // Mobile platform - use WebView
                    <WebView
                        ref={webViewRef}
                        originWhitelist={['*']}
                        source={{ html: getLeafletHTML() }}
                        style={styles.map}
                        onMessage={onWebViewMessage}
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                        startInLoadingState={true}
                        renderLoading={() => (
                            <View style={styles.mapLoader}>
                                <ActivityIndicator size="large" color="#3b82f6" />
                                <Text style={styles.loaderText}>Loading map...</Text>
                            </View>
                        )}
                    />
                )}
                <View style={styles.buttonRow}>
                    <TouchableOpacity 
                        style={[styles.confirmButton, saving && styles.buttonDisabled]}
                        onPress={handleUse}
                        disabled={saving}
                        activeOpacity={0.8}
                    >
                        {saving ? (
                            <>
                                <ActivityIndicator size="small" color="#fff" />
                                <Text style={styles.confirmButtonText}>Saving...</Text>
                            </>
                        ) : (
                            <>
                                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                                <Text style={styles.confirmButtonText}>Use This Location</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: "#f8fafc",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingTop: 40,
        paddingBottom: 16,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#e2e8f0",
    },
    title: { 
        fontSize: 20, 
        fontWeight: "700", 
        color: "#1e293b",
    },
    subtitle: {
        fontSize: 13,
        color: "#64748b",
        marginTop: 2,
    },
    closeButton: {
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
    },
    currentLocationButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#3b82f6",
        marginHorizontal: 16,
        marginVertical: 12,
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
        shadowColor: "#3b82f6",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    currentLocationText: {
        color: "#fff",
        fontSize: 15,
        fontWeight: "600",
    },
    map: { 
        flex: 1,
        width: "100%",
    },
    mapLoader: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "#f8fafc",
        justifyContent: "center",
        alignItems: "center",
    },
    loader: { 
        flex: 1, 
        alignItems: "center", 
        justifyContent: "center",
        backgroundColor: "#fff",
    },
    loaderText: { 
        marginTop: 12, 
        color: "#64748b",
        fontSize: 14,
    },
    unavailableContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
        backgroundColor: "#fff",
    },
    unavailableTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1e293b",
        marginTop: 16,
        marginBottom: 8,
        textAlign: "center",
    },
    unavailableText: {
        fontSize: 14,
        color: "#64748b",
        textAlign: "center",
        marginBottom: 20,
        lineHeight: 20,
    },
    coordsBox: {
        backgroundColor: "#f8fafc",
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        minWidth: 200,
    },
    coordsLabel: {
        fontSize: 12,
        fontWeight: "700",
        color: "#64748b",
        marginBottom: 8,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    coordsText: {
        fontSize: 14,
        color: "#1e293b",
        fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
        marginVertical: 2,
    },
    buttonRow: { 
        padding: 16,
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderTopColor: "#e2e8f0",
    },
    confirmButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#3b82f6",
        paddingVertical: 16,
        borderRadius: 12,
        gap: 8,
        shadowColor: "#3b82f6",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    confirmButtonText: { 
        color: "#fff", 
        fontWeight: "700",
        fontSize: 16,
        marginLeft: 4,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
});

export default AddressMapPicker;
