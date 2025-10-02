// components/MegatopBar.tsx - FULL-SCREEN APP BAR WITH STATUS INDICATORS
'use client';

import { useState, useEffect } from 'react';
import { Bell, Wifi, WifiOff, Signal, Battery, Clock } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { toast } from 'sonner';

export default function MegatopBar() {
  const { data: session } = useSession();
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(true);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const { isSubscribed, supportsPush, subscribeToPush, unsubscribeFromPush } = usePushNotifications();

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Get battery level (if supported)
  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100));
        
        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(battery.level * 100));
        });
      });
    }
  }, []);

  // Fetch unread notifications count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await fetch('/api/notifications/unread-count');
        if (response.ok) {
          const data = await response.json();
          setUnreadNotifications(data.count || 0);
        }
      } catch (error) {
        console.error('Failed to fetch unread notifications:', error);
      }
    };

    if (session?.user) {
      fetchUnreadCount();
      // Refresh every 30 seconds
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
    // Always return undefined if session?.user is falsy
    return undefined;
  }, [session]);

  const handleNotificationToggle = async () => {
    if (isSubscribed) {
      await unsubscribeFromPush();
    } else {
      await subscribeToPush();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', { 
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  const getSignalStrength = () => {
    // Simulated signal strength based on online status
    // In a real app, you'd use navigator.connection if available
    if (!isOnline) return 0;
    
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      const effectiveType = connection?.effectiveType;
      
      if (effectiveType === '4g') return 4;
      if (effectiveType === '3g') return 3;
      if (effectiveType === '2g') return 2;
      if (effectiveType === 'slow-2g') return 1;
    }
    
    return 4; // Default to full signal
  };

  const signalStrength = getSignalStrength();

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-gray-900 to-gray-800 text-white shadow-lg">
      {/* Status Bar - Mobile Style */}
      <div className="h-6 px-4 flex items-center justify-between text-xs font-medium">
        {/* Left: Time */}
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3" />
          <span>{formatTime(currentTime)}</span>
        </div>

        {/* Right: Status Indicators */}
        <div className="flex items-center gap-3">
          {/* Signal Strength */}
          <div className="flex items-center gap-1">
            <Signal className="w-3 h-3" />
            <div className="flex gap-0.5">
              {[1, 2, 3, 4].map((bar) => (
                <div
                  key={bar}
                  className={`w-0.5 rounded-full transition-colors ${
                    bar <= signalStrength 
                      ? 'bg-white' 
                      : 'bg-gray-600'
                  }`}
                  style={{ height: `${bar * 2 + 2}px` }}
                />
              ))}
            </div>
          </div>

          {/* WiFi Status */}
          {isOnline ? (
            <Wifi className="w-3 h-3 text-green-400" />
          ) : (
            <WifiOff className="w-3 h-3 text-red-400" />
          )}

          {/* Battery Level */}
          {batteryLevel !== null && (
            <div className="flex items-center gap-1">
              <Battery className="w-3 h-3" />
              <span className="text-[10px]">{batteryLevel}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="h-14 px-4 flex items-center justify-between border-t border-gray-700/50">
        {/* Left: App Info */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold">
            E
          </div>
          <div>
            <div className="font-semibold text-sm">Enarva OS</div>
            <div className="text-xs text-gray-400">{formatDate(currentTime)}</div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative text-white hover:bg-gray-700">
                <Bell className="w-5 h-5" />
                {unreadNotifications > 0 && (
                  <Badge 
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs"
                  >
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {supportsPush && (
                <>
                  <DropdownMenuItem onClick={handleNotificationToggle}>
                    <Bell className="w-4 h-4 mr-2" />
                    {isSubscribed 
                      ? 'Désactiver les notifications natives' 
                      : 'Activer les notifications natives sur mobiles'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              
              <DropdownMenuItem onClick={() => router.push('/notifications')}>
                Voir toutes les notifications
              </DropdownMenuItem>
              
              {unreadNotifications > 0 && (
                <DropdownMenuItem 
                  onClick={async () => {
                    try {
                      await fetch('/api/notifications/mark-all-read', { method: 'POST' });
                      setUnreadNotifications(0);
                      toast.success('Notifications marquées comme lues');
                    } catch (error) {
                      toast.error('Erreur lors du marquage');
                    }
                  }}
                >
                  Marquer tout comme lu
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="text-white hover:bg-gray-700">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-sm font-semibold">
                    {session?.user?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span className="hidden md:inline text-sm font-medium">
                    {session?.user?.name || 'Utilisateur'}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/profile')}>
                Profil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/settings')}>
                Paramètres
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/api/auth/signout')}>
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Connection Status Indicator */}
      {!isOnline && (
        <div className="h-8 bg-red-600 flex items-center justify-center text-xs font-medium animate-pulse">
          <WifiOff className="w-3 h-3 mr-2" />
          Vous êtes hors ligne
        </div>
      )}
    </div>
  );
}