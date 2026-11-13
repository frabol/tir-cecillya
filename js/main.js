import { synchroniserScores } from './storage.js';
import { chargerDonneesExcelEtCalendrier, appliquerFiltresCalendrier, exporterEvenementICS } from './calendar.js';
import {
    pageActuelle,
    afficherToast,
    afficherCalendrier,
    filtrerParDiscipline,
    afficherTableauDeBord,
    modifierObjectifPersonnel,
    afficherResultats,
    ajusterScoreRapide,
    recalculerTotalSeries,
    afficherAjoutScore,
    enregistrerScore,
    voirScores,
    supprimerScore,
    afficherStats,
    afficherTop10,
    exporterScoresJSON,
    exporterScoresExcel,
    importerScoresJSON
} from './ui.js';

let syncEnCours = false;

export async function synchroniserEtRecharger(silencieux = false) {
    if (syncEnCours) return;
    syncEnCours = true;
    const badge = document.getElementById("sync-badge");
    if (badge) {
        badge.textContent = "🔄 Sync…";
        badge.classList.add("syncing");
    }
    const scrollY = window.scrollY;
    const rechercheActive = document.getElementById("recherche") ? document.getElementById("recherche").value : "";

    try {
        await synchroniserScores();
        await chargerDonneesExcelEtCalendrier("avenir");

        switch (pageActuelle) {
            case "stats": afficherStats(); break;
            case "resultats": afficherResultats(); break;
            case "top10": afficherTop10(); break;
            case "calendrier": await afficherCalendrier("avenir"); break;
            default: afficherTableauDeBord();
        }
        if (!silencieux) afficherToast("✅ Synchronisation terminée");
    } finally {
        syncEnCours = false;
        if (badge) {
            badge.textContent = "● À jour";
            badge.classList.remove("syncing");
        }
        window.scrollTo(0, scrollY);
        const r = document.getElementById("recherche");
        if (r && rechercheActive) r.value = rechercheActive;
    }
}

// Exposition globale des fonctions appelées par les attributs onclick/onkeyup du HTML
window.synchroniserEtRecharger = synchroniserEtRecharger;
window.afficherTableauDeBord = afficherTableauDeBord;
window.afficherToutes = () => afficherCalendrier("toutes");
window.afficherAVenir = () => afficherCalendrier("avenir");
window.afficherResultats = afficherResultats;
window.afficherStats = afficherStats;
window.afficherTop10 = afficherTop10;
window.afficherAjoutScore = afficherAjoutScore;
window.enregistrerScore = enregistrerScore;
window.voirScores = voirScores;
window.supprimerScore = (index) => supprimerScore(index, () => synchroniserEtRecharger(true));
window.modifierObjectifPersonnel = modifierObjectifPersonnel;
window.filtrerParDiscipline = filtrerParDiscipline;
window.rechercherCompetition = appliquerFiltresCalendrier;
window.ajusterScoreRapide = ajusterScoreRapide;
window.recalculerTotalSeries = recalculerTotalSeries;
window.exporterScores = exporterScoresJSON;
window.exporterExcel = exporterScoresExcel;
window.importerScores = (event) => importerScoresJSON(event, () => chargerDonneesExcelEtCalendrier("avenir"));
window.exporterEvenementICS = (titre, dateBrute, moisBrut, lieu) =>
    exporterEvenementICS(titre, dateBrute, moisBrut, lieu, afficherToast);

async function initialiserApplication() {
    const theme = localStorage.getItem("theme");
    if (theme === "dark") {
        document.body.classList.add("dark");
        document.documentElement.setAttribute("data-theme", "dark");
    }
    await synchroniserScores();
    await chargerDonneesExcelEtCalendrier("avenir");
    afficherTableauDeBord();

    if (!window._intervalSync) {
        window._intervalSync = setInterval(() => {
            synchroniserEtRecharger(true);
        }, 60000);
    }
}

initialiserApplication();
