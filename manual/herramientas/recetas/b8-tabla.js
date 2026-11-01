// ventana 1400x1200
/* Bloque 8 con el Titanic: la clase y la supervivencia, la tabla y el mosaico */
(async () => {
  await bloque(8, 'titanic'); await W(2500);
  const k = nm => state.data.cols.find(c => c.name === nm).key;
  const set = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })); };
  set('b8R', k('class')); await W(300); set('b8C', k('survived')); await W(1500);
  const c = tarjeta(8, 0); irA(c); await W(600);
  return caja([c.querySelector('h2'), c.querySelector('.two-figs')], 14);
})()
