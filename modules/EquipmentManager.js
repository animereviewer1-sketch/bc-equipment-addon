/**
 * EquipmentManager.js
 * Kern-System zum Anlegen, Speichern und Anwenden von Ausrüstungs-Sets (Outfits).
 *
 * Outfit-Config-Format:
 * {
 *   name:        string,
 *   description: string,
 *   items: [
 *     {
 *       group:    string,          // BC-Gruppe z.B. "ItemArms"
 *       asset:    string,          // Asset-Name z.B. "HempRope"
 *       color:    string|string[], // Farbe(n)
 *       type:     string|null,     // Extended-Typ
 *       property: Object,          // zusätzliche Properties
 *       lock:     {                // Lock-Konfiguration
 *         type:   string,          // LockManager-Typ
 *         ...fields
 *       }
 *     }
 *   ]
 * }
 */

export class EquipmentManager {
  constructor(store, scanner, lockMgr) {
    this._store   = store;
    this._scanner = scanner;
    this._lockMgr = lockMgr;
  }

  // ── Outfit erstellen / bearbeiten ────────────────────────

  /**
   * Leeres Outfit-Template
   */
  createOutfit(name = "Neues Outfit", description = "") {
    return { name, description, items: [] };
  }

  /**
   * Fügt ein Item zur Outfit-Config hinzu
   */
  addItem(outfitConfig, itemConfig) {
    const { group, asset } = itemConfig;
    if (!this._scanner.getAsset(group, asset)) {
      throw new Error(`Asset nicht gefunden: ${group}/${asset}`);
    }
    // Doppelungen in gleicher Gruppe entfernen (BC: 1 Item pro Gruppe)
    outfitConfig.items = outfitConfig.items.filter(i => i.group !== group);
    outfitConfig.items.push({
      group,
      asset,
      color:    itemConfig.color    ?? null,
      type:     itemConfig.type     ?? null,
      property: itemConfig.property ?? {},
      lock:     itemConfig.lock     ?? { type: "None" },
    });
  }

  /** Item aus Outfit entfernen */
  removeItem(outfitConfig, groupName) {
    outfitConfig.items = outfitConfig.items.filter(i => i.group !== groupName);
  }

  /** Outfit in Store speichern */
  saveOutfit(outfitConfig) {
    this._store.saveOutfit(outfitConfig.name, outfitConfig);
  }

  // ── Capture – Aktuelles Outfit vom Character lesen ───────

  /**
   * Liest das aktuelle Outfit eines Characters und erstellt eine Outfit-Config.
   * @param {Character} character
   * @param {string}    name        - Name des neuen Outfits
   * @param {boolean}   includeLocks - ob Lock-States mitgenommen werden
   */
  captureFromCharacter(character, name = "Gescanntes Outfit", includeLocks = true) {
    const outfit = this.createOutfit(name);

    for (const item of character.Appearance) {
      if (!item.Asset) continue;

      const itemCfg = {
        group:    item.Asset.Group?.Name ?? item.Asset.Group,
        asset:    item.Asset.Name,
        color:    Array.isArray(item.Color)
                    ? [...item.Color]
                    : (item.Color ?? null),
        type:     item.Property?.Type ?? null,
        property: { ...(item.Property ?? {}) },
        lock:     { type: "None" },
      };

      // Lock-State übernehmen
      if (includeLocks && item.Property?.LockedBy) {
        itemCfg.lock = {
          type:               item.Property.LockedBy,
          CombinationNumber:  item.Property.CombinationNumber,
          Password:           item.Property.Password,
          RemoveTimer:        item.Property.RemoveTimer,
          MemberNumberListKeys: item.Property.MemberNumberListKeys,
        };
      }

      outfit.items.push(itemCfg);
    }

    return outfit;
  }

  // ── Apply – Outfit auf Character anwenden ────────────────

  /**
   * Wendet ein gespeichertes Outfit auf einen Character an.
   * @param {Character} character
   * @param {string|Object} outfitOrName - Outfit-Name oder Outfit-Config-Objekt
   * @param {Object}  options
   * @param {boolean} options.stripFirst     - alle Items vorher entfernen
   * @param {boolean} options.applyLocks     - Locks anwenden
   * @param {string}  options.targetGroups   - nur bestimmte Gruppen anwenden
   */
  applyOutfit(character, outfitOrName, options = {}) {
    const {
      stripFirst   = true,
      applyLocks   = true,
      targetGroups = null,
    } = options;

    const outfit = typeof outfitOrName === "string"
      ? this._store.getOutfit(outfitOrName)
      : outfitOrName;

    if (!outfit) throw new Error(`Outfit "${outfitOrName}" nicht gefunden.`);

    // Optional: Zuerst alles ausziehen
    if (stripFirst) {
      this._stripCharacter(character, targetGroups);
    }

    const errors = [];
    for (const itemCfg of outfit.items) {
      if (targetGroups && !targetGroups.includes(itemCfg.group)) continue;

      try {
        this._applyItem(character, itemCfg, applyLocks);
      } catch (e) {
        errors.push(`${itemCfg.group}/${itemCfg.asset}: ${e.message}`);
      }
    }

    // BC neu rendern
    CharacterRefresh(character);

    if (errors.length) {
      console.warn("[EquipmentManager] Fehler beim Anwenden:", errors);
    }

    return { applied: outfit.items.length - errors.length, errors };
  }

  /** Einzelnes Item anlegen – nutzt InventoryWear (korrekte BC-API) */
  _applyItem(character, itemCfg, applyLocks) {
    const asset = this._scanner.getAsset(itemCfg.group, itemCfg.asset);
    if (!asset) throw new Error(`Asset ${itemCfg.group}/${itemCfg.asset} nicht gefunden.`);

    let color = itemCfg.color ?? "Default";
    if (typeof color === "string" && color.startsWith("[")) {
      try { color = JSON.parse(color); } catch { color = "Default"; }
    }

    const difficulty = itemCfg.property?.Difficulty ?? 0;

    // InventoryWear ist die korrekte öffentliche BC-Funktion
    if (typeof InventoryWear === "function") {
      InventoryWear(character, itemCfg.asset, itemCfg.group, color, difficulty, null, null, false);
    } else {
      // Fallback: direkt im Appearance-Array setzen
      const existing = character.Appearance.findIndex(
        a => (a.Asset?.Group?.Name ?? a.Asset?.Group) === itemCfg.group
      );
      const entry = { Asset: asset, Color: color, Property: {} };
      if (existing >= 0) character.Appearance[existing] = entry;
      else               character.Appearance.push(entry);
    }

    const appItem = character.Appearance.find(
      a => a.Asset?.Name === itemCfg.asset &&
           (a.Asset?.Group?.Name ?? a.Asset?.Group) === itemCfg.group
    );
    if (!appItem) return;

    if (!appItem.Property) appItem.Property = {};

    if (itemCfg.type) appItem.Property.Type = itemCfg.type;

    if (itemCfg.property) {
      const safeProps = { ...itemCfg.property };
      delete safeProps.LockedBy; delete safeProps.Lock; delete safeProps.LockMemberNumber;
      Object.assign(appItem.Property, safeProps);
    }

    if (Array.isArray(itemCfg.effects) && itemCfg.effects.length) {
      appItem.Property.Effect = itemCfg.effects;
    }

    if (applyLocks && itemCfg.lock?.type && itemCfg.lock.type !== "None") {
      this._lockMgr.applyLock(appItem, itemCfg.lock, Player);
    }
  }

  /** Alles von einem Character entfernen */
  _stripCharacter(character, groupFilter = null) {
    const groups = groupFilter
      ? this._scanner.groups.filter(g => groupFilter.includes(g))
      : this._scanner.groups;

    for (const group of groups) {
      if (typeof InventoryRemove === "function") {
        InventoryRemove(character, group, false);
      } else {
        character.Appearance = character.Appearance.filter(
          a => (a.Asset?.Group?.Name ?? a.Asset?.Group) !== group
        );
      }
    }
  }

  // ── Diff – Unterschiede zwischen zwei Outfits ────────────

  /**
   * Gibt zurück welche Items sich unterscheiden.
   */
  diffOutfits(outfitA, outfitB) {
    const mapA = Object.fromEntries(outfitA.items.map(i => [i.group, i]));
    const mapB = Object.fromEntries(outfitB.items.map(i => [i.group, i]));
    const allGroups = new Set([...Object.keys(mapA), ...Object.keys(mapB)]);

    const diff = [];
    for (const g of allGroups) {
      const a = mapA[g], b = mapB[g];
      if (!a)                             diff.push({ group: g, change: "added",   item: b });
      else if (!b)                        diff.push({ group: g, change: "removed", item: a });
      else if (a.asset !== b.asset ||
               JSON.stringify(a) !== JSON.stringify(b))
                                          diff.push({ group: g, change: "changed", from: a, to: b });
    }
    return diff;
  }
}
