// ventana 1400x880
/* Introducción: la búsqueda de la app (Ctrl+K) con «kendall» escrito */
(async () => {
  const W = ms => new Promise(r => setTimeout(r, ms));
  await W(1200);
  const b = [...document.querySelectorAll('.lnav-k')].find(n => n.getBoundingClientRect().width > 0);
  if (b) b.click(); else document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
  await W(600);
  const inp = document.activeElement && document.activeElement.tagName === 'INPUT' ? document.activeElement : null;
  if (inp) { inp.value = 'kendall'; inp.dispatchEvent(new Event('input', { bubbles: true })); }
  await W(700);
  const dlg = [...document.querySelectorAll('dialog[open], .lnav-pal, [role="dialog"]')].find(n => n.getBoundingClientRect().width > 300);
  if (!dlg) return null;
  const r = dlg.getBoundingClientRect(), p = 1;
  return [r.left - p + scrollX, r.top - p + scrollY, r.width + 2 * p, r.height + 2 * p].map(Math.round).join(',');
})()
