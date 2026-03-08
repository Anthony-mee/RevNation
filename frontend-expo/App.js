/**
 * Root component: wraps the app with Auth context, Redux (cart), and navigation.
 * - Auth: login state and JWT live in Context (see Context/Store/Auth.js).
 * - Redux: cart state (see Redux/store.js).
 * - DrawerNavigator contains the main bottom tabs (Home, Cart, Admin, User).
 */
import { StyleSheet, Platform } from 'react-native';
import React, { useContext, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { Provider } from 'react-redux';
import store from './Redux/store';
import Toast from 'react-native-toast-message';
import Auth from './Context/Store/Auth';
import DrawerNavigator from './Navigators/DrawerNavigator';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import baseURL from './assets/common/baseurl';
import AuthGlobal from './Context/Store/AuthGlobal';

import Constants from 'expo-constants';

// MUST be at module level - tells Expo how to handle notifications in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Inner component that can access Auth context (it's INSIDE the <Auth> provider)
function AppInner() {
  const context = useContext(AuthGlobal);

  useEffect(() => {
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const registerPushToken = async () => {
      try {
        console.log('[Push] === Starting push token registration ===');

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        console.log('[Push] Current permission status:', existingStatus);
        if (finalStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') {
          console.log('[Push] PERMISSION DENIED:', finalStatus);
          return;
        }
        console.log('[Push] Permission granted!');

        // Try FCM device token first (works on real APK builds)
        // Fall back to Expo Push Token (works on Expo Go)
        let pushToken = null;
        let tokenType = 'unknown';

        try {
          const deviceToken = await Notifications.getDevicePushTokenAsync();
          pushToken = deviceToken?.data;
          tokenType = 'fcm';
          console.log('[Push] Got FCM device token:', pushToken ? pushToken.substring(0, 40) + '...' : 'null');
        } catch (fcmError) {
          console.log('[Push] FCM token failed:', fcmError.message);
          console.log('[Push] Trying Expo Push Token...');
          try {
            const projectId = Constants.expoConfig?.extra?.eas?.projectId
              || Constants.manifest?.extra?.eas?.projectId
              || '6f747b51-b33e-4c6e-9d11-89bf760ec81a';
            console.log('[Push] Using projectId:', projectId);
            const expoToken = await Notifications.getExpoPushTokenAsync({ projectId });
            pushToken = expoToken?.data;
            tokenType = 'expo';
            console.log('[Push] Got Expo push token:', pushToken ? pushToken.substring(0, 40) + '...' : 'null');
          } catch (expoError) {
            console.log('[Push] Expo token also failed:', expoError.message);
            return;
          }
        }

        if (!pushToken) {
          console.log('[Push] ERROR: No push token received');
          return;
        }

        // Always clear old cached token to force re-registration
        await AsyncStorage.removeItem('pushToken');

        const jwt = await AsyncStorage.getItem('jwt');
        if (!jwt) {
          console.log('[Push] No JWT found, skipping backend registration');
          return;
        }

        console.log(`[Push] Sending ${tokenType} token to backend...`);
        const response = await fetch(`${baseURL}users/push-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({ token: pushToken, type: tokenType }),
        });

        const responseText = await response.text();
        console.log(`[Push] Backend response (${response.status}):`, responseText);

        if (response.ok) {
          console.log('[Push] === Token registered successfully! ===');
          await AsyncStorage.setItem('pushToken', pushToken);
        } else {
          console.log('[Push] FAILED to register token');
        }
      } catch (error) {
        console.error('[Push] Registration error:', error.message, error.stack);
      }
    };

    if (context?.stateUser?.isAuthenticated) {
      console.log('[Push] User is authenticated, registering...');
      registerPushToken();
    }
  }, [context?.stateUser?.isAuthenticated]);

  return (
    <Provider store={store}>
      <NavigationContainer>
        <PaperProvider>
          <DrawerNavigator />
        </PaperProvider>
      </NavigationContainer>
      <Toast />
    </Provider>
  );
}

// Outer component provides Auth context - AppInner can consume it
export default function App() {
  return (
    <Auth>
      <AppInner />
    </Auth>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
