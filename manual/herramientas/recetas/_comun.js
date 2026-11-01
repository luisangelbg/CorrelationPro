/* CorrelationPro — manual: ayudantes que captura.js antepone a cada receta.
   W(ms)               espera
   vis(sel, txt)       el primer elemento visible que coincide (y cuyo texto empieza con txt)
   irA(nodo, margen)   lleva el nodo a la vista, debajo de las barras fijas
   caja(nodos, p)      el recorte que envuelve a los nodos, con p píxeles de aire, en coordenadas del documento
   seccion(id)         los nodos de una sección de la portada: su título y lo que sigue hasta el siguiente título
   bloque(n, ejemplo)  abre los datos de ejemplo (si se dan) y el bloque n
   tarjeta(n, i)       la i-ésima tarjeta visible del bloque n */
var W = ms => new Promise(r => setTimeout(r, ms));
var vis = (sel, txt) => [...document.querySelectorAll(sel)].find(n => { const r = n.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (!txt || n.textContent.trim().startsWith(txt)); });
var irA = (n, margen) => { window.scrollTo(0, n.getBoundingClientRect().top + window.scrollY - (margen == null ? 160 : margen)); };
var caja = (nodos, p) => {
  p = p == null ? 10 : p;
  const rs = [].concat(nodos).filter(Boolean).map(n => n.getBoundingClientRect()).filter(r => r.width > 0);
  const x = Math.min(...rs.map(r => r.left)) - p, y = Math.min(...rs.map(r => r.top)) - p;
  const w = Math.max(...rs.map(r => r.right)) + p - x, h = Math.max(...rs.map(r => r.bottom)) + p - y;
  return [x + window.scrollX, y + window.scrollY, w, h].map(Math.round).join(',');
};
var seccion = id => {
  const h = document.getElementById(id) || vis('.section-title', id);
  const out = [h];
  let n = h.nextElementSibling;
  while (n && !n.classList.contains('section-title')) { out.push(n); n = n.nextElementSibling; }
  return out;
};
var bloque = async (n, ejemplo) => {
  await W(1000);
  if (ejemplo) { B2.loadExample(ejemplo); await W(500); }
  goStep(n); await W(1800);
};
var tarjeta = (n, i) => [...document.querySelectorAll('#panel-' + n + ' .card')].filter(c => c.getBoundingClientRect().height > 0)[i || 0];
/* the floating buttons of the navigator (back to top, last change) stay out of the captures */
(() => { const st = document.createElement('style'); st.textContent = '.lnav-fbtn, .lnav-float, [data-lnav="top"], [data-lnav="last"] { display: none !important; }'; document.head.appendChild(st); })();
