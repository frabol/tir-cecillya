import { state, chargerDonneesExcelEtCalendrier, appliquerFiltresCalendrier, exporterEvenementICS } from './calendar.js';
import { getScoresLocaux, setScoresLocaux, getObjectifPersonnel, setObjectifPersonnel, ajouterScore, supprimerScoreParIndex } from './storage.js';
import { calculerStatistiques, dessinerGraphique } from './stats.js';

export let pageActuelle = "tableau";

/* Permet aux autres modules (palmares.js) de dire quelle page est affichee. */
export function definirPage(nom) {
    pageActuelle = nom;
}

/* ============================================================
   COMPTE A REBOURS J-X ET ITINERAIRE
   ============================================================ */
export function joursRestants(dateReelle){
    const m = String(dateReelle || "").match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if(!m) return null;
    const cible = new Date(parseInt(m[3],10), parseInt(m[2],10)-1, parseInt(m[1],10)).getTime();
    const auj = new Date();
    const minuit = new Date(auj.getFullYear(), auj.getMonth(), auj.getDate()).getTime();
    return Math.round((cible - minuit) / 86400000);
}

export function texteCompteARebours(jours){
    if(jours === null) return "";
    if(jours === 0) return "C'est aujourd'hui !";
    if(jours === 1) return "Demain";
    if(jours < 0) return "Passé";
    return "J-" + jours;
}

export function lienItineraire(lieu){
    const q = encodeURIComponent(String(lieu || "") + " France");
    return "https://www.google.com/maps/search/?api=1&query=" + q;
}

/* Moyennes separees : entrainement d'un cote, competition de l'autre. */
export function comparerEntrainementCompetition(){
    const ents = state.entrainementsExcel.map(Number).filter(n => !isNaN(n));
    const comps = state.scoresExcel.map(Number).filter(n => !isNaN(n));

    function bloc(liste){
        if(liste.length === 0) return { n: 0, moy: null, max: null };
        const moy = liste.reduce((a, b) => a + b, 0) / liste.length;
        return { n: liste.length, moy: moy, max: Math.max(...liste) };
    }

    const e = bloc(ents);
    const c = bloc(comps);
    const ecart = (e.moy !== null && c.moy !== null) ? (c.moy - e.moy) : null;

    return { entrainement: e, competition: c, ecart };
}

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
        const jours = joursRestants(p.dateReelle);
        const car = texteCompteARebours(jours);

        let ligne = "🎯 Prochaine échéance : <b>" + echapperHTML(p.evenement) +
            "</b> — " + echapperHTML(p.date) + " · " + echapperHTML(p.lieu);

        if (car) {
            const proche = (jours !== null && jours >= 0 && jours <= 7);
            ligne += ' <span style="display:inline-block; margin-left:8px; padding:2px 10px; border-radius:999px; ' +
                     'background:rgba(255,255,255,.16); color:' + (proche ? '#f0cf5a' : '#fff') +
                     '; font-weight:800; font-size:.85rem;">' + car + '</span>';
        }

        bloc.innerHTML = ligne +
            '<div style="margin-top:8px; display:flex; gap:8px; flex-wrap:wrap;">' +
                '<button class="btn" style="padding:5px 12px!important; font-size:.78rem!important;" ' +
                    'onclick="exporterEvenementICS(\'' + echapperAttrJS(p.evenement) + '\', \'' +
                    echapperAttrJS(p.date) + '\', \'' + echapperAttrJS(p.mois || '') + '\', \'' +
                    echapperAttrJS(p.lieu) + '\')">📆 Agenda</button>' +
                '<a class="btn" style="padding:5px 12px!important; font-size:.78rem!important; text-decoration:none;" ' +
                    'href="' + lienItineraire(p.lieu) + '" target="_blank" rel="noopener">🗺️ Itinéraire</a>' +
            '</div>';
    }
}

export function majToolbar() {
    const libelles = {
        "tableau":     "Tableau de bord",
        "calendrier":  "Toutes",
        "resultats":   "Résultats",
        "stats":       "Statistiques",
        "top10":       "Top 10",
        "palmares":    "Palmarès",
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
