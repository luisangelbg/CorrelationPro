// ventana 1400x1000
/* Bloque 2: la tarjeta para abrir datos, con las opciones de lectura abiertas */
(async () => {
  await bloque(2);
  const d = document.querySelector('#b2Open details'); if (d) d.open = true; await W(300);
  const c = document.getElementById('b2Open'); irA(c); await W(400);
  return caja([c], 4);
})()
