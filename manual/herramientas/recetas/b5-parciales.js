// ventana 1400x1200
/* Bloque 5 con Suiza, 1888: las correlaciones parciales ordenadas por agrupamiento, en pasteles y color */
(async () => {
  await bloque(5, 'swiss'); await W(2500);
  const set = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })); };
  set('b5Lower', 'pie'); await W(900); set('b5Upper', 'color'); await W(900); set('b5Order', 'hclust:average'); await W(600); set('b5Show', 'partial'); await W(900);
  const p = document.getElementById('b5FigPane'); irA(p); await W(600);
  return caja([p], 8);
})()
