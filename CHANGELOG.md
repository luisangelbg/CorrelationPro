# CorrelationPro · cambios

## Bloque 1 · Inicio (3 de octubre de 2026)

- Armazón de la LABG Suite: barra común, 13 bloques (2–13 «pronto»), navegador 1.1.0, estudio de figuras 1.5.0,
  editor ✎ 1.0.0, espera animada; español por omisión con selector ES | EN; tema claro y oscuro.
- Identidad negro laca, rojo y oro; neutros cálidos.
- Motor propio: `num.js` (sumas compensadas, rangos, distribuciones normal/t/F/χ²/beta/gamma, Kendall y Spearman
  exactos, generador con semilla), `coef.js` (12 coeficientes con sus pruebas, intervalos y convenios), `palettes.js`
  (OKLab/OKLCH, 19 paletas propias, simulación de daltonismo, controles), `fmt.js` (APA, biomédico, NOM con punto y
  con coma), `glyphs.js` (9 glifos con la media luna propia y su transformación), `plot.js` (kit de figuras).
- Portada: héroe con la paradoja de Simpson en los lirios de Anderson y una matriz que cambia de glifo; seis
  laboratorios; catálogo de 98 medidas con fórmula en MathML; 12 temas de teoría; ~160 referencias.
- Datos de ejemplo: iris (dominio público).
- 75 pruebas en `tests/index.html`; validación 1 081 + 450 + 342 comparaciones contra R sin desacuerdos
  (`validation/block1/`).

## Bloques 2 a 13 · versión 1.0.0 (3 y 4 de octubre de 2026)

La aplicación completa: los 13 bloques listos, 284 pruebas en el navegador y 19 334 comparaciones contra R 4.4.2 sin
desacuerdos (Bloques 1 a 12; el 13 no calcula estadística nueva). Cada carpeta de `validation/` tiene su `LEEME.md` con
lo que se compara, cómo correrlo y los errores que la validación atrapó.

- **Bloque 2 · Datos** (`dataio.js`, `table.js`, `block2.js`): CSV, TSV, texto pegado, libros xlsx y ods leídos con
  código propio; tipo y papel de cada columna; faltantes por pares o por listas; transformaciones (z, rangos, normal
  por rangos, Box–Cox); nueve conjuntos de dominio público; el asistente «¿qué correlación uso?». 544 comparaciones.
- **Bloque 3 · Exploración y supuestos** (`assume.js`): matriz de dispersión, Shapiro–Wilk, Anderson–Darling, Mardia,
  Henze–Zirkler, LOWESS, Breusch–Pagan, OGK, influencia y la recomendación del coeficiente de cada par. 6 454.
- **Bloque 4 · Un par a fondo** (`pairstat.js`): todos los coeficientes del par, intervalos analíticos y bootstrap
  (normal, básico, percentil, BCa), permutación, factor de Bayes de ρ con su posterior, tamaño en palabras. 1 357 y la
  cobertura por simulación.
- **Bloque 5 · Matriz** (`matrix.js`): once medidas, seis correcciones por pruebas múltiples, diagnóstico espectral,
  matriz definida positiva más cercana, contracción, KMO, Bartlett, cuatro órdenes, nueve glifos animados, lienzo con
  lente hasta mil variables. 3 059.
- **Bloque 6 · No lineal** (`nonlin.js`): dCor, HSIC, MIC, ξ, τ*, Hoeffding, información mutua, correlación máxima,
  rastreo de la matriz y cinco familias de cópulas con sus colas. 232.
- **Bloque 7 · Parcial y conjuntos** (`partial.js`): parcial y semiparcial con tres coeficientes, dCor parcial, R
  múltiple con su reparto, correlación canónica con cuatro pruebas, RV, Procrustes, Mantel y **coinercia**. 111 + 1 428.
- **Bloque 8 · Categóricas** (`categ.js`): χ², G², Fisher, φ, V (y corregida), C, T, λ, τ, U, Q, Y, razón de momios,
  tetracórica, policórica, poliserial, biserial, rango-biserial, η y la matriz heterogénea. 320.
- **Bloque 9 · Acuerdo** (`agree.js`): CCC, Bland–Altman, las seis formas del ICC, κ de Cohen, ponderada, de Fleiss y
  de Conger, W de Kendall, α de Krippendorff, AC1/AC2 de Gwet. 77.
- **Bloque 10 · Estructura** (`struct.js`): dentro y entre grupos (Simpson), medidas repetidas, series con
  preblanqueo, t de Dutilleul, contrastes filogenéticos, circulares y composicionales; ejemplos simulados rotulados
  como tales. 169.
- **Bloque 11 · Redes** (`network.js`): lazo gráfico con EBIC, parciales y marginales con umbral, centralidades,
  Louvain; vistas de fuerzas, círculo, cuerdas agrupadas, arcos y matriz, con recorrido animado. 1 954.
- **Bloque 12 · Comparar, corregir, planear y combinar** (`infer.js`, `block12.js`): dos correlaciones (independientes,
  traslapadas y no traslapadas, 15 pruebas e intervalos de Zou), dos matrices (Jennrich y celda por celda con Holm),
  atenuación y restricción de rango (casos II y III), potencia aproximada y exacta con la distribución de r, n por
  potencia y por amplitud, factor de Bayes de una r publicada, metaanálisis FE, DL, REML y Hunter–Schmidt con bosque,
  embudo, predicción y Egger. 1 756.
- **Bloque 13 · Figuras, paletas e informe** (`block13.js`): galería de todas las figuras con exportación por el
  estudio (anchos de revista, PNG, SVG, PDF vectorial, TIFF); letra de las figuras; diseñador de paletas divergentes en
  OKLab con pruebas de daltonismo, gris y contraste y búsqueda del mejor tono; tabla de correlaciones para publicar
  (asteriscos, IC o p, descriptivos, estilo de números) que se copia al procesador de textos o se descarga; métodos
  redactados a partir de lo que se corrió, con sus referencias; informe imprimible con los colores del tema claro;
  paquete del proyecto en JSON (datos, tipos, faltantes, paleta y estilo).
- Referencias: 230. Catálogo: 98 medidas; la ficha de la correlación multinivel aclara que la app calcula su versión
  descriptiva (Bloque 10) y no el modelo mixto.
- Auditoría de la suite a 1280 y 360 px: cero problemas en los 13 bloques; modo oscuro e inglés revisados.
- Recorrido final de los 9 conjuntos de ejemplo por los 12 bloques de cálculo: sin errores ni valores NaN. Arregló
  dos fallos: (1) el Bloque 10 dibujaba rectas con NaN cuando la columna de grupo era un identificador (un caso por
  grupo); ahora lo avisa, prefiere otra columna y la gráfica omite grupos de menos de tres puntos; (2) el Bloque 4
  tardaba 60 s con Suiza porque su modelo de costo subestimaba τ* unas 600 veces y le hacía 499 remuestreos; ahora
  tarda 0.3 s.

## Manual de usuario en español y arreglos hallados al escribirlo (4 de octubre de 2026)

- **Manual** en `manual/`: portada dibujada con los motores de la app, introducción, 13 capítulos (uno por bloque) y
  apéndices (archivos, reglas de lectura, glosario, fallos comunes, licencia y las 230 referencias, generadas desde
  `js/theory.js`); 94 capturas sacadas de la app con una receta cada una; herramientas para capturar, revisar la
  paginación, unir las partes e imprimir el PDF. Ver `manual/LEEME.md`.
- Escribir el manual obligó a mirar cada pantalla de cerca. Lo que se arregló, sin cambiar ningún resultado salvo el
  de la información mutua:
  - **Información mutua (Bloque 6)**: el estimador de vecinos cercanos usa la norma del máximo y trabajaba con las
    variables en sus unidades, así que la de mayor dispersión decidía sola los vecinos (con el año y las fuerzas
    armadas daba 0). Ahora estandariza las dos variables; la validación se rehízo igual en R: 232 comparaciones sin
    desacuerdos.
  - **Detector composicional (Bloque 2)**: una columna pequeña medida junto a las partes (el carbono junto a la
    arena, el limo y la arcilla) mantenía la suma casi constante y entraba al grupo. Ahora gana el grupo cuya suma
    varía menos. Prueba nueva en `tests/block2.js`.
  - **Composiciones (Bloque 10)**: la matriz central dibujaba los log-cocientes, no su correlación.
  - Categorías del Titanic en español cuando la app está en español (`levels_es` en `data/generar_datos.R`); nombres
    legibles y con acentos para las columnas de los ejemplos simulados de los Bloques 9 y 10.
  - Textos: dCor en minúscula dentro de una frase; símbolos con subíndice (*r*<sub>pb</sub>) en el Bloque 4; factor de
    Bayes y número de condición en notación × 10ⁿ (`Fmt.sci`); el rango de ξ y D dicho con honestidad; la nota de la
    tabla sin la estrella que no puede salir con α = .01; matriz singular «N valores propios nulos»; lectura del
    Bloque 6 menos tajante; sesgo medio y proporcional nombrados en la lectura de Bland–Altman; «colisionador» en lugar
    de «collider»; «a, b y c» en la lista de controles; el riesgo relativo dice qué compara; una sola prueba no se
    cuenta como «1 de 1»; los métodos dicen «la r de Pearson» y citan a Kaiser y Rice (1974) como la lista.
  - Figuras: etiquetas de los puntos rodeados sin salirse ni encimarse; margen superior de la matriz con nombres
    girados; letra de cada coeficiente en la esquina de la celda (Bloque 8); etiquetas del círculo de correlaciones y
    de la red dentro de la figura; leyenda del embudo bajo el eje; MIC con una sola rejilla posible da un aviso en vez
    de una matriz de una celda; las letras griegas no se vuelven mayúsculas en los títulos (`keepGreek`).
  - Controles: opciones más cortas que no se cortan (Bloques 4, 5, 11 y 12), rejillas de controles más anchas, tablas
    a todo lo ancho con su gráfica debajo (Bloques 7 y 11), botones de un campo sin estirarse, filas del rastreo
    elegibles con el teclado.
- Navegador 1.1.2 y estudio de figuras 1.5.1 de la suite (letras del sistema, nada pedido a internet).
- 285 pruebas.

## La etiqueta en el nombre en el catálogo de medidas (9 de octubre de 2026)

- Las 97 tarjetas del catálogo de Inicio ya tenían un nombre accesible completo («r de Pearson — Pearson 1896 ·
  Bloque 4»), pero en el marcado el nombre y el autor iban pegados («r de PearsonPearson 1896 · Bloque 4») y el nombre
  accesible no contenía ese texto tal cual (WCAG 2.5.3, la etiqueta en el nombre). Un espacio entre los dos renglones
  de la tarjeta (`js/home.js`) lo arregla; no se dibuja, porque van uno sobre el otro. Las 285 pruebas siguen pasando.

## Íconos propios, ejemplo simulado de metaanálisis y cita (10 de octubre de 2026)

- **Íconos propios.** La barra de navegación y el estudio de figuras llevan ahora los íconos dibujados para la suite;
  sustituyen a un conjunto de íconos de terceros de licencia permisiva, y el archivo de licencias de terceros se retiró
  (queda en `research/historial/`). Del estudio de figuras salieron también los adaptadores para figuras hechas con
  bibliotecas de gráficas de otros, que el programa no usaba. Navegador 1.1.3 y estudio de figuras 1.5.1.
- **El ejemplo de metaanálisis del Bloque 12 es simulado**, y lo dice al cargarse: 16 estudios alrededor de una
  correlación verdadera de .25, con heterogeneidad entre estudios (τ = 0.10 en la escala z) y de 40 a 800 casos cada
  uno; siempre los mismos. Antes eran las cifras de un metaanálisis publicado. Con REML dan r = .261 [.205, .315],
  predicción [.073, .431], I² = 70.8 % y Egger p = .118. El botón dice «Ejemplo simulado: 16 estudios».
- **Gráfico de bosque:** la columna de los nombres nunca es más angosta que la etiqueta del modelo; con nombres de
  estudio cortos, «Aleatorio (REML)» salía cortada por la izquierda.
- **Referencias: 229** (se retiró la del metaanálisis que servía de ejemplo).
- **«Cómo citar»** ya no lleva una dirección en línea que todavía no existe: autor, año, título, versión y tipo de obra.
- Nombres internos más claros, sin cambio en los resultados: `nearestPD`, `ebicLasso` y `dcorUnbiased` (y la ficha del
  catálogo de la matriz definida positiva más cercana). Las comparaciones de los Bloques 1, 5 y 11 se corrieron de
  nuevo: sin desacuerdos.
- `server.ps1` es la versión común de la suite, con los textos en términos generales.
- `PROCEDENCIA.md` (nuevo): qué partes del programa son propias y de dónde salen los métodos, las constantes y los datos
  de ejemplo.
- **Manual:** la sección 12.6 con el ejemplo simulado, el apéndice E (íconos propios), el apéndice F con las 229
  referencias y las 94 capturas retomadas; PDF de 145 hojas. La herramienta de capturas (`manual/herramientas/cdp.js`)
  ahora le pide al navegador sin ventana que se cierre él mismo y comprueba que se cerró: antes podía dejarlo abierto, y
  en una tanda larga se juntaban decenas.
- 285 pruebas, todas pasan; ninguna petición fuera del equipo al abrir y recorrer los trece bloques.

## Los símbolos con subíndice del Bloque 4 (10 de octubre de 2026)

- Cuando el coeficiente principal era el de rangos gaussianos, el de peso doble, el de flexión porcentual o el
  winsorizado, la lectura y la frase «Para el informe» del Bloque 4 mostraban el símbolo tal como se guarda (`r_G`,
  `r_bw`, `r_pb`, `r_w`), sin cursiva ni subíndice. La expresión regular que los convierte (`subs`, en `js/block4.js`)
  llevaba dos caracteres de retroceso (U+0008) donde debía decir `\b`, el límite de palabra, y así no coincidía con
  nada. Con `\b` salen *r*<sub>G</sub>, *r*<sub>bw</sub>, *r*<sub>pb</sub> y *r*<sub>w</sub>, en español y en inglés.
  Ningún resultado se mueve y ese carácter no queda en ningún otro archivo del programa.
- El botón «Copiar» de esa frase toma ahora el texto sin formato, con el símbolo tal como se escribe a renglón seguido
  (`r_pb = .81, IC 95 % [.64, .90], …`). Antes copiaba lo que estaba pintado, y con el subíndice ya en su sitio habría
  dado «rpb».
- Las 285 pruebas siguen pasando.
