import {
  acceptHeightMessage,
  acceptResponseMessage,
  buildSrcdoc,
  ensureWeeklyFields,
  latestSummary,
  taipeiISOWeek,
} from './weekly-embed-bridge.js';

const state = {
  currentWeek: '',
  selectedWeek: '',
  request: 0,
  loaded: false,
};

const REASONS = {
  unauthorized: '請重新登入後再送出',
  bot_cannot_submit: '只有你本人可以送出回應',
  bad_fields: '回應欄位不完整，沒有送出',
  not_uploaded: '這週的週報還沒放上來',
  payload_too_large: '內容太大，沒有送出',
};

function boot() {
  state.currentWeek = taipeiISOWeek(new Date());
  const params = new URLSearchParams(window.location.search);
  const weeklyTab = document.querySelector('[data-tab="weekly"]');
  const frame = document.getElementById('weeklyFrame');
  if (!weeklyTab || !frame) return;
  frame.setAttribute('sandbox', 'allow-scripts allow-forms');
  frame.setAttribute('referrerpolicy', 'no-referrer');
  if (params.get('tab') === 'weekly') {
    document.querySelectorAll('.tab').forEach((item) => item.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach((item) => item.classList.remove('active'));
    weeklyTab.classList.add('active');
    document.getElementById('tab-weekly').classList.add('active');
    state.loaded = true;
    loadList(params.get('week'));
  }
  weeklyTab.addEventListener('click', () => {
    if (state.loaded) return;
    state.loaded = true;
    loadList(null);
  });
  document.getElementById('weeklySelect').addEventListener('change', (event) => {
    loadWeek(event.target.value);
  });
  window.addEventListener('message', onFrameMessage);
}

async function loadList(preferred) {
  try {
    const response = await fetch(window.API + '/api/weekly-embed/list?owner=hy', {
      cache: 'no-store',
      headers: window.GET_HEADERS,
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json();
    const selected = fillSelect(data.weeks || [], state.currentWeek, preferred);
    loadWeek(selected);
  } catch (error) {
    document.getElementById('weeklyStatus').textContent = '週列表沒有載入。請重新登入後再試。';
    window.console.error('[weekly]', error);
  }
}

function fillSelect(weeks, current, preferred) {
  const select = document.getElementById('weeklySelect');
  const byWeek = new Map(weeks.map((item) => [item.week, item]));
  const ids = [current];
  for (const id of [...byWeek.keys()].sort().reverse()) {
    if (!ids.includes(id)) ids.push(id);
  }
  if (preferred && !ids.includes(preferred)) ids.push(preferred);
  select.replaceChildren();
  for (const id of ids) {
    const option = document.createElement('option');
    const meta = byWeek.get(id);
    option.value = id;
    option.textContent = meta ? id + (meta.title ? '　' + meta.title : '') : id + '（尚未上傳）';
    select.appendChild(option);
  }
  const want = preferred && [...select.options].some((option) => option.value === preferred) ? preferred : current;
  select.value = want;
  return select.value;
}

async function loadWeek(week) {
  state.selectedWeek = week;
  const token = ++state.request;
  const frame = document.getElementById('weeklyFrame');
  frame.hidden = true;
  frame.removeAttribute('srcdoc');
  document.getElementById('weeklyEmpty').hidden = true;
  document.getElementById('weeklyLatest').hidden = true;
  document.getElementById('weeklyStatus').textContent = '載入中…';
  let response;
  try {
    response = await fetch(window.API + '/api/weekly-embed?owner=hy&week=' + encodeURIComponent(week), {
      cache: 'no-store',
      headers: window.GET_HEADERS,
    });
  } catch (error) {
    if (token !== state.request) return;
    document.getElementById('weeklyStatus').textContent = '載入失敗';
    window.console.error('[weekly]', error);
    return;
  }
  if (token !== state.request) return;
  const data = await response.json().catch(() => ({}));
  if (response.status === 404 && data.reason === 'not_uploaded') {
    showNotUploaded(week);
    return;
  }
  if (!response.ok || data.ok === false) {
    document.getElementById('weeklyStatus').textContent = '載入失敗';
    window.showToast('週報沒有載入', 'error');
    return;
  }
  showReport(data);
}

function showNotUploaded(week) {
  document.getElementById('weeklyStatus').textContent = '';
  document.getElementById('weeklyFrame').hidden = true;
  document.getElementById('weeklyLatest').hidden = true;
  const empty = document.getElementById('weeklyEmpty');
  empty.hidden = false;
  document.getElementById('weeklyEmptyTitle').textContent = week === state.currentWeek
    ? '本週週報還沒放上來（' + week + '）'
    : week + ' 的週報還沒放上來';
  document.getElementById('weeklyEmptyBody').textContent = '等這週的週報上傳後，重新整理這頁就會出現。現在不會改顯示別週的內容。';
}

function showReport(data) {
  document.getElementById('weeklyEmpty').hidden = true;
  document.getElementById('weeklyStatus').textContent = '正在看 ' + data.week + (data.title ? '　' + data.title : '');
  const frame = document.getElementById('weeklyFrame');
  frame.onload = () => {
    if (state.selectedWeek !== data.week || !data.latest || !data.latest.fields) return;
    frame.contentWindow.postMessage({ type: 'hy-weekly-fill', fields: data.latest.fields }, '*');
  };
  frame.hidden = false;
  frame.srcdoc = buildSrcdoc(data.html || '');
  renderLatest(data.latest, data.history);
}

function renderLatest(latest, history) {
  const box = document.getElementById('weeklyLatest');
  box.hidden = false;
  box.replaceChildren();
  const title = document.createElement('div');
  title.className = 'section-title';
  title.textContent = '最新回應（台北時間）';
  box.appendChild(title);
  if (!latest) {
    const empty = document.createElement('p');
    empty.textContent = '這週還沒有回應。';
    box.appendChild(empty);
    return;
  }
  const summary = latestSummary(latest);
  const when = document.createElement('p');
  when.textContent = summary.submittedAtTaipei + (summary.submittedBy ? '　' + summary.submittedBy : '');
  box.appendChild(when);
  const count = document.createElement('p');
  count.textContent = '已填 ' + summary.answered + ' / ' + summary.total;
  box.appendChild(count);
  const list = document.createElement('ul');
  list.className = 'weekly-latest-list';
  for (const item of summary.items) {
    const li = document.createElement('li');
    const key = document.createElement('span');
    key.className = 'weekly-k';
    key.textContent = item.name;
    li.appendChild(key);
    const text = item.value.length > 80 ? item.value.slice(0, 80) + '…' : item.value;
    li.appendChild(document.createTextNode(text));
    list.appendChild(li);
  }
  box.appendChild(list);
  if (Array.isArray(history) && history.length > 1) {
    const older = document.createElement('p');
    older.textContent = '先前還有 ' + (history.length - 1) + ' 筆，仍留在這週。';
    box.appendChild(older);
  }
}

function onFrameMessage(event) {
  const frame = document.getElementById('weeklyFrame');
  if (!frame || !frame.contentWindow) return;
  const height = acceptHeightMessage(event, frame.contentWindow);
  if (height) {
    frame.style.height = height + 'px';
    return;
  }
  const accepted = acceptResponseMessage(event, frame.contentWindow, {
    week: state.selectedWeek,
    owner: 'hy',
  });
  if (!accepted) return;
  sendResponse(accepted);
}

async function sendResponse(accepted) {
  const fields = ensureWeeklyFields(accepted.fields);
  try {
    const response = await fetch(window.API + '/api/weekly-embed/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: window.GET_HEADERS.Authorization,
      },
      body: JSON.stringify({ week: accepted.week, owner: 'hy', fields }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) {
      window.showToast(REASONS[data.reason] || '沒有送出', 'error');
      return;
    }
    window.showToast('已送出', 'success');
    renderLatest(data.latest, null);
    if (data.history_count > 1) {
      const box = document.getElementById('weeklyLatest');
      const older = document.createElement('p');
      older.textContent = '這週一共 ' + data.history_count + ' 筆，上面是最新的一筆。';
      box.appendChild(older);
    }
  } catch (error) {
    window.showToast('沒有送出', 'error');
    window.console.error('[weekly]', error);
  }
}

boot();
