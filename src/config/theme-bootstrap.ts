/**
 * Inline, blocking bootstrap script injected in the document <head> (see
 * src/app/layout.tsx). Pins document.documentElement.dataset.theme from
 * localStorage synchronously, before the stylesheet paints anything — so a
 * pinned scheme never flashes the system default.
 *
 * Kept in its own module (rather than a template literal inline in the layout)
 * so it can be unit-tested via `new Function(...)` against a stubbed
 * document/localStorage — see src/config/__tests__/theme-bootstrap.test.ts.
 *
 * Must stay try/catch-wrapped: localStorage access throws in Safari private
 * browsing and when third-party storage is blocked.
 */
import { THEME_STORAGE_KEY } from './theme-storage-key';

export const THEME_BOOTSTRAP = `(()=>{try{
var p=localStorage.getItem('${THEME_STORAGE_KEY}');
if(p==='light'||p==='dark'){
  document.documentElement.dataset.theme=p;
  var m=document.querySelector('meta[name="color-scheme"]');
  if(m)m.content=p;
}}catch(e){}})();`;
