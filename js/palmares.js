/* ============================================================
   Onglet Palmarès — résultats officiels FFTir / Statis'tir
   Les disciplines sont séparées : on ne mélange jamais
   un score sur 600 (10m) avec un score sur 654 (50m couché).
   ============================================================ */
import { PALMARES } from './palmares-donnees.js';

let filtrePalmares = "10m";

export function filtrerPalmares(d) {
    filtrePalmares = d;
    afficherPalmares();
}

export function afficherPalmares() {
    pageActuelle = "palmares";

    const familles = [
        { id: "10m",       label: "Carabine 10m",  max: 600 },
        { id: "50m",       label: "50m couché",    max: 654 },
        { id: "50m-3x40",  label: "50m 3x40",     max: 1200 },
        { id: "50m-3x20",  label: "50m 3x20",     max: 600 },
        { id: "equipe",    label: "Par équipes",   max: 0 }
    ];

    const famille = familles.find(f => f.id === filtrePalmares) || familles[0];
    const liste = PALMARES.filter(p => p.discipline === famille.id);

    let html = boutonRetour() + '<h2>🏅 Palmarès officiel</h2>' +
        '<p style="color:var(--muted); font-size:.88rem; margin:0 0 14px 0;">' +
        'Résultats en compétition — source FFTir / Statis\'tir</p>';

    html += '<div class="filters-section"><h3>Discipline</h3><div class="filter-buttons">';
    familles.forEach(f => {
        const n = PALMARES.filter(p => p.discipline === f.id).length;
        if (n === 0) return;
        html += '<button class="filter-btn ' + (filtrePalmares === f.id ? 'active' : '') +
                '" onclick="filtrerPalmares(\'' + f.id + '\')">' + f.label + ' (' + n + ')</button>';
    });
    html += '</div></div>';

    if (liste.length === 0) {
        html += '<p>Aucun résultat dans cette discipline.</p>';
        document.getElementById("etat").innerHTML = html;
        majToolbar();
        return;
    }

    const scores = liste.filter(p => p.score > 0).map(p => p.score);
    const meilleur = scores.length ? Math.max(...scores) : 0;
    const moyenne = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : "—";
    const podiums = liste.filter(p => p.place >= 1 && p.place <= 3).length;
    const victoires = liste.filter(p => p.place === 1).length;
    const meilleureEntree = liste.find(p => p.score === meilleur);

    html += '<div class="kpi-grid" style="margin-bottom:18px;">' +
        '<div class="kpi"><h3>Record officiel</h3><strong style="color:var(--gold);">' + meilleur + '</strong>' +
            (meilleureEntree ? '<div style="font-size:.78rem; color:var(--muted); margin-top:4px;">' + echapperHTML(meilleureEntree.competition) + '</div>' : '') +
        '</div>' +
        '<div class="kpi"><h3>Moyenne</h3><strong>' + moyenne + '</strong></div>' +
        '<div class="kpi"><h3>Podiums</h3><strong>' + podiums + '</strong>' +
            '<div style="font-size:.78rem; color:var(--muted); margin-top:4px;">dont ' + victoires + ' victoire' + (victoires > 1 ? 's' : '') + '</div>' +
        '</div>' +
        '<div class="kpi"><h3>Compétitions</h3><strong>' + liste.length + '</strong></div>' +
    '</div>';

    const saisons = [...new Set(liste.map(p => p.saison))].sort().reverse();

    saisons.forEach(sai => {
        const items = liste.filter(p => p.saison === sai);
        html += '<div class="card palmares-saison">' +
            '<h3 style="margin:0 0 12px 0; font-size:1.05rem;">Saison ' + sai + '</h3>';

        items.sort((a, b) => String(b.date).localeCompare(String(a.date)));

        items.forEach(p => {
            const medaille = p.place === 1 ? "🥇" : p.place === 2 ? "🥈" : p.place === 3 ? "🥉" : "";
            const estPodium = p.place >= 1 && p.place <= 3;
            const couleurPlace = estPodium ? 'var(--gold)' : 'var(--muted)';
            const rang = p.place ? (medaille || (p.place + "ᵉ")) : "—";

            html += '<div class="palmares-ligne' + (estPodium ? ' palmares-podium' : '') + '">' +
                '<div class="palmares-rang" style="color:' + couleurPlace + ';">' + rang + '</div>' +
                '<div class="palmares-detail">' +
                    '<div class="palmares-compet">' + echapperHTML(p.competition) + '</div>' +
                    '<div class="palmares-meta">' + echapperHTML(p.categorie) + ' · ' +
                        (p.sur ? 'sur ' + p.sur : (famille.max ? 'sur ' + famille.max : 'par équipe')) +
                        (p.membres ? ' · ' + echapperHTML(p.membres) : '') +
                    '</div>' +
                '</div>' +
                '<div class="palmares-score">' + (p.score ? p.score : '—') + '</div>' +
            '</div>';
        });

        html += '</div>';
    });

    html += '<p style="color:var(--muted); font-size:.8rem; margin-top:20px;">' +
        'Disciplines séparées : le 10m se tire sur 600 points, le 50m couché sur 654. ' +
        'Les scores ne sont pas comparables d\'une discipline à l\'autre.</p>';

    document.getElementById("etat").innerHTML = html;
    majToolbar();
}
