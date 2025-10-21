// hooks/usePushNotifications.ts - COMPLETE PUSH NOTIFICATION HOOK (FIXED)
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'

export function usePushNotifications() {
  const { data: session } = useSession()
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [supportsPush, setSupportsPush] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setSupportsPush(true)
      initializePushNotifications()
    }
  }, [session])

  const initializePushNotifications = async () => {
    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js')
      console.log('Service Worker registered:', registration)

      // Check if already subscribed
      const existingSubscription = await registration.pushManager.getSubscription()
      if (existingSubscription) {
        setSubscription(existingSubscription)
        setIsSubscribed(true)
        console.log('Already subscribed to push notifications')
        return
      }

      // Auto-subscribe for logged in users
      if (session?.user) {
        await subscribeToPush()
      }
    } catch (error) {
      console.error('Failed to initialize push notifications:', error)
    }
  }

  const subscribeToPush = async () => {
    try {
      if (!supportsPush) {
        toast.error('Les notifications push ne sont pas supportées sur ce navigateur')
        return
      }

      // Request notification permission
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        toast.error('Permission de notification refusée')
        return
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!)
      })

      // Send subscription to server
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription.toJSON()
        })
      })

      if (response.ok) {
        setSubscription(subscription)
        setIsSubscribed(true)
        toast.success('Notifications activées avec succès!')
      } else {
        // FIX: Better error handling for 404 (user not found)
        if (response.status === 404) {
          toast.error('Erreur: Utilisateur introuvable. Veuillez vous reconnecter.')
          // Unsubscribe locally since server can't save it
          await subscription.unsubscribe()
        } else {
          const errorText = await response.text()
          console.error('Failed to save subscription:', errorText)
          toast.error('Erreur lors de l\'activation des notifications')
          // Unsubscribe locally since server couldn't save it
          await subscription.unsubscribe()
        }
      }
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error)
      toast.error('Erreur lors de l\'activation des notifications')
    }
  }

  const unsubscribeFromPush = async () => {
    try {
      if (subscription) {
        await subscription.unsubscribe()
        
        // Remove subscription from server
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subscription: subscription.toJSON()
          })
        })

        setSubscription(null)
        setIsSubscribed(false)
        toast.success('Notifications désactivées')
      }
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error)
      toast.error('Erreur lors de la désactivation des notifications')
    }
  }

  return {
    isSubscribed,
    supportsPush,
    subscribeToPush,
    unsubscribeFromPush
  }
}

// Utility function to convert VAPID key
function urlB64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}