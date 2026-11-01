# CorrelationPro — escribe js/datasets.js con los conjuntos de dominio público que trae la app.
# Copyright (C) 2026 Luis Ángel Barrera-Guzmán. GPL-3.0-or-later.
#
# Sólo datos cuyo origen es de dominio público: publicaciones anteriores a 1931 (en dominio público
# por antigüedad) o mediciones de gobiernos. Cada conjunto lleva su fuente, sus variables con unidad,
# tipo y papel, y la nota de por qué es de dominio público.
#   iris      Anderson (1935); Fisher (1936)                         150 flores
#   peas      Galton (1877), guisantes de olor                         700 semillas
#   galton    Galton (1886), estaturas de padres e hijos               928 hijos
#   maize     Darwin (1876), maíz de polinización cruzada y propia     15 pares
#   swiss     Censo suizo de 1888, 47 distritos francófonos            47 distritos
#   longley   Series del gobierno de EE. UU. 1947–1962 (Longley 1967)   16 años
#   titanic   Informe británico de 1912 (Dawson 1995)                  2201 personas
#   cars      Ezekiel (1930), velocidad y distancia de frenado         50 autos
#   sleep     Cushny y Peebles (1905); Student (1908)                  10 pacientes
# Correr desde esta carpeta:  Rscript generar_datos.R
suppressMessages({ library(jsonlite); library(HistData); library(psychTools) })
num <- function(v) unname(as.numeric(v))
# levels_es: the names of the categories in Spanish, in the same order (the app uses them when it opens in Spanish)
V <- function(key, es, en, v, unit = NULL, type = "continuous", role = "var", levels = NULL, levels_es = NULL) {
  o <- list(key = key, es = es, en = en, type = type, role = role)
  if (!is.null(unit)) o$unit <- unit
  if (!is.null(levels)) { o$levels <- levels; o$v <- as.integer(factor(v, levels = levels)) - 1L } else o$v <- num(v)
  if (!is.null(levels_es)) o$levels_es <- levels_es
  o
}
D <- function(id, es, en, desc_es, desc_en, vars, refs, pd_es, pd_en, tags) list(
  id = id, es = es, en = en, n = length(vars[[1]]$v), desc = list(es = desc_es, en = desc_en), vars = vars, refs = I(refs),
  license = list(es = pd_es, en = pd_en), tags = I(tags))

sets <- list()
sp <- c("setosa", "versicolor", "virginica")
sets$iris <- D("iris", "Lirios de Anderson (iris)", "Anderson's irises (iris)",
  "Medidas de 50 flores de cada una de tres especies de Iris, tomadas por E. Anderson en la península de Gaspé (Quebec) y publicadas por R. A. Fisher. Cuatro medidas continuas y la especie: sirve para la matriz de correlación, las correlaciones dentro y entre especies y la paradoja de Simpson.",
  "Measurements of 50 flowers of each of three Iris species, taken by E. Anderson on the Gaspé Peninsula (Quebec) and published by R. A. Fisher. Four continuous measurements and the species: useful for the correlation matrix, within- and between-species correlations and Simpson's paradox.",
  list(V("sepal_length", "Largo del sépalo", "Sepal length", iris$Sepal.Length, "cm"),
       V("sepal_width", "Ancho del sépalo", "Sepal width", iris$Sepal.Width, "cm"),
       V("petal_length", "Largo del pétalo", "Petal length", iris$Petal.Length, "cm"),
       V("petal_width", "Ancho del pétalo", "Petal width", iris$Petal.Width, "cm"),
       V("species", "Especie", "Species", as.character(iris$Species), type = "nominal", role = "group", levels = sp)),
  c("anderson1935", "fisher1936"), "Dominio público: datos publicados en 1935 y 1936.", "Public domain: data published in 1935 and 1936.",
  c("botánica", "botany"))
sets$peas <- D("peas", "Guisantes de Galton (1877)", "Galton's sweet peas (1877)",
  "Diámetro de semillas de guisante de olor (Lathyrus odoratus): siete tamaños de semilla madre, con 100 semillas hijas cada uno, en centésimas de pulgada. El primer estudio de la herencia por regresión: los hijos de semillas grandes son grandes, pero menos que sus madres. Muchos empates: buen ejemplo para los convenios de Spearman, Kendall y ξ.",
  "Diameter of sweet pea seeds (Lathyrus odoratus): seven sizes of mother seed, with 100 daughter seeds each, in hundredths of an inch. The first study of heredity by regression: daughters of large seeds are large, but less so than their mothers. Many ties: a good example for the conventions of Spearman, Kendall and ξ.",
  list(V("parent", "Diámetro de la semilla madre", "Diameter of the mother seed", peas$parent, "0.01 in"),
       V("child", "Diámetro de la semilla hija", "Diameter of the daughter seed", peas$child, "0.01 in")),
  c("galton1877"), "Dominio público: datos publicados en 1877.", "Public domain: data published in 1877.", c("botánica", "botany"))
sets$galton <- D("galton", "Estaturas de Galton (1886)", "Galton's heights (1886)",
  "Estatura de 928 hijos adultos y la estatura media de sus padres (las de las mujeres multiplicadas por 1.08), en pulgadas, agrupadas en clases de una pulgada. Es la tabla con la que Galton describió la regresión a la media.",
  "Height of 928 adult children and the mean height of their parents (women's multiplied by 1.08), in inches, grouped in one-inch classes. It is the table with which Galton described regression to the mean.",
  list(V("parent", "Estatura media de los padres", "Mid-parent height", Galton$parent, "in"),
       V("child", "Estatura del hijo", "Child height", Galton$child, "in")),
  c("galton1886"), "Dominio público: datos publicados en 1886.", "Public domain: data published in 1886.", c("historia", "history"))
zm <- ZeaMays
sets$maize <- D("maize", "Maíz de Darwin (1876)", "Darwin's maize (1876)",
  "Altura de 15 pares de plantas de maíz (Zea mays), una de polinización cruzada y otra de autopolinización, crecidas en la misma maceta, en pulgadas. Datos pareados: la correlación entre las dos plantas de cada par refleja la maceta que comparten.",
  "Height of 15 pairs of maize plants (Zea mays), one cross-pollinated and one self-pollinated, grown in the same pot, in inches. Paired data: the correlation between the two plants of each pair reflects the pot they share.",
  list(V("pair", "Par", "Pair", zm$pair, type = "id", role = "exclude"),
       V("pot", "Maceta", "Pot", as.character(zm$pot), type = "nominal", role = "group", levels = c("1", "2", "3", "4")),
       V("cross", "Altura con polinización cruzada", "Height, cross-pollinated", zm$cross, "in"),
       V("self", "Altura con autopolinización", "Height, self-pollinated", zm$self, "in")),
  c("darwin1876"), "Dominio público: datos publicados en 1876.", "Public domain: data published in 1876.", c("botánica", "botany"))
sw <- swiss
sets$swiss <- D("swiss", "Suiza, 1888", "Switzerland, 1888",
  "Indicadores de 47 distritos francófonos de Suiza hacia 1888: fecundidad, porcentaje de hombres en la agricultura, porcentaje de reclutas con la mejor nota en el examen del ejército, porcentaje con más de primaria, porcentaje de católicos y mortalidad infantil. Seis variables con relaciones de todos los signos y una con dos modas (católicos).",
  "Indicators of 47 French-speaking districts of Switzerland around 1888: fertility, percentage of men in agriculture, percentage of draftees with the best mark in the army examination, percentage with more than primary schooling, percentage of Catholics and infant mortality. Six variables with relations of every sign and one with two modes (Catholics).",
  list(V("district", "Distrito", "District", seq_len(nrow(sw)), type = "id", role = "exclude"),
       V("fertility", "Fecundidad", "Fertility", sw$Fertility, "índice"),
       V("agriculture", "Agricultura", "Agriculture", sw$Agriculture, "%"),
       V("examination", "Examen", "Examination", sw$Examination, "%"),
       V("education", "Educación", "Education", sw$Education, "%"),
       V("catholic", "Católicos", "Catholic", sw$Catholic, "%"),
       V("infant_mortality", "Mortalidad infantil", "Infant mortality", sw$Infant.Mortality, "‰")),
  c("mosteller1977"), "Dominio público: estadísticas oficiales suizas de 1888.", "Public domain: official Swiss statistics of 1888.", c("sociedad", "society"))
lg <- longley
sets$longley <- D("longley", "Economía de EE. UU., 1947–1962", "US economy, 1947–1962",
  "Siete series anuales de la economía de los Estados Unidos (deflactor del producto, producto nacional, desempleados, fuerzas armadas, población de 14 años o más, año y empleados). Variables casi colineales y con tendencia: el ejemplo clásico de correlaciones altísimas que vienen del tiempo, no de una relación directa.",
  "Seven annual series of the United States economy (GNP deflator, GNP, unemployed, armed forces, population aged 14 and over, year and employed). Nearly collinear trending variables: the classic example of very high correlations that come from time, not from a direct relation.",
  list(V("year", "Año", "Year", lg$Year, type = "continuous", role = "time"),
       V("gnp_deflator", "Deflactor del producto", "GNP deflator", lg$GNP.deflator, "1954 = 100"),
       V("gnp", "Producto nacional", "GNP", lg$GNP, "mil millones de dólares"),
       V("unemployed", "Desempleados", "Unemployed", lg$Unemployed, "miles"),
       V("armed_forces", "Fuerzas armadas", "Armed forces", lg$Armed.Forces, "miles"),
       V("population", "Población (≥ 14 años)", "Population (≥ 14 years)", lg$Population, "miles"),
       V("employed", "Empleados", "Employed", lg$Employed, "miles")),
  c("longley1967"), "Dominio público: series del gobierno federal de los Estados Unidos.", "Public domain: series of the United States federal government.", c("tiempo", "time"))
tt <- as.data.frame(Titanic)
tt <- tt[rep(seq_len(nrow(tt)), tt$Freq), 1:4]
sets$titanic <- D("titanic", "Titanic, 1912", "Titanic, 1912",
  "Las 2 201 personas a bordo del Titanic: clase (primera, segunda, tercera o tripulación), sexo, edad (niño o adulto) y si sobrevivieron. Cuatro variables categóricas: para las tablas de contingencia, la V de Cramér, la razón de momios y la tetracórica.",
  "The 2,201 people aboard the Titanic: class (first, second, third or crew), sex, age (child or adult) and whether they survived. Four categorical variables: for contingency tables, Cramér's V, the odds ratio and the tetrachoric correlation.",
  list(V("class", "Clase", "Class", as.character(tt$Class), type = "nominal", levels = c("1st", "2nd", "3rd", "Crew"), levels_es = c("1.ª", "2.ª", "3.ª", "Tripulación")),
       V("sex", "Sexo", "Sex", as.character(tt$Sex), type = "binary", levels = c("Male", "Female"), levels_es = c("Hombre", "Mujer")),
       V("age", "Edad", "Age", as.character(tt$Age), type = "binary", levels = c("Child", "Adult"), levels_es = c("Niño", "Adulto")),
       V("survived", "Sobrevivió", "Survived", as.character(tt$Survived), type = "binary", levels = c("No", "Yes"), levels_es = c("No", "Sí"))),
  c("boardoftrade1912", "dawson1995"), "Dominio público: informe oficial británico de 1912.", "Public domain: British official report of 1912.", c("categóricas", "categorical"))
sets$cars <- D("cars", "Frenado de autos (Ezekiel 1930)", "Car braking (Ezekiel 1930)",
  "Velocidad (millas por hora) y distancia de frenado (pies) de 50 autos de la década de 1920. Del libro Methods of Correlation Analysis de M. Ezekiel. La distancia crece más que en línea recta con la velocidad (la energía va con el cuadrado).",
  "Speed (miles per hour) and braking distance (feet) of 50 cars of the 1920s. From the book Methods of Correlation Analysis by M. Ezekiel. Distance grows faster than a straight line with speed (energy goes with the square).",
  list(V("speed", "Velocidad", "Speed", cars$speed, "mph"), V("dist", "Distancia de frenado", "Braking distance", cars$dist, "ft")),
  c("ezekiel1930"), "Dominio público: publicado en 1930 (en los Estados Unidos, dominio público desde 2026).", "Public domain: published in 1930 (in the United States, public domain since 2026).", c("no lineal", "nonlinear"))
sl <- sleep
sets$sleep <- D("sleep", "Sueño con dos fármacos (1905)", "Sleep with two drugs (1905)",
  "Horas de sueño ganadas por 10 pacientes con dos isómeros de la hioscina, cada paciente con los dos. Los datos con los que Student presentó la prueba t en 1908. Datos pareados: los dos efectos de un mismo paciente están correlacionados.",
  "Extra hours of sleep gained by 10 patients with two isomers of hyoscine, every patient with both. The data with which Student presented the t test in 1908. Paired data: the two effects in the same patient are correlated.",
  list(V("patient", "Paciente", "Patient", 1:10, type = "id", role = "exclude"),
       V("drug1", "Sueño ganado con el fármaco 1", "Sleep gained with drug 1", sl$extra[sl$group == 1], "h"),
       V("drug2", "Sueño ganado con el fármaco 2", "Sleep gained with drug 2", sl$extra[sl$group == 2], "h")),
  c("cushny1905", "student1908"), "Dominio público: datos publicados en 1905.", "Public domain: data published in 1905.", c("pareados", "paired"))

txt <- paste0(
  "/* CorrelationPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán. GPL-3.0-or-later; see LICENSE.\n",
  "   Datasets of the public domain that ship with the app. Written by data/generar_datos.R; do not edit by hand. */\n",
  "window.Datasets = window.Datasets || {};\n",
  "Datasets.list = ", toJSON(unname(sets), auto_unbox = TRUE, digits = NA), ";\n",
  "Datasets.list.forEach(function (d) { Datasets[d.id] = d; });\n")
writeLines(txt, "../js/datasets.js", useBytes = TRUE)
cat("js/datasets.js:", nchar(txt), "caracteres;", length(sets), "conjuntos\n")
