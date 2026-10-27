import {execFileSync} from 'node:child_process';
import {cp, mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const preview = process.argv.includes('--preview');
const source = path.join(root, preview ? 'dist' : 'build');
const output = path.join(root, preview ? 'netlify-preview' : 'netlify-dist');
execFileSync(process.execPath, [path.join(root,'scripts/build.mjs'), ...(preview ? [] : ['--production'])], {stdio:'inherit'});
await mkdir(output,{recursive:true});
for (const name of ['assets','equipamentos','index.html','styles.css','app.js','favicon.ico','robots.txt','sitemap.xml']) {
  await cp(path.join(source,name), path.join(output,name),{recursive:true});
}
await cp(path.join(root,'deployment/netlify/_redirects'),path.join(output,'_redirects'));
await writeFile(path.join(output,'_headers'), `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n${preview ? '  X-Robots-Tag: noindex, nofollow, noarchive\n' : ''}`);
const html = await readFile(path.join(output,'index.html'),'utf8');
if (preview !== html.includes('noindex, nofollow, noarchive')) throw new Error('Modo de indexação inconsistente.');
console.log(`Pacote Netlify pronto em ${path.basename(output)}/ (${preview ? 'prévia sem indexação' : 'produção'}).`);
