import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Marked } from 'marked';

const directory = new URL('./', import.meta.url);
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[character]
  );
const markdown = new Marked({
  renderer: {
    html({ text }) {
      return escape(text);
    },
    link({ href, tokens }) {
      const label = this.parser.parseInline(tokens);
      const version = href.match(
        /^versions\/(recommended-v2|original|codex|fable|grok|gemini|deepseek|glm)(-(?:notes|verification|checks))?\.md$/
      );
      if (version) {
        return `<a href="#version=${version[1]}&amp;section=${version[2] ? 'notes' : 'page'}">${label}</a>`;
      }
      if (!/^(https?:|mailto:|#)/i.test(href)) return label;
      return `<a href="${escape(href)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    },
    image({ text }) {
      return `<span class="image-placeholder">[Image description: ${escape(text)}]</span>`;
    }
  }
});

function render(source) {
  // Text-only visual blocks are a review convenience, never recreated product screenshots.
  const parts = source.split(/(?=^\*\*(?:Screen|Visual)(?:\*\*|[.:]))/m);
  if (parts.length === 1) return markdown.parse(source);
  const first = markdown.parse(parts.shift());
  return (
    first +
    `<details class="visual" open><summary>Screen / visual description</summary>${markdown.parse(parts.join(''))}</details>`
  );
}

function splitSections(source) {
  // Some writers preserve the content hierarchy without the baseline's numeric heading prefixes.
  // Normalize only the display parser; downloaded Markdown remains the writer's original text.
  if (/^## Navigation$/m.test(source)) {
    const labels = [
      'Navigation',
      'Hero',
      null,
      'Closing',
      'Testimonials',
      'Footer',
      'Shared example-app facts',
      'Layout notes'
    ];
    for (const [index, label] of labels.entries()) {
      if (label) source = source.replace(`## ${label}\n`, `## ${index + 1}. ${label}\n`);
    }
    source = source.replace(/^## (0[1-7] ·)/gm, '### $1');
    source = source.replace(/^### 01 ·/m, '## 3. What Stacktape does\n\n### 01 ·');
  }
  // The revised page starts directly with section 01. Insert a parsing boundary without displaying an introduction.
  const hasFeatureIntroduction = /^##\s+3[.)]\s/m.test(source);
  if (!hasFeatureIntroduction) source = source.replace(/^###\s+01\s+·/m, '## 3. Product sections\n\n$&');
  const sections = {};
  const top = source.split(/(?=^##\s+\d+[.)]\s)/m).filter((part) => /^##\s+\d+[.)]\s/.test(part));
  const topKeys = {
    1: 'navigation',
    2: 'hero',
    3: 'features',
    4: 'closing',
    5: 'testimonials',
    6: 'footer',
    7: 'facts',
    8: 'layouts'
  };
  for (const part of top) {
    const number = Number(part.match(/^##\s+(\d+)/)?.[1]);
    if (number !== 3) {
      if (topKeys[number]) sections[topKeys[number]] = render(part);
      continue;
    }
    const features = part.split(/(?=^###\s+0?[1-7](?:\s|[.)·]))/m);
    const introduction = features.shift();
    sections.intro = hasFeatureIntroduction ? render(introduction) : '';
    const keys = ['design', 'package', 'deploy', 'monitor', 'security', 'incidents', 'costs'];
    for (const feature of features) {
      const index = Number(feature.match(/^###\s+0?([1-7])/)?.[1]) - 1;
      if (keys[index]) sections[keys[index]] = render(feature);
    }
  }
  return sections;
}

const manifest = JSON.parse(await readFile(new URL('versions.json', directory), 'utf8'));
const versions = await Promise.all(
  manifest.map(async (version) => {
    const [source, notes, checks, verification] = await Promise.all(
      [version.file, version.notes, version.checks, version.verification].map((file) =>
        file ? readFile(new URL(file, directory), 'utf8') : ''
      )
    );
    const sections = splitSections(source);
    if (version.state === 'complete') {
      const required = [
        'navigation',
        'hero',
        'design',
        'package',
        'deploy',
        'monitor',
        'security',
        'incidents',
        'costs',
        'closing',
        'testimonials',
        'footer',
        'facts',
        'layouts'
      ];
      const missing = required.filter((key) => !sections[key]);
      if (missing.length) throw new Error(`${version.id}: missing sections ${missing.join(', ')}`);
    }
    return Object.assign({}, version, {
      source,
      sections,
      notes: markdown.parse(notes),
      checks: markdown.parse(checks),
      verification: markdown.parse(verification)
    });
  })
);
const researchSources = await Promise.all(
  ['research.md', 'runs.md'].map((file) => readFile(new URL(file, directory), 'utf8'))
);
const research = researchSources.map((source) => markdown.parse(source)).join('\n');
const payload = JSON.stringify({ versions, research }).replaceAll('<', '\\u003c');

const output = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Stacktape — homepage copy review</title>
<style>
:root{color-scheme:light;font:16px/1.6 system-ui,sans-serif;color:#242424;background:#fff}
*{box-sizing:border-box}body{margin:0}a{color:#245a8b;text-underline-offset:3px}
.masthead{max-width:1440px;margin:auto;padding:28px 32px 18px}.masthead h1{font-size:26px;line-height:1.2;margin:0 0 10px}
.masthead p{max-width:960px;margin:6px 0;color:#555}.notice{font-size:14px}
.toolbar{position:sticky;top:0;z-index:2;background:#f7f7f5;border-block:1px solid #ddd;padding:14px 32px}
.controls{max-width:1376px;margin:auto;display:flex;gap:14px;align-items:end;flex-wrap:wrap}
label{display:flex;gap:5px;flex-direction:column;font-size:12px;font-weight:600}select,button{font:inherit;color:inherit;background:#fff;border:1px solid #aaa;border-radius:3px;min-height:40px;padding:7px 10px;max-width:100%}
select{font-size:14px;min-width:180px}button{cursor:pointer;font-size:14px}button:hover{background:#eee}
button[aria-pressed="true"]{background:#292929;color:#fff;border-color:#292929}button:focus-visible,select:focus-visible,a:focus-visible,summary:focus-visible{outline:3px solid #5187bd;outline-offset:3px}
.toggle{flex-direction:row;align-items:center;min-height:40px;font-size:14px;font-weight:400}.toggle input{width:17px;height:17px}
.hidden,[hidden]{display:none!important}.columns{display:grid;grid-template-columns:minmax(0,1fr);max-width:920px;margin:0 auto;padding:28px 32px 64px;gap:40px}
.columns.compare{max-width:1500px;grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.column{min-width:0}
.version-heading{border-bottom:1px solid #ccc;padding-bottom:14px;margin-bottom:24px}.version-heading h2{font-size:21px;margin:0 0 4px}.version-heading p{font-size:13px;color:#666;margin:3px 0}.version-heading button{margin:8px 8px 0 0}
.page-content h2{font-size:22px;margin:36px 0 16px;line-height:1.3}.page-content h3{font-size:25px;line-height:1.3;margin:40px 0 16px}.page-content h4{font-size:18px}
.page-content p{margin:14px 0}.page-content blockquote{margin:16px 0;border:0;padding:0;font-size:18px;line-height:1.65}.page-content blockquote p{margin:0 0 8px}
.page-content li{margin:7px 0}.page-content li blockquote{font-size:16px;margin:0}.page-content ul,.page-content ol{padding-left:25px}
.page-content table{width:100%;border-collapse:collapse;font-size:13px;display:block;overflow-x:auto}.page-content td,.page-content th{border:1px solid #ddd;padding:8px;text-align:left;vertical-align:top;min-width:100px}
.page-content code{font:0.9em ui-monospace,monospace;background:#f2f2f0;padding:2px 4px;border-radius:2px;overflow-wrap:anywhere}.page-content pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f5f5f3;padding:14px}
.page-content a{overflow-wrap:anywhere}.page-content hr{border:0;border-top:1px solid #ddd;margin:32px 0}
.visual{margin:22px 0;padding:12px 16px;border:1px dashed #aaa;background:#fafaf8;font-size:14px;color:#555}.visual summary{cursor:pointer;font-weight:600;color:#444}.visual p{margin:12px 0}
.no-visuals .visual{display:none}.editorial{background:#f9f6ed;border-left:3px solid #b7a775;padding:12px 16px;font-size:14px;margin-bottom:20px}.editorial p{margin:0}
.research{max-width:1000px;margin:0 auto;padding:24px 32px 70px}.status-table{max-width:1376px;margin:20px auto 0;font-size:14px}.status-table li{margin-bottom:5px}
.footer{border-top:1px solid #ddd;padding:18px 32px;font-size:12px;color:#666}#announcement{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
@media(max-width:800px){.masthead,.toolbar{padding-inline:18px}.controls{gap:10px}label{flex:1;min-width:140px}select{min-width:0;width:100%}.toggle{flex:1 0 100%}.columns,.columns.compare{display:block;padding:20px 18px 40px}.column+.column{border-top:3px solid #aaa;margin-top:45px;padding-top:24px}.research{padding:20px 18px}.page-content h3{font-size:23px}.masthead h1{font-size:24px}.toolbar{position:static}.footer{padding-inline:18px}}
@media print{.toolbar,.version-heading button,.masthead .notice{display:none}.columns,.columns.compare{display:block;max-width:none;padding:0}.column{break-after:page}.masthead,.research{padding:0}.visual{break-inside:avoid}a{color:inherit}}
</style>
</head>
<body>
<header class="masthead"><h1>Stacktape homepage — copy review</h1>
<p>Read a version, or compare the same section from two writers. Every visual remains a text description.</p>
<p class="notice"><strong>Future-launch drafts.</strong> Planned features are flagged in the review notes. The original is preserved unchanged.</p></header>
<nav class="toolbar" aria-label="Review controls"><div class="controls">
<label>Version<select id="leftVersion"></select></label>
<button id="compare" type="button" aria-pressed="false">Compare two versions</button>
<label id="rightLabel" hidden>Compare with<select id="rightVersion"></select></label>
<label>Section<select id="section">
<option value="page">Whole page</option><option value="hero">Hero</option><option value="design">01 · Design</option><option value="package">02 · Package</option><option value="deploy">03 · Deploy</option><option value="monitor">04 · Monitor</option><option value="security">05 · Security</option><option value="incidents">06 · Incidents</option><option value="costs">07 · Costs</option><option value="closing">Closing</option><option value="testimonials">Testimonials</option><option value="navigation">Navigation</option><option value="footer">Footer</option><option value="facts">Example app</option><option value="layouts">Layout notes</option><option value="notes">Writer &amp; verification notes</option>
</select></label>
<label class="toggle"><input id="visuals" type="checkbox" checked> Show visual descriptions</label>
<button id="researchButton" type="button" aria-pressed="false">Research &amp; run status</button>
</div></nav>
<p id="announcement" aria-live="polite"></p>
<main id="columns" class="columns"><article class="column" id="left"></article><article class="column" id="right" hidden></article></main>
<section id="research" class="research page-content" hidden aria-label="Research and model run status"></section>
<footer class="footer">Review artifact only · No images, remote fonts, analytics or external scripts · Markdown downloads include the complete version.</footer>
<script id="review-data" type="application/json">${payload}</script>
<script>
const data=JSON.parse(document.getElementById('review-data').textContent);
const $=id=>document.getElementById(id);
const pageOrder=['hero','intro','design','package','deploy','monitor','security','incidents','costs','closing','testimonials'];
let comparison=false,researchOpen=false;
const escapeText=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
for(const v of data.versions){for(const id of ['leftVersion','rightVersion']){const option=document.createElement('option');option.value=v.id;option.textContent=v.name+(v.state==='complete'?'':' — '+v.state);$(id).append(option)}}
$('leftVersion').value='recommended-v2';$('rightVersion').value='recommended';
function current(id){return data.versions.find(v=>v.id===$(id).value)}
function drawColumn(target,v){
 const section=$('section').value;
 const title='<div class="version-heading"><h2>'+escapeText(v.name)+'</h2><p>'+escapeText(v.model)+'</p>'+(v.source?'<button type="button" data-download="'+escapeText(v.id)+'">Download Markdown</button><button type="button" data-notes>Review notes</button>':'')+'</div>';
 if(v.state!=='complete'){$(target).innerHTML=title+'<div class="editorial">'+escapeText(v.detail||'This provider has not returned a complete version.')+'</div>';return}
 const body=section==='page'?'<details><summary>Navigation and links</summary>'+v.sections.navigation+'</details>'+pageOrder.map(key=>v.sections[key]||'').join('')+'<details><summary>Footer and links</summary>'+v.sections.footer+'</details>':section==='notes'?(v.summary?'<p>'+escapeText(v.summary)+'</p>':'')+(v.checks||'')+(v.verification?'<details><summary>Separate model verification pass (unfiltered; local findings take precedence)</summary>'+v.verification+'</details>':'')+'<h2>Writer notes</h2>'+(v.notes||'<p>No additional writer notes.</p>'):(v.sections[section]||'<p>This section is not present.</p>');
 $(target).innerHTML=title+'<div class="page-content">'+body+'</div>';
}
function draw(){
 $('columns').classList.toggle('compare',comparison);$('columns').classList.toggle('no-visuals',!$('visuals').checked);
 $('rightLabel').hidden=!comparison;$('right').hidden=!comparison;$('compare').setAttribute('aria-pressed',comparison);
 $('columns').hidden=researchOpen;$('research').hidden=!researchOpen;$('researchButton').setAttribute('aria-pressed',researchOpen);
 drawColumn('left',current('leftVersion'));if(comparison)drawColumn('right',current('rightVersion'));
 $('announcement').textContent=researchOpen?'Research and provider status':current('leftVersion').name+', '+$('section').selectedOptions[0].textContent+(comparison?', compared with '+current('rightVersion').name:'');
 const state=new URLSearchParams({version:$('leftVersion').value,section:$('section').value});if(comparison)state.set('compare',$('rightVersion').value);if(researchOpen)state.set('research','1');
 history.replaceState(null,'','#'+state.toString());
}
$('research').innerHTML='<h2>Provider run status</h2><ul class="status-table">'+data.versions.map(v=>'<li><strong>'+escapeText(v.name)+'</strong> — '+escapeText(v.model)+' — '+escapeText(v.state)+(v.detail?': '+escapeText(v.detail):'')+'</li>').join('')+'</ul>'+data.research;
$('compare').addEventListener('click',()=>{comparison=!comparison;researchOpen=false;draw()});
$('researchButton').addEventListener('click',()=>{researchOpen=!researchOpen;draw()});
for(const id of ['leftVersion','rightVersion','section'])$(id).addEventListener('change',()=>{researchOpen=false;draw()});
$('visuals').addEventListener('change',draw);
document.addEventListener('click',event=>{if(event.target.closest('[data-notes]')){$('section').value='notes';draw();return}const button=event.target.closest('[data-download]');if(!button)return;const v=data.versions.find(item=>item.id===button.dataset.download);const url=URL.createObjectURL(new Blob([v.source],{type:'text/markdown;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='stacktape-homepage-'+v.id+'.md';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
function readLocation(){const initial=new URLSearchParams(location.hash.slice(1));for(const [param,id] of [['version','leftVersion'],['section','section'],['compare','rightVersion']]){const value=initial.get(param);if(value&&Array.from($(id).options).some(option=>option.value===value))$(id).value=value}comparison=initial.has('compare');researchOpen=initial.has('research');draw()}
window.addEventListener('hashchange',readLocation);readLocation();
</script></body></html>
`;
const outputUrl = new URL('index.html', directory);
if (process.argv.includes('--check')) {
  const current = await readFile(outputUrl, 'utf8');
  if (current !== output) throw new Error('Review HTML is stale. Run node apps/website/homepage-review/render.mjs');
  console.log(`Review HTML is current: ${versions.filter((v) => v.state === 'complete').length} complete versions.`);
} else {
  await writeFile(outputUrl, output);
  console.log(`Created ${fileURLToPath(outputUrl)} (${output.length} characters).`);
}
