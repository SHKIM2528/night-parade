const REAL_SCROLL_SOURCE = 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Hyakki_Yako_no_Zu_by_Tosa_Mitsuoki-_left_half.jpg/3840px-Hyakki_Yako_no_Zu_by_Tosa_Mitsuoki-_left_half.jpg';
const PLACEHOLDER_PATTERN = /tosa_mitsuoki_hyakki_yako_(?:all_1400|right_3000)\.jpg(?:[?#].*)?$/i;

window.__NIGHT_PARADE_SCROLL_SOURCE__ = REAL_SCROLL_SOURCE;

// Gate 02 V02 accidentally shipped generated oval placeholders instead of the artwork.
// Rewrite only those two placeholder image requests before unroll.js uploads them to WebGL.
try {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
  if (descriptor?.get && descriptor?.set && descriptor.configurable) {
    Object.defineProperty(HTMLImageElement.prototype, 'src', {
      configurable: true,
      enumerable: descriptor.enumerable,
      get: descriptor.get,
      set(value) {
        const requested = String(value ?? '');
        if (PLACEHOLDER_PATTERN.test(requested)) {
          this.crossOrigin = 'anonymous';
          this.referrerPolicy = 'no-referrer';
          descriptor.set.call(this, REAL_SCROLL_SOURCE);
          return;
        }
        descriptor.set.call(this, value);
      },
    });
  }
} catch (error) {
  console.error('NIGHT PARADE: failed to install real-scroll source rewrite.', error);
}

// Start the request before the UNROLL renderer asks for it so the browser cache is warm.
const preload = new Image();
preload.crossOrigin = 'anonymous';
preload.referrerPolicy = 'no-referrer';
preload.src = REAL_SCROLL_SOURCE;

const buildTag = document.querySelector('.build-tag');
const rewriteVersion = () => {
  if (!buildTag) return;
  buildTag.textContent = buildTag.textContent
    .replace('GATE 02 · V02', 'GATE 02 · V03')
    .replace('HERO-CUTOUT', 'REAL-SCROLL');
};
rewriteVersion();
if (buildTag) new MutationObserver(rewriteVersion).observe(buildTag, { childList: true, characterData: true, subtree: true });
