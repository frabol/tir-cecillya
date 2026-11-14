import { getScoresLocaux } from './storage.js';

export const state = {
    scoresExcel: [],
    entrainementsExcel: [],
    datesMatchs: [],
    datesEntrainements: [],
    prochainesCompetitions: [],
    toutesCompetitionsCalendrier: [],
    lieuxParDate: {},
    lieuxParResultat: {},
    filtreDisciplineActif: "all"
};
function determinerLieu(evenement, lieu) {

    const lieuNettoye = String(lieu || "").trim();

    if (
        lieuNettoye &&
        lieuNettoye !== "SUIVANT ZONES"
    ) {
        return lieuNettoye;
    }

    const match = String(evenement || "")
        .match(/\(([^)]+)\)/);

    if (match) {
        return match[1];
    }

    return lieuNettoye || "Lieu non spécifié";
}
export function exporterEvenementICS(titre, dateBrute, moisBrut, lieu, afficherToast) {
    const moisMap = {
        "septembre": "09", "octobre": "10", "novembre": "11", "décembre": "12",
        "janvier": "01", "février": "02", "mars": "03", "avril": "04",
        "mai": "05", "juin": "06", "juillet": "07", "août": "08"
    };
    const mStr = String(moisBrut || "").toLowerCase();
    let moisNum = "09";
    for (const [k, v] of Object.entries(moisMap)) {
        if (mStr.includes(k)) { moisNum = v; break; }
    }
    const anneeMatch = mStr.match(/20\d{2}/);
    const annee = anneeMatch ? anneeMatch[0] : (Number(moisNum) >= 9 ? "2026" : "2027");
    const jourMatch = String(dateBrute || "").match(/\d{1,2}/);
    const jour = jourMatch ? jourMatch[0].padStart(2, "0") : "01";

    const dateDebut = `${annee}${moisNum}${jour}`;
    const icsContent = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Tir Cecillya//Calendrier Ligue NPdC//FR",
        "BEGIN:VEVENT",
        `UID:tir-cecillya-${dateDebut}-${Date.now()}@npdc`,
        `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
        `DTSTART;VALUE=DATE:${dateDebut}`,
        `SUMMARY:${titre.replace(/[,;]/g, " ")}`,
        `LOCATION:${(lieu || "Lieu non spécifié").replace(/[,;]/g, " ")}`,
        "DESCRIPTION:Compétition Ligue de Tir Nord-Pas-de-Calais (Tir Cécillya)",
        "END:VEVENT",
        "END:VCALENDAR"
    ].join("\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `competition_${dateDebut}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (afficherToast) afficherToast("📅 Événement téléchargé pour votre agenda !");
}

export async function chargerDonneesExcelEtCalendrier(filtre = "avenir") {
    const response = await fetch("Calendrier_Ligue_Tir_NPdC_2026_2027_dernier.xlsx?v=" + Date.now());
    const data = await response.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheetGraph = workbook.Sheets["Chart Data"];
    const donneesGraph = XLSX.utils.sheet_to_json(sheetGraph, { header: 1 });

    state.scoresExcel = [];
    state.entrainementsExcel = [];
    state.datesMatchs = [];
    state.datesEntrainements = [];

    for (let i = 1; i < donneesGraph.length; i++) {
        if (!donneesGraph[i]) continue;

        const dateMatchExcel = donneesGraph[i][9];
        const score = donneesGraph[i][10];
        const dateEntrainementExcel = donneesGraph[i][15];
        const entrainement = donneesGraph[i][16];

        let dateMatch = "";
        let dateEntrainement = "";

        if (dateMatchExcel) {
            if (typeof dateMatchExcel === "number") {
                const jsDate = new Date((dateMatchExcel - 25569) * 86400 * 1000);
                dateMatch = jsDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
            } else {
                dateMatch = String(dateMatchExcel);
            }
        }

        if (typeof dateEntrainementExcel === "number") {
            const jsDate = new Date((dateEntrainementExcel - 25569) * 86400 * 1000);
            dateEntrainement = jsDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
        }

        const valeurEntrainement = Number(entrainement);
        if (!isNaN(valeurEntrainement) && valeurEntrainement >= 300) {
            if (dateEntrainement) state.datesEntrainements.push(dateEntrainement);
            state.entrainementsExcel.push(valeurEntrainement);
        }

        const valeur = Number(score);
        if (!isNaN(valeur) && valeur >= 300) {
            if (dateMatch) state.datesMatchs.push(dateMatch);
            if (valeur < 500) {
                state.scoresExcel.push(Number((valeur * 60 / 40).toFixed(1)));
            } else {
                state.scoresExcel.push(valeur);
            }
        }
    }

    const historique = getScoresLocaux();
    historique.forEach(item => {
        let date = item.date;
        if (item.date.includes("-")) {
            const morceaux = item.date.split("-");
            date = morceaux[2] + "/" + morceaux[1];
        }
        if (item.type === "match") {
            state.datesMatchs.push(date);
            state.scoresExcel.push(Number(item.score));
        } else {
            state.datesEntrainements.push(date);
            state.entrainementsExcel.push(Number(item.score));
        }
    });

    const sheet = workbook.Sheets["Calendrier 2026-2027"];
    const lignes = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    state.prochainesCompetitions = [];
    state.toutesCompetitionsCalendrier = [];
    state.lieuxParDate = {};
    let dateProchainMatch = null;
    let moisCourantRecherche = "";

    for (let i = 3; i < lignes.length; i++) {
        const ligne = lignes[i];
        if (!ligne) continue;
        if (ligne[0]) moisCourantRecherche = ligne[0];

        const date = ligne[1];
        const evenement = ligne[2];
        const lieuBrut = ligne[3];
        const lieu = determinerLieu(evenement, lieuBrut);
        const statut = ligne[5];
        const dateReelle = ligne[4];
    if (dateReelle && lieu) {

    const match = String(dateReelle)
        .match(/(\d{2})\/(\d{2})\/\d{4}/);

    if (match) {

        const cle = `${match[1]}/${match[2]}`;

        state.lieuxParResultat[cle] = lieu;
    }
}
       if (evenement) {

    if (date && lieu) {
        state.lieuxParDate[String(date).trim()] = String(lieu).trim();
    }

    state.toutesCompetitionsCalendrier.push({
        mois: moisCourantRecherche,
        date,
        evenement,
        lieu,
        statut,
        dateReelle
    });

            if (statut === "À venir") {
                if (!dateProchainMatch) {
                    dateProchainMatch = `${moisCourantRecherche}|${date}`;
                }
                if (`${moisCourantRecherche}|${date}` === dateProchainMatch) {
                    state.prochainesCompetitions.push({
                        mois: moisCourantRecherche,
                        date: date || "",
                        evenement: evenement,
                        lieu: lieu || "Lieu non spécifié",
                        dateReelle: dateReelle || ""
                    });
                }
            }
        }
    }

    return lignes;
}

export function appliquerFiltresCalendrier() {
    const champRecherche = document.getElementById("recherche");
    const texteRecherche = champRecherche ? champRecherche.value.toLowerCase() : "";
    const cartes = document.querySelectorAll(".competition");
    const f = state.filtreDisciplineActif;

    cartes.forEach(carte => {
        const texte = (carte.getAttribute("data-texte") || carte.innerText).toLowerCase();

        let okDiscipline = true;
        if (f === "pistolet") {
            okDiscipline = texte.includes("pistolet") || texte.includes("p10") || texte.includes("pv") || texte.includes("p std");
        } else if (f === "carabine10m") {
            okDiscipline = (texte.includes("carabine") || texte.includes("c10")) && !texte.includes("50m") && !texte.includes("300m");
        } else if (f === "carabine50m") {
            okDiscipline = texte.includes("50m") || texte.includes("300m") || texte.includes("carabine 50");
        } else if (f === "10m") {
            okDiscipline = texte.includes("10m") || texte.includes("c10") || texte.includes("p10");
        } else if (f === "25m") {
            okDiscipline = texte.includes("25m");
        } else if (f !== "all") {
            okDiscipline = texte.includes(f);
        }

        const okRecherche = texte.includes(texteRecherche);
        carte.style.display = (okDiscipline && okRecherche) ? "flex" : "none";
    });
}
