// The header's store retarget and platform menu. An ES module the shared header
// (siteNav in edge/src/site-nav.ts) loads on every page:
//   <script type="module" src="site/assets/nav-store.js?v=3"></script>
//
//   - On a phone or tablet (detectPlatform().os of ios/android) the header
//     pill `.sb-nav .sb-btn[href$="/download"]` keeps its /download href and
//     reads 'Get superbot', with no store mark: there is no App Store or Play
//     listing yet (2026-09-23), and /download says the phone apps are coming.
//   - On a Mac it reads 'Install for macOS' with the apple mark in front, the
//     same href. Windows and Linux keep 'Install Now' and no mark: there is no
//     desktop build for them yet, so the pill must not promise one.
//   - The platform menu is the chevron half of the split control (site.css
//     .sb-split): a native popover, so the chevron has no click handler here.
//     This module mirrors the popover's state into aria-expanded, places the
//     menu under the chevron where CSS anchor positioning is missing, and
//     returns focus to the chevron when the menu closes with focus lost.
//   - No-op whenever nothing matches: no pill, no OS, an unknown platform, a
//     coarse pointer without a mobile UA token. Never throws.
//
// The mark sits inside the pill behind the site.css shared recipe
// (.sb-btn .sb-os-mark), left of the label with the button's own
// var(--sp-2) gap.

import { detectPlatform, osMark } from './os-detect.js?v=2';

(function () {
  try {
    // An open beta host serves a visitor without a grant the sign-up or
    // invite-code entry in the pill's slot (edge siteNav `access`), whose href
    // also ends in /download, and marks it data-access (the lander marks
    // <body> too). Leave it exactly as served. Absent or "granted": today's
    // retarget.
    const pill = document.querySelector('.sb-nav .sb-btn[href$="/download"]');
    if (!pill) return;
    const access = pill.dataset.access || (document.body && document.body.dataset.access);
    if (access && access !== 'granted') return;
    const { os, mobile } = detectPlatformSafe();

    // a phone or tablet: same /download href, an honest label, no store mark
    if (mobile && (os === 'ios' || os === 'android')) {
      pill.textContent = 'Get superbot';
      return;
    }

    // a Mac: same href, the label names the platform and the apple mark leads it
    if (os !== 'mac' || mobile) return;
    if (pill.querySelector('.sb-os-mark')) return; // already marked
    const mark = osMark(os, 16);
    if (!mark) return;
    pill.textContent = 'Install for macOS';
    pill.insertAdjacentHTML('afterbegin', `<span class="sb-os-mark">${mark}</span>`);
  } catch {
    // a missing header, an odd DOM shape, anything — the page stands as served
  }

  function detectPlatformSafe() {
    try { return detectPlatform(); } catch { return { os: null, mobile: false, label: null }; }
  }
})();

// The platform menu (site.css .sb-split, site-nav.ts platformMenu). The browser
// owns open, light dismiss and Escape through popovertarget; this block only
// keeps aria-expanded true to the popover's state and, where CSS anchor
// positioning is missing, places the menu under the chevron (8px below it, the
// --sp-2 token, right edges aligned). Focus that the menu drops when it closes
// with the focus lost (Escape in a browser that does not restore it) goes back
// to the chevron. Never throws.
(function () {
  try {
    const menu = document.getElementById('sb-platforms');
    const chevron = document.querySelector('.sb-split-chev');
    if (!menu || !chevron || typeof menu.showPopover !== 'function') return;
    const anchored = typeof CSS !== 'undefined' && !!CSS.supports && CSS.supports('anchor-name', '--sb-probe');
    let focusInside = false;

    const isOpen = () => menu.matches(':popover-open');

    // the rects are visual pixels; the menu's own offsets are in CSS pixels of a
    // page that may carry the root zoom tier (site.css html zoom). zoom is not
    // inherited, so the effective factor is the product up the ancestor chain
    const zoomOf = (el) => {
      let z = 1;
      for (let n = el; n; n = n.parentElement) z *= parseFloat(getComputedStyle(n).zoom) || 1;
      return z;
    };
    const place = () => {
      const r = chevron.getBoundingClientRect();
      const z = zoomOf(menu);
      const gap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sp-2')) || 0;
      menu.style.top = `${r.bottom / z + gap}px`;
      menu.style.right = `${(window.innerWidth - r.right) / z}px`;
    };

    menu.addEventListener('focusin', () => { focusInside = true; });
    menu.addEventListener('toggle', () => {
      const open = isOpen();
      chevron.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) {
        focusInside = false;
        if (!anchored) place();
        return;
      }
      const at = document.activeElement;
      if (focusInside && (!at || at === document.body)) chevron.focus({ preventScroll: true });
      focusInside = false;
    });
    if (!anchored) {
      window.addEventListener('resize', () => { if (isOpen()) place(); });
    }
  } catch {
    // a page without the split control, or a browser without the popover: the
    // chevron is then inert and the primary link still works
  }
})();
