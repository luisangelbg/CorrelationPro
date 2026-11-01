// ventana 1400x1000
/* Bloque 2: transformar una columna (Box–Cox del largo del pétalo) */
(async () => {
  await bloque(2, 'iris');
  const col = document.getElementById('b2TrCol'), op = document.getElementById('b2TrOp');
  col.value = [...col.options].find(o => (/pétalo/.test(o.text) && /Largo/.test(o.text)) || /Petal length/.test(o.text)).value; col.dispatchEvent(new Event('change', { bubbles: true })); await W(300);
  op.value = 'boxcox'; op.dispatchEvent(new Event('change', { bubbles: true })); await W(200);
  document.getElementById('b2TrGo').click(); await W(900);
  const c = col.closest('.card'); irA(c); await W(400);
  return caja([c], 4);
})()
