/**
 * ConfigUI.js  – BC-Style Interface
 * Exakt angelehnt an das BC-eigene Item-Konfigurationsfenster:
 *
 *   ┌─────────────────────────────────────────────────────┐
 *   │  🔧 Item Configuration (641 items)  [Items][Outfits][Settings]  ✕ │
 *   ├──────────────────┬──────────────────────────────────┤
 *   │ 🔍 Search items… │  HeavyAnkleCuffs                 │
 *   │──────────────────│  ID: …  Group: …  Extended: No   │
 *   │ HempRope         │──────────────────────────────────│
 *   │   ItemArms•Ext   │  🔒 Lock                         │
 *   │ LeatherBelt      │  [None][Metal][Timer][Password]… │
 *   │   ItemLegs       │──────────────────────────────────│
 *   │ HeavyAnkleCuffs  │  ⚡ Effects                      │
 *   │   ItemFeet       │  [Block][✓BlockWardrobe][Freeze] │
 *   │ ...              │──────────────────────────────────│
 *   │                  │  🎮 Difficulty: 7 ═══════════    │
 *   │                  │──────────────────────────────────│
 *   │                  │  [✅ Apply to Self   ]  [💾 Save] │
 *   └──────────────────┴──────────────────────────────────┘
 */

// ── Farbkonstanten ────────────────────────────────────────
const C = {
  bg:           "#111217",
  bgPanel:      "#181a1f",
  bgSidebar:    "#13151a",
  bgCard:       "#1e2028",
  bgCardHover:  "#252830",
  bgSelected:   "#2a1520",
  accent:       "#8B1A2F",
  accentHover:  "#a52038",
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
  { id:"None",               label:"None"         },
  { id:"MetalPadlock",       label:"Metal"        },
  { id:"TimerPadlock",       label:"Timer"        },
  { id:"PasswordPadlock",    label:"Password"     },
  { id:"CombinationPadlock", label:"Combination"  },
  { id:"HighSecurityPadlock",label:"HighSecurity" },
  { id:"OwnerPadlock",       label:"Owner"        },
  { id:"LoversPadlock",      label:"Lovers"       },
];

const ALL_EFFECTS = [
  "Block","BlockWardrobe","MergedFingers","Freeze",
  "Edge","Deny","Tease","Slow","Chaste","Prone","Spread",
];

// ─────────────────────────────────────────────────────────
export class ConfigUI {
  constructor(addonId, store, scanner, equipMgr, lockMgr) {
    this._id       = addonId;
    this._store    = store;
    this._scanner  = scanner;
    this._equipMgr = equipMgr;
    this._lockMgr  = lockMgr;

    this._root        = null;
    this._activeTab   = "items";
    this._searchQ     = "";
    this._allItems    = [];   // { group, asset:{name,extended,...} }
    this._filtered    = [];
    this._selected    = null; // { group, assetName, cfg }
    this._listEl      = null; // scrollbare Liste
    this._detailEl    = null; // rechtes Panel
    this._lockFieldsEl= null; // dynamische Lock-Felder
  }

  // ── Public ────────────────────────────────────────────
  open()   { if (!this._root) this._root = this._mount(); }
  close()  { this._root?.remove(); this._root = null; }
  toggle() { this._root ? this.close() : this.open(); }

  // ── Mount / Grundgerüst ───────────────────────────────
  _mount() {
    this._allItems = [];
    for (const g of this._scanner.dumpGroups()) {
      for (const a of this._scanner.dumpGroup(g.name)) {
        this._allItems.push({ group: g.name, asset: a });
      }
    }
    this._filtered = [...this._allItems];

    const overlay = E("div", {
      position:"fixed", top:"0", left:"0", width:"100vw", height:"100vh",
      background:"rgba(0,0,0,0.78)", zIndex:"999999",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontFamily:"'Segoe UI',Arial,sans-serif", fontSize:"13px",
    });

    const modal = E("div", {
      width:"1050px", maxWidth:"97vw", height:"700px", maxHeight:"93vh",
      background:C.bg, border:`1px solid ${C.borderAccent}`,
      borderRadius:"6px", display:"flex", flexDirection:"column",
      color:C.text, overflow:"hidden",
      boxShadow:"0 10px 50px rgba(0,0,0,0.9)",
    });

    modal.appendChild(this._buildTopBar());

    // Body-Zeile (Sidebar + Detail)
    this._bodyEl = E("div", { display:"flex", flex:"1", overflow:"hidden" });
    modal.appendChild(this._bodyEl);

    this._renderBody("items");

    overlay.appendChild(modal);
    overlay.addEventListener("click", ev => { if (ev.target === overlay) this.close(); });
    document.body.appendChild(overlay);
    return overlay;
  }

  // ── Top Bar ───────────────────────────────────────────
  _buildTopBar() {
    const bar = E("div", {
      background:"linear-gradient(180deg, #5a1525 0%, #3a0f18 100%)",
      padding:"0 16px",
      display:"flex", alignItems:"center",
      borderBottom:`1px solid ${C.borderAccent}`,
      height:"46px", flexShrink:"0", gap:"2px",
    });

    this._titleEl = E("span", {
      color:"#fff", fontWeight:"bold", fontSize:"15px",
      marginRight:"auto", userSelect:"none",
    });
    this._titleEl.textContent = `🔧 Item Configuration (${this._allItems.length} items)`;

    const tabs = [
      { id:"items",    label:"⬜ Show Items"   },
      { id:"outfits",  label:"👗 Outfits"      },
      { id:"settings", label:"⚙ Einstellungen" },
    ];

    this._tabEls = {};
    for (const t of tabs) {
      const btn = E("button", {
        background:"transparent", border:"none",
        color: t.id === this._activeTab ? "#fff" : "rgba(255,255,255,0.55)",
        padding:"0 15px", height:"46px", cursor:"pointer",
        fontSize:"13px",
        fontWeight: t.id === this._activeTab ? "bold" : "normal",
        borderBottom: t.id === this._activeTab ? "2px solid #fff" : "2px solid transparent",
        transition:"all 0.15s",
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
    closeBtn.textContent = "✕";
    closeBtn.addEventListener("click", () => this.close());

    bar.append(this._titleEl, closeBtn);
    // Insert tabs before close button (after title)
    bar.insertBefore(closeBtn, null);
    for (const btn of Object.values(this._tabEls)) {
      bar.insertBefore(btn, closeBtn);
    }

    return bar;
  }

  _switchTab(tabId) {
    this._activeTab = tabId;
    for (const [id, btn] of Object.entries(this._tabEls)) {
      const on = id === tabId;
      btn.style.color        = on ? "#fff" : "rgba(255,255,255,0.55)";
      btn.style.fontWeight   = on ? "bold" : "normal";
      btn.style.borderBottom = on ? "2px solid #fff" : "2px solid transparent";
    }
    this._renderBody(tabId);
  }

  _renderBody(tabId) {
    this._bodyEl.innerHTML = "";
    if (tabId === "items") {
      const sidebar = this._buildSidebar();
      this._detailEl = this._selected
        ? this._buildDetail(this._selected)
        : this._buildDetailEmpty();
      this._bodyEl.append(sidebar, this._detailEl);
    } else if (tabId === "outfits") {
      this._bodyEl.appendChild(this._buildOutfitsPanel());
    } else {
      this._bodyEl.appendChild(this._buildSettingsPanel());
    }
  }

  // ─────────────────────────────────────────────────────
  //  SIDEBAR
  // ─────────────────────────────────────────────────────
  _buildSidebar() {
    const side = E("div", {
      width:"290px", minWidth:"220px", background:C.bgSidebar,
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
      this._searchQ = searchIn.value.trim().toLowerCase();
      this._filtered = this._searchQ
        ? this._allItems.filter(i =>
            i.asset.name.toLowerCase().includes(this._searchQ) ||
            i.group.toLowerCase().includes(this._searchQ))
        : [...this._allItems];
      this._renderList();
    });
    searchWrap.appendChild(searchIn);
    side.appendChild(searchWrap);

    // Filter-Zeile
    const pills = E("div", {
      display:"flex", gap:"5px", padding:"7px 10px",
      borderBottom:`1px solid ${C.border}`, flexWrap:"wrap",
    });
    const addPill = (label, fn) => {
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
        this._filtered = on
          ? this._allItems.filter(fn)
          : (this._searchQ
              ? this._allItems.filter(i => i.asset.name.toLowerCase().includes(this._searchQ))
              : [...this._allItems]);
        this._renderList();
      });
      pills.appendChild(p);
    };
    addPill("Extended", i => i.asset.extended || i.asset.archetype);
    addPill("Lockable",  i => i.asset.lockable);
    addPill("Has Types", i => i.asset.types?.length > 0);
    side.appendChild(pills);

    // Scrollbare Liste
    this._listEl = E("div", { flex:"1", overflowY:"auto" });
    side.appendChild(this._listEl);

    this._renderList();
    return side;
  }

  _renderList() {
    if (!this._listEl) return;
    this._listEl.innerHTML = "";
    const items = this._filtered.slice(0, 500);

    for (const item of items) {
      const isSelected = this._selected?.group === item.group &&
                         this._selected?.assetName === item.asset.name;

      const row = E("div", {
        padding:"9px 14px", cursor:"pointer",
        borderBottom:`1px solid ${C.border}`,
        background: isSelected ? C.bgSelected : "transparent",
        transition:"background 0.1s",
      });
      row.addEventListener("mouseenter", () => {
        if (!isSelected) row.style.background = C.bgCardHover;
      });
      row.addEventListener("mouseleave", () => {
        if (!isSelected) row.style.background = "transparent";
      });

      const nm = E("div", { fontWeight:"bold", color: isSelected ? C.textTitle : C.text, fontSize:"13px" });
      nm.textContent = item.asset.name;

      const sub = E("div", { fontSize:"11px", color:C.textMuted, marginTop:"2px" });
      sub.textContent = item.group +
        (item.asset.extended || item.asset.archetype ? " • Extended" : "");

      row.append(nm, sub);
      row.addEventListener("click", () => {
        this._selected = {
          group: item.group,
          assetName: item.asset.name,
          cfg: {
            group:    item.group,
            asset:    item.asset.name,
            color:    null,
            type:     null,
            effects:  [],
            property: { Difficulty: 0 },
            lock:     { type: "None" },
          },
        };
        this._renderList(); // Highlighting aktualisieren
        const newDetail = this._buildDetail(this._selected);
        this._detailEl?.replaceWith(newDetail);
        this._detailEl = newDetail;
      });

      this._listEl.appendChild(row);
    }

    if (this._filtered.length > 500) {
      const note = E("div", { padding:"8px 14px", color:C.textMuted, fontSize:"11px" });
      note.textContent = `+ ${this._filtered.length - 500} weitere – Suche verfeinern`;
      this._listEl.appendChild(note);
    }
  }

  // ─────────────────────────────────────────────────────
  //  DETAIL PANEL
  // ─────────────────────────────────────────────────────
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
  }

  _buildDetail(sel) {
    const assetInfo = this._scanner.describe(sel.group, sel.assetName);
    const panel = E("div", {
      flex:"1", display:"flex", flexDirection:"column",
      background:C.bgPanel, overflow:"hidden",
    });

    // ── Scrollbarer Inhalt ────────────────────────────
    const scroll = E("div", { flex:"1", overflowY:"auto", padding:"18px 20px" });

    // Titelkarte
    const titleCard = E("div", {
      background:C.bgCard, border:`1px solid ${C.borderAccent}`,
      borderRadius:"6px", padding:"14px 18px", marginBottom:"18px",
    });
    const h1 = E("div", { fontSize:"24px", fontWeight:"bold", color:C.textTitle, marginBottom:"10px" });
    h1.textContent = sel.assetName;

    const meta = E("div", {
      display:"grid", gridTemplateColumns:"80px 1fr",
      gap:"4px 10px", fontSize:"13px",
    });
    const addMeta = (k, v) => {
      const kEl = E("span", { color:C.textMuted }); kEl.textContent = k + ":";
      const vEl = E("span", { color:C.text });       vEl.textContent = v;
      meta.append(kEl, vEl);
    };
    addMeta("ID",       assetInfo.name);
    addMeta("Group",    assetInfo.group);
    addMeta("Extended", (assetInfo.extended || assetInfo.archetype)
                          ? `Yes (${assetInfo.archetype ?? "extended"})` : "No");
    if (assetInfo.layers)         addMeta("Layers", assetInfo.layers);
    if (assetInfo.types?.length)  addMeta("Types",  assetInfo.types.slice(0,6).join(", "));
    titleCard.append(h1, meta);
    scroll.appendChild(titleCard);

    // Lock
    scroll.appendChild(this._sectionEl("🔒 Lock",       this._buildLockButtons(sel)));
    this._lockFieldsEl = E("div", { marginBottom:"14px" });
    scroll.appendChild(this._lockFieldsEl);

    // Farbe
    scroll.appendChild(this._sectionEl("🎨 Farbe",       this._buildColorInput(sel)));

    // Typ (nur wenn vorhanden)
    if (assetInfo.types?.length) {
      scroll.appendChild(this._sectionEl("🔧 Extended-Typ", this._buildTypeButtons(sel, assetInfo.types)));
    }

    // Effects
    scroll.appendChild(this._sectionEl("⚡ Effects",     this._buildEffectButtons(sel)));

    // Difficulty
    scroll.appendChild(this._sectionEl("🎮 Difficulty",  this._buildDifficultySlider(sel)));

    panel.appendChild(scroll);
    panel.appendChild(this._buildActionBar(sel));
    return panel;
  }

  _sectionEl(title, content) {
    const wrap = E("div", { marginBottom:"18px" });
    const hdr = E("div", {
      fontSize:"14px", fontWeight:"bold", color:C.textTitle,
      marginBottom:"10px", paddingBottom:"6px",
      borderBottom:`1px solid ${C.border}`,
    });
    hdr.textContent = title;
    wrap.append(hdr, content);
    return wrap;
  }

  // ── Lock-Buttons ──────────────────────────────────────
  _buildLockButtons(sel) {
    const row = E("div", { display:"flex", flexWrap:"wrap", gap:"7px" });
    const btns = {};

    const setActive = (id) => {
      sel.cfg.lock = this._lockMgr.createLockConfig(id);
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
        color:      lb.id === "None" ? C.textTitle  : C.textMuted,
        fontWeight: lb.id === "None" ? "bold"       : "normal",
        fontSize:"12px", transition:"all 0.15s",
      });
      b.textContent = lb.label;
      b.addEventListener("click", () => setActive(lb.id));
      b.addEventListener("mouseenter", () => {
        if (sel.cfg.lock?.type !== lb.id) b.style.borderColor = C.accent;
      });
      b.addEventListener("mouseleave", () => {
        if (sel.cfg.lock?.type !== lb.id) b.style.borderColor = C.border;
      });
      btns[lb.id] = b;
      row.appendChild(b);
    }
    return row;
  }

  _renderLockFields(sel) {
    if (!this._lockFieldsEl) return;
    this._lockFieldsEl.innerHTML = "";
    const def = this._lockMgr.getLockTypes().find(l => l.id === sel.cfg.lock?.type);
    if (!def?.configFields?.length) return;

    const box = E("div", {
      background:C.bgCard, border:`1px solid ${C.border}`,
      borderRadius:"6px", padding:"12px 16px",
      display:"flex", flexWrap:"wrap", gap:"14px",
    });

    for (const field of def.configFields) {
      const wrap = E("div", { display:"flex", flexDirection:"column", gap:"5px" });
      const lbl = E("label", { fontSize:"11px", color:C.textMuted });
      lbl.textContent = field.label;

      const inp = E("input", {
        padding:"6px 10px", background:"#1e2028",
        border:`1px solid ${C.border}`, borderRadius:"4px",
        color:C.text, fontSize:"13px", width:"160px",
      });
      inp.setAttribute("type", field.type === "number" ? "number" : "text");
      if (field.min) inp.setAttribute("min", field.min);
      if (field.max) inp.setAttribute("max", field.max);
      inp.value = field.default ?? "";
      inp.addEventListener("input", () => {
        sel.cfg.lock[field.key] = field.type === "number" ? Number(inp.value) : inp.value;
      });
      wrap.append(lbl, inp);
      box.appendChild(wrap);
    }
    this._lockFieldsEl.appendChild(box);
  }

  // ── Farbe ─────────────────────────────────────────────
  _buildColorInput(sel) {
    const row = E("div", { display:"flex", gap:"10px", alignItems:"center" });

    const preview = E("div", {
      width:"30px", height:"30px", borderRadius:"4px",
      border:`1px solid ${C.border}`,
      background: sel.cfg.color ?? "#888888", flexShrink:"0",
    });

    const textInp = E("input", {
      flex:"1", padding:"6px 10px", background:"#1e2028",
      border:`1px solid ${C.border}`, borderRadius:"4px",
      color:C.text, fontSize:"13px",
    });
    textInp.setAttribute("type", "text");
    textInp.setAttribute("placeholder", "#RRGGBB oder Default");
    textInp.value = sel.cfg.color ?? "";
    textInp.addEventListener("input", () => {
      sel.cfg.color = textInp.value.trim() || null;
      preview.style.background = textInp.value.trim() || "#888888";
    });

    const picker = E("input", { width:"32px", height:"32px", cursor:"pointer" });
    picker.setAttribute("type", "color");
    picker.value = sel.cfg.color ?? "#888888";
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
      sel.cfg.color = null;
      textInp.value = "";
      preview.style.background = "#888888";
    });

    row.append(preview, textInp, picker, defBtn);
    return row;
  }

  // ── Typ-Buttons ───────────────────────────────────────
  _buildTypeButtons(sel, types) {
    const row = E("div", { display:"flex", flexWrap:"wrap", gap:"7px" });
    const btns = {};

    const setActive = (t) => {
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
      b.addEventListener("click", () => setActive(t));
      btns[t] = b;
      row.appendChild(b);
    }
    return row;
  }

  // ── Effect-Buttons ────────────────────────────────────
  _buildEffectButtons(sel) {
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
  }

  // ── Difficulty-Slider ─────────────────────────────────
  _buildDifficultySlider(sel) {
    const wrap = E("div", { display:"flex", alignItems:"center", gap:"14px" });

    const valEl = E("span", {
      minWidth:"28px", textAlign:"center",
      fontWeight:"bold", color:C.textTitle, fontSize:"16px",
    });
    valEl.textContent = "0";

    const slider = document.createElement("input");
    slider.type  = "range";
    slider.min   = "0";
    slider.max   = "20";
    slider.value = "0";
    Object.assign(slider.style, { flex:"1", accentColor:C.accentLight, cursor:"pointer" });
    slider.addEventListener("input", () => {
      sel.cfg.property.Difficulty = Number(slider.value);
      valEl.textContent = slider.value;
    });

    wrap.append(slider, valEl);
    return wrap;
  }

  // ── Aktions-Leiste (unten) ────────────────────────────
  _buildActionBar(sel) {
    const bar = E("div", {
      padding:"12px 20px", borderTop:`1px solid ${C.border}`,
      display:"flex", gap:"10px", background:C.bgPanel, flexShrink:"0",
    });

    const applyBtn = E("button", {
      flex:"1", padding:"11px", borderRadius:"4px", cursor:"pointer",
      background:"linear-gradient(180deg, #7a1528 0%, #5a0f1c 100%)",
      border:`1px solid ${C.borderAccent}`,
      color:"#fff", fontWeight:"bold", fontSize:"14px",
      transition:"filter 0.15s",
    });
    applyBtn.textContent = "✅ Apply to Self";
    applyBtn.addEventListener("mouseenter", () => applyBtn.style.filter = "brightness(1.2)");
    applyBtn.addEventListener("mouseleave", () => applyBtn.style.filter = "none");
    applyBtn.addEventListener("click", () => {
      try {
        this._equipMgr._applyItem(Player, sel.cfg, true);
        if (typeof CharacterRefresh === "function") CharacterRefresh(Player);
        this._flash(applyBtn, "✅ Angewendet!", "#2a6b35");
      } catch (err) {
        console.error("[BCAES] Apply error:", err);
        this._flash(applyBtn, "❌ " + err.message, "#6b0000");
      }
    });

    const saveBtn = E("button", {
      width:"130px", padding:"11px", borderRadius:"4px", cursor:"pointer",
      background:"linear-gradient(180deg, #2a6b35 0%, #1a4525 100%)",
      border:"1px solid #2a8b35",
      color:"#fff", fontWeight:"bold", fontSize:"14px",
      transition:"filter 0.15s",
    });
    saveBtn.textContent = "💾 Save";
    saveBtn.addEventListener("mouseenter", () => saveBtn.style.filter = "brightness(1.2)");
    saveBtn.addEventListener("mouseleave", () => saveBtn.style.filter = "none");
    saveBtn.addEventListener("click", () => {
      const name = prompt("In welches Outfit speichern?", `${sel.assetName}-Set`);
      if (!name) return;
      let outfit = this._store.getOutfit(name) ?? this._equipMgr.createOutfit(name);
      this._equipMgr.addItem(outfit, sel.cfg);
      this._store.saveOutfit(name, outfit);
      this._flash(saveBtn, "✅ Gespeichert!", "#1a4060");
    });

    bar.append(applyBtn, saveBtn);
    return bar;
  }

  _flash(btn, msg, color) {
    const orig = btn.textContent, origBg = btn.style.background;
    btn.textContent = msg;
    btn.style.background = color;
    setTimeout(() => { btn.textContent = orig; btn.style.background = origBg; }, 2000);
  }

  // ─────────────────────────────────────────────────────
  //  OUTFITS-PANEL
  // ─────────────────────────────────────────────────────
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
      const outfit = this._equipMgr.captureFromCharacter(Player, name, true);
      this._store.saveOutfit(name, outfit);
      wrap.replaceWith(this._buildOutfitsPanel());
    }));
    topBar.appendChild(mkBtn("📤 JSON Export", "#1a3a5a", () => {
      const a = Object.assign(document.createElement("a"), {
        href: URL.createObjectURL(new Blob([this._store.exportJSON()], { type:"application/json" })),
        download:"bcaes-outfits.json",
      });
      a.click();
    }));
    topBar.appendChild(mkBtn("📂 JSON Import", "#3a3a1a", () => {
      const inp = Object.assign(document.createElement("input"), { type:"file", accept:".json" });
      inp.onchange = async () => {
        try {
          this._store.importJSON(await inp.files[0].text());
          wrap.replaceWith(this._buildOutfitsPanel());
        } catch (e) { alert("Fehler: " + e.message); }
      };
      inp.click();
    }));
    wrap.appendChild(topBar);

    const names = this._store.getOutfitNames();
    if (!names.length) {
      const empty = E("div", { color:C.textMuted, textAlign:"center", marginTop:"60px", fontSize:"15px" });
      empty.textContent = "Noch keine Outfits. Scanne deinen Charakter oder erstelle eines über den Item-Tab.";
      wrap.appendChild(empty);
      return wrap;
    }

    const grid = E("div", {
      display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(250px, 1fr))", gap:"12px",
    });
    for (const name of names) {
      const outfit = this._store.getOutfit(name);
      const card = E("div", {
        background:C.bgCard, border:`1px solid ${C.borderAccent}`,
        borderRadius:"6px", padding:"14px",
      });
      const t = E("div", { fontWeight:"bold", color:C.textTitle, fontSize:"14px", marginBottom:"4px" });
      t.textContent = name;
      const info = E("div", { color:C.textMuted, fontSize:"12px", marginBottom:"10px" });
      info.textContent = `${outfit?.items?.length ?? 0} Items` +
        (outfit?.description ? ` — ${outfit.description}` : "");
      const btnRow = E("div", { display:"flex", gap:"6px" });
      btnRow.appendChild(mkBtn("▶ Anwenden", C.accent, () => {
        const r = this._equipMgr.applyOutfit(Player, name);
        alert(`${r.applied} Items angewendet.${r.errors.length ? "\nFehler:\n" + r.errors.join("\n") : ""}`);
      }));
      btnRow.appendChild(mkBtn("🗑 Löschen", "#4a0000", () => {
        if (confirm(`"${name}" löschen?`)) {
          this._store.deleteOutfit(name);
          wrap.replaceWith(this._buildOutfitsPanel());
        }
      }));
      card.append(t, info, btnRow);
      grid.appendChild(card);
    }
    wrap.appendChild(grid);
    return wrap;
  }

  // ─────────────────────────────────────────────────────
  //  SETTINGS-PANEL
  // ─────────────────────────────────────────────────────
  _buildSettingsPanel() {
    const wrap = E("div", { flex:"1", padding:"28px", overflowY:"auto" });
    const settings = this._store.getSettings();

    const title = E("div", { fontWeight:"bold", color:C.textTitle, fontSize:"16px", marginBottom:"22px" });
    title.textContent = "⚙ Einstellungen";
    wrap.appendChild(title);

    const row = (label, inp) => {
      const r = E("div", { display:"flex", alignItems:"center", gap:"14px", marginBottom:"16px" });
      const l = E("label", { color:C.text, minWidth:"260px" });
      l.textContent = label;
      r.append(l, inp);
      return r;
    };

    const cbAuto = document.createElement("input");
    cbAuto.type    = "checkbox";
    cbAuto.checked = !!settings.autoApplyOnLogin;
    wrap.appendChild(row("Outfit beim Login automatisch anwenden:", cbAuto));

    const outfitSel = E("select", {
      padding:"6px 10px", background:"#1e2028",
      border:`1px solid ${C.border}`, borderRadius:"4px", color:C.text,
    });
    const noneO = document.createElement("option");
    noneO.value = ""; noneO.textContent = "– keins –";
    outfitSel.appendChild(noneO);
    for (const n of this._store.getOutfitNames()) {
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
      this._store.setSetting("autoApplyOnLogin", cbAuto.checked);
      this._store.setSetting("defaultOutfit", outfitSel.value || null);
      this._flash(saveBtn, "✅ Gespeichert!", "#1a4025");
    });
    wrap.appendChild(saveBtn);

    // Gefahrenzone
    const dz = E("div", {
      marginTop:"44px", border:"1px solid #600", borderRadius:"6px", padding:"16px",
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
        this._store.reset();
        wrap.replaceWith(this._buildSettingsPanel());
      }
    });
    dz.append(dt, db);
    wrap.appendChild(dz);
    return wrap;
  }
}

// ─────────────────────────────────────────────────────────
// E() – Style-aware Element-Factory
// ─────────────────────────────────────────────────────────
function E(tag, styles = {}) {
  const el = document.createElement(tag);
  Object.assign(el.style, styles);
  return el;
}
