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
    return "[google.com](https://www.google.com/maps/search/?api=1&query=)" + q;
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
            '<div style="font-size:1.6rem;">🏆</div>' +
            '<div><b>Compétition dans ' + joursAvantProchaine + ' jour' + (joursAvantProchaine > 1 ? 's' : '') + ' !</b><br>' +
            '<span style="font-size:.85rem; opacity:.9;">Prépare ton matériel et vérifie ton inscription.</span></div>' +
            '</div>';
    }

    document.getElementById("etat").innerHTML = boutonRetour() +
        alerteNotification +
        '<h2>🏠 Tableau de bord</h2>' +
        '<div style="display:grid; grid-template-columns: repeat(auto-fit,minmax(220px,1fr)); gap:15px;">' +
            '<div class="card"><h3>🎯 Dernier score</h3><p style="font-size:32px; font-weight:bold;">' + dernier + '</p></div>' +
            '<div class="card"><h3>🏆 Record personnel</h3><p style="font-size:32px; font-weight:bold; color:var(--gold);">' + record + '</p></div>' +
            '<div class="card"><h3>📊 Moyenne</h3><p style="font-size:32px; font-weight:bold;">' + moyenne + '</p></div>' +
            '<div class="card"><h3>🥅 Objectif</h3><p style="font-size:32px; font-weight:bold;">' + objectif + '</p>' +
                '<div class="progress-bar-container"><div class="progress-bar-fill" style="width:' + pourcentageObjectif + '%;"></div></div>' +
                '<small style="color:var(--muted);">' + pourcentageObjectif + '% atteint</small></div>' +
        '</div>';
    afficherHero();
    majToolbar();
}

export function afficherResultats() {
    pageActuelle = "resultats";
    const tousLesScores = [];
    for (let i = 0; i < state.datesMatchs.length; i++) {
        tousLesScores.push({ date: state.datesMatchs[i], type: "compétition", score: Number(state.scoresExcel[i]) });
    }
    for (let i = 0; i < state.datesEntrainements.length; i++) {
        tousLesScores.push({ date: state.datesEntrainements[i], type: "entraînement", score: Number(state.entrainementsExcel[i]) });
    }
    tousLesScores.sort((a, b) => tsJJMM(a.date) - tsJJMM(b.date));

    if (tousLesScores.length === 0) {
        document.getElementById("etat").innerHTML = boutonRetour() + "<h2>🏆 Résultats</h2><p>Aucun score enregistré.</p>";
        majToolbar();
        return;
    }

    let html = boutonRetour() + "<h2>🏆 Résultats de la saison</h2>" +
        '<div class="filters-section"><h3>Trier / filtrer</h3><div class="filter-buttons">' +
            '<button class="filter-btn active" onclick="trierResultats(\'chrono\')">📅 Chronologique</button>' +
            '<button class="filter-btn" onclick="trierResultats(\'score\')">🎯 Meilleurs scores</button>' +
            '<button class="filter-btn" onclick="filtrerResultats(\'tous\')">Tous</button>' +
            '<button class="filter-btn" onclick="filtrerResultats(\'competition\')">Compétitions</button>' +
            '<button class="filter-btn" onclick="filtrerResultats(\'entrainement\')">Entraînements</button>' +
        '</div></div><div id="liste-resultats"></div>';

    document.getElementById("etat").innerHTML = html;
    window._resultatsBruts = tousLesScores;
    window._resultatsTri = "chrono";
    window._resultatsFiltre = "tous";
    rendreResultats();
    majToolbar();
}

export function rendreResultats() {
    const cible = document.getElementById("liste-resultats");
    if (!cible) return;
    let liste = [...(window._resultatsBruts || [])];

    if (window._resultatsFiltre === "competition") liste = liste.filter(r => r.type === "compétition");
    else if (window._resultatsFiltre === "entrainement") liste = liste.filter(r => r.type === "entraînement");

    if (window._resultatsTri === "score") liste.sort((a, b) => b.score - a.score);
    else liste.sort((a, b) => tsJJMM(a.date) - tsJJMM(b.date));

    cible.innerHTML = liste.map(r => {
        const estComp = r.type === "compétition";
        return '<div class="competition-card" style="margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; gap:12px;">' +
            '<div><div class="competition-title">' + (estComp ? "🏆" : "🏋️") + ' ' + r.date + '</div>' +
            '<div class="competition-location">' + r.type + '</div></div>' +
            '<div style="font-size:1.5rem; font-weight:800; color:' + (estComp ? 'var(--primary)' : 'var(--gold)') + ';">' + r.score + '</div>' +
        '</div>';
    }).join("") || "<p>Aucun résultat pour ce filtre.</p>";
}

export function trierResultats(mode) {
    window._resultatsTri = mode;
    document.querySelectorAll(".filter-btn").forEach(b => {
        const oc = b.getAttribute("onclick") || "";
        b.classList.toggle("active", oc.includes("'" + mode + "'"));
    });
    rendreResultats();
}

export function filtrerResultats(mode) {
    window._resultatsFiltre = mode;
    document.querySelectorAll(".filter-btn").forEach(b => {
        const oc = b.getAttribute("onclick") || "";
        if (oc.includes("trierResultats")) b.classList.remove("active");
    });
    rendreResultats();
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
            '<span>Moyenne : <b>' + moyMois + '</b> | Max : <b style="color:var(--gold);">' +
            stats.statsParMois[mois].max + '</b></span>' +
        '</div>';
    }

    /* ---- Comparatif entrainement / competition ---- */
    let htmlComparatif = "";
    const cmp = comparerEntrainementCompetition();
    if (cmp.entrainement.n > 0 || cmp.competition.n > 0) {
        function cellule(titre, d, couleur){
            if (d.n === 0) {
                return '<div class="card"><h3>' + titre + '</h3>' +
                       '<p style="font-size:28px; font-weight:bold; color:var(--muted); margin:8px 0 4px 0;">—</p>' +
                       '<small style="color:var(--muted);">Aucun tir</small></div>';
            }
            return '<div class="card" style="border-left:4px solid ' + couleur + ';">' +
                   '<h3>' + titre + '</h3>' +
                   '<p style="font-size:28px; font-weight:bold; margin:8px 0 4px 0;">' + d.moy.toFixed(1) + ' pts</p>' +
                   '<small style="color:var(--muted); font-weight:600;">' + d.n + ' tir' + (d.n > 1 ? 's' : '') +
                   ' · max ' + d.max.toFixed(1) + '</small></div>';
        }

        let lecture = "";
        if (cmp.ecart !== null) {
            const ec = cmp.ecart;
            const signe = ec >= 0 ? '+' : '';
            let texte;
            if (Math.abs(ec) < 1) {
                texte = "Même niveau en compétition qu'à l'entraînement.";
            } else if (ec >= 0) {
                texte = "Tu tires <b>mieux en compétition</b> qu'à l'entraînement.";
            } else {
                texte = "Tu perds " + Math.abs(ec).toFixed(1) + " pt" + (Math.abs(ec) > 1 ? 's' : '') + " en compétition.";
            }
            lecture = '<div style="margin-top:12px; padding:10px 14px; border-radius:12px; ' +
                      'background:rgba(255,255,255,.06); font-size:.9rem;">' +
                      '<b style="color:var(--gold);">Écart : ' + signe + ec.toFixed(1) + ' pts</b> — ' + texte +
                      '</div>';
        }

        htmlComparatif =
            '<div style="display:grid; grid-template-columns: repeat(auto-fit,minmax(220px,1fr)); gap:15px; margin-top:15px;">' +
                cellule("🏋️ Moyenne entraînement", cmp.entrainement, "#f0cf5a") +
                cellule("🏆 Moyenne compétition", cmp.competition, "#e04a3a") +
            '</div>' + lecture;
    }

    document.getElementById("etat").innerHTML = boutonRetour() +
        '<h2>📈 Statistiques & Progression</h2>' +
        '<div style="display:grid; grid-template-columns: repeat(auto-fit,minmax(220px,1fr)); gap:15px;">' +
            '<div class="card"><h3>🎯 Dernier score</h3><p style="font-size:32px; font-weight:bold;">' + stats.dernier + '</p></div>' +
            '<div class="card"><h3>🏆 Record</h3><p style="font-size:32px; font-weight:bold; color:var(--gold);">' + stats.meilleurGlobal + '</p></div>' +
            '<div class="card"><h3>📊 Moyenne saison</h3><p style="font-size:32px; font-weight:bold;">' + stats.moyenne + '</p></div>' +
            '<div class="card"><h3>📋 Résultats</h3><p style="font-size:32px; font-weight:bold;">' + stats.totalResultats + '</p></div>' +
        '</div>' +
        htmlComparatif +
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
            historiqueRecords.push({ date: item.date, score: item.score });
        }
    });

    const top10 = [...tousLesScores].sort((a, b) => b.score - a.score).slice(0, 10);

    let html = boutonRetour() + "<h2>🥇 Top 10 des meilleurs tirs</h2>";

    top10.forEach((item, idx) => {
        const medaille = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : (idx + 1) + ".";
        html += '<div class="competition-card" style="margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; gap:12px;">' +
            '<div><div class="competition-title">' + medaille + ' ' + item.date + '</div>' +
            '<div class="competition-location">' + item.type + '</div></div>' +
            '<div style="font-size:1.5rem; font-weight:800; color:var(--gold);">' + item.score + '</div>' +
        '</div>';
    });

    html += '<h2 style="margin-top:30px;">📈 Progression du record</h2>';
    historiqueRecords.forEach(item => {
        html += '<div class="monthly-stat-item">' +
            '<span>📅 ' + item.date + '</span>' +
            '<span>Nouveau record : <b style="color:var(--gold);">' + item.score + '</b></span>' +
        '</div>';
    });

    document.getElementById("etat").innerHTML = html;
    majToolbar();
}

export function afficherAjoutScore() {
    pageActuelle = "ajout";
    document.getElementById("etat").innerHTML = boutonRetour() +
        '<h2>➕ Ajouter un score</h2>' +
        '<div class="card">' +
            '<label style="display:block; margin-bottom:6px; font-weight:600;">Date</label>' +
            '<input type="date" id="ajout-date" style="width:100%; padding:10px; border-radius:10px; border:1px solid var(--border); margin-bottom:14px;">' +

            '<label style="display:block; margin-bottom:6px; font-weight:600;">Type</label>' +
            '<select id="ajout-type" style="width:100%; padding:10px; border-radius:10px; border:1px solid var(--border); margin-bottom:14px;">' +
                '<option value="entrainement">Entraînement</option>' +
                '<option value="match">Compétition</option>' +
            '</select>' +

            '<label style="display:block; margin-bottom:6px; font-weight:600;">Lieu</label>' +
            '<input type="text" id="ajout-lieu" placeholder="Nom du stand" style="width:100%; padding:10px; border-radius:10px; border:1px solid var(--border); margin-bottom:14px;">' +

            '<label style="display:block; margin-bottom:10px; font-weight:600;">Séries (total sur 600)</label>' +
            '<div style="display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap:12px;">' +
                '<input type="number" id="serie1" placeholder="S1" oninput="recalculerTotalSeries()" style="padding:10px; border-radius:10px; border:1px solid var(--border); text-align:center;">' +
                '<input type="number" id="serie2" placeholder="S2" oninput="recalculerTotalSeries()" style="padding:10px; border-radius:10px; border:1px solid var(--border); text-align:center;">' +
                '<input type="number" id="serie3" placeholder="S3" oninput="recalculerTotalSeries()" style="padding:10px; border-radius:10px; border:1px solid var(--border); text-align:center;">' +
                '<input type="number" id="serie4" placeholder="S4" oninput="recalculerTotalSeries()" style="padding:10px; border-radius:10px; border:1px solid var(--border); text-align:center;">' +
                '<input type="number" id="serie5" placeholder="S5" oninput="recalculerTotalSeries()" style="padding:10px; border-radius:10px; border:1px solid var(--border); text-align:center;">' +
                '<input type="number" id="serie6" placeholder="S6" oninput="recalculerTotalSeries()" style="padding:10px; border-radius:10px; border:1px solid var(--border); text-align:center;">' +
            '</div>' +

            '<div style="margin-top:16px; font-size:1.1rem;">Total : <b id="ajout-total">0</b> pts</div>' +
            '<div id="ajout-erreur" style="color:var(--primary); font-weight:600; margin-top:10px; min-height:20px;"></div>' +

            '<div style="display:flex; gap:10px; margin-top:16px; flex-wrap:wrap;">' +
                '<button class="btn btn-primary" onclick="enregistrerScore()">💾 Enregistrer</button>' +
                '<button class="btn" onclick="ajusterScoreRapide()">🔧 Saisir un total direct</button>' +
            '</div>' +
        '</div>';
    majToolbar();
}

export function ajusterScoreRapide() {
    const total = document.getElementById("ajout-total");
    const val = prompt("Score total sur 600 :");
    if (val === null) return;
    const n = Number(String(val).replace(",", "."));
    if (isNaN(n) || n < 0 || n > 600) {
        afficherToast("⚠️ Score invalide (0 à 600)");
        return;
    }
    if (total) total.textContent = n;
    window._scoreDirect = n;
}

export function recalculerTotalSeries() {
    let somme = 0;
    for (let i = 1; i <= 6; i++) {
        const el = document.getElementById("serie" + i);
        if (el && el.value !== "") somme += Number(el.value) || 0;
    }
    window._scoreDirect = null;
    const total = document.getElementById("ajout-total");
    if (total) total.textContent = somme;
}

export async function enregistrerScore(callbackReload) {
    const dateEl = document.getElementById("ajout-date");
    const typeEl = document.getElementById("ajout-type");
    const lieuEl = document.getElementById("ajout-lieu");
    const erreurEl = document.getElementById("ajout-erreur");
    const totalEl = document.getElementById("ajout-total");

    if (erreurEl) erreurEl.textContent = "";

    if (!dateEl || !dateEl.value) {
        if (erreurEl) erreurEl.textContent = "Choisis une date.";
        return;
    }

    const total = window._scoreDirect !== null && window._scoreDirect !== undefined
        ? Number(window._scoreDirect)
        : Number(totalEl ? totalEl.textContent : 0);

    if (!total || total < 300 || total > 600) {
        if (erreurEl) erreurEl.textContent = "Le total doit être compris entre 300 et 600.";
        return;
    }

    const [annee, mois, jour] = dateEl.value.split("-");
    const dateFR = jour + "/" + mois;

    const series = [];
    for (let i = 1; i <= 6; i++) {
        const el = document.getElementById("serie" + i);
        if (el && el.value !== "") series.push(Number(el.value));
    }

    const res = await ajouterScore({
        date: dateFR,
        type: typeEl.value,
        lieu: lieuEl.value || "",
        score: total,
        series: series
    });

    if (!res.ok) {
        const messages = {
            "existe": "Ce score existe déjà.",
            "non-connecte": res.message || "Connexion requise pour modifier."
        };
        if (erreurEl) erreurEl.textContent = messages[res.raison] || "Enregistrement impossible.";
        return;
    }

    afficherToast(res.offline ? "💾 Score gardé en local (sync à venir)" : "✅ Score enregistré");
    window._scoreDirect = null;
    if (callbackReload) await callbackReload();
    voirScores();
}

export function voirScores(callbackReload) {
    pageActuelle = "scores";
    const historique = getScoresLocaux();
    const objectif = getObjectifPersonnel();

    let html = boutonRetour() +
        '<h2>📋 Scores saisis</h2>' +
        '<div class="card" style="margin-bottom:16px;">' +
            '<label style="font-weight:600; display:block; margin-bottom:8px;">Objectif de saison</label>' +
            '<div style="display:flex; gap:10px; flex-wrap:wrap;">' +
                '<input type="number" id="objectif-input" value="' + objectif + '" style="flex:1; min-width:120px; padding:10px; border-radius:10px; border:1px solid var(--border);">' +
                '<button class="btn btn-primary" onclick="modifierObjectifPersonnel()">Enregistrer</button>' +
            '</div>' +
        '</div>';

    if (historique.length === 0) {
        html += "<p>Aucun score saisi pour le moment.</p>";
        document.getElementById("etat").innerHTML = html;
        majToolbar();
        return;
    }

    historique.forEach((item, idx) => {
        const estComp = item.type === "match";
        html += '<div class="competition-card" style="margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; gap:12px;">' +
            '<div style="min-width:0;">' +
                '<div class="competition-title">' + (estComp ? "🏆" : "🏋️") + ' ' + item.date +
                    (item.lieu ? ' · ' + echapperHTML(item.lieu) : '') + '</div>' +
                '<div class="competition-location">' + (estComp ? "Compétition" : "Entraînement") + '</div>' +
            '</div>' +
            '<div style="display:flex; align-items:center; gap:10px; flex-shrink:0;">' +
                '<div style="font-size:1.4rem; font-weight:800; color:' + (estComp ? 'var(--primary)' : 'var(--gold)') + ';">' + item.score + '</div>' +
                '<button class="btn" style="padding:4px 12px!important; font-size:1.1rem!important;" onclick="supprimerScore(' + idx + ')">🗑️</button>' +
            '</div>' +
        '</div>';
    });

    document.getElementById("etat").innerHTML = html;
    majToolbar();
}

export async function supprimerScore(index, callbackReload) {
    confirmer("Supprimer ce score ?", async () => {
        const res = await supprimerScoreParIndex(index);
        if (!res.ok) {
            if (res.raison === "non-connecte") {
                afficherToast("🔒 " + (res.message || "Connexion requise"));
            } else {
                afficherToast("❌ Erreur lors de la suppression");
            }
            return;
        }
        afficherToast("🗑️ Score supprimé");
        if (callbackReload) await callbackReload();
        voirScores();
    }, "Supprimer");
}

export function modifierObjectifPersonnel() {
    const el = document.getElementById("objectif-input");
    if (!el) return;
    const val = Number(el.value);
    if (isNaN(val) || val < 300 || val > 700) {
        afficherToast("⚠️ Objectif invalide (300 à 700)");
        return;
    }
    setObjectifPersonnel(val);
    afficherToast("🎯 Objectif mis à jour : " + val + " pts");
}

export function exporterScoresJSON() {
    const scores = getScoresLocaux();
    const blob = new Blob([JSON.stringify(scores, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "scores_tir_cecillya_" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    afficherToast("💾 Export JSON téléchargé");
}

export function exporterScoresExcel() {
    const scores = getScoresLocaux();
    if (scores.length === 0) {
        afficherToast("⚠️ Aucun score à exporter");
        return;
    }

    const lignes = scores.map(s => ({
        Date: s.date,
        Type: s.type === "match" ? "Compétition" : "Entraînement",
        Lieu: s.lieu || "",
        Score: s.score,
        Séries: Array.isArray(s.series) ? s.series.join(" - ") : ""
    }));

    const feuille = XLSX.utils.json_to_sheet(lignes);
    const classeur = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(classeur, feuille, "Scores");
    XLSX.writeFile(classeur, "scores_tir_cecillya_" + new Date().toISOString().slice(0, 10) + ".xlsx");
    afficherToast("📊 Export Excel téléchargé");
}

export function importerScoresJSON(event, callbackReload) {
    const fichier = event.target.files && event.target.files[0];
    if (!fichier) return;

    const lecteur = new FileReader();
    lecteur.onload = async (e) => {
        try {
            const donnees = JSON.parse(e.target.result);
            if (!Array.isArray(donnees)) throw new Error("format");

            const existants = getScoresLocaux();
            let ajoutes = 0;
            let doublons = 0;

            donnees.forEach(item => {
                if (!item || !item.date || item.score === undefined) return;
                const deja = existants.some(x =>
                    x.date === item.date &&
                    x.type === item.type &&
                    Number(x.score) === Number(item.score)
                );
                if (deja) {
                    doublons++;
                    return;
                }

                const droit = { autorise: true };
                existants.push({
                    date: item.date,
                    type: item.type || "entrainement",
                    lieu: item.lieu || "",
                    score: Number(item.score),
                    note: item.note || "",
                    series: item.series || []
                });
                ajoutes++;
            });

            if (ajoutes > 0) {
                setScoresLocaux(existants);
            }

            afficherToast("✅ " + ajoutes + " score(s) importé(s)" + (doublons > 0 ? ", " + doublons + " doublon(s) ignoré(s)" : ""));
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
