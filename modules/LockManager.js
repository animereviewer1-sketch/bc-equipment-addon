/**
 * LockManager.js
 * Verwaltet alle BC-Schloss-Typen und wendet sie auf Items an.
 *
 * Unterstützte Locks:
 *   - Padlock             (normales Schloss)
 *   - CombinationPadlock  (4-stelliger Code)
 *   - TimerPadlock        (Zeit-basiert)
 *   - PasswordPadlock     (Passwort)
 *   - OwnerPadlock        (Owner-only)
 *   - LoversPadlock       (Liebhaber-only)
 *   - MistressPadlock     (Mistress-only)
 *   - HighSecurityPadlock (Mehrfach-Verifizierung)
 *   - MetalPadlock        (kein Schlüssel-Hinweis)
 *   - LoversTimerPadlock  (Liebhaber-Timer)
 */

export const LOCK_DEFINITIONS = {
  None: {
    label:       "Kein Schloss",
    asset:       null,
    properties:  {},
    configFields: [],
  },
  Padlock: {
    label:       "Padlock",
    asset:       "Padlock",
    group:       "ItemMisc",
    properties:  { LockedBy: "Padlock" },
    configFields: [],
  },
  CombinationPadlock: {
    label:       "Kombinationsschloss",
    asset:       "CombinationPadlock",
    group:       "ItemMisc",
    properties:  { LockedBy: "CombinationPadlock", CombinationNumber: "0000" },
    configFields: [
      { key: "CombinationNumber", label: "Code (4 Ziffern)", type: "text", pattern: "\\d{4}", default: "0000" },
    ],
  },
  TimerPadlock: {
    label:       "Timer-Schloss",
    asset:       "TimerPadlock",
    group:       "ItemMisc",
    properties:  { LockedBy: "TimerPadlock", RemoveTimer: 3600 },
    configFields: [
      { key: "RemoveTimer", label: "Dauer (Sekunden)", type: "number", min: 60, max: 86400, default: 3600 },
    ],
  },
  PasswordPadlock: {
    label:       "Passwort-Schloss",
    asset:       "PasswordPadlock",
    group:       "ItemMisc",
    properties:  { LockedBy: "PasswordPadlock", Password: "" },
    configFields: [
      { key: "Password", label: "Passwort", type: "text", default: "" },
    ],
  },
  OwnerPadlock: {
    label:       "Owner-Schloss",
    asset:       "OwnerPadlock",
    group:       "ItemMisc",
    properties:  { LockedBy: "OwnerPadlock" },
    configFields: [],
  },
  LoversPadlock: {
    label:       "Liebhaber-Schloss",
    asset:       "LoversPadlock",
    group:       "ItemMisc",
    properties:  { LockedBy: "LoversPadlock" },
    configFields: [],
  },
  MistressPadlock: {
    label:       "Mistress-Schloss",
    asset:       "MistressPadlock",
    group:       "ItemMisc",
    properties:  { LockedBy: "MistressPadlock" },
    configFields: [],
  },
  HighSecurityPadlock: {
    label:       "Hochsicherheits-Schloss",
    asset:       "HighSecurityPadlock",
    group:       "ItemMisc",
    properties:  { LockedBy: "HighSecurityPadlock", MemberNumberListKeys: "" },
    configFields: [
      { key: "MemberNumberListKeys", label: "Schlüsselhalter (Mitglieds-Nrn, komma-getrennt)", type: "text", default: "" },
    ],
  },
  MetalPadlock: {
    label:       "Metall-Schloss",
    asset:       "MetalPadlock",
    group:       "ItemMisc",
    properties:  { LockedBy: "MetalPadlock" },
    configFields: [],
  },
  LoversTimerPadlock: {
    label:       "Liebhaber-Timer-Schloss",
    asset:       "LoversTimerPadlock",
    group:       "ItemMisc",
    properties:  { LockedBy: "LoversTimerPadlock", RemoveTimer: 3600 },
    configFields: [
      { key: "RemoveTimer", label: "Dauer (Sekunden)", type: "number", min: 60, max: 86400, default: 3600 },
    ],
  },
};

export class LockManager {
  /** Alle verfügbaren Lock-Typen */
  getLockTypes() {
    return Object.entries(LOCK_DEFINITIONS).map(([id, def]) => ({
      id,
      label:        def.label,
      configFields: def.configFields,
    }));
  }

  /** Erstellt ein Lock-Config-Objekt mit Defaults */
  createLockConfig(lockType = "None", overrides = {}) {
    const def = LOCK_DEFINITIONS[lockType];
    if (!def) throw new Error(`Unbekannter Lock-Typ: ${lockType}`);

    const config = { type: lockType };
    for (const field of def.configFields) {
      config[field.key] = overrides[field.key] ?? field.default;
    }
    return config;
  }

  /**
   * Wendet einen Lock auf ein Appearance-Item an.
   * @param {Object} appearanceItem  - das Item aus Character.Appearance
   * @param {Object} lockConfig      - { type, ...fieldValues }
   * @param {Character} locker       - der sperrende Character (für Besitzer-Tracking)
   */
  applyLock(appearanceItem, lockConfig, locker = null) {
    if (!appearanceItem || lockConfig.type === "None") return;

    const def = LOCK_DEFINITIONS[lockConfig.type];
    if (!def || !def.properties) return;

    // Property-Objekt vorbereiten
    if (!appearanceItem.Property) appearanceItem.Property = {};

    // Basis-Properties des Locks
    Object.assign(appearanceItem.Property, def.properties);

    // Konfigurierbare Felder übernehmen
    for (const field of def.configFields) {
      if (lockConfig[field.key] !== undefined) {
        appearanceItem.Property[field.key] = lockConfig[field.key];
      }
    }

    // Timer: aktuellen Timestamp addieren
    if (lockConfig.type === "TimerPadlock" || lockConfig.type === "LoversTimerPadlock") {
      appearanceItem.Property.RemoveTimer = Math.round(Date.now() / 1000) + (lockConfig.RemoveTimer ?? 3600);
    }

    // Besitzer-Tracking
    if (locker) {
      appearanceItem.Property.LockMemberNumber = locker.MemberNumber;
    }

    // Lock-Asset dem Item hinzufügen (BC-Konvention)
    if (!appearanceItem.Property.Lock) {
      appearanceItem.Property.Lock = def.properties.LockedBy ?? "";
    }
  }

  /** Entfernt den Lock von einem Appearance-Item */
  removeLock(appearanceItem) {
    if (!appearanceItem?.Property) return;
    const props = appearanceItem.Property;
    delete props.LockedBy;
    delete props.LockMemberNumber;
    delete props.CombinationNumber;
    delete props.Password;
    delete props.RemoveTimer;
    delete props.MemberNumberListKeys;
    delete props.Lock;
  }

  /** Prüft ob ein Item gesperrt ist */
  isLocked(appearanceItem) {
    return !!appearanceItem?.Property?.LockedBy;
  }
}
