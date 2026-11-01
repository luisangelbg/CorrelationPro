// ventana 1400x1000
/* Bloque 1: «Adivina la correlación» después de una respuesta (.60) */
(async () => {
  await W(1500);
  document.querySelector('#labTabs [data-lab="guess"]').click(); await W(1000);
  const pg = vis('.playground'); irA(pg, 150); await W(300);
  const s = pg.querySelector('input[type=range]'); s.value = 0.6; s.dispatchEvent(new Event('input', { bubbles: true }));
  await W(300); const b = vis('.playground button', 'Comprobar'); if (b) b.click(); await W(1200);
  return caja([pg], 6);
})()
