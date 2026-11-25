/* Family overview v7 — standalone read-only classic script. */
(function () {
"use strict";

const CSS = `
.fo-root{
  --paper:#f7efe1; --card:#fffaf1; --ink:#4a3a2c; --soft:#8a7560;
  --line:#e3d3bb; --terra:#c8734f; --sage:#8aa17a; --honey:#e0a94a;
  --rose:#d98b8b; --sky:#8fb0c4; --plum:#c4a08e;
}
.fo-root *{box-sizing:border-box}
.fo-root{
  margin:0; background:var(--paper); color:var(--ink);
  font-family:"Noto Sans TC",sans-serif;
  font-size:14px; line-height:1.55;
  background-image:radial-gradient(#e9dcc5 1px,transparent 1px);
  background-size:18px 18px;
}
.fo-root .wrap{max-width:1200px;margin:0 auto;padding:22px 24px 30px;min-width:0}
.fo-root .notice{
  background:#fbe3d3; border:2px dashed var(--terra); color:#8a3f22;
  border-radius:10px; padding:7px 14px; font-weight:700; text-align:center; font-size:14px;
}
.fo-root .serif{font-family:"Noto Serif TC","Noto Serif TC",serif}
.fo-root .ex{
  display:inline-block; background:#efe2cc; color:#8a6a45; border-radius:4px;
  font-size:11px; padding:0 5px; margin-right:3px; font-weight:700; vertical-align:1px;
}
.fo-root .real{
  display:inline-block; background:#dfeadf; color:#3f6b3f; border-radius:4px;
  font-size:11px; padding:0 5px; margin-right:3px; font-weight:700;
}
.fo-root .tbd{color:#b08c66; border-bottom:1px dotted #b08c66}
.fo-root .fo-header{display:flex; justify-content:space-between; align-items:flex-end; margin:18px 0 2px}
.fo-root h1{margin:0; font-size:34px; letter-spacing:3px; font-weight:700}
.fo-root .motto{font-size:17px; color:var(--terra); margin-top:6px}
.fo-root .motto .hint{font-size:12px; color:var(--soft); margin-left:6px}
.fo-root .meta{text-align:right; color:var(--soft); font-size:12.5px; line-height:1.6}
.fo-root h2{font-size:20px; margin:28px 0 10px; display:flex; align-items:baseline; gap:10px; letter-spacing:.5px}
.fo-root h2 .tag{font-family:"Noto Sans TC",sans-serif; font-size:12px; color:var(--soft); font-weight:400}
.fo-root h2:before{content:""; width:9px; height:20px; border-radius:3px; background:var(--terra); flex:0 0 9px; position:relative; top:2px}
.fo-root .sheet{
  background:var(--card); border:1px solid var(--line); border-radius:14px;
  padding:14px 16px 12px; box-shadow:0 2px 0 #eadcc4;
}
.fo-root .caption{font-size:12px; color:var(--soft); margin-top:8px; line-height:1.5}
.fo-root .bead-block{display:grid; grid-template-columns:248px 1fr; gap:8px 16px; align-items:center; padding:11px 4px}
.fo-root .bead-block + .bead-block{border-top:1px dashed var(--line)}
.fo-root .bead-lab{font-weight:700; font-size:14.5px}
.fo-root .bead-lab .sub{display:block; font-weight:400; font-size:12px; color:var(--soft); margin-top:2px}
.fo-root .beads{display:flex; flex-wrap:wrap; gap:7px; align-items:center}
.fo-root .bead{width:18px; height:18px; border-radius:50%; box-sizing:border-box; flex:0 0 18px}
.fo-root .bead.remain{border:2px solid var(--honey); background:transparent}
.fo-root .bead.unknown{border:2px dashed #c5b7a4; background:transparent}
.fo-root .bead.plan{border:2px solid #5b7a4c; background:#8aa17a}
.fo-root .bead.maybe{border:2px dashed var(--terra); background:transparent}
.fo-root .bead.off{border:2px solid #e4d5c0; background:#f3eee6}
.fo-root .people{display:grid; grid-template-columns:repeat(4,1fr); gap:12px}
.fo-root .p{background:var(--card); border:1px solid var(--line); border-radius:14px; padding:12px 14px 14px; box-shadow:0 2px 0 #eadcc4; display:flex; flex-direction:column; gap:7px}
.fo-root .ptop{display:flex; justify-content:space-between; align-items:center; gap:6px}
.fo-root .pname{font-size:15.5px; font-weight:700}
.fo-root .pname .sub{font-size:12px; color:var(--soft); font-weight:400}
.fo-root .weather{font-size:11.5px; padding:1px 8px; border-radius:20px; font-weight:700; white-space:nowrap}
.fo-root .sun{background:#fbe8bf; color:#9a6a10}
.fo-root .cloud{background:#e3e8ea; color:#5d6b72}
.fo-root .hug{background:#f6dada; color:#9a4646}
.fo-root .quote{font-family:"Noto Serif TC",serif; font-size:13px; background:#fbf3e4; border-left:3px solid var(--honey); padding:5px 8px; border-radius:0 6px 6px 0}
.fo-root .row{font-size:12.5px}
.fo-root .row b{color:var(--soft); font-weight:700; margin-right:4px}
.fo-root .step{font-size:12.5px; background:#eef3e9; border-radius:8px; padding:5px 8px}
.fo-root .step b{color:#5b7a4c}
.fo-root .p-guard{background:#fff4ea; border:2px dashed #e5b597; align-items:center; text-align:center; justify-content:center; gap:6px}
.fo-root .guard-top{display:grid; grid-template-columns:170px 1fr; gap:16px; align-items:center; margin-bottom:12px}
.fo-root .chapters-overview{display:grid; grid-template-columns:repeat(8,1fr); gap:6px}
.fo-root .ch-mini{border:1px dashed #c5b7a4; border-radius:10px; background:#f7efe1; text-align:center; padding:8px 4px 7px}
.fo-root .ch-mini .name{font-weight:700; font-size:12.5px; margin-top:2px}
.fo-root .ch-mini .st{font-size:11px; color:var(--soft)}
.fo-root .dot-tbd{display:inline-block; width:9px; height:9px; border-radius:50%; background:#ece6dc; border:1.5px dashed #b8a58c; vertical-align:middle}
.fo-root .binder-grid{display:grid; grid-template-columns:1fr 1fr; gap:12px}
.fo-root .ch-block{border:1px solid var(--line); border-radius:12px; background:#fffdf8; overflow:hidden}
.fo-root .ch-h{font-weight:700; font-size:13.5px; padding:6px 10px; color:#fff8ef}
.fo-root .ch-h small{font-weight:400; opacity:.9; margin-left:6px; font-size:11.5px}
.fo-root .ch-block table{width:100%; border-collapse:collapse; font-size:12px}
.fo-root .ch-block th,.fo-root .ch-block td{padding:5px 8px; border-bottom:1px dashed var(--line); text-align:left; vertical-align:top}
.fo-root .ch-block th:nth-child(2),.fo-root .ch-block td:nth-child(2),.fo-root .ch-block th:nth-child(3),.fo-root .ch-block td:nth-child(3){white-space:nowrap}
.fo-root .ch-block th{color:var(--soft); font-weight:700; font-size:11px; background:#fbf6ec}
.fo-root .ch-block tr:last-child td{border-bottom:0}
.fo-root .st{display:inline-block; font-size:11px; font-weight:700; border-radius:20px; padding:0 7px; white-space:nowrap}
.fo-root .s-ok{background:#dfeadf; color:#3f6b3f}
.fo-root .s-up{background:#fbe8bf; color:#8a5f10}
.fo-root .s-no{background:#f6dada; color:#9a4646}
.fo-root .s-tbd{background:#ece6dc; color:#8a7560; border:1px dashed #b8a58c}
.fo-root .legend-states{display:flex; flex-wrap:wrap; gap:12px; margin-top:10px; font-size:12px; color:var(--soft); align-items:center}
.fo-root .st-pill{display:inline-block; width:10px; height:10px; border-radius:50%; margin-right:4px; vertical-align:-1px}
.fo-root .st-ok{background:#8aa17a}
.fo-root .st-up{background:#e0a94a}
.fo-root .st-no{background:#d98b8b}
.fo-root .st-tbd-p{background:#ece6dc; border:1.5px dashed #b8a58c; box-sizing:border-box}
.fo-root .three{display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px}
.fo-root .q{background:var(--card); border:1px solid var(--line); border-radius:14px; padding:12px 14px 14px; box-shadow:0 2px 0 #eadcc4}
.fo-root .q h3{margin:0 0 6px; font-size:15px}
.fo-root .q.good h3{color:#5b7a4c}
.fo-root .q.hard h3{color:#a5533a}
.fo-root .q.learn h3{color:#8a6a1f}
.fo-root .q ul{margin:0; padding-left:18px}
.fo-root .q li{margin:4px 0; font-size:13.5px}
.fo-root .next{display:grid; grid-template-columns:1.35fr 1fr; gap:12px; align-items:start}
.fo-root table.chk{width:100%; border-collapse:collapse; font-size:13px}
.fo-root table.chk td,.fo-root table.chk th{border-bottom:1px dashed var(--line); padding:7px 6px; text-align:left; vertical-align:top}
.fo-root table.chk th{color:var(--soft); font-weight:700; font-size:12px}
.fo-root table.chk tr:last-child td{border-bottom:0}
.fo-root .chk-ok{color:#5b7a4c; font-weight:700}
.fo-root .chk-part{color:#b07a1c; font-weight:700}
.fo-root .chk-no{color:#a5533a; font-weight:700}
.fo-root .cal{display:grid; grid-template-columns:132px repeat(12,1fr); gap:5px; align-items:stretch}
.fo-root .cal-h{font-size:11.5px; color:var(--soft); text-align:center; padding-bottom:2px}
.fo-root .cal-lab{font-size:13px; font-weight:700; display:flex; flex-direction:column; align-items:flex-start; justify-content:center; line-height:1.3}
.fo-root .cal-lab span{display:block; font-weight:400; font-size:11px; color:var(--soft)}
.fo-root .slot{
  min-height:56px; border-radius:8px; border:1px solid var(--line);
  background:#fffdf8; font-size:11px; text-align:center; padding:5px 3px 4px;
  display:flex; flex-direction:column; justify-content:center; gap:1px; color:var(--ink); line-height:1.3
}
.fo-root .slot.start{background:#f3eee6; border-color:#e4d5c0; color:#a89480}
.fo-root .slot.tbd-slot{background:#f7efe1; border:1px dashed #c5b7a4; color:#b08c66}
.fo-root .slot.gone{background:#f6e6d4; border-color:#e0b08a}
.fo-root .slot.plan{background:#eef3e9; border-color:#b5c9a8}
.fo-root .slot.none{background:#f4efe6; border:1px dashed #c8b49a; color:#8a7560}
.fo-root .slot.maybe{background:#fffaf1; border:1.5px dashed var(--terra); color:#8a5a3a}
.fo-root .cal-legend{display:flex; flex-wrap:wrap; gap:14px; margin-top:10px; font-size:12px; color:var(--soft)}
.fo-root .cal-legend i{display:inline-block; width:12px; height:12px; border-radius:3px; margin-right:4px; vertical-align:-2px; box-sizing:border-box}
.fo-root .fo-footer{margin-top:22px; display:grid; grid-template-columns:1.4fr 1fr; gap:12px}
.fo-root .yr-review{background:#fff4ea; border:1px solid #efcfb6; border-radius:14px; padding:12px 14px}
.fo-root .foot-note{grid-column:1/-1; font-size:12px; color:var(--soft); margin-top:4px; text-align:center; line-height:1.6}.fo-root .rel-legend{display:flex;flex-wrap:wrap;gap:14px;align-items:center;font-size:12px;color:var(--soft);margin:0 0 10px}
.fo-root .rel-legend i.ln{display:inline-block;width:22px;height:4px;border-radius:4px;margin-right:5px;vertical-align:middle}
.fo-root .rel-legend i.ln.ok{background:#5b7a4c}
.fo-root .rel-legend i.ln.alert{background:#c8734f}
.fo-root .rel-legend i.ln.miss{background:#c5b7a4}
.fo-root .rel-legend i.ln.eva{background:#8a7560;height:2px;width:18px}
.fo-root .rel-grid{display:grid;grid-template-columns:824px 1fr;gap:12px;align-items:stretch}
.fo-root .net-stage{
  position:relative;width:824px;height:780px;
  background:#f4eadb;
  background-image:radial-gradient(#e3d3bb 1px,transparent 1px);
  background-size:16px 16px;
  border:1px solid var(--line);border-radius:14px;overflow:hidden;
}
.fo-root .net-stage svg.wires{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1}
.fo-root .orb{
  position:absolute;z-index:3;transform:translate(-50%,-50%);
  border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;
  box-shadow:0 2px 0 #eadcc4;text-align:center;line-height:1.2;
}
.fo-root .orb .oname{font-weight:700;font-size:14px}
.fo-root .orb .osub{font-size:10.5px;color:var(--soft);margin-top:1px}
.fo-root .orb.you{
  width:86px;height:86px;background:var(--terra);color:#fffaf1;
  border:3px solid #a85a38;z-index:4;
}
.fo-root .orb.you .oname{font-size:22px;font-family:"Noto Serif TC",serif;letter-spacing:2px}
.fo-root .orb.you .osub{color:#f7efe1}
.fo-root .orb.eva{width:64px;height:64px;background:#f8e4e0;border:3px solid #8aa17a;color:var(--ink)}
.fo-root .orb.kid1{width:64px;height:64px;background:#e4eef3;border:3px solid #8aa17a;color:var(--ink)}
.fo-root .orb.kid2{width:64px;height:64px;background:#e8f0e4;border:3px solid #8aa17a;color:var(--ink)}
.fo-root .orb.par{width:72px;height:72px;background:#f8ecd0;border:3px solid #c8734f;color:var(--ink)}
.fo-root .orb.mil{width:64px;height:64px;background:#f0e6df;border:3px solid #c5b7a4;color:var(--ink)}
.fo-root .orb .bang{
  position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;
  background:#c8734f;color:#fff;font-size:12px;font-weight:700;line-height:18px;
}
.fo-root .mini-card{
  position:absolute;z-index:5;
  background:var(--card);border:1px solid var(--line);border-radius:12px;
  padding:7px 9px 8px;box-shadow:0 2px 0 #eadcc4;
  width:222px;font-size:12px;line-height:1.4;
}
.fo-root .mini-card.wide{width:248px}
.fo-root .mini-card .ptop{display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:4px}
.fo-root .mini-card .pname{font-size:14px;font-weight:700}
.fo-root .mini-card .quote{font-family:"Noto Serif TC",serif;font-size:12px;background:#fbf3e4;border-left:3px solid var(--honey);padding:4px 7px;border-radius:0 6px 6px 0;margin:0 0 5px}
.fo-root .mini-card .row{font-size:12px;margin:2px 0}
.fo-root .mini-card .row b{color:var(--soft);font-weight:700;margin-right:4px}
.fo-root .mini-card .beads{display:flex;flex-wrap:wrap;gap:3px;align-items:center;margin-top:3px}
.fo-root .mini-card .bead{width:11px;height:11px;border-radius:50%;box-sizing:border-box;flex:0 0 11px}
.fo-root .week-side{display:flex;flex-direction:column;gap:8px}
.fo-root .week-side .q{flex:0 0 auto;padding:10px 12px 12px}
.fo-root .week-side .q h3{font-size:14px;margin:0 0 4px}
.fo-root .week-side .q li{font-size:12.5px;margin:3px 0}
.fo-root .week-side .side-title{font-weight:700;font-size:14.5px;display:flex;align-items:baseline;gap:8px}
.fo-root .week-side .side-title .tag{font-weight:400;font-size:11.5px;color:var(--soft)}
.fo-root .fam-strip{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}
.fo-root .fam-chip{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:8px 12px;box-shadow:0 2px 0 #eadcc4;font-size:12.5px}
.fo-root .fam-chip .pname{font-weight:700;margin-right:8px}
.fo-root{flex:1;min-height:0;min-width:0;overflow-y:auto;max-width:100%;white-space:normal;text-align:left}
.fo-root .fo-scroll{overflow-x:auto;min-width:0;max-width:100%}
.fo-root .life{min-width:1000px;width:100%;display:block;height:auto}
.fo-root .life text{font-family:'Noto Sans TC',sans-serif;fill:var(--ink);font-size:12px}
.fo-root .life .muted{fill:var(--soft);font-size:11px}
.fo-root .life .marker{fill:#6b5a8a;font-size:10px}
.fo-root .life .now{fill:var(--terra);font-weight:bold}
.fo-root .life .svg-block{font-size:12px;line-height:1.5;text-align:center;overflow-wrap:anywhere;padding:4px 8px}
.fo-root .life .svg-block .caption{margin:2px 0}
.fo-root .rel-grid{grid-template-columns:minmax(0,824px) minmax(220px,1fr)}
.fo-root .cal{min-width:980px}
.fo-root .slot{white-space:pre-line}
.fo-root .slot .real,.fo-root .slot .ex{align-self:center;margin:0}
.fo-root .fo-header{gap:16px}
.fo-root .fo-message{padding:28px;text-align:center}
.fo-root .height-group{display:flex;gap:22px;justify-content:center;align-items:end}
.fo-root .height-person{text-align:center;flex:1}
.fo-root .height-bars{display:flex;justify-content:center;gap:8px;align-items:end;height:85px}
.fo-root .height-bar{width:22px;border-radius:5px 5px 0 0;background:var(--terra);min-height:3px}
.fo-root .height-bar.unknown{height:54px;border:1px dashed var(--line);background:transparent}
.fo-root .height-label{font-size:11px;color:var(--soft)}
.fo-root .ch-block td{overflow-wrap:anywhere}
.fo-root .ch-block td:nth-child(3),.fo-root .ch-block td:nth-child(2){white-space:normal}
.fo-root .estimate{color:#6b5a8a;font-size:11px;margin-right:3px}
.fo-root .ring{width:120px;height:120px;border-radius:50%;display:grid;place-items:center;margin:auto;background:conic-gradient(#c5b7a4 0deg 43deg,#fffaf1 43deg 45deg,#c5b7a4 45deg 88deg,#fffaf1 88deg 90deg,#c5b7a4 90deg 133deg,#fffaf1 133deg 135deg,#c5b7a4 135deg 178deg,#fffaf1 178deg 180deg,#c5b7a4 180deg 223deg,#fffaf1 223deg 225deg,#c5b7a4 225deg 268deg,#fffaf1 268deg 270deg,#c5b7a4 270deg 313deg,#fffaf1 313deg 315deg,#c5b7a4 315deg 358deg,#fffaf1 358deg)}
.fo-root .ring-inner{background:var(--card);border-radius:50%;width:84px;height:84px;display:grid;place-content:center;text-align:center;font-size:11px}
.fo-root .ring-inner b{font-size:20px}
@media(max-width:900px){.fo-root .rel-grid{grid-template-columns:minmax(0,1fr)}.fo-root .week-side{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.fo-root .side-title{grid-column:1/-1}.fo-root .chapters-overview{grid-template-columns:repeat(4,minmax(0,1fr))}}
@media(max-width:640px){.fo-root .wrap{padding:12px 10px 20px}.fo-root .fo-header{display:block}.fo-root .meta{text-align:left;margin-top:8px}.fo-root h1{font-size:27px}.fo-root h2{flex-wrap:wrap;gap:4px}.fo-root .next,.fo-root .binder-grid,.fo-root .fo-footer,.fo-root .week-side,.fo-root .guard-top{grid-template-columns:minmax(0,1fr)}.fo-root .sheet{padding:10px}.fo-root .chk{min-width:490px}.fo-root .ch-block table{font-size:11px}.fo-root .ch-block th,.fo-root .ch-block td{padding:5px 3px}.fo-root .foot-note{grid-column:1}.fo-root .life{min-width:1000px}}
`;

const arr=v=>Array.isArray(v)?v:[];
const obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=(v,f=0)=>typeof v==='number'&&Number.isFinite(v)?v:f;
const color=(v,f='#c5b7a4')=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v)?v:f;
const pick=(v,allowed,f)=>allowed.includes(v)?v:f;
const sources={known:'已知',example:'示意',estimate:'推估',pending:'待補'};
const tag=s=>s==='known'?'<span class="real">已知</span>':s==='example'?'<span class="ex">示意</span>':s==='estimate'?'<span class="estimate">推估</span>':'<span class="tbd">待補</span>';
function flag(v){v=obj(v);if(v.text==null)return tag('pending');const s=pick(v.source,Object.keys(sources),'pending');if(s==='pending'&&String(v.text).includes('待補'))return `<span class="tbd">${esc(v.text)}</span>`;return tag(s)+esc(v.text);}
function rich(v,sep=''){return arr(obj(v).parts).length?arr(v.parts).map(flag).join(sep):tag('pending');}
function plain(v){return arr(obj(v).parts).map(p=>{if(p.text==null)return '待補';const src=sources[p.source];const t=String(p.text);if(!src||t.includes(src))return t;return `${t}（${src}）`;}).join('');}
function textOf(v){v=obj(v);if(arr(v.parts).length)return plain(v);return !('text' in v)?'':(v.text==null?'待補':String(v.text));}
const ids=['self','eva','yunlin_parents','mother_in_law','elder','younger'];
const names={self:'你',eva:'EVA',yunlin_parents:'雲林爸媽',mother_in_law:'新竹岳母',elder:'大寶',younger:'小寶'};
function name(id,short=false){return short&&id==='self'?'我':short&&id==='mother_in_law'?'岳母':names[id]||'待補';}
function order(d){const p=arr(d.peopleOrder).filter(id=>ids.includes(id));return p.length?[...new Set(p)]:ids;}
function age(d,id,year){const a=obj(obj(d.people)[id]).ageYears;return typeof a==='number'&&Number.isFinite(a)?a+year-num(obj(d.meta).ageAnchorYear,2026):null;}
function ageText(d,id,year){const a=age(d,id,year);return a===null?'年齡？':`${a} 歲（${sources[obj(obj(d.people)[id]).ageSource]||'待補'}）`;}
const hasExample=v=>v&&typeof v==='object'&&Object.entries(v).some(([k,x])=>((k==='source'||k.endsWith('Source'))&&x==='example')||hasExample(x));
const heading=(s,t)=>`<h2 class="serif">${s} <span class="tag">${esc(t)}</span></h2>`;
const sheet=s=>`<div class="sheet">${s}</div>`;
const scroll=s=>`<div class="fo-scroll" tabindex="0">${s}</div>`;
const line=(x,y,x2,y2,c='#e3d3bb',w=1)=>`<line x1="${x}" y1="${y}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}"/>`;
const txt=(x,y,t,cl='',anchor='start')=>`<text x="${x}" y="${y}" text-anchor="${anchor}" class="${cl}">${esc(t)}</text>`;function life(d){const l=obj(d.lifeScroll),m=obj(d.meta),base=num(m.baseYear,2026),end=num(m.horizonYear,2036),selfAge=age(d,'self',base), x=a=>108+a*988/80, clamp=a=>Math.max(108,Math.min(1096,a)), now=selfAge===null?null:clamp(x(selfAge)), future=now===null?null:clamp(x(selfAge+end-base));let svg='';
 if(now!==null)svg+=`<rect x="${now}" y="26" width="${Math.max(0,future-now)}" height="282" rx="6" fill="#c8734f" opacity=".06"/>`+txt((now+future)/2,20,'近看未來 10 年','now','middle');
 svg+=txt(4,46,'遠看','muted')+txt(4,60,'到 80 歲','muted')+line(108,44,1096,44,'#e3d3bb',2);
 for(let a=0;a<=80;a+=10)svg+=line(x(a),38,x(a),50,'#8a7560',1.5)+txt(x(a),64,a,'muted','middle');
 const markers=arr(l.farMarkers), rows=order(d);const yBy={};
 rows.forEach((id,i)=>{const y=96+i*40;yBy[id]=y;const p=obj(obj(d.people)[id]),a=age(d,id,base),c=color(p.color),start=a===null||now===null?250:clamp(now-a*988/80),finish=a===null||now===null?970:id==='self'?1096:id==='yunlin_parents'?clamp(future+18):clamp(future+100);svg+=txt(100,y+4,name(id,true),'','end');
 if(a===null||now===null){svg+=`<rect x="${start}" y="${y-8}" width="${finish-start}" height="16" rx="8" fill="none" stroke="${c}" stroke-dasharray="5 4"/>`+txt((start+finish)/2,y+4,'年齡待補','muted','middle');return;}
 svg+=`<rect x="${start}" y="${y-8}" width="${Math.max(0,finish-start)}" height="16" rx="8" fill="${c}"/>`+`<circle cx="${now}" cy="${y}" r="5" fill="#fffaf1" stroke="${c}" stroke-width="2"/>`+(id==='self'?'':txt(now-8,y-14,`${a}（${sources[p.ageSource]||'待補'}）`,'muted','end'));
 if(id!=='self'&&id!=='yunlin_parents')svg+=txt(future+8,y+4,`${age(d,id,end)} · ${end}（推估）`,'muted');
 if(id==='elder'||id==='younger')for(const milestone of [18,22]){const xx=x(selfAge+milestone-a);if(xx>=108&&xx<=1096)svg+=line(xx,y-12,xx,y+12,'#6b5a8a',1.2)+txt(xx,y-14,milestone,'marker','middle');}
 });
 if(now!==null){svg+=line(now,24,now,307,'#c8734f',1.4)+txt(now-8,16,'現在','now','end');const nm=markers.find(v=>v.kind==='now');if(nm)svg+=txt(now-8,77,plain(nm.label),'now','end');
 const same=markers.filter(v=>v.kind==='marker'&&arr(v.personIds).includes('self'));same.forEach((v,i)=>{const xx=clamp(x(selfAge+num(v.year,base)-base)+18);svg+=txt(Math.min(1090,xx+i*150),78,'◆ '+plain(v.label),'marker');});
 markers.filter(v=>v.kind==='marker'&&!arr(v.personIds).includes('self')).forEach(v=>{const xx=clamp(x(selfAge+num(v.year,base)-base));arr(v.personIds).forEach(id=>{if(yBy[id]!=null)svg+=line(xx,yBy[id]-12,xx,yBy[id]+12,'#6b5a8a',1.4)+txt(xx+5,yBy[id]-14,'◆ '+plain(v.label),'marker');});});
 const spans=markers.filter(v=>v.kind==='span'),spanTop=96+rows.length*40+20;spans.forEach((v,i)=>{const xx=clamp(x(selfAge+num(v.year,base)-base));svg+=txt(xx,spanTop+i*16,plain(v.label),'marker');});}
 const blocks=arr(l.nearBlocks),cells=arr(l.yearCells);const nearH=Math.max(78,...blocks.map(b=>60+arr(b.markers).length*20)),detailH=Math.max(148,...cells.map(c=>70+(arr(c.events).length+arr(c.markers).length+(c.school?1:0))*35));const spanTop=96+order(d).length*40+20,spanCount=arr(obj(d.lifeScroll).farMarkers).filter(v=>v.kind==='span').length,nearY=spanTop+28+spanCount*16,detailY=nearY+nearH+8;
 function fo(x,y,w,h,body){return `<foreignObject x="${x}" y="${y}" width="${w}" height="${h}"><div xmlns="http://www.w3.org/1999/xhtml" class="svg-block">${body}</div></foreignObject>`;}
 svg+=line(40,nearY-8,1100,nearY-8)+txt(100,nearY+16,'近看','','end')+txt(100,nearY+30,'未來 10 年','muted','end');
 blocks.forEach((b,i)=>{const w=988/Math.max(1,blocks.length),xx=108+i*w;svg+=`<rect x="${xx}" y="${nearY}" width="${w}" height="${nearH}" rx="8" fill="${i%2?'#f3eee6':'#fff4ea'}"/>`+fo(xx,nearY,w,nearH,`<b>${rich(b.ageSummary)}</b><div>${rich(b.narrative)}</div>${arr(b.markers).map(t=>`<div style="color:#6b5a8a">◆ ${rich(t)}</div>`).join('')}`);});
 svg+=txt(100,detailY+18,'細看','','end')+txt(100,detailY+32,'未來 5 年','muted','end')+txt(100,detailY+46,'一年一格','muted','end');
 cells.forEach((c,i)=>{const w=988/Math.max(1,cells.length),xx=108+i*w;svg+=`<rect x="${xx}" y="${detailY}" width="${w}" height="${detailH}" fill="#fffaf1" stroke="#eadcc4"/>`+fo(xx,detailY+5,w,detailH-5,`<b>${esc(c.year)}</b><div class="caption">${rich(c.ageLine)}</div>${arr(c.events).map(t=>`<div>${rich(t)}</div>`).join('')}${arr(c.markers).map(t=>`<div style="color:#6b5a8a">◆ ${rich(t)}</div>`).join('')}${c.school?`<div>${rich(c.school)}</div>`:''}`);});
 const h=detailY+detailH+8;return heading('一、我們家的人生長卷',l.headingTag)+sheet(scroll(`<svg class="life" viewBox="0 0 1120 ${h}" role="img" aria-label="人生長卷三層時間軸">${svg}</svg>`)+`<div class="caption">${esc(l.footnote)}</div><div class="caption">${esc(l.caption)}</div>`);
}

function together(d){const t=obj(d.together),c=obj(t.calendar),states={start:'start',pending:'tbd-slot',done:'gone',planned:'plan',none:'none',maybe:'maybe'},labels={start:'—',pending:'待補',done:'已去',planned:'已排',none:'未排',maybe:'尚未確認'},rc={done:'chk-ok',partial:'chk-part',not_done:'chk-no',na:''};const rows=arr(t.rows).map(r=>`<tr><td${r.spanLastAndResult?' colspan="2"':''}>${rich(r.lastWeek)}</td>${r.spanLastAndResult?'':`<td class="${rc[r.result?.state]||''}">${r.result?rich(r.result):'—'}</td>`}<td>${rich(r.nextWeek,'<br>')}</td></tr>`).join('');let cal='<div></div>'+Array.from({length:12},(_,i)=>`<div class="cal-h">${i+1}月</div>`).join('');for(const track of arr(c.tracks)){cal+=`<div class="cal-lab">${esc(track.label)}<span>${esc(track.cadence)}</span></div>`;for(let i=1;i<=12;i++){const s=arr(track.slots).find(v=>v.month===i)||{},st=pick(s.state,Object.keys(states),'pending');const parts=arr(s.parts),onlyDash=parts.length&&parts.every(p=>!p.text||p.text==='—'||p.text==='-');cal+=`<div class="slot ${states[st]}" title="${esc(labels[st])}">${!parts.length?(st==='pending'?'':esc(labels[st])):(onlyDash&&(st==='start'||st==='pending')?esc('—'):rich(s,'<br>'))}</div>`;}}return heading('二、下週要一起做的事',t.headingTag)+`<div class="next">${sheet(scroll(`<table class="chk"><thead><tr><th style="width:40%">上週說要做的</th><th style="width:16%">結果</th><th>下週接著做</th></tr></thead><tbody>${rows}</tbody></table>`))}${sheet(`<b>${esc(t.monthTitle)}</b><div class="caption">${esc(t.monthNote)}</div>`)}</div><div style="margin-top:12px">${sheet(`<div style="margin-bottom:8px"><b>${esc(c.title)}</b> ${tag(c.titleSource)} <span class="caption">${esc(c.note)}</span></div>${scroll(`<div class="cal">${cal}</div>`)}<div class="cal-legend">${Object.keys(states).map(k=>`<span><i class="slot ${states[k]}" style="min-height:0;padding:0"></i>${esc({start:'節奏尚未開始',pending:'待補',done:'已去',planned:'已排',none:'未排',maybe:'依節奏推算，尚未確認'}[k])}</span>`).join('')}</div>`)}</div>`;}

function weather(w){w=obj(w);const k=pick(w.kind,['sun','cloud','hug','none'],'none');return k==='none'?'':`<span class="weather ${k}">${esc(w.label||{sun:'晴',cloud:'多雲',hug:'想多陪陪'}[k])}</span>`;}

function card(d,id,pos){const p=obj(obj(d.people)[id]),t=obj(p.together);return `<div class="mini-card${pos.wide?' wide':''}" style="left:${num(pos.x)}px;top:${num(pos.y)}px"><div class="ptop"><span class="pname">${esc(name(id))}</span>${weather(p.weather)}</div><div class="quote">${rich(p.quote)}</div><div class="row"><b>近況</b>${rich(p.status)}</div><div class="row"><b>一起</b>${rich(t.summary)}<div class="beads">${arr(t.beads).map(b=>`<span class="bead ${pick(b.kind,['remain','unknown','plan','maybe','off'],'unknown')}"${b.label?` title="${esc(plain({parts:[b.label]}))}"`:''}></span>${b.label?`<span>${flag(b.label)}</span>`:''}`).join('')}</div></div><div class="row"><b>回頭看</b>${rich(p.lookback)}</div></div>`;}

function relations(d){const r=obj(d.relations),w=obj(d.weeklyLookback),o=obj(r.orbs),p=obj(d.people),stage=obj(r.stage),width=Math.max(1,num(stage.width,824)),height=Math.max(1,num(stage.height,780)),base=num(obj(d.meta).baseYear,2026),styles={ok:['#5b7a4c',3.4],alert:['#c8734f',3.6],neutral:['#c5b7a4',3.4],eva_care:['#8a7560',1.6]};let wires='';for(const l of arr(r.links)){if(!ids.includes(l.from)||!ids.includes(l.to)||!o[l.from]||!o[l.to])continue;const a=o[l.from],b=o[l.to],s=styles[pick(l.style,Object.keys(styles),'neutral')];wires+=line(num(a.x),num(a.y),num(b.x),num(b.y),s[0],Math.max(0,num(l.width,s[1])));}const orbs=order(d).filter(id=>o[id]).map(id=>{const pp=obj(p[id]),a=o[id],cl=pick(pp.orbClass,['you','eva','kid1','kid2','par','mil'],'mil');return `<div class="orb ${cl}" style="left:${num(a.x)}px;top:${num(a.y)}px"><div class="oname">${esc(name(id,id==='mother_in_law'))}</div><div class="osub">${esc(ageText(d,id,base))}</div>${pp.alert?`<span class="bang" title="${esc(textOf(pp.alertNote))}">!</span>`:''}</div>`;}).join('');const cards=order(d).filter(id=>id!=='self'&&obj(r.cards)[id]).map(id=>card(d,id,r.cards[id])).join('');const groups=[['kept','這陣子留下的','good'],['hard','不太順的','hard'],['learned','學到的，下次這樣做','learn']];const side=`<div class="week-side"><div class="side-title">${esc(w.title||'這週回頭看')} <span class="tag">${esc(w.tag)}</span></div>${groups.map(([k,label,cl])=>`<div class="q ${cl}"><h3>${label}</h3><ul>${arr(w[k]).map(v=>`<li>${rich(v)}</li>`).join('')||'<li>待補</li>'}</ul></div>`).join('')}${arr(w.chips).map(c=>`<div class="fam-chip"><span class="pname">${esc(c.label)}</span>${weather(c.weather)}<div>${rich(c.text)}</div></div>`).join('')}</div>`;return heading('三、家的關係圖','以你為中心；每人旁邊一張小卡：近況與心情、還能一起的次數、這週回頭看')+`<div class="rel-legend">${rich(r.legendNote)} <span><i class="ln ok"></i>互動尚可</span><span><i class="ln alert"></i>太久沒互動</span><span><i class="ln miss"></i>中性／近況不足</span><span><i class="ln eva"></i>EVA 的照顧線</span></div><div class="rel-grid">${scroll(`<div class="net-stage" style="width:${width}px;height:${height}px"><svg class="wires" viewBox="0 0 ${width} ${height}" aria-hidden="true">${wires}</svg>${orbs}${cards}</div>`)}${side}</div><div class="caption">空心圓＝還能一起的次數；虛線＝還不知道；綠點＝已排；橙色虛線＝依節奏尚未確認。</div>`;}const statuses={ready:['已備好','s-ok'],needs_update:['要更新','s-up'],not_started:['還沒開始','s-no'],pending:['待補','s-tbd']};

function foundation(d){const f=obj(d.foundation),chs=arr(f.chapters);function summary(c){const a=arr(c.items);if(a.some(i=>i.statusSource==='example'))return '有示範';if(!a.length||a.every(i=>i.status==='pending'||i.statusSource==='pending'))return '待補';return Object.keys(statuses).map(k=>{const n=a.filter(i=>(i.statusSource==='pending'?'pending':i.status)===k).length;return n?`${statuses[k][0]} ${n}`:'';}).filter(Boolean).join(' · ');}
const mini=chs.map(c=>`<div class="ch-mini"><span class="dot-tbd"></span><div class="name">${esc(c.title)}</div><div class="st">${esc(summary(c))}</div></div>`).join('');const blocks=chs.map(c=>`<div class="ch-block"><div class="ch-h" style="background:${color(c.color)}">${esc(c.number)}、${esc(c.title)} <small>${esc(c.subtitle)}</small></div><table><thead><tr><th>項目</th><th>狀態</th><th>上次看</th><th>下次看</th></tr></thead><tbody>${arr(c.items).map(i=>{const k=pick(i.status,Object.keys(statuses),'pending'),s=statuses[k];return `<tr><td>${esc(i.title)}</td><td>${k==='pending'&&i.statusSource==='pending'?'':tag(i.statusSource)}<span class="st ${s[1]}">${s[0]}</span></td><td>${flag(i.lastReviewed)}</td><td>${flag(i.nextReview)}</td></tr>`;}).join('')}</tbody></table></div>`).join('');return heading('四、家的安心底子（長期保障）',f.headingTag)+sheet(`<div class="guard-top"><div class="ring"><div class="ring-inner"><b>${chs.length} 章</b>${esc(f.summaryNote)}</div></div><div><div class="chapters-overview">${mini}</div><div class="legend-states"><span>圖例：</span>${Object.values(statuses).map(([label,cl],i)=>`<span><i class="st-pill ${['st-ok','st-up','st-no','st-tbd-p'][i]}"></i>${label}</span>`).join('')}<span>標「示意」的狀態僅為示範。</span></div></div></div><div class="binder-grid">${blocks}</div><div class="caption">${rich(f.reviewCadence)} · ${esc(f.caption)}</div>`);}

function footer(d){const y=obj(d.yearEnd),h=obj(d.heightMarks),people=arr(h.people).filter(p=>['elder','younger'].includes(p.personId));const vals=people.flatMap(p=>[p.lastYear,p.thisYear]).filter(v=>typeof v==='number'&&Number.isFinite(v)&&v>0),max=Math.max(1,...vals);function bar(v,label){const valid=typeof v==='number'&&Number.isFinite(v)&&v>0;return `<div><div class="height-bars"><div class="height-bar${valid?'':' unknown'}"${valid?` style="height:${Math.max(3,v/max*72)}px"`:''}></div></div><div class="height-label">${label}${valid?` ${esc(v)} ${esc(h.unit||'cm')}`:''}</div></div>`;}return `<div class="fo-footer"><div class="yr-review"><b class="serif">${esc(y.title||'年底的家庭回顧')}</b> <span class="caption">${esc(y.tag)}</span><div>${rich(y.prompt)}</div>${arr(y.entries).filter(e=>ids.includes(e.personId)).map(e=>`<div><b>${esc(name(e.personId))}</b> ${flag(e.text)}</div>`).join('')}</div><div class="yr-review"><b class="serif">${esc(h.title||'門框身高')}</b> ${tag(h.titleSource)} <span class="caption">${esc(h.note)}</span><div class="height-group">${people.map(p=>`<div class="height-person"><b>${esc(name(p.personId))}</b><div class="height-group">${bar(p.lastYear,'去年')}${bar(p.thisYear,'今年')}</div>${p.lastYear==null||p.thisYear==null?tag('pending'):''}</div>`).join('')}</div></div><div class="foot-note">${esc(d.footerNote)}${d.updatedAt?` · 更新：${esc(d.updatedAt)}`:''}</div></div>`;}

function root(container){if(typeof container==='string')container=document.querySelector(container);if(!container||typeof container.querySelector!=='function')throw new TypeError('Family overview container required');if(!document.getElementById('fo-overview-style')){const style=document.createElement('style');style.id='fo-overview-style';style.textContent=CSS;document.head.appendChild(style);}if(container.classList.contains('fo-root'))return container;let r=container.querySelector('.fo-root');if(!r){r=document.createElement('div');r.className='fo-root';container.appendChild(r);}return r;}

const failure='現在讀不到家庭總覽，請稍後再試。';

function valid(d){return d!==null&&typeof d==='object'&&!Array.isArray(d)&&d.schemaVersion===1;}

window.showFamilyOverviewMessage=function(container,message){root(container).innerHTML=`<div class="wrap"><div class="sheet fo-message" role="status">${esc(message)}</div></div>`;};

window.renderFamilyOverview=function(container,d){if(!valid(d)){window.showFamilyOverviewMessage(container,failure);return;}const h=obj(d.header),n=obj(d.notice);root(container).innerHTML=`<div class="wrap">${n.show||hasExample(d)?`<div class="notice">${esc(n.text||'示意圖：標「示意」的為範例，非真實資料。')}</div>`:''}<div class="fo-header"><div><h1 class="serif">${esc(d.title||'我們家的全景')}</h1><div class="motto serif">${rich(h.motto)} <span class="hint">${esc(h.mottoHint)}</span></div></div><div class="meta">${esc(h.curator)} · ${esc(h.cadence)}<br>${esc(h.purpose)}</div></div>${life(d)}${together(d)}${relations(d)}${foundation(d)}${footer(d)}</div>`;};

function headers(){if(typeof getHeaders==='function')return getHeaders();let token;try{token=sessionStorage.getItem('hy_life_os_access_token')||sessionStorage.getItem('hy_world_access_token');}catch(_){}return token?{Authorization:'Bearer '+token}:{};}

const latest=new WeakMap();

window.loadFamilyOverview=async function(container){const r=root(container),ticket={};latest.set(r,ticket);const current=()=>latest.get(r)===ticket;const message=s=>{if(current())window.showFamilyOverviewMessage(r,s);};message('載入家庭總覽中…');try{const api=String(window.API||'https://hy-agent-v2.onrender.com').replace(/\/$/,'');const request=async()=>fetch(api+'/api/family-overview',{method:'GET',cache:'no-store',headers:await headers()});let res=await request();const auth=s=>s===401||s===403;if(auth(res.status)&&typeof refreshAccessToken==='function'){try{await refreshAccessToken();res=await request();}catch(_){message('尚未登入，無法載入家庭總覽');return;}}if(auth(res.status)){message('尚未登入，無法載入家庭總覽');return;}if(!res.ok)throw Error('HTTP');const body=await res.json();if(body?.ok===false&&body.reason==='not_found'){message('目前還沒有家庭總覽資料。');return;}if(body?.ok!==true||!valid(body.data))throw Error('Invalid response');if(current())window.renderFamilyOverview(r,body.data);}catch(_){message(failure);}};

})();

/* 全文結束 */