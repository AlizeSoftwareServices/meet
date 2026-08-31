import { App, URLOpenListenerEvent } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';
import { initPushNotifications } from './pushNotifications';

export function initMobileAppLifecycle(router?: any) {
  if (!Capacitor.isNativePlatform()) return;

  // 1. Status Bar styling
  try {
    StatusBar.setStyle({ style: Style.Default }).catch(() => {});
    StatusBar.setBackgroundColor({ color: '#ffffff' }).catch(() => {});
  } catch (e) {
    // Ignore in non-mobile
  }

  // 2. Hide Splash Screen after launch
  try {
    SplashScreen.hide().catch(() => {});
  } catch (e) {
    // Ignore
  }

  // 3. Deep Link handling (OAuth callbacks, booking links, etc.)
  try {
    App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
      console.log('App opened with URL:', event.url);
      
      try {
        const urlObj = new URL(event.url);
        let targetPath = urlObj.pathname;
        if (event.url.startsWith('meetapp://')) {
          const hostAndPath = event.url.replace('meetapp://', '');
          targetPath = '/' + hostAndPath.replace(/^oauth-callback/, 'dashboard/integrations');
        }

        const fullTarget = targetPath + (urlObj.search || '');
        if (router && typeof router.push === 'function') {
          router.push(fullTarget);
        } else if (typeof window !== 'undefined') {
          window.location.href = fullTarget;
        }
      } catch (err) {
        console.error('Failed to parse deep link URL:', err);
      }
    });
  } catch (e) {
    console.warn('Deep link listener not supported:', e);
  }

  // 4. Android Hardware Back Button Handling
  try {
    let lastBackPress = 0;
    App.addListener('backButton', ({ canGoBack }) => {
      if (typeof window === 'undefined') return;

      const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
      const isRootScreen = currentPath === '/dashboard' || currentPath === '/login' || currentPath === '';

      if (canGoBack && !isRootScreen) {
        window.history.back();
      } else if (isRootScreen) {
        const now = Date.now();
        if (now - lastBackPress < 2000) {
          App.exitApp();
        } else {
          lastBackPress = now;
          // Optionally notify user: Press back again to exit
        }
      } else if (router && typeof router.push === 'function') {
        router.push('/dashboard');
      }
    });
  } catch (e) {
    console.warn('Back button listener error:', e);
  }

  // 5. Initialize Push Notifications safely in background
  setTimeout(() => {
    try {
      initPushNotifications().catch(() => {});
    } catch (e) {
      console.warn('Push init error:', e);
    }
  }, 1000);
}
