# Procedencia de CorrelationPro

Este documento dice, elemento por elemento, qué partes de CorrelationPro son obra
propia y de dónde salen las ideas, las constantes y los datos que no lo son. Se
escribió para acompañar el registro de la obra ante el INDAUTOR y para que
cualquiera pueda comprobar lo que aquí se afirma.

Última revisión: 10 de octubre de 2026 (versión 1.0.0).

---

## 1. En una frase

CorrelationPro no contiene código, íconos, tipografías ni imágenes de nadie más.
Implementa métodos estadísticos publicados en revistas y libros, citados a su
publicación original en la portada de la app o, los puramente numéricos, en el
propio código; la escritura de cada uno en JavaScript es propia. Sus ejemplos son nueve conjuntos
de datos de dominio público y varios conjuntos simulados que se anuncian como
tales (sección 5).

**Para el formulario del INDAUTOR: marcar solo «Es primigenia».** El programa
no adapta, traduce ni compila otra obra.

---

## 2. Lo que el programa no tiene

- **Ninguna biblioteca de terceros.** Ni de estadística, ni de álgebra, ni de
  gráficas, ni de lectura de archivos. Las distribuciones de probabilidad
  (`js/num.js`), los coeficientes (`js/coef.js`), los supuestos
  (`js/assume.js`), el remuestreo y el factor de Bayes (`js/pairstat.js`), las
  matrices (`js/matrix.js`), la dependencia no lineal y las cópulas
  (`js/nonlin.js`), las correlaciones parciales y entre conjuntos
  (`js/partial.js`), las tablas de contingencia y las correlaciones latentes
  (`js/categ.js`), el acuerdo (`js/agree.js`), los datos con estructura
  (`js/struct.js`), las redes (`js/network.js`) y la comparación, la potencia y
  el metaanálisis (`js/infer.js`) están escritos para este programa. Las figuras
  son SVG dibujado por `js/plot.js`, `js/glyphs.js`, `js/art.js` y cada bloque.
- **Ningún lector de archivos ajeno.** El texto delimitado se lee según la
  convención pública RFC 4180, y los libros de hoja de cálculo (`.xlsx`,
  `.xlsm`, `.ods`) con un lector propio (`js/dataio.js`): el contenedor ZIP y su
  descompresión DEFLATE están escritos desde su especificación pública
  (RFC 1951), y el XML se recorre sin biblioteca. Ese lector comparte diseño
  con el de otro programa del mismo autor.
- **Nada que se cargue de la red.** Todos los archivos que usa la página están
  en su carpeta; el ícono de la pestaña es un dibujo incrustado. Por eso abre
  con doble clic, sin servidor y sin conexión. Comprobado el 10 de octubre de
  2026 al abrir la app, recorrer los trece bloques y abrir el estudio de
  figuras: 49 peticiones, todas a archivos de la propia carpeta; ninguna fuera
  del equipo. Los únicos enlaces hacia fuera son el del portal de la suite del
  autor y el botón para reportar un problema, que solo se siguen si la persona
  hace clic en ellos.
- **Ninguna tipografía incluida.** La interfaz y las figuras usan las letras
  instaladas en el equipo. El editor de figuras ofrece familias genéricas y,
  por su nombre, las que las revistas piden así; son referencias a las letras
  del sistema, no archivos que el programa traiga.
- **Ningún adaptador para programas o bibliotecas de otros.** La copia del
  estudio de figuras que lleva CorrelationPro no trae la parte que, en otras
  apps de la suite, abre gráficas hechas con bibliotecas ajenas: todas sus
  figuras las dibuja el propio programa.
- **Ningún código minificado, empaquetado ni pegado.** Ni carpeta `vendor/`, ni
  `node_modules/`, ni paso de compilación. `index.html` se arma con un guion
  propio (`data/armar_index.js`) a partir de las partes de `data/`.
- **Ninguna imagen incluida.** Las ilustraciones de la portada, los nueve
  glifos y las figuras de los laboratorios son dibujos vectoriales escritos en
  el código (`js/art.js`, `js/glyphs.js`, `js/labs.js`).

## 3. Los íconos

Los íconos de línea del navegador de bloques y del estudio de figuras
(`js/labg-navigator.js`, `js/labg-figure-studio.js`) se dibujaron para la suite
LABG sobre una cuadrícula de 24 × 24 con trazo de 1.5, como trazos SVG escritos
en el propio código. Sustituyen, desde el 10 de octubre de 2026, a un conjunto
de íconos de terceros de licencia permisiva que esos módulos usaban antes; con
el cambio, el archivo de licencias de terceros dejó de ser necesario y se
retiró.

## 4. Los métodos publicados

Un método no es objeto de derecho de autor (LFDA, art. 14, fr. I); lo que se
registra es su expresión, el código. Los que el programa implementa, con su
fuente:

| Qué | Dónde | Publicación |
|---|---|---|
| Correlación lineal, de rangos y de concordancia | `coef.js` | Pearson 1896; Spearman 1904; Kendall 1938, 1945; Goodman y Kruskal 1954; Somers 1962; Blomqvist 1950 |
| Conteo rápido de pares concordantes | `coef.js` | Knight 1966 |
| Correlaciones robustas | `coef.js` | Mosteller y Tukey 1977; Wilcox 1994; Boudt, Cornelissen y Croux 2012 |
| Medidas de dependencia | `coef.js`, `nonlin.js` | Hoeffding 1948; Székely, Rizzo y Bakirov 2007; Bergsma y Dassios 2014; Chatterjee 2021; Gretton et al. 2005; Reshef et al. 2011; Kraskov, Stögbauer y Grassberger 2004; Gebelein 1941; Rényi 1959 |
| Intervalos de confianza | `coef.js` | Fisher 1921; Fieller, Hartley y Pearson 1957; Bonett y Wright 2000 |
| Distribuciones exactas de τ y ρ | `num.js` | Kendall 1938; Best y Roberts 1975 |
| Normalidad univariada y multivariada | `assume.js` | Shapiro y Wilk 1965; Royston 1992, 1995; Anderson y Darling 1952; D’Agostino y Stephens 1986; Mardia 1970; Henze y Zirkler 1990 |
| Suavizado, dispersión, atípicos robustos | `assume.js` | Cleveland 1979; Breusch y Pagan 1979; Koenker 1981; Gnanadesikan y Kettenring 1972; Maronna y Zamar 2002 |
| Bootstrap, permutación y factor de Bayes | `pairstat.js` | Efron 1979, 1987; Davison y Hinkley 1997; Pitman 1937; Jeffreys 1961; Ly, Verhagen y Wagenmakers 2016 |
| Pruebas múltiples | `matrix.js` | Holm 1979; Hochberg 1988; Hommel 1988; Benjamini y Hochberg 1995; Benjamini y Yekutieli 2001 |
| Matriz válida, contracción, KMO y esfericidad | `matrix.js` | Higham 2002; Schäfer y Strimmer 2005; Kaiser 1970; Kaiser y Rice 1974; Bartlett 1950 |
| Glifos y orden de la matriz | `glyphs.js`, `matrix.js` | Murdoch y Chow 1996; Friendly 2002 |
| Cópulas y dependencia en las colas | `nonlin.js` | Sklar 1959; Genest, Ghoudi y Rivest 1995; Joe 1997 |
| Parcial, múltiple y canónica | `partial.js` | Hotelling 1936; Székely y Rizzo 2014 |
| Entre conjuntos | `partial.js` | Escoufier 1973; Gower 1975; Peres-Neto y Jackson 2001; Mantel 1967; Dolédec y Chessel 1994 |
| Tablas de contingencia | `categ.js` | Pearson 1900; Cramér 1946; Bergsma 2013; Goodman y Kruskal 1954; Theil 1970; Yule 1900, 1912; la prueba exacta de Fisher y el intervalo de Woolf para la razón de momios |
| Correlaciones latentes | `categ.js` | Olsson 1979; Olsson, Drasgow y Dorans 1982; la normal bivariada por el método de Genz (2004) |
| Acuerdo y fiabilidad | `agree.js` | Lin 1989; Bland y Altman 1986; Shrout y Fleiss 1979; McGraw y Wong 1996; Cohen 1960, 1968; Fleiss 1971; Conger 1980; Gwet 2008; Krippendorff 2004; Kendall y Babington Smith 1939 |
| Grupos y medidas repetidas | `struct.js` | Simpson 1951; Robinson 1950; Bakdash y Marusich 2017 |
| Series, espacio y filogenia | `struct.js` | Box y Jenkins 1976; Clifford, Richardson y Hémon 1989; Dutilleul 1993; Felsenstein 1985; Garland, Harvey e Ives 1992 |
| Ángulos y composiciones | `struct.js` | Jammalamadaka y SenGupta 1988; Mardia 1976; Aitchison 1986; Lovell et al. 2015; Erb y Notredame 2016 |
| Redes | `network.js` | Friedman, Hastie y Tibshirani 2008; Foygel y Drton 2010; Opsahl, Agneessens y Skvoretz 2010; Brandes 2001; Newman 2006; Blondel et al. 2008; Fruchterman y Reingold 1991 |
| Comparar correlaciones y matrices | `infer.js` | Fisher 1925; Pearson y Filon 1898; Hotelling 1940; Williams 1959; Olkin 1967; Dunn y Clark 1969; Hendrickson, Stanley y Hills 1970; Steiger 1980; Meng, Rosenthal y Rubin 1992; Raghunathan, Rosenthal y Rubin 1996; Hittner, May y Silver 2003; Silver, Hittner y May 2004; Zou 2007; Jennrich 1970 |
| Atenuación, rango, potencia y metaanálisis | `infer.js` | Spearman 1904; Thorndike 1949; Fisher 1915; Hotelling 1953; DerSimonian y Laird 1986; Viechtbauer 2005; Hunter y Schmidt 2004; Higgins y Thompson 2002; Egger et al. 1997 |
| Color y simulación de daltonismo | `palettes.js` | Ottosson 2020; Machado, Oliveira y Fernandes 2009 |
| Estilos de los números | `fmt.js` | el manual de publicación de las ciencias sociales (7.ª ed.); Lang y Altman 2013; NOM-008-SE-2021 |

Lo que el programa toma de esas publicaciones, además del método, son
**constantes numéricas**: los coeficientes de las aproximaciones racionales de
la distribución normal (Cody 1969; Wichura 1988), los de la función gamma
(Lanczos), los polinomios de la prueba de Shapiro–Wilk (Royston 1992, 1995),
las fórmulas del valor *p* de Anderson–Darling (D’Agostino y Stephens 1986), la
serie de Edgeworth de la ρ de Spearman (Best y Roberts 1975), los nodos y
pesos de las cuadraturas de Gauss–Kronrod y de Gauss–Legendre, las matrices
del espacio de color y de la simulación de daltonismo (Ottosson 2020; Machado,
Oliveira y Fernandes 2009), y las listas de colores de las paletas ajenas que
se ofrecen citadas por su nombre (la de Okabe e Ito 2008 en `palettes.js`, y
las de Tol y dos escalas ordenadas en el estudio de figuras). Son parámetros
de métodos publicados, no la expresión creativa de nadie. Las demás paletas
—doce divergentes, siete secuenciales y las categóricas— son originales y se
diseñan en `palettes.js`.

Los métodos numéricos generales (eliminación, descomposiciones de Jacobi y de
Householder, sección áurea, fracciones continuas, el generador de números
aleatorios con semilla) son los clásicos, de dominio público, escritos aquí.

La referencia completa de cada publicación está en la portada de la app
(Bloque 1, «Referencias», 229 obras) y en los métodos que redacta el
Bloque 13, que citan solo lo que se usó.

## 5. Los datos de ejemplo

**De dominio público** (`js/datasets.js`, que escribe `data/generar_datos.R`):
nueve conjuntos de mediciones publicadas hace mucho o por gobiernos. Son
datos, no código, y **no van en el ejemplar**. Cada uno lleva en la app su
fuente y la razón por la que es de dominio público.

| Conjunto | Origen |
|---|---|
| Lirios (150 flores) | Anderson 1935; Fisher 1936 |
| Guisantes de olor (700 semillas) | Galton 1877 |
| Estaturas de padres e hijos (928) | Galton 1886 |
| Maíz de polinización cruzada y propia (15 pares) | Darwin 1876 |
| Distritos de Suiza (47) | censo suizo de 1888 |
| Economía de Estados Unidos, 1947–1962 | series del gobierno de ese país (Longley 1967) |
| Titanic (2 201 personas) | informe oficial británico de 1912 |
| Frenado de autos (50) | Ezekiel 1930 |
| Sueño con dos fármacos (10 pacientes) | Cushny y Peebles 1905 |

**Simulados**, generados por el propio programa con semilla fija y anunciados
como tales en la pantalla: las 300 variables en seis módulos (`block5.js`), los
instrumentos y evaluadores (`block9.js`), las medidas repetidas, las parcelas,
las especies con su árbol, el viento y la textura del suelo (`block10.js`), los
16 estudios del metaanálisis (`block12.js`) y las nubes de los laboratorios
(`labs.js`). No reproducen ninguna observación real.

## 6. Cómo se comprobó

Cada motor se verificó contra implementaciones independientes de los mismos
métodos (paquetes de un entorno estadístico libre): 19 334 comparaciones sin
desacuerdos en los Bloques 1 a 12, además de simulaciones de cobertura. Los
guiones y sus resultados están en `validation/` (en el equipo del autor; no se
distribuyen), y las pruebas automáticas del programa (285, todas pasan) en
`tests/`. Ninguna de esas dos carpetas forma parte de la obra: sirven para
comprobarla.

## 7. Qué forma parte de la obra registrada

**Sí:** `index.html`, las hojas de estilo de `css/`, el código de `js/`
(salvo `js/datasets.js`), `server.ps1` y `Open CorrelationPro.bat`.

**No:** `js/datasets.js` (datos de dominio público), `data/` (las partes de la
página, que ya van armadas en `index.html`, y el guion que escribe los datos),
`research/` (notas de trabajo), `validation/`, `tests/`, `manual/` (obra
literaria aparte), `LICENSE`, `CHANGELOG.md` y este documento.

## 8. Autoría, titularidad y licencia

Autor y titular único: **Luis Ángel Barrera-Guzmán**. El código no lleva
mención de ninguna institución. Se distribuye como software libre bajo la
Licencia Pública General de GNU, versión 3 o posterior (`LICENSE`), que es una
licencia de uso otorgada por el titular: no impide el registro ni cede los
derechos patrimoniales. El nombre «CorrelationPro» no se protege con el
registro de la obra; un nombre se protege como marca ante el IMPI.
