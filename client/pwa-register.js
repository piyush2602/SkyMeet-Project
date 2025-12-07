// PWA Installation and Service Worker Registration
(function() {
  'use strict';

  // Check if service workers are supported
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registered successfully:', registration.scope);
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            console.log('[PWA] New service worker found, installing...');
            
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker available, show update notification
                console.log('[PWA] New content available, please refresh.');
                showUpdateNotification();
              }
            });
          });
        })
        .catch((error) => {
          console.error('[PWA] Service Worker registration failed:', error);
        });
    });

    // Listen for controlling service worker changes
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[PWA] Controller changed, reloading page...');
      window.location.reload();
    });
  }

  // Show update notification
  function showUpdateNotification() {
    const updateBanner = document.createElement('div');
    updateBanner.id = 'pwa-update-banner';
    updateBanner.innerHTML = `
      <div style="position: fixed; top: 20px; left: 50%; transform: translateX(-50%); 
                  background: linear-gradient(135deg, #2a7dff, #185fd6); 
                  color: white; padding: 16px 24px; border-radius: 12px; 
                  box-shadow: 0 8px 32px rgba(26, 95, 232, 0.3); 
                  z-index: 10000; display: flex; align-items: center; gap: 16px;
                  font-family: Inter, sans-serif; font-size: 14px;
                  animation: slideDown 0.3s ease;">
        <span>🎉 New version available!</span>
        <button onclick="updatePWA()" style="background: white; color: #185fd6; 
                border: none; padding: 8px 16px; border-radius: 8px; 
                cursor: pointer; font-weight: 600; font-size: 13px;">
          Update Now
        </button>
        <button onclick="this.parentElement.parentElement.remove()" 
                style="background: transparent; color: white; border: 1px solid rgba(255,255,255,0.3); 
                padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 13px;">
          Later
        </button>
      </div>
      <style>
        @keyframes slideDown {
          from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
      </style>
    `;
    document.body.appendChild(updateBanner);
  }

  // Update PWA function
  window.updatePWA = function() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration && registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    }
  };

  // Install prompt handling
  let deferredPrompt;
  
  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('[PWA] Install prompt available');
    e.preventDefault();
    deferredPrompt = e;
    
    // Show install button/banner
    showInstallPromotion();
  });

  // Show install promotion
  function showInstallPromotion() {
    // Check if already installed or dismissed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('[PWA] App already installed');
      return;
    }

    const installBanner = document.createElement('div');
    installBanner.id = 'pwa-install-banner';
    installBanner.innerHTML = `
      <div style="position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); 
                  background: linear-gradient(135deg, #2a7dff, #185fd6); 
                  color: white; padding: 16px 24px; border-radius: 12px; 
                  box-shadow: 0 8px 32px rgba(26, 95, 232, 0.3); 
                  z-index: 10000; display: flex; align-items: center; gap: 16px;
                  font-family: Inter, sans-serif; font-size: 14px;
                  animation: slideUp 0.3s ease; max-width: 90vw;">
        <span>📱 Install SkyMeet for quick access!</span>
        <button onclick="installPWA()" style="background: white; color: #185fd6; 
                border: none; padding: 8px 16px; border-radius: 8px; 
                cursor: pointer; font-weight: 600; font-size: 13px;
                white-space: nowrap;">
          Install
        </button>
        <button onclick="dismissInstallPrompt()" 
                style="background: transparent; color: white; border: 1px solid rgba(255,255,255,0.3); 
                padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 13px;">
          ✕
        </button>
      </div>
      <style>
        @keyframes slideUp {
          from { transform: translateX(-50%) translateY(100%); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
      </style>
    `;
    
    // Delay showing to not overwhelm user
    setTimeout(() => {
      document.body.appendChild(installBanner);
    }, 3000);
  }

  // Install PWA
  window.installPWA = async function() {
    if (!deferredPrompt) {
      console.log('[PWA] Install prompt not available');
      return;
    }
    
    const banner = document.getElementById('pwa-install-banner');
    if (banner) banner.remove();
    
    deferredPrompt.prompt();
    
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] User response to install prompt: ${outcome}`);
    
    deferredPrompt = null;
  };

  // Dismiss install prompt
  window.dismissInstallPrompt = function() {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) banner.remove();
    deferredPrompt = null;
  };

  // Track installation
  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App installed successfully');
    deferredPrompt = null;
  });

  // Check if running as PWA
  if (window.matchMedia('(display-mode: standalone)').matches || 
      window.navigator.standalone === true) {
    console.log('[PWA] Running as installed app');
    document.documentElement.classList.add('pwa-installed');
  }

  // Online/Offline detection
  window.addEventListener('online', () => {
    console.log('[PWA] Back online');
    const offlineBanner = document.getElementById('offline-banner');
    if (offlineBanner) offlineBanner.remove();
  });

  window.addEventListener('offline', () => {
    console.log('[PWA] Gone offline');
    showOfflineBanner();
  });

  function showOfflineBanner() {
    const offlineBanner = document.createElement('div');
    offlineBanner.id = 'offline-banner';
    offlineBanner.innerHTML = `
      <div style="position: fixed; top: 0; left: 0; right: 0; 
                  background: linear-gradient(135deg, #ff5550, #d63631); 
                  color: white; padding: 12px; text-align: center;
                  z-index: 10001; font-family: Inter, sans-serif; font-size: 14px;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
        📡 You are currently offline. Some features may be limited.
      </div>
    `;
    document.body.appendChild(offlineBanner);
  }

  console.log('[PWA] Registration script loaded');
})();
