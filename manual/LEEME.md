# Manual de usuario de CorrelationPro

Manual en español, en HTML, pensado para imprimirse a PDF. Sigue la misma forma que los de
las demás aplicaciones LABG: hoja tamaño carta sin márgenes añadidos, Cormorant para los
títulos, Crimson Pro para el texto y Jost para los rótulos, y una portada que es **una sola
ilustración vectorial original**, dibujada por código a partir de los motores de la propia app.

## Cómo está partido

Un archivo por parte, en `es/`, y cada capítulo explica el bloque del mismo número; la
introducción no lleva número (sus secciones son I.1, I.2…).

| Archivo | Contenido |
|---|---|
| `00a-portada.html` | Portada (la escribe `herramientas/genera-portada.js`) |
| `00b-introduccion.html` | Créditos, índice, cómo leer el manual e introducción (I.1 a I.10) |
| `01-bloque1.html` | Capítulo 1 · Inicio: la portada, la ruta, los seis laboratorios, el mapa de medidas, glifos, paletas, estilos, catálogo y teoría |
| `02-bloque2.html` | Capítulo 2 · Datos: abrir, los nueve conjuntos, tipos y papeles, faltantes, transformaciones y el asistente |
| `03-bloque3.html` | Capítulo 3 · Exploración y supuestos: matriz de dispersión, normalidad, atípicos, supuestos de cada par y el coeficiente recomendado |
| `04-bloque4.html` | Capítulo 4 · Un par a fondo: doce coeficientes, bootstrap, permutación y factor de Bayes |
| `05-bloque5.html` | Capítulo 5 · La matriz: glifos, orden, pruebas múltiples, diagnóstico, KMO, tabla y matrices grandes |
| `06-bloque6.html` | Capítulo 6 · No lineal: dCor, ξ, HSIC, MIC, información mutua, rastreo y cópulas |
| `07-bloque7.html` | Capítulo 7 · Parcial, múltiple, canónica, RV, Procrustes, Mantel y coinercia |
| `08-bloque8.html` | Capítulo 8 · Categóricas: tablas, medidas, 2 × 2, continua con categórica y matriz heterogénea |
| `09-bloque9.html` | Capítulo 9 · Acuerdo: Lin, Bland–Altman, seis ICC, κ y sus parientes |
| `10-bloque10.html` | Capítulo 10 · Estructura: grupos, medidas repetidas, series, espacio, filogenia, ángulos y composiciones |
| `11-bloque11.html` | Capítulo 11 · Redes: cuatro maneras de armarlas, cinco vistas, centralidades y comunidades |
| `12-bloque12.html` | Capítulo 12 · Comparar, corregir, planear y combinar |
| `13-bloque13.html` | Capítulo 13 · Figuras, paletas, tabla, métodos, informe y proyecto |
| `14-apendices.html` | Apéndices A–F: archivos, reglas de lectura, glosario, fallos comunes, licencia y las 229 referencias |
| `manual-completo.html` | Las partes unidas, que es lo que se imprime (lo genera `herramientas/unir-manual.ps1`; no se edita a mano) |

La portada usa sólo `manual.css`, porque es una hoja entera de dibujo. Todo lo demás usa
`interior.css` y `paginar.js`, que reparten el texto en hojas con su encabezado corrido, su
número de página y la pestaña del capítulo en el margen (quince pestañas: In, 1 a 13 y Ap).
Los números de página del índice se llenan solos; en una parte suelta quedan en blanco, que es
lo esperado hasta que se unen. Los colores de los bloques (`--b1` a `--b13`) son los de la app,
y la identidad es la de la app: laca negra, rojo y el oro de la suite.

## Las capturas

Las 94 imágenes de `img/` salen de la app misma, a doble resolución, con una receta por imagen en
`herramientas/recetas/`. Cada receta es un fragmento que abre un bloque con un conjunto de
ejemplo, ajusta los controles y devuelve el recorte; su primera línea dice el tamaño de la ventana
(`// ventana 1400x1200`). `recetas/_comun.js` se antepone a todas: abre un bloque (`bloque`), lleva
un elemento a la vista (`irA`), calcula el recorte (`caja`) y esconde los botones flotantes del
navegador para que no salgan en la imagen.

Desde la raíz de la app:

```
node manual/herramientas/captura.js b5-matriz          # una
node manual/herramientas/captura.js --todas            # todas
```

Si una receta deja en `window.__marcas` una lista `[[n, x%, y%], …]`, la herramienta escribe además
`img/<nombre>.marcas.json` con la posición de los círculos numerados que el texto pone encima.
**Después de cambiar algo visible en la app, se vuelven a sacar las capturas afectadas**: el texto
del manual cita los números que se ven en ellas, y todos se comprobaron en la app.

## Las herramientas

Todas usan `cdp.js`, que abre Edge (o Chrome) sin ventana con un perfil temporal propio
(`correlationpro-manual-<puerto>` en la carpeta temporal) y lo borra al cerrar; nunca toca el
navegador del usuario. Node 18 o posterior; sin dependencias.

| Herramienta | Para qué |
|---|---|
| `captura.js` | Saca una captura de la app con su receta |
| `revisar.js` | Dice cuántas hojas salen, si alguna desborda, las imágenes que no cargaron y los huecos grandes al pie de cada hoja, con la figura que los causa (`node manual/herramientas/revisar.js manual/es/05-bloque5.html --huecos 1.2`) |
| `anchos.js` | Pone o quita las clases de ancho de las figuras por el nombre de su imagen (`node anchos.js archivo b5-tabla=w70 …`; `=w100` la quita) |
| `genera-portada.js` | Dibuja la portada con los motores de la app (los lirios, los glifos, la matriz, la red y la potencia) |
| `genera-referencias.js` | Escribe las referencias del apéndice F desde `js/theory.js`, para que el manual y la app citen exactamente lo mismo |
| `unir-manual.ps1` | Une las partes en `manual-completo.html` |
| `imprimir-pdf.js` | Imprime el manual unido a PDF |

Las figuras demasiado altas para la hoja se angostan con las clases `figure.w50` a `figure.w80`
de `interior.css`; los textos de las capturas no deben quedar por debajo de lo legible (una
captura con mucho texto, no menos de `w70`). `paginar.js` adelanta el texto que sigue a una figura
que no cabe, así que un hueco al pie de una hoja no siempre se arregla moviendo párrafos.

## Cómo se une

Desde la carpeta `manual/`:

```
powershell -ExecutionPolicy Bypass -File herramientas\unir-manual.ps1 es
```

Escribe `es/manual-completo.html` con la portada como primera hoja y las quince partes en orden,
con un solo `paginar.js`, de modo que la numeración sea continua y el índice encuentre las páginas
de todos los capítulos. Los estilos propios de cada parte se funden; si dos partes escriben el mismo
selector con valores distintos, gana el más frecuente y el otro se acota a las hojas de su capítulo.
**El script tiene que guardarse con marca de orden de bytes (BOM)**: Windows PowerShell 5.1 lee como
ANSI un `.ps1` sin ella, y el `·` del título saldría mal.

## Cómo se obtiene el PDF

**Sólo al final**, cuando todas las partes están escritas y revisadas, y **de una sola vez**: unir
PDF sueltos pierde los enlaces del índice y reinicia la numeración. Desde la raíz de la app, después
de unir:

```
node manual/herramientas/imprimir-pdf.js
```

Espera a que las tres tipografías estén cargadas —Cormorant en el peso 500, el que pide la hoja de
estilo— y a que el número de hojas deje de cambiar, y sólo entonces imprime con los fondos, hoja
carta y sin márgenes. No se usa `--print-to-pdf`, que imprime antes de que `paginar.js` reparta las
hojas. También se puede imprimir a mano desde el navegador: destino **Guardar como PDF**, márgenes
**Ninguno** y **Gráficos de fondo** activado.

El resultado se guarda como `manual/CorrelationPro_Manual_de_usuario_ES.pdf`, igual que en las
demás apps.

## De fuera

Las tres tipografías (Cormorant, Crimson Pro y Jost) vienen del servicio público de tipografías web
y sólo las usa el manual, no la app; tienen licencia SIL Open Font License. Todo lo demás —el texto,
las capturas, la portada y las herramientas— es propio. El manual no nombra programas ni marcas:
los resultados de la app se validaron contra programas de referencia, pero eso se documenta en
`validation/`, no aquí.
