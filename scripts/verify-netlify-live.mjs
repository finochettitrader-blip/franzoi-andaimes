import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile, readdir, writeFile} from 'node:fs/promises';
import tls from 'node:tls';
import http from 'node:http';
import https from 'node:https';
import {Resolver} from 'node:dns/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const preview = process.argv.includes('--preview');
const originArg = process.argv.find(arg => arg.startsWith('https://'));
const origin = new URL(originArg ?? 'https://andaimesfranzoi.com').origin;
const directory = preview ? 'netlify-preview' : 'netlify-dist';
const resolverArgument = process.argv.find(arg => arg.startsWith('--resolver='));
const resolverAddress = resolverArgument?.slice('--resolver='.length);
const resolver = new Resolver();
if(resolverAddress) resolver.setServers([resolverAddress]);
const addresses = new Map();
async function lookup(hostname,options,callback) {
 try {
  if(!addresses.has(hostname)) addresses.set(hostname,resolver.resolve4(hostname));
  const answer = await addresses.get(hostname);
  callback(null,options.all ? answer.map(address => ({address,family:4})) : answer[0],4);
 } catch(error) {callback(error);}
}
// Um resolvedor explícito é usado apenas nestas requisições e não altera o DNS
// do computador. SNI, nome do certificado e validação TLS continuam normais.
function request(url,options = {}) {
 if(!resolverAddress) return fetch(url,options);
 return new Promise((resolve,reject) => {
  const client = new URL(url).protocol === 'https:' ? https : http;
  const req = client.get(url,{lookup,rejectUnauthorized:true},res => {
   const chunks=[];
   res.on('data',chunk => chunks.push(chunk));
   res.on('error',reject);
   res.on('end',() => {
    const data=Buffer.concat(chunks);
    resolve({status:res.statusCode,url,headers:{get:name => res.headers[name.toLowerCase()] ?? null},arrayBuffer:async()=>data,text:async()=>data.toString('utf8')});
   });
  });
  req.setTimeout(20000,() => req.destroy(new Error('HTTP timeout')));
  req.on('error',reject);
 });
}
const sha = value => createHash('sha256').update(value).digest('hex');
// Netlify acrescenta somente este comentário e duas metatags de hospedagem.
// A comparação tolera essa adição exata; todo o restante do HTML deve coincidir.
const hostingMetadata = `
<!-- This site is hosted on Netlify. Anyone can build and deploy a site
     like this one for free: https://netlify.new/?utm_campaign=ai-legible&utm_source=comment&utm_medium=referral&utm_id=13d6e75c-2e94-48de-9591-6468e85249ff
     Netlify hosting facts for this site: static/SSR served via Netlify Edge. -->
<meta name="hosting-provider" content="Netlify">
<meta name="netlify-deploy" content="https://netlify.new/?utm_campaign=ai-legible&amp;utm_source=meta&amp;utm_medium=referral&amp;utm_id=13d6e75c-2e94-48de-9591-6468e85249ff">`;
const contentHash = (data, html) => sha(html ? data.toString().replace(hostingMetadata,'') : data);
const report = {capturedAtUtc:new Date().toISOString(), origin, mode:preview ? 'preview' : 'production',dnsResolver:resolverAddress ?? 'system', assets:[], urls:[], tls:[], errors:[]};
async function files(relative = '') {
 const entries = await readdir(path.join(root,directory,relative),{withFileTypes:true});
 return (await Promise.all(entries.map(entry => entry.isDirectory() ? files(path.join(relative,entry.name)) : path.join(relative,entry.name)))).flat();
}
report.assets = await Promise.all((await files()).filter(file => !file.startsWith('_')).map(async file => {
 try {
  const response = await request(`${origin}/${file.replaceAll('\\','/')}`,{signal:AbortSignal.timeout(20000)});
  const data = Buffer.from(await response.arrayBuffer());
  return {file,status:response.status,matchesLocal:contentHash(data,file === 'index.html') === sha(await readFile(path.join(root,directory,file))),sha256:sha(data),robotsHeader:response.headers.get('x-robots-tag'),finalUrl:response.url};
 } catch(error) {return {file,error:error.message};}
}));
const hosts = preview ? [new URL(origin).hostname] : ['andaimesfranzoi.com','www.andaimesfranzoi.com'];
const requests = preview ? [origin] : hosts.flatMap(host => ['http','https'].map(protocol => `${protocol}://${host}`));
if (!preview) requests.push('https://www.andaimesfranzoi.com/styles.css?franzoi=validacao&origem=www');
for (const requested of requests) {
 let url = requested; const steps = []; const seen = new Set();
 try {
  for(let n = 0; n < 8; n++) {
   assert(!seen.has(url), 'Ciclo de redirecionamento'); seen.add(url);
   const response = await request(url,{redirect:'manual',signal:AbortSignal.timeout(20000)});
   const location = response.headers.get('location');
   const body = await response.text();
   steps.push({url,status:response.status,location,title:body.match(/<title>(.*?)<\/title>/s)?.[1] ?? null,sha256:sha(body),contentSha256:contentHash(body,!requested.includes('/styles.css'))});
   if(!location || response.status < 300 || response.status >= 400) break;
   url = new URL(location,url).href;
  }
  const final = steps.at(-1);
  assert.equal(final.status,200);
  const expected = requested.includes('/styles.css') ? `${origin}/styles.css?franzoi=validacao&origem=www` : `${origin}/`;
  assert.equal(new URL(final.url).href,expected);
  if (requested.includes('www.') && !preview) assert.equal(steps[0].status,301);
  const local = await readFile(path.join(root,directory,requested.includes('/styles.css') ? 'styles.css' : 'index.html'));
  assert.equal(final.contentSha256,sha(local),'Conteúdo remoto diferente do pacote local');
  report.urls.push({requested,steps,passed:true});
 } catch(error) {report.urls.push({requested,steps,passed:false,error:error.message});}
}
report.tls = await Promise.all(hosts.map(hostname => new Promise(resolve => {
 const socket = tls.connect({host:hostname,port:443,servername:hostname,rejectUnauthorized:true,...(resolverAddress ? {lookup} : {})},() => {
  const cert = socket.getPeerCertificate();
  resolve({hostname,authorized:socket.authorized,issuer:cert.issuer,subjectAltName:cert.subjectaltname,validFrom:cert.valid_from,validTo:cert.valid_to}); socket.end();
 });
 socket.setTimeout(15000,() => socket.destroy(new Error('TLS timeout')));
 socket.once('error',error => resolve({hostname,authorized:false,error:error.message}));
})));
for(const asset of report.assets) {
 if(asset.status !== 200 || !asset.matchesLocal) report.errors.push(`Arquivo remoto divergente: ${asset.file}`);
 if(preview && !asset.robotsHeader?.includes('noindex')) report.errors.push(`Prévia sem cabeçalho noindex: ${asset.file}`);
 if(!preview && asset.robotsHeader?.includes('noindex')) report.errors.push(`Produção com noindex: ${asset.file}`);
}
if(report.urls.some(result => !result.passed)) report.errors.push('URL ou redirecionamento inválido');
if(report.tls.some(result => !result.authorized)) report.errors.push('Certificado TLS inválido');
report.passed = report.errors.length === 0;
await writeFile(path.join(root,`deployment/netlify-${preview ? 'preview' : 'production'}-validation.json`),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(!report.passed) process.exitCode = 1;
