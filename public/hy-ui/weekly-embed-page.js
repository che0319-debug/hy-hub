import {
  acceptHeightMessage,
  acceptResponseMessage,
  buildSrcdoc,
  compactLatestLine,
  ensureWeeklyFields,
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
  frame.setAttribute('scrolling', 'no');
  frame.style.overflow = 'hidden';
  if (params.get('tab') === 'weekly') {
    document.querySelectorAll('.tab').forEach((item) => item.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach((item) => item.classList.remove('active'));
    weeklyTab.classList.add('active');
    document.getElementById('tab-weekly').classList.add('active');
    state.loaded = true;
    loadList();
  }
  weeklyTab.addEventListener('click', () => {
    if (state.loaded) return;
    state.loaded = true;
    loadList();
  });
  window.addEventListener('message', onFrameMessage);
}

async function loadList() {
  try {
    const response = await fetch(window.API + '/api/weekly-embed/list?owner=hy', {
      cache: 'no-store',
      headers: window.GET_HEADERS,
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json();
    const week = data.current_week || state.currentWeek;
    state.currentWeek = week;
    loadWeek(week);
  } catch (error) {
    showStatus('週報沒有載入。請重新登入後再試。');
    window.console.error('[weekly]', error);
  }
}

async function loadWeek(week) {
  state.selectedWeek = week;
  const token = ++state.request;
  const frame = document.getElementById('weeklyFrame');
  resetFrame(frame);
  document.getElementById('weeklyEmpty').hidden = true;
  document.getElementById('weeklyLatest').hidden = true;
  showStatus('載入中…');
  let response;
  try {
    response = await fetch(window.API + '/api/weekly-embed?owner=hy&week=' + encodeURIComponent(week), {
      cache: 'no-store',
      headers: window.GET_HEADERS,
    });
  } catch (error) {
    if (token !== state.request) return;
    showStatus('載入失敗');
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
    showStatus('載入失敗');
    window.showToast('週報沒有載入', 'error');
    return;
  }
  showReport(data);
}

function resetFrame(frame) {
  frame.hidden = true;
  frame.removeAttribute('srcdoc');
  frame.style.height = '0px';
  frame.style.overflow = 'hidden';
  frame.setAttribute('scrolling', 'no');
}

function showStatus(text) {
  const status = document.getElementById('weeklyStatus');
  status.hidden = !text;
  status.textContent = text || '';
}

function showNotUploaded(week) {
  showStatus('');
  document.getElementById('weeklyFrame').hidden = true;
  document.getElementById('weeklyLatest').hidden = true;
  const empty = document.getElementById('weeklyEmpty');
  empty.hidden = false;
  document.getElementById('weeklyEmptyTitle').textContent = '本週週報還沒放上來（' + week + '）';
  document.getElementById('weeklyEmptyBody').textContent = '等這週的週報上傳後，重新整理這頁就會出現。';
}

function showReport(data) {
  document.getElementById('weeklyEmpty').hidden = true;
  showStatus('');
  renderLatest(data.latest);
  const frame = document.getElementById('weeklyFrame');
  frame.onload = () => {
    if (state.selectedWeek !== data.week || !data.latest || !data.latest.fields) return;
    frame.contentWindow.postMessage({ type: 'hy-weekly-fill', fields: data.latest.fields }, '*');
  };
  frame.hidden = false;
  frame.srcdoc = buildSrcdoc(data.html || '');
}

function renderLatest(latest) {
  const box = document.getElementById('weeklyLatest');
  const line = compactLatestLine(latest);
  if (!line) {
    box.hidden = true;
    box.textContent = '';
    return;
  }
  box.hidden = false;
  box.textContent = line;
}

function onFrameMessage(event) {
  const frame = document.getElementById('weeklyFrame');
  if (!frame || !frame.contentWindow) return;
  const height = acceptHeightMessage(event, frame.contentWindow);
  if (height) {
    frame.style.height = height + 'px';
    frame.style.overflow = 'hidden';
    frame.setAttribute('scrolling', 'no');
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
    renderLatest(data.latest);
  } catch (error) {
    window.showToast('沒有送出', 'error');
    window.console.error('[weekly]', error);
  }
}

boot();
