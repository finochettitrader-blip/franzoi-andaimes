import { readFile, writeFile, mkdir, access, rm, cp } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
export const escape = (value = '') => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
export const validPhone = value => /^[1-9]\d{7,14}$/.test(value || '');
export function contactUrl(content, message) {
  return validPhone(content.whatsapp) ? `https://wa.me/${content.whatsapp}?text=${encodeURIComponent(message || content.messages.general)}` : content.instagram;
}
function url(value) {
  if (!value || !/^https:\/\//.test(value)) throw new Error(`URL HTTPS inválida: ${value}`);
  return escape(new URL(value).href);
}
const icon = (name, className = '') => {
  const paths = {
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    diagonal: '<path d="M6 18 18 6M6 6h12v12"/>',
    down: '<path d="M12 4v16M5 13l7 7 7-7"/>',
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>',
    whatsapp: '<path d="M21 11.5a9 9 0 0 1-13.2 8L3 21l1.5-4.7A9 9 0 1 1 21 11.5Z"/><path d="M8.4 7.5c-.8 0-1.2.8-.9 2.1 1 3.2 3.8 5.9 6.6 6.5 1.1.2 1.9-.5 1.9-1.3l-2.3-1.4-.9.8c-1.4-.6-2.8-2-3.4-3.4l.7-.9Z"/>'
  };
  return `<svg class="icon ${className}" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
};
const lines = text => escape(text).replace(/\n/g, '<br>');
const equipmentSymbol = id => {
  const symbols = {
    'andaimes-tubulares': '<path d="M12 43V5m40 38V5M32 40V8M9 13h46M9 28h46M9 40h46M12 13l20 15 20-15M12 28l20 12 20-12M12 28l20-15 20 15"/><path d="M8 43h8m32 0h8M9 9l42-5m1 9 6-3v25l-6 5"/>',
    'guincho-de-coluna': '<path d="M43 43V5h5v38M36 43h20M12 12h31M19 12 43 5M48 16h5M48 33h5"/><rect x="9" y="12" width="23" height="12" rx="2"/><path d="M15 12v12m11-12v12M32 17h11M18 24v11m0 0v3a4 4 0 0 0 8 0v-2"/><circle cx="10" cy="18" r="3"/>',
    betoneira: '<path d="m19 10 16-4 12 17-13 10-19-10M25 9l14 18M26 32l-7 12m16-13 12 13M15 44h39M42 22l8-3"/><ellipse cx="18" cy="17" rx="6" ry="9" transform="rotate(-23 18 17)"/><circle cx="52" cy="17" r="6"/><path d="M52 11v12m-6-6h12"/><circle cx="47" cy="43" r="4"/>'
  };
  return symbols[id] ? `<svg class="equipment-illustration" width="64" height="48" viewBox="0 0 64 48" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${symbols[id]}</svg>` : '';
};
const responsiveText = (desktop, mobile) => mobile ? `<span class="desktop-copy">${escape(desktop)}</span><span class="mobile-copy">${escape(mobile)}</span>` : escape(desktop);
// A primeira quebra vale em todas as telas; as seguintes só no mobile.
const heroTitle = text => text.split('\n').map((line, index) => `${index === 0 ? '' : index === 1 ? '<br>' : ' <br class="hero-mobile-break">'}<span class="hero-title-line">${escape(line)}</span>`).join('');
const external = 'target="_blank" rel="noopener noreferrer"';
const brand = c => `<span class="brand-window"><span class="brand-name-crop"><img src="${escape(c.images.brand)}" width="500" height="500" alt="${escape(c.name)}"></span></span>`;
const illustration = (c, lazy = false, mobileHero = false) => `<div class="worker-window">${mobileHero ? `<picture><source media="(max-width: 640px)" srcset="${escape(c.images.brand)}" width="500" height="500">` : ''}<img src="${escape(c.images.illustration.src)}" width="${c.images.illustration.width}" height="${c.images.illustration.height}" alt="${escape(mobileHero ? c.images.brandAlt : c.images.illustration.alt)}" ${lazy ? 'loading="lazy" decoding="async"' : 'fetchpriority="high"'}>${mobileHero ? '</picture>' : ''}</div>`;

export function render(c, { socialExists = false, year = new Date().getFullYear(), publicationAuthorized = false } = {}) {
  const hasPhone = validPhone(c.whatsapp);
  if (c.whatsapp && !hasPhone) throw new Error('WhatsApp deve conter de 8 a 15 dígitos em formato internacional, sem sinal de +.');
  if (!c.preview && (!c.domain || (!publicationAuthorized && Object.values(c.confirmed).some(value => value !== true)))) throw new Error('Publicação bloqueada: configure o domínio real e use o build de produção somente com autorização do proprietário.');
  const domain = c.domain ? new URL(c.domain).origin + '/' : '';
  if (domain && !domain.startsWith('https://')) throw new Error('O domínio deve usar https://.');
  const mainContact = url(contactUrl(c));
  const contactLabel = hasPhone ? c.labels.quote : c.labels.instagramContact;
  const phoneDisplay = hasPhone && c.whatsapp.length === 13 && c.whatsapp.startsWith('55') ? `(${c.whatsapp.slice(2,4)}) ${c.whatsapp.slice(4,9)}-${c.whatsapp.slice(9)}` : c.whatsapp;
  const inject = value => escape((c.region ? value : value.replace(', atendendo {region}', '').replace(' em {region}', '')).replaceAll('{region}', c.region));
  const navItems = [...c.navigation];
  if (c.gallery.length) navItems.splice(navItems.length - 1, 0, { label: 'Galeria', target: 'galeria' });
  const nav = navItems.map(item => `<a href="#${escape(item.target)}">${escape(item.label)}</a>`).join('');
  const equipments = c.equipment.filter(item => item.enabled).map((item, i) => `<article class="equipment-row" id="${escape(item.id)}" data-mobile-order="${escape(item.mobileOrder || i + 1)}">
    ${item.image ? `<img class="equipment-photo" src="${escape(item.image.src)}" alt="${escape(item.image.alt)}" width="${item.image.width}" height="${item.image.height}" loading="lazy" decoding="async">` : `<div class="equipment-number" aria-hidden="true">${String(i + 1).padStart(2, '0')}<span></span></div>`}
    ${item.image ? '' : equipmentSymbol(item.id)}
    <div class="equipment-copy"><h3>${responsiveText(item.name, item.mobileName)}</h3><p>${responsiveText(item.description, item.mobileDescription)}</p></div>
    <a class="text-link equipment-link" href="${url(contactUrl(c, item.message || c.messages.equipment.replace('{equipment}', item.name)))}" ${external} aria-label="${escape(hasPhone ? c.labels.availability : c.labels.instagramContact)}: ${escape(item.name)}"><span class="equipment-link-label">${escape(hasPhone ? c.labels.availability : c.labels.instagramContact)}</span>${icon('diagonal')}</a>
  </article>`).join('');
  const photo = c.images.heroPhoto;
  const heroArt = photo ? `<figure class="hero-photo"><img src="${escape(photo.src)}" alt="${escape(photo.alt)}" width="${photo.width}" height="${photo.height}" fetchpriority="high" decoding="async"></figure>` : `<div class="hero-art" aria-label="Ilustração original da marca Franzoi Andaimes">
    <span class="art-kicker">${escape(c.hero.artLabel)}</span>
    <span class="structure-line structure-one" aria-hidden="true"></span><span class="structure-line structure-two" aria-hidden="true"></span>
    ${illustration(c, false, true)}
    <span class="art-caption">${escape(c.hero.artCaption)}<span aria-hidden="true">+</span></span>
  </div>`;
  const gallery = c.gallery.length ? `<section class="gallery section-pad" id="galeria"><div class="container"><h2>${escape(c.galleryTitle)}</h2><div class="gallery-grid">${c.gallery.map(photo => `<figure><img src="${escape(photo.src)}" alt="${escape(photo.alt)}" width="${photo.width}" height="${photo.height}" loading="lazy" decoding="async">${photo.caption ? `<figcaption>${escape(photo.caption)}</figcaption>` : ''}</figure>`).join('')}</div></div></section>` : '';
  const optionalDetails = `${c.email ? `<div><dt>E-mail</dt><dd><a href="mailto:${escape(c.email)}">${escape(c.email)}</a></dd></div>` : ''}${c.address ? `<div><dt>Endereço</dt><dd>${escape(c.address)}${c.directionsUrl ? `<a class="directions" href="${url(c.directionsUrl)}" ${external}>Como chegar ${icon('diagonal')}</a>` : ''}</dd></div>` : ''}${c.hours ? `<div><dt>Horário de atendimento</dt><dd>${escape(c.hours)}</dd></div>` : ''}`;
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escape(c.seo.title)}</title><meta name="description" content="${escape(c.seo.description)}">
  <meta name="robots" content="${c.preview ? 'noindex, nofollow, noarchive' : 'index, follow'}"><meta name="theme-color" content="#F88C41">
  <meta property="og:type" content="website"><meta property="og:locale" content="pt_BR"><meta property="og:site_name" content="${escape(c.name)}">
  <meta property="og:title" content="${escape(c.seo.title)}"><meta property="og:description" content="${escape(c.seo.description)}">
  <meta name="twitter:card" content="summary"><meta name="twitter:title" content="${escape(c.seo.title)}"><meta name="twitter:description" content="${escape(c.seo.description)}">
  ${domain ? `<link rel="canonical" href="${escape(domain)}"><meta property="og:url" content="${escape(domain)}">` : ''}
  ${domain && socialExists ? `<meta property="og:image" content="${escape(new URL(c.images.social, domain).href)}"><meta property="og:image:type" content="image/png"><meta property="og:image:width" content="${escape(c.images.socialWidth)}"><meta property="og:image:height" content="${escape(c.images.socialHeight)}"><meta property="og:image:alt" content="${escape(c.images.socialAlt)}"><meta name="twitter:image" content="${escape(new URL(c.images.social, domain).href)}"><meta name="twitter:image:alt" content="${escape(c.images.socialAlt)}">` : ''}
  <link rel="icon" type="image/x-icon" href="favicon.ico" sizes="16x16 32x32 48x48">
  <link rel="icon" type="image/png" href="assets/favicon-trabalhador-96.png" sizes="96x96">
  <link rel="apple-touch-icon" href="assets/apple-touch-icon-trabalhador.png" sizes="180x180">
  <link rel="preload" href="assets/fonts/barlow-condensed-bold.ttf" as="font" type="font/ttf" crossorigin>
  <link rel="stylesheet" href="styles.css"><script src="app.js" defer></script>
</head>
<body${hasPhone ? ' class="has-whatsapp"' : ''}>
  <a class="skip-link" href="#conteudo">${escape(c.labels.skip)}</a>
  <header class="site-header"><div class="container header-inner">
    <a class="brand" href="#inicio" aria-label="${escape(c.name)} — início">${brand(c)}</a>
    <nav class="main-nav" id="menu-principal" aria-label="Navegação principal">${nav}<a class="mobile-instagram" href="${url(c.instagram)}" ${external}>Instagram ${icon('diagonal')}</a></nav>
    <div class="header-actions"><a class="instagram-icon" href="${url(c.instagram)}" ${external} aria-label="Visitar o Instagram da Franzoi Andaimes">${icon('instagram')}</a><a class="button button-dark header-quote" href="${mainContact}" ${external}>${escape(contactLabel)}${icon('diagonal')}</a></div>
    <button class="menu-toggle" aria-expanded="false" aria-controls="menu-principal" aria-label="${escape(c.labels.menuOpen)}" data-open-label="${escape(c.labels.menuOpen)}" data-close-label="${escape(c.labels.menuClose)}" hidden><span></span><span></span></button>
  </div></header>
  <main id="conteudo">
    <section class="hero" id="inicio"><div class="container">
      <div class="hero-grid"><div class="hero-copy"><p class="eyebrow"><span class="label-line" aria-hidden="true"></span>${escape(c.name)}</p><h1>${heroTitle(c.hero.title)}</h1><p class="hero-description">${inject(c.hero.description)}</p><div class="hero-buttons"><a class="button button-dark" href="${mainContact}" ${external}>${escape(contactLabel)}${icon('diagonal')}</a><a class="text-link" href="#equipamentos">${escape(c.labels.equipment)}${icon('down')}</a></div></div>${heroArt}</div>
      <div class="hero-bottom"><span>${escape(c.hero.eyebrow)}</span><a href="#equipamentos">${escape(c.hero.bottomLink)}${icon('down')}</a></div>
    </div></section>
    <section class="equipment section-pad" id="equipamentos"><div class="container"><p class="eyebrow">${responsiveText(c.equipmentSection.eyebrow, c.equipmentSection.mobileEyebrow)}</p><div class="section-intro"><h2>${lines(c.equipmentSection.title)}</h2><p>${responsiveText(c.equipmentSection.description, c.equipmentSection.mobileDescription)}</p></div><div class="equipment-list">${equipments}</div><div class="equipment-mobile-action"><a class="button button-orange" href="${mainContact}" ${external}>${escape(hasPhone ? c.equipmentSection.mobileCta : c.labels.instagramContact)}${icon('arrow')}</a></div></div></section>
    <section class="about section-pad" id="sobre"><div class="container about-grid"><div class="about-brand">${illustration(c, true)}</div><div class="about-copy"><p class="eyebrow">${escape(c.about.eyebrow)}</p><h2>${lines(c.about.title)}</h2><p>${inject(c.about.description)}</p><div class="about-caption"><span class="label-line" aria-hidden="true"></span>${escape(c.about.caption)}</div></div></div></section>
    ${gallery}
    <section class="social-strip"><div class="container social-inner"><div class="social-heading">${icon('instagram')}<div><h2>${escape(c.social.title)}</h2><p>${escape(c.social.description)}</p></div></div><a class="button button-outline" href="${url(c.instagram)}" ${external}>${escape(c.labels.instagram)}${icon('diagonal')}</a></div></section>
    <section class="contact section-pad" id="contato"><div class="container"><p class="eyebrow">${escape(c.contact.eyebrow)}</p><div class="contact-grid"><div><h2>${lines(c.contact.title)}</h2><p class="contact-description">${escape(c.contact.description)}</p><a class="button button-orange" href="${mainContact}" ${external}>${icon(hasPhone ? 'whatsapp' : 'instagram')}${escape(hasPhone ? c.labels.whatsapp : c.labels.instagramContact)}${icon('diagonal')}</a></div><dl class="contact-details">${hasPhone ? `<div><dt>${escape(c.contact.phoneLabel)}</dt><dd><a href="${mainContact}" ${external}>${escape(phoneDisplay)}</a></dd></div>` : ''}${c.region ? `<div><dt>${escape(c.contact.regionLabel)}</dt><dd>${escape(c.region)}</dd></div>` : ''}${optionalDetails}<div><dt>Instagram</dt><dd><a href="${url(c.instagram)}" ${external}>${escape(c.instagramHandle)}${icon('diagonal')}</a></dd></div></dl></div></div></section>
  </main>
  <footer class="site-footer"><div class="container"><div class="footer-top"><a class="footer-brand" href="#inicio">${escape(c.name)}</a><nav aria-label="Links do rodapé">${nav}<a href="${url(c.instagram)}" ${external}>Instagram</a></nav></div><div class="footer-bottom"><p>© <span data-year>${year}</span> ${escape(c.name)}. ${escape(c.footer.rights)}</p><a href="#inicio">${escape(c.labels.backToTop)}${icon('diagonal')}</a></div></div></footer>
  ${hasPhone ? `<aside class="floating-contact" aria-label="Contato rápido"><a href="${mainContact}" ${external} aria-label="Falar com a Franzoi Andaimes no WhatsApp">${icon('whatsapp')}<span>WhatsApp</span></a></aside>` : ''}
</body></html>`;
}

async function build() {
  const c = JSON.parse(await readFile(path.join(root, 'src/content.json'), 'utf8'));
  const production = process.argv.includes('--production');
  const wixPreview = process.argv.includes('--wix-preview');
  if (production && wixPreview) throw new Error('Escolha produção ou prévia Wix, nunca ambos.');
  // O proprietário autorizou publicar o conteúdo atual em andaimesfranzoi.com.
  // A opção explícita gera outro diretório; a prévia local continua sem indexação.
  if (production) c.preview = false;
  if (wixPreview) c.preview = true;
  const outputName = production ? 'build' : wixPreview ? 'wix-preview' : 'dist';
  const out = path.join(root, outputName);
  await mkdir(out, { recursive: true });
  if (production || wixPreview) {
    for (const name of ['assets', 'styles.css', 'app.js', 'favicon.ico']) {
      await cp(path.join(root, 'dist', name), path.join(out, name), { recursive: true });
    }
  }
  const socialExists = await access(path.join(out, c.images.social)).then(() => true).catch(() => false);
  await writeFile(path.join(out, 'index.html'), render(c, { socialExists, publicationAuthorized: production }));
  const sitemapPath = path.join(out, 'sitemap.xml');
  await writeFile(path.join(out, 'robots.txt'), c.preview ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\nSitemap: ${new URL('sitemap.xml', c.domain).href}\n`);
  if (!production && !wixPreview) await writeFile(path.join(out, '_headers'), `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n${c.preview ? '  X-Robots-Tag: noindex, nofollow, noarchive\n' : ''}`);
  // Wix Headless Drop rejeita arquivos sem uma extensão suportada.
  // Redirecionamentos e cabeçalhos devem ser configurados/validados no Wix.
  else await rm(path.join(out, '_headers'), { force: true });
  if (c.domain) await writeFile(sitemapPath, `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${escape(new URL(c.domain).origin + '/')}</loc></url></urlset>`);
  else await rm(sitemapPath, { force: true });
  console.log(`Site gerado em ${outputName}/. Modo: ${c.preview ? 'prévia sem indexação' : 'produção autorizada, aguardando publicação'}. WhatsApp: ${validPhone(c.whatsapp) ? 'configurado' : 'alternativa Instagram'}.`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await build();
