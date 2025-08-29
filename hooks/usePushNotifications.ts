//hooks/usePushNotifications.ts
'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      const askPermissionAndSubscribe = async () => {
        try {
          const permissionResult = await Notification.requestPermission();
          if (permissionResult !== 'granted') {
            console.log('User denied notification permission.');
            return;
          }

          const swRegistration = await navigator.serviceWorker.register('/sw.js');
          let subscription = await swRegistration.pushManager.getSubscription();

          if (subscription === null) {
            const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            if (!vapidPublicKey) {
              throw new Error('VAPID public key not found.');
            }
            subscription = await swRegistration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
            });
          }

          // Send subscription to the backend
          await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subscription),
          });
          toast.success('Notifications activées !');
        } catch (error) {
          console.error('Failed to subscribe to push notifications:', error);
          toast.error('Impossible d\'activer les notifications.');
        }
      };
      
      // We can trigger this based on a user action, e.g., a button click.
      // For now, let's create a function that can be called from a component.
      (window as any).enablePushNotifications = askPermissionAndSubscribe;
    }
  }, []);
}