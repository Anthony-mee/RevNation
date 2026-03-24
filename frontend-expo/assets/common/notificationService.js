import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Request notification permissions
export const requestNotificationPermissions = async () => {
  if (Platform.OS === 'web') {
    // Web notifications require user permission
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};

// Get push token
export const getPushToken = async () => {
  if (Platform.OS === 'web') {
    return null; // Web doesn't use push tokens
  }

  const { data: token } = await Notifications.getExpoPushTokenAsync();
  return token;
};

// Send local notification (for testing)
export const sendLocalNotification = async (title, body, data = {}) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: 'default',
    },
    trigger: null, // Show immediately
  });
};

// Handle notification press (deep linking)
export const handleNotificationPress = (navigation) => {
  Notifications.addNotificationResponseReceivedListener(response => {
    const { data } = response.notification.request.content;
    
    console.log('Notification pressed:', data);
    
    // Handle different notification types
    if (data.type === 'order_confirmed' || data.type === 'order_status_update' || data.type === 'new_order') {
      if (data.orderId) {
        navigation.navigate('OrderDetails', { orderId: data.orderId });
      }
    } else if (data.type === 'promotion' || data.type === 'discount') {
      if (data.productId) {
        navigation.navigate('SingleProduct', { id: data.productId });
      } else if (data.categoryId) {
        navigation.navigate('Products', { categoryId: data.categoryId });
      }
    }
  });
};

// Initialize notifications
export const initializeNotifications = async (navigation) => {
  const hasPermission = await requestNotificationPermissions();
  if (hasPermission && Platform.OS !== 'web') {
    const token = await getPushToken();
    console.log('Push token:', token);
    // You should send this token to your backend
    return token;
  }
  return null;
};
