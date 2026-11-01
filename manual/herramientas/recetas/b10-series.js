// ventana 1400x1200
/* Bloque 10: la economía de 1947 a 1962: el producto nacional y los empleados, ordenados por año */
(async () => {
  await bloque(10, 'longley'); await W(2000);
  const k = nm => state.data.cols.find(c => c.name === nm).key, set = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })); };
  set('b10TX', k('gnp')); await W(300); set('b10TY', k('employed')); await W(300); set('b10TT', k('year')); await W(1200);
  const c = tarjeta(10, 2); irA(c); await W(700);
  return caja([c], 4);
})()
