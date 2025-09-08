import { useEffect, useRef } from 'react';
import Pusher, { Channel } from 'pusher-js';

// Module-level variable to hold the single Pusher client instance.
let pusherClient: Pusher | null = null;

// Function to initialize and/or retrieve the singleton Pusher client.
const getPusherClient = (): Pusher => {
  if (!pusherClient) {
    // Only create a new instance if one doesn't already exist.
    pusherClient = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      authEndpoint: '/api/pusher/auth',
      forceTLS: true,
      enabledTransports: ['ws', 'wss'],
      activityTimeout: 10000,
      pongTimeout: 5000,
      unavailableTimeout: 10000,
    });
  }
  return pusherClient;
};

/**
 * A custom React hook to subscribe to a Pusher channel and handle events.
 * This hook ensures that components correctly subscribe and clean up listeners,
 * preventing memory leaks and redundant subscriptions.
 * * @param channelName - The name of the channel to subscribe to. Can be null to prevent subscription.
 * @param eventHandlers - An object where keys are event names and values are the handler functions.
 */
export function usePusherChannel(
  channelName: string | null,
  eventHandlers: Record<string, (data: any) => void>
) {
  const client = getPusherClient();
  const channelRef = useRef<Channel | null>(null);

  useEffect(() => {
    // Do nothing if the channel name is not provided.
    if (!channelName) {
      return;
    }

    // Subscribe to the channel.
    channelRef.current = client.subscribe(channelName);

    // Bind all provided event handlers to the channel.
    Object.entries(eventHandlers).forEach(([event, handler]) => {
      channelRef.current!.bind(event, handler);
    });

    // Cleanup function: This is critical for preventing memory leaks.
    // It runs when the component unmounts or when the channelName changes.
    return () => {
      if (channelRef.current) {
        // Unbind all event handlers before unsubscribing.
        Object.keys(eventHandlers).forEach(event => {
          channelRef.current!.unbind(event);
        });
        
        // Unsubscribe from the channel.
        client.unsubscribe(channelName);
        channelRef.current = null;
      }
    };
    // The hook re-runs only if the channelName changes.
  }, [channelName, client, eventHandlers]);
}
