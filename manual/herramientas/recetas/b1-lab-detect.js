// ventana 1400x1000
/* Bloque 1: el laboratorio «detect» */
(async () => {
  await W(1500);
  const t = document.querySelector('#labTabs [data-lab="detect"]'); t.click(); await W(1500);
  const pg = vis('.playground'); irA(pg, 150); await W(600);
  return caja([pg], 6);
})()
