// ventana 1400x1200
/* Bloque 2: el asistente con dos continuas de los lirios */
(async () => {
  await bloque(2, 'iris');
  const x = document.getElementById('b2AsX'), y = document.getElementById('b2AsY');
  const pick = (s, re) => { const o = [...s.options].find(o => re.test(o.text)); if (o) { s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); } };
  pick(x, /Largo del sépalo/); await W(300); pick(y, /Ancho del sépalo/); await W(900);
  const c = document.getElementById('b2Assist'); irA(c); await W(400);
  return caja([c], 4);
})()
