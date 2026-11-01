// ventana 1400x1100
/* Bloque 1: la ficha de una medida (τ-b de Kendall) abierta */
(async () => {
  await W(1500);
  const c = document.querySelector('#methodGallery [data-id="kendallB"]'); c.scrollIntoView(); c.click(); await W(1200);
  const head = document.querySelector('#methodDialog .mdlg-head');
  return caja([head.parentElement], 1);
})()
