// ventana 1400x1200
/* Bloque 11 con Suiza, 1888: la red de correlaciones con |r| de .30 o más, en círculo */
(async () => {
  await bloque(11, 'swiss'); await W(2500);
  const k = document.getElementById('b11Kind'); k.value = 'marginal'; k.dispatchEvent(new Event('change', { bubbles: true })); await W(1500);
  document.querySelector('.b11-bar [data-view="circle"]').click(); await W(2000);
  const p = document.getElementById('b11NetPane'); irA(p); await W(600);
  return caja([p], 8);
})()
