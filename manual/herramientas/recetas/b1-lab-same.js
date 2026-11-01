// ventana 1400x1000
/* Bloque 1: el laboratorio «Misma r, distinta forma», ya transformado en ajolote */
(async () => {
  await W(1500);
  document.querySelector('#labTabs [data-lab="same"]').click(); await W(1200);
  const pg = vis('.playground'); irA(pg, 150); await W(400);
  const t = (vis('.playground button', 'Transformar') || vis('.playground button', 'Morph')); if (t) t.click();
  /* the annealing runs on animation frames: wait until the button comes back */
  for (let i = 0; i < 60; i++) { await W(500); const b = (vis('.playground button', 'Transformar') || vis('.playground button', 'Morph')); if (b && !b.disabled && i > 6) break; }
  await W(800);
  return caja([pg], 6);
})()
