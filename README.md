# CorrelationPro

<!-- DOI: when the Zenodo record exists, put its badge here:
[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.XXXXXXXX.svg)](https://doi.org/10.5281/zenodo.XXXXXXXX) -->

**Correlation analysis of every kind, with its theory** · *Español: [LEEME.md](LEEME.md)*

A browser-based platform for correlation analysis: classical, robust and
nonlinear coefficients, partial and between-set correlation, categorical,
ordinal and latent correlations, agreement and reliability, data with
structure (groups, repeated measures, time series, space, phylogeny, angles
and compositions), correlation networks, comparison of correlations, power
and meta-analysis, and figures and tables ready to publish. The interface is
in Spanish and English, with light and dark themes. There is nothing to
install and no third-party library: every statistical engine, the
spreadsheet reader, the figures and the palettes are the author's own code.

## Statement of need

"Correlation" is not one method but a family of more than ninety, and the
right one depends on the kind of variables, on their distribution, on how the
observations are grouped and on the question. In practice the choice is often
reduced to Pearson's *r* because the alternatives are scattered over many
packages and scripts. CorrelationPro puts the whole family in one page that
opens with a double click: it checks the assumptions, recommends a coefficient
for each pair and says why, computes it with its test and its interval,
explains in plain words what the number means, and writes the methods
section from what was actually run. The data never leave the computer.

## Open it

- **On line:** https://luisangelbg.github.io/CorrelationPro/
- **On your computer:** download the repository and double-click
  `index.html`. No server, no installation, no build step and no internet
  connection. Any current browser works.

To open it from another device on the same network, run
`Open CorrelationPro.bat` (Windows; it starts `server.ps1`, a minimal local
server on port 9950).

## The thirteen blocks

1. **Home** — the idea of correlation in plain words, a catalogue of 98
   measures with their formulas, twelve theory topics, six labs that run the
   real engine, the palettes and the reporting styles.
2. **Data** — spreadsheets (.xlsx, .xlsm, .ods), CSV, TSV or pasted text,
   read with the program's own reader; the kind and role of each column
   (continuous, ordinal, nominal, binary, circular, compositional, date,
   coordinate, subject); missing values pairwise or listwise;
   transformations (z, ranks, rank-based normal scores, Box–Cox); nine
   public-domain datasets and the «which correlation?» assistant.
3. **Exploration and assumptions** — scatterplot matrix, Shapiro–Wilk,
   Anderson–Darling, Mardia and Henze–Zirkler normality, LOWESS, linearity
   versus monotonicity, Breusch–Pagan, robust bivariate outliers (OGK), the
   influence of each point and the recommended coefficient for each pair.
4. **One pair in depth** — every coefficient that applies to two variables,
   side by side, with exact, asymptotic or permutation tests, analytic
   intervals (Fisher, Fieller, Bonett–Wright) and bootstrap intervals (normal,
   basic, percentile, BCa), the Bayes factor with its posterior, and the
   reading in words.
5. **Correlation matrix** — eleven measures for every variable, six
   multiple-testing corrections, spectral diagnosis, nearest positive-definite
   matrix, shrinkage, KMO and Bartlett, four orderings, nine animated glyphs
   and a canvas with a lens for up to a thousand variables.
6. **Nonlinear dependence and copulas** — dCor, HSIC, MIC, ξ, τ*, Hoeffding's
   D, mutual information and maximal correlation; a sweep of the whole matrix
   for what Pearson misses; five copula families and tail dependence.
7. **Partial, multiple and between sets** — partial and semipartial
   correlation (Pearson, Spearman, Kendall), partial dCor, multiple *R* with
   its decomposition, canonical correlation with four tests, RV, Procrustes,
   co-inertia and Mantel.
8. **Categorical, ordinal and mixed** — χ², G², Fisher's exact test, φ,
   Cramér's V, C, Tschuprow's T, λ, τ and U, Yule's Q and Y, odds ratio,
   tetrachoric, polychoric, polyserial, biserial and rank-biserial
   correlations, η, and the heterogeneous matrix with the right coefficient
   for each pair.
9. **Agreement and reliability** — Lin's CCC, Bland–Altman, the six forms of
   the ICC, Cohen's, weighted, Fleiss' and Conger's κ, Kendall's W,
   Krippendorff's α and Gwet's AC1/AC2: why a high *r* is not agreement.
10. **Structured and special data** — correlation within and between groups
    and Simpson's paradox, repeated measures, time series with prewhitening,
    spatial data with Dutilleul's corrected *t*, phylogenetic independent
    contrasts, circular and compositional data.
11. **Correlation networks** — marginal, partial and regularized (graphical
    lasso with EBIC) networks; thresholds, centralities and communities
    (Louvain); force, circle, bundled-chord, arc and matrix views.
12. **Compare, correct, plan and combine** — independent and dependent
    correlations compared with fifteen tests and Zou's intervals, two
    matrices compared, correction for attenuation and range restriction,
    power and sample size, the Bayes factor of a published *r*, and
    meta-analysis of correlations (fixed effect, DerSimonian–Laird, REML,
    Hunter–Schmidt) with forest and funnel plots, prediction interval and
    Egger's test.
13. **Figures, palettes and report** — a gallery of every figure with export
    at journal widths (PNG, SVG, vector PDF, TIFF), a designer of diverging
    palettes in OKLab with colour-vision-deficiency, greyscale and contrast
    checks, a correlation table ready for the word processor, methods written
    from what was run with their references, a printable report and the
    project package (JSON).

## Tests and validation

- **Unit tests.** Open `tests/index.html` with a double click: 285 tests
  against published values, exact arithmetic, hand-solved formulas and
  simulations. Every line must be green.
- **Validation against R.** Every engine of Blocks 1 to 12 was checked,
  number by number, against independent implementations of the same methods
  in R 4.4.2: **19,334 comparisons, none in disagreement**, plus coverage
  simulations for the intervals (Block 13 computes no new statistics). The
  comparison scripts and their references stay on the author's computer and
  are not part of the distributed program; `CHANGELOG.md` gives the count
  block by block and the errors the validation caught.

## Documentation

| Document | Language | What it is |
|---|---|---|
| `manual/CorrelationPro_Manual_de_usuario_ES.pdf` | Spanish | User manual, 145 pages: introduction, one chapter per block, appendices (files, reading rules, glossary, common problems, licence, the 229 references) |
| `manual/es/` | Spanish | The parts of the manual in HTML; `manual/LEEME.md` explains how they are built |
| Home page of the app (Block 1) | Spanish and English | Theory in plain words, the catalogue of measures with their formulas, and the references |
| [`CHANGELOG.md`](CHANGELOG.md) | Spanish | What changed in each version |
| [`PROCEDENCIA.md`](PROCEDENCIA.md) | Spanish | Item by item, what is original work and where methods, constants and example data come from |

## Data and third-party material

The program contains no code, icons, typefaces or images by anyone else, and
it requests nothing from the internet. It implements methods published in
journals and books, cited to their original publication on the Home page (229
references); the methods text written by Block 13 cites only those that were
used. The example data are nine public-domain datasets (each one states its
source and why it is in the public domain) and several simulated datasets,
announced as such on screen. `PROCEDENCIA.md` (in Spanish) gives the details.

## How to cite

Barrera-Guzmán, L. Á. (2026). CorrelationPro: análisis de correlación de todo
tipo en el navegador (Version 1.0.0) [Computer software].
https://github.com/luisangelbg/CorrelationPro

<!-- DOI: when the Zenodo record exists, replace the repository address above with
https://doi.org/10.5281/zenodo.XXXXXXXX (concept DOI) and add the line below. -->

The **Home** page of the app gives the citation ready to copy, also as a
BibTeX entry. `CITATION.cff` has the same data for reference managers.

## Contributing and support

Problems and proposals go to
https://github.com/luisangelbg/CorrelationPro/issues (the **Report a
problem** button of the app opens one with the block and the browser already
filled in).

## Licence

GNU General Public License, version 3 or later (`LICENSE`).
