import { PushNotifications, Token, ActionPerformed, PushNotificationSchema } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

export async function initPushNotifications(
  onNotificationReceived?: (notification: PushNotificationSchema) => void,
  onNotificationTapped?: (action: ActionPerformed) => void
) {
  if (!Capacitor.isNativePlatform()) return;

  try {
    let permStatus;
    try {
      permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }
    } catch (e) {
      console.warn('Push permission check failed:', e);
      return;
    }

    if (permStatus?.receive !== 'granted') {
      console.warn('Push notification permission not granted');
      return;
    }

    // Register with Apple / Google to receive push token
    try {
      await PushNotifications.register();
    } catch (regErr) {
      console.warn('PushNotifications.register failed (missing google-services.json or play services):', regErr);
    }

    // On registration success
    await PushNotifications.addListener('registration', async (token: Token) => {
      console.log('Mobile Push registration success, token:', token.value);
      localStorage.setItem('fcm_push_token', token.value);
      try {
        const { api } = await import('@/lib/api');
        const platform = Capacitor.getPlatform().toUpperCase(); // 'ANDROID' or 'IOS'
        await api.post('/users/push-token', {
          token: token.value,
          platform: platform === 'ANDROID' || platform === 'IOS' ? platform : 'WEB'
        });
      } catch (e) {
        console.warn('Failed to sync push token with backend:', e);
      }
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
      if (onNotificationTapped) {
        onNotificationTapped(notification);
      } else {
        // Default navigation handler
        const targetUrl = notification.notification?.data?.url || '/dashboard/bookings';
        if (typeof window !== 'undefined' && targetUrl) {
          window.location.href = targetUrl;
        }
      }
    });
  } catch (err) {
    console.warn('Push notifications init failed or not supported in web environment', err);
  }
}

export async function unregisterPushToken() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const token = localStorage.getItem('fcm_push_token');
    if (token) {
      const { api } = await import('@/lib/api');
      await api.delete('/users/push-token', { data: { token } }).catch(() => {});
      localStorage.removeItem('fcm_push_token');
    }
    await PushNotifications.removeAllListeners();
  } catch (e) {
    console.warn('Error during push token unregistration:', e);
  }
}
