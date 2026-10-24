import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { render, contactUrl, validPhone } from './build.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const c = JSON.parse(await readFile(path.join(root, 'src/content.json'), 'utf8'));
const html = await readFile(path.join(root, 'dist/index.html'), 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(ids).size, ids.length, 'IDs duplicados');
for (const match of html.matchAll(/href="#([^"]+)"/g)) assert(ids.includes(match[1]), `Âncora inexistente: ${match[1]}`);
for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
 const target = match[1];
 if (!/^(https?:|mailto:|tel:|data:)/.test(target)) await access(path.join(root, 'dist', target));
}
assert(html.includes('<html lang="pt-BR">'));
assert.equal((html.match(/<h1>/g) || []).length, 1);
assert(!/undefined|\[PREENCHER\]|Franzou/.test(html));
assert(!html.includes('id="galeria"') === (c.gallery.length === 0));
assert.equal(html.includes('id="venda-de-andaimes"'), c.equipment.some(e => e.id === 'venda-de-andaimes' && e.enabled));
if (c.preview) assert(html.includes('noindex, nofollow, noarchive'));
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
  assert(html.includes(contactUrl(c,message).replaceAll('&','&amp;')));
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
for (const file of ['dist/app.js','scripts/build.mjs','scripts/serve.mjs','scripts/check.mjs']) execFileSync(process.execPath, ['--check', path.join(root, file)]);
console.log('OK: HTML semântico, âncoras, arquivos locais, mensagens WhatsApp, dados ausentes, alternativa Instagram, categorias ocultas, bloqueio de publicação e sintaxe JavaScript.');
