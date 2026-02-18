/**
 * BC Asset & Equipment System (BCAES)
 * FUSAM-compatible addon for Bondage Club
 * 
 * Features:
 *  - Asset Scanner (alle verfügbaren Items, Gruppen, Typen)
 *  - Konfigurierbares Ausrüstungssystem (Outfits / Loadouts)
 *  - Lock-System (Padlock, TimerLock, OwnerLock, etc.)
 *  - Extended Item Properties (Typ, Farbe, Craft, etc.)
 *  - Import / Export via JSON
 *  - FUSAM-UI-Integration
 */

import { AssetScanner }      from "./modules/AssetScanner.js";
import { EquipmentManager }  from "./modules/EquipmentManager.js";
import { LockManager }       from "./modules/LockManager.js";
import { ConfigUI }          from "./modules/ConfigUI.js";
import { Store }             from "./modules/Store.js";
import { BCHooks }           from "./modules/BCHooks.js";

const ADDON_ID      = "BCAES";
const ADDON_VERSION = "1.0.0";

// ──────────────────────────────────────────────────────────
// Bootstrap – wird von FUSAM nach dem BC-Init aufgerufen
// ──────────────────────────────────────────────────────────
function init() {
  console.log(`[${ADDON_ID}] v${ADDON_VERSION} initialising …`);

  // Zentraler State-Store
  const store = new Store(ADDON_ID);

  // Module instanziieren
  const scanner  = new AssetScanner();
  const lockMgr  = new LockManager();
  const equipMgr = new EquipmentManager(store, scanner, lockMgr);
  const hooks    = new BCHooks(equipMgr, store);
  const ui       = new ConfigUI(ADDON_ID, store, scanner, equipMgr, lockMgr);

  // BC-Event-Hooks registrieren
  hooks.register();

  // FUSAM-Menüeintrag registrieren
  if (window.FUSAM?.registerMod) {
    window.FUSAM.registerMod({
      id:          ADDON_ID,
      name:        "Asset & Equipment System",
      version:     ADDON_VERSION,
      description: "Asset-Scanner, Outfits, Locks & Extended Properties",
      icon:        "Icons/Dress.png",
      load:        () => ui.open(),
      unload:      () => ui.close(),
    });
  }

  // Global für Debugging / externe Nutzung
  window[ADDON_ID] = { store, scanner, equipMgr, lockMgr, ui, hooks };

  console.log(`[${ADDON_ID}] ready.`);
}

// Warten bis BC vollständig geladen ist
if (document.readyState === "complete") {
  waitForBC(init);
} else {
  window.addEventListener("load", () => waitForBC(init));
}

function waitForBC(cb, tries = 0) {
  if (window.Asset && window.Player && window.CharacterAppearanceSetItem) {
    cb();
  } else if (tries < 60) {
    setTimeout(() => waitForBC(cb, tries + 1), 500);
  } else {
    console.error(`[${ADDON_ID}] BC nicht gefunden – Addon abgebrochen.`);
  }
}
