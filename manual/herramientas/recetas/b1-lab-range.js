// ventana 1400x1000
/* Bloque 1: «Rango y error de medición» con sólo la mitad de arriba de x y fiabilidad .70 */
(async () => {
  await W(1500);
  document.querySelector('#labTabs [data-lab="range"]').click(); await W(1000);
  const pg = vis('.playground'); irA(pg, 150); await W(300);
  const rs = [...pg.querySelectorAll('input[type=range]')];
  const set = (i, v) => { if (!rs[i]) return; rs[i].value = v; rs[i].dispatchEvent(new Event('input', { bubbles: true })); rs[i].dispatchEvent(new Event('change', { bubbles: true })); };
  set(0, 50); await W(300); set(2, 0.7); await W(900);
  return caja([pg], 6);
})()
