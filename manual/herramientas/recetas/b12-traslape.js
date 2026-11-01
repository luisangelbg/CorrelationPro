// ventana 1400x1200
/* Bloque 12: dos correlaciones en los mismos casos con una variable en común, con los valores de omisión */
(async () => {
  await bloque(12, 'iris'); await W(800);
  const d = document.getElementById('b12Design'); d.value = 'overlap'; d.dispatchEvent(new Event('change', { bubbles: true })); await W(1500);
  const c = tarjeta(12, 1); irA(c); await W(600);
  return caja([c.querySelector('h2'), document.getElementById('b12CTiles'), document.getElementById('b12CTable')], 12);
})()
