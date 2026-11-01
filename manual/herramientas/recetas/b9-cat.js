// ventana 1400x1200
/* Bloque 9 con los evaluadores simulados: κ y sus parientes con los cuatro evaluadores */
(async () => {
  await bloque(9, 'sleep'); await W(1500);
  document.getElementById('b9Sim').click(); await W(2500);
  B9.state.keys = state.data.cols.filter(c => c.name.startsWith('evaluador')).map(c => c.key); document.dispatchEvent(new Event('langchange')); await W(2500);
  const c = tarjeta(9, 1); irA(c); await W(600);
  return caja([c], 4);
})()
