// ventana 1400x1200
/* Bloque 7 con Suiza, 1888: la correlación canónica entre los indicadores sociales y los demográficos */
(async () => {
  await W(1000); B2.loadExample('swiss'); await W(500);
  const k = nm => state.data.cols.find(c => c.name === nm).key, S = B7.state;
  S.x = k('education'); S.y = k('fertility'); S.z = [k('catholic'), k('agriculture')];
  S.my = k('fertility'); S.mx = ['agriculture', 'examination', 'education', 'catholic', 'infant_mortality'].map(k);
  S.A = ['agriculture', 'examination', 'education', 'catholic'].map(k); S.B = ['fertility', 'infant_mortality'].map(k);
  S.dirty = true; goStep(7); await W(2500);
  document.dispatchEvent(new Event('langchange')); await W(3000);
  const c = tarjeta(7, 2); irA(c); await W(600);
  return caja([c], 4);
})()
