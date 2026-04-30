// OneApply – Content Script

(function () {
  "use strict";

  // ── RIS Scoring ──────────────────────────────────────────────────────────────
  function computeRIS(c) {
    let s = 0;
    if      (c.connectionDegree === 1) s += 50;
    else if (c.connectionDegree === 2) s += 20;
    else                               s +=  5;
    if      (c.interactionType === "messaged") s += 25;
    else if (c.interactionType === "met")      s += 20;
    else                                       s -= 30;
    if (c.sharedUniversity)    s += 20;
    if (c.sharedField)         s += 25;
    if (c.sharedCompanyBefore) s += 20;
    const m = c.recencyMonths ?? 999;
    if      (m <= 3)  s += 20;
    else if (m <= 12) s += 10;
    return Math.max(0, Math.min(150, s));
  }

  function risLabel(score) {
    if (score >= 100) return "Strong Match";
    if (score >= 60)  return "Warm Connection";
    return "Not Recommended";
  }

  function risClass(score) {
    if (score >= 100) return "ris-strong";
    if (score >= 60)  return "ris-warm";
    return "ris-cold";
  }

  // ── Page type ─────────────────────────────────────────────────────────────────
  function getPageType() {
    const p = location.pathname.split("/").filter(Boolean);
    if (p[0] === "in") return "profile";
    if (p[0] === "jobs") return "job";
    return null;
  }

  // ── Inject ────────────────────────────────────────────────────────────────────
  function injectButton() {
    document.getElementById("oneapply-btn-wrap")?.remove();
    document.getElementById("oneapply-float")?.remove();

    const type = getPageType();
    if (!type) return;

    const label = type === "profile" ? "Save Contact" : "Track This Job";
    const onClick = type === "profile" ? onSaveContact : onTrackJob;

    // Always-visible floating button
    const floatBtn = document.createElement("button");
    floatBtn.id = "oneapply-float";
    floatBtn.textContent = label;
    floatBtn.addEventListener("click", onClick);
    document.body.appendChild(floatBtn);

    // Inline button (best effort)
    const inlineSelectors = type === "profile"
      ? [".pv-top-card", ".ph5.pb5", "section.artdeco-card", "main > section", "main"]
      : [
          // Job page — try many possible containers
          ".jobs-apply-button--top-card",
          ".jobs-unified-top-card__container--two-pane",
          ".job-details-jobs-unified-top-card__container",
          ".jobs-search__job-details--wrapper",
          ".jobs-details__main-content",
          ".scaffold-layout__detail",
          "main",
        ];

    for (const sel of inlineSelectors) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const wrap = document.createElement("div");
      wrap.id = "oneapply-btn-wrap";
      const btn = document.createElement("button");
      btn.id = "oneapply-inline-btn";
      btn.textContent = label;
      btn.addEventListener("click", onClick);
      wrap.appendChild(btn);
      try { el.insertAdjacentElement("beforebegin", wrap); }
      catch (_) { el.prepend(wrap); }
      break;
    }
  }

  // ── SPA watcher ───────────────────────────────────────────────────────────────
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(injectButton, 1500);
    }
  }).observe(document, { subtree: true, childList: true });

  // ── SAVE CONTACT ──────────────────────────────────────────────────────────────
  function onSaveContact() {
    chrome.storage.local.get({ contacts: [] }, (r) => {
      const url = location.href.split("?")[0];
      if (r.contacts.some((c) => c.profileUrl === url)) {
        showToast("Already saved ✓"); return;
      }
      showModal(extractProfile());
    });
  }

  function extractProfile() {
    let name = "", headline = "", currentTitle = "", company = "",
        loc = "", email = "", phone = "", avatarUrl = "";

    // Name
    for (const sel of ["h1.text-heading-xlarge", "h1.inline.t-24", "h1"]) {
      const t = document.querySelector(sel)?.innerText?.trim();
      if (t && t.length > 1) { name = t; break; }
    }

    // Headline
    for (const sel of [".text-body-medium.break-words", "div.text-body-medium"]) {
      const t = document.querySelector(sel)?.innerText?.trim().replace(/\s+/g, " ");
      if (t && t.length > 3 && !/^(connect|follow|message)/i.test(t)) { headline = t; break; }
    }

    // Current title from headline
    const atM = headline.match(/^(.+?)\s+at\s+/i);
    if (atM) currentTitle = atM[1].trim();
    else currentTitle = headline.split("·")[0].trim();

    // Company from headline
    const coM = headline.match(/\bat\s+([^·|\n]+)/i) || headline.match(/·\s*(.+?)(?:\s*·|$)/);
    if (coM) company = coM[1].trim();

    // Location
    const locEl = document.querySelector(".text-body-small.inline.t-black--light.break-words");
    if (locEl) loc = locEl.innerText.trim();

    // Email (visible on page or contact info)
    const emailEl = document.querySelector("a[href^='mailto:']");
    if (emailEl) email = emailEl.href.replace("mailto:", "").trim();
    if (!email) {
      const m = document.body.innerText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
      if (m) email = m[0];
    }

    // Phone
    const phoneEl = document.querySelector("a[href^='tel:']");
    if (phoneEl) phone = phoneEl.href.replace("tel:", "").trim();

    // Avatar
    const img = document.querySelector(
      "img.pv-top-card-profile-picture__image--show, img.presence-entity__image"
    );
    if (img?.src && !img.src.startsWith("data:")) avatarUrl = img.src;

    return {
      name: name || "—", headline, currentTitle,
      company: company || "—", location: loc,
      email, phone,
      profileUrl: location.href.split("?")[0], avatarUrl,
    };
  }

  // ── TRACK JOB ─────────────────────────────────────────────────────────────────
  function onTrackJob() {
    const floatBtn = document.getElementById("oneapply-float");
    const inlineBtn = document.getElementById("oneapply-inline-btn");

    chrome.storage.local.get({ contacts: [], jobs: [] }, (r) => {
      const url = location.href.split("?")[0];
      if (r.jobs.some((j) => j.jobUrl === url)) {
        showToast("Already tracked ✓");
        setBtn(floatBtn, "Already Tracked ✓", true);
        setBtn(inlineBtn, "Already Tracked ✓", true);
        return;
      }

      // Extract job info — try every possible selector
      const title   = getText([
        "h1.job-title",
        ".jobs-unified-top-card__job-title h1",
        ".job-details-jobs-unified-top-card__job-title h1",
        ".t-24.t-bold.inline",
        "h1",
      ]);

      const company = getText([
        ".job-details-jobs-unified-top-card__company-name a",
        ".jobs-unified-top-card__company-name a",
        ".jobs-unified-top-card__primary-description a",
        "a[data-tracking-control-name*='company']",
      ]);

      const locRaw  = getText([
        ".job-details-jobs-unified-top-card__primary-description-container",
        ".jobs-unified-top-card__primary-description",
        ".jobs-unified-top-card__bullet",
      ]);
      const loc = locRaw ? locRaw.split("·")[0].trim() : "—";

      const descEl  = document.querySelector(
        "#job-details, .jobs-description__content, .jobs-description"
      );
      const description = descEl ? descEl.innerText.trim().slice(0, 3000) : "";

      // Fallback to page title
      let finalTitle = title, finalCompany = company;
      if (!finalTitle) {
        const t = document.title.replace(/\s*[\|–\-]\s*LinkedIn.*$/i, "").trim();
        if (t.includes(" at ")) {
          const parts = t.split(" at ");
          finalTitle   = parts[0].trim();
          finalCompany = finalCompany || parts.slice(1).join(" at ").trim();
        } else {
          finalTitle = t;
        }
      }

      // Match contacts at this company
      const coLow = (finalCompany || "").toLowerCase()
        .replace(/,?\s*(inc\.?|llc|ltd\.?|corp\.?)/gi, "").trim();

      const matchedContactIds = r.contacts.filter((c) => {
        const cl = (c.company || "").toLowerCase();
        const hl = (c.headline || "").toLowerCase();
        return coLow && (cl.includes(coLow) || coLow.includes(cl) || hl.includes(coLow));
      }).map((c) => c.id);

      const job = {
        id: `j_${Date.now()}`,
        title:   finalTitle   || document.title.slice(0, 80) || "Job",
        company: finalCompany || "—",
        location: loc,
        description,
        jobUrl: url,
        savedAt: new Date().toISOString(),
        status: "saved",
        notes: "",
        matchedContactIds,
      };

      chrome.storage.local.set({ jobs: [...r.jobs, job] }, () => {
        const n = matchedContactIds.length;
        const msg = n > 0
          ? `Tracked! 🎯 ${n} referral match${n > 1 ? "es" : ""}`
          : "Job tracked ✓";
        showToast(msg);
        setBtn(floatBtn,   n > 0 ? `🎯 ${n} match${n>1?"es":""}!` : "Tracked ✓", true);
        setBtn(inlineBtn,  n > 0 ? `🎯 ${n} match${n>1?"es":""}!` : "Tracked ✓", true);
      });
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  function getText(selectors) {
    for (const sel of selectors) {
      const t = document.querySelector(sel)?.innerText?.trim().replace(/\s+/g, " ");
      if (t) return t;
    }
    return "";
  }

  function setBtn(btn, text, success) {
    if (!btn) return;
    btn.textContent = text;
    if (success) btn.classList.add("saved");
  }

  function showToast(msg) {
    document.getElementById("oa-toast-page")?.remove();
    const el = document.createElement("div");
    el.id = "oa-toast-page";
    el.textContent = msg;
    Object.assign(el.style, {
      position: "fixed", top: "20px", right: "20px",
      zIndex: "2147483647", background: "#0a66c2", color: "white",
      padding: "10px 18px", borderRadius: "8px",
      fontWeight: "600", fontSize: "14px",
      fontFamily: "-apple-system, sans-serif",
      boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
    });
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  function eh(s) {
    return String(s || "")
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }

  // ── MODAL ─────────────────────────────────────────────────────────────────────
  function showModal(profile) {
    document.getElementById("oneapply-modal")?.remove();
    const modal = document.createElement("div");
    modal.id = "oneapply-modal";
    modal.innerHTML = `
      <div class="oa-backdrop"></div>
      <div class="oa-box">
        <button class="oa-close">✕</button>
        <div class="oa-mhead">
          <div class="oa-mavatar">
            ${profile.avatarUrl ? `<img src="${eh(profile.avatarUrl)}" alt="">` : "👤"}
          </div>
          <div style="flex:1;min-width:0">
            <div class="oa-mname">${eh(profile.name)}</div>
            <div class="oa-mco">${eh(profile.currentTitle)}${profile.company && profile.company !== "—" ? " · " + eh(profile.company) : ""}</div>
            ${profile.email ? `<div class="oa-minfo">✉ ${eh(profile.email)}</div>` : ""}
            ${profile.phone ? `<div class="oa-minfo">📞 ${eh(profile.phone)}</div>` : ""}
          </div>
        </div>

        <div class="oa-qlabel">How are you connected?</div>
        <div class="oa-qrow" id="q-degree">
          <button class="oa-qbtn" data-val="1">1st<span>Direct connection</span></button>
          <button class="oa-qbtn" data-val="2">2nd<span>Through someone</span></button>
          <button class="oa-qbtn" data-val="3">3rd+<span>Not connected</span></button>
        </div>

        <div class="oa-qlabel">Have you ever interacted with them?</div>
        <div class="oa-qrow" id="q-interaction">
          <button class="oa-qbtn" data-val="met">Met IRL<span>Conference, work…</span></button>
          <button class="oa-qbtn" data-val="messaged">Messaged<span>DM, email, call</span></button>
          <button class="oa-qbtn" data-val="none">Never<span>No real contact</span></button>
        </div>

        <div class="oa-qlabel">How long ago?</div>
        <div class="oa-qrow" id="q-recency">
          <button class="oa-qbtn" data-val="2">&lt; 3 months</button>
          <button class="oa-qbtn" data-val="9">3–12 months</button>
          <button class="oa-qbtn" data-val="25">&gt; 1 year</button>
        </div>

        <div class="oa-qlabel">Shared background</div>
        <div class="oa-checks">
          <label><input type="checkbox" id="ch-uni"> Same university</label>
          <label><input type="checkbox" id="ch-field"> Same field / research area</label>
          <label><input type="checkbox" id="ch-co"> Worked at same company before</label>
        </div>

        <input class="oa-note" id="oa-note"
          placeholder='Optional: "Met at NeurIPS 2024"' maxlength="120">

        <div class="oa-score-row">
          <div class="oa-score-circle ris-cold" id="oa-score-num">?</div>
          <div>
            <div class="oa-score-lbl" id="oa-score-lbl">Answer the 3 questions above</div>
            <div style="font-size:11px;color:#999;margin-top:2px">Referral Intelligence Score</div>
          </div>
        </div>
        <button class="oa-save-btn" id="oa-save-btn" disabled>Save Contact</button>
      </div>`;
    document.body.appendChild(modal);

    const state = {
      connectionDegree: null, interactionType: null, recencyMonths: null,
      sharedUniversity: false, sharedField: false, sharedCompanyBefore: false,
    };

    function picker(id, key, transform) {
      modal.querySelectorAll(`#${id} .oa-qbtn`).forEach((b) => {
        b.addEventListener("click", () => {
          modal.querySelectorAll(`#${id} .oa-qbtn`).forEach((x) => x.classList.remove("active"));
          b.classList.add("active");
          state[key] = transform ? transform(b.dataset.val) : b.dataset.val;
          refresh();
        });
      });
    }
    picker("q-degree",      "connectionDegree", Number);
    picker("q-interaction", "interactionType",  null);
    picker("q-recency",     "recencyMonths",    Number);

    [["ch-uni","sharedUniversity"],["ch-field","sharedField"],["ch-co","sharedCompanyBefore"]]
      .forEach(([id, key]) => {
        modal.querySelector(`#${id}`).addEventListener("change", (e) => {
          state[key] = e.target.checked; refresh();
        });
      });

    function refresh() {
      const ready = state.connectionDegree !== null &&
                    state.interactionType  !== null &&
                    state.recencyMonths    !== null;
      modal.querySelector("#oa-save-btn").disabled = !ready;
      const ris = computeRIS(state);
      const circle = modal.querySelector("#oa-score-num");
      circle.textContent = ready ? ris : "?";
      circle.className   = `oa-score-circle ${ready ? risClass(ris) : "ris-cold"}`;
      modal.querySelector("#oa-score-lbl").textContent = ready
        ? risLabel(ris) : "Answer the 3 questions above";
    }

    const close = () => modal.remove();
    modal.querySelector(".oa-close").addEventListener("click", close);
    modal.querySelector(".oa-backdrop").addEventListener("click", close);

    modal.querySelector("#oa-save-btn").addEventListener("click", () => {
      const ris = computeRIS(state);
      const contact = {
        id: `c_${Date.now()}`,
        name: profile.name, currentTitle: profile.currentTitle,
        headline: profile.headline, company: profile.company,
        location: profile.location, email: profile.email, phone: profile.phone,
        profileUrl: profile.profileUrl, avatarUrl: profile.avatarUrl,
        ...state,
        note: modal.querySelector("#oa-note").value.trim(),
        ris, savedAt: new Date().toISOString(),
      };
      chrome.storage.local.get({ contacts: [], jobs: [] }, (r) => {
        const contacts = [...r.contacts, contact];
        const jobs = r.jobs.map((j) => {
          const coLow = (contact.company||"").toLowerCase()
            .replace(/,?\s*(inc\.?|llc|ltd\.?)/gi,"").trim();
          const jLow = (j.company||"").toLowerCase();
          if (coLow && (jLow.includes(coLow) || coLow.includes(jLow)) &&
              !(j.matchedContactIds||[]).includes(contact.id))
            return { ...j, matchedContactIds: [...(j.matchedContactIds||[]), contact.id] };
          return j;
        });
        chrome.storage.local.set({ contacts, jobs }, () => {
          showToast(`Saved! Score: ${ris} · ${risLabel(ris)}`);
          setBtn(document.getElementById("oneapply-float"),   `Saved (${ris}) ✓`, true);
          setBtn(document.getElementById("oneapply-inline-btn"), `Saved (${ris}) ✓`, true);
        });
      });
      close();
    });
  }

  // ── Boot ──────────────────────────────────────────────────────────────────────
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectButton);
  } else {
    injectButton();
  }

})();
