/* Pre-render the publication list into index.html.
 *
 * Why: the visible bibliography was injected at runtime by js/main.js, so any
 * crawler that does not execute JavaScript (ClaudeBot, GPTBot, PerplexityBot,
 * CCBot, Bing's non-render path) saw a page that *mentions* 24 publications
 * without listing any — roughly 3,000 words of the most specific text on the
 * site, invisible.
 *
 * This emits byte-identical markup to what render() produced, so the existing
 * CSS, filter chips and search keep working untouched. main.js now skips
 * rendering when the list is already populated.
 *
 * Run after editing js/publications.js:
 *     node tools/prerender-publications.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const INDEX = path.join(ROOT, 'index.html');
const PUBS = path.join(ROOT, 'js', 'publications.js');

// publications.js assigns to window.PUBLICATIONS
global.window = {};
require(PUBS);
const data = global.window.PUBLICATIONS;

if (!Array.isArray(data) || !data.length) {
  console.error('No publications found in js/publications.js');
  process.exit(1);
}

const escapeHTML = (s) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );

const highlightAuthor = (authors) =>
  escapeHTML(authors).replace(/Maggu G/g, '<b>Maggu G</b>');

function renderItem(p, i) {
  let badges = (p.badges || [])
    .map((b) => '<span class="badge">' + escapeHTML(b) + '</span>')
    .join('');

  if (p.pmid) {
    badges =
      '<a class="badge badge--pubmed" href="https://pubmed.ncbi.nlm.nih.gov/' +
      escapeHTML(p.pmid) +
      '/" target="_blank" rel="noopener noreferrer">PMID ' +
      escapeHTML(p.pmid) +
      '</a>' +
      badges;
  }
  if (p.cites) badges = '<span class="badge badge--cite">' + p.cites + ' citations</span>' + badges;
  if (p.award) badges = '<span class="badge badge--award">' + escapeHTML(p.award) + '</span>' + badges;

  const href = p.pmid
    ? 'https://pubmed.ncbi.nlm.nih.gov/' + p.pmid + '/'
    : p.doi
    ? 'https://doi.org/' + p.doi
    : p.url
    ? p.url
    : null;

  const title = href
    ? '<a class="pub__title pub__title--link" href="' +
      escapeHTML(href) +
      '" target="_blank" rel="noopener noreferrer">' +
      escapeHTML(p.title) +
      '<span class="pub__ext" aria-hidden="true">↗</span></a>'
    : '<p class="pub__title">' + escapeHTML(p.title) + '</p>';

  const ids = p.doi
    ? '<p class="pub__ids"><a class="doi" href="https://doi.org/' +
      escapeHTML(p.doi) +
      '" target="_blank" rel="noopener noreferrer">doi:' +
      escapeHTML(p.doi) +
      '</a></p>'
    : p.url
    ? '<p class="pub__ids"><a class="doi" href="' +
      escapeHTML(p.url) +
      '" target="_blank" rel="noopener noreferrer">publisher record ↗</a></p>'
    : '<p class="pub__ids pub__ids--none">No DOI registered by the journal</p>';

  return (
    '<li class="pub" data-tags="' +
    (p.tags || []).join(' ') +
    '" ' +
    'data-text="' +
    escapeHTML((p.title + ' ' + p.authors + ' ' + p.venue + ' ' + (p.detail || '')).toLowerCase()) +
    '">' +
    '<span class="pub__n">' +
    String(i + 1).padStart(2, '0') +
    '</span>' +
    '<div>' +
    title +
    '<p class="pub__authors">' +
    highlightAuthor(p.authors) +
    '</p>' +
    '<p class="pub__venue"><em>' +
    escapeHTML(p.venue) +
    '</em> · ' +
    escapeHTML(p.detail || '') +
    '</p>' +
    ids +
    '</div>' +
    '<div class="pub__side">' +
    badges +
    '</div>' +
    '</li>'
  );
}

const markup = data.map(renderItem).join('\n');

let html = fs.readFileSync(INDEX, 'utf8');

const OPEN = '<ol class="pubs" id="pubList">';
const CLOSE = '</ol>';
const start = html.indexOf(OPEN);
if (start === -1) {
  console.error('Could not find <ol class="pubs" id="pubList"> in index.html');
  process.exit(1);
}
const end = html.indexOf(CLOSE, start);
if (end === -1) {
  console.error('Could not find closing </ol> for the publication list');
  process.exit(1);
}

html = html.slice(0, start + OPEN.length) + '\n' + markup + '\n' + html.slice(end);
fs.writeFileSync(INDEX, html, 'utf8');

console.log('Pre-rendered ' + data.length + ' publications into index.html');
