/**
 * AssetScanner.js
 * Scannt alle verfügbaren BC-Assets und stellt Such-/Filter-Funktionen bereit.
 */

export class AssetScanner {
  constructor() {
    /** @type {Map<string, Asset[]>} Group -> Assets */
    this._byGroup = new Map();
    /** @type {Map<string, Asset>}   "Group/Name" -> Asset */
    this._byKey   = new Map();
    /** @type {string[]} Alle Gruppen */
    this.groups   = [];

    this.scan();
  }

  // ── Haupt-Scan ────────────────────────────────────────────
  scan() {
    this._byGroup.clear();
    this._byKey.clear();
    this.groups = [];

    if (!window.AssetGroup) {
      console.warn("[AssetScanner] AssetGroup nicht gefunden – zu früh aufgerufen?");
      return;
    }

    for (const group of window.AssetGroup) {
      const assets = [];
      this._byGroup.set(group.Name, assets);
      this.groups.push(group.Name);

      for (const asset of group.Asset) {
        assets.push(asset);
        this._byKey.set(`${group.Name}/${asset.Name}`, asset);
      }
    }

    console.log(`[AssetScanner] ${this._byKey.size} Assets in ${this.groups.length} Gruppen gescannt.`);
  }

  // ── Abfrage-Methoden ─────────────────────────────────────

  /** Gibt alle Assets einer Gruppe zurück */
  getGroup(groupName) {
    return this._byGroup.get(groupName) ?? [];
  }

  /** Gibt ein einzelnes Asset zurück */
  getAsset(groupName, assetName) {
    return this._byKey.get(`${groupName}/${assetName}`) ?? null;
  }

  /** Suche nach Name (case-insensitive) */
  search(query, groupFilter = null) {
    const q = query.toLowerCase();
    const results = [];

    for (const [key, asset] of this._byKey) {
      const [group] = key.split("/");
      if (groupFilter && group !== groupFilter) continue;
      if (asset.Name.toLowerCase().includes(q) ||
          (asset.Description ?? "").toLowerCase().includes(q)) {
        results.push({ group, asset });
      }
    }
    return results;
  }

  /** Alle Assets mit Extended-Item-Support */
  getExtendedAssets(groupFilter = null) {
    return this.search("", groupFilter)
      .filter(({ asset }) => asset.Archetype || asset.Extended);
  }

  /** Assets die Locks unterstützen */
  getLockableAssets(groupFilter = null) {
    return this.search("", groupFilter)
      .filter(({ asset }) => asset.AllowLock !== false);
  }

  /** Alle verfügbaren Extended-Typen eines Assets */
  getAssetTypes(groupName, assetName) {
    const asset = this.getAsset(groupName, assetName);
    if (!asset) return [];

    // BC speichert Extended-Optionen unterschiedlich je nach Archetype
    if (asset.Archetype === "typed" || asset.Extended) {
      const key    = `${groupName}${assetName}`;
      const config = window[key] ?? window[`${assetName}`];
      if (config?.Options) return config.Options.map(o => o.Name ?? o.Value ?? o);
    }
    return [];
  }

  /** Erlaubte Farben eines Assets */
  getAssetColors(groupName, assetName) {
    const asset = this.getAsset(groupName, assetName);
    if (!asset) return [];
    return asset.Color ?? [];
  }

  /** Vollständige Asset-Info als plain Object */
  describe(groupName, assetName) {
    const asset = this.getAsset(groupName, assetName);
    if (!asset) return null;
    return {
      name:        asset.Name,
      group:       groupName,
      description: asset.Description ?? "",
      archetype:   asset.Archetype ?? null,
      extended:    !!asset.Extended,
      lockable:    asset.AllowLock !== false,
      types:       this.getAssetTypes(groupName, assetName),
      colors:      this.getAssetColors(groupName, assetName),
      layers:      (asset.Layer ?? []).length,
    };
  }

  /** Dump aller Gruppen als Array für UI-Listen */
  dumpGroups() {
    return this.groups.map(g => ({
      name:  g,
      count: this._byGroup.get(g)?.length ?? 0,
    }));
  }

  /** Dump aller Assets einer Gruppe */
  dumpGroup(groupName) {
    return (this._byGroup.get(groupName) ?? []).map(a =>
      this.describe(groupName, a.Name)
    );
  }
}
