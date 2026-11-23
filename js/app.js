(function () {
  "use strict";
  const S = window.SEMINAR;
  const $ = (s) => document.querySelector(s);
  const toolById = Object.fromEntries(S.tools.map((t) => [t.id, t]));
  const FORMAT = {
    pdf: { label: "PDF", icon: "📄" },
    pptx: { label: "PowerPoint", icon: "📊" },
    webm: { label: "Видео", icon: "🎬" }
  };
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- state (localStorage) ---------- */
  const KEY = "ai-seminar-state-v1";
  let state = { votes: {}, revealed: {} };
  try { state = Object.assign(state, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} };
  const votesOf = (id) => (state.votes[id] = state.votes[id] || {});
  const totalOf = (id) => S.tools.reduce((n, t) => n + (votesOf(id)[t.id] || 0), 0);

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
        const c = votesOf(w.id)[w.ai] || 0;
        revealedVotes += n; correct += c;
        perAi[w.ai].v += n; perAi[w.ai].c += c;
      }
    });
    return { votes, correct, revealedVotes, perAi };
  }
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : null);

  function renderResults() {
    const st = computeStats();
    const revealedCount = S.works.filter((w) => state.revealed[w.id]).length;
    const acc = pct(st.correct, st.revealedVotes);
    $("#stats").innerHTML = `
      <div class="stat"><div class="k">Всего голосов</div><div class="v">${st.votes}</div></div>
      <div class="stat"><div class="k">Раскрыто работ</div><div class="v">${revealedCount}<small> / ${S.works.length}</small></div></div>
      <div class="stat"><div class="k">Аудитория угадала</div><div class="v">${acc === null ? "—" : acc + "%"}</div></div>
      ${S.tools.map((t) => {
        const p = st.perAi[t.id], a = pct(p.c, p.v);
        return `<div class="stat" style="border-top:4px solid ${t.color}"><div class="k">Узнаваемость ${esc(t.name)}</div><div class="v">${a === null ? "—" : a + "%"}</div></div>`;
      }).join("")}`;

    const head = `<tr><th>#</th><th>Работа</th><th>Формат</th>${S.tools.map((t) => `<th>${esc(t.name)}</th>`).join("")}<th>Распределение</th><th>Ответ</th><th>Угадали</th></tr>`;
    const rows = S.works.map((w, i) => {
      const v = votesOf(w.id), n = totalOf(w.id), rev = state.revealed[w.id], t = toolById[w.ai];
      const bars = S.tools.map((x) => `<i style="--c:${x.color};width:${n ? ((v[x.id] || 0) / n) * 100 : 0}%"></i>`).join("");
      const a = pct(v[w.ai] || 0, n);
      return `<tr class="clickable" data-id="${w.id}">
        <td class="num">${i + 1}</td><td>${esc(w.title)}</td><td>${(FORMAT[w.format] || {}).label || w.format}</td>
        ${S.tools.map((x) => `<td class="num">${v[x.id] || 0}</td>`).join("")}
        <td><div class="mini-bars">${bars}</div></td>
        <td>${rev && t ? `<span class="badge ai" style="--c:${t.color}">${esc(t.name)}</span>` : `<span class="hidden-ans">скрыт</span>`}</td>
        <td class="num">${rev && a !== null ? `<span class="${a >= 50 ? "ok" : "no"}">${a}%</span>` : "—"}</td>
      </tr>`;
    }).join("");
    $("#resultsTable").innerHTML = `<thead>${head}</thead><tbody>${rows}</tbody>`;
    renderTools(st);
  }
  $("#resultsTable").addEventListener("click", (e) => {
    const r = e.target.closest("tr[data-id]"); if (r) openViewer(r.dataset.id);
  });

  $("#revealAllBtn").onclick = () => {
    if (!confirm("Раскрыть ответы для всех работ?")) return;
    S.works.forEach((w) => (state.revealed[w.id] = true)); save(); refresh();
  };
  $("#resetBtn").onclick = () => {
    if (!confirm("Удалить все голоса и снова скрыть ответы? Это нельзя отменить.")) return;
    state = { votes: {}, revealed: {} }; save(); refresh();
  };
  $("#exportBtn").onclick = () => {
    const head = ["#", "Работа", "Формат", ...S.tools.map((t) => t.name), "Всего", "Правильный ответ"];
    const lines = [head, ...S.works.map((w, i) => {
      const v = votesOf(w.id);
      return [i + 1, w.title, w.format, ...S.tools.map((t) => v[t.id] || 0), totalOf(w.id),
        state.revealed[w.id] ? (toolById[w.ai] || {}).name || w.ai : "скрыт"];
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
  let showPdfCopy = false;
  const viewer = $("#viewer");
  const isPublic = /^https?:$/.test(location.protocol) &&
    !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

  function openViewer(id) {
    current = S.works.find((w) => w.id === id); if (!current) return;
    showPdfCopy = false;
    viewer.hidden = false; document.body.style.overflow = "hidden";
    if (location.hash !== "#" + id) history.replaceState(null, "", "#" + id);
    renderStage(); renderPoll();
  }
  function closeViewer() {
    if (document.fullscreenElement) document.exitFullscreen();
    viewer.hidden = true; document.body.style.overflow = ""; $("#stage").innerHTML = "";
    current = null; history.replaceState(null, "", location.pathname + location.search);
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
  const missing = (file, extra = "") => `<div class="missing"><div class="big">📭</div>
    <p>Файл ещё не загружен:<br><code>${esc(file)}</code></p>
    <p>Положите его в папку <code>presentations/</code> или исправьте путь в <code>js/data.js</code>.</p>${extra}</div>`;

  async function renderStage() {
    const w = current, stage = $("#stage");
    const f = FORMAT[w.format] || { label: w.format };
    const idx = S.works.indexOf(w) + 1;
    $("#vTitle").textContent = `${idx}. ${w.title}`;
    $("#vFormat").textContent = f.label;
    $("#vDownload").href = w.file;
    $("#vDownload").setAttribute("download", "");

    let toggle = $("#pdfToggle");
    if (w.format === "pptx" && w.pdf) {
      if (!toggle) {
        toggle = document.createElement("button");
        toggle.id = "pdfToggle"; toggle.className = "btn ghost small";
        toggle.onclick = () => { showPdfCopy = !showPdfCopy; renderStage(); };
        $("#vDownload").before(toggle);
      }
      toggle.textContent = showPdfCopy ? "Показать PowerPoint" : "Показать PDF-копию";
    } else if (toggle) toggle.remove();

    stage.innerHTML = "";
    const src = w.format === "pptx" && showPdfCopy ? w.pdf : w.file;
    const fmt = w.format === "pptx" && showPdfCopy ? "pdf" : w.format;
    const token = {}; renderStage.token = token;
    const ok = await exists(src);
    if (renderStage.token !== token) return;
    if (!ok) { stage.innerHTML = missing(src); return; }

    if (fmt === "pdf") {
      stage.innerHTML = `<iframe src="${esc(src)}#view=FitH&toolbar=1" title="PDF"></iframe>`;
    } else if (fmt === "webm") {
      stage.innerHTML = `<video src="${esc(src)}" controls playsinline preload="metadata"></video>`;
    } else if (fmt === "pptx") {
      if (isPublic) {
        const abs = new URL(src, location.href).href;
        stage.innerHTML = `<iframe src="https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(abs)}" title="PowerPoint" allowfullscreen></iframe>`;
      } else if (w.pdf && (await exists(w.pdf))) {
        showPdfCopy = true; renderStage();
      } else {
        stage.innerHTML = `<div class="missing"><div class="big">📊</div>
          <p>Просмотр PowerPoint в браузере работает после публикации сайта на GitHub Pages.</p>
          <p>Сейчас можно <a href="${esc(src)}" download>скачать файл</a> или добавить PDF-копию (поле <code>pdf</code> в <code>js/data.js</code>).</p></div>`;
      }
    } else {
      stage.innerHTML = `<iframe src="${esc(src)}" title="Материал"></iframe>`;
    }
  }

  function renderPoll() {
    const w = current, v = votesOf(w.id), n = totalOf(w.id), rev = !!state.revealed[w.id];
    $("#voteList").innerHTML = S.tools.map((t, i) => {
      const c = v[t.id] || 0, p = n ? Math.round((c / n) * 100) : 0;
      return `<div class="vote ${rev && w.ai === t.id ? "correct" : ""}" style="--c:${t.color}">
        <button class="vote-main" data-ai="${t.id}">
          <span class="fill" style="width:${p}%"></span>
          <span class="lbl"><span class="key">${i + 1}</span><span class="dot"></span>${esc(t.name)}</span>
          <span class="cnt">${c} <small>${p}%</small></span>
        </button>
        <button class="vote-minus" data-ai="${t.id}" title="Убрать голос" aria-label="Убрать голос за ${esc(t.name)}">−</button>
      </div>`;
    }).join("");
    $("#voteTotal").textContent = `Всего голосов: ${n}`;

    const t = toolById[w.ai];
    $("#revealBtn").hidden = rev;
    const ans = $("#answer");
    ans.hidden = !rev;
    if (rev && t) {
      const a = pct(v[w.ai] || 0, n);
      ans.style.setProperty("--c", t.color);
      ans.innerHTML = `<div class="who"><span class="dot"></span>${esc(t.name)}</div>
        <p class="acc">${a === null ? "Голосов не было." : `Угадали ${a}% аудитории.`}</p>
        ${w.prompt ? `<details open><summary>Промпт</summary><pre>${esc(w.prompt)}</pre></details>` : ""}
        ${w.notes ? `<details open><summary>Комментарий</summary><p>${esc(w.notes)}</p></details>` : ""}
        <button class="btn ghost small" id="hideAgain" style="margin-top:10px">Скрыть ответ</button>`;
      $("#hideAgain").onclick = () => { delete state.revealed[w.id]; save(); renderPoll(); };
    }

    // QR for phone voting
    if (S.pollUrl && window.qrcode) {
      $("#qrBox").hidden = false;
      const qr = qrcode(0, "M"); qr.addData(S.pollUrl); qr.make();
      $("#qr").innerHTML = qr.createImgTag(6, 0);
    }
  }

  function vote(ai, d) {
    if (!current) return;
    const v = votesOf(current.id);
    v[ai] = Math.max(0, (v[ai] || 0) + d); save(); renderPoll();
  }
  $("#voteList").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-ai]"); if (!b) return;
    vote(b.dataset.ai, b.classList.contains("vote-minus") ? -1 : 1);
  });
  function reveal() { if (!current) return; state.revealed[current.id] = true; save(); renderPoll(); }
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
    if (!current || e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;
    const k = e.key.toLowerCase();
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
  refresh();
  const initial = location.hash.slice(1);
  if (S.works.some((w) => w.id === initial)) openViewer(initial);
})();
