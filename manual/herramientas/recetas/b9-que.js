// ventana 1400x1200
/* Bloque 9 con los evaluadores simulados: qué se compara */
(async () => {
  await bloque(9, 'sleep'); await W(1500);
  document.getElementById('b9Sim').click(); await W(2500);

  const c = tarjeta(9, 0); irA(c); await W(600);
  return caja([c], 4);
})()
