// ventana 1400x1200
/* Bloque 8 con el Titanic: el sexo y la supervivencia, una tabla de 2 × 2 */
(async () => {
  await bloque(8, 'titanic'); await W(2500);
  const k = nm => state.data.cols.find(c => c.name === nm).key;
  const set = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })); };
  set('b8R', k('sex')); await W(300); set('b8C', k('survived')); await W(1500);
  const t = document.getElementById('b8Tiles'); irA(t); await W(600);
  return caja([t, document.getElementById('b8Measures')], 10);
})()
