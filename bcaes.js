/**
 * BCAES – BC Asset & Equipment System
 * Einzelne gebündelte Datei – kein FUSAM, keine ES-Module
 * Version 2.0
 */
(function () {
  "use strict";

  // ── Bereits geladen? ──────────────────────────────────
  if (window.__BCAES_LOADED__) {
    window.__BCAES__.ui.toggle();
    return;
  }

  // ── Farben ────────────────────────────────────────────
  const C = {
    bg:           "#111217",
    bgPanel:      "#181a1f",
    bgSidebar:    "#13151a",
    bgCard:       "#1e2028",
    bgCardHover:  "#252830",
    bgSelected:   "#2a1520",
    accent:       "#8B1A2F",
    accentLight:  "#c0394f",
    green:        "#2a6b35",
    border:       "#2a2d35",
    borderAccent: "#5a1a28",
    text:         "#ddd",
    textMuted:    "#888",
    textTitle:    "#e06070",
    btnToggle:    "#1e2028",
  };

  const LOCK_BUTTONS = [
    { id: "None",                label: "None"         },
    { id: "MetalPadlock",        label: "Metal"        },
    { id: "TimerPadlock",        label: "Timer"        },
    { id: "PasswordPadlock",     label: "Password"     },
    { id: "CombinationPadlock",  label: "Combination"  },
    { id: "HighSecurityPadlock", label: "HighSecurity" },
    { id: "OwnerPadlock",        label: "Owner"        },
    { id: "LoversPadlock",       label: "Lovers"       },
  ];

  const ALL_EFFECTS = [
    "Block","BlockWardrobe","MergedFingers","Freeze",
    "Edge","Deny","Tease","Slow","Chaste","Prone","Spread",
  ];

  // ── Toast-Benachrichtigung ────────────────────────────
  function toast(msg, type = "info", duration = 3500) {
    const colors = {
      success: "#2a6b35",
      error:   "#8b1a1a",
      info:    "#1a3a6b",
      warn:    "#6b5a1a",
    };
    const t = E("div", {
      position: "fixed", bottom: "30px", right: "30px",
      zIndex: "9999999",
      background: colors[type] ?? colors.info,
      color: "#fff", padding: "14px 22px",
      borderRadius: "6px", fontFamily: "'Segoe UI',Arial,sans-serif",
      fontSize: "14px", fontWeight: "bold",
      boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
      border: "1px solid rgba(255,255,255,0.15)",
      maxWidth: "380px", lineHeight: "1.4",
      transition: "opacity 0.4s",
    });
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = "0"; setTimeout(() => t.remove(), 400); }, duration);
  }

  // ── Element-Factory ───────────────────────────────────
  function E(tag, styles = {}, attrs = {}) {
    const el = document.createElement(tag);
    Object.assign(el.style, styles);
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, v);
    }
    return el;
  }

  // ════════════════════════════════════════════════════
  //  STORE – localStorage
  // ════════════════════════════════════════════════════
  const Store = {
    _key: "BCAES_v2",
    _data: null,

    _defaults() {
      return { version: 2, outfits: {}, settings: { autoApplyOnLogin: false, defaultOutfit: null } };
    },

    load() {
      try {
        const raw = localStorage.getItem(this._key);
        this._data = raw ? JSON.parse(raw) : this._defaults();
      } catch { this._data = this._defaults(); }
      return this;
    },

    save() {
      try { localStorage.setItem(this._key, JSON.stringify(this._data)); } catch(e) { console.error("[BCAES] Speicherfehler:", e); }
    },

    getOutfitNames()      { return Object.keys(this._data.outfits); },
    getOutfit(name)       { return JSON.parse(JSON.stringify(this._data.outfits[name] ?? null)); },
    saveOutfit(name, cfg) { this._data.outfits[name] = { ...cfg, savedAt: Date.now() }; this.save(); },
    deleteOutfit(name)    { delete this._data.outfits[name]; this.save(); },
    getSetting(k)         { return this._data.settings[k]; },
    setSetting(k, v)      { this._data.settings[k] = v; this.save(); },
    getSettings()         { return { ...this._data.settings }; },
    exportJSON()          { return JSON.stringify(this._data, null, 2); },
    importJSON(json)      {
      const p = JSON.parse(json);
      if (!p.outfits) throw new Error("Ungültiges Format.");
      Object.assign(this._data.outfits,  p.outfits  ?? {});
      Object.assign(this._data.settings, p.settings ?? {});
      this.save();
    },
    reset() { this._data = this._defaults(); this.save(); },
  };

  // ════════════════════════════════════════════════════
  //  SCANNER – alle BC-Assets
  // ════════════════════════════════════════════════════
  const Scanner = {
    _byGroup: {},
    _byKey:   {},
    groups:   [],

    scan() {
      this._byGroup = {};
      this._byKey   = {};
      this.groups   = [];

      const src = window.AssetGroup ?? window.Asset ?? [];
      for (const group of src) {
        const gName  = group.Name ?? group.Group ?? String(group);
        const assets = group.Asset ?? group.Assets ?? [];
        this._byGroup[gName] = [];
        this.groups.push(gName);
        for (const asset of assets) {
          const info = {
            name:      asset.Name,
            group:     gName,
            extended:  !!(asset.Extended || asset.Archetype),
            archetype: asset.Archetype ?? null,
            lockable:  asset.AllowLock !== false,
            types:     this._getTypes(gName, asset),
            colors:    asset.Color ?? [],
            layers:    (asset.Layer ?? []).length,
          };
          this._byGroup[gName].push(info);
          this._byKey[`${gName}/${asset.Name}`] = info;
        }
      }
      console.log(`[BCAES] Scanner: ${Object.keys(this._byKey).length} Assets in ${this.groups.length} Gruppen.`);
    },

    _getTypes(gName, asset) {
      if (!asset.Extended && !asset.Archetype) return [];
      const key = `${gName}${asset.Name}`;
      const cfg  = window[key] ?? window[asset.Name];
      if (cfg?.Options) return cfg.Options.map(o => o.Name ?? o.Value ?? String(o));
      return [];
    },

    getAsset(group, name) { return this._byKey[`${group}/${name}`] ?? null; },
    getGroup(group)       { return this._byGroup[group] ?? []; },

    search(query, groupFilter) {
      const q = (query ?? "").toLowerCase();
      return Object.entries(this._byKey)
        .filter(([k, a]) => {
          if (groupFilter && a.group !== groupFilter) return false;
          return !q || a.name.toLowerCase().includes(q) || a.group.toLowerCase().includes(q);
        })
        .map(([, a]) => a);
    },

    allFlat() {
      return Object.values(this._byKey);
    },
  };

  // ════════════════════════════════════════════════════
  //  LOCK-MANAGER
  // ════════════════════════════════════════════════════
  const LOCK_DEFS = {
    None:                { props: {},                                           fields: [] },
    MetalPadlock:        { props: { LockedBy:"MetalPadlock" },                 fields: [] },
    TimerPadlock:        { props: { LockedBy:"TimerPadlock" },                 fields: [{ key:"RemoveTimer", label:"Dauer (Sekunden)", type:"number", min:60, max:86400, default:3600 }] },
    PasswordPadlock:     { props: { LockedBy:"PasswordPadlock" },              fields: [{ key:"Password", label:"Passwort", type:"text", default:"" }] },
    CombinationPadlock:  { props: { LockedBy:"CombinationPadlock" },           fields: [{ key:"CombinationNumber", label:"Code (4 Ziffern)", type:"text", default:"0000" }] },
    HighSecurityPadlock: { props: { LockedBy:"HighSecurityPadlock" },          fields: [{ key:"MemberNumberListKeys", label:"Schlüsselhalter (komma-getrennt)", type:"text", default:"" }] },
    OwnerPadlock:        { props: { LockedBy:"OwnerPadlock" },                 fields: [] },
    LoversPadlock:       { props: { LockedBy:"LoversPadlock" },                fields: [] },
  };

  const LockManager = {
    createConfig(type = "None", overrides = {}) {
      const def = LOCK_DEFS[type] ?? LOCK_DEFS.None;
      const cfg = { type };
      for (const f of def.fields) cfg[f.key] = overrides[f.key] ?? f.default;
      return cfg;
    },

    getFields(type) { return (LOCK_DEFS[type] ?? LOCK_DEFS.None).fields; },

    apply(appItem, lockCfg, locker) {
      if (!appItem || !lockCfg || lockCfg.type === "None") return;
      const def = LOCK_DEFS[lockCfg.type];
      if (!def) return;
      if (!appItem.Property) appItem.Property = {};
      Object.assign(appItem.Property, def.props);
      for (const f of def.fields) {
        if (lockCfg[f.key] !== undefined) appItem.Property[f.key] = lockCfg[f.key];
      }
      if (lockCfg.type === "TimerPadlock") {
        appItem.Property.RemoveTimer = Math.round(Date.now() / 1000) + (lockCfg.RemoveTimer ?? 3600);
      }
      if (locker?.MemberNumber) appItem.Property.LockMemberNumber = locker.MemberNumber;
      appItem.Property.Lock = def.props.LockedBy ?? "";
    },
  };

  // ════════════════════════════════════════════════════
  //  EQUIPMENT-MANAGER
  // ════════════════════════════════════════════════════
  const EquipManager = {
    createOutfit(name = "Neues Outfit", desc = "") {
      return { name, description: desc, items: [] };
    },

    addItem(outfit, itemCfg) {
      outfit.items = outfit.items.filter(i => i.group !== itemCfg.group);
      outfit.items.push({ ...itemCfg });
    },

    removeItem(outfit, group) {
      outfit.items = outfit.items.filter(i => i.group !== group);
    },

    captureFromCharacter(char, name = "Gescanntes Outfit") {
      const outfit = this.createOutfit(name);
      for (const item of (char.Appearance ?? [])) {
        if (!item.Asset) continue;
        const group = item.Asset.Group?.Name ?? item.Asset.Group;
        if (!group) continue;
        outfit.items.push({
          group,
          asset:    item.Asset.Name,
          color:    Array.isArray(item.Color) ? [...item.Color] : (item.Color ?? null),
          type:     item.Property?.Type ?? null,
          effects:  item.Property?.Effect ? [...item.Property.Effect] : [],
          property: { ...(item.Property ?? {}) },
          lock: item.Property?.LockedBy
            ? { type: item.Property.LockedBy, ...item.Property }
            : { type: "None" },
        });
      }
      return outfit;
    },

    applyOutfit(char, outfitOrName, opts = {}) {
      const { stripFirst = true, applyLocks = true } = opts;
      const outfit = typeof outfitOrName === "string"
        ? Store.getOutfit(outfitOrName)
        : outfitOrName;
      if (!outfit) throw new Error(`Outfit nicht gefunden: ${outfitOrName}`);

      if (stripFirst) this._strip(char);

      const errors = [];
      for (const itemCfg of outfit.items) {
        try { this.applyItem(char, itemCfg, applyLocks); }
        catch (e) { errors.push(`${itemCfg.group}/${itemCfg.asset}: ${e.message}`); }
      }

      try { if (typeof CharacterRefresh === "function") CharacterRefresh(char); } catch {}
      return { applied: outfit.items.length - errors.length, errors };
    },

    applyItem(char, itemCfg, applyLocks = false) {
      // Asset validieren
      const assetInfo = Scanner.getAsset(itemCfg.group, itemCfg.asset);
      if (!assetInfo) throw new Error(`Asset ${itemCfg.group}/${itemCfg.asset} nicht gefunden.`);

      // Rohes BC-Asset-Objekt finden
      const bcAsset = this._findBCAsset(itemCfg.group, itemCfg.asset);
      if (!bcAsset) throw new Error(`BC-Asset nicht im AssetGroup: ${itemCfg.asset}`);

      let color = itemCfg.color ?? "Default";

      // InventoryWear (öffentliche BC-API)
      if (typeof InventoryWear === "function") {
        InventoryWear(char, itemCfg.asset, itemCfg.group, color, itemCfg.property?.Difficulty ?? 0, null, null, false);
      } else {
        // Direkter Fallback
        const idx = (char.Appearance ?? []).findIndex(
          a => (a.Asset?.Group?.Name ?? a.Asset?.Group) === itemCfg.group
        );
        const entry = { Asset: bcAsset, Color: color, Property: {} };
        if (idx >= 0) char.Appearance[idx] = entry;
        else char.Appearance.push(entry);
      }

      // Appearance-Item finden und Properties setzen
      const appItem = (char.Appearance ?? []).find(
        a => a.Asset?.Name === itemCfg.asset &&
             (a.Asset?.Group?.Name ?? a.Asset?.Group) === itemCfg.group
      );
      if (!appItem) return;
      if (!appItem.Property) appItem.Property = {};

      if (itemCfg.type)    appItem.Property.Type   = itemCfg.type;
      if (itemCfg.effects?.length) appItem.Property.Effect = [...itemCfg.effects];

      if (itemCfg.property) {
        const safe = { ...itemCfg.property };
        delete safe.LockedBy; delete safe.Lock; delete safe.LockMemberNumber;
        Object.assign(appItem.Property, safe);
      }

      if (applyLocks && itemCfg.lock?.type && itemCfg.lock.type !== "None") {
        LockManager.apply(appItem, itemCfg.lock, window.Player);
      }
    },

    _findBCAsset(group, name) {
      for (const g of (window.AssetGroup ?? [])) {
        if ((g.Name ?? g.Group) !== group) continue;
        for (const a of (g.Asset ?? g.Assets ?? [])) {
          if (a.Name === name) return a;
        }
      }
      return null;
    },

    _strip(char) {
      for (const group of Scanner.groups) {
        try {
          if (typeof InventoryRemove === "function") InventoryRemove(char, group, false);
          else if (char.Appearance) {
            char.Appearance = char.Appearance.filter(
              a => (a.Asset?.Group?.Name ?? a.Asset?.Group) !== group
            );
          }
        } catch {}
      }
    },
  };

  // ════════════════════════════════════════════════════
  //  UI
  // ════════════════════════════════════════════════════
  const UI = {
    _root:         null,
    _activeTab:    "items",
    _allItems:     [],
    _filtered:     [],
    _selected:     null,
    _listEl:       null,
    _detailEl:     null,
    _lockFieldsEl: null,
    _bodyEl:       null,
    _tabEls:       {},

    open() {
      if (this._root) return;
      this._allItems = Scanner.allFlat();
      this._filtered = [...this._allItems];
      this._root     = this._mount();
    },
    close()  { this._root?.remove(); this._root = null; },
    toggle() { this._root ? this.close() : this.open(); },

    // ── Hauptgerüst ─────────────────────────────────
    _mount() {
      const overlay = E("div", {
        position:"fixed", top:"0", left:"0", width:"100vw", height:"100vh",
        background:"rgba(0,0,0,0.78)", zIndex:"999999",
        display:"flex", alignItems:"center", justifyContent:"center",
        fontFamily:"'Segoe UI',Arial,sans-serif", fontSize:"13px",
      });

      const modal = E("div", {
        width:"1050px", maxWidth:"97vw", height:"710px", maxHeight:"94vh",
        background:C.bg, border:`1px solid ${C.borderAccent}`,
        borderRadius:"6px", display:"flex", flexDirection:"column",
        color:C.text, overflow:"hidden",
        boxShadow:"0 10px 50px rgba(0,0,0,0.9)",
      });

      modal.appendChild(this._buildTopBar());

      this._bodyEl = E("div", { display:"flex", flex:"1", overflow:"hidden" });
      modal.appendChild(this._bodyEl);
      this._renderBody("items");

      overlay.appendChild(modal);
      overlay.addEventListener("click", ev => { if (ev.target === overlay) this.close(); });
      document.body.appendChild(overlay);
      return overlay;
    },

    // ── Top Bar ─────────────────────────────────────
    _buildTopBar() {
      const bar = E("div", {
        background:"linear-gradient(180deg,#5a1525 0%,#3a0f18 100%)",
        display:"flex", alignItems:"center", padding:"0 16px",
        borderBottom:`1px solid ${C.borderAccent}`,
        height:"46px", flexShrink:"0", gap:"2px",
      });

      this._titleEl = E("span", {
        color:"#fff", fontWeight:"bold", fontSize:"15px",
        marginRight:"auto", userSelect:"none",
      });
      this._titleEl.textContent = `🔧 BC Asset & Equipment System (${this._allItems.length} Items)`;

      const tabs = [
        { id:"items",    label:"⬜ Show Items"   },
        { id:"outfits",  label:"👗 Outfits"      },
        { id:"settings", label:"⚙ Einstellungen" },
      ];

      this._tabEls = {};
      for (const t of tabs) {
        const btn = E("button", {
          background:"transparent", border:"none",
          color: t.id==="items" ? "#fff" : "rgba(255,255,255,0.55)",
          padding:"0 15px", height:"46px", cursor:"pointer",
          fontSize:"13px",
          fontWeight: t.id==="items" ? "bold" : "normal",
          borderBottom: t.id==="items" ? "2px solid #fff" : "2px solid transparent",
        });
        btn.textContent = t.label;
        btn.addEventListener("click", () => this._switchTab(t.id));
        this._tabEls[t.id] = btn;
        bar.appendChild(btn);
      }

      const closeBtn = E("button", {
        background:"rgba(0,0,0,0.4)", border:"1px solid rgba(255,255,255,0.25)",
        color:"#fff", padding:"4px 13px", cursor:"pointer",
        borderRadius:"4px", marginLeft:"12px", fontSize:"12px",
      });
      closeBtn.textContent = "✕ Schließen";
      closeBtn.addEventListener("click", () => this.close());

      bar.append(this._titleEl, ...Object.values(this._tabEls), closeBtn);
      return bar;
    },

    _switchTab(id) {
      this._activeTab = id;
      for (const [tid, btn] of Object.entries(this._tabEls)) {
        const on = tid === id;
        btn.style.color        = on ? "#fff" : "rgba(255,255,255,0.55)";
        btn.style.fontWeight   = on ? "bold" : "normal";
        btn.style.borderBottom = on ? "2px solid #fff" : "2px solid transparent";
      }
      this._renderBody(id);
    },

    _renderBody(id) {
      this._bodyEl.innerHTML = "";
      if      (id === "items")    this._buildItemsTab();
      else if (id === "outfits")  this._bodyEl.appendChild(this._buildOutfitsPanel());
      else                        this._bodyEl.appendChild(this._buildSettingsPanel());
    },

    // ── Items Tab ────────────────────────────────────
    _buildItemsTab() {
      const sidebar = this._buildSidebar();
      this._detailEl = this._buildDetailEmpty();
      if (this._selected) {
        const newDetail = this._buildDetail(this._selected);
        this._detailEl = newDetail;
      }
      this._bodyEl.append(sidebar, this._detailEl);
    },

    // ── Sidebar ──────────────────────────────────────
    _buildSidebar() {
      const side = E("div", {
        width:"290px", background:C.bgSidebar,
        display:"flex", flexDirection:"column",
        borderRight:`1px solid ${C.border}`, flexShrink:"0",
      });

      // Suchfeld
      const searchWrap = E("div", { padding:"10px", borderBottom:`1px solid ${C.border}` });
      const searchIn = E("input", {
        width:"100%", boxSizing:"border-box", padding:"7px 10px",
        background:"#1e2028", border:`1px solid ${C.border}`,
        borderRadius:"4px", color:C.text, fontSize:"13px", outline:"none",
      });
      searchIn.setAttribute("placeholder", "🔍 Search items…");
      searchIn.addEventListener("input", () => {
        const q = searchIn.value.trim().toLowerCase();
        this._filtered = q
          ? this._allItems.filter(a =>
              a.name.toLowerCase().includes(q) ||
              a.group.toLowerCase().includes(q))
          : [...this._allItems];
        this._renderList();
      });
      searchWrap.appendChild(searchIn);
      side.appendChild(searchWrap);

      // Filter-Pills
      const pills = E("div", {
        display:"flex", gap:"5px", padding:"7px 10px",
        borderBottom:`1px solid ${C.border}`, flexWrap:"wrap",
      });
      const mkPill = (label, fn) => {
        const p = E("button", {
          padding:"3px 9px", borderRadius:"10px", fontSize:"11px",
          background:C.btnToggle, border:`1px solid ${C.border}`,
          color:C.textMuted, cursor:"pointer",
        });
        p.textContent = label;
        let on = false;
        p.addEventListener("click", () => {
          on = !on;
          p.style.background  = on ? C.bgSelected  : C.btnToggle;
          p.style.color       = on ? C.textTitle    : C.textMuted;
          p.style.borderColor = on ? C.borderAccent : C.border;
          this._filtered = on ? this._allItems.filter(fn) : [...this._allItems];
          this._renderList();
        });
        return p;
      };
      pills.appendChild(mkPill("Extended", a => a.extended));
      pills.appendChild(mkPill("Lockable",  a => a.lockable));
      pills.appendChild(mkPill("Has Types", a => a.types?.length > 0));
      side.appendChild(pills);

      // Liste
      this._listEl = E("div", { flex:"1", overflowY:"auto" });
      side.appendChild(this._listEl);
      this._renderList();
      return side;
    },

    _renderList() {
      if (!this._listEl) return;
      this._listEl.innerHTML = "";
      const items = this._filtered.slice(0, 500);
      for (const asset of items) {
        const isSel = this._selected?.group === asset.group &&
                      this._selected?.assetName === asset.name;
        const row = E("div", {
          padding:"9px 14px", cursor:"pointer",
          borderBottom:`1px solid ${C.border}`,
          background: isSel ? C.bgSelected : "transparent",
          transition:"background 0.1s",
        });
        row.addEventListener("mouseenter", () => { if (!isSel) row.style.background = C.bgCardHover; });
        row.addEventListener("mouseleave", () => { if (!isSel) row.style.background = "transparent"; });

        const nm = E("div", { fontWeight:"bold", color: isSel ? C.textTitle : C.text, fontSize:"13px" });
        nm.textContent = asset.name;
        const sub = E("div", { fontSize:"11px", color:C.textMuted, marginTop:"2px" });
        sub.textContent = asset.group + (asset.extended ? " • Extended" : "");
        row.append(nm, sub);

        row.addEventListener("click", () => {
          this._selected = {
            group: asset.group, assetName: asset.name,
            cfg: {
              group: asset.group, asset: asset.name,
              color: null, type: null, effects: [],
              property: { Difficulty: 0 }, lock: { type: "None" },
            },
          };
          this._renderList();
          const newDetail = this._buildDetail(this._selected);
          this._detailEl?.replaceWith(newDetail);
          this._detailEl = newDetail;
        });
        this._listEl.appendChild(row);
      }

      if (this._filtered.length > 500) {
        const n = E("div", { padding:"8px 14px", color:C.textMuted, fontSize:"11px" });
        n.textContent = `+ ${this._filtered.length - 500} weitere – Suche verfeinern`;
        this._listEl.appendChild(n);
      }
    },

    // ── Detail leer ──────────────────────────────────
    _buildDetailEmpty() {
      const p = E("div", {
        flex:"1", display:"flex", alignItems:"center", justifyContent:"center",
        flexDirection:"column", gap:"12px", color:C.textMuted,
      });
      const icon = E("div", { fontSize:"52px", opacity:"0.25" });
      icon.textContent = "🔧";
      const txt = E("div", { fontSize:"15px" });
      txt.textContent = "← Wähle ein Item aus der Liste";
      p.append(icon, txt);
      return p;
    },

    // ── Detail (Item ausgewählt) ─────────────────────
    _buildDetail(sel) {
      const assetInfo = Scanner.getAsset(sel.group, sel.assetName) ?? {};
      const panel = E("div", {
        flex:"1", display:"flex", flexDirection:"column",
        background:C.bgPanel, overflow:"hidden",
      });

      const scroll = E("div", { flex:"1", overflowY:"auto", padding:"18px 22px" });

      // Titelkarte
      const titleCard = E("div", {
        background:C.bgCard, border:`1px solid ${C.borderAccent}`,
        borderRadius:"6px", padding:"14px 18px", marginBottom:"18px",
      });
      const h1 = E("div", { fontSize:"24px", fontWeight:"bold", color:C.textTitle, marginBottom:"10px" });
      h1.textContent = sel.assetName;
      const meta = E("div", { display:"grid", gridTemplateColumns:"80px 1fr", gap:"4px 10px", fontSize:"13px" });
      const addMeta = (k, v) => {
        const ke = E("span", { color:C.textMuted }); ke.textContent = k + ":";
        const ve = E("span", { color:C.text });       ve.textContent = v;
        meta.append(ke, ve);
      };
      addMeta("ID",       assetInfo.name ?? sel.assetName);
      addMeta("Group",    sel.group);
      addMeta("Extended", (assetInfo.extended || assetInfo.archetype)
                            ? `Yes (${assetInfo.archetype ?? "extended"})` : "No");
      if (assetInfo.types?.length) addMeta("Types", assetInfo.types.slice(0,8).join(", "));
      titleCard.append(h1, meta);
      scroll.appendChild(titleCard);

      // Lock
      scroll.appendChild(this._section("🔒 Lock", this._buildLockBtns(sel)));
      this._lockFieldsEl = E("div", { marginBottom:"14px" });
      scroll.appendChild(this._lockFieldsEl);

      // Farbe
      scroll.appendChild(this._section("🎨 Farbe", this._buildColorInput(sel)));

      // Typ
      if (assetInfo.types?.length) {
        scroll.appendChild(this._section("🔧 Extended-Typ", this._buildTypeBtns(sel, assetInfo.types)));
      }

      // Effects
      scroll.appendChild(this._section("⚡ Effects", this._buildEffectBtns(sel)));

      // Difficulty
      scroll.appendChild(this._section("🎮 Difficulty", this._buildDifficulty(sel)));

      panel.appendChild(scroll);
      panel.appendChild(this._buildActionBar(sel));
      return panel;
    },

    _section(title, content) {
      const w = E("div", { marginBottom:"18px" });
      const h = E("div", {
        fontSize:"14px", fontWeight:"bold", color:C.textTitle,
        marginBottom:"10px", paddingBottom:"6px", borderBottom:`1px solid ${C.border}`,
      });
      h.textContent = title;
      w.append(h, content);
      return w;
    },

    // ── Lock-Buttons ─────────────────────────────────
    _buildLockBtns(sel) {
      const row = E("div", { display:"flex", flexWrap:"wrap", gap:"7px" });
      const btns = {};

      const activate = (id) => {
        sel.cfg.lock = LockManager.createConfig(id);
        for (const [bid, b] of Object.entries(btns)) {
          const on = bid === id;
          b.style.background  = on ? C.bgSelected  : C.btnToggle;
          b.style.borderColor = on ? C.accentLight : C.border;
          b.style.color       = on ? C.textTitle    : C.textMuted;
          b.style.fontWeight  = on ? "bold"         : "normal";
        }
        this._renderLockFields(sel);
      };

      for (const lb of LOCK_BUTTONS) {
        const b = E("button", {
          padding:"7px 16px", borderRadius:"4px", cursor:"pointer",
          background: lb.id === "None" ? C.bgSelected : C.btnToggle,
          border:`1px solid ${lb.id === "None" ? C.accentLight : C.border}`,
          color:     lb.id === "None" ? C.textTitle  : C.textMuted,
          fontWeight:lb.id === "None" ? "bold"       : "normal",
          fontSize:"12px", transition:"all 0.15s",
        });
        b.textContent = lb.label;
        b.addEventListener("click", () => activate(lb.id));
        btns[lb.id] = b;
        row.appendChild(b);
      }
      return row;
    },

    _renderLockFields(sel) {
      if (!this._lockFieldsEl) return;
      this._lockFieldsEl.innerHTML = "";
      const fields = LockManager.getFields(sel.cfg.lock?.type);
      if (!fields.length) return;
      const box = E("div", {
        background:C.bgCard, border:`1px solid ${C.border}`,
        borderRadius:"6px", padding:"12px 16px",
        display:"flex", flexWrap:"wrap", gap:"14px",
      });
      for (const f of fields) {
        const w = E("div", { display:"flex", flexDirection:"column", gap:"5px" });
        const l = E("label", { fontSize:"11px", color:C.textMuted });
        l.textContent = f.label;
        const inp = E("input", {
          padding:"6px 10px", background:"#1e2028",
          border:`1px solid ${C.border}`, borderRadius:"4px",
          color:C.text, fontSize:"13px", width:"160px",
        });
        inp.setAttribute("type", f.type === "number" ? "number" : "text");
        if (f.min) inp.setAttribute("min", f.min);
        if (f.max) inp.setAttribute("max", f.max);
        inp.value = f.default ?? "";
        inp.addEventListener("input", () => {
          sel.cfg.lock[f.key] = f.type === "number" ? Number(inp.value) : inp.value;
        });
        w.append(l, inp);
        box.appendChild(w);
      }
      this._lockFieldsEl.appendChild(box);
    },

    // ── Farbe ────────────────────────────────────────
    _buildColorInput(sel) {
      const row = E("div", { display:"flex", gap:"10px", alignItems:"center" });
      const preview = E("div", {
        width:"30px", height:"30px", borderRadius:"4px",
        border:`1px solid ${C.border}`, background:"#888888", flexShrink:"0",
      });
      const textInp = E("input", {
        flex:"1", padding:"6px 10px", background:"#1e2028",
        border:`1px solid ${C.border}`, borderRadius:"4px",
        color:C.text, fontSize:"13px",
      });
      textInp.setAttribute("type","text");
      textInp.setAttribute("placeholder","#RRGGBB oder Default");
      textInp.value = sel.cfg.color ?? "";
      textInp.addEventListener("input", () => {
        sel.cfg.color = textInp.value.trim() || null;
        preview.style.background = textInp.value.trim() || "#888888";
      });
      const picker = E("input", { width:"32px", height:"32px", cursor:"pointer" });
      picker.setAttribute("type","color");
      picker.value = "#888888";
      picker.addEventListener("input", () => {
        sel.cfg.color = picker.value;
        textInp.value = picker.value;
        preview.style.background = picker.value;
      });
      const defBtn = E("button", {
        padding:"6px 12px", background:C.btnToggle,
        border:`1px solid ${C.border}`, color:C.textMuted,
        borderRadius:"4px", cursor:"pointer", fontSize:"12px",
      });
      defBtn.textContent = "Default";
      defBtn.addEventListener("click", () => {
        sel.cfg.color = null; textInp.value = "";
        preview.style.background = "#888888";
      });
      row.append(preview, textInp, picker, defBtn);
      return row;
    },

    // ── Typ-Buttons ──────────────────────────────────
    _buildTypeBtns(sel, types) {
      const row = E("div", { display:"flex", flexWrap:"wrap", gap:"7px" });
      const btns = {};
      const activate = (t) => {
        sel.cfg.type = t === "–" ? null : t;
        for (const [bid, b] of Object.entries(btns)) {
          const on = bid === t;
          b.style.background  = on ? C.bgSelected  : C.btnToggle;
          b.style.borderColor = on ? C.accentLight : C.border;
          b.style.color       = on ? C.textTitle    : C.textMuted;
          b.style.fontWeight  = on ? "bold"         : "normal";
        }
      };
      for (const t of ["–", ...types]) {
        const b = E("button", {
          padding:"6px 14px", borderRadius:"4px", cursor:"pointer",
          background: t === "–" ? C.bgSelected : C.btnToggle,
          border:`1px solid ${t === "–" ? C.accentLight : C.border}`,
          color: t === "–" ? C.textTitle : C.textMuted,
          fontWeight: t === "–" ? "bold" : "normal", fontSize:"12px",
        });
        b.textContent = t;
        b.addEventListener("click", () => activate(t));
        btns[t] = b;
        row.appendChild(b);
      }
      return row;
    },

    // ── Effects ──────────────────────────────────────
    _buildEffectBtns(sel) {
      const row = E("div", { display:"flex", flexWrap:"wrap", gap:"7px" });
      for (const eff of ALL_EFFECTS) {
        let active = false;
        const b = E("button", {
          padding:"6px 14px", borderRadius:"4px", cursor:"pointer",
          background:C.btnToggle, border:`1px solid ${C.border}`,
          color:C.textMuted, fontSize:"12px", transition:"all 0.15s",
        });
        b.textContent = eff;
        b.addEventListener("click", () => {
          active = !active;
          b.style.background  = active ? C.bgSelected  : C.btnToggle;
          b.style.borderColor = active ? C.accentLight : C.border;
          b.style.color       = active ? C.textTitle    : C.textMuted;
          b.style.fontWeight  = active ? "bold"         : "normal";
          b.textContent       = (active ? "✓ " : "") + eff;
          if (active) sel.cfg.effects.push(eff);
          else sel.cfg.effects = sel.cfg.effects.filter(x => x !== eff);
        });
        row.appendChild(b);
      }
      return row;
    },

    // ── Difficulty ───────────────────────────────────
    _buildDifficulty(sel) {
      const wrap = E("div", { display:"flex", alignItems:"center", gap:"14px" });
      const valEl = E("span", { minWidth:"28px", textAlign:"center", fontWeight:"bold", color:C.textTitle, fontSize:"16px" });
      valEl.textContent = "0";
      const slider = document.createElement("input");
      slider.type = "range"; slider.min = "0"; slider.max = "20"; slider.value = "0";
      Object.assign(slider.style, { flex:"1", accentColor:C.accentLight, cursor:"pointer" });
      slider.addEventListener("input", () => {
        sel.cfg.property.Difficulty = Number(slider.value);
        valEl.textContent = slider.value;
      });
      wrap.append(slider, valEl);
      return wrap;
    },

    // ── Action Bar ───────────────────────────────────
    _buildActionBar(sel) {
      const bar = E("div", {
        padding:"12px 20px", borderTop:`1px solid ${C.border}`,
        display:"flex", gap:"10px", background:C.bgPanel, flexShrink:"0",
      });

      const applyBtn = E("button", {
        flex:"1", padding:"11px", borderRadius:"4px", cursor:"pointer",
        background:"linear-gradient(180deg,#7a1528 0%,#5a0f1c 100%)",
        border:`1px solid ${C.borderAccent}`,
        color:"#fff", fontWeight:"bold", fontSize:"14px", transition:"filter 0.15s",
      });
      applyBtn.textContent = "✅ Apply to Self";
      applyBtn.addEventListener("mouseenter", () => applyBtn.style.filter = "brightness(1.2)");
      applyBtn.addEventListener("mouseleave", () => applyBtn.style.filter = "none");
      applyBtn.addEventListener("click", () => {
        try {
          EquipManager.applyItem(window.Player, sel.cfg, true);
          try { if (typeof CharacterRefresh === "function") CharacterRefresh(window.Player); } catch {}
          toast(`✅ ${sel.assetName} angewendet!`, "success");
        } catch (err) {
          console.error("[BCAES]", err);
          toast(`❌ Fehler: ${err.message}`, "error", 5000);
        }
      });

      const saveBtn = E("button", {
        width:"130px", padding:"11px", borderRadius:"4px", cursor:"pointer",
        background:"linear-gradient(180deg,#2a6b35 0%,#1a4525 100%)",
        border:"1px solid #2a8b35",
        color:"#fff", fontWeight:"bold", fontSize:"14px", transition:"filter 0.15s",
      });
      saveBtn.textContent = "💾 Save";
      saveBtn.addEventListener("mouseenter", () => saveBtn.style.filter = "brightness(1.2)");
      saveBtn.addEventListener("mouseleave", () => saveBtn.style.filter = "none");
      saveBtn.addEventListener("click", () => {
        const name = prompt("In welches Outfit speichern?", `${sel.assetName}-Set`);
        if (!name) return;
        let outfit = Store.getOutfit(name) ?? EquipManager.createOutfit(name);
        EquipManager.addItem(outfit, sel.cfg);
        Store.saveOutfit(name, outfit);
        toast(`💾 In Outfit "${name}" gespeichert!`, "success");
      });

      bar.append(applyBtn, saveBtn);
      return bar;
    },

    // ── Outfits-Panel ────────────────────────────────
    _buildOutfitsPanel() {
      const wrap = E("div", {
        flex:"1", padding:"20px", overflowY:"auto",
        display:"flex", flexDirection:"column", gap:"14px",
      });

      const mkBtn = (label, bg, cb) => {
        const b = E("button", {
          padding:"8px 16px", background:bg,
          border:"1px solid rgba(255,255,255,0.1)",
          color:"#fff", borderRadius:"4px", cursor:"pointer", fontSize:"13px",
        });
        b.textContent = label;
        b.addEventListener("click", cb);
        return b;
      };

      const topBar = E("div", { display:"flex", gap:"10px", flexWrap:"wrap" });
      topBar.appendChild(mkBtn("📥 Aktuelles Outfit scannen", C.accent, () => {
        const name = prompt("Name:", "Mein Outfit");
        if (!name) return;
        const outfit = EquipManager.captureFromCharacter(window.Player, name);
        Store.saveOutfit(name, outfit);
        toast(`📥 Outfit "${name}" gespeichert (${outfit.items.length} Items)`, "success");
        wrap.replaceWith(this._buildOutfitsPanel());
      }));
      topBar.appendChild(mkBtn("📤 JSON Export", "#1a3a5a", () => {
        const a = Object.assign(document.createElement("a"), {
          href:     URL.createObjectURL(new Blob([Store.exportJSON()], { type:"application/json" })),
          download: "bcaes-outfits.json",
        });
        a.click();
      }));
      topBar.appendChild(mkBtn("📂 JSON Import", "#3a3a1a", () => {
        const inp = Object.assign(document.createElement("input"), { type:"file", accept:".json" });
        inp.onchange = async () => {
          try {
            Store.importJSON(await inp.files[0].text());
            toast("📂 Import erfolgreich!", "success");
            wrap.replaceWith(this._buildOutfitsPanel());
          } catch (e) { toast("❌ Import-Fehler: " + e.message, "error"); }
        };
        inp.click();
      }));
      wrap.appendChild(topBar);

      const names = Store.getOutfitNames();
      if (!names.length) {
        const empty = E("div", { color:C.textMuted, textAlign:"center", marginTop:"60px", fontSize:"15px" });
        empty.textContent = "Noch keine Outfits. Scanne deinen Charakter oder speichere ein Item über den Items-Tab.";
        wrap.appendChild(empty);
        return wrap;
      }

      const grid = E("div", {
        display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(250px, 1fr))", gap:"12px",
      });

      for (const name of names) {
        const outfit = Store.getOutfit(name);
        const card = E("div", {
          background:C.bgCard, border:`1px solid ${C.borderAccent}`,
          borderRadius:"6px", padding:"14px",
        });
        const t = E("div", { fontWeight:"bold", color:C.textTitle, fontSize:"14px", marginBottom:"4px" });
        t.textContent = name;
        const info = E("div", { color:C.textMuted, fontSize:"12px", marginBottom:"10px" });
        info.textContent = `${outfit?.items?.length ?? 0} Items${outfit?.description ? " — " + outfit.description : ""}`;
        const btnRow = E("div", { display:"flex", gap:"6px", flexWrap:"wrap" });
        btnRow.appendChild(mkBtn("▶ Anwenden", C.accent, () => {
          const r = EquipManager.applyOutfit(window.Player, name);
          if (r.errors.length) {
            toast(`⚠ ${r.applied} Items OK, ${r.errors.length} Fehler`, "warn", 5000);
          } else {
            toast(`✅ ${r.applied} Items angewendet!`, "success");
          }
        }));
        btnRow.appendChild(mkBtn("🗑 Löschen", "#4a0000", () => {
          if (confirm(`"${name}" löschen?`)) {
            Store.deleteOutfit(name);
            wrap.replaceWith(this._buildOutfitsPanel());
          }
        }));
        card.append(t, info, btnRow);
        grid.appendChild(card);
      }
      wrap.appendChild(grid);
      return wrap;
    },

    // ── Einstellungen ────────────────────────────────
    _buildSettingsPanel() {
      const wrap = E("div", { flex:"1", padding:"28px", overflowY:"auto" });
      const settings = Store.getSettings();

      const title = E("div", { fontWeight:"bold", color:C.textTitle, fontSize:"16px", marginBottom:"22px" });
      title.textContent = "⚙ Einstellungen";
      wrap.appendChild(title);

      const row = (label, inp) => {
        const r = E("div", { display:"flex", alignItems:"center", gap:"14px", marginBottom:"16px" });
        const l = E("label", { color:C.text, minWidth:"260px" }); l.textContent = label;
        r.append(l, inp); return r;
      };

      const cbAuto = document.createElement("input");
      cbAuto.type = "checkbox"; cbAuto.checked = !!settings.autoApplyOnLogin;
      wrap.appendChild(row("Outfit beim Login automatisch anwenden:", cbAuto));

      const outfitSel = E("select", {
        padding:"6px 10px", background:"#1e2028",
        border:`1px solid ${C.border}`, borderRadius:"4px", color:C.text,
      });
      const noneO = document.createElement("option");
      noneO.value = ""; noneO.textContent = "– keins –";
      outfitSel.appendChild(noneO);
      for (const n of Store.getOutfitNames()) {
        const o = document.createElement("option");
        o.value = n; o.textContent = n;
        if (n === settings.defaultOutfit) o.selected = true;
        outfitSel.appendChild(o);
      }
      wrap.appendChild(row("Standard-Outfit:", outfitSel));

      const saveBtn = E("button", {
        padding:"9px 22px", background:C.accent, border:"none",
        color:"#fff", borderRadius:"4px", cursor:"pointer", fontSize:"13px",
      });
      saveBtn.textContent = "💾 Einstellungen speichern";
      saveBtn.addEventListener("click", () => {
        Store.setSetting("autoApplyOnLogin", cbAuto.checked);
        Store.setSetting("defaultOutfit", outfitSel.value || null);
        toast("✅ Einstellungen gespeichert!", "success");
      });
      wrap.appendChild(saveBtn);

      // Info-Box
      const info = E("div", {
        marginTop:"30px", background:C.bgCard,
        border:`1px solid ${C.border}`, borderRadius:"6px", padding:"14px",
        fontSize:"12px", color:C.textMuted, lineHeight:"1.6",
      });
      info.innerHTML = `
        <b style="color:${C.textTitle}">ℹ Info</b><br>
        Assets gescannt: <b style="color:${C.text}">${Scanner.allFlat().length}</b><br>
        Gruppen: <b style="color:${C.text}">${Scanner.groups.length}</b><br>
        Outfits gespeichert: <b style="color:${C.text}">${Store.getOutfitNames().length}</b><br>
        Speicher-Key: <code>BCAES_v2</code> (localStorage)
      `;
      wrap.appendChild(info);

      // Gefahrenzone
      const dz = E("div", {
        marginTop:"20px", border:"1px solid #600", borderRadius:"6px", padding:"16px",
      });
      const dt = E("div", { color:"#e06070", fontWeight:"bold", marginBottom:"10px" });
      dt.textContent = "⚠ Gefahrenzone";
      const db = E("button", {
        padding:"8px 16px", background:"#600",
        border:"1px solid #800", color:"#fff", borderRadius:"4px", cursor:"pointer",
      });
      db.textContent = "🗑 Alle Daten löschen";
      db.addEventListener("click", () => {
        if (confirm("Wirklich ALLE Outfits und Einstellungen löschen?")) {
          Store.reset();
          toast("🗑 Alle Daten gelöscht.", "warn");
          wrap.replaceWith(this._buildSettingsPanel());
        }
      });
      dz.append(dt, db);
      wrap.appendChild(dz);
      return wrap;
    },
  };

  // ════════════════════════════════════════════════════
  //  INIT
  // ════════════════════════════════════════════════════
  function init() {
    Store.load();
    Scanner.scan();

    if (Scanner.allFlat().length === 0) {
      toast("❌ BCAES: Keine BC-Assets gefunden. Bitte warte bis BC vollständig geladen ist.", "error", 6000);
      return;
    }

    window.__BCAES_LOADED__ = true;
    window.__BCAES__ = { UI, Store, Scanner, EquipManager, LockManager };

    UI.open();
    toast(`✅ BCAES geladen! ${Scanner.allFlat().length} Assets in ${Scanner.groups.length} Gruppen gefunden.`, "success", 4000);

    console.log("[BCAES] ✅ Bereit. window.__BCAES__ für Konsolenzugriff.");
  }

  // Warten bis BC geladen
  function waitForBC(tries = 0) {
    if (window.AssetGroup && window.Player) {
      init();
    } else if (tries < 60) {
      setTimeout(() => waitForBC(tries + 1), 500);
    } else {
      toast("❌ BCAES: BC nicht gefunden nach 30 Sekunden. Bitte BC zuerst laden.", "error", 8000);
      console.error("[BCAES] BC nicht gefunden. window.AssetGroup oder window.Player fehlt.");
    }
  }

  waitForBC();
})();
