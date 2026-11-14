import { state, chargerDonneesExcelEtCalendrier, appliquerFiltresCalendrier, exporterEvenementICS } from './calendar.js';
import { getScoresLocaux, setScoresLocaux, getObjectifPersonnel, setObjectifPersonnel, ajouterScore, supprimerScoreParIndex } from './storage.js';
import { calculerStatistiques, dessinerGraphique } from './stats.js';

export let pageActuelle = "tableau";
export function afficherHero() {
    const scores = [...state.scoresExcel, ...state.entrainementsExcel];
    if (scores.length === 0) return;

    const moyenne = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
    const record  = Math.max(...scores);

    const pourcentRegulier = Math.round(
        (scores.filter(s => s >= 600).length / scores.length) * 100
    );

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

export function confirmer(message, onOui, texteBouton = "Confirmer") {
    const deja = document.getElementById("modale-confirme");
    if (deja) deja.remove();

    const box = document.createElement("div");
    box.id = "modale-confirme";
    box.innerHTML =
        '<div class="modale-fond"></div>' +
        '<div class="modale-boite" role="dialog" aria-modal="true">' +
            '<p class="modale-texte">' + echapperHTML(message) + '</p>' +
            '<div class="modale-actions">' +
                '<button class="btn" id="modale-non">Annuler</button>' +
                '<button class="btn btn-primary" id="modale-oui">' + echapperHTML(texteBouton) + '</button>' +
            '</div>' +
        '</div>';
    document.body.appendChild(box);

    const fermer = () => box.remove();
    box.querySelector(".modale-fond").onclick = fermer;
    box.querySelector("#modale-non").onclick = fermer;
    box.querySelector("#modale-oui").onclick = () => { fermer(); onOui(); };
    document.addEventListener("keydown", function esc(e){
        if (e.key === "Escape") { fermer(); document.removeEventListener("keydown", esc); }
    });
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

function echapperAttrJS(texte) {
    return String(texte ?? "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

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

/* Mois affiché dans le calendrier : "all" ou le libellé exact d'un mois. */
let moisCalendrier = "all";

export function filtrerMoisCalendrier(mois) {
    moisCalendrier = mois;
    afficherCalendrier("avenir");
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

        const moisDisponibles = [];
        state.toutesCompetitionsCalendrier.forEach(c => {
            if (c.statut === "À venir" && c.mois && moisDisponibles.indexOf(c.mois) === -1) {
                moisDisponibles.push(c.mois);
            }
        });
        const ordreMois = ["Septembre","Octobre","Novembre","Décembre","Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août"];
        const rangMois = m => ordreMois.findIndex(o => m.indexOf(o) === 0);
        const anneeDe = m => Number((m.match(/20\d{2}/) || [0])[0]);
        moisDisponibles.sort((a, b) => {
            if (anneeDe(a) !== anneeDe(b)) return anneeDe(a) - anneeDe(b);
            return rangMois(a) - rangMois(b);
        });

        if (moisDisponibles.length > 0) {
            html += '<div class="filters-section"><h3>Filtrer par mois</h3><div class="filter-buttons">';
            html += '<button class="filter-btn ' + (moisCalendrier === "all" ? 'active' : '') +
                    '" onclick="filtrerMoisCalendrier(\'all\')">Tous</button>';
            moisDisponibles.forEach(m => {
                html += '<button class="filter-btn ' + (moisCalendrier === m ? 'active' : '') +
                        '" onclick="filtrerMoisCalendrier(\'' + m.replace(/'/g, "\\'") + '\')">' + m + '</button>';
            });
            html += '</div></div>';
        }

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

            const moisAutorise = (moisCalendrier === "all" || moisCalendrier === moisCourant);
            if (evenement && moisAutorise && (filtre === "toutes" || statut === "À venir")) {
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

    let joursAvantProchaine = null;
    if (state.prochainesCompetitions.length > 0) {
        const dp = state.prochainesCompetitions[0].dateReelle || "";
        const m = String(dp).match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (m) {
            const j = parseInt(m[1], 10), mo = parseInt(m[2], 10), an = parseInt(m[3], 10);
            const cible = new Date(an, mo - 1, j).getTime();
            joursAvantProchaine = Math.ceil((cible - Date.now()) / 86400000);
        }
    }

    let alerteNotification = "";
    if (joursAvantProchaine !== null && joursAvantProchaine <= 30 && joursAvantProchaine >= 0) {
        alerteNotification = '<div class="alert-competition">' +
            '<span style="font-size: 28px;">🔔</span>' +
            '<div>' +
                '<div style="font-weight: bold; font-size: 1.05em;">Alerte Compétition — dans ' + joursAvantProchaine + ' jour' + (joursAvantProchaine > 1 ? 's' : '') + '</div>' +
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

/* Etat du tri et du filtre sur la page Resultats. */
let triResultats = "date-asc";
let triResultatsFiltre = "all";

export function trierResultats(id) {
    triResultats = id;
    afficherResultats();
}

export function filtrerResultats(id) {
    triResultatsFiltre = id;
    afficherResultats();
}

export function afficherResultats() {
    pageActuelle = "resultats";
    let html = boutonRetour() + "<h2>🏆 Résultats</h2>";
    const resultats = [];

    const historiqueLocaux = getScoresLocaux();
    const mapLocaux = new Map(historiqueLocaux.map(item => {
        let d = item.date;
        if (d && d.includes("-")) {
            const p = d.split("-");
            d = p[2] + "/" + p[1];
        }
        return [d + "|" + item.type + "|" + Number(item.score), item];
    }));

    for (let i = 0; i < state.datesMatchs.length; i++) {
        const date = state.datesMatchs[i];
        const score = Number(state.scoresExcel[i]);
        const key = date + "|match|" + score;
        const local = mapLocaux.get(key);

        const lieuBrut =
            local?.lieu ||
            state.lieuxParResultat?.[date] ||
            state.lieuxParDate?.[date] ||
            "";

        const lieu = corrigerLieuCompetition(date, score, lieuBrut);

        resultats.push({
            date,
            type: "🏆 Compétition",
            score,
            lieu
        });
    }

    for (let i = 0; i < state.datesEntrainements.length; i++) {
        const date = state.datesEntrainements[i];
        const score = Number(state.entrainementsExcel[i]);
        const key = date + "|entrainement|" + score;
        const local = mapLocaux.get(key);
        resultats.push({
            date: date,
            type: "🏋️ Entraînement",
            score: score,
            lieu: local?.lieu || "MAUBEUGE"
        });
    }

    let liste = resultats;
    if (triResultatsFiltre === "match") {
        liste = liste.filter(r => r.type.indexOf("Compétition") !== -1);
    } else if (triResultatsFiltre === "entrainement") {
        liste = liste.filter(r => r.type.indexOf("Entraînement") !== -1);
    }

    if (triResultats === "score-desc") {
        liste = [...liste].sort((a, b) => b.score - a.score);
    } else if (triResultats === "score-asc") {
        liste = [...liste].sort((a, b) => a.score - b.score);
    } else if (triResultats === "date-desc") {
        liste = [...liste].sort((a, b) => tsJJMM(b.date) - tsJJMM(a.date));
    } else {
        liste = [...liste].sort((a, b) => tsJJMM(a.date) - tsJJMM(b.date));
    }

    const tris = [
        { id: "date-asc",  label: "📅 Date ↑" },
        { id: "date-desc", label: "📅 Date ↓" },
        { id: "score-desc", label: "🏆 Score ↓" },
        { id: "score-asc",  label: "📉 Score ↑" }
    ];
    const filtres = [
        { id: "all",          label: "Tout" },
        { id: "match",        label: "🏆 Compétitions" },
        { id: "entrainement", label: "🏋️ Entraînements" }
    ];

    html += '<div class="filters-section"><h3>Trier par</h3><div class="filter-buttons">';
    tris.forEach(t => {
        html += '<button class="filter-btn ' + (triResultats === t.id ? 'active' : '') +
                '" onclick="trierResultats(\'' + t.id + '\')">' + t.label + '</button>';
    });
    html += '</div><h3 style="margin-top:14px;">Afficher</h3><div class="filter-buttons">';
    filtres.forEach(f => {
        html += '<button class="filter-btn ' + (triResultatsFiltre === f.id ? 'active' : '') +
                '" onclick="filtrerResultats(\'' + f.id + '\')">' + f.label + '</button>';
    });
    html += '</div></div>';

    html += '<p style="color:var(--muted); font-size:.88rem; margin:6px 0 14px 0;">' +
            liste.length + ' résultat' + (liste.length > 1 ? 's' : '') + '</p>';

    if (liste.length === 0) {
        html += "<p>Aucun résultat pour ce filtre.</p>";
    } else {
        const meilleur = Math.max(...resultats.map(r => r.score));
        liste.forEach(item => {
            const detailLieu = item.lieu ? '<div style="font-size:0.88em; color:var(--muted); margin-top:2px;">📍 ' + echapperHTML(item.lieu) + '</div>' : "";
            const estRecord = item.score === meilleur;
            const couleurScore = estRecord ? 'var(--gold)' : 'var(--text)';
            html += '<div class="competition competition-card">' +
                        '<div class="competition-left">' +
                            '<div class="competition-date-badge">' + item.date + '</div>' +
                            '<div class="competition-details">' +
                                '<div class="competition-title">' + item.type + (estRecord ? ' · <span style="color:var(--gold);">record</span>' : '') + '</div>' +
                                detailLieu +
                                '<div class="competition-location">Score : <b style="color:' + couleurScore + ';">' + item.score + '</b></div>' +
                            '</div>' +
                        '</div>' +
                    '</div>';
        });
    }

    document.getElementById("etat").innerHTML = html;
    majToolbar();
}

export function ajusterScoreRapide(delta) {
    const champ = document.getElementById("scoreTotal");
    if (!champ) return;
    const actuel = parseFloat(champ.value) || 0;
    const nouveau = Math.max(0, Math.round((actuel + delta) * 10) / 10);
    champ.value = nouveau;
    recalculerTotalSeries();
}

export function recalculerTotalSeries() {
    const champs = document.querySelectorAll('input[id^="serie"]');
    if (champs.length === 0) return;
    let somme = 0;
    champs.forEach(c => { somme += parseFloat(c.value) || 0; });
    const total = document.getElementById("scoreTotal");
    if (total) total.value = Math.round(somme * 10) / 10;
}

export function afficherAjoutScore(pageTitre = "Ajouter un score") {
    const aujourdHui = new Date().toISOString().slice(0, 10);
    let inputsSeriesHtml = "";
    for (let i = 1; i <= 6; i++) {
        inputsSeriesHtml += '<div style="text-align:center;">' +
            '<label style="font-size:.8em; color:var(--muted); display:block;">Série ' + i + '</label>' +
            '<input type="number" step="0.1" min="0" id="serie' + i + '" oninput="recalculerTotalSeries()" style="font-size:1.2rem; padding:8px; width:100%; box-sizing:border-box;">' +
        '</div>';
    }

    const html = '<h2>➕ ' + pageTitre + '</h2>' +
        '<div style="display:grid; grid-template-columns: repeat(auto-fit,minmax(220px,1fr)); gap:14px;">' +
            '<div>' +
                '<label style="font-weight:700; display:block; margin-bottom:6px;">Date</label>' +
                '<input type="date" id="scoreDate" value="' + aujourdHui + '" style="width:100%; padding:10px; border-radius:10px; border:1px solid var(--border); background:var(--bg); color:var(--text);">' +
            '</div>' +
            '<div>' +
                '<label style="font-weight:700; display:block; margin-bottom:6px;">Type</label>' +
                '<select id="scoreType" style="width:100%; padding:10px; border-radius:10px; border:1px solid var(--border); background:var(--bg); color:var(--text);">' +
                    '<option value="match">🏆 Compétition</option>' +
                    '<option value="entrainement">🏋️ Entraînement</option>' +
                '</select>' +
            '</div>' +
            '<div>' +
                '<label style="font-weight:700; display:block; margin-bottom:6px;">Lieu</label>' +
                '<input type="text" id="scoreLieu" placeholder="Ex : CALAIS" style="width:100%; padding:10px; border-radius:10px; border:1px solid var(--border); background:var(--bg); color:var(--text);">' +
            '</div>' +
        '</div>' +
        '<div style="margin-top:18px;">' +
            '<label style="font-weight:700; display:block; margin-bottom:6px;">Score total</label>' +
            '<input type="number" step="0.1" min="0" id="scoreTotal" style="width:100%; padding:14px; font-size:1.6rem; font-weight:800; text-align:center; border-radius:12px; border:1px solid var(--border); background:var(--bg); color:var(--text); box-sizing:border-box;">' +
        '</div>' +
        '<div style="display:grid; grid-template-columns: repeat(5,1fr); gap:8px; margin-top:10px;">' +
            '<button type="button" class="btn" style="justify-content:center; padding:12px 4px!important; font-weight:800!important;" onclick="ajusterScoreRapide(-1)">-1</button>' +
            '<button type="button" class="btn" style="justify-content:center; padding:12px 4px!important; font-weight:800!important;" onclick="ajusterScoreRapide(-0.5)">-0.5</button>' +
            '<button type="button" class="btn" style="justify-content:center; padding:12px 4px!important; font-weight:800!important;" onclick="ajusterScoreRapide(0.1)">+0.1</button>' +
            '<button type="button" class="btn" style="justify-content:center; padding:12px 4px!important; font-weight:800!important;" onclick="ajusterScoreRapide(0.5)">+0.5</button>' +
            '<button type="button" class="btn" style="justify-content:center; padding:12px 4px!important; font-weight:800!important;" onclick="ajusterScoreRapide(1)">+1</button>' +
        '</div>' +
        '<div style="margin-top:16px;">' +
            '<label style="font-weight:700; display:block; margin-bottom:6px;">Note (facultatif)</label>' +
            '<input type="text" id="scoreNote" placeholder="Ex : vent fort, bonne forme…" style="width:100%; padding:10px; border-radius:10px; border:1px solid var(--border); background:var(--bg); color:var(--text); box-sizing:border-box;">' +
        '</div>' +
        '<details style="background:var(--bg); border:1px solid var(--border); border-radius:12px; padding:10px 12px; margin-top:16px;"><summary style="cursor:pointer; font-weight:700; color:var(--primary);">🎯 Détail des 6 séries (facultatif)</summary><div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:8px; margin-top:10px;">' + inputsSeriesHtml + '</div></details>' +
        '<button class="btn btn-primary" style="justify-content:center; width:100%; padding:14px!important; font-size:16px!important; margin-top:16px;" onclick="enregistrerScore()">💾 Enregistrer le score</button>';

    document.getElementById("etat").innerHTML = html;
    majToolbar();
}

export async function enregistrerScore() {
    const date = document.getElementById("scoreDate")?.value || "";
    const type = document.getElementById("scoreType")?.value || "match";
    const lieu = (document.getElementById("scoreLieu")?.value || "").trim();
    const note = (document.getElementById("scoreNote")?.value || "").trim();
    let score = parseFloat(document.getElementById("scoreTotal")?.value);

    const series = [];
    for (let i = 1; i <= 6; i++) {
        const v = parseFloat(document.getElementById("serie" + i)?.value);
        if (!isNaN(v) && v > 0) series.push(v);
    }
    if (!isNaN(score) && series.length === 6) {
        const somme = Math.round(series.reduce((a, b) => a + b, 0) * 10) / 10;
        if (Math.abs(somme - score) > 0.2) score = somme;
    }

    if (!date) { afficherToast("⚠️ Choisissez une date"); return; }
    if (isNaN(score) || score <= 0) { afficherToast("⚠️ Score invalide"); return; }

    const MAX_VRAISEMBLABLE = 654;
    if (score > MAX_VRAISEMBLABLE) {
        const msg = "⚠️ " + score + " pts dépasse le maximum possible (" + MAX_VRAISEMBLABLE + ").\n" +
                    "Vérifiez la saisie.\nEnregistrer quand même ?";
        if (!confirm(msg)) return;
    }

    const res = await ajouterScore({ date, type, lieu, note, score, series });
    if (!res.ok) {
        afficherToast(res.raison === "existe" ? "⚠️ Ce score existe déjà" : "❌ Erreur d'enregistrement");
        return;
    }
    afficherToast(res.offline ? "💾 Score enregistré (hors ligne)" : "✅ Score enregistré !");
    voirScores();
}

export function voirScores() {
    pageActuelle = "scores";
    const historique = getScoresLocaux();
    let html = boutonRetour() + "<h2>📋 Scores saisis</h2>";

    if (historique.length === 0) {
        html += "<p>Aucun score enregistré.</p>";
    } else {
        historique.forEach((item, index) => {
            const detailLieu = item.lieu ? '<div style="font-size:0.88em; color:var(--primary); font-weight:600; margin-top:2px;">📍 ' + echapperHTML(item.lieu) + '</div>' : '<div style="font-size:0.88em; color:var(--muted); font-style:italic; margin-top:2px;">📍 Lieu non renseigné</div>';
            const detailSeries = item.series && item.series.length > 0 ? '<div style="font-size:0.82em; color:var(--primary); margin-top:2px;">Séries : ' + echapperHTML(item.series.join(" • ")) + '</div>' : "";
            const detailNote = item.note ? '<div style="font-size:0.82em; color:var(--muted); font-style:italic; margin-top:2px;">📝 ' + echapperHTML(item.note) + '</div>' : "";

            html += '<div class="competition competition-card">' +
                        '<div class="competition-left">' +
                            '<div class="competition-date-badge">' + echapperHTML(item.date) + '</div>' +
                            '<div class="competition-details">' +
                                '<div class="competition-title">' + (item.type === "match" ? "🏆 Compétition" : "🏋️ Entraînement") + '</div>' +
                                detailLieu +
                                '<div class="competition-location">Score : <b>' + item.score + '</b></div>' +
                                detailSeries +
                                detailNote +
                            '</div>' +
                        '</div>' +
                        '<div><button onclick="supprimerScore(' + index + ')" style="background:var(--primary); color:white; border:none; padding:6px 12px; border-radius:8px; cursor:pointer; font-weight:600;">🗑️ Supprimer</button></div>' +
                    '</div>';
        });
    }
    document.getElementById("etat").innerHTML = html;
    majToolbar();
}

export async function supprimerScore(index, callbackReload) {
    confirmer("Supprimer définitivement ce score ?", async () => {
        const res = await supprimerScoreParIndex(index);
        if (!res.ok) {
            afficherToast("❌ Erreur lors de la suppression");
            return;
        }
        afficherToast("🗑️ Score supprimé");
        if (callbackReload) await callbackReload();
        voirScores();
    }, "Supprimer");
}

export function afficherStats() {
    pageActuelle = "stats";
    const stats = calculerStatistiques();

    if (!stats) {
        document.getElementById("etat").innerHTML = boutonRetour() + "<p>Aucun score trouvé.</p>";
        majToolbar();
        return;
    }

    let htmlMensuel = "";
    for (const mois in stats.statsParMois) {
        const moyMois = (stats.statsParMois[mois].somme / stats.statsParMois[mois].count).toFixed(1);
        htmlMensuel += '<div class="monthly-stat-item">' +
            '<span>📅 ' + mois + ' (' + stats.statsParMois[mois].count + ' tirs)</span>' +
            '<span>Moyenne : <b>' + moyMois + '</b> | Max : <b style="color:var(--gold);">' + stats.statsParMois[mois].max + '</b></span>' +
        '</div>';
    }

    document.getElementById("etat").innerHTML = boutonRetour() +
        '<h2>📈 Statistiques & Progression</h2>' +
        '<div style="display:grid; grid-template-columns: repeat(auto-fit,minmax(220px,1fr)); gap:15px;">' +
            '<div class="card"><h3>🎯 Dernier score</h3><p style="font-size:32px; font-weight:bold;">' + stats.dernier + '</p></div>' +
            '<div class="card"><h3>🏆 Record</h3><p style="font-size:32px; font-weight:bold; color:var(--gold);">' + stats.meilleurGlobal + '</p></div>' +
            '<div class="card"><h3>📊 Moyenne saison</h3><p style="font-size:32px; font-weight:bold;">' + stats.moyenne + '</p></div>' +
            '<div class="card"><h3>📋 Résultats</h3><p style="font-size:32px; font-weight:bold;">' + stats.totalResultats + '</p></div>' +
        '</div>' +
        '<div style="display:grid; grid-template-columns: repeat(auto-fit,minmax(250px,1fr)); gap:15px; margin-top:15px;">' +
            '<div class="card" style="border-left: 4px solid var(--gold);">' +
                '<h3>🔥 Forme du moment (5 derniers tirs)</h3>' +
                '<p style="font-size:28px; font-weight:bold; margin:8px 0 4px 0;">' + stats.moyenne5 + ' pts</p>' +
                '<small style="color:var(--muted); font-weight:600;">' + stats.badgeForme + '</small>' +
            '</div>' +
            '<div class="card" style="border-left: 4px solid var(--primary);">' +
                '<h3>📐 Régularité (Écart-type)</h3>' +
                '<p style="font-size:28px; font-weight:bold; margin:8px 0 4px 0;">± ' + stats.ecartType + ' pts</p>' +
                '<small style="color:var(--muted); font-weight:600;">Profil : ' + stats.appreciationRegularite + '</small>' +
            '</div>' +
        '</div>' +
        '<div class="card" style="margin-top:20px;">' +
            '<h3>📈 Progression mensuelle automatique</h3>' +
            (htmlMensuel || "<p>Aucune donnée mensuelle disponible.</p>") +
        '</div>' +
        '<hr style="margin:20px 0; border:0; border-top:1px solid var(--border);">' +
        '<h3>📊 Évolution des performances & Objectif (' + stats.objectif + ' pts)</h3>' +
        '<div class="chart-wrap"><canvas id="graphiqueScores"></canvas></div>';

    dessinerGraphique("graphiqueScores");
    majToolbar();
}

export function afficherTop10() {
    pageActuelle = "top10";
    const tousLesScores = [];
    for (let i = 0; i < state.datesMatchs.length; i++) {
        tousLesScores.push({ date: state.datesMatchs[i], type: "🏆 Compétition", score: Number(state.scoresExcel[i]) });
    }
    for (let i = 0; i < state.datesEntrainements.length; i++) {
        tousLesScores.push({ date: state.datesEntrainements[i], type: "🏋️ Entraînement", score: Number(state.entrainementsExcel[i]) });
    }

    if (tousLesScores.length === 0) {
        document.getElementById("etat").innerHTML = boutonRetour() + "<h2>🥇 Top 10 & Historique des records</h2><p>Aucun score.</p>";
        majToolbar();
        return;
    }

    tousLesScores.sort((a, b) => tsJJMM(a.date) - tsJJMM(b.date));

    const historiqueRecords = [];
    let recordMaxActuel = 0;
    tousLesScores.forEach(item => {
        if (item.score > recordMaxActuel) {
            recordMaxActuel = item.score;
            historiqueRecords.push({ date: item.date, type: item.type, score: item.score });
        }
    });

    const top10 = [...tousLesScores].sort((a, b) => b.score - a.score).slice(0, 10);
    const moyenneTop10 = top10.length > 0 ? (top10.reduce((t, i) => t + i.score, 0) / top10.length).toFixed(1) : 0;
    const recordAbsolu = top10.length > 0 ? top10[0].score : 0;

    let html = boutonRetour() + '<h2>🥇 Top 10 & Historique des records</h2>';
    html += '<div style="display:grid; grid-template-columns: repeat(auto-fit,minmax(200px,1fr)); gap:15px;">' +
        top10.map((item, idx) => {
            const medaille = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : "";
            return '<div class="card" style="text-align:center; padding:16px;">' +
                '<div style="font-size:.85em; color:var(--muted); font-weight:700;">' + (medaille || ("#" + (idx + 1))) + '</div>' +
                '<div style="font-size:1.9rem; font-weight:900; color:' + (idx === 0 ? 'var(--gold)' : 'var(--text)') + ';">' + item.score + '</div>' +
                '<div style="font-size:.8em; color:var(--muted); margin-top:2px;">' + item.date + '</div>' +
                '<div style="font-size:.8em; color:var(--muted);">' + item.type + '</div>' +
            '</div>';
        }).join("") +
    '</div>';

    html += '<div class="card" style="margin-top:20px;">' +
        '<h3>🏆 Record personnel absolu : ' + recordAbsolu + '</h3>' +
        '<p style="font-size:16px; margin:0;">📊 Moyenne du Top 10 : <b>' + moyenneTop10 + '</b></p>' +
    '</div>';

    html += '<div class="card" style="margin-top:20px;">' +
        '<h3>📈 Historique des records battus</h3>' +
        historiqueRecords.map(r =>
            '<div class="monthly-stat-item">' +
                '<span>📅 ' + r.date + ' ( ' + r.type + ' )</span>' +
                '<span>Nouveau record : <b style="color:var(--gold);">' + r.score + ' pts</b></span>' +
            '</div>'
        ).join("") +
    '</div>';

    document.getElementById("etat").innerHTML = html;
    majToolbar();
}

export function exporterScoresJSON() {
    const historique = getScoresLocaux();
    if (historique.length === 0) { afficherToast("⚠️ Aucun score à exporter"); return; }
    const blob = new Blob([JSON.stringify(historique, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "scores-tir-cecillya-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    afficherToast("💾 Export JSON téléchargé");
}

export function exporterScoresExcel() {
    const historique = getScoresLocaux();
    if (historique.length === 0) { afficherToast("⚠️ Aucun score à exporter"); return; }

    const lignes = historique.map(item => ({
        Date: item.date,
        Type: item.type === "match" ? "Compétition" : "Entraînement",
        Lieu: item.lieu || "",
        Score: item.score,
        Series: item.series && item.series.length ? item.series.join(" - ") : "",
        Note: item.note || ""
    }));

    const feuille = XLSX.utils.json_to_sheet(lignes);
    const classeur = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(classeur, feuille, "Scores");
    XLSX.writeFile(classeur, "scores-tir-cecillya-" + new Date().toISOString().slice(0, 10) + ".xlsx");
    afficherToast("📊 Export Excel téléchargé");
}

export function importerScoresJSON(event, callbackReload) {
    const fichier = event.target.files && event.target.files[0];
    if (!fichier) return;

    const lecteur = new FileReader();
    lecteur.onload = async (e) => {
        try {
            const donnees = JSON.parse(e.target.result);
            if (!Array.isArray(donnees)) throw new Error("Format invalide");

            const historique = getScoresLocaux();
            let ajoutes = 0;
            donnees.forEach(item => {
                if (!item || !item.date || item.score === undefined) return;
                const existe = historique.some(h =>
                    h.date === item.date &&
                    h.type === item.type &&
                    Number(h.score) === Number(item.score)
                );
                if (!existe) {
                    historique.push({
                        date: item.date,
                        type: item.type || "entrainement",
                        lieu: item.lieu || "",
                        score: Number(item.score),
                        note: item.note || "",
                        series: Array.isArray(item.series) ? item.series : []
                    });
                    ajoutes++;
                }
            });
            setScoresLocaux(historique);
            afficherToast(ajoutes > 0 ? "✅ " + ajoutes + " score(s) importé(s)" : "ℹ️ Aucun nouveau score");
            if (callbackReload) await callbackReload();
        } catch (err) {
            afficherToast("❌ Fichier JSON invalide");
            console.error(err);
        } finally {
            event.target.value = "";
        }
    };
    lecteur.readAsText(fichier);
}
