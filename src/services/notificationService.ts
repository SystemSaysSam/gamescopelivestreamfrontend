/**
 * GameScope Live — Web Push Notification Service
 * Handles native Service Worker registration, dynamic VAPID key sync,
 * persistent browser push subscriptions, and backend delivery synchronization.
 */

import { api } from './api';
import { config } from '../config';

export interface SubscriptionStatus {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  endpoint?: string;
  error?: string;
}

class NotificationService {
  private static instance: NotificationService;
  private hasFiredForStarting: boolean = false;
  private swRegistration: ServiceWorkerRegistration | null = null;
  private cachedVapidKey: string | null = null;

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Determine if the current browser environment supports Push API & Service Workers
   */
  public isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window
    );
  }

  /**
   * Returns current browser notification permission
   */
  public getPermission(): NotificationPermission {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  }

  /**
   * Initialize or retrieve the active ServiceWorkerRegistration
   */
  public async initServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isSupported()) return null;
    try {
      if (!this.swRegistration) {
        this.swRegistration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });
        // Wait for worker to be ready
        await navigator.serviceWorker.ready;
        console.log('[NotificationService] Service Worker ready:', this.swRegistration.scope);
      }
      return this.swRegistration;
    } catch (err: any) {
      console.warn('[NotificationService] SW registration failed:', err);
      return null;
    }
  }

  /**
   * Inspect existing subscription state without re-prompting the user
   */
  public async checkSubscriptionStatus(): Promise<SubscriptionStatus> {
    if (!this.isSupported()) {
      return {
        isSupported: false,
        permission: 'denied',
        isSubscribed: false,
        error: 'Push notifications are not supported on this browser or platform.'
      };
    }

    const permission = this.getPermission();
    if (permission !== 'granted') {
      return {
        isSupported: true,
        permission,
        isSubscribed: false
      };
    }

    try {
      const reg = await this.initServiceWorker();
      if (!reg) {
        return {
          isSupported: true,
          permission,
          isSubscribed: false,
          error: 'Service Worker failed to initialize.'
        };
      }

      const existingSub = await reg.pushManager.getSubscription();
      if (existingSub) {
        return {
          isSupported: true,
          permission: 'granted',
          isSubscribed: true,
          endpoint: existingSub.endpoint
        };
      }

      return {
        isSupported: true,
        permission: 'granted',
        isSubscribed: false
      };
    } catch (err: any) {
      return {
        isSupported: true,
        permission,
        isSubscribed: false,
        error: err.message
      };
    }
  }

  /**
   * Request notification permission and subscribe to Web Push
   */
  public async subscribeToPush(userId?: string): Promise<{
    success: boolean;
    permission: NotificationPermission;
    isSubscribed: boolean;
    error?: string;
  }> {
    if (!this.isSupported()) {
      return {
        success: false,
        permission: 'denied',
        isSubscribed: false,
        error: 'Push notifications are not supported in this browser.'
      };
    }

    // If permission was already denied, do not spam prompt
    if (Notification.permission === 'denied') {
      return {
        success: false,
        permission: 'denied',
        isSubscribed: false,
        error: 'Notifications are blocked in your browser settings. Please allow notifications for this site to receive broadcast reminders.'
      };
    }

    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        return {
          success: false,
          permission: perm,
          isSubscribed: false,
          error: perm === 'denied' ? 'Permission was denied by user.' : 'Permission prompt was dismissed.'
        };
      }

      const reg = await this.initServiceWorker();
      if (!reg) {
        return {
          success: false,
          permission: perm,
          isSubscribed: false,
          error: 'Service Worker registration could not be established.'
        };
      }

      // 1. Fetch authoritative VAPID public key from backend or fall back to config
      let vapidKey = this.cachedVapidKey;
      if (!vapidKey) {
        try {
          const keyRes = await api.getPushPublicKey();
          if (keyRes?.publicKey) {
            vapidKey = keyRes.publicKey;
            this.cachedVapidKey = keyRes.publicKey;
          }
        } catch {
          vapidKey = config.vapidPublicKey;
        }
      }
      const finalVapidKey = vapidKey || config.vapidPublicKey;

      // 2. Unsubscribe any stale subscription to guarantee clean VAPID key synchronization
      let subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        try {
          await subscription.unsubscribe();
          console.log('[NotificationService] Stale subscription cleared for renewal.');
        } catch (e) {
          console.warn('[NotificationService] Could not unsubscribe stale push (proceeding):', e);
        }
      }

      // 3. Create fresh subscription with valid VAPID key
      const applicationServerKey = this.urlBase64ToUint8Array(finalVapidKey);
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as unknown as BufferSource
      });

      // 3. Register or sync with backend
      await api.subscribePush(subscription, userId);
      localStorage.setItem('gamescope_notifications_enabled', 'true');

      // 4. In-site confirmation banner
      this.dispatchBanner(
        'Broadcast Notifications Enabled!',
        'You will receive an alert 15 minutes before the GTA VI stream starts and when the live broadcast begins.'
      );

      return {
        success: true,
        permission: 'granted',
        isSubscribed: true
      };
    } catch (err: any) {
      console.error('[NotificationService] Push subscription failed:', err);
      let errorMsg = err.message || 'Push subscription could not be completed.';
      if (
        errorMsg.toLowerCase().includes('push service') ||
        errorMsg.toLowerCase().includes('registration failed') ||
        errorMsg.toLowerCase().includes('aborted')
      ) {
        errorMsg += ' (If using Brave browser, enable "Use Google services for push messaging" in brave://settings/privacy. If using Private/Incognito mode, desktop push is disabled by browser security).';
      }
      return {
        success: false,
        permission: this.getPermission(),
        isSubscribed: false,
        error: errorMsg
      };
    }
  }

  public dispatchBanner(title: string, body: string) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('gamescope-push-notification', {
          detail: { title, body }
        })
      );
    }
  }

  public sendStartingNotification(force: boolean = false): boolean {
    if (!force && this.hasFiredForStarting) return false;
    this.hasFiredForStarting = true;

    const title = 'GameScope Live — GTA VI Stream Starting!';
    const body = 'The Grand Theft Auto VI broadcast is starting right now! Tune in live.';

    if (this.isSupported() && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/assets/gta6poster.jpg',
          badge: '/favicon.svg',
          tag: 'gamescope-starting'
        });
      } catch {}
    }

    this.dispatchBanner(title, body);
    return true;
  }

  public resetStartingFlag() {
    this.hasFiredForStarting = false;
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

export const notificationService = NotificationService.getInstance();
