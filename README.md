# BC Asset & Equipment System (BCAES)
## Dokumentation & Einrichtungsanleitung

---

## 📁 Dateistruktur

```
bc-equipment-addon/
├── index.js                  ← Haupt-Einstiegspunkt (ES-Modul)
├── loader.js                 ← Bookmarklet-Loader
├── modules/
│   ├── AssetScanner.js       ← Asset-Scan & Such-Engine
│   ├── EquipmentManager.js   ← Outfit-Verwaltung & Anwendung
│   ├── LockManager.js        ← Lock-System
│   ├── ConfigUI.js           ← In-Game-UI
│   ├── Store.js              ← Persistenter Speicher (localStorage)
│   └── BCHooks.js            ← BC-Event-Integration
```

---

## 🚀 Einrichtung

### Schritt 1: Hosting

Da BC ES-Module nicht aus `file://` lädt, muss der Code gehostet werden:

**Option A – GitHub Pages (kostenlos, empfohlen)**
```bash
git init bc-equipment-addon
cd bc-equipment-addon
# Dateien hineinkopieren
git add .
git commit -m "Initial BCAES"
gh repo create --public bc-equipment-addon --push
# In Repo-Einstellungen → Pages → Branch "main" aktivieren
# URL wird: https://DEIN-USERNAME.github.io/bc-equipment-addon
```

**Option B – Lokaler Dev-Server (nur für Entwicklung)**
```bash
cd bc-equipment-addon
npx serve --cors -p 8080
# Dann loader.js ADDON_BASE_URL = "http://localhost:8080" setzen
```

### Schritt 2: Bookmarklet erstellen

1. `loader.js` öffnen
2. `ADDON_BASE_URL` auf deine Hosting-URL setzen
3. Den gesamten Code als Bookmarklet-URL einfügen:
   ```
   javascript:(function(){/* loader.js Inhalt hier */})();
   ```

---

## 🎮 Verwendung im Spiel

### Addon öffnen
- Bookmarklet in BC klicken, oder
- In der Konsole: `BCAES.ui.open()`

### Outfit scannen (aktuelles Outfit speichern)
1. Tab **Outfits** → "Von Charakter scannen"
2. Namen eingeben → Enter
3. Das aktuelle Outfit wird mit allen Items, Farben, Locks gespeichert

### Outfit erstellen
1. Tab **Outfits** → "Neues Outfit"
2. Name & Beschreibung eingeben
3. Items über Dropdown (Gruppe → Asset → Farbe/Typ/Lock) hinzufügen
4. "Speichern" klicken

### Outfit anwenden
1. Outfit-Karte → **▶ Anwenden**
2. Das System kleidet den Charakter komplett um

### Asset-Scanner
1. Tab **Scannner**
2. Gruppe anklicken ODER Suchbegriff eingeben
3. Filter: "Nur Extended" / "Nur Lockable"

---

## 🔒 Lock-System

| Lock-Typ | Konfigurierbar | Beschreibung |
|---|---|---|
| `None` | – | Kein Schloss |
| `Padlock` | – | Standard-Schloss |
| `CombinationPadlock` | Code (4 Ziffern) | Kombinations-Schloss |
| `TimerPadlock` | Dauer (Sekunden) | Zeitgesteuertes Schloss |
| `PasswordPadlock` | Passwort | Passwort-Schloss |
| `OwnerPadlock` | – | Nur vom Owner lösbar |
| `LoversPadlock` | – | Nur von Liebhabern lösbar |
| `MistressPadlock` | – | Nur von der Mistress lösbar |
| `HighSecurityPadlock` | Schlüsselhalter-Nrn | Mehrfach-Verifizierung |
| `MetalPadlock` | – | Kein Schlüssel-Hinweis |
| `LoversTimerPadlock` | Dauer (Sekunden) | Liebhaber-Timer |

---

## 🔧 Programmatische Nutzung (Konsole / eigene Skripte)

```javascript
const { scanner, equipMgr, lockMgr, store } = window.BCAES;

// Alle Gruppen anzeigen
scanner.dumpGroups();

// Alle Assets einer Gruppe anzeigen
scanner.dumpGroup("ItemArms");

// Asset suchen
scanner.search("rope", "ItemArms");

// Nur Extended Assets
scanner.getExtendedAssets("ItemArms");

// Outfit per Code erstellen
const outfit = equipMgr.createOutfit("Mein Outfit", "Beschreibung");
equipMgr.addItem(outfit, {
  group: "ItemArms",
  asset: "HempRope",
  color: "#8B4513",
  type:  null,
  lock:  lockMgr.createLockConfig("TimerPadlock", { RemoveTimer: 1800 }),
});
store.saveOutfit(outfit.name, outfit);

// Outfit anwenden
equipMgr.applyOutfit(Player, "Mein Outfit", {
  stripFirst:   true,  // erst ausziehen
  applyLocks:   true,  // Locks setzen
  targetGroups: null,  // null = alle Gruppen
});

// Aktuelles Outfit von Charakter lesen
const captured = equipMgr.captureFromCharacter(Player, "Snapshot", true);

// Lock manuell auf Item anwenden
const item = Player.Appearance.find(a => a.Asset?.Name === "HempRope");
lockMgr.applyLock(item, { type: "Padlock" }, Player);
CharacterRefresh(Player);

// Import / Export
const json = store.exportJSON();
store.importJSON(json);
```

---

## ⚙ Outfit-JSON-Format

Das Format kann manuell bearbeitet und importiert werden:

```json
{
  "version": 1,
  "outfits": {
    "Mein Outfit": {
      "name": "Mein Outfit",
      "description": "Beispiel",
      "savedAt": 1700000000000,
      "items": [
        {
          "group":    "ItemArms",
          "asset":    "HempRope",
          "color":    "#8B4513",
          "type":     null,
          "property": { "Difficulty": 2 },
          "lock": {
            "type":        "TimerPadlock",
            "RemoveTimer": 3600
          }
        }
      ]
    }
  },
  "settings": {
    "autoApplyOnLogin": false,
    "defaultOutfit":    null
  }
}
```

---

## 🛠 Erweiterung

### Neuen Lock-Typ hinzufügen

In `modules/LockManager.js` in `LOCK_DEFINITIONS` eintragen:

```javascript
MeinLock: {
  label:       "Mein Custom Lock",
  asset:       "MeinLockAsset",
  group:       "ItemMisc",
  properties:  { LockedBy: "MeinLockAsset" },
  configFields: [
    { key: "CustomProp", label: "Mein Feld", type: "text", default: "value" },
  ],
},
```

### Custom Hook registrieren

```javascript
const { hooks } = window.BCAES;
// Eigene Funktion in hooks._originals speichern und überschreiben
```

---

## ⚠ Hinweise

- Das Addon modifiziert `Character.Appearance` direkt — entspricht dem, was BC intern tut
- Locks werden über `Character.Appearance[n].Property` gesetzt (BC-Standard)
- Extended-Properties werden via `CharacterAppearanceSetItem` + Property-Patch gesetzt
- `CharacterRefresh(Player)` wird nach jeder Änderung aufgerufen
- Alle Daten werden in `localStorage` mit Key `BCAES_BCAES` gespeichert
