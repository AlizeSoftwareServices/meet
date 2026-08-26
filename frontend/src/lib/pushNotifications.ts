import { PushNotifications, Token, ActionPerformed, PushNotificationSchema } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

export async function initPushNotifications(onNotificationReceived?: (notification: PushNotificationSchema) => void) {
  if (!Capacitor.isNativePlatform()) return;

  try {
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.warn('Push notification permission not granted');
      return;
    }

    // Register with Apple / Google to receive push token
    await PushNotifications.register();

    // On registration success
    await PushNotifications.addListener('registration', (token: Token) => {
      console.log('Mobile Push registration success, token:', token.value);
      localStorage.setItem('fcm_push_token', token.value);
    });

    // Registration errors
    await PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Error on push notification registration: ', error);
    });

    // Foreground notification received
    await PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('Push notification received in foreground: ', notification);
      if (onNotificationReceived) {
        onNotificationReceived(notification);
      }
    });

    // Notification tapped / action performed
    await PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
      console.log('Push notification action performed: ', notification.actionId, notification.inputValue);
    });
  } catch (err) {
    console.warn('Push notifications init failed or not supported in web environment', err);
  }
}
