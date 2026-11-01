// ventana 1400x1100
/* Bloque 13 con los lirios: el estudio de figuras abierto sobre la matriz de dispersión */
(async () => {
  await bloque(3, "iris"); await W(1500); goStep(13); await W(2000);
  const b = [...document.querySelectorAll('#b13Sec-figs button, #b13Sec-figs a')].filter(x => /Exportar|Export/.test(x.textContent))[1];
  b.click(); await W(2500);
  const d = [...document.querySelectorAll('dialog[open], .lfs-dlg, .lfs-modal, [role="dialog"]')].find(x => x.getBoundingClientRect().width > 300);
  window.scrollTo(0, 0); await W(300);
  const r = d.getBoundingClientRect();
  return [r.left + scrollX, r.top + scrollY, r.width, r.height].map(Math.round).join(',');
})()
