// ventana 1400x1200
/* Bloque 11 con Suiza, 1888: la red de parciales regularizadas, vista de fuerzas, con un nodo elegido */
(async () => {
  await bloque(11, 'swiss'); await W(2500);
  const n = [...document.querySelectorAll('#b11Net .b11-n')].find(g => g.textContent.startsWith('Educación')); if (n) n.dispatchEvent(new MouseEvent('click', { bubbles: true })); await W(600);
  const p = document.getElementById('b11NetPane'); irA(p); await W(600);
  return caja([p, document.getElementById('b11Info')], 8);
})()
