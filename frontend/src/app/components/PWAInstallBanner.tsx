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

    // 2. iOS detection
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window);
    if (isIOS) {
      setTimeout(() => {
        setIsIOSDevice(true);
        setIsVisible(true);
      }, 0);
      return;
    }

    // 3. Android/Chrome prompt listener
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
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-sm bg-slate-900/95 dark:bg-slate-950/95 border-2 border-[#f57c00] text-[#fdfbf7] p-5 rounded-2xl shadow-2xl z-50 select-none animate-slide-in flex flex-col gap-3">
      {/* Close button */}
      <button
        onClick={handleDismiss}
        className="absolute top-2.5 right-2.5 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
        title="Dismiss popup"
      >
        <X size={15} className="stroke-[2.5]" />
      </button>

      {/* Title */}
      <div className="flex items-center gap-2">
        <span className="text-[13px] font-bold text-amber-500 font-display tracking-wider uppercase">
          Install Vidhaan AI
        </span>
      </div>

      {/* Description */}
      <div className="text-xs font-semibold leading-relaxed text-slate-200 font-sans pr-4">
        {isIOSDevice ? (
          <span>
            Tap the browser Share button and select &ldquo;Add to Home Screen&rdquo; for the best experience.
          </span>
        ) : (
          <span>
            Add this application to your device to enable a full-screen, institutional-grade legal workbench experience.
          </span>
        )}
      </div>

      {/* Install Action Button (For Android/Chrome only) */}
      {!isIOSDevice && deferredPrompt && (
        <button
          onClick={handleInstallClick}
          className="w-full py-2 bg-[#f57c00] hover:bg-[#dd6b20] text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
        >
          <Download size={13} className="stroke-[2.5]" />
          <span>Add to Home Screen</span>
        </button>
      )}
    </div>
  );
}
