let scoresExcel = [];
let entrainementsExcel = [];
let datesMatchs = [];
let datesEntrainements = [];

async function chargerCalendrier(filtre = "avenir") {

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
entrainementsExcel = [];       
datesMatchs = [];
datesEntrainements = [];
        
for (let i = 1; i < donneesGraph.length; i++) {

/* MATCHS : J / K */

const dateMatchExcel =
    donneesGraph[i][9];


const score =
    donneesGraph[i][10];

/* ENTRAINEMENTS : P / Q */

const dateEntrainementExcel =
    donneesGraph[i][15];

const entrainement =
    donneesGraph[i][16];

let dateMatch = "";
let dateEntrainement = "";

/* Date match */

if (dateMatchExcel) {

    if (typeof dateMatchExcel === "number") {

        const jsDate = new Date(
            (dateMatchExcel - 25569)
            * 86400 * 1000
        );

        dateMatch =
            jsDate.toLocaleDateString(
                "fr-FR",
                {
                    day: "2-digit",
                    month: "2-digit"
                }
            );

    }
    else {

        dateMatch =
            String(dateMatchExcel);

    }

}

/* Date entraînement */

if (
    typeof dateEntrainementExcel === "number"
) {

    const jsDate = new Date(
        (dateEntrainementExcel - 25569)
        * 86400 * 1000
    );

    dateEntrainement =
        jsDate.toLocaleDateString(
            "fr-FR",
            {
                day: "2-digit",
                month: "2-digit"
            }
        );

}
    if (!donneesGraph[i]) continue;

 
    const valeurEntrainement =
    Number(entrainement);

if (
    !isNaN(valeurEntrainement) &&
    valeurEntrainement >= 300
) {

   if (dateEntrainement) {
    datesEntrainements.push(
        dateEntrainement
    );
}
    entrainementsExcel.push(
        valeurEntrainement
    );

}

    const valeur = Number(score);

    if (
        !isNaN(valeur) &&
        valeur >= 300
    ) {
if (dateMatch) {
    datesMatchs.push(dateMatch);
}
       if (valeur < 500) {

    scoresExcel.push(
        Number((valeur * 60 / 40).toFixed(1))
    );

} else {

    scoresExcel.push(valeur);

}

    }
}

const sheet = workbook.Sheets["Calendrier 2026-2027"];
        const lignes = XLSX.utils.sheet_to_json(sheet, {
            header: 1
        });

        let html = `
<h3 style="
    background:#17365D;
    color:white;
    padding:8px;
    margin-top:15px;
    border-radius:5px;
">
    📅 Septembre 2026
</h3>
`;

let compteur = 0;
let moisCourant = "Septembre 2026";
       
        for (let i = 4; i < lignes.length; i++) {

            const ligne = lignes[i];

            if (!ligne) continue;

            const date = ligne[1];
            const evenement = ligne[2];
            const lieu = ligne[3];
            const statut = ligne[5];
            const mois = ligne[0];



if (mois && mois !== moisCourant) {

    moisCourant = mois;

    html += `
        <h3 style="
            background:#17365D;
            color:white;
            padding:8px;
            margin-top:15px;
            border-radius:5px;
        ">
            📅 ${mois}
        </h3>
    `;
}
            console.log("Mois =", ligne[0]);
         if (
    evenement &&
    (
        filtre === "toutes" ||
        statut === "À venir"
    )
) {

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

    chargerCalendrier("toutes");

}



function afficherAVenir() {

    chargerCalendrier("avenir");

}


function afficherResultats() {

    let historique =
        JSON.parse(
            localStorage.getItem("scores")
        ) || [];

    let html =
        "<h2>🏆 Résultats</h2>";

    historique.forEach(score => {

        html += `
            <div class="competition">

                <b>${score.date}</b><br>

                ${
                    score.type === "match"
                    ? "🏆 Compétition"
                    : "🏋️ Entraînement"
                }

                <br>

                Score :
                <b>${score.score}</b>

            </div>
        `;

    });

    document.getElementById("etat").innerHTML =
        html;
}

function afficherAjoutScore() {

    document.getElementById("etat").innerHTML = `

        <h2>➕ Nouveau score</h2>

        <p>Date :</p>
        <input type="date" id="dateScore">

        <p>Type :</p>
        <select id="typeScore">
            <option value="entrainement">
                Entraînement
            </option>
            <option value="match">
                Compétition
            </option>
        </select>

        <p>Score :</p>
        <input
            type="number"
            step="0.1"
            id="valeurScore"
            placeholder="Ex : 617.5"
        >

        <br><br>

        <button onclick="enregistrerScore()">
            💾 Enregistrer
        </button>

    `;
}


function enregistrerScore() {

    const date =
        document.getElementById("dateScore").value;

    const type =
        document.getElementById("typeScore").value;

    const score =
        Number(
            document.getElementById("valeurScore").value
        );

    const nouveauScore = {
        date,
        type,
        score
    };

    let historique =
        JSON.parse(
            localStorage.getItem("scores")
        ) || [];

    historique.push(nouveauScore);

    localStorage.setItem(
        "scores",
        JSON.stringify(historique)
    );

  alert("✅ Score enregistré");

afficherStats();

    voirScores();
    if (type === "match") {

    datesMatchs.push(
        date.split("-").reverse().join("/")
    );

    scoresExcel.push(score);

} else {

    datesEntrainements.push(
        date.split("-").reverse().join("/")
    );

    entrainementsExcel.push(score);

}


}

function voirScores() {

    let historique =
        JSON.parse(
            localStorage.getItem("scores")
        ) || [];

    let html =
        "<h2>📋 Scores saisis</h2>";

    if (historique.length === 0) {

        html += `
            <p>Aucun score enregistré.</p>
        `;

    } else {

       historique.forEach((item, index) => {

    html += `
        <div class="competition">

            <b>${item.date}</b><br>

            ${
                item.type === "match"
                ? "🏆 Compétition"
                : "🏋️ Entraînement"
            }
            <br>

            Score :
            <b>${item.score}</b>

            <br><br>

            <button
                onclick="supprimerScore(${index})"
                style="
                    background:#dc3545;
                    color:white;
                    border:none;
                    padding:5px 10px;
                    border-radius:5px;
                    cursor:pointer;
                "
            >
                🗑️ Supprimer
            </button>

        </div>
    `;

});
        
    }

    document.getElementById("etat").innerHTML =
        html;

}

function supprimerScore(index) {

    if (
        !confirm(
            "Supprimer ce score ?"
        )
    ) {
        return;
    }

    let historique =
        JSON.parse(
            localStorage.getItem("scores")
        ) || [];

    historique.splice(index, 1);

    localStorage.setItem(
        "scores",
        JSON.stringify(historique)
    );

    voirScores();

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

const meilleurEntrainement =
    entrainementsExcel.length > 0
    ? Math.max(...entrainementsExcel)
    : 0;

const moyenneEntrainement =
    entrainementsExcel.length > 0
    ? (
        entrainementsExcel.reduce(
            (a, b) => a + b,
            0
        ) / entrainementsExcel.length
      ).toFixed(1)
    : 0;
       

    document.getElementById("etat").innerHTML = `

        <h2>📈 Statistiques</h2>

        <p>🏆 Meilleur score : <b>${meilleur}</b></p>

        <p>🎯 Dernier score : <b>${dernier}</b></p>

        <p>📊 Moyenne : <b>${moyenne}</b></p>

       <p style="
    color:gold;
    font-size:20px;
    font-weight:bold;
">
🏆 Record personnel :
<b>${meilleurEntrainement}</b>
</p>
        
 
<p>📈 Moyenne entraînement :
<b>${moyenneEntrainement}</b></p>

        <p>📋 Nombre de résultats : <b>${scores.length}</b></p>
        <p>🏋️ Nombre d'entraînements :
        <b>${entrainementsExcel.length}</b></p>
        <p>📅 Dates matchs :
<b>${datesMatchs.join(" - ")}</b></p>

<p>📅 Dates entraînements :
<b>${datesEntrainements.join(" - ")}</b></p>

        <canvas id="graphiqueScores"></canvas>

    `;

    const ctx =
        document.getElementById("graphiqueScores");
const labels = [
    ...datesMatchs,
    ...datesEntrainements
];

labels.sort((a, b) => {

    const [ja, ma] = a.split("/");
    const [jb, mb] = b.split("/");

    return new Date(2026, ma - 1, ja)
         - new Date(2026, mb - 1, jb);

});
    const serieMatchs =
    labels.map(date => {

        const index =
            datesMatchs.indexOf(date);

        return index >= 0
            ? scoresExcel[index]
            : null;

    });

const serieEntrainements =
    labels.map(date => {

        const index =
            datesEntrainements.indexOf(date);

        return index >= 0
            ? entrainementsExcel[index]
            : null;

    });
    new Chart(ctx, {

    type: "line",

    data: {

labels: labels,
        datasets: [

       {
    label: "Compétitions",
    data: serieMatchs,

    borderColor: "#17365D",
    backgroundColor: "rgba(23,54,93,0.2)",

    fill: false,
    tension: 0.3,
    spanGaps: true,

    pointRadius: 8,
    pointHoverRadius: 12,
    pointBackgroundColor: "#17365D",
    pointBorderColor: "#ffffff",
    pointBorderWidth: 2
},

     {
            label: "Entraînements",
            data: serieEntrainements,

            borderColor: "#28a745",
            backgroundColor: "rgba(40,167,69,0.2)",

            fill: false,
            tension: 0.3,
            spanGaps: true,

            pointRadius: 8,
            pointHoverRadius: 12,
            pointBackgroundColor: "#28a745",
            pointBorderColor: "#ffffff",
            pointBorderWidth: 2
        }

        ]

    },

    options: {

        responsive: true,

        plugins: {

            legend: {
                display: true
            },

            tooltip: {
                enabled: true
            }

        }

    }

});

}
function rechercherCompetition() {

    const filtre =
        document
        .getElementById("recherche")
        .value
        .toLowerCase();

    const cartes =
        document.querySelectorAll(".competition");

    cartes.forEach(carte => {

        const texte =
            carte.innerText.toLowerCase();

        carte.style.display =
            texte.includes(filtre)
            ? "block"
            : "none";

    });
}
