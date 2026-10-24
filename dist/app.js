document.documentElement.classList.add('js-enabled');
// A ordem do DOM acompanha a leitura e o teclado em cada largura, sem duplicar cards.
const equipmentList = document.querySelector('.equipment-list');
if (equipmentList) {
  const desktopRows = [...equipmentList.querySelectorAll('.equipment-row')];
  const mobileRows = [...desktopRows].sort((a, b) => Number(a.dataset.mobileOrder) - Number(b.dataset.mobileOrder));
  const mobileLayout = matchMedia('(max-width: 640px)');
  const orderEquipment = () => {
    const focused = document.activeElement;
    const rows = mobileLayout.matches ? mobileRows : desktopRows;
    rows.forEach((row, index) => {
      if (equipmentList.children[index] !== row) equipmentList.insertBefore(row, equipmentList.children[index] || null);
      const number = row.querySelector('.equipment-number');
      if (number) number.firstChild.textContent = String(index + 1).padStart(2, '0');
    });
    if (equipmentList.contains(focused) && document.activeElement !== focused) focused.focus({ preventScroll: true });
  };
  mobileLayout.addEventListener('change', orderEquipment);
  orderEquipment();
}
const toggle = document.querySelector('.menu-toggle');
const menu = document.querySelector('#menu-principal');
if (toggle && menu) {
  toggle.hidden = false;
  const closeMenu = (restoreFocus = false) => {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', toggle.dataset.openLabel);
    menu.classList.remove('is-open');
    if (restoreFocus) toggle.focus();
  };
  toggle.addEventListener('click', () => {
    const isOpen = toggle.getAttribute('aria-expanded') === 'true';
    if (isOpen) closeMenu();
    else {
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', toggle.dataset.closeLabel);
      menu.classList.add('is-open');
      menu.querySelector('a')?.focus();
    }
  });
  menu.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link) return;
    closeMenu();
    if (link.hash && link.origin === location.origin && matchMedia('(max-width: 900px)').matches) {
      const section = document.getElementById(link.hash.slice(1));
      if (section) {
        section.setAttribute('tabindex', '-1');
        section.focus({ preventScroll: true });
        section.addEventListener('blur', () => section.removeAttribute('tabindex'), { once: true });
      }
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') closeMenu(true);
  });
  document.addEventListener('click', event => {
    if (!menu.contains(event.target) && !toggle.contains(event.target)) closeMenu();
  });
  document.addEventListener('focusin', event => {
    if (!menu.contains(event.target) && !toggle.contains(event.target)) closeMenu();
  });
  matchMedia('(max-width: 900px)').addEventListener('change', () => closeMenu());
}
// O atalho só aparece quando sua área está livre de texto, imagens e controles.
// Assim não encobre conteúdo nem compete com os contatos do rodapé.
const floatingContact = document.querySelector('.floating-contact');
if (floatingContact) {
  const obstacles = [...document.querySelectorAll('h1,h2,h3,p,dt,dd,figcaption,a,button,.worker-window,.about-brand,.hero-photo,.equipment-photo,.gallery figure')]
    .filter(el => !floatingContact.contains(el));
  let framePending = false;
  const placeContact = () => {
    framePending = false;
    const rect = floatingContact.getBoundingClientRect();
    const collides = obstacles.some(el => {
      if (!el.getClientRects().length) return false;
      const other = el.getBoundingClientRect();
      return other.bottom > rect.top - 8 && other.top < rect.bottom + 8 && other.right > rect.left - 8 && other.left < rect.right + 8;
    });
    const nearContact = document.querySelector('#contato').getBoundingClientRect().top < innerHeight;
    floatingContact.classList.toggle('is-hidden', collides || nearContact || toggle?.getAttribute('aria-expanded') === 'true');
  };
  const schedule = () => { if (!framePending) { framePending = true; requestAnimationFrame(placeContact); } };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  document.addEventListener('click', schedule);
  document.fonts?.ready.then(schedule);
  schedule();
}
document.querySelectorAll('[data-year]').forEach(el => { el.textContent = String(new Date().getFullYear()); });
if ('IntersectionObserver' in window) {
  const links = [...document.querySelectorAll('.main-nav a[href^="#"]')];
  const observer = new IntersectionObserver(entries => {
    const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    links.forEach(link => {
      if (link.hash === `#${visible.target.id}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }, { rootMargin: '-100px 0px -50% 0px', threshold: [0, .1, .3] });
  links.forEach(link => { const section = document.querySelector(link.hash); if (section) observer.observe(section); });
}
