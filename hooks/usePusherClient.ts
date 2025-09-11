import { useEffect, useRef } from 'react';
import Pusher, { Channel } from 'pusher-js';

// Variable au niveau du module pour conserver l'instance unique du client Pusher.
let pusherClient: Pusher | null = null;

// Fonction pour initialiser et/ou récupérer le client Pusher unique (singleton).
const getPusherClient = (): Pusher | null => {
  // S'assurer que ce code ne s'exécute que côté client.
  if (typeof window === 'undefined') {
    return null;
  }
  
  if (!pusherClient) {
    // Créer une nouvelle instance seulement si elle n'existe pas déjà.
    pusherClient = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      authEndpoint: '/api/pusher/auth', // Endpoint d'authentification
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
 * Hook React personnalisé pour s'abonner à un canal Pusher et gérer les événements.
 * Ce hook garantit que les composants s'abonnent et nettoient correctement les écouteurs,
 * prévenant les fuites de mémoire et les abonnements redondants.
 * @param channelName - Le nom du canal auquel s'abonner. Peut être null pour empêcher l'abonnement.
 * @param eventHandlers - Un objet où les clés sont les noms d'événements et les valeurs sont les fonctions de gestion.
 */
export function usePusherChannel(
  channelName: string | null,
  eventHandlers: Record<string, (data: any) => void>
) {
  const client = getPusherClient();
  const channelRef = useRef<Channel | null>(null);

  useEffect(() => {
    // Ne rien faire si le client n'est pas initialisé ou si le nom du canal n'est pas fourni.
    if (!client || !channelName) {
      return;
    }

    // S'abonner au canal.
    channelRef.current = client.subscribe(channelName);

    // Lier tous les gestionnaires d'événements fournis au canal.
    Object.entries(eventHandlers).forEach(([event, handler]) => {
      channelRef.current!.bind(event, handler);
    });

    // Fonction de nettoyage : essentielle pour éviter les fuites de mémoire.
    // Elle s'exécute lorsque le composant est démonté ou lorsque channelName change.
    return () => {
      if (channelRef.current) {
        // Détacher tous les gestionnaires d'événements avant de se désabonner.
        Object.keys(eventHandlers).forEach(event => {
          channelRef.current!.unbind(event);
        });
        
        // Se désabonner du canal.
        client.unsubscribe(channelName);
        channelRef.current = null;
      }
    };
  }, [channelName, client, eventHandlers]);
}