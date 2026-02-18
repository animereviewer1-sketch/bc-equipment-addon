/**
 * BCHooks.js
 * Registriert Hooks in BC-Spielfunktionen für automatische Ereignis-Reaktion.
 */

export class BCHooks {
  constructor(equipMgr, store) {
    this._equipMgr = equipMgr;
    this._store    = store;
    this._originals = {};
  }

  register() {
    this._hookLoginComplete();
    console.log("[BCHooks] Hooks registriert.");
  }

  unregister() {
    for (const [name, orig] of Object.entries(this._originals)) {
      window[name] = orig;
    }
    this._originals = {};
    console.log("[BCHooks] Hooks entfernt.");
  }

  // ── Hook: nach dem Login ──────────────────────────────────

  _hookLoginComplete() {
    const self = this;
    const origFn = window.LoginResponse ?? null;

    if (!origFn) return; // BC-Version ohne diese Funktion

    this._originals["LoginResponse"] = origFn;

    window.LoginResponse = function(data) {
      origFn.call(this, data);
      try {
        if (self._store.getSetting("autoApplyOnLogin")) {
          const defaultOutfit = self._store.getSetting("defaultOutfit");
          if (defaultOutfit) {
            console.log(`[BCHooks] Auto-Apply Outfit "${defaultOutfit}" …`);
            self._equipMgr.applyOutfit(Player, defaultOutfit, {
              stripFirst: true,
              applyLocks: false, // Locks beim Auto-Apply deaktiviert für Sicherheit
            });
          }
        }
      } catch (e) {
        console.warn("[BCHooks] Auto-Apply fehlgeschlagen:", e);
      }
    };
  }
}
