// 技術雷達分頁 v2 預覽：掃描寫入、關鍵字採用、跨主軸去重。本機可採用關鍵字；週二例行尚未建立。
const PROD_API = 'https://hy-agent-v2.onrender.com/api/radar/feed';

function radarApiUrl() {
  let url = '';
  if (window.__RADAR_API__) url = window.__RADAR_API__;
  else {
    const host = location.hostname;
    if (host === '127.0.0.1' || host === 'localhost') url = '/api/radar/feed';
    else url = (window.API || '') + '/api/radar/feed' || PROD_API;
  }
  const host = location.hostname;
  if (host === '127.0.0.1' || host === 'localhost') {
    const demo = new URLSearchParams(location.search).get('radar_demo');
    if (demo) url += (url.includes('?') ? '&' : '?') + 'demo=' + encodeURIComponent(demo);
  }
  return url;
}

function friendlyError(data, fallback) {
  if (data && typeof data.error === 'string' && data.error.trim()) return data.error;
  if (data && typeof data.message === 'string' && data.message.trim()) return data.message;
  return fallback || '現在讀不到技術雷達資料。請稍後再試，或通知 Atlas 檢查。';
}

function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}


function isLocalPreview() {
  const host = location.hostname;
  return host === '127.0.0.1' || host === 'localhost';
}

function formatTaipei(value) {
  if (!value) return '';
  const s = String(value).replace('T', ' ').replace(/\+08:00$/, '');
  return s.replace(/:\d\d$/, '').trim() + ' 台北時間';
}

function itemAxisIds(item) {
  if (item.axes && item.axes.length) return item.axes.map(String);
  if (item.axis) return [String(item.axis)];
  return [];
}

function axisChips(item, axes) {
  const ids = itemAxisIds(item);
  if (ids.length < 2) return '';
  const names = ids.map((id) => {
    const ax = (axes || []).find((a) => a.id === id);
    return `<span class="radar-chip radar-t-blue">命中 ${esc((ax && (ax.display_name || ax.name)) || id)}</span>`;
  });
  return `<div class="radar-flex radar-axis-hits">${names.join(' ')}</div>`;
}

function candidateCard(c, ax) {
  const hold = c.scan_hold || (c.scan_hold_reason || '').indexOf('暫不掃') >= 0;
  const adopted = c.decision === 'adopted';
  const rejected = c.decision === 'rejected';
  let marks = '';
  if (hold) marks += `<span class="radar-chip radar-t-orange">待核對、暫不掃</span>`;
  if (adopted) marks += `<span class="radar-chip radar-t-green">已採用</span>`;
  if (rejected) marks += `<span class="radar-chip radar-t-gray">不採用</span>`;
  const rec = [];
  if (c.proposed_by) rec.push(`提出者 ${esc(c.proposed_by)}`);
  if (adopted && c.adopted_by) rec.push(`採用者 ${esc(c.adopted_by)}`);
  if (adopted && c.adopted_at) rec.push(esc(formatTaipei(c.adopted_at)));
  const recHtml = rec.length ? `<p class="radar-muted radar-small">${rec.join('　')}</p>` : '';
  const can = isLocalPreview() && !hold;
  let btns = '';
  if (can) {
    if (!adopted) btns += `<button type="button" class="radar-btn radar-btn-adopt" data-adopt="${esc(c.id)}" data-decision="adopted" data-actor="${esc(ax.owner_bot || 'HY')}">採用</button>`;
    if (isLocalPreview()) btns += `<button type="button" class="radar-btn radar-btn-adopt" data-adopt="${esc(c.id)}" data-decision="adopted" data-actor="HY">由 HY 採用</button>`;
    if (adopted) btns += `<button type="button" class="radar-btn radar-btn-adopt" data-adopt="${esc(c.id)}" data-decision="pending" data-actor="HY">改回候選</button>`;
  }
  const btnHtml = btns ? `<div class="radar-flex">${btns}</div>` : '';
  return `<div class="radar-cand${hold ? ' is-hold' : ''}${adopted ? ' is-adopted' : ''}">
    <div class="radar-flex"><span class="radar-chip radar-t-gray">${esc(c.text)}</span>${marks}</div>
    ${recHtml}${btnHtml}
  </div>`;
}

function onItem(item, axisId) {

  if (!axisId || axisId === 'all') return true;
  const axes = item.axes && item.axes.length ? item.axes : (item.axis ? [item.axis] : []);
  return axes.includes(axisId);
}

function params() {
  const q = new URLSearchParams(location.search);
  return {
    axis: q.get('radar_axis') || 'all',
    rel: q.get('radar_rel') || 'mid', // mid = 高＋中；high = 只看高
    kind: q.get('radar_kind') || 'all'
  };
}

function setParams(next) {
  const url = new URL(location.href);
  url.searchParams.set('tab', 'radar');
  if (next.axis && next.axis !== 'all') url.searchParams.set('radar_axis', next.axis);
  else url.searchParams.delete('radar_axis');
  if (next.rel && next.rel !== 'mid') url.searchParams.set('radar_rel', next.rel);
  else url.searchParams.delete('radar_rel');
  if (next.kind && next.kind !== 'all') url.searchParams.set('radar_kind', next.kind);
  else url.searchParams.delete('radar_kind');
  history.replaceState(null, '', url);
}

function newsVisible(item, rel, kind) {
  if (kind === '未處理' && item.state !== 'new') return false;
  if (kind === '論文' || kind === '專利' || kind === '新聞') {
    if (item.kind !== kind) return false;
  }
  const r = item.relevance || '';
  if (rel === 'high') return r === '高';
  if (rel === 'mid') return r !== '低'; // 高＋中；沒標相關度的也顯示，避免藏資料
  return true;
}

function signalVisible(item, kind) {
  if (kind === '未處理') return item.state === 'open' || !item.state;
  if (kind === '論文' || kind === '專利' || kind === '新聞') return false;
  return true;
}

function relChip(rel) {
  if (rel === '高') return '<span class="radar-chip radar-t-blue">相關度 高</span>';
  if (rel === '中') return '<span class="radar-chip radar-t-gray">相關度 中</span>';
  if (rel === '低') return '<span class="radar-chip radar-t-gray">相關度 低</span>';
  return '';
}

function urgencyChip(u) {
  if (!u) return '';
  const cls = u === '高' ? 'radar-t-red' : 'radar-t-orange';
  return `<span class="radar-chip ${cls}">急迫度 ${esc(u)}</span>`;
}

function kindChip(kind, map) {
  const cls = map[kind] || 'radar-t-gray';
  return kind ? `<span class="radar-chip ${cls}">${esc(kind)}</span>` : '';
}

const NEWS_KIND_CLASS = { '論文': 'radar-t-purple', '專利': 'radar-t-orange', '新聞': 'radar-t-blue' };
const RADAR_KIND_CLASS = { '競爭者': 'radar-t-orange', '技術': 'radar-t-blue', '市場': 'radar-t-green', '政策': 'radar-t-purple', '補助': 'radar-t-red' };

function titleHtml(item, axes) {
  const title = esc(item.title || item.text || '（無標題）');
  const url = String(item.url || '').trim();
  const link = url && /^https?:\/\//i.test(url)
    ? `<h3><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${title}</a></h3>`
    : `<h3>${title}</h3>`;
  return `${link}${axisChips(item, axes)}`;
}

let currentAxes = [];

function laterBtns(citeLabel) {
  const cite = citeLabel ? `引用到 ${citeLabel}` : '引用到專案';
  return `<div class="radar-flex">
    <button class="radar-btn" type="button" disabled title="階段 2：只在雷達標成已保留，不上傳 Drive；原始網址留給你開啟">加入文獻庫</button>
    <button class="radar-btn" type="button" disabled title="階段 2 才開放">升級為訊號</button>
    <button class="radar-btn" type="button" disabled title="階段 2 才開放">略過</button>
    <button class="radar-btn radar-btn-link" type="button" disabled title="階段 2 才開放">↗ ${esc(cite)}</button>
    <button class="radar-btn radar-btn-link" type="button" disabled title="階段 2 才開放">＋ 提議開專案卡</button>
  </div>`;
}

function renderNews(item, citeLabel) {
  return `<article class="radar-item">
    <div class="radar-flex">
      ${kindChip(item.kind, NEWS_KIND_CLASS)}
      <span class="radar-muted radar-small">${esc(item.source || '')}</span>
      <span class="radar-muted radar-mono radar-small">${esc(item.date || '')}</span>
      <span class="radar-ml">${relChip(item.relevance)}</span>
    </div>
    ${titleHtml(item, currentAxes)}
    <p class="radar-small">${esc(item.summary || '')}</p>
    ${laterBtns(citeLabel)}
  </article>`;
}

function renderRadar(item, citeLabel) {
  const assess = item.assessment || '';
  return `<article class="radar-item">
    <div class="radar-flex">
      ${kindChip(item.kind, RADAR_KIND_CLASS)}
      ${urgencyChip(item.urgency)}
      ${item.demo ? '<span class="radar-chip radar-t-gray">示意</span>' : ''}
    </div>
    ${titleHtml(item, currentAxes)}
    ${item.impact ? `<p class="radar-muted radar-small">影響：${esc(item.impact)}</p>` : ''}
    ${assess ? `<div class="radar-reply"><b>AI 判讀：</b>${esc(assess)}</div>` : ''}
    <div class="radar-flex">
      <button class="radar-btn radar-btn-link" type="button" disabled title="階段 2 才開放">↗ 引用到 ${esc(citeLabel || '專案')}</button>
      <button class="radar-btn radar-btn-link" type="button" disabled title="階段 2 才開放">＋ 提議開專案卡</button>
    </div>
  </article>`;
}

function renderAlert(item) {
  return `<article class="radar-item">
    <div class="radar-flex">
      <span class="radar-chip radar-t-red">警示</span>
      ${item.demo ? '<span class="radar-chip radar-t-gray">示意</span>' : ''}
    </div>
    ${titleHtml(item, currentAxes)}
    ${item.text && item.text !== item.title ? `<p class="radar-small">${esc(item.text)}</p>` : ''}
  </article>`;
}

function renderDeadline(item) {
  return `<article class="radar-item">
    <div class="radar-flex">
      <span class="radar-chip radar-t-orange">截止日</span>
      <span class="radar-muted radar-mono radar-small">${esc(item.date || '')}</span>
      ${item.demo ? '<span class="radar-chip radar-t-gray">示意</span>' : ''}
    </div>
    ${titleHtml(item, currentAxes)}
  </article>`;
}

function citeLabel(ax) {
  if (ax.office_project) return `${ax.office_project} ${ax.display_name || ax.name}`;
  return `${ax.display_name || ax.name}（id ??）`;
}

function renderAxis(ax, data, flt) {
  const cite = citeLabel(ax);
  const news = (data.news || []).filter((x) => onItem(x, ax.id) && newsVisible(x, flt.rel, flt.kind));
  const radar = (data.radar || []).filter((x) => onItem(x, ax.id) && signalVisible(x, flt.kind));
  const alerts = (data.alerts || []).filter((x) => onItem(x, ax.id) && signalVisible(x, flt.kind));
  const deadlines = (data.deadlines || []).filter((x) => onItem(x, ax.id) && signalVisible(x, flt.kind));
  const kws = ax.keywords || [];
  const pending = ax.candidate_pending || 0;
  const total = ax.candidate_total || (ax.keyword_candidates || []).length;
  const hold = ax.candidate_hold || 0;
  const adoptedN = ax.candidate_adopted || 0;
  let kwHtml = kws.slice(0, 8).map((k) => `<span class="radar-chip radar-t-green">${esc(k)}</span>`).join(' ');
  if (kws.length) kwHtml += `<span class="radar-muted radar-small">正式關鍵字 ${kws.length} 個</span>`;
  else kwHtml += '<span class="radar-muted radar-small">尚未有正式關鍵字</span>';
  kwHtml += ` <span class="radar-chip radar-t-blue">候選 ${total} 組</span>`;
  if (pending) kwHtml += ` <span class="radar-muted radar-small">待採用 ${pending} 組，可由 ${esc(ax.owner_bot || '負責 Bot')} 或 HY 採用</span>`;
  if (adoptedN) kwHtml += ` <span class="radar-chip radar-t-green">已採用 ${adoptedN} 組</span>`;
  if (hold) kwHtml += ` <span class="radar-chip radar-t-orange">待核對、暫不掃 ${hold} 組</span>`;
  kwHtml += ` <span class="radar-muted radar-small">每週筆數 ${esc(ax.weekly_item_limit == null ? '??' : ax.weekly_item_limit)}</span>`;
  const cands = ax.keyword_candidates || [];
  const held = cands.filter((c) => c.scan_hold || (c.scan_hold_reason || '').indexOf('暫不掃') >= 0);
  const adopted = cands.filter((c) => c.decision === 'adopted');
  const pendingList = cands.filter((c) => c.decision === 'pending' && !(c.scan_hold || (c.scan_hold_reason || '').indexOf('暫不掃') >= 0));
  const shownCands = held.concat(adopted, pendingList.slice(0, 4));
  if (shownCands.length) {
    kwHtml += '<div class="radar-kw-cands">' + shownCands.map((c) => candidateCard(c, ax)).join('') + (pendingList.length > 4 ? `<span class="radar-muted radar-small">…還有 ${pendingList.length - 4} 組待採用候選</span>` : '') + '</div>';
  }
  const last = ax.last_run ? `上次 ${esc(ax.last_run)}` : (data.last_scan && data.last_scan.at ? `上次 ${esc(formatTaipei(data.last_scan.at))}` : '上次 尚未掃描');
  const next = ax.next_run ? `下次 ${esc(ax.next_run)}` : '';
  const office = ax.office_project
    ? `<span class="radar-chip radar-t-blue">Office：${esc(ax.office_project)}</span>`
    : `<span class="radar-chip radar-t-blue">Office：id ??</span>`;
  const officeNote = ax.office_project_note
    ? `<span class="radar-muted radar-small">${esc(ax.office_project_note)}</span>`
    : '';
  const emptyAll = !radar.length && !news.length && !alerts.length && !deadlines.length;

  let body = '';
  if (emptyAll) {
    body = `<div class="radar-empty">這條主軸目前沒有新知或方向訊號。資料從零開始，不沿用 Lab 舊資料。</div>`;
  } else {
    const sig = [...alerts.map(renderAlert), ...deadlines.map(renderDeadline), ...radar.map((x) => renderRadar(x, cite))];
    const newsHtml = news.map((x) => renderNews(x, cite));
    body += `<div class="radar-pad radar-row"><h3 class="radar-small" style="font-weight:700">方向訊號</h3></div>`;
    body += sig.length ? sig.join('') : '<div class="radar-empty">這個篩選下沒有方向訊號、警示或截止日。</div>';
    body += `<div class="radar-pad radar-row"><h3 class="radar-small" style="font-weight:700">科技新知</h3></div>`;
    body += newsHtml.length ? newsHtml.join('') : '<div class="radar-empty">這個篩選下沒有科技新知。</div>';
  }

  return `<section class="radar-card" id="ax-${esc(ax.id)}" data-axis="${esc(ax.id)}">
    <div class="radar-card-h radar-axis-h">
      <h2 class="radar-sec">${esc(ax.display_name || ax.name)}</h2>
      <div class="radar-flex">
        ${ax.owner_bot ? `<span class="radar-chip radar-t-purple">負責 ${esc(ax.owner_bot)}</span>` : ''}
        ${office}
        ${officeNote}
      </div>
      <div class="radar-flex radar-ml">
        <span class="radar-chip radar-t-green">${esc(ax.scan_display || '每週二 10:00')}</span>
        <span class="radar-muted radar-small">${last}${next ? '・' + next : ''}</span>
        <button class="radar-btn" type="button" disabled title="階段 3 才開放；週二例行等分頁上線再建">手動掃描這條主軸</button>
      </div>
    </div>
    <div class="radar-kw radar-flex">${kwHtml}</div>
    ${body}
  </section>`;
}

function renderAll(data, flt) {
  const c = data.counts || {};
  const axes = data.axes || [];
  const shown = flt.axis === 'all' ? axes : axes.filter((a) => a.id === flt.axis);
  const fltBtns = ['all', ...axes.map((a) => a.id)].map((id) => {
    const on = (flt.axis === id) || (id === 'all' && flt.axis === 'all');
    if (id === 'all') return `<button type="button" class="radar-flt${on ? ' on' : ''}" data-axis="all">全部</button>`;
    const ax = axes.find((a) => a.id === id);
    const axisName = (ax && (ax.display_name || ax.name)) || '';
    return `<button type="button" class="radar-flt${on ? ' on' : ''}" data-axis="${esc(id)}">${esc(axisName)} <b>${ax.open_signals}</b>／${ax.new_news}</button>`;
  }).join('');

  return `<div class="radar-head">
      <div>
        <div class="radar-h1">📡 技術雷達</div>
        <p class="radar-sub">取代原「🔬 研究」分頁。資料存在 OS 的 hy-data，從零收集，不沿用 Lab 舊資料。關鍵字由負責 Bot 採用，HY 也可以看、也可以改。專利分類號待核對、暫不掃。每週筆數先留 ??。</p>
      </div>
      <div class="radar-flex">
        <span class="radar-totals">新知 ${c.news || 0}　方向訊號 ${c.radar || 0}　警示 ${c.alerts || 0}　截止日 ${c.deadlines || 0}</span>
      </div>
    </div>
    <p class="radar-note">${esc(data.schedule_note || '')} 週二例行等這一階段做好再建立。手動掃描全部主軸先不開放。</p>
    <section class="radar-card">
      <div class="radar-card-h">
        <h2 class="radar-sec">技術雷達</h2>
        <div class="radar-flex radar-ml">
          <span class="radar-chip radar-t-green">自動：每週二 10:00 掃描四條主軸</span>
          <button class="radar-btn" type="button" disabled title="階段 3 才開放；週二例行等分頁上線再建">手動掃描全部主軸</button>
        </div>
      </div>
      <div class="radar-filters">
        <div class="radar-filters-row"><span class="radar-muted radar-small">主軸：</span>${fltBtns}</div>
        <div class="radar-filters-row">
          <span class="radar-muted radar-small">相關度：</span>
          <button type="button" class="radar-flt${flt.rel === 'mid' ? ' on' : ''}" data-rel="mid">高＋中</button>
          <button type="button" class="radar-flt${flt.rel === 'high' ? ' on' : ''}" data-rel="high">只看高</button>
          <span class="radar-muted radar-small" style="margin-left:8px">類型：</span>
          ${['未處理', '論文', '專利', '新聞', '全部'].map((k) => {
            const val = k === '全部' ? 'all' : k;
            const on = flt.kind === val || (k === '全部' && flt.kind === 'all');
            return `<button type="button" class="radar-flt${on ? ' on' : ''}" data-kind="${esc(val)}">${esc(k)}</button>`;
          }).join('')}
        </div>
        <p class="radar-muted radar-small">數字＝待處理訊號／未處理新知。資料從零開始，不沿用 Lab 舊資料。</p>
      </div>
    </section>
    ${data.message && !(data.axes && data.axes.length) ? `<div class="radar-empty">${esc(data.message)}</div>` : ''}
    ${shown.map((ax) => renderAxis(ax, data, flt)).join('')}`;
}

function renderUnavailable(message) {
  return `<div class="radar-head">
      <div>
        <div class="radar-h1">📡 技術雷達</div>
        <p class="radar-sub">資料存在 OS 的 hy-data，從零收集，不沿用 Lab 舊資料。</p>
      </div>
    </div>
    <div class="radar-error">${esc(message)}</div>`;
}


function bind(root, data) {
  root.querySelectorAll('[data-axis]').forEach((btn) => {
    if (btn.tagName !== 'BUTTON') return;
    btn.addEventListener('click', () => {
      const flt = params();
      flt.axis = btn.getAttribute('data-axis') || 'all';
      setParams(flt);
      draw(root, data, flt);
    });
  });
  root.querySelectorAll('[data-rel]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const flt = params();
      flt.rel = btn.getAttribute('data-rel') || 'mid';
      setParams(flt);
      draw(root, data, flt);
    });
  });
  root.querySelectorAll('[data-kind]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const flt = params();
      flt.kind = btn.getAttribute('data-kind') || 'all';
      setParams(flt);
      draw(root, data, flt);
    });
  });
  root.querySelectorAll('[data-adopt]').forEach((btn) => {
    btn.addEventListener('click', () => adoptOne(root, btn));
  });
}

async function adoptOne(root, btn) {
  const candidateId = btn.getAttribute('data-adopt');
  const decision = btn.getAttribute('data-decision') || 'adopted';
  const actor = btn.getAttribute('data-actor') || 'HY';
  btn.disabled = true;
  try {
    let url = '/api/radar/keywords/adopt';
    const demo = new URLSearchParams(location.search).get('radar_demo');
    if (demo) url += '?demo=' + encodeURIComponent(demo);
    const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Radar-Actor': actor };
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ candidate_id: candidateId, decision, actor }) });
    const body = await res.json().catch(() => null);
    if (!body || body.ok === false) {
      root.insertAdjacentHTML('afterbegin', `<div class="radar-error">${esc(friendlyError(body, '現在無法採用這組關鍵字。'))}</div>`);
      return;
    }
    loaded = false;
    cache = null;
    await loadRadar();
  } catch (err) {
    root.insertAdjacentHTML('afterbegin', '<div class="radar-error">現在無法採用這組關鍵字。請稍後再試。</div>');
  } finally {
    btn.disabled = false;
  }
}

function draw(root, data, flt) {
  currentAxes = data.axes || [];
  root.innerHTML = renderAll(data, flt);
  bind(root, data);
}

function activateRadarTab() {
  document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
  const tab = document.querySelector('[data-tab="radar"]');
  const pane = document.getElementById('tab-radar');
  if (tab) tab.classList.add('active');
  if (pane) pane.classList.add('active');
}

let loaded = false;
let cache = null;

async function loadRadar() {
  const root = document.getElementById('radarRoot');
  if (!root) return;
  if (loaded && cache) {
    if (cache.unavailable || cache.ok === false) root.innerHTML = renderUnavailable(friendlyError(cache));
    else draw(root, cache, params());
    return;
  }
  root.innerHTML = '<div class="radar-loading">載入中…</div>';
  try {
    const headers = { 'Cache-Control': 'no-store' };
    const preset = window.GET_HEADERS;
    if (preset && preset.Authorization) {
      headers.Authorization = preset.Authorization;
    } else {
      const tok = sessionStorage.getItem('hy_life_os_access_token') || sessionStorage.getItem('hy_world_access_token') || '';
      if (tok) headers.Authorization = 'Bearer ' + tok;
    }
    const res = await fetch(radarApiUrl(), { cache: 'no-store', headers });
    let data = null;
    try { data = await res.json(); } catch (parseErr) { data = null; }
    if (data && (data.unavailable || data.ok === false)) {
      cache = data;
      loaded = true;
      root.innerHTML = renderUnavailable(friendlyError(data));
      return;
    }
    if (!res.ok || !data) {
      root.innerHTML = renderUnavailable('現在讀不到技術雷達資料。請稍後再試，或先登入後再看。沒有沿用 Lab 舊資料。');
      return;
    }
    cache = data;
    loaded = true;
    draw(root, data, params());
  } catch (err) {
    root.innerHTML = renderUnavailable('現在讀不到技術雷達資料。請稍後再試，或通知 Atlas 檢查。沒有沿用 Lab 舊資料。');
  }
}

function init() {
  const tab = document.querySelector('[data-tab="radar"]');
  if (tab) tab.addEventListener('click', loadRadar);
  const q = new URLSearchParams(location.search);
  const want = q.get('tab');
  if (want === 'radar' || want === 'research') {
    activateRadarTab();
    loadRadar();
  }
}

window.loadRadar = loadRadar;
init();
