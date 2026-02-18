/**
 * Store.js
 * Persistenter Konfigurations-Speicher via localStorage.
 * Unterstützt verschachtelte Keys und Migrations-Versionen.
 */

export class Store {
  constructor(addonId) {
    this._key     = `BCAES_${addonId}`;
    this._data    = this._load();
    this._version = 1;
    this._migrate();
  }

  // ── Interne Methoden ──────────────────────────────────────

  _load() {
    try {
      const raw = localStorage.getItem(this._key);
      return raw ? JSON.parse(raw) : this._defaults();
    } catch {
      return this._defaults();
    }
  }

  _defaults() {
    return {
      version:  1,
      outfits:  {},   // { [name]: OutfitConfig }
      settings: {
        autoApplyOnLogin: false,
        defaultOutfit:    null,
        showAssetInfo:    true,
        scanOnStartup:    true,
      },
    };
  }

  _migrate() {
    if (!this._data.version || this._data.version < this._version) {
      // zukünftige Migrations-Logik hier
      this._data.version = this._version;
      this.save();
    }
  }

  save() {
    try {
      localStorage.setItem(this._key, JSON.stringify(this._data));
    } catch (e) {
      console.error("[Store] Speichern fehlgeschlagen:", e);
    }
  }

  // ── Outfit-API ───────────────────────────────────────────

  /** Alle gespeicherten Outfit-Namen */
  getOutfitNames() {
    return Object.keys(this._data.outfits);
  }

  /** Outfit laden */
  getOutfit(name) {
    return structuredClone(this._data.outfits[name] ?? null);
  }

  /** Outfit speichern */
  saveOutfit(name, outfitConfig) {
    if (!name?.trim()) throw new Error("Outfit-Name darf nicht leer sein.");
    this._data.outfits[name] = { ...outfitConfig, savedAt: Date.now() };
    this.save();
  }

  /** Outfit umbenennen */
  renameOutfit(oldName, newName) {
    if (!this._data.outfits[oldName]) throw new Error(`Outfit "${oldName}" nicht gefunden.`);
    if (this._data.outfits[newName]) throw new Error(`Outfit "${newName}" existiert bereits.`);
    this._data.outfits[newName] = this._data.outfits[oldName];
    delete this._data.outfits[oldName];
    this.save();
  }

  /** Outfit löschen */
  deleteOutfit(name) {
    delete this._data.outfits[name];
    this.save();
  }

  // ── Einstellungen-API ────────────────────────────────────

  getSetting(key) {
    return this._data.settings[key];
  }

  setSetting(key, value) {
    this._data.settings[key] = value;
    this.save();
  }

  getSettings() {
    return structuredClone(this._data.settings);
  }

  // ── Import / Export ──────────────────────────────────────

  exportJSON() {
    return JSON.stringify(this._data, null, 2);
  }

  importJSON(json) {
    const parsed = JSON.parse(json);
    if (typeof parsed !== "object" || !parsed.outfits) {
      throw new Error("Ungültiges BCAES-Format.");
    }
    // Merge statt Ersetzen (vorhandene Outfits bleiben erhalten)
    Object.assign(this._data.outfits, parsed.outfits ?? {});
    Object.assign(this._data.settings, parsed.settings ?? {});
    this.save();
  }

  reset() {
    this._data = this._defaults();
    this.save();
  }
}
