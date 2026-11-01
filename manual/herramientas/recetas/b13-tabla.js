// ventana 1400x1300
/* Bloque 13 con los lirios, después de los Bloques 3, 4 y 5: la tabla para publicar */
(async () => {
  await bloque(3, "iris"); await W(1500); goStep(4); await W(3500); goStep(5); await W(2500); goStep(13); await W(2000);
  const sec = document.querySelector('#panel-13 [data-sec="table"]'); if (sec) sec.click(); await W(1800);
  const c = [...document.querySelectorAll('#b13Sec-table .card')][0]; irA(c); await W(600);
  return caja([c], 4);
})()
