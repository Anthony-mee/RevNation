/**
 * Auth context provider: holds login state (isAuthenticated, user) and exposes dispatch.
 * Login/Register screens call Auth.actions (loginUser, etc.); success updates this state.
 */
import React, { useEffect, useReducer, useState } from "react";
import { jwtDecode } from "jwt-decode";
import AsyncStorage from '@react-native-async-storage/async-storage';

import authReducer from "../Reducers/Auth.reducer";
import { setCurrentUser } from "../Actions/Auth.actions";
import AuthGlobal from './AuthGlobal';

const Auth = props => {
    const [stateUser, dispatch] = useReducer(authReducer, {
        isAuthenticated: null,
        user: {}
    });
    const [showChild, setShowChild] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const initializeAuth = async () => {
            setShowChild(true);
            try {
                const token = await AsyncStorage.getItem("jwt");
                if (token && isMounted) {
                    dispatch(setCurrentUser(jwtDecode(token)));
                }
            } catch (error) {
                await AsyncStorage.removeItem("jwt");
            }
        };

        initializeAuth();

        return () => {
            isMounted = false;
            setShowChild(false);
        };
    }, []);

    if (!showChild) {
        return null;
    }
    return (
        <AuthGlobal.Provider value={{ stateUser, dispatch }}>
            {props.children}
        </AuthGlobal.Provider>
    );
};

export default Auth;
