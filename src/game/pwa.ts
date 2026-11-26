export interface PwaEnvironment {
  displayModeStandalone: boolean;
  navigatorStandalone?: boolean;
  userAgent: string;
  maxTouchPoints?: number;
}

export type PwaInstallAction = 'hidden' | 'prompt' | 'ios_guide';

/**
 * Pure detector for whether the app is currently running as an installed standalone PWA.
 */
export function isStandalonePwa(env: PwaEnvironment): boolean {
  return env.displayModeStandalone || env.navigatorStandalone === true;
}

/**
 * Pure detector for iOS / iPadOS Safari environments where `beforeinstallprompt` is unsupported.
 */
export function isIosDevice(userAgent: string, maxTouchPoints = 0): boolean {
  const ua = userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return true;
  // iPadOS 13+ reports Macintosh with multi-touch support
  if (ua.includes('macintosh') && maxTouchPoints > 1) return true;
  return false;
}

/**
 * Determines which in-app install CTA state should render.
 * Automatically hides when already installed in standalone mode.
 */
export function resolvePwaInstallAction(params: {
  isInstalled: boolean;
  hasDeferredPrompt: boolean;
  isIOS: boolean;
}): PwaInstallAction {
  if (params.isInstalled) return 'hidden';
  if (params.hasDeferredPrompt) return 'prompt';
  if (params.isIOS) return 'ios_guide';
  return 'hidden';
}

export const PWA_MANIFEST_CONFIG = {
  id: '/',
  name: "Arham's Adventure — Balap Kuis SD",
  short_name: "Arham's Adv",
  description:
    'Game balap halang rintang 3D seru dengan kuis pelajaran SD Kelas 1–6 yang bisa dipasang dan dimainkan offline.',
  theme_color: '#2563eb',
  background_color: '#5ec5f7',
  display: 'standalone' as const,
  start_url: '/',
  scope: '/',
  icons: [
    {
      src: '/pwa-192x192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/pwa-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/pwa-maskable-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
};
