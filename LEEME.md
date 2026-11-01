# CorrelationPro

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.23867439.svg)](https://doi.org/10.5281/zenodo.23867439)

**Análisis de correlación de todo tipo, con su teoría** · *English: [README.md](README.md)*

Plataforma en el navegador para el análisis de correlación: coeficientes
clásicos, robustos y no lineales, correlación parcial y entre conjuntos,
correlaciones categóricas, ordinales y latentes, acuerdo y fiabilidad, datos
con estructura (grupos, medidas repetidas, series, espacio, filogenia, ángulos
y composiciones), redes de correlación, comparación de correlaciones,
potencia y metaanálisis, y figuras y tablas listas para publicar. Español e
inglés, tema claro y oscuro, sin instalar nada y sin bibliotecas de terceros.


## Cómo abrirla

En línea: https://luisangelbg.github.io/CorrelationPro/

Doble clic en `index.html`: no necesita servidor, instalación ni internet.
Para abrirla desde otro equipo de la red, ejecuta `Open CorrelationPro.bat`
(arranca `server.ps1`, un servidor local en el puerto 9950).


## Los trece bloques

1. **Inicio** — la idea de correlación en lenguaje llano, catálogo de 98
   medidas con sus fórmulas, doce temas de teoría, seis laboratorios con el
   motor real, las paletas y los estilos de reporte.
2. **Datos** — hojas de cálculo (.xlsx, .xlsm, .ods), CSV, TSV o texto
   pegado, leídos con un lector propio; tipo y papel de cada columna
   (continua, ordinal, nominal, binaria, circular, composicional, fecha,
   coordenada, sujeto); faltantes por pares o por listas; transformaciones
   (z, rangos, normal por rangos, Box–Cox); nueve conjuntos de dominio público
   y el asistente «¿qué correlación uso?».
3. **Exploración y supuestos** — matriz de dispersión, normalidad de
   Shapiro–Wilk, Anderson–Darling, Mardia y Henze–Zirkler, LOWESS, linealidad
   frente a monotonía, Breusch–Pagan, atípicos bivariados robustos (OGK), la
   influencia de cada dato y el coeficiente recomendado para cada par.
4. **Un par a fondo** — todos los coeficientes que aplican a dos variables,
   lado a lado, con prueba exacta, asintótica o por permutación, intervalos
   analíticos (Fisher, Fieller, Bonett–Wright) y bootstrap (normal, básico,
   percentil, BCa), el factor de Bayes con su posterior y la lectura en
   palabras.
5. **Matriz de correlación** — once medidas para todas las variables, seis
   correcciones por pruebas múltiples, diagnóstico espectral, matriz definida
   positiva más cercana, contracción, KMO y Bartlett, cuatro órdenes, nueve
   glifos animados y un lienzo con lente hasta mil variables.
6. **Dependencia no lineal y cópulas** — dCor, HSIC, MIC, ξ, τ*, D de
   Hoeffding, información mutua y correlación máxima; el rastreo de toda la
   matriz buscando lo que Pearson no ve; cinco familias de cópulas y la
   dependencia en las colas.
7. **Parcial, múltiple y entre conjuntos** — parcial y semiparcial (Pearson,
   Spearman, Kendall), dCor parcial, *R* múltiple con su reparto, correlación
   canónica con cuatro pruebas, RV, Procrustes, coinercia y Mantel.
8. **Categóricas, ordinales y mixtas** — χ², G², prueba exacta de Fisher, φ,
   V de Cramér, C, T de Tschuprow, λ, τ y U, Q y Y de Yule, razón de momios,
   tetracórica, policórica, poliserial, biserial y rango-biserial, η y la
   matriz heterogénea con el coeficiente adecuado a cada par.
9. **Acuerdo y fiabilidad** — CCC de Lin, Bland–Altman, las seis formas del
   ICC, κ de Cohen, ponderada, de Fleiss y de Conger, W de Kendall, α de
   Krippendorff y AC1/AC2 de Gwet: por qué una *r* alta no es acuerdo.
10. **Datos con estructura y datos especiales** — correlación dentro y entre
    grupos y paradoja de Simpson, medidas repetidas, series de tiempo con
    preblanqueo, datos espaciales con la *t* de Dutilleul, contrastes
    filogenéticos, datos circulares y composicionales.
11. **Redes de correlación** — redes marginales, parciales y regularizadas
    (lazo gráfico con EBIC); umbrales, centralidades y comunidades (Louvain);
    vistas de fuerzas, círculo, cuerdas agrupadas, arcos y matriz.
12. **Comparar, corregir, planear y combinar** — correlaciones independientes
    y dependientes con quince pruebas e intervalos de Zou, dos matrices,
    corrección por atenuación y restricción de rango, potencia y tamaño de
    muestra, factor de Bayes de una *r* publicada y metaanálisis de
    correlaciones (efecto fijo, DerSimonian–Laird, REML, Hunter–Schmidt) con
    bosque, embudo, intervalo de predicción y prueba de Egger.
13. **Figuras, paletas e informe** — galería de todas las figuras con
    exportación a anchos de revista (PNG, SVG, PDF vectorial, TIFF),
    diseñador de paletas divergentes en OKLab con pruebas de daltonismo, gris
    y contraste, tabla de correlaciones lista para el procesador de textos,
    métodos redactados a partir de lo que se corrió con sus referencias,
    informe imprimible y paquete del proyecto (JSON).

## Manual

`manual/CorrelationPro_Manual_de_usuario_ES.pdf` — manual de usuario en
español (145 hojas tamaño carta): introducción, un capítulo por bloque y
apéndices (archivos, reglas de lectura, glosario, fallos comunes, licencia y
las 229 referencias). Las partes en HTML están en `manual/es/` y
`manual/LEEME.md` explica cómo se arman.

## Validación

`tests/index.html` ejecuta 285 pruebas contra valores publicados, aritmética
exacta, fórmulas resueltas a mano y simulaciones. Ábrela con doble clic: todo
debe salir en verde.

Cada motor de los Bloques 1 a 12 se comparó, número por número, con
implementaciones independientes de los mismos métodos en R 4.4.2:
**19 334 comparaciones, 0 en desacuerdo**, además de simulaciones de
cobertura de los intervalos (el Bloque 13 no calcula estadística nueva). Los
guiones de comparación y sus referencias se quedan en el equipo del autor y no
forman parte del programa que se distribuye; `CHANGELOG.md` da la cifra de
cada bloque y los errores que la validación atrapó.

## Datos

El programa no contiene código, íconos, tipografías ni imágenes de nadie más
y no pide nada a internet. Los ejemplos son nueve conjuntos de dominio público
(cada uno dice su fuente y por qué es de dominio público) y varios conjuntos
simulados que se anuncian como tales en la pantalla. Ver `PROCEDENCIA.md`.

## Cómo citar

Barrera-Guzmán, L. Á. (2026). *CorrelationPro: análisis de correlación de
todo tipo en el navegador* (versión 1.0.0) [Programa de cómputo]. Zenodo.
https://doi.org/10.5281/zenodo.23867439

Este DOI de concepto lleva siempre a la versión más reciente; cada versión
tiene además el suyo en Zenodo (la 1.0.0: 10.5281/zenodo.23867440). Código:
https://github.com/luisangelbg/CorrelationPro

La sección **Cómo citar** de la portada de la app da la cita lista para
copiar, también como entrada BibTeX; `CITATION.cff` tiene los mismos datos
para los gestores de referencias.

## Licencia

GNU General Public License, versión 3 o posterior (`LICENSE`).

## Cómo contribuir

Los errores y las propuestas se reciben en
https://github.com/luisangelbg/CorrelationPro/issues (el botón «Reportar un
problema» de la app abre uno con el bloque y el navegador ya anotados).
