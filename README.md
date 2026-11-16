# Tir Cécillya

Application de suivi des scores et du calendrier de tir sportif de **Cécillya** — Ligue de Tir Nord-Pas-de-Calais, saison 2026-2027.

**Site en ligne :** https://frabol.github.io/tir-cecillya/

## Ce que fait l'application

- **Tableau de bord** — moyenne, record, régularité, progression vers l'objectif de saison, prochaine échéance.
- **Calendrier** — toutes les compétitions de la saison, filtrables par mois et par discipline (10m, 25m, carabine, pistolet). Export d'un événement au format `.ics` pour l'agenda.
- **Résultats** — tri et filtrage des scores, compétitions et entraînements séparés.
- **Statistiques** — courbe d'évolution, moyenne mobile sur 5 tirs, écart-type, bilan mensuel.
- **Top 10** — les meilleures séries de la saison.
- **Palmarès** — résultats officiels FFTir / Statis'tir, par discipline, avec podiums.
- **Timer Stand** — chronomètre de stand, persistant entre les pages.

## Fonctionnement

Les scores sont stockés **localement** dans le navigateur (`localStorage`) et sauvegardés dans **Supabase** lorsqu'une connexion est active. Le classeur Excel de la Ligue est lu à chaque ouverture : il reste la source du calendrier et des scores officiels.

L'ajout et la suppression de scores sont **protégés** : la base applique des règles de sécurité (RLS) qui n'autorisent l'écriture qu'à une session authentifiée. Le site lui-même reste ouvert à la consultation.

L'application fonctionne **hors-ligne** : un service worker met en cache les fichiers du site, ce qui permet de la consulter au stand même sans réseau.

## Technologies

- HTML, CSS et JavaScript natifs — pas de framework
- [SheetJS](https://sheetjs.com/) pour la lecture du classeur `.xlsx`
- [Chart.js](https://www.chartjs.org/) pour les graphiques
- [Supabase](https://supabase.com/) pour la synchronisation et l'authentification
- GitHub Pages pour l'hébergement

## Structure du dépôt

```
index.html                 Structure de la page, icônes SVG, repli du menu mobile
styles.css                 Tout le design (thème clair / sombre via data-theme)
service-worker.js          Cache hors-ligne
manifest.json              Manifeste PWA (installation sur mobile)
js/
  main.js                  Point d'entrée, pont entre le HTML et les modules
  calendar.js              Lecture du classeur Excel, calendrier, filtres
  storage.js               localStorage, Supabase, authentification
  ui.js                    Rendu de toutes les pages
  stats.js                 Statistiques et graphique
  timer.js                 Timer Stand
  palmares.js              Onglet Palmarès
  palmares-donnees.js      Résultats officiels FFTir / Statis'tir
Calendrier_Ligue_Tir_NPdC_2026_2027_dernier.xlsx   Calendrier officiel de la Ligue
logo-maubeuge.png          Logo du club
logo-ligue-npdc.png        Écusson de la Ligue NPdC
icon-192.png, icon-512.png Icônes de l'application
```

## Développement local

Le site lit un fichier `.xlsx` et interroge Supabase : il faut donc le servir par HTTP, pas l'ouvrir directement en `file://`.

```bash
python3 -m http.server 8000
# puis http://localhost:8000
```

## Licence

Projet personnel. Les résultats officiels proviennent de la FFTir et du site Statis'tir, et restent la propriété de leurs auteurs.
