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
   Utilise par le bandeau de la prochaine echeance sur le
   tableau de bord. Les deux valeurs sont lues a chaque affichage,
   donc elles restent justes meme si l'appli reste ouverte.
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

/* Lien d'itineraire : on ouvre Google Maps sur le nom du lieu.
   Le club organisateur est dans le calendrier, pas en coordonnees,
   donc on passe par une recherche par texte. */
export function lienItineraire(lieu){
    const q = encodeURIComponent(String(lieu || "") + " France");
    return "https://www.google.com/maps/search/?api=1&query=" + q;
}

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
        const jours = joursRestants(p.dateReelle);
        const car = texteCompteARebours(jours);

        let ligne = "🎯 Prochaine échéance : <b>" + echapperHTML(p.evenement) +
            "</b> — " + echapperHTML(p.date) + " · " + echapperHTML(p.lieu);

        if (car) {
            const couleur = (jours !== null && jours >= 0 && jours <= 7) ? "#f0cf5a" : "#fff";
            ligne += " <span style=\"display:inline-block; margin-left:8px; padding:2px 10px; border-radius:999px; " +
                     "background:rgba(255,255,255,.16); color:" + couleur + "; font-weight:800; font-size:.85rem;\">" +
                     car + "</span>";
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

export function boutonRetour() {
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

/* Moyennes separees : entrainement d'un cote, competition de l'autre.
   C'est le comparatif qui montre la gestion du stress en match. */
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

            const p0 = state.prochainesCompetitions[0];
            const car0 = texteCompteARebours(joursRestants(p0.dateReelle));

            html += '<div class="next-match-card">' +
                    '<h2>' + titreEncart + (car0 ? ' <span style="font-size:.85rem; opacity:.9;">— ' + car0 + '</span>' : '') + '</h2>' +
                    '<div style="font-size: 0.9em; color: #f0cf5a; font-weight: 700; margin-bottom: 10px;">' +
                        '📅 ' + p0.date + ' (' + p0.mois + ')' +
                    '</div>' +
                    '<div style="display: flex; flex-direction: column; gap: 10px;">';

            state.prochainesCompetitions.forEach((comp, idx) => {
                const borderStyle = idx > 0 ? "border-top: 1px solid rgba(255,255,255,0.12); padding-top: 10px;" : "";
                const car = texteCompteARebours(joursRestants(comp.dateReelle));
                html += '<div style="' + borderStyle + '">' +
                            '<div style="font-size: 1.1em; font-weight: bold; color: #fff;">' + comp.evenement +
                                (car ? ' <span style="font-size:.8rem; color:#f0cf5a;">(' + car + ')</span>' : '') +
                            '</div>' +
                            '<div style="font-size: 0.9em; color: #f3ded8; margin-top: 2px;">📍 ' + comp.lieu + '</div>' +
                            '<div style="margin-top:6px;">' +
                                '<a class="btn" style="padding:5px 12px!important; font-size:.78rem!important; text-decoration:none;" ' +
                                    'href="' + lienItineraire(comp.lieu) + '" target="_blank" rel="noopener">🗺️ Itinéraire</a>' +
                            '</div>' +
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
