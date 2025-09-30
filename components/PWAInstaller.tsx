// components/PWAInstaller.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X, Smartphone, Share, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const checkIfInstalled = useCallback(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = (window.navigator as any).standalone === true;
    const isInWebApk = document.referrer.includes('android-app://');
    
    return isStandalone || isIOSStandalone || isInWebApk;
  }, []);

  const detectIOS = useCallback(() => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }, []);

  // Force service worker update and cache clearing
  const forceUpdate = useCallback(async () => {
    setIsUpdating(true);
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        
        for (const registration of registrations) {
          await registration.unregister();
          console.log('[PWA] Service worker unregistered');
        }
        
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('[PWA] All caches cleared');
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const registration = await navigator.serviceWorker.register('/sw.js', { 
          scope: '/',
          updateViaCache: 'none'
        });
        
        console.log('[PWA] Service worker re-registered');
        await registration.update();
        
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
      console.error('[PWA] Error forcing update:', error);
      setIsUpdating(false);
    }
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { 
          scope: '/',
          updateViaCache: 'none'
        })
        .then((registration) => {
          console.log('[PWA] Service Worker registered:', registration.scope);
          registration.update();
          
          setInterval(() => {
            registration.update();
          }, 60000);
          
          registration.addEventListener('updatefound', () => {
            console.log('[PWA] New version available');
          });
        })
        .catch((error) => {
          console.error('[PWA] Service Worker registration failed:', error);
        });
    }

    const installed = checkIfInstalled();
    setIsInstalled(installed);
    
    const iOS = detectIOS();
    setIsIOS(iOS);

    if (installed) {
      console.log('[PWA] App is already installed');
      return;
    }

    const dismissed = sessionStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      console.log('[PWA] Banner was dismissed this session');
      return;
    }

    // For iOS, ALWAYS show install banner after delay
    if (iOS && !installed) {
      const timer = setTimeout(() => {
        console.log('[PWA] Showing iOS install banner');
        setShowInstallBanner(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    // For Android/Desktop Chrome - Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('[PWA] beforeinstallprompt event fired');
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      setTimeout(() => {
        setShowInstallBanner(true);
      }, 2000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // FALLBACK: If no beforeinstallprompt after 5 seconds, show banner anyway
    const fallbackTimer = setTimeout(() => {
      if (!iOS && !installed && !deferredPrompt) {
        console.log('[PWA] No beforeinstallprompt received, showing banner anyway');
        setShowInstallBanner(true);
      }
    }, 5000);

    const handleAppInstalled = () => {
      console.log('[PWA] App was installed');
      setIsInstalled(true);
      setShowInstallBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearTimeout(fallbackTimer);
    };
  }, [checkIfInstalled, detectIOS, deferredPrompt]);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }

    // If we have the deferred prompt, use it
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        console.log(`[PWA] User response: ${outcome}`);
        
        if (outcome === 'accepted') {
          setShowInstallBanner(false);
        }
        
        setDeferredPrompt(null);
      } catch (error) {
        console.error('[PWA] Error during installation:', error);
      }
    } else {
      // IMPROVED FALLBACK: Better instructions for manual install
      const userAgent = navigator.userAgent.toLowerCase();
      let instructions = '';
      
      if (userAgent.includes('chrome') && !userAgent.includes('edg')) {
        // Chrome
        instructions = 
          '📱 Pour installer Enarva OS:\n\n' +
          '1. Appuyez sur le menu ⋮ (3 points verticaux) en haut à droite\n' +
          '2. Cherchez "Installer l\'application" ou "Ajouter à l\'écran d\'accueil"\n' +
          '3. Suivez les instructions pour installer\n\n' +
          '💡 Si vous ne voyez pas l\'option, essayez d\'actualiser la page.';
      } else if (userAgent.includes('edg')) {
        // Edge
        instructions = 
          '📱 Pour installer Enarva OS:\n\n' +
          '1. Cliquez sur le menu ⋯ (3 points) en haut à droite\n' +
          '2. Sélectionnez "Applications" → "Installer ce site en tant qu\'application"\n' +
          '3. Confirmez l\'installation';
      } else if (userAgent.includes('firefox')) {
        // Firefox
        instructions = 
          '📱 Firefox ne supporte pas encore pleinement les PWA.\n\n' +
          'Pour une meilleure expérience, veuillez utiliser:\n' +
          '• Chrome\n' +
          '• Edge\n' +
          '• Safari (sur iOS)';
      } else if (userAgent.includes('samsung')) {
        // Samsung Internet
        instructions = 
          '📱 Pour installer Enarva OS:\n\n' +
          '1. Appuyez sur le menu ☰ en bas\n' +
          '2. Sélectionnez "Ajouter une page à"\n' +
          '3. Choisissez "Écran d\'accueil"\n' +
          '4. Confirmez';
      } else {
        // Generic Android/Other
        instructions = 
          '📱 Pour installer Enarva OS:\n\n' +
          '1. Ouvrez le menu de votre navigateur\n' +
          '2. Cherchez "Installer l\'application" ou "Ajouter à l\'écran d\'accueil"\n' +
          '3. Suivez les instructions\n\n' +
          '💡 Recommandé: Chrome ou Edge pour la meilleure expérience';
      }
      
      alert(instructions);
    }
  };

  const handleDismiss = () => {
    setShowInstallBanner(false);
    sessionStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (isInstalled) {
    return null;
  }

  return (
    <>
      {/* Install Banner */}
      <AnimatePresence>
        {showInstallBanner && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50"
          >
            <div className="bg-card border border-border rounded-lg shadow-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-enarva-start to-enarva-end flex items-center justify-center">
                    <Smartphone className="w-6 h-6 text-white" />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm mb-1">
                    Installer Enarva OS
                  </h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    {isIOS 
                      ? 'Ajoutez l\'app à votre écran d\'accueil pour un accès rapide'
                      : 'Installez l\'application pour un accès rapide et hors ligne'
                    }
                  </p>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleInstallClick}
                      className="bg-gradient-to-r from-enarva-start to-enarva-end hover:opacity-90"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      {isIOS ? 'Voir comment' : 'Installer'}
                    </Button>
                    
                    {!isIOS && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={forceUpdate}
                        disabled={isUpdating}
                        className="gap-1"
                      >
                        {isUpdating ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Actualisation...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4" />
                            Actualiser
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
                
                <button
                  onClick={handleDismiss}
                  className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS Instructions Modal */}
      <AnimatePresence>
        {showIOSInstructions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowIOSInstructions(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card border border-border rounded-lg shadow-xl p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-4">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-enarva-start to-enarva-end flex items-center justify-center">
                  <Share className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-semibold text-lg mb-2">
                  Installer sur iOS
                </h3>
              </div>
              
              <ol className="space-y-3 text-sm text-muted-foreground mb-4">
                <li className="flex gap-2">
                  <span className="flex-shrink-0 font-semibold">1.</span>
                  <span>Appuyez sur l'icône de partage <Share className="w-4 h-4 inline" /> en bas de Safari</span>
                </li>
                <li className="flex gap-2">
                  <span className="flex-shrink-0 font-semibold">2.</span>
                  <span>Faites défiler et sélectionnez "Sur l'écran d'accueil"</span>
                </li>
                <li className="flex gap-2">
                  <span className="flex-shrink-0 font-semibold">3.</span>
                  <span>Appuyez sur "Ajouter" pour confirmer</span>
                </li>
              </ol>
              
              <Button
                onClick={() => setShowIOSInstructions(false)}
                className="w-full bg-gradient-to-r from-enarva-start to-enarva-end"
              >
                Compris
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}