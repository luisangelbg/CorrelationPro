// ventana 1400x1100
/* Bloque 1: las paletas, con sus cinco controles (primeras nueve) */
(async () => {
  await W(1500);
  const ns = seccion('palettes'); irA(ns[0], 150); await W(900);
  const grid = document.getElementById('palGrid'), cards = [...grid.children].slice(0, 9);
  const ctl = document.getElementById('palVision').closest('div, label, p') || document.getElementById('palVision');
  return caja([ns[0], ns[1], ctl, ...cards], 8);
})()
