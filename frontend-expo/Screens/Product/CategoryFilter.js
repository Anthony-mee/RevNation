import React from "react";
import {
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    View,
    Text,
} from "react-native";

const CategoryFilter = (props) => {
    return (
        <ScrollView
            bounces={true}
            horizontal={true}
            style={{ backgroundColor: "#0b0f1a", paddingBottom: 8 }}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollInner}
        >
            <View style={styles.row}>
                <TouchableOpacity
                    onPress={() => {
                        props.categoryFilter("all");
                        props.setActive(-1);
                    }}
                >
                    <View style={[styles.chip, props.active === -1 ? styles.active : styles.inactive]}>
                        <Text style={styles.chipText}>All</Text>
                    </View>
                </TouchableOpacity>
                {props.categories.map((item) => {
                    const catId = item.id || item._id;
                    return (
                        <TouchableOpacity
                            key={catId}
                            onPress={() => {
                                props.categoryFilter(catId);
                                props.setActive(props.categories.indexOf(item));
                            }}
                        >
                            <View
                                style={[
                                    styles.chip,
                                    props.active === props.categories.indexOf(item)
                                        ? styles.active
                                        : styles.inactive,
                                ]}
                            >
                                <Text style={styles.chipText}>{item.name}</Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    center: {
        justifyContent: "center",
        alignItems: "center",
    },
    scrollInner: {
        paddingHorizontal: 12,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
    },
    chip: {
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 999,
        paddingVertical: 9,
        paddingHorizontal: 16,
        marginHorizontal: 4,
        marginVertical: 2,
    },
    chipText: {
        color: "#fff",
        fontSize: 13,
        fontWeight: "700",
        textTransform: "capitalize",
    },
    active: {
        backgroundColor: "#ea580c",
        elevation: 2,
    },
    inactive: {
        backgroundColor: "#131927",
        borderWidth: 1,
        borderColor: "rgba(234, 88, 12, 0.2)",
    },
});

export default CategoryFilter;
