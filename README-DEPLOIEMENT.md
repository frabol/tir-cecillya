# Tir Cécillya — Refonte visuelle 2026-2027

Nouveau design moderne, responsive (mobile + PC) et mode sombre amélioré.
La logique (scores, Excel, Supabase, calendrier) est inchangée : seul le visuel change.

## Fichiers
- `index.html` : nouvelle structure (hero, toolbar sticky, cartes). Garde les mêmes `id` et fonctions que l'ancien site :
  `recherche`, `etat`, `importScores`, `afficherTableauDeBord()`, `afficherToutes()`, `afficherAVenir()`,
  `afficherResultats()`, `afficherStats()`, `afficherTop10()`, `afficherAjoutScore()`, `voirScores()`,
  `exporterScores()`, `exporterExcel()`, `synchroniserEtRecharger()`, `importerScores()`, `toggleTheme()`.
- `styles.css` : tout le design (variables, KPI, dark mode via `data-theme="dark"` + compat `body.dark`).
- `app.js` : copie de votre fichier actuel, inchangé. Ne pas modifier si vous avez déjà une version à jour.

## Déploiement sur https://frabol.github.io/tir-cecillya/
Option 1 — via GitHub web :
1. Allez sur https://github.com/frabol/tir-cecillya
2. Remplacez `index.html` par le nouveau `index.html`
3. Ajoutez `styles.css` à la racine (à côté de `app.js`)
4. Vérifiez que `app.js`, `manifest.json`, `icon-192.png`, `Calendrier_Ligue_Tir_NPdC_2026_2027_dernier.xlsx` sont toujours présents
5. Commit → attendez 1-2 min → rechargez https://frabol.github.io/tir-cecillya/ avec Ctrl+Shift+R

Option 2 — en ligne de commande :
```bash
git clone https://github.com/frabol/tir-cecillya.git
cd tir-cecillya
cp /chemin/vers/tir-cecillya-new/index.html ./index.html
cp /chemin/vers/tir-cecillya-new/styles.css ./styles.css
git add index.html styles.css
git commit -m "refonte visuelle : hero, toolbar, KPI, dark mode"
git push origin main
```

## Personnalisation rapide
- Couleurs : modifiez `:root` dans `styles.css` (`--navy`, `--blue`, `--gold`)
- Titre : modifiez `.hero h1` dans `index.html`
- Le patch JS en bas de `index.html` transforme automatiquement l'ancien tableau de bord en cartes KPI, sans toucher à `app.js`.

## Test local
Ouvrez `index.html` dans un navigateur, ou :
```bash
cd tir-cecillya-new
python3 -m http.server 8000
# puis http://localhost:8000
```
Note : `app.js` charge un fichier `.xlsx` et Supabase → testez de préférence avec un serveur local, pas en `file://`.
