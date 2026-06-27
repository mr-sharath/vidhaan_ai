'use client';

import React, { useEffect, useState } from 'react';
import { Smartphone, Download, X } from 'lucide-react';

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
    <div className="bg-[#f57c00] text-white py-2.5 px-4 sm:px-6 text-xs sm:text-sm font-semibold flex items-center justify-between shadow-md relative z-50 animate-fade-in select-none">
      <div className="flex items-center gap-2 pr-4 min-w-0 flex-wrap">
        <Smartphone size={16} className="shrink-0 text-white/90" />
        {isIOSDevice ? (
          <span className="flex items-center gap-1 text-[11px] sm:text-xs">
            Tap
            <svg className="w-3.5 h-3.5 inline mx-0.5 text-white stroke-[2.5] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h10a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15M9 12l3-3m0 0 3 3m-3-3v12" />
            </svg>
            then &ldquo;Add to Home Screen&rdquo; for best experience
          </span>
        ) : (
          <span className="text-[11px] sm:text-xs">
            Install Vidhaan AI on your device for full-screen experience
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {!isIOSDevice && deferredPrompt && (
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-1 bg-white hover:bg-slate-50 text-[#f57c00] px-3 py-1 rounded-lg text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Download size={11} className="stroke-[2.5]" />
            <span>Install</span>
          </button>
        )}
        <button
          onClick={handleDismiss}
          className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded-md transition-colors cursor-pointer"
          title="Dismiss banner"
        >
          <X size={14} className="stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
}
