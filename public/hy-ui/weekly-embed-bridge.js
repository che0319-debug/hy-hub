// Field bridge for the sandboxed weekly HTML. The iframe script is this same
// collect/apply code, so tests and the page cannot drift.

export const RESPONSE_TYPE = 'hy-weekly-response';
export const FILL_TYPE = 'hy-weekly-fill';
export const HEIGHT_TYPE = 'hy-weekly-height';

// W47 form#weekly-response, in document order. viewport is a meta tag, not a field.
export const WEEKLY_FIELDS = [
  'D1', 'D1_calendar', 'D1_note',
  'D3', 'D3_note',
  'D4', 'D4_note',
  'D5', 'D5_note',
  'D6_once', 'D6_long', 'D6_calendar', 'D6_note',
  'D7', 'D7_calendar', 'D7_note',
  'D9', 'D9_note',
  'D10', 'D10_calendar', 'D10_note',
  'D11', 'D11_calendar', 'D11_note',
  'D12', 'D12_calendar', 'D12_note',
  'Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q7', 'Q8',
  'P1', 'P1_note', 'P2', 'P2_note', 'P3', 'P3_note',
  'P4', 'P4_note', 'P5', 'P5_note', 'P6', 'P6_note',
  'feedback_weekly', 'feedback_os', 'feedback_hy', 'feedback_team',
  'feedback_direction', 'feedback_other',
];

export const RADIO_FIELDS = [
  'D1', 'D1_calendar', 'D3', 'D4', 'D5',
  'D6_once', 'D6_long', 'D6_calendar',
  'D7', 'D7_calendar', 'D9',
  'D10', 'D10_calendar', 'D11', 'D11_calendar', 'D12', 'D12_calendar',
  'P1', 'P2', 'P3', 'P4', 'P5', 'P6',
];

export const CORE_OWNERS = ['hy', '950157', 'family', 'sam'];

export function resolveOwner(value) {
  return CORE_OWNERS.includes(value) ? value : 'hy';
}

// Screenshots and local checks may point the weekly tab at a loopback API.
// Anything else stays on the page's own API so a query string cannot redirect the token.
export function localApiBase(fallback, search, stored) {
  try {
    const params = new URLSearchParams(search || '');
    const raw = params.get('api') || stored || '';
    if (!raw) return fallback || '';
    const url = new URL(raw, 'http://127.0.0.1/');
    if (url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) {
      return url.origin;
    }
  } catch (error) {
    return fallback || '';
  }
  return fallback || '';
}

export function taipeiISOWeek(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const pick = (type) => Number(parts.find((part) => part.type === type).value);
  const utc = new Date(Date.UTC(pick('year'), pick('month') - 1, pick('day')));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const isoYear = utc.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil((((utc - yearStart) / 86400000) + 1) / 7);
  return isoYear + '-W' + String(week).padStart(2, '0');
}

export function collectFields(form) {
  const groups = new Map();
  const elements = Array.from(form.querySelectorAll('input[name], textarea[name], select[name]'));
  for (const el of elements) {
    if (!el.name) continue;
    if (!groups.has(el.name)) groups.set(el.name, []);
    groups.get(el.name).push(el);
  }
  const fields = {};
  for (const [name, group] of groups) {
    const type = String(group[0].type || '').toLowerCase();
    const tag = String(group[0].tagName || '').toUpperCase();
    if (type === 'radio') {
      const picked = group.find((el) => el.checked);
      fields[name] = picked ? picked.value : null;
    } else if (type === 'checkbox') {
      const picked = group.filter((el) => el.checked).map((el) => el.value || 'on');
      fields[name] = group.length === 1 ? Boolean(group[0].checked) : picked;
    } else if (tag === 'SELECT' && group[0].multiple) {
      const options = group[0].selectedOptions ? Array.from(group[0].selectedOptions) : [];
      fields[name] = options.map((option) => option.value);
    } else {
      const value = group[0].value;
      fields[name] = value == null ? '' : String(value);
    }
  }
  return fields;
}

export function applyFields(form, fields) {
  if (!fields || typeof fields !== 'object') return;
  const groups = new Map();
  const elements = Array.from(form.querySelectorAll('input[name], textarea[name], select[name]'));
  for (const el of elements) {
    if (!el.name) continue;
    if (!groups.has(el.name)) groups.set(el.name, []);
    groups.get(el.name).push(el);
  }
  for (const [name, value] of Object.entries(fields)) {
    const group = groups.get(name);
    if (!group) continue;
    const type = String(group[0].type || '').toLowerCase();
    const tag = String(group[0].tagName || '').toUpperCase();
    if (type === 'radio') {
      for (const el of group) el.checked = value != null && String(el.value) === String(value);
    } else if (type === 'checkbox') {
      if (group.length === 1) {
        group[0].checked = value === true || value === 'on' || value === group[0].value;
      } else {
        const picked = new Set(Array.isArray(value) ? value.map(String) : []);
        for (const el of group) el.checked = picked.has(String(el.value || 'on'));
      }
    } else if (tag === 'SELECT' && group[0].multiple) {
      const picked = new Set(Array.isArray(value) ? value.map(String) : []);
      const options = group[0].options ? Array.from(group[0].options) : [];
      for (const option of options) option.selected = picked.has(String(option.value));
    } else {
      group[0].value = value == null ? '' : String(value);
    }
  }
}

export function ensureWeeklyFields(fields) {
  const source = fields && typeof fields === 'object' && !Array.isArray(fields) ? fields : {};
  const out = {};
  for (const name of Object.keys(source)) {
    const value = source[name];
    if (value == null) out[name] = null;
    else if (typeof value === 'string') out[name] = value;
    else out[name] = value;
  }
  return out;
}

export function latestSummary(latest) {
  const fields = (latest && latest.fields) || {};
  const items = [];
  for (const name of Object.keys(fields)) {
    const value = fields[name];
    if (value == null || value === '') continue;
    items.push({ name, value: String(value) });
  }
  return {
    submittedAtTaipei: latest ? (latest.submitted_at_taipei || '') : '',
    submittedBy: latest ? (latest.submitted_by || '') : '',
    answered: items.length,
    total: Object.keys(fields).length,
    items,
  };
}

export function formatTaipeiStamp(value) {
  const raw = String(value || '');
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
  return match ? match[1] + ' ' + match[2] : raw;
}

export function compactLatestLine(latest) {
  if (!latest) return '';
  const summary = latestSummary(latest);
  const when = formatTaipeiStamp(summary.submittedAtTaipei);
  return '最新回應 ' + (when ? when + '（台北）' : '（台北）') + '· 已填 ' + summary.answered + '/' + summary.total;
}

export function officeStatusLine(office) {
  if (!office || typeof office !== 'object') return '';
  if (office.ok === false) return '回應已存，Office 開案失敗';
  const id = typeof office.project_id === 'string' ? office.project_id.trim() : '';
  if (office.ok !== true || !/^p-[A-Za-z0-9-]{1,32}$/.test(id)) return '';
  if (office.action === 'logged') return '已記到 Office ' + id;
  return '已在 Office 開案 ' + id;
}

export function acceptResponseMessage(event, iframeWindow, expected) {
  if (!iframeWindow || !event || event.source !== iframeWindow) return null;
  const data = event.data;
  if (!data || typeof data !== 'object') return null;
  if (data.type !== RESPONSE_TYPE) return null;
  if (!expected || data.week !== expected.week) return null;
  if (data.owner !== expected.owner) return { rejected: 'owner_mismatch' };
  if (!data.fields || typeof data.fields !== 'object' || Array.isArray(data.fields)) return null;
  return { week: data.week, owner: data.owner, fields: data.fields };
}

export function acceptHeightMessage(event, iframeWindow) {
  if (!iframeWindow || !event || event.source !== iframeWindow) return null;
  const data = event.data;
  if (!data || typeof data !== 'object' || data.type !== HEIGHT_TYPE) return null;
  const height = Number(data.height);
  if (!Number.isFinite(height) || height <= 0) return null;
  return Math.max(1, Math.min(Math.ceil(height), 200000));
}

export function bridgeRuntimeSource() {
  return `(function(){
    var collectFields = ${collectFields.toString()};
    var applyFields = ${applyFields.toString()};
    var pending = 0;
    var lastSent = 0;
    function measureHeight(){
      var root = document.documentElement;
      return root ? root.scrollHeight : 0;
    }
    function postHeight(){
      if (pending) return;
      pending = setTimeout(function(){
        pending = 0;
        parent.postMessage({type:'hy-weekly-height', height: measureHeight()}, '*');
      }, 60);
    }
    function onSubmit(event){
      if (event && event.preventDefault) event.preventDefault();
      if (event && event.stopImmediatePropagation) event.stopImmediatePropagation();
      var now = Date.now();
      if (now - lastSent < 50) return;
      lastSent = now;
      var form = document.getElementById('weekly-response');
      if (!form) return;
      parent.postMessage({
        type: 'hy-weekly-response',
        week: form.getAttribute('data-week') || '',
        owner: form.getAttribute('data-owner') || '',
        fields: collectFields(form)
      }, '*');
    }
    function watchImages(){
      var images = document.images || [];
      for (var i = 0; i < images.length; i++) {
        if (images[i].complete) continue;
        images[i].addEventListener('load', postHeight);
        images[i].addEventListener('error', postHeight);
      }
    }
    function install(){
      var form = document.getElementById('weekly-response');
      if (form) {
        form.addEventListener('submit', onSubmit, true);
        window.__weeklyResponseHandler = onSubmit;
      }
      window.addEventListener('message', function(event){
        if (event.source !== window.parent) return;
        var data = event.data;
        if (!data || data.type !== 'hy-weekly-fill' || !form) return;
        applyFields(form, data.fields || {});
        postHeight();
      });
      postHeight();
      window.addEventListener('load', postHeight);
      window.addEventListener('resize', postHeight);
      watchImages();
      if (window.ResizeObserver) {
        var target = document.documentElement || document.body;
        if (target) new ResizeObserver(postHeight).observe(target);
      }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
    else install();
  })();`;
}

export function buildSrcdoc(html) {
  const runtime = bridgeRuntimeSource().replace(/<\/script/gi, '<\\/script');
  let doc = String(html || '');
  const base = '<base href="about:srcdoc">';
  if (/<head[^>]*>/i.test(doc)) doc = doc.replace(/<head[^>]*>/i, (match) => match + base);
  else doc = base + doc;
  const script = '<script>' + runtime + '</' + 'script>';
  if (/<\/body>/i.test(doc)) return doc.replace(/<\/body>/i, script + '</body>');
  return doc + script;
}
