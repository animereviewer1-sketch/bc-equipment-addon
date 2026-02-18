/**
 * BCAES – Bookmarklet-Loader
 * 
 * Dieses Script wird als Bookmarklet in den Browser eingefügt.
 * Es lädt zuerst FUSAM (falls noch nicht vorhanden), dann das Addon.
 * 
 * ─── VERWENDUNG ────────────────────────────────────────────
 * 
 * Option A: Bookmarklet (empfohlen)
 *   1. Kopiere den Inhalt von "bookmarklet.min.js"
 *   2. Erstelle ein neues Browser-Lesezeichen
 *   3. Als URL einfügen → Bookmarklet ist einsatzbereit
 *   4. In BC aufrufen → Addon startet automatisch
 * 
 * Option B: Manuell in der Browser-Konsole ausführen
 *   Kopiere den Code und paste ihn in die DevTools-Konsole.
 * 
 * ────────────────────────────────────────────────────────────
 */

// ── Haupt-Loader-Funktion ─────────────────────────────────
(function BCAES_LOADER() {
  "use strict";

  /**
   * WICHTIG: Ersetze diese URL mit deinem eigenen Hosting-Pfad
   * (z.B. GitHub Pages, eigener Webserver, GitLab Pages etc.)
   */
  const ADDON_BASE_URL = "https://github.com/animereviewer1-sketch/bc-equipment-addon";

  const FUSAM_URL = "https://sidiousious.gitlab.io/bc-addon-loader/fusam.js";

  function loadScript(src, isModule = false) {
    return new Promise((resolve, reject) => {
      const s   = document.createElement("script");
      s.src     = src + "?_=" + Date.now();
      if (isModule) s.type = "module";
      s.onload  = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function bootstrap() {
    // 1. FUSAM laden (falls nicht vorhanden)
    if (window.FUSAM === undefined) {
      console.log("[BCAES] Lade FUSAM …");
      await loadScript(FUSAM_URL, true);
      await new Promise(r => setTimeout(r, 800));
    }

    // 2. Addon-Modul laden
    console.log("[BCAES] Lade Addon …");
    await loadScript(`${ADDON_BASE_URL}/index.js`, true);
  }

  bootstrap().catch(e => {
    console.error("[BCAES] Fehler beim Laden:", e);
    alert("[BCAES] Fehler beim Laden – Details in der Konsole.");
  });
})();
