import * as timer from './timer.js';
import { state, chargerDonneesExcelEtCalendrier, exporterEvenementICS as exporterEvenementICSBase } from './calendar.js';
import { synchroniserScores, seConnecter, seDeconnecter, estConnecte, verifierEcriture } from './storage.js';
import * as ui from './ui.js';
import { afficherPalmares, filtrerPalmares } from './palmares.js';

export function exporterEvenementICS(titre, dateBrute, moisBrut, lieu) {
    exporterEvenementICSBase(titre, dateBrute, moisBrut, lieu, (m) => ui.afficherToast(m));
}

export async function synchroniserEtRecharger() {
    ui.afficherToast("Synchronisation en cours...");
    try {
        try { await synchroniserScores(); } catch (e) { console.warn("Sync Supabase ignorée :", e); }
        await chargerDonneesExcelEtCalendrier("avenir");
        ui.afficherToast("Synchronisation réussie !");
        if (typeof window._majAttenteSync === "function") window._majAttenteSync();
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
        } else if (ui.pageActuelle === "palmares") {
            afficherPalmares();
        } else if (ui.pageActuelle === "timer") {
            timer.afficherTimer();
        }
    } catch (e) {
        ui.afficherToast("Erreur de synchronisation");
        console.error(e);
    }
}

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

export async function majEtatConnexion() {
    const btn = document.getElementById("btn-connexion");
    if (!btn) return;
    const connecte = await estConnecte();
    btn.classList.toggle("connecte", connecte);
    btn.innerHTML = connecte
        ? '<span class="ic ic-red"><svg class="svgi" aria-hidden="true" focusable="false"><use href="#i-check"/></svg></span> Connecté'
        : '<span class="ic ic-navy"><svg class="svgi" aria-hidden="true" focusable="false"><use href="#i-lock"/></svg></span> Connexion';
}

export async function ouvrirModaleConnexion() {
    if (await estConnecte()) {
        await seDeconnecter();
        await majEtatConnexion();
        ui.afficherToast("Déconnecté — mode lecture seule");
        return;
    }

    const existante = document.getElementById("modale-connexion");
    if (existante) existante.remove();

    const modale = document.createElement("div");
    modale.id = "modale-connexion";
    modale.innerHTML = `
      <div class="modale-fond" data-fermer></div>
      <div class="modale-boite">
        <h3 class="modale-titre">Connexion</h3>
        <p class="modale-sous-titre">Pour ajouter ou supprimer des scores.</p>
        <input type="email" id="conn-email" class="conn-champ" autocomplete="username" placeholder="Email">
        <input type="password" id="conn-mdp" class="conn-champ" autocomplete="current-password" placeholder="Mot de passe">
        <p class="conn-erreur" id="conn-erreur" hidden></p>
        <div class="modale-actions">
          <button class="btn" data-fermer>Annuler</button>
          <button class="btn btn-primary" id="conn-valider">Se connecter</button>
        </div>
      </div>`;
    document.body.appendChild(modale);

    modale.querySelectorAll("[data-fermer]").forEach(el => {
        el.addEventListener("click", () => modale.remove());
    });

    const champEmail = modale.querySelector("#conn-email");
    const champMdp = modale.querySelector("#conn-mdp");
    const erreur = modale.querySelector("#conn-erreur");

    async function valider() {
        erreur.hidden = true;
        const res = await seConnecter(champEmail.value, champMdp.value);
        if (!res.ok) {
            erreur.textContent = res.message;
            erreur.hidden = false;
            return;
        }
        modale.remove();
        await majEtatConnexion();
        ui.afficherToast("Connecté — écriture autorisée");
    }

    modale.querySelector("#conn-valider").addEventListener("click", valider);
    modale.addEventListener("keydown", (e) => {
        if (e.key === "Enter") valider();
        if (e.key === "Escape") modale.remove();
    });
    champEmail.focus();
}

// Pont global pour le HTML (onclick)
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
window.filtrerMoisCalendrier = ui.filtrerMoisCalendrier;
window.trierResultats = ui.trierResultats;
window.filtrerResultats = ui.filtrerResultats;
window.afficherPalmares = afficherPalmares;
window.filtrerPalmares = filtrerPalmares;
window.exporterEvenementICS = exporterEvenementICS;
window.ajusterScoreRapide = ui.ajusterScoreRapide;
window.recalculerTotalSeries = ui.recalculerTotalSeries;
window.enregistrerScore = ui.enregistrerScore;
window.supprimerScore = (index) => ui.supprimerScore(index, initApp);
window.modifierObjectifPersonnel = ui.modifierObjectifPersonnel;
window.ouvrirModaleConnexion = ouvrirModaleConnexion;

// Pont Global pour le Timer
window.afficherTimer = timer.afficherTimer;
window.appliquerPresetTimer = timer.appliquerPresetTimer;
window.demarrerPauseTimer = timer.demarrerPauseTimer;
window.resetTimer = timer.resetTimer;
window.changerPhaseTimer = timer.changerPhaseTimer;
window.ajusterTempsTimer = timer.ajusterTempsTimer;
window.testerSonTimer = timer.testerSonTimer;

export async function initApp() {
    try {
        try { await synchroniserScores(); } catch (e) { console.warn("Sync Supabase ignorée :", e); }
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
        } else if (ui.pageActuelle === "palmares") {
            afficherPalmares();
        }
        await majEtatConnexion();
        if (typeof window._majAttenteSync === "function") window._majAttenteSync();
    } catch (e) {
        console.error("Erreur d'initialisation :", e);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    initApp();
});
