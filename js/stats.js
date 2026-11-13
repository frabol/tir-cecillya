import { state } from './calendar.js';
import { getObjectifPersonnel } from './storage.js';

let graphiqueInstance = null;

export function dateFRversTS(d) {
    try {
        const p = String(d).split("/");
        if (p.length < 2) return 0;
        const j = parseInt(p[0], 10), m = parseInt(p[1], 10);
        if (!j || !m) return 0;
        return new Date(2026, m - 1, j).getTime();
    } catch (e) { return 0; }
}

export function calculerStatistiques() {
    const scores = [...state.scoresExcel, ...state.entrainementsExcel];
    if (scores.length === 0) return null;

    const meilleurGlobal = Math.max(...scores);
    const moyNum = scores.reduce((a, b) => a + b, 0) / scores.length;
    const moyenne = moyNum.toFixed(1);
    const totalResultats = state.scoresExcel.length + state.entrainementsExcel.length;
    const objectif = getObjectifPersonnel();

    const derniers5 = scores.slice(-5);
    const moyenne5 = (derniers5.reduce((a, b) => a + b, 0) / derniers5.length).toFixed(1);
    const diffForme = (Number(moyenne5) - Number(moyenne)).toFixed(1);
    const badgeForme = Number(diffForme) >= 0 ? `+${diffForme} pts vs saison` : `${diffForme} pts vs saison`;

    const variance = scores.reduce((acc, val) => acc + Math.pow(val - moyNum, 2), 0) / scores.length;
    const ecartType = Math.sqrt(variance).toFixed(2);
    const appreciationRegularite = Number(ecartType) <= 3.5 ? "Très régulier" : Number(ecartType) <= 6.0 ? "Régulier" : "Variable";

    const tousLesScoresDetailles = [];
    for (let i = 0; i < state.datesMatchs.length; i++) {
        tousLesScoresDetailles.push({ date: state.datesMatchs[i], score: state.scoresExcel[i] });
    }
    for (let i = 0; i < state.datesEntrainements.length; i++) {
        tousLesScoresDetailles.push({ date: state.datesEntrainements[i], score: state.entrainementsExcel[i] });
    }

    const statsParMois = {};
    const nomsMois = {
        "09": "Septembre 2026", "10": "Octobre 2026", "11": "Novembre 2026", "12": "Décembre 2026",
        "01": "Janvier 2027", "02": "Février 2027", "03": "Mars 2027", "04": "Avril 2027",
        "05": "Mai 2027", "06": "Juin 2027"
    };

    tousLesScoresDetailles.forEach(item => {
        const parts = item.date.split("/");
        if (parts.length === 2) {
            const moisKey = parts[1];
            const libelleMois = nomsMois[moisKey] || `Mois ${moisKey}`;
            if (!statsParMois[libelleMois]) {
                statsParMois[libelleMois] = { somme: 0, count: 0, max: 0 };
            }
            statsParMois[libelleMois].somme += item.score;
            statsParMois[libelleMois].count += 1;
            if (item.score > statsParMois[libelleMois].max) {
                statsParMois[libelleMois].max = item.score;
            }
        }
    });

    const dernier = tousLesScoresDetailles.length > 0 ? tousLesScoresDetailles[tousLesScoresDetailles.length - 1].score : 0;

    return {
        dernier,
        meilleurGlobal,
        moyenne,
        totalResultats,
        objectif,
        moyenne5,
        badgeForme,
        ecartType,
        appreciationRegularite,
        statsParMois
    };
}

export function dessinerGraphique(canvasId) {
    if (graphiqueInstance) {
        try { graphiqueInstance.destroy(); } catch (e) {}
        graphiqueInstance = null;
    }

    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const objectif = getObjectifPersonnel();
    const events = [];
    for (let i = 0; i < state.datesMatchs.length; i++) {
        events.push({ date: state.datesMatchs[i], ts: dateFRversTS(state.datesMatchs[i]), score: Number(state.scoresExcel[i]), type: "match", idx: i });
    }
    for (let i = 0; i < state.datesEntrainements.length; i++) {
        events.push({ date: state.datesEntrainements[i], ts: dateFRversTS(state.datesEntrainements[i]), score: Number(state.entrainementsExcel[i]), type: "entrainement", idx: i });
    }
    events.sort((a, b) => (a.ts - b.ts) || (a.idx - b.idx));

    const compteDate = {};
    const labels = events.map(e => {
        compteDate[e.date] = (compteDate[e.date] || 0) + 1;
        return compteDate[e.date] > 1 ? `${e.date} (${compteDate[e.date]})` : e.date;
    });
    const serieMatchs = events.map(e => e.type === "match" ? e.score : null);
    const serieEntrainements = events.map(e => e.type === "entrainement" ? e.score : null);
    const serieObjectif = events.map(() => objectif);

    const allScores = [...state.scoresExcel, ...state.entrainementsExcel, objectif];
    const minY = allScores.length > 0 ? Math.floor(Math.min(...allScores) / 10) * 10 - 10 : 500;
    const maxY = allScores.length > 0 ? Math.ceil(Math.max(...allScores) / 10) * 10 + 10 : 650;

    graphiqueInstance = new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [
                {
                    label: "Compétitions",
                    data: serieMatchs,
                    borderColor: "#2563eb",
                    backgroundColor: "rgba(37, 99, 235, 0.12)",
                    borderWidth: 3.5,
                    tension: 0.35,
                    fill: true,
                    spanGaps: true,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    pointBackgroundColor: "#2563eb",
                    pointBorderColor: "#ffffff",
                    pointBorderWidth: 2
                },
                {
                    label: "Entraînements",
                    data: serieEntrainements,
                    borderColor: "#10b981",
                    backgroundColor: "rgba(16, 185, 129, 0.12)",
                    borderWidth: 3.5,
                    tension: 0.35,
                    fill: true,
                    spanGaps: true,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    pointBackgroundColor: "#10b981",
                    pointBorderColor: "#ffffff",
                    pointBorderWidth: 2
                },
                {
                    label: `Objectif (${objectif} pts)`,
                    data: serieObjectif,
                    borderColor: "#f5b301",
                    borderWidth: 2,
                    borderDash: [6, 6],
                    pointRadius: 0,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            plugins: {
                legend: {
                    labels: { font: { size: 13, weight: "bold" }, usePointStyle: true, boxWidth: 8 }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleFont: { size: 13, weight: 'bold' },
                    bodyFont: { size: 12 },
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: true
                }
            },
            scales: {
                y: {
                    min: minY,
                    max: maxY,
                    grid: { color: "rgba(100, 116, 139, 0.1)" },
                    ticks: { font: { size: 11 }, color: "#64748b" }
                },
                x: {
                    grid: { display: false },
                    ticks: { font: { size: 11 }, color: "#64748b", maxRotation: 45 }
                }
            }
        }
    });
}
