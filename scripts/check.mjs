import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { render, contactUrl, validPhone } from './build.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const c = JSON.parse(await readFile(path.join(root, 'src/content.json'), 'utf8'));
const html = await readFile(path.join(root, 'dist/index.html'), 'utf8');
const equipmentHtml = await readFile(path.join(root, 'dist/equipamentos/todos/index.html'), 'utf8');
const pages = new Map([['/', html], ['/equipamentos/todos/', equipmentHtml]]);
for (const group of c.equipmentGroups) {
 const route = group.id === 'andaimes-acessorios' ? '/equipamentos/' : '/equipamentos/' + group.id + '/';
 const markup = await readFile(path.join(root, 'dist', route, 'index.html'), 'utf8');
 pages.set(route, markup);
 const expected = c.equipment.filter(item => item.enabled && item.category === group.id);
 assert.equal((markup.match(/class="equipment-row"/g) || []).length, expected.length);
 for (const item of c.equipment.filter(item => item.enabled)) assert.equal(markup.includes('id="' + item.id + '"'), item.category === group.id);
 assert(markup.includes('href="' + route + '" aria-current="page"'));
}

for (const [route, markup] of pages) {
 const ids = [...markup.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
 assert.equal(new Set(ids).size, ids.length, 'IDs duplicados: ' + route);
 assert(markup.includes('<html lang="pt-BR">'));
 assert.equal((markup.match(/<h1>/g) || []).length, 1);
 assert(!/undefined|\[PREENCHER\]|Franzou/.test(markup));
 if (c.preview) assert(markup.includes('noindex, nofollow, noarchive'));
 for (const match of markup.matchAll(/(?:src|srcset|href)="([^" ]+)"/g)) {
  const target = new URL(match[1].replaceAll('&amp;', '&'), 'https://local.test' + route);
  if(target.origin !== 'https://local.test') continue;
  const targetPage = pages.get(target.pathname);
  if(target.hash && targetPage) assert(targetPage.includes('id="' + target.hash.slice(1) + '"'), 'Âncora inexistente: ' + target.href);
  await access(path.join(root, 'dist', target.pathname, target.pathname.endsWith('/') ? 'index.html' : ''));
 }
}
assert(!html.includes('class="equipment-row"'), 'A inicial deve permanecer compacta');
assert(html.includes('Ver todos os equipamentos'));
assert(html.includes('href="/equipamentos/"'));
assert(equipmentHtml.includes('href="/"'));
assert.equal((equipmentHtml.match(/class="equipment-row"/g) || []).length, 12);
assert.equal((equipmentHtml.match(/class="equipment-category-anchor"/g) || []).length, 4);
for(const group of c.equipmentGroups) assert(equipmentHtml.includes('id="' + group.id + '"'));
for(const item of c.equipment.filter(e => e.enabled)) {
 assert(c.equipmentGroups.some(group => group.id === item.category));
 assert.equal(equipmentHtml.split('id="' + item.id + '"').length - 1, 1);
}
assert(!equipmentHtml.includes('Roll linha de vida'));
assert(!html.includes('id="galeria"') === (c.gallery.length === 0));
assert.equal(equipmentHtml.includes('id="venda-de-andaimes"'), c.equipment.some(e => e.id === 'venda-de-andaimes' && e.enabled));
if (!c.domain) {
 assert(!html.includes('rel="canonical"'));
 assert(!html.includes('property="og:image"'));
 assert.equal(await access(path.join(root,'dist/sitemap.xml')).then(()=>true).catch(()=>false), false);
}
if (validPhone(c.whatsapp)) {
 const link = new URL(contactUrl(c));
 assert.equal(link.hostname, 'wa.me');
 assert.equal(link.pathname, '/' + c.whatsapp);
 assert.equal(link.searchParams.get('text'), c.messages.general);
 for (const item of c.equipment.filter(e => e.enabled)) {
  const message = item.message || c.messages.equipment.replace('{equipment}', item.name);
  assert.equal(new URL(contactUrl(c,message)).searchParams.get('text'), message);

 }
}
const noPhone = structuredClone(c);
noPhone.whatsapp = '';
noPhone.address = ''; noPhone.email = ''; noPhone.hours = ''; noPhone.region = '';
const fallback = render(noPhone);
assert(!fallback.includes('wa.me/'));
assert(!fallback.includes('class="floating-contact"'));
assert(!fallback.includes('<dt>WhatsApp</dt>'));
assert(!fallback.includes('<dt>Endereço</dt>'));
assert(!fallback.includes(' em .'));
assert(fallback.includes('Falar pelo Instagram'));
assert.equal(contactUrl(noPhone), c.instagram);
const invalid = structuredClone(c); invalid.whatsapp = 'telefone-inválido';
assert.throws(() => render(invalid), /WhatsApp/);
const notReviewed = structuredClone(c); notReviewed.preview = false;
assert.throws(() => render(notReviewed), /Publicação bloqueada/);
if (!process.argv.includes('--skip-syntax')) for (const file of ['dist/app.js','scripts/build.mjs','scripts/build-netlify.mjs','scripts/serve.mjs','scripts/check.mjs','scripts/check-production.mjs']) execFileSync(process.execPath, ['--check', path.join(root, file)]);
console.log('OK: HTML semântico, âncoras, arquivos locais, mensagens WhatsApp, dados ausentes, alternativa Instagram, categorias ocultas, bloqueio de publicação e páginas do portfólio. Sintaxe pode ser executada separadamente com --skip-syntax.');

for (const [route,markup] of pages) {
 if (!route.startsWith('/equipamentos/')) continue;
 assert.equal((markup.match(/class="catalog-contact-bar"/g)||[]).length,1);
 assert(!markup.includes('class="text-link equipment-link"'));
 const href=markup.match(/class="catalog-contact-bar"><a href="([^"]+)"/)[1].replaceAll('&amp;','&');
 const target=new URL(href);
 if(validPhone(c.whatsapp)) {assert.equal(target.hostname,'wa.me');assert.equal(target.pathname,'/'+c.whatsapp);assert(target.searchParams.get('text').includes('disponibilidade'));}
 const group=c.equipmentGroups.find(group=>route===(group.id==='andaimes-acessorios'?'/equipamentos/':'/equipamentos/'+group.id+'/'));
 if(group&&validPhone(c.whatsapp)) assert(target.searchParams.get('text').includes(group.name));
}
console.log('OK: uma barra de consulta por página, sem botões individuais, WhatsApp por categoria.');
