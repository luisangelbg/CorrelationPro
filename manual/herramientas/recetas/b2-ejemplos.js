// ventana 1400x1100
/* Bloque 2: los conjuntos de dominio público (las primeras seis tarjetas) */
(async () => {
  await bloque(2);
  document.getElementById('b2ExamplesBtn').click(); await W(600);
  const c = document.getElementById('b2Examples'), g = document.getElementById('b2ExGrid'), cards = [...g.children].slice(0, 6);
  irA(c); await W(400);
  const h = c.querySelector('h2'), sub = h && h.nextElementSibling;
  return caja([h, sub, ...cards], 10);
})()
