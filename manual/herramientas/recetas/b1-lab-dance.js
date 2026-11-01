// ventana 1400x1000
/* Bloque 1: «La danza de r» después de bailar un rato */
(async () => {
  await W(1500);
  document.querySelector('#labTabs [data-lab="dance"]').click(); await W(1000);
  const pg = vis('.playground'); irA(pg, 150); await W(400);
  const b = vis('.playground button', 'Bailar'); if (b) b.click();
  await W(9000);
  const s = vis('.playground button', 'Detener') || vis('.playground button', 'Pausa'); if (s) s.click();
  await W(600);
  return caja([pg], 6);
})()
