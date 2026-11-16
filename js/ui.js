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

export function afficherHero() {