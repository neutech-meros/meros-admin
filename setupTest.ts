import '@testing-library/jest-dom';
import '@/i18n';

// jsdom doesn't implement ResizeObserver, but cmdk (used by the shadcn Command
// component) instantiates one on mount to track list height. Without this stub,
// any test that renders a Command/CommandDialog throws "ResizeObserver is not
// defined" from inside a passive effect. This is a jsdom environment gap, not a
// component behavior change — the real browser always has ResizeObserver.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// jsdom also doesn't implement Element.scrollIntoView, which cmdk calls to keep
// the selected command item visible. Same category of jsdom gap as above.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {};
}
