let scoresExcel = [];

async function chargerCalendrier() {

    try {

        const response = await fetch(
            "Calendrier_Ligue_Tir_NPdC_2026_2027_dernier.xlsx?v=" + Date.now()
        );

        const data = await response.arrayBuffer();

        const workbook = XLSX.read(data);
        const sheetGraph =
    workbook.Sheets["Chart Data"];

const donneesGraph =
    XLSX.utils.sheet_to_json(
        sheetGraph,
        { header: 1 }
    );

scoresExcel = [];

for (let i = 1; i < donneesGraph.length; i++) {

    const score = donneesGraph[i][1];

const valeur = Number(score);

if (
    !isNaN(valeur) &&
    valeur >= 300
) {

    scoresExcel.push(valeur);

}
        const sheet = workbook.Sheets["Calendrier 2026-2027"];

        const lignes = XLSX.utils.sheet_to_json(sheet, {
            header: 1
        });

        let html = "<h3>📅 Compétitions à venir</h3>";

        let compteur = 0;

        for (let i = 4; i < lignes.length; i++) {

            const ligne = lignes[i];

            if (!ligne) continue;

            const date = ligne[1];
            const evenement = ligne[2];
            const lieu = ligne[3];
            const statut = ligne[5];

            if (evenement && statut === "À venir") {

                html += `
                <div class="competition"
                style="padding:10px;border-bottom:1px solid #ddd;">

                    <b>${date || ""}</b><br>

                    ${evenement}<br>

                    📍 ${lieu || "-"}<br>

                    ✅ ${statut}

                </div>
                `;

                compteur++;

                if (compteur >= 20) break;
            }
        }

        document.getElementById("etat").innerHTML = html;

    }
    catch (erreur) {

        document.getElementById("etat").innerHTML =
            "❌ Erreur : " + erreur.message;

    }
}

chargerCalendrier();


function afficherToutes() {

    chargerCalendrier();

}



function afficherAVenir() {

    chargerCalendrier();

}



function afficherResultats() {

    document.getElementById("etat").innerHTML = `

    <h2>🏆 Résultats</h2>

    <div class="competition">
        <b>Tournoi Nord 10m 1er tour</b><br>
        Score : 604.1
    </div>

    <div class="competition">
        <b>Tournoi du Hainaut</b><br>
        Score : 407
    </div>

    <div class="competition">
        <b>Nord 10m 2ème tour</b><br>
        Score : 600.3
    </div>

    <div class="competition">
        <b>Entraînement</b><br>
        Score : 617.5
    </div>

    `;
}



function afficherStats() {

  const scores = scoresExcel;
    if (scores.length === 0) {

    document.getElementById("etat").innerHTML =
        "Aucun score trouvé.";

    return;
}

    const meilleur = Math.max(...scores);

    const dernier = scores[scores.length - 1];

    const moyenne =
        (
            scores.reduce((a, b) => a + b, 0)
            / scores.length
        ).toFixed(1);

    document.getElementById("etat").innerHTML = `

        <h2>📈 Statistiques</h2>

        <p>🏆 Meilleur score : <b>${meilleur}</b></p>

        <p>🎯 Dernier score : <b>${dernier}</b></p>

        <p>📊 Moyenne : <b>${moyenne}</b></p>

        <p>📋 Nombre de résultats : <b>${scores.length}</b></p>

        <canvas id="graphiqueScores"></canvas>

    `;

    const ctx =
        document.getElementById("graphiqueScores");

    new Chart(ctx, {

        type: "line",

        data: {

            labels: [
                "1",
                "2",
                "3",
                "4",
                "5",
                "6",
                "7",
                "8",
                "9"
            ],

            datasets: [{

                label: "Progression",

                data: scores,

                borderColor: "#17365D",

                backgroundColor:
                "rgba(23,54,93,0.2)",

                fill: true,

                tension: 0.3

            }]
        }
    });
}
