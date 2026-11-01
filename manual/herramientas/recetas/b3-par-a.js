// ventana 1400x1200
/* Bloque 3 con los lirios: el par elegido, de su título a la nube y los residuos */
(async () => {
  await bloque(3, 'iris'); await W(1500);
  const c = document.getElementById('b3PairCard'); irA(c); await W(500);
  const f = c.querySelector('.two-figs');
  return caja([c.querySelector("h2"), c.querySelector(".form-grid"), f], 10);
})()
