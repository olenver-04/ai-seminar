(function () {
  "use strict";
  const S = window.SEMINAR;
  const $ = (s) => document.querySelector(s);
  const toolById = Object.fromEntries(S.tools.map((t) => [t.id, t]));
  const FORMAT = {
    pdf: { label: "PDF", icon: "📄" },
    html: { label: "HTML", icon: "🌐" }
  };
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- state (localStorage): ручные голоса и раскрытые ответы ---------- */
  const KEY = "ai-seminar-state-v1";
  let state = { votes: {}, revealed: {} };
  try { state = Object.assign(state, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} };
  const manualOf = (id) => (state.votes[id] = state.votes[id] || {});

  /* ---------- голосование с телефонов (Firebase Realtime Database) ---------- */
  const LIVE = !!(S.firebase && S.firebase.databaseURL && window.firebase);
  let ready = false; // данные из базы могут прийти раньше, чем страница готова
  let root = null, online = {}, voters = 0, connected = false;
  let rawVotes = {}, ratings = {}, names = {}, warmupData = {}; // votes/{work}/{voter}, ratings/{work}/{voter}/{crit}, names/{voter}
  const voteUrl = new URL("vote.html", location.href).href;

  if (LIVE) {
    try {
      firebase.initializeApp(S.firebase);
      const db = firebase.database();
      root = db.ref("sessions/" + (S.session || "seminar"));
      root.child("votes").on("value", (snap) => {
        const all = snap.val() || {}, people = new Set();
        rawVotes = all; online = {};
        Object.keys(all).forEach((w) => {
          const o = (online[w] = {});
          Object.entries(all[w] || {}).forEach(([voter, ai]) => { o[ai] = (o[ai] || 0) + 1; people.add(voter); });
        });
        voters = people.size;
        liveUpdate();
      });
      root.child("ratings").on("value", (s) => { ratings = s.val() || {}; liveUpdate(); });
      root.child("names").on("value", (s) => { names = s.val() || {}; liveUpdate(); });
      root.child("warmup").on("value", (s) => { warmupData = s.val() || {}; liveUpdate(); });
      db.ref(".info/connected").on("value", (s) => { connected = !!s.val(); liveUpdate(); });
    } catch (e) { console.error("Firebase:", e); root = null; }
  }
  // Управлять телефонами (какая работа открыта, раскрытие, сброс) может только ведущий.
  // По умолчанию ведущий — любой компьютер (мышь/тачпад); телефоны и планшеты — нет.
  // Переопределить в конкретном браузере: ...?host — включить, ...?host=off — выключить (запоминается).
  let HOST = matchMedia("(pointer: fine)").matches;
  try {
    const p = new URLSearchParams(location.search).get("host");
    if (p !== null) localStorage.setItem("ai-seminar-host", p === "off" ? "off" : "on");
    const saved = localStorage.getItem("ai-seminar-host");
    if (saved === "on" || saved === "1") HOST = true;
    if (saved === "off") HOST = false;
  } catch (e) {}
  const ctl = () => (HOST ? root : null);
  const dbSet = (path, val) => { if (ctl()) ctl().child(path).set(val).catch((e) => console.error(e)); };

  const countsOf = (id) => {
    const m = manualOf(id), o = online[id] || {}, r = {};
    S.tools.forEach((t) => (r[t.id] = (m[t.id] || 0) + (o[t.id] || 0)));
    return r;
  };
  const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  const totalOf = (id) => sum(countsOf(id));
  const onlineOf = (id) => S.tools.reduce((n, t) => n + ((online[id] || {})[t.id] || 0), 0);

  /* ---------- QR ---------- */
  function qrSvg(text) {
    if (!window.qrcode) return "";
    const q = qrcode(0, "M"); q.addData(text); q.make();
    return q.createSvgTag({ cellSize: 8, margin: 2, scalable: true });
  }
  const shortUrl = voteUrl.replace(/^https?:\/\//, "");
  const overlay = $("#qrOverlay");
  function openQr() {
    overlay.hidden = false;
    $("#qrBig").innerHTML = LIVE ? qrSvg(voteUrl) : "";
    $("#qrUrl").textContent = LIVE ? shortUrl : "";
    updateQrCount();
  }
  function updateQrCount() {
    $("#qrCount").textContent = !LIVE
      ? "Голосование с телефонов не настроено: заполните блок firebase в js/data.js (см. README)."
      : voters ? `Уже проголосовали: ${voters} чел.` : "Пока никто не голосовал.";
  }
  const closeQr = () => (overlay.hidden = true);
  $("#qrTopBtn").onclick = openQr;
  $("#qrHeroBtn").onclick = openQr;
  $("#qrSmall").onclick = openQr;
  $("#qrClose").onclick = closeQr;
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeQr(); });
  if (LIVE) {
    $("#heroQr").hidden = false;
    $("#heroQrImg").innerHTML = qrSvg(voteUrl);
    $("#qrSmall").innerHTML = qrSvg(voteUrl);
  } else {
    $("#qrSmall").hidden = true;
  }

  /* ---------- theme ---------- */
  try { const t = localStorage.getItem("ai-seminar-theme"); if (t) document.documentElement.dataset.theme = t; } catch (e) {}
  $("#themeBtn").onclick = () => {
    const cur = document.documentElement.dataset.theme ||
      (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("ai-seminar-theme", next); } catch (e) {}
  };

  /* ---------- hero ---------- */
  $("#heroTitle").textContent = S.title;
  $("#heroSubtitle").textContent = S.subtitle;
  $("#heroTopic").textContent = S.topic;
  $("#heroAuthor").textContent = S.author;
  $("#aiChips").innerHTML = S.tools.map((t) =>
    `<span class="chip" style="--c:${t.color}"><span class="dot"></span>${esc(t.name)}</span>`).join("");

  /* ---------- cards ---------- */
  let filter = "all";
  $("#filters").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    filter = b.dataset.f;
    document.querySelectorAll("#filters button").forEach((x) => x.classList.toggle("active", x === b));
    renderGrid();
  });

  function renderGrid() {
    const list = S.works.filter((w) => filter === "all" || w.format === filter);
    $("#grid").innerHTML = list.map((w) => {
      const i = S.works.indexOf(w) + 1;
      const f = FORMAT[w.format] || { label: w.format, icon: "📁" };
      const t = toolById[w.ai];
      const n = totalOf(w.id);
      return `<button class="card" data-id="${w.id}">
        <div class="card-thumb"><span class="num">${i}</span></div>
        <div class="card-body">
          <h3>${esc(w.title)}</h3>
          <div class="card-meta">
            <span class="badge">${f.icon} ${f.label}</span>
            ${n ? `<span class="badge votes">${n} гол.</span>` : ""}
            ${state.revealed[w.id] && t ? `<span class="badge ai" style="--c:${t.color}">${esc(t.name)}</span>` : ""}
          </div>
        </div>
      </button>`;
    }).join("") || `<p class="hint">Нет работ в этом формате.</p>`;
  }
  $("#grid").addEventListener("click", (e) => {
    const c = e.target.closest(".card"); if (c) openViewer(c.dataset.id);
  });

  /* ---------- results ---------- */
  function computeStats() {
    let votes = 0, correct = 0, revealedVotes = 0;
    const perAi = Object.fromEntries(S.tools.map((t) => [t.id, { v: 0, c: 0 }]));
    S.works.forEach((w) => {
      const n = totalOf(w.id); votes += n;
      if (state.revealed[w.id] && perAi[w.ai]) {
        const c = countsOf(w.id)[w.ai] || 0;
        revealedVotes += n; correct += c;
        perAi[w.ai].v += n; perAi[w.ai].c += c;
      }
    });
    return { votes, correct, revealedVotes, perAi };
  }
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : null);

  /* ---------- оценки качества и рейтинг участников ---------- */
  const CRIT = S.criteria || [];
  const fmt1 = (x) => (x == null ? "—" : x.toFixed(1).replace(".", ","));
  function qualityOf(workId) {
    const per = {}, all = { sum: 0, n: 0 };
    let people = 0;
    CRIT.forEach((c) => (per[c.id] = { sum: 0, n: 0 }));
    Object.values(ratings[workId] || {}).forEach((r) => {
      people++;
      CRIT.forEach((c) => { const v = +r[c.id]; if (v >= 1 && v <= 5) { per[c.id].sum += v; per[c.id].n++; all.sum += v; all.n++; } });
    });
    const avg = (o) => (o.n ? o.sum / o.n : null);
    return { crit: Object.fromEntries(CRIT.map((c) => [c.id, avg(per[c.id])])), total: avg(all), people };
  }
  const workLabel = (w, withAi) => {
    const i = S.works.indexOf(w) + 1, t = toolById[w.ai];
    return `Работа ${i}` + (withAi && t ? ` <span class="badge ai" style="--c:${t.color}">${esc(t.name)}</span>` : "");
  };
  function renderQuality() {
    if (!CRIT.length) { $("#qualityTable").innerHTML = ""; return; }
    const q = Object.fromEntries(S.works.map((w) => [w.id, qualityOf(w.id)]));
    const best = (getter) => Math.max(...S.works.map((w) => getter(q[w.id]) ?? -1));
    const cell = (v, b) => `<td class="num${v != null && v === b ? " best" : ""}">${v == null ? "—" : `${fmt1(v)} <span class="st">★</span>`}</td>`;
    const head = `<tr><th>Критерий</th>${S.works.map((w) => `<th>${workLabel(w, state.revealed[w.id])}</th>`).join("")}</tr>`;
    const rows = CRIT.map((c) => { const b = best((x) => x.crit[c.id]); return `<tr><td>${esc(c.label)}</td>${S.works.map((w) => cell(q[w.id].crit[c.id], b)).join("")}</tr>`; }).join("");
    const bt = best((x) => x.total);
    const total = `<tr class="total-row"><td><b>Средний балл</b></td>${S.works.map((w) => cell(q[w.id].total, bt)).join("")}</tr>`;
    const people = `<tr><td class="hint">Оценили</td>${S.works.map((w) => `<td class="num hint">${q[w.id].people} чел.</td>`).join("")}</tr>`;
    $("#qualityTable").innerHTML = `<thead>${head}</thead><tbody>${rows}${total}${people}</tbody>`;
  }
  function leaderboard() {
    const revealedWorks = S.works.filter((w) => state.revealed[w.id]);
    const ids = new Set(Object.keys(names));
    Object.values(rawVotes).forEach((o) => Object.keys(o || {}).forEach((v) => ids.add(v)));
    const rows = [...ids].map((id) => {
      let ok = 0, n = 0, rs = 0, rn = 0;
      revealedWorks.forEach((w) => { const v = (rawVotes[w.id] || {})[id]; if (v) { n++; if (v === w.ai) ok++; } });
      Object.values(ratings).forEach((byVoter) => Object.values((byVoter || {})[id] || {}).forEach((v) => { if (+v) { rs += +v; rn++; } }));
      return { id, name: names[id] || "Без имени", ok, n, avgRate: rn >= 3 ? rs / rn : null };
    });
    rows.sort((a, b) => b.ok - a.ok || b.n - a.n || a.name.localeCompare(b.name, "ru"));
    return { rows, revealedCount: revealedWorks.length };
  }
  function renderLeader() {
    const { rows, revealedCount } = leaderboard();
    if (!rows.length) { $("#leaderBox").innerHTML = `<p class="hint">Пока никто не голосовал с телефона.</p>`; return; }
    const medal = (i) => ["🥇", "🥈", "🥉"][i] || `${i + 1}.`;
    const raters = rows.filter((r) => r.avgRate != null).sort((a, b) => a.avgRate - b.avgRate);
    $("#leaderBox").innerHTML = (revealedCount ? "" : `<p class="hint">Очки появятся после раскрытия первого ответа. Участников: ${rows.length}.</p>`) +
      `<ol class="leader-list">${rows.slice(0, 15).map((r, i) => `<li><span class="pos">${revealedCount ? medal(i) : "•"}</span><span class="nm">${esc(r.name)}</span><span class="sc">${revealedCount ? `${r.ok} из ${r.n}` : ""}</span></li>`).join("")}</ol>` +
      (rows.length > 15 ? `<p class="hint">…и ещё ${rows.length - 15}</p>` : "") +
      (raters.length >= 2 ? `<p class="hint">😤 Самый строгий оценщик: <b>${esc(raters[0].name)}</b> (${fmt1(raters[0].avgRate)} ★) · 😊 самый щедрый: <b>${esc(raters[raters.length - 1].name)}</b> (${fmt1(raters[raters.length - 1].avgRate)} ★)</p>` : "");
  }

  /* ---------- итоги на весь экран ---------- */
  const finalOverlay = $("#finalOverlay");
  function renderFinal() {
    const scored = S.works.map((w) => ({ w, q: qualityOf(w.id) })).filter((x) => x.q.total != null).sort((a, b) => b.q.total - a.q.total);
    const allRevealed = S.works.every((w) => state.revealed[w.id]);
    $("#finalBest").innerHTML = !scored.length ? `<p class="hint">Оценок пока нет.</p>` :
      `<ol class="final-rank">${scored.map(({ w, q }, i) => {
        const t = toolById[w.ai], show = state.revealed[w.id];
        return `<li class="${i === 0 ? "first" : ""}" style="--c:${show && t ? t.color : "var(--accent)"}">
          <span class="pos">${["🥇", "🥈", "🥉"][i] || i + 1}</span>
          <span class="nm">${show && t ? esc(t.name) : `Работа ${S.works.indexOf(w) + 1}`}</span>
          <span class="bar"><i style="width:${(q.total / 5) * 100}%"></i></span>
          <span class="sc">${fmt1(q.total)} ★</span></li>`;
      }).join("")}</ol>`;
    const { rows, revealedCount } = leaderboard();
    $("#finalPodium").innerHTML = !revealedCount || !rows.length ? `<p class="hint">Появится после раскрытия ответов.</p>` :
      `<ol class="final-rank people">${rows.slice(0, 5).map((r, i) => `<li class="${i === 0 ? "first" : ""}">
        <span class="pos">${["🥇", "🥈", "🥉"][i] || i + 1}</span><span class="nm">${esc(r.name)}</span>
        <span class="sc">${r.ok} из ${r.n}</span></li>`).join("")}</ol>`;
    $("#finalNote").textContent = allRevealed ? "" : "Не все ответы раскрыты — названия ИИ скрыты до раскрытия.";
  }
  const openFinal = () => { renderFinal(); finalOverlay.hidden = false; };
  const closeFinal = () => (finalOverlay.hidden = true);
  $("#finalBtn").onclick = openFinal;
  $("#finalClose").onclick = closeFinal;
  finalOverlay.addEventListener("click", (e) => { if (e.target === finalOverlay) closeFinal(); });

  /* ---------- разминка ---------- */
  const WU = S.warmup || [];
  const wuOverlay = $("#warmupOverlay");
  function renderWarmup() {
    const people = new Set();
    WU.forEach((q) => Object.keys(warmupData[q.id] || {}).forEach((v) => people.add(v)));
    $("#wuCount").textContent = people.size ? `Ответили: ${people.size} чел.` : "Ждём первых ответов…";
    $("#wuCharts").innerHTML = WU.map((q) => {
      const answers = Object.values(warmupData[q.id] || {});
      const counts = {};
      answers.forEach((a) => {
        if (q.multi) Object.keys(a || {}).forEach((o) => (counts[o] = (counts[o] || 0) + 1));
        else counts[a] = (counts[a] || 0) + 1;
      });
      const n = answers.length;
      const max = Math.max(1, ...Object.values(counts));
      return `<div class="wu-q"><h3>${esc(q.text)}</h3>${q.options.map((o) => {
        const c = counts[o.id] || 0, p = n ? Math.round((c / n) * 100) : 0;
        return `<div class="wu-row"><span class="wu-lbl">${esc(o.label)}</span>
          <span class="wu-bar"><i style="width:${(c / max) * 100}%"></i></span>
          <span class="wu-val">${c} <small>${p}%</small></span></div>`;
      }).join("")}</div>`;
    }).join("") || `<p class="hint">Вопросы разминки не заданы (поле warmup в js/data.js).</p>`;
  }
  function openWarmup() {
    if (current) closeViewer();
    $("#wuQr").innerHTML = LIVE ? qrSvg(voteUrl) : "";
    $("#wuUrl").textContent = LIVE ? shortUrl : "Голосование с телефонов не настроено";
    renderWarmup();
    wuOverlay.hidden = false;
    dbSet("current", "warmup"); // телефоны показывают вопросы разминки
  }
  function closeWarmup() { wuOverlay.hidden = true; dbSet("current", null); }
  $("#warmupBtn").onclick = openWarmup;
  $("#warmupClose").onclick = closeWarmup;

  function renderResults() {
    const st = computeStats();
    const revealedCount = S.works.filter((w) => state.revealed[w.id]).length;
    const acc = pct(st.correct, st.revealedVotes);
    $("#stats").innerHTML = `
      <div class="stat"><div class="k">Всего голосов</div><div class="v">${st.votes}</div></div>
      ${LIVE ? `<div class="stat"><div class="k">Голосовали с телефонов</div><div class="v">${voters}<small> чел.</small></div></div>` : ""}
      <div class="stat"><div class="k">Раскрыто работ</div><div class="v">${revealedCount}<small> / ${S.works.length}</small></div></div>
      <div class="stat"><div class="k">Аудитория угадала</div><div class="v">${acc === null ? "—" : acc + "%"}</div></div>
      ${S.tools.map((t) => {
        const p = st.perAi[t.id], a = pct(p.c, p.v);
        return `<div class="stat" style="border-top:4px solid ${t.color}"><div class="k">Узнаваемость ${esc(t.name)}</div><div class="v">${a === null ? "—" : a + "%"}</div></div>`;
      }).join("")}`;

    const head = `<tr><th>#</th><th>Работа</th><th>Формат</th>${S.tools.map((t) => `<th>${esc(t.name)}</th>`).join("")}<th>Распределение</th><th>Ответ</th><th>Угадали</th></tr>`;
    const rows = S.works.map((w, i) => {
      const v = countsOf(w.id), n = sum(v), rev = state.revealed[w.id], t = toolById[w.ai];
      const bars = S.tools.map((x) => `<i style="--c:${x.color};width:${n ? (v[x.id] / n) * 100 : 0}%"></i>`).join("");
      const a = pct(v[w.ai] || 0, n);
      return `<tr class="clickable" data-id="${w.id}">
        <td class="num">${i + 1}</td><td>${esc(w.title)}</td><td>${(FORMAT[w.format] || {}).label || w.format}</td>
        ${S.tools.map((x) => `<td class="num">${v[x.id]}</td>`).join("")}
        <td><div class="mini-bars">${bars}</div></td>
        <td>${rev && t ? `<span class="badge ai" style="--c:${t.color}">${esc(t.name)}</span>` : `<span class="hidden-ans">скрыт</span>`}</td>
        <td class="num">${rev && a !== null ? `<span class="${a >= 50 ? "ok" : "no"}">${a}%</span>` : "—"}</td>
      </tr>`;
    }).join("");
    $("#resultsTable").innerHTML = `<thead>${head}</thead><tbody>${rows}</tbody>`;
    renderTools(st);
    renderQuality();
    renderLeader();
  }
  $("#resultsTable").addEventListener("click", (e) => {
    const r = e.target.closest("tr[data-id]"); if (r) openViewer(r.dataset.id);
  });

  $("#revealAllBtn").onclick = () => {
    if (!confirm("Раскрыть ответы для всех работ?")) return;
    S.works.forEach((w) => { state.revealed[w.id] = true; dbSet("revealed/" + w.id, true); });
    save(); refresh();
  };
  $("#resetBtn").onclick = () => {
    const msg = LIVE
      ? "Удалить все голоса (и ручные, и с телефонов) и снова скрыть ответы? Это нельзя отменить."
      : "Удалить все голоса и снова скрыть ответы? Это нельзя отменить.";
    if (!confirm(msg)) return;
    state = { votes: {}, revealed: {} }; save();
    if (ctl()) ctl().remove().catch((e) => console.error(e));
    online = {}; voters = 0; refresh();
  };
  $("#exportBtn").onclick = () => {
    const head = ["#", "Работа", "Формат", ...S.tools.map((t) => t.name), "Всего", "Из них с телефонов", "Правильный ответ",
      ...CRIT.map((c) => c.label + " (ср.)"), "Средний балл", "Оценили, чел."];
    const lines = [head, ...S.works.map((w, i) => {
      const v = countsOf(w.id);
      return [i + 1, w.title, w.format, ...S.tools.map((t) => v[t.id]), sum(v), onlineOf(w.id),
        state.revealed[w.id] ? (toolById[w.ai] || {}).name || w.ai : "скрыт",
        ...(() => { const q = qualityOf(w.id); return [...CRIT.map((c) => fmt1(q.crit[c.id])), fmt1(q.total), q.people]; })()];
    })].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"));
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "rezultaty-oprosa.csv"; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  /* ---------- tools ---------- */
  function renderTools(st) {
    $("#toolsGrid").innerHTML = S.tools.map((t) => {
      const p = st.perAi[t.id], a = pct(p.c, p.v);
      return `<div class="tool" style="--c:${t.color}">
        <h3><span class="dot"></span>${esc(t.name)} <small>${esc(t.maker)}</small></h3>
        <h4>Сильные стороны</h4><ul>${t.strengths.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
        <h4>Ограничения</h4><ul>${t.limits.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
        <div class="guess">${a === null ? "Узнаваемость появится после раскрытия ответов." : `Аудитория узнала работы ${esc(t.name)} в <b>${a}%</b> голосов.`}</div>
      </div>`;
    }).join("");
  }

  /* ---------- viewer ---------- */
  let current = null;
  const viewer = $("#viewer");

  function openViewer(id) {
    current = S.works.find((w) => w.id === id); if (!current) return;
    viewer.hidden = false; document.body.style.overflow = "hidden";
    if (location.hash !== "#" + id) history.replaceState(null, "", "#" + id);
    dbSet("current", id); // телефоны переключаются на эту работу
    renderStage(); renderPoll();
  }
  function closeViewer() {
    if (document.fullscreenElement) document.exitFullscreen();
    viewer.hidden = true; document.body.style.overflow = ""; $("#stage").innerHTML = "";
    current = null; history.replaceState(null, "", location.pathname + location.search);
    dbSet("current", null);
    refresh();
  }
  function step(d) {
    const i = S.works.indexOf(current);
    openViewer(S.works[(i + d + S.works.length) % S.works.length].id);
  }

  async function exists(url) {
    if (!/^https?:$/.test(location.protocol)) return true; // file:// — проверить нельзя
    try { const r = await fetch(url, { method: "HEAD", cache: "no-store" }); return r.ok; } catch (e) { return false; }
  }
  const missing = (file) => `<div class="missing"><div class="big">📭</div>
    <p>Файл ещё не загружен:<br><code>${esc(file)}</code></p>
    <p>Положите его в папку <code>presentations/</code> или исправьте путь в <code>js/data.js</code>.</p></div>`;

  async function renderStage() {
    const w = current, stage = $("#stage");
    const f = FORMAT[w.format] || { label: w.format };
    const idx = S.works.indexOf(w) + 1;
    $("#vTitle").textContent = `${idx}. ${w.title}`;
    $("#vFormat").textContent = f.label;
    $("#vDownload").href = w.file;
    $("#vDownload").setAttribute("download", "");

    stage.innerHTML = "";
    const src = w.file;
    const token = {}; renderStage.token = token;
    const ok = await exists(src);
    if (renderStage.token !== token) return;
    if (!ok) { stage.innerHTML = missing(src); return; }

    if (w.format === "pdf") {
      stage.innerHTML = `<iframe src="${esc(src)}#view=FitH&toolbar=1" title="PDF"></iframe>`;
    } else {
      // HTML-презентация: листается внутри окна (кликните по слайду, затем стрелки / пробел).
      stage.innerHTML = `<iframe src="${esc(src)}" title="Презентация" allow="fullscreen" allowfullscreen></iframe>`;
    }
  }

  function renderPoll() {
    const w = current, v = countsOf(w.id), n = sum(v), rev = !!state.revealed[w.id];
    $("#voteList").innerHTML = S.tools.map((t, i) => {
      const c = v[t.id], p = n ? Math.round((c / n) * 100) : 0;
      return `<div class="vote ${rev && w.ai === t.id ? "correct" : ""}" style="--c:${t.color}">
        <button class="vote-main" data-ai="${t.id}">
          <span class="fill" style="width:${p}%"></span>
          <span class="lbl"><span class="key">${i + 1}</span><span class="dot"></span>${esc(t.name)}</span>
          <span class="cnt">${c} <small>${p}%</small></span>
        </button>
        <button class="vote-minus" data-ai="${t.id}" title="Убрать ручной голос" aria-label="Убрать голос за ${esc(t.name)}">−</button>
      </div>`;
    }).join("");
    const on = onlineOf(w.id);
    const qq = qualityOf(w.id);
    $("#voteTotal").textContent = (LIVE ? `Всего голосов: ${n} (📱 ${on} · ✋ ${n - on})` : `Всего голосов: ${n}`) +
      (LIVE && CRIT.length ? ` · ⭐ оценили: ${qq.people}` : "");
    $("#liveStatus").innerHTML = !LIVE
      ? "Не настроено — см. README (Firebase)."
      : `${connected ? "🟢 на связи" : "🟠 подключение…"} · ${esc(shortUrl)}`;

    const t = toolById[w.ai];
    $("#revealBtn").hidden = rev;
    const ans = $("#answer");
    ans.hidden = !rev;
    if (rev && t) {
      const a = pct(v[w.ai] || 0, n);
      ans.style.setProperty("--c", t.color);
      ans.innerHTML = `<div class="who"><span class="dot"></span>${esc(t.name)}</div>
        <p class="acc">${a === null ? "Голосов не было." : `Угадали ${a}% аудитории.`}</p>
        ${qq.total != null ? `<div class="mini-q">${CRIT.map((c) => `<span>${esc(c.label)}</span><b>${fmt1(qq.crit[c.id])} ★</b>`).join("")}<span><b>Средний балл</b></span><b>${fmt1(qq.total)} ★</b></div>` : ""}
        ${w.prompt ? `<details open><summary>Промпт</summary><pre>${esc(w.prompt)}</pre></details>` : ""}
        ${w.notes ? `<details open><summary>Комментарий</summary><p>${esc(w.notes)}</p></details>` : ""}
        <button class="btn ghost small" id="hideAgain" style="margin-top:10px">Скрыть ответ</button>`;
      $("#hideAgain").onclick = () => {
        delete state.revealed[w.id]; save();
        if (ctl()) ctl().child("revealed/" + w.id).remove().catch(() => {});
        renderPoll();
      };
    }
  }

  function vote(ai, d) {
    if (!current) return;
    const m = manualOf(current.id);
    m[ai] = Math.max(0, (m[ai] || 0) + d); save(); renderPoll();
  }
  $("#voteList").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-ai]"); if (!b) return;
    vote(b.dataset.ai, b.classList.contains("vote-minus") ? -1 : 1);
  });
  function reveal() {
    if (!current) return;
    state.revealed[current.id] = true; save();
    dbSet("revealed/" + current.id, true); // телефоны покажут правильный ответ
    renderPoll();
  }
  $("#revealBtn").onclick = reveal;
  $("#closeBtn").onclick = closeViewer;
  $("#prevBtn").onclick = () => step(-1);
  $("#nextBtn").onclick = () => step(1);
  $("#pollToggle").onclick = () => $("#poll").classList.toggle("collapsed");
  function fullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else viewer.requestFullscreen && viewer.requestFullscreen().catch(() => {});
  }
  $("#fsBtn").onclick = fullscreen;

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;
    const k = e.key.toLowerCase();
    if (!overlay.hidden && k === "escape") { closeQr(); e.preventDefault(); return; }
    if (!finalOverlay.hidden && k === "escape") { closeFinal(); e.preventDefault(); return; }
    if (!wuOverlay.hidden && k === "escape") { closeWarmup(); e.preventDefault(); return; }
    if ((k === "w" || k === "ц") && !current) { wuOverlay.hidden ? openWarmup() : closeWarmup(); e.preventDefault(); return; }
    if ((k === "t" || k === "е") && !current) { finalOverlay.hidden ? openFinal() : closeFinal(); e.preventDefault(); return; }
    if (k === "q" || k === "й") { overlay.hidden ? openQr() : closeQr(); e.preventDefault(); return; }
    if (!current) return;
    if (k === "escape" && !document.fullscreenElement) closeViewer();
    else if (k === "arrowright") step(1);
    else if (k === "arrowleft") step(-1);
    else if (k === "r" || k === "к") reveal();
    else if (k === "f" || k === "а") fullscreen();
    else if (/^(Digit|Numpad)[1-9]$/.test(e.code) && S.tools[+e.code.slice(-1) - 1]) vote(S.tools[+e.code.slice(-1) - 1].id, e.shiftKey ? -1 : 1);
    else return;
    e.preventDefault();
  });

  /* ---------- init ---------- */
  function refresh() { renderGrid(); renderResults(); }
  function liveUpdate() { if (!ready) return; refresh(); if (current) renderPoll(); if (!overlay.hidden) updateQrCount(); if (!finalOverlay.hidden) renderFinal(); if (!wuOverlay.hidden) renderWarmup(); }
  ready = true;
  refresh();
  const initial = location.hash.slice(1);
  if (S.works.some((w) => w.id === initial)) openViewer(initial);
})();
