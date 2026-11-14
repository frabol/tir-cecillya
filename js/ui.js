import { state, chargerDonneesExcelEtCalendrier, appliquerFiltresCalendrier, exporterEvenementICS } from './calendar.js';
import { getScoresLocaux, setScoresLocaux, getObjectifPersonnel, setObjectifPersonnel, ajouterScore, supprimerScoreParIndex } from './storage.js';
import { calculerStatistiques, dessinerGraphique } from './stats.js';

export let pageActuelle = "tableau";
/* ===== Bandeau hero (KPI en haut de page) ===== */
export function afficherHero() {
    const scores = [...state.scoresExcel, ...state.entrainementsExcel];
    if (scores.length === 0) return;

    const moyenne = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
    const record  = Math.max(...scores);

    /* Régularité 1 : part de tirs à 600 et plus */
    const pourcentRegulier = Math.round(
        (scores.filter(s => s >= 600).length / scores.length) * 100
    );

    /* Régularité 2 : écart-type, déjà calculé par stats.js */
    const stats = calculerStatistiques();
    const ecartType = stats ? stats.ecartType : "—";
    const profil = stats ? stats.appreciationRegularite : "—";

    const objectif = getObjectifPersonnel();
    const progression = Math.min(100, Math.round((record / objectif) * 100));

    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    set("hero-average", moyenne);
    set("hero-record", record.toFixed(1));
    set("hero-regularity", pourcentRegulier + "%");
    set("hero-regularity-profil", profil + " · ± " + ecartType + " pts");
    set("hero-series", scores.length);
    set("hero-goal-percent", progression + "%");
    set("hero-goal-note", "Record " + record.toFixed(1) + " pts sur " + objectif + " pts");

    const bar = document.getElementById("hero-goal-progress");
    if (bar) bar.style.width = progression + "%";

    const prochaines = state.prochainesCompetitions || [];
    const bloc = document.getElementById("hero-next");
    if (bloc && prochaines.length > 0) {
        const p = prochaines[0];
        bloc.innerHTML = "🎯 Prochaine échéance : <b>" + p.evenement +
            "</b> — " + p.date + " · " + p.lieu;
    }
}

export function majToolbar() {
    const libelles = {
        "tableau":     "Tableau de bord",
        "calendrier":  "Toutes",
        "resultats":   "Résultats",
        "stats":       "Statistiques",
        "top10":       "Top 10",
        "timer":       "Timer Stand"
    };
    const cible = libelles[pageActuelle];
    document.querySelectorAll(".toolbar .btn").forEach(b => {
        const txt = (b.textContent || "").replace(/\s+/g, " ").trim();
        b.classList.toggle("active", Boolean(cible) && txt.includes(cible));
    });
}

export function majPastilleSync() {
    const el = document.getElementById("sync-badge");
    if (!el) return;
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    el.textContent = "● À jour " + hh + ":" + mm;
    el.classList.add("sync-flash");
    setTimeout(() => el.classList.remove("sync-flash"), 1200);
}

function boutonRetour() {
    return '<button class="btn btn-retour" onclick="afficherTableauDeBord()">← Retour au tableau de bord</button>';
}

export function echapperHTML(texte) {
    return String(texte ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function echapperAttrJS(texte) {
    return String(texte ?? "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

// Saison 2026-2027 : sept.–déc. → 2026, janv.–juin → 2027 (pour un tri chronologique correct).
function tsJJMM(dateJJMM) {
    const [j, m] = String(dateJJMM || "").split("/").map(Number);
    if (!j || !m) return 0;
    return new Date(m >= 9 ? 2026 : 2027, m - 1, j).getTime();
}

function construireEvenementsChronologiques() {
    const events = [];
    for (let i = 0; i < state.datesMatchs.length; i++) {
        events.push({ date: state.datesMatchs[i], type: "match", score: Number(state.scoresExcel[i]) });
    }
    for (let i = 0; i < state.datesEntrainements.length; i++) {
        events.push({ date: state.datesEntrainements[i], type: "entrainement", score: Number(state.entrainementsExcel[i]) });
    }
    events.sort((a, b) => tsJJMM(a.date) - tsJJMM(b.date));
    return events;
}

export function afficherToast(msg) {
    let t = document.getElementById("toast-sync");
    if (!t) {
        t = document.createElement("div");
        t.id = "toast-sync";
        document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove("show"), 2500);
}

// Corrections manuelles vérifiées saison 2026-2027 (source : calendrier Ligue + résultats).
// Centralisées ici pour éviter les doublons : utiliser corrigerLieuCompetition().
const CORRECTIONS_LIEUX = [
    { date: "04/10", score: 604.1, lieu: "Trith-St-Léger" },
    { date: "18/10", score: 610.5, lieu: "Aulnoye-Aymeries" },
    { date: "25/10", score: 600.3, lieu: "Aulnoye-Aymeries" },
];

function corrigerLieuCompetition(date, score, lieuActuel) {
    const correction = CORRECTIONS_LIEUX.find(c =>
        c.date === date &&
        Math.abs(c.score - score) < 0.1
    );
    return correction ? correction.lieu : (lieuActuel || "").trim();
}

export async function afficherCalendrier(filtre = "avenir") {
    pageActuelle = "calendrier";
    try {
        const lignes = await chargerDonneesExcelEtCalendrier(filtre);
        let html = boutonRetour() + "<h2>📅 Calendrier de la saison</h2>";

        if (state.prochainesCompetitions.length > 0) {
            const titreEncart = state.prochainesCompetitions.length > 1
                ? "🎯 Prochaines compétitions (" + state.prochainesCompetitions.length + ")"
                : "🎯 Prochain Match à venir";

            html += '<div class="next-match-card">' +
                    '<h2>' + titreEncart + '</h2>' +
                    '<div style="font-size: 0.9em; color: #f0cf5a; font-weight: 700; margin-bottom: 10px;">' +
                        '📅 ' + state.prochainesCompetitions[0].date + ' (' + state.prochainesCompetitions[0].mois + ')' +
                    '</div>' +
                    '<div style="display: flex; flex-direction: column; gap: 10px;">';

            state.prochainesCompetitions.forEach((comp, idx) => {
                const borderStyle = idx > 0 ? "border-top: 1px solid rgba(255,255,255,0.12); padding-top: 10px;" : "";
                html += '<div style="' + borderStyle + '">' +
                            '<div style="font-size: 1.1em; font-weight: bold; color: #fff;">' + comp.evenement + '</div>' +
                            '<div style="font-size: 0.9em; color: #f3ded8; margin-top: 2px;">📍 ' + comp.lieu + '</div>' +
                        '</div>';
            });
            html += '</div></div>';
        }

        const disciplines = [
            { id: "all", label: "Tous" },
            { id: "10m", label: "10m" },
            { id: "25m", label: "25m" },
            { id: "carabine10m", label: "Carabine 10m" },
            { id: "carabine50m", label: "Carabine 50m" },
            { id: "pistolet", label: "Pistolet" }
        ];

        html += '<div class="filters-section"><h3>Filtrer par discipline</h3><div class="filter-buttons">';
        disciplines.forEach(d => {
            const actif = (state.filtreDisciplineActif === d.id);
            html += '<button class="filter-btn ' + (actif ? 'active' : '') + '" onclick="filtrerParDiscipline(\'' + d.id + '\')">' + d.label + '</button>';
        });
        html += '</div></div>';

        let moisCourant = "";
        let premierMoisAffiche = false;
        let dernierMoisAffiche = "";

        for (let i = 3; i < lignes.length; i++) {
            const ligne = lignes[i];
            if (!ligne) continue;

            const moisBrut = ligne[0];
            const date = ligne[1];
            const evenement = ligne[2];
            const lieu = ligne[3];
            const statut = ligne[5];

            if (moisBrut) moisCourant = moisBrut;

            if (evenement && (filtre === "toutes" || statut === "À venir")) {
                if (!premierMoisAffiche) {
                    html += '<div class="month-header">📅 ' + (moisCourant || "Septembre 2026") + '</div><div class="calendar-grid">';
                    premierMoisAffiche = true;
                    dernierMoisAffiche = moisCourant;
                } else if (moisCourant && moisCourant !== dernierMoisAffiche) {
                    html += '</div><div class="month-header" style="margin-top:25px;">📅 ' + moisCourant + '</div><div class="calendar-grid">';
                    dernierMoisAffiche = moisCourant;
                }

                const texteComplet = (String(date || "") + " " + String(evenement) + " " + String(lieu || "")).toLowerCase();
                const estAvenir = (statut === "À venir");
                const evSafe = echapperAttrJS(evenement);
                const lieuSafe = echapperAttrJS(lieu || "Lieu non spécifié");
                const dateSafe = echapperAttrJS(date || "");
                const moisSafe = echapperAttrJS(moisCourant || "");

                html += '<div class="competition competition-card" data-texte="' + echapperHTML(texteComplet) + '">' +
                            '<div class="competition-left">' +
                                '<div class="competition-date-badge">' + echapperHTML(date || "-") + '</div>' +
                                '<div class="competition-details">' +
                                    '<div class="competition-title">' + echapperHTML(evenement) + '</div>' +
                                    '<div class="competition-location">📍 ' + echapperHTML(lieu || "Lieu non spécifié") + '</div>' +
                                '</div>' +
                            '</div>' +
                            '<div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">';
                if (estAvenir) {
                    html += '<button class="btn" style="padding:6px 10px!important; font-size:12px!important;" onclick="exporterEvenementICS(\'' + evSafe + '\', \'' + dateSafe + '\', \'' + moisSafe + '\', \'' + lieuSafe + '\')" title="Ajouter à mon agenda">📆 Agenda</button>';
                }
                html += '<span class="competition-badge-status ' + (estAvenir ? 'status-avenir' : 'status-passe') + '">' +
                            (estAvenir ? '✅ À venir' : '📌 Passé') +
                        '</span>' +
                        '</div></div>';
            }
        }
        if (premierMoisAffiche) html += '</div>';

        document.getElementById("etat").innerHTML = html;
        appliquerFiltresCalendrier();
        majToolbar();
    } catch (erreur) {
        document.getElementById("etat").innerHTML = "❌ Erreur : " + erreur.message;
        afficherToast("⚠️ Erreur lors du chargement du calendrier");
    }
}

export function filtrerParDiscipline(discipline) {
    state.filtreDisciplineActif = discipline;
    document.querySelectorAll(".filter-btn").forEach(btn => {
        const onClickAttr = btn.getAttribute("onclick") || "";
        btn.classList.toggle("active", onClickAttr.includes("'" + discipline + "'"));
    });
    appliquerFiltresCalendrier();
}

export function afficherTableauDeBord() {
    pageActuelle = "tableau";
    const tousLesScores = [...state.scoresExcel, ...state.entrainementsExcel];
    const moyenne = tousLesScores.length > 0 ? (tousLesScores.reduce((a, b) => a + b, 0) / tousLesScores.length).toFixed(1) : 0;
    const record = tousLesScores.length > 0 ? Math.max(...tousLesScores) : 0;
    const chrono = construireEvenementsChronologiques();
    const dernier = chrono.length > 0 ? chrono[chrono.length - 1].score : 0;
    const objectif = getObjectifPersonnel();
    const pourcentageObjectif = Math.min(100, Math.round((record / objectif) * 100));

    let alerteNotification = "";
    if (state.prochainesCompetitions.length > 0) {
        alerteNotification = '<div class="alert-competition">' +
            '<span style="font-size: 28px;">🔔</span>' +
            '<div>' +
                '<div style="font-weight: bold; font-size: 1.05em;">Alerte Compétition Imminente !</div>' +
                '<div style="font-size: 0.95em; opacity: 0.9;">Prochain événement : <b>' + state.prochainesCompetitions[0].evenement + '</b> (' + state.prochainesCompetitions[0].date + ') à ' + state.prochainesCompetitions[0].lieu + '</div>' +
            '</div>' +
        '</div>';
    }

    let contenuProchainesComp = '<p style="font-size:1.1em; font-weight:bold; margin:6px 0 0 0;">Aucune compétition</p>';
    if (state.prochainesCompetitions.length > 0) {
        contenuProchainesComp = '<div style="font-size: 0.9em; color: var(--primary); font-weight: 700; margin: 6px 0 10px 0;">📅 ' + state.prochainesCompetitions[0].date + ' (' + state.prochainesCompetitions[0].mois + ')</div>' +
            '<div style="display: flex; flex-direction: column; gap: 8px;">' +
                state.prochainesCompetitions.map((c, idx) => 
                    '<div style="' + (idx > 0 ? 'border-top: 1px solid var(--border); padding-top: 8px;' : '') + '">' +
                        '<div style="font-size: 1.05em; font-weight: bold;">' + c.evenement + '</div>' +
                        '<div style="font-size: 0.88em; color: var(--muted);">📍 ' + c.lieu + '</div>' +
                    '</div>'
                ).join("") +
            '</div>';
    }

    const titreCardProchaine = state.prochainesCompetitions.length > 1
        ? "📅 Prochaines compétitions (" + state.prochainesCompetitions.length + ")"
        : "📅 Prochaine compétition";

    document.getElementById("etat").innerHTML = alerteNotification +
        '<h2>🏠 Tableau de bord</h2>' +
        '<div style="display:grid; grid-template-columns: repeat(auto-fit,minmax(220px,1fr)); gap:10px;">' +
            '<div class="card"><h3>🎯 Dernier score</h3><p style="font-size:28px; font-weight:bold;">' + dernier + '</p></div>' +
            '<div class="card"><h3>🏆 Record personnel</h3><p style="font-size:28px; font-weight:bold; color:var(--gold);">' + record + '</p></div>' +
            '<div class="card"><h3>📈 Moyenne saison</h3><p style="font-size:28px; font-weight:bold;">' + moyenne + '</p></div>' +
            '<div class="card"><h3>📋 Résultats</h3><p style="font-size:28px; font-weight:bold;">' + tousLesScores.length + '</p></div>' +
        '</div>' +
        '<div class="objective-card" onclick="modifierObjectifPersonnel()" style="cursor: pointer;" title="Cliquez pour modifier l\'objectif">' +
            '<div style="display: flex; justify-content: space-between; align-items: center;">' +
                '<h3 style="margin: 0; color: #ffd84d; font-size: 1.1em;">🎯 Objectif Personnel : ' + objectif + ' pts</h3>' +
                '<span style="font-size: 0.85em; background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 999px;">Modifier ⚙️</span>' +
            '</div>' +
            '<p style="margin: 6px 0 0 0; font-size: 0.95em; opacity: 0.9;">Record actuel : <b>' + record + ' pts</b> (' + pourcentageObjectif + '% de l\'objectif)</p>' +
            '<div class="progress-bar-container"><div class="progress-bar-fill" style="width: ' + pourcentageObjectif + '%;"></div></div>' +
        '</div>' +
        '<div class="card" style="border-left: 5px solid var(--primary); margin-top:16px;">' +
            '<h3>' + titreCardProchaine + '</h3>' +
            contenuProchainesComp +
        '</div>';

    majToolbar();
    majPastilleSync();
}

export function modifierObjectifPersonnel() {
    const objectifActuel = getObjectifPersonnel();
    const nouvelObjectif = prompt("🎯 Entrez votre objectif personnel de score :", objectifActuel);
    if (nouvelObjectif !== null && !isNaN(nouvelObjectif) && Number(nouvelObjectif) > 0) {
        setObjectifPersonnel(nouvelObjectif);
        afficherTableauDeBord();
        afficherToast("✅ Objectif mis à jour !");
    }
}
