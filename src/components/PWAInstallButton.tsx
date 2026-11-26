import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { action, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (action === 'hidden') {
    return null;
  }

  if (action === 'prompt') {
    return (
      <button
        type="button"
        data-testid="pwa-install-button"
        onClick={(e) => {
          e.currentTarget.blur();
          void install();
        }}
        className="toy-btn flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-2xl border-[3px] border-[#1e293b] bg-[#dcfce7] px-3.5 py-2.5 font-display text-sm font-bold text-[#14532d] focus-visible:outline-4 focus-visible:outline-white sm:px-4 sm:py-3 sm:text-base"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" aria-hidden="true">
          <path
            d="M12 4v11m0 0-4-4m4 4 4-4"
            stroke="#15803d"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M4 17v1.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V17"
            stroke="#1e293b"
            strokeWidth="2.3"
            strokeLinecap="round"
          />
        </svg>
        <span>Pasang Game</span>
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        data-testid="pwa-ios-install-button"
        onClick={(e) => {
          e.currentTarget.blur();
          setShowIOSGuide(true);
        }}
        className="toy-btn flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-2xl border-[3px] border-[#1e293b] bg-[#e0f2fe] px-3.5 py-2.5 font-display text-sm font-bold text-[#0c4a6e] focus-visible:outline-4 focus-visible:outline-white sm:px-4 sm:py-3 sm:text-base"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" aria-hidden="true">
          <path
            d="M12 15V4m0 0-3.5 3.5M12 4l3.5 3.5"
            stroke="#0284c7"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M5 12v6.5A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V12"
            stroke="#1e293b"
            strokeWidth="2.3"
            strokeLinecap="round"
          />
        </svg>
        <span>Pasang di iOS</span>
      </button>

      {showIOSGuide && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ios-install-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/60 p-4"
        >
          <div className="w-full max-w-sm rounded-3xl border-[4px] border-[#1e293b] bg-[#fffdf5] p-6 text-left toy-panel">
            <h3
              id="ios-install-title"
              className="font-display text-2xl font-bold text-[#0f172a]"
            >
              Pasang di iPhone / iPad
            </h3>
            <p className="mt-2 text-sm font-medium leading-relaxed text-[#334155]">
              Supaya <strong>Arham&apos;s Adventure</strong> bisa dimainkan langsung dari Layar Utama dan tetap lancar saat offline:
            </p>
            <ol className="mt-3 space-y-2 rounded-2xl border-2 border-[#cbd5e1] bg-white p-3.5 text-sm font-semibold text-[#1e293b]">
              <li>
                1. Ketuk tombol <strong>Bagikan (Share)</strong> di bilah bawah Safari.
              </li>
              <li>
                2. Geser ke bawah lalu pilih <strong>Tambah ke Layar Utama</strong> (<em>Add to Home Screen</em>).
              </li>
              <li>
                3. Ketuk <strong>Tambah</strong> di pojok kanan atas.
              </li>
            </ol>
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                setShowIOSGuide(false);
              }}
              className="toy-btn mt-5 w-full cursor-pointer rounded-2xl border-[3px] border-[#1e293b] bg-[#facc15] py-3 font-display text-base font-bold text-[#0f172a]"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
};
