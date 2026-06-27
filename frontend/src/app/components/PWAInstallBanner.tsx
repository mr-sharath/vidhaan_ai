'use client';

import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isIOSDevice, setIsIOSDevice] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Standalone check (PWA already installed and running)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         ('standalone' in window.navigator && 
                          (window.navigator as unknown as { standalone: boolean }).standalone === true);
    
    if (isStandalone) {
      return;
    }

    // 2. Check if banner was dismissed in this session
    const isDismissed = sessionStorage.getItem('vidhaan_pwa_dismissed') === 'true';
    if (isDismissed) {
      return;
    }

    // 3. iOS detection
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window);
    if (isIOS) {
      setTimeout(() => {
        setIsIOSDevice(true);
        setIsVisible(true);
      }, 0);
      return;
    }

    // 4. Android/Chrome prompt listener
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setTimeout(() => {
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        setIsVisible(true);
      }, 0);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Trigger the native install prompt
    await deferredPrompt.prompt();
    
    // Wait for choice outcome
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('PWA installation accepted by user');
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem('vidhaan_pwa_dismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="bg-[#090d12] border-b border-[#f57c00]/30 text-[#fdfbf7] py-2.5 px-4 sm:px-6 text-[11px] sm:text-xs font-semibold flex items-center justify-between shadow-sm relative z-50 animate-fade-in select-none">
      <div className="flex items-center min-w-0 pr-4">
        {isIOSDevice ? (
          <span>
            Tap Share and select &ldquo;Add to Home Screen&rdquo; for the best experience.
          </span>
        ) : (
          <span>
            Install Vidhaan AI on your device for a full-screen experience.
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {!isIOSDevice && deferredPrompt && (
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-1 bg-[#f57c00] hover:bg-[#dd6b20] text-white px-3 py-1 rounded-lg text-[10px] font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Download size={11} className="stroke-[2.5]" />
            <span>Install</span>
          </button>
        )}
        <button
          onClick={handleDismiss}
          className="text-slate-400 hover:text-white hover:bg-white/10 p-1.5 rounded-md transition-colors cursor-pointer"
          title="Dismiss banner"
        >
          <X size={13} className="stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
}
