import React, { useEffect, useState } from 'react';
import { Download, Share2, X, Smartphone } from 'lucide-react';

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallAppButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('desktop');

  useEffect(() => {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) setPlatform('ios');
    else if (/Android/.test(ua)) setPlatform('android');

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Detect already installed (standalone PWA)
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-ignore iOS
      window.navigator.standalone === true;
    if (standalone) setInstalled(true);

    window.addEventListener('appinstalled', () => setInstalled(true));

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const triggerInstall = async () => {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === 'accepted') setInstalled(true);
      setDeferred(null);
    } else {
      setShowModal(true);
    }
  };

  if (installed) return null;

  return (
    <>
      <button
        data-testid="install-app-btn"
        onClick={triggerInstall}
        className={`flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 rounded-full font-medium text-sm hover:bg-emerald-500/20 hover:border-emerald-400 transition-all ${className}`}
        aria-label="Install Biz-Salama App"
      >
        <Download className="w-4 h-4" />
        <span>Install App</span>
      </button>

      {showModal && (
        <div
          data-testid="install-app-modal"
          className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-ink-800 rounded-t-3xl sm:rounded-3xl w-full max-w-md border border-ink-700 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-br from-gold-500/20 to-emerald-500/10 p-6 border-b border-ink-700 flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-gold-400 to-gold-600 rounded-2xl flex items-center justify-center shrink-0">
                <Smartphone className="w-7 h-7 text-ink-900" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-bold text-lg">Install Biz-Salama</h3>
                <p className="text-ink-300 text-sm">Works offline · Loads instantly · No app store needed</p>
              </div>
              <button
                data-testid="install-modal-close"
                onClick={() => setShowModal(false)}
                className="text-ink-400 hover:text-white p-1"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-ink-300 text-sm">
              {platform === 'ios' && (
                <ol className="space-y-3">
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-gold-500 text-ink-900 flex items-center justify-center text-xs font-bold shrink-0">1</span>
                    <span>Tap the <Share2 className="inline w-4 h-4 mx-1 text-blue-400" /> <strong className="text-white">Share</strong> icon at the bottom of Safari</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-gold-500 text-ink-900 flex items-center justify-center text-xs font-bold shrink-0">2</span>
                    <span>Scroll down and tap <strong className="text-white">"Add to Home Screen"</strong></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-gold-500 text-ink-900 flex items-center justify-center text-xs font-bold shrink-0">3</span>
                    <span>Tap <strong className="text-white">"Add"</strong> — done! Open Biz-Salama from your home screen.</span>
                  </li>
                </ol>
              )}

              {platform === 'android' && (
                <ol className="space-y-3">
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-gold-500 text-ink-900 flex items-center justify-center text-xs font-bold shrink-0">1</span>
                    <span>Tap the <strong className="text-white">⋮ menu</strong> in the top-right of Chrome</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-gold-500 text-ink-900 flex items-center justify-center text-xs font-bold shrink-0">2</span>
                    <span>Select <strong className="text-white">"Install app"</strong> or <strong className="text-white">"Add to Home Screen"</strong></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-gold-500 text-ink-900 flex items-center justify-center text-xs font-bold shrink-0">3</span>
                    <span>Confirm — Biz-Salama will appear on your home screen like a native app.</span>
                  </li>
                </ol>
              )}

              {platform === 'desktop' && (
                <ol className="space-y-3">
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-gold-500 text-ink-900 flex items-center justify-center text-xs font-bold shrink-0">1</span>
                    <span>Look for the <strong className="text-white">⊕ Install</strong> icon in your browser's address bar</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-gold-500 text-ink-900 flex items-center justify-center text-xs font-bold shrink-0">2</span>
                    <span>Or Chrome menu ⋮ → <strong className="text-white">"Install Biz-Salama"</strong></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-gold-500 text-ink-900 flex items-center justify-center text-xs font-bold shrink-0">3</span>
                    <span>The app will open in its own window — no tabs, no distractions.</span>
                  </li>
                </ol>
              )}

              <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-start gap-2">
                <span className="text-base">💡</span>
                <span>
                  <strong className="text-emerald-200">Why install?</strong> Faster loads, works offline,
                  and sends you real-time notifications when a buyer pays escrow or confirms delivery.
                </span>
              </div>

              <div className="mt-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-200 text-xs flex items-start gap-2">
                <span className="text-base">⚠️</span>
                <span>
                  <strong className="text-amber-100">Seeing "React App" on your home screen?</strong> You have an old version installed.
                  Long-press the icon → <strong>Remove / Uninstall</strong>, then install again — it will say <strong>"Biz-Salama"</strong> this time.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InstallAppButton;
