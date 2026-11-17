// Merge the A+ tree into a local {revision, items} file.
// This script only reads and writes local JSON. It does not call the network.
import {readFileSync, writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

const API_KEYS = ['id','project_id','parent_id','order','kind','name','owner','start','end','status','checkpoint_type','date','started','delayed'];
const API_KEY_SET = new Set(API_KEYS);

export function isAplusItem(row) {
  return !!row && (row.id==='aplus' || row.project_id==='aplus' || (typeof row.id==='string' && row.id.startsWith('aplus-')));
}

export function toApiItem(row) {
  const out = {};
  for (const key of API_KEYS) if (key in row) out[key] = row[key];
  return out;
}

export function assertApiShape(items) {
  const required = API_KEYS.slice(0, 12);
  for (const row of items) {
    for (const key of required) if (!(key in row)) throw new Error(`缺少欄位 ${key}：${row?.id}`);
    for (const key of Object.keys(row)) if (!API_KEY_SET.has(key)) throw new Error(`後端不接受欄位 ${key}：${row.id}`);
    if (row.kind==='checkpoint' && (row.started===true || row.delayed===true)) throw new Error(`查核點不可標記開始或 delay：${row.id}`);
    if (row.kind==='project' && (row.start!=null || row.end!=null)) throw new Error(`主專案不儲存起迄：${row.id}`);
  }
}

// Source shape matches inputs/aplus-source.json. `inline` is kept here so the
// repo file states the marker; mergeGantt strips it because the live API rejects unknown keys.
export function buildAplusItems(source) {
  const project = source?.project;
  if (!project?.id || !Array.isArray(source.lines)) throw new Error('A+ 來源格式不對');
  const items = [{
    id: project.id, kind: 'project', parent_id: null, project_id: project.id, order: 0,
    name: project.name, owner: '', start: null, end: null, status: 'wait',
    checkpoint_type: null, date: null, started: false, delayed: false,
  }];
  const seen = new Set([project.id]);
  source.lines.forEach((line, li) => {
    if (seen.has(line.id)) throw new Error(`識別碼重複：${line.id}`);
    seen.add(line.id);
    items.push({
      id: line.id, kind: 'task', parent_id: project.id, project_id: project.id, order: li,
      name: line.name, owner: '', start: line.start, end: line.end, status: 'wait',
      checkpoint_type: null, date: null, started: false, delayed: false,
    });
    (line.milestones||[]).forEach((ms, mi) => {
      if (seen.has(ms.id)) throw new Error(`識別碼重複：${ms.id}`);
      seen.add(ms.id);
      items.push({
        id: ms.id, kind: 'checkpoint', parent_id: line.id, project_id: project.id, order: 1000+mi,
        name: ms.name, owner: '', start: null, end: null, status: 'wait',
        checkpoint_type: 'general', date: ms.date, inline: true,
      });
    });
    const walk = (nodes, parentId) => {
      (nodes||[]).forEach((node, index) => {
        if (!node?.name || node.name.trim()==='123' || node.excel_row===833) return;
        if (node.excel_row==null) throw new Error(`週任務缺少列號：${node.name}`);
        const id = `aplus-r${node.excel_row}`;
        if (seen.has(id)) throw new Error(`識別碼重複：${id}`);
        seen.add(id);
        items.push({
          id, kind: 'task', parent_id: parentId, project_id: project.id, order: index,
          name: node.name, owner: node.owner||'', start: node.start, end: node.end, status: 'wait',
          checkpoint_type: null, date: null, started: false, delayed: false,
        });
        if (node.children?.length) walk(node.children, id);
      });
    };
    walk(line.tasks, line.id);
  });
  return items;
}

export function mergeGantt(existing, aplusItems) {
  if (!existing || typeof existing.revision!=='string' || !Array.isArray(existing.items)) throw new Error('既有甘特資料須為 {revision, items}');
  if (!Array.isArray(aplusItems) || !aplusItems.length) throw new Error('A+ 項目清單是空的');
  const others = existing.items.filter(row => !isAplusItem(row));
  const prev = existing.items.find(row => row.id==='aplus');
  const incoming = aplusItems.map(toApiItem);
  const root = incoming.find(row => row.id==='aplus' && row.kind==='project');
  if (!root) throw new Error('A+ 清單缺少主專案 aplus');
  if (prev) root.order = prev.order;
  else root.order = others.filter(row => row.parent_id==null).reduce((max, row) => Math.max(max, Number(row.order)||0), -1)+1;
  const items = [...others, ...incoming];
  assertApiShape(items.filter(isAplusItem));
  return {revision: existing.revision, items};
}

function readJson(file) {
  const data = JSON.parse(readFileSync(file, 'utf8'));
  return Array.isArray(data) ? data : data.items;
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || !args.length) {
    console.error('用法：node scripts/merge-aplus-gantt.mjs --existing 現有.json [--aplus aplus-items.json] [--out 合併.json]');
    console.error('只讀寫本機檔案，不呼叫網路。未加 --out 時寫到標準輸出。');
    process.exit(args.includes('--help') ? 0 : 1);
  }
  let existingFile, aplusFile = new URL('../docs/quality/gantt/aplus-items.json', import.meta.url), outFile;
  for (let i=0;i<args.length;i++) {
    const arg = args[i];
    if (arg==='--existing') existingFile = args[++i];
    else if (arg==='--aplus') aplusFile = args[++i];
    else if (arg==='--out') outFile = args[++i];
    else if (!existingFile) existingFile = arg;
    else throw new Error(`無法辨識參數 ${arg}`);
  }
  if (!existingFile) throw new Error('請指定 --existing');
  const existing = JSON.parse(readFileSync(existingFile, 'utf8'));
  const aplusItems = readJson(aplusFile);
  const merged = mergeGantt(existing, aplusItems);
  const text = JSON.stringify(merged, null, 2)+'\n';
  if (outFile) writeFileSync(outFile, text);
  else process.stdout.write(text);
}

if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  try { main(); }
  catch (error) { console.error(error.message); process.exit(1); }
}
