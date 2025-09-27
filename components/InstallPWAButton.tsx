// components/InstallPWAButton.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, TabletSmartphone  } from 'lucide-react';

export default function InstallPWAButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Détecter iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Vérifier si déjà installé
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Vérifier si l'app est installée
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setIsInstallable(false);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      alert('Sur iOS:\n1. Appuyez sur le bouton Partager (carré avec flèche)\n2. Faites défiler et sélectionnez "Sur l\'écran d\'accueil"\n3. Appuyez sur "Ajouter"');
      return;
    }

    if (!deferredPrompt) {
      console.log('Prompt not available');
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      setIsInstalled(true);
    }
    
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  if (isInstalled) {
    return (
      <Button variant="outline" disabled className="gap-2">
        <TabletSmartphone className="w-4 h-4" /></Button>
    );
  }

  if (isIOS || isInstallable) {
    return (
      <Button onClick={handleInstall} variant="default" className="gap-2">
        <Download className="w-4 h-4" />
        Installer l'app
      </Button>
    );
  }

  return null;
}