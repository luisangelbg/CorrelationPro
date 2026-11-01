// ventana 1400x1200
/* Bloque 12: planear un estudio con ρ esperada de .30 */
(async () => {
  await bloque(12); await W(800);
  document.querySelector('.b12-bar [data-sec="plan"]').click(); await W(2000);
  const c = [...document.querySelectorAll('#b12Sec-plan .card')][0]; irA(c); await W(600);
  return caja([c], 4);
})()
