// ventana 1400x1200
/* Bloque 8 con los lirios: el largo del pétalo y la especie */
(async () => {
  await bloque(8, 'iris'); await W(2500);
  const k = nm => state.data.cols.find(c => c.name === nm).key;
  const set = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })); };
  set('b8X', k('petal_length')); await W(300); set('b8G', k('species')); await W(1500);
  const c = tarjeta(8, 1); irA(c); await W(600);
  return caja([c], 4);
})()
