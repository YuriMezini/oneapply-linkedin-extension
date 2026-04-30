// OneApply – Side Panel Logic

let allJobs = [];
let allContacts = [];
let expandedJobId = null;
let sortCol = "ris";
let sortDir = -1;

const STATUS_META = {
  saved:     { label:"Saved",     cls:"sp-saved",     e:"" },
  applied:   { label:"Applied",   cls:"sp-applied",   e:"✉ " },
  interview: { label:"Interview", cls:"sp-interview", e:"🎙 " },
  offer:     { label:"Offer",     cls:"sp-offer",     e:"🎉 " },
  passed:    { label:"Passed",    cls:"sp-passed",    e:"✕ " },
};

// ─── Init ─────────────────────────────────────────────────────────────────────
function init() {
  chrome.storage.local.get({ jobs:[], contacts:[], apiKey:"" }, (r) => {
    allJobs = r.jobs;
    allContacts = r.contacts;
    renderAll();
  });
}

function renderAll() {
  renderContactsTable(allContacts);
  renderJobs(allJobs);
  updateStats();
}

function updateStats() {
  document.getElementById("stat-jobs").textContent     = allJobs.length;
  document.getElementById("stat-contacts").textContent = allContacts.length;
  document.getElementById("badge-jobs").textContent     = allJobs.length;
  document.getElementById("badge-contacts").textContent = allContacts.length;
  document.getElementById("stat-matches").textContent  =
    allJobs.filter((j) => (j.matchedContactIds||[]).length > 0).length;
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(`${tab.dataset.tab}-panel`).classList.add("active");
  });
});

// ─── RIS helpers ─────────────────────────────────────────────────────────────
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
function badgeCls(score) {
  if (score >= 100) return "badge-strong";
  if (score >= 60)  return "badge-warm";
  return "badge-cold";
}

// ─── Contacts Table ───────────────────────────────────────────────────────────
function renderContactsTable(contacts) {
  const tbody = document.getElementById("contacts-tbody");
  const empty = document.getElementById("contacts-empty");
  const wrap  = document.getElementById("table-wrap");
  tbody.innerHTML = "";

  if (!contacts.length) {
    empty.style.display = "block";
    wrap.style.display  = "none";
    return;
  }
  empty.style.display = "none";
  wrap.style.display  = "block";

  const sorted = [...contacts].sort((a, b) => {
    let va = a[sortCol] ?? "", vb = b[sortCol] ?? "";
    if (sortCol === "ris") { va = Number(va)||0; vb = Number(vb)||0; }
    if (va < vb) return sortDir;
    if (va > vb) return -sortDir;
    return 0;
  });

  sorted.forEach((c) => {
    const cls = risClass(c.ris || 0);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <div class="ris-chip ${cls}">${c.ris ?? "?"}</div>
      </td>
      <td>
        <div class="td-name">${esc(c.name)}</div>
        ${c.profileUrl
          ? `<a class="td-link" href="${esc(c.profileUrl)}" target="_blank">↗ LinkedIn</a>`
          : ""}
      </td>
      <td class="td-muted">${esc(c.currentTitle || c.headline || "—")}</td>
      <td class="td-muted">${esc(c.company || "—")}</td>
      <td>${c.email
          ? `<a class="td-email" href="mailto:${esc(c.email)}">${esc(c.email)}</a>`
          : `<span style="color:#ccc">—</span>`}</td>
      <td class="td-muted">${esc(c.phone || "—")}</td>
      <td style="color:#999;font-style:italic">${esc(c.note || "")}</td>
      <td><span class="badge ${badgeCls(c.ris||0)}">${risLabel(c.ris||0)}</span></td>
      <td><button class="btn-row-del" data-id="${esc(c.id)}">✕</button></td>`;
    tr.querySelector(".btn-row-del").addEventListener("click", () => deleteContact(c.id));
    tbody.appendChild(tr);
  });
}

// Sortable columns
document.querySelectorAll("table.contacts-table th[data-col]").forEach((th) => {
  th.addEventListener("click", () => {
    const col = th.dataset.col;
    sortDir = (sortCol === col) ? sortDir * -1 : (col === "ris" ? -1 : 1);
    sortCol = col;
    const q = document.getElementById("contacts-search").value.toLowerCase();
    renderContactsTable(q ? allContacts.filter((c) => matchContact(c,q)) : allContacts);
  });
});

function matchContact(c, q) {
  return (c.name||"").toLowerCase().includes(q) ||
         (c.company||"").toLowerCase().includes(q) ||
         (c.currentTitle||"").toLowerCase().includes(q) ||
         (c.email||"").toLowerCase().includes(q);
}

document.getElementById("contacts-search").addEventListener("input", (e) => {
  const q = e.target.value.toLowerCase();
  renderContactsTable(q ? allContacts.filter((c) => matchContact(c,q)) : allContacts);
});

// ─── CSV / Sheets export ──────────────────────────────────────────────────────
function contactsToRows() {
  return [...allContacts]
    .sort((a,b) => (b.ris||0)-(a.ris||0))
    .map((c) => [
      c.name, c.currentTitle||c.headline||"", c.company||"",
      c.email||"", c.phone||"",
      c.ris||"", risLabel(c.ris||0),
      c.note||"", c.profileUrl||"",
    ]);
}

const CONTACT_HEADERS = ["Name","Title at Company","Company","Email","Phone",
  "RIS Score","Match Level","Note","LinkedIn URL"];

document.getElementById("export-csv").addEventListener("click", () => {
  if (!allContacts.length) { toast("No contacts yet"); return; }
  const rows = contactsToRows();
  dl([CONTACT_HEADERS,...rows].map((r)=>r.map(csvCell).join(",")).join("\n"),
    "oneapply-contacts.csv","text/csv");
  toast("CSV downloaded ✓");
});

document.getElementById("s-export-contacts").addEventListener("click", () => {
  document.getElementById("export-csv").click();
});

document.getElementById("copy-sheets").addEventListener("click", () => {
  if (!allContacts.length) { toast("No contacts yet"); return; }
  const tsv = [CONTACT_HEADERS,...contactsToRows()].map((r)=>r.join("\t")).join("\n");
  navigator.clipboard.writeText(tsv)
    .then(() => toast("Copied! Open Google Sheets → paste Ctrl+V 🎉"))
    .catch(() => {
      dl(tsv,"oneapply-sheets.tsv","text/tab-separated-values");
      toast("Downloaded — drag file into Google Sheets");
    });
});

// ─── Delete contact ───────────────────────────────────────────────────────────
function deleteContact(id) {
  if (!confirm("Remove this contact?")) return;
  allContacts = allContacts.filter((c) => c.id !== id);
  allJobs = allJobs.map((j) => ({
    ...j, matchedContactIds:(j.matchedContactIds||[]).filter((x)=>x!==id),
  }));
  chrome.storage.local.set({ contacts:allContacts, jobs:allJobs }, () => {
    renderAll(); toast("Contact removed");
  });
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────
document.getElementById("jobs-search").addEventListener("input", (e) => {
  const q = e.target.value.toLowerCase();
  renderJobs(q ? allJobs.filter((j) =>
    j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q)) : allJobs);
});

function renderJobs(jobs) {
  const list = document.getElementById("jobs-list");
  list.innerHTML = "";
  if (!jobs.length) {
    list.innerHTML = `<div class="empty"><div class="big">💼</div>
      <p>No jobs tracked yet.<br/>Visit a LinkedIn job listing and click<br/>
      <strong>Track This Job</strong>.</p></div>`;
    return;
  }
  [...jobs].sort((a,b)=>new Date(b.savedAt)-new Date(a.savedAt))
    .forEach((job) => list.appendChild(buildJobCard(job)));
}

function buildJobCard(job) {
  const card = document.createElement("div");
  card.className = "job-card" + (expandedJobId===job.id?" expanded":"");
  const matchCount = (job.matchedContactIds||[]).length;
  const sm = STATUS_META[job.status]||STATUS_META.saved;
  const dateStr = job.savedAt
    ? new Date(job.savedAt).toLocaleDateString("en-US",{month:"short",day:"numeric"}) : "";
  const matchedContacts = (job.matchedContactIds||[])
    .map((id)=>allContacts.find((c)=>c.id===id)).filter(Boolean)
    .sort((a,b)=>(b.ris||0)-(a.ris||0));

  card.innerHTML = `
    <div class="job-header">
      <div class="job-top">
        <div style="flex:1;min-width:0">
          <div class="job-title">${esc(job.title)}</div>
          <div class="job-company">${esc(job.company)}</div>
        </div>
        <button class="btn-del" data-id="${esc(job.id)}">✕</button>
      </div>
      <div class="job-meta">
        <span class="sp ${sm.cls}">${sm.e}${sm.label}</span>
        ${matchCount>0?`<span class="match-pill">🎯 ${matchCount} match${matchCount>1?"es":""}</span>`:""}
        <span class="job-date">${dateStr}</span>
      </div>
    </div>
    <div class="job-detail">

      <div class="det-section">
        <div class="det-label">Status</div>
        <select class="status-sel" data-id="${esc(job.id)}">
          ${Object.entries(STATUS_META).map(([k,v])=>
            `<option value="${k}" ${job.status===k?"selected":""}>${v.e}${v.label}</option>`
          ).join("")}
        </select>
      </div>

      <div class="det-section">
        <div class="det-label">Referral Connections (${matchCount})</div>
        ${matchCount>0
          ? `<div class="ref-list">${matchedContacts.map((c)=>`
              <a class="ref-card" href="${esc(c.profileUrl)}" target="_blank">
                <div class="ris-chip ${risClass(c.ris||0)}" style="width:38px;height:38px;font-size:13px">${c.ris||"?"}</div>
                <div class="ref-info">
                  <div class="ref-name">${esc(c.name)}</div>
                  <div class="ref-role">${esc(c.currentTitle||"")} · ${esc(c.company||"")}</div>
                  ${c.email?`<div class="ref-contact">✉ ${esc(c.email)}</div>`:""}
                  ${c.phone?`<div class="ref-contact">📞 ${esc(c.phone)}</div>`:""}
                </div>
                <span class="badge ${badgeCls(c.ris||0)}">${risLabel(c.ris||0)}</span>
              </a>`).join("")}</div>`
          : `<div style="font-size:12px;color:#999;padding:4px 0">
               No saved contacts at <strong>${esc(job.company)}</strong> yet.<br/>
               Visit their LinkedIn profiles and click Save Contact.
             </div>`}
      </div>

      <!-- AI SECTION (optional — only shows if contacts exist) -->
      ${matchCount>0 ? `
      <div class="det-section ai-section">
        <button class="ai-toggle" data-job="${esc(job.id)}">✦ Get AI outreach strategy (optional)</button>
        <div class="ai-body" id="ai-body-${esc(job.id)}">
          <div class="ai-key-row">
            <input class="ai-key-input" id="ai-key-${esc(job.id)}"
              type="password" placeholder="Paste Claude API key (sk-ant-…) — optional" />
            <button class="ai-btn" id="ai-run-${esc(job.id)}"
              style="width:auto;padding:7px 14px;font-size:12px">Ask Claude</button>
          </div>
          <div style="font-size:11px;color:#999;margin-bottom:8px">
            Free to get at <a href="https://console.anthropic.com" target="_blank" style="color:#0a66c2">console.anthropic.com</a> · stored locally only
          </div>
          <div class="ai-output" id="ai-out-${esc(job.id)}"></div>
        </div>
      </div>` : ""}

      <div class="det-section">
        <div class="det-label">Notes</div>
        <textarea class="notes-ta" data-id="${esc(job.id)}"
          placeholder="Track your progress…">${esc(job.notes||"")}</textarea>
        <button class="btn-sm save-notes-btn" data-id="${esc(job.id)}">Save Notes</button>
      </div>

      <div class="det-section">
        <a class="open-link" href="${esc(job.jobUrl)}" target="_blank">↗ Open on LinkedIn</a>
      </div>
    </div>`;

  // Expand/collapse
  card.querySelector(".job-header").addEventListener("click",(e)=>{
    if (e.target.classList.contains("btn-del")) return;
    const was = card.classList.contains("expanded");
    document.querySelectorAll(".job-card").forEach((c)=>c.classList.remove("expanded"));
    expandedJobId = null;
    if (!was) { card.classList.add("expanded"); expandedJobId = job.id; }
  });

  card.querySelector(".btn-del").addEventListener("click",(e)=>{
    e.stopPropagation(); deleteJob(job.id);
  });
  card.querySelector(".status-sel")?.addEventListener("change",(e)=>{
    e.stopPropagation(); updateStatus(job.id, e.target.value);
  });
  card.querySelector(".save-notes-btn")?.addEventListener("click",(e)=>{
    e.stopPropagation();
    saveNotes(job.id, card.querySelector(".notes-ta").value);
  });

  // AI toggle
  card.querySelector(".ai-toggle")?.addEventListener("click",(e)=>{
    e.stopPropagation();
    const body = document.getElementById(`ai-body-${job.id}`);
    body.classList.toggle("open");
  });

  card.querySelector(`#ai-run-${job.id}`)?.addEventListener("click",(e)=>{
    e.stopPropagation();
    const key = document.getElementById(`ai-key-${job.id}`).value.trim();
    if (!key) { toast("Paste your Claude API key first"); return; }
    runAI(job, matchedContacts, key,
      document.getElementById(`ai-run-${job.id}`),
      document.getElementById(`ai-out-${job.id}`)
    );
  });

  return card;
}

// ─── Job ops ──────────────────────────────────────────────────────────────────
function deleteJob(id) {
  if (!confirm("Remove this job?")) return;
  allJobs = allJobs.filter((j)=>j.id!==id);
  if (expandedJobId===id) expandedJobId = null;
  chrome.storage.local.set({jobs:allJobs},()=>{ renderJobs(allJobs); updateStats(); toast("Job removed"); });
}
function updateStatus(id,status) {
  allJobs = allJobs.map((j)=>j.id===id?{...j,status}:j);
  chrome.storage.local.set({jobs:allJobs},()=>{ updateStats(); toast("Status updated ✓"); });
}
function saveNotes(id,notes) {
  allJobs = allJobs.map((j)=>j.id===id?{...j,notes}:j);
  chrome.storage.local.set({jobs:allJobs},()=>toast("Notes saved ✓"));
}

// ─── AI (optional, per-job) ───────────────────────────────────────────────────
async function runAI(job, contacts, apiKey, btn, outEl) {
  btn.disabled = true;
  btn.innerHTML = `<span class="ai-spinner"></span>`;
  const list = contacts.map((c,i)=>
    `${i+1}. ${c.name} | ${c.currentTitle||c.headline} @ ${c.company} | RIS:${c.ris} (${risLabel(c.ris||0)})`
  ).join("\n");
  const prompt = `Strategic job search advisor.
JOB: ${job.title} at ${job.company}
CONTACTS: ${list}
Return ONLY valid JSON: {"insight":"2 sentences","rankedContacts":[{"name":"...","why":"..."}],"outreachMessage":"under 90 words, warm, NOT asking for referral"}
Only include contacts with RIS>=60.`;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",
      headers:{"Content-Type":"application/json","x-api-key":apiKey,
        "anthropic-version":"2023-06-01",
        "anthropic-dangerous-direct-browser-access":"true"},
      body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:900,
        messages:[{role:"user",content:prompt}]}),
    });
    if (!res.ok) { const e=await res.json().catch(()=>({})); throw new Error(e.error?.message||`Error ${res.status}`); }
    const data = await res.json();
    const raw  = data.content?.find((b)=>b.type==="text")?.text||"";
    const parsed = JSON.parse(raw.replace(/```json\n?|```/g,"").trim());
    renderAI(parsed, contacts, outEl);
    btn.innerHTML = "Refresh";
  } catch(err) {
    outEl.classList.add("visible");
    outEl.innerHTML = `<div style="color:#c0392b;font-size:12px">⚠ ${esc(err.message)}</div>`;
    btn.innerHTML = "Try Again";
  } finally { btn.disabled = false; }
}

function renderAI(parsed, contacts, outEl) {
  outEl.classList.add("visible");
  let html = "";
  if (parsed.insight)
    html += `<div class="ai-st">Strategic Insight</div>
      <div style="color:#333;font-size:12px;line-height:1.6">${esc(parsed.insight)}</div>`;
  if (parsed.rankedContacts?.length) {
    html += `<div class="ai-st">Best people to reconnect with</div>`;
    parsed.rankedContacts.forEach((p,i)=>{
      const c = contacts.find((x)=>x.name===p.name);
      html += `<div class="ai-person">
        <div class="ai-pname"><span class="badge ${badgeCls(c?.ris||0)}" style="margin-right:5px">${c?.ris||""}</span>${i+1}. ${esc(p.name)}</div>
        <div class="ai-preason">${esc(p.why)}</div>
      </div>`;
    });
  }
  if (parsed.outreachMessage) {
    html += `<div class="ai-st">Suggested outreach message</div>
      <div class="ai-msg">${esc(parsed.outreachMessage)}</div>
      <button class="ai-copy" id="ai-copy-btn">📋 Copy message</button>`;
  }
  outEl.innerHTML = html;
  document.getElementById("ai-copy-btn")?.addEventListener("click",()=>{
    navigator.clipboard.writeText(parsed.outreachMessage).then(()=>{
      document.getElementById("ai-copy-btn").textContent = "✓ Copied!";
      setTimeout(()=>{ document.getElementById("ai-copy-btn").textContent = "📋 Copy message"; },2000);
    });
  });
}

// ─── Settings exports ─────────────────────────────────────────────────────────
document.getElementById("s-export-jobs").addEventListener("click",()=>{
  if (!allJobs.length) { toast("No jobs"); return; }
  const h = ["Title","Company","Location","Status","Date","Matched Contacts","URL"];
  const rows = allJobs.map((j)=>[
    j.title, j.company, j.location, j.status, j.savedAt,
    (j.matchedContactIds||[]).map((id)=>allContacts.find((c)=>c.id===id)?.name||"").filter(Boolean).join("; "),
    j.jobUrl,
  ].map(csvCell));
  dl([h,...rows].map((r)=>r.join(",")).join("\n"),"oneapply-jobs.csv","text/csv");
  toast("Jobs CSV downloaded");
});

document.getElementById("s-export-json").addEventListener("click",()=>{
  dl(JSON.stringify({jobs:allJobs,contacts:allContacts,exportedAt:new Date().toISOString()},null,2),
    "oneapply-backup.json","application/json");
  toast("Backup downloaded");
});

document.getElementById("s-import-json").addEventListener("change",(e)=>{
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev)=>{
    try {
      const {jobs=[],contacts=[]} = JSON.parse(ev.target.result);
      const ej = new Set(allJobs.map((j)=>j.jobUrl));
      const ec = new Set(allContacts.map((c)=>c.profileUrl));
      allJobs = [...allJobs,...jobs.filter((j)=>!ej.has(j.jobUrl))];
      allContacts = [...allContacts,...contacts.filter((c)=>!ec.has(c.profileUrl))];
      chrome.storage.local.set({jobs:allJobs,contacts:allContacts},()=>{renderAll();toast("Imported ✓");});
    } catch { toast("⚠ Invalid file"); }
  };
  reader.readAsText(file); e.target.value="";
});

document.getElementById("clear-jobs").addEventListener("click",()=>{
  if (!confirm("Delete all jobs?")) return;
  allJobs = [];
  chrome.storage.local.set({jobs:[]},()=>{renderAll();toast("Jobs cleared");});
});
document.getElementById("clear-contacts").addEventListener("click",()=>{
  if (!confirm("Delete all contacts?")) return;
  allContacts = [];
  allJobs = allJobs.map((j)=>({...j,matchedContactIds:[]}));
  chrome.storage.local.set({contacts:[],jobs:allJobs},()=>{renderAll();toast("Contacts cleared");});
});

// ─── Live sync ────────────────────────────────────────────────────────────────
chrome.storage.onChanged.addListener((changes)=>{
  if (changes.jobs)     allJobs     = changes.jobs.newValue||[];
  if (changes.contacts) allContacts = changes.contacts.newValue||[];
  if (changes.jobs||changes.contacts) renderAll();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function esc(s) {
  return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
function csvCell(v) {
  const s = String(v??"");
  if (s.includes(",")||s.includes('"')||s.includes("\n")) return `"${s.replace(/"/g,'""')}"`;
  return s;
}
function dl(content,name,mime) {
  const a = Object.assign(document.createElement("a"),{
    href:URL.createObjectURL(new Blob([content],{type:mime})),download:name,
  });
  a.click(); URL.revokeObjectURL(a.href);
}
function toast(msg) {
  const el = document.getElementById("oa-toast");
  el.textContent = msg; el.classList.add("show");
  setTimeout(()=>el.classList.remove("show"),2800);
}

init();
