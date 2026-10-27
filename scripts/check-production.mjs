import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const c = JSON.parse(await readFile(path.join(root, 'src/content.json'), 'utf8'));
const production = await readFile(path.join(root, 'build/index.html'), 'utf8');
const preview = await readFile(path.join(root, 'dist/index.html'), 'utf8');
const origin = new URL(c.domain).origin;
assert.equal(origin, 'https://andaimesfranzoi.com');
assert(production.includes(`<link rel="canonical" href="${origin}/">`));
assert(production.includes(`<meta property="og:url" content="${origin}/">`));
assert(production.includes(`<meta property="og:image" content="${origin}/${c.images.social}">`));
assert(production.includes(`<meta name="twitter:image" content="${origin}/${c.images.social}">`));
assert(production.includes('<meta name="robots" content="index, follow">'));
assert(!production.includes('noindex'));
assert(preview.includes('<meta name="robots" content="noindex, nofollow, noarchive">'));
assert.equal(production.slice(production.indexOf('<body')), preview.slice(preview.indexOf('<body')), 'O conteúdo visível foi alterado');
const robots = await readFile(path.join(root, 'build/robots.txt'), 'utf8');
assert(robots.includes('Allow: /'));
assert(robots.includes(`Sitemap: ${origin}/sitemap.xml`));
assert(!robots.includes('Disallow: /'));
assert((await readFile(path.join(root,'build/sitemap.xml'),'utf8')).includes(`<loc>${origin}/</loc>`));
assert((await readFile(path.join(root,'dist/robots.txt'),'utf8')).includes('Disallow: /'));
const target = JSON.parse(await readFile(path.join(root,'deployment/target.json'),'utf8'));
assert.equal(target.provider, 'netlify');
const allowed = new Set(['.html','.htm','.css','.js','.mjs','.cjs','.jsx','.map','.png','.jpg','.jpeg','.gif','.svg','.webp','.ico','.avif','.bmp','.woff','.woff2','.ttf','.otf','.eot','.json','.xml','.txt','.md']);
if(target.provider === 'netlify') {
 // A autenticação e o vínculo local do CLI não são necessários no build por Git.
 const linked = await readFile(path.join(root,'.netlify/state.json'),'utf8').then(JSON.parse).catch(error => {
  if (error.code === 'ENOENT') return null;
  throw error;
 });
 if (linked) assert.equal(linked.siteId,target.siteId,'Publicação aponta para outro projeto Netlify');
 assert.equal(target.siteId,'13d6e75c-2e94-48de-9591-6468e85249ff');
 assert.equal(target.plan,'Free');
 assert.equal(await readFile(path.join(root,'netlify-dist/index.html'),'utf8'),production);
 assert.equal(await readFile(path.join(root,'netlify-preview/index.html'),'utf8'),preview);
 assert(!(await readFile(path.join(root,'netlify-dist/_headers'),'utf8')).includes('noindex'));
 assert((await readFile(path.join(root,'netlify-preview/_headers'),'utf8')).includes('noindex'));
 const redirects = await readFile(path.join(root,'netlify-dist/_redirects'),'utf8');
 assert(redirects.includes('https://www.andaimesfranzoi.com/* https://andaimesfranzoi.com/:splat 301!'));
}
let total = 0; let files = 0;
async function inspect(relative = '') {
 for (const item of await readdir(path.join(root, 'build', relative), { withFileTypes: true })) {
  const name = path.join(relative, item.name);
  if (item.isDirectory()) { await inspect(name); continue; }
  const file = path.join(root, 'build', name);
  const size = (await stat(file)).size;
  assert(allowed.has(path.extname(name).toLowerCase()), `Extensão não aceita na publicação: ${name}`);
  assert(size <= 3000000, `Arquivo maior que 3 MB: ${name}`);
  total += size; files++;
  if (name.startsWith('assets') || ['styles.css','app.js'].includes(name)) {
   assert.deepEqual(await readFile(file), await readFile(path.join(root,'dist',name)), `Arquivo visual alterado: ${name}`);
  }
 }
}
await inspect();
assert(total <= 20000000, 'Pacote maior que 20 MB');
console.log(`OK: domínio oficial, canonical, Open Graph/X, sitemap, robots, prévia noindex, identidade do projeto e arquivos visuais preservados. ${files} arquivos / ${total} bytes. Validação remota registrada separadamente em deployment/.`);

// A rota adicional deve existir em todos os pacotes, com SEO próprio.
for(const [directory, isPreview] of [['dist',true],['build',false],['netlify-preview',true],['netlify-dist',false]]) {
 const markup = await readFile(path.join(root,directory,'equipamentos/index.html'),'utf8');
 assert(markup.includes('<link rel="canonical" href="' + origin + '/equipamentos/">'));
 assert(markup.includes('<meta property="og:url" content="' + origin + '/equipamentos/">'));
 assert.equal(markup.includes('noindex, nofollow, noarchive'),isPreview);
 assert.equal((markup.match(/class="equipment-row"/g)||[]).length,5);
 const sitemap = await readFile(path.join(root,directory,'sitemap.xml'),'utf8');
 assert(sitemap.includes('<loc>' + origin + '/equipamentos/</loc>'));
}
assert.equal(await readFile(path.join(root,'build/equipamentos/index.html'),'utf8'),await readFile(path.join(root,'netlify-dist/equipamentos/index.html'),'utf8'));
assert.equal(await readFile(path.join(root,'dist/equipamentos/index.html'),'utf8'),await readFile(path.join(root,'netlify-preview/equipamentos/index.html'),'utf8'));
for (const directory of ['dist','build','netlify-preview','netlify-dist']) {
 for (const [category,count] of [['escoramento',2],['maquinas-equipamentos',4],['seguranca-altura',1],['todos',12]]) {
  const route = '/equipamentos/' + category + '/';
  const markup = await readFile(path.join(root,directory,route,'index.html'),'utf8');
  assert.equal((markup.match(/class="equipment-row"/g)||[]).length,count);
  assert(markup.includes('<link rel="canonical" href="' + origin + route + '">'));
  assert((await readFile(path.join(root,directory,'sitemap.xml'),'utf8')).includes('<loc>' + origin + route + '</loc>'));
 }
}
console.log('OK: quatro categorias, página de todos os 12 produtos, canonical e sitemap nos quatro pacotes.');
