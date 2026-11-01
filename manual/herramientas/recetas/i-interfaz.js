// ventana 1400x880
/* Introducción: las partes de la pantalla, sobre el Bloque 5 con los lirios */
(async () => {
  const W = ms => new Promise(r => setTimeout(r, ms));
  await W(1200); B2.loadExample('iris'); await W(400); goStep(5); await W(2600); window.scrollTo(0, 0); await W(500);
  const vw = innerWidth, vh = innerHeight;
  /* the first visible element that matches (and whose text starts with txt) */
  const vis = (sel, txt, maxX) => [...document.querySelectorAll(sel)].find(n => { const r = n.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top < vh && (!txt || n.textContent.trim().startsWith(txt)) && (!maxX || r.left < maxX); });
  const at = (n, dx, dy) => { if (!n) return null; const r = n.getBoundingClientRect(); return [(r.left + r.width * (dx == null ? 0.5 : dx)) / vw * 100, (r.top + r.height * (dy == null ? 0.5 : dy)) / vh * 100]; };
  const m = [
    [1, at(vis('.brand'), 0.12)],
    [2, at(vis('.suite-link'))],
    [3, at(vis('[aria-label="Idioma / Language"]'))],
    [4, at(vis('#themeBtn'))],
    [5, at(vis('[title="Reportar un problema"], [aria-label="Reportar un problema"]'))],
    [6, at(vis('#helpBtn'))],
    [7, at(vis('button, a', 'Matriz', 400) || vis('a, button', '5', 400), 0.9)],
    [8, at(vis('button', 'Documento'), 0.5)],
    [9, at(vis('.lnav-k'))],
    [10, at(vis('*', 'EN ESTE BLOQUE') || vis('*', 'En este bloque'), 0.15)],
    [11, at(vis('.step-panel.active .card'), 0.02, 0.1)],
    [12, at(vis('button, a', 'Modo enfocado', 400), 0.9)],
  ].filter(x => x[1]);
  window.__marcas = m.map(([n, p]) => [n, +p[0].toFixed(1), +p[1].toFixed(1)]);
  return null;
})()
