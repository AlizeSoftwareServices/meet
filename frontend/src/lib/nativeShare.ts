import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { triggerHaptic } from './haptics';

export interface ShareOptions {
  title: string;
  text?: string;
  url: string;
  dialogTitle?: string;
}

export async function shareMeetingLink(options: ShareOptions): Promise<boolean> {
  triggerHaptic('light');

  if (Capacitor.isNativePlatform()) {
    try {
      const canShare = await Share.canShare();
      if (canShare.value) {
        await Share.share({
          title: options.title,
          text: options.text || `Book a meeting with me on Meet:`,
          url: options.url,
          dialogTitle: options.dialogTitle || 'Share Meeting Link',
        });
        return true;
      }
    } catch (err) {
      console.warn('Native share failed, falling back to clipboard', err);
    }
  }

  // Fallback for Web / Desktop / Unsupported Native
  if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare && navigator.canShare(options)) {
    try {
      await navigator.share({
        title: options.title,
        text: options.text,
        url: options.url,
      });
      return true;
    } catch (err) {
      // User cancelled or share failed
    }
  }

  // Clipboard copy fallback
  try {
    await navigator.clipboard.writeText(options.url);
    return false; // indicates copied to clipboard rather than dialog opened
  } catch (err) {
    console.error('Clipboard copy failed', err);
    return false;
  }
}
