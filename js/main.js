import { state, chargerDonneesExcelEtCalendrier, synchroniserEtRecharger, exporterEvenementICS } from './calendar.js';
import * as ui from './ui.js';

// Fonction de recherche de compétition intégrée directement pour éviter les erreurs d'import
export function rechercherCompetition() {
    const input = document.getElementById("recherche");
    if (!input) return;
    const filtre = input.value.toLowerCase();
    const elements = document.querySelectorAll(".competition-card");
    
    elements.forEach(el => {
        const texte = el.getAttribute("data-texte") || "";
        if (texte.includes(filtre)) {
            el.style.display = "";
        } else {
            el.style.display = "none";
        }
    });
}

// Rendre toutes les fonctions accessibles globalement pour le HTML (onclick)
window.afficherTableauDeBord = ui.afficherTableauDeBord;
window.afficherToutes = () => ui.afficherCalendrier("toutes");
window.afficherAVenir = () => ui.afficherCalendrier("avenir");
window.afficherResultats = ui.afficherResultats;
window.afficherStats = ui.afficherStats;
window.afficherTop10 = ui.afficherTop10;
window.afficherAjoutScore = ui.afficherAjoutScore;
window.voirScores = ui.voirScores;
window.exporterScores = ui.exporterScoresJSON;
window.exporterExcel = ui.exporterScoresExcel;
window.importerScores = (e) => ui.importerScoresJSON(e, initApp);
window.synchroniserEtRecharger = synchroniserEtRecharger;
window.rechercherCompetition = rechercherCompetition;
window.filtrerParDiscipline = ui.filtrerParDiscipline;
window.exporterEvenementICS = exporterEvenementICS;
window.ajusterScoreRapide = ui.ajusterScoreRapide;
window.recalculerTotalSeries = ui.recalculerTotalSeries;
window.enregistrerScore = ui.enregistrerScore;
window.supprimerScore = (index) => ui.supprimerScore(index, initApp);
window.modifierObjectifPersonnel = ui.modifierObjectifPersonnel;

export async function initApp() {
    try {
        await chargerDonneesExcelEtCalendrier("avenir");
        if (ui.pageActuelle === "tableau") {
            ui.afficherTableauDeBord();
        } else if (ui.pageActuelle === "calendrier") {
            ui.afficherCalendrier("avenir");
        } else if (ui.pageActuelle === "resultats") {
            ui.afficherResultats();
        } else if (ui.pageActuelle === "stats") {
            ui.afficherStats();
        } else if (ui.pageActuelle === "top10") {
            ui.afficherTop10();
        }
    } catch (e) {
        console.error("Erreur d'initialisation :", e);
    }
}

// Lancement au chargement de la page
document.addEventListener("DOMContentLoaded", () => {
    initApp();
});
