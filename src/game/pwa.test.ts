import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isIosDevice,
  isStandalonePwa,
  PWA_MANIFEST_CONFIG,
  resolvePwaInstallAction,
} from './pwa';

test('isStandalonePwa detects matchMedia standalone and iOS navigator.standalone', () => {
  assert.equal(
    isStandalonePwa({ displayModeStandalone: true, userAgent: 'Mozilla/5.0' }),
    true,
  );
  assert.equal(
    isStandalonePwa({
      displayModeStandalone: false,
      navigatorStandalone: true,
      userAgent: 'iPhone',
    }),
    true,
  );
  assert.equal(
    isStandalonePwa({
      displayModeStandalone: false,
      navigatorStandalone: false,
      userAgent: 'Mozilla/5.0',
    }),
    false,
  );
});

test('isIosDevice detects iPhone, iPad, iPod, and touch-enabled iPadOS Macintosh UAs', () => {
  assert.equal(isIosDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'), true);
  assert.equal(isIosDevice('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)'), true);
  assert.equal(isIosDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5), true);
  assert.equal(isIosDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0), false);
  assert.equal(isIosDevice('Mozilla/5.0 (Linux; Android 14; Pixel 8)', 5), false);
});

test('resolvePwaInstallAction suppresses CTA when installed and picks prompt vs ios_guide', () => {
  assert.equal(
    resolvePwaInstallAction({ isInstalled: true, hasDeferredPrompt: true, isIOS: false }),
    'hidden',
  );
  assert.equal(
    resolvePwaInstallAction({ isInstalled: true, hasDeferredPrompt: false, isIOS: true }),
    'hidden',
  );
  assert.equal(
    resolvePwaInstallAction({ isInstalled: false, hasDeferredPrompt: true, isIOS: false }),
    'prompt',
  );
  assert.equal(
    resolvePwaInstallAction({ isInstalled: false, hasDeferredPrompt: false, isIOS: true }),
    'ios_guide',
  );
  assert.equal(
    resolvePwaInstallAction({ isInstalled: false, hasDeferredPrompt: false, isIOS: false }),
    'hidden',
  );
});

test('PWA_MANIFEST_CONFIG satisfies installability standards (short_name <= 12 chars, separate any & maskable icons)', () => {
  assert.equal(PWA_MANIFEST_CONFIG.id, '/');
  assert.equal(PWA_MANIFEST_CONFIG.start_url, '/');
  assert.equal(PWA_MANIFEST_CONFIG.scope, '/');
  assert.equal(PWA_MANIFEST_CONFIG.display, 'standalone');
  assert.ok(
    PWA_MANIFEST_CONFIG.short_name.length <= 12,
    `short_name "${PWA_MANIFEST_CONFIG.short_name}" must be <= 12 chars`,
  );

  const any192 = PWA_MANIFEST_CONFIG.icons.find(
    (i) => i.sizes === '192x192' && i.purpose === 'any',
  );
  const any512 = PWA_MANIFEST_CONFIG.icons.find(
    (i) => i.sizes === '512x512' && i.purpose === 'any',
  );
  const maskable512 = PWA_MANIFEST_CONFIG.icons.find(
    (i) => i.sizes === '512x512' && i.purpose === 'maskable',
  );
  assert.ok(any192, 'must include 192x192 any PNG icon');
  assert.ok(any512, 'must include 512x512 any PNG icon');
  assert.ok(maskable512, 'must include 512x512 maskable PNG icon');
  assert.ok(
    PWA_MANIFEST_CONFIG.icons.every((i) => i.purpose !== 'any maskable'),
    'never combine any and maskable on the same icon entry',
  );
});
