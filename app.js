
let scoresExcel = [];
let entrainementsExcel = [];
let datesMatchs = [];
let datesEntrainements = [];
let prochaineCompetition = "";
const supabaseUrl =
    "https://tfotbvxoozlbfdzmifdu.supabase.co";

const supabaseKey =
    "sb_publishable_X-6C7DV9K8B7AiUlnpqAvw_KYEaUOKl";

const supabaseClient =
    window.supabase.createClient(
        supabaseUrl,
        supabaseKey
    );
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
let historique =
    JSON.parse(
        localStorage.getItem("scores")
    ) || [];

historique.forEach(item => {
    
let date = item.date;

if (item.date.includes("-")) {

    const morceaux =
        item.date.split("-");

    date =
        morceaux[2] +
        "/" +
        morceaux[1];

}

    if (item.type === "match") {

        datesMatchs.push(date);
        scoresExcel.push(Number(item.score));

    } else {

        datesEntrainements.push(date);
        entrainementsExcel.push(Number(item.score));

    }

});

        
const sheet = workbook.Sheets["Calendrier 2026-2027"];
        const lignes = XLSX.utils.sheet_to_json(sheet, {
            header: 1
        });

        let html = `
<h2>📅 Calendrier de la saison</h2>

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

let moisCourant = "Septembre 2026";
prochaineCompetition = "";     
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
         if (
    evenement &&
    (
        filtre === "toutes" ||
        statut === "À venir"
    )
) {
if (
    statut === "À venir" &&
    !prochaineCompetition
) {

    prochaineCompetition =
        `${date} - ${evenement}`;

}
                html += `
                <div class="competition"
                style="padding:10px;border-bottom:1px solid #ddd;">

                    <b>${date || ""}</b><br>

                    ${evenement}<br>

                    📍 ${lieu || "-"}<br>

                    ✅ ${statut}

                </div>
                `;


              
            }
        }

        document.getElementById("etat").innerHTML = html;

    }
    catch (erreur) {

        document.getElementById("etat").innerHTML =
            "❌ Erreur : " + erreur.message;

    }
}

async function initialiserApplication() {

    await synchroniserScores();

    await chargerCalendrier();

    afficherTableauDeBord();

    setInterval(() => {
    synchroniserEtRecharger(true);
}, 30000);

}
initialiserApplication();

setInterval(() => {
    synchroniserEtRecharger(true);
}, 30000);

function afficherToutes() {

    chargerCalendrier("toutes");

}



function afficherAVenir() {

    chargerCalendrier("avenir");

}

function afficherResultats() {

    let html = "<h2>🏆 Résultats</h2>";

    let resultats = [];

    for (let i = 0; i < datesMatchs.length; i++) {

        resultats.push({
            date: datesMatchs[i],
            type: "🏆 Compétition",
            score: scoresExcel[i]
        });

    }

    for (let i = 0; i < datesEntrainements.length; i++) {

        resultats.push({
            date: datesEntrainements[i],
            type: "🏋️ Entraînement",
            score: entrainementsExcel[i]
        });

    }

    resultats.sort((a, b) => {

        const [ja, ma] = a.date.split("/");
        const [jb, mb] = b.date.split("/");

        return new Date(2026, ma - 1, ja)
             - new Date(2026, mb - 1, jb);

    });

    resultats.forEach(item => {

        html += `
            <div class="competition">

                <b>${item.date}</b><br>

                ${item.type}<br>

                Score :
                <b>${item.score}</b>

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


async function enregistrerScore() {

    const date =
        document.getElementById("dateScore").value;

    const type =
        document.getElementById("typeScore").value;

    const score =
        Number(
            document.getElementById("valeurScore").value
        );
if (!date || isNaN(score)) {

    alert("Veuillez saisir une date et un score.");

    return;

}
    const nouveauScore = {
        date,
        type,
        score
    };

    let historique =
        JSON.parse(
            localStorage.getItem("scores")
        ) || [];

 const existe = historique.some(item =>
    item.date === date &&
    item.type === type &&
    Number(item.score) === score
);

if (existe) {

    alert("⚠️ Ce score existe déjà.");

    return;

}

historique.push(nouveauScore);

    localStorage.setItem(
        "scores",
        JSON.stringify(historique)
    );
const { error } =
    await supabaseClient
        .from("scores")
        .insert([
            {
                date,
                type,
                score
            }
        ]);

if (error) {

    console.error(
        "Erreur Supabase :",
        error
    );

    alert(
        "❌ Erreur Supabase : " +
        error.message
    );

    return;
}
const morceaux = date.split("-");

const dateFormatee =
    morceaux[2] + "/" + morceaux[1];

if (type === "match") {

    datesMatchs.push(dateFormatee);

    scoresExcel.push(score);

} else {

    datesEntrainements.push(dateFormatee);

    entrainementsExcel.push(score);

}
 
alert("✅ Score enregistré");

afficherResultats();
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

async function supprimerScore(index) {

    if (!confirm("Supprimer ce score ?")) {
        return;
    }

    let historique =
        JSON.parse(
            localStorage.getItem("scores")
        ) || [];

    const scoreASupprimer =
        historique[index];

    await supabaseClient
        .from("scores")
        .delete()
        .eq("date", scoreASupprimer.date)
        .eq("type", scoreASupprimer.type)
        .eq("score", scoreASupprimer.score);

    historique.splice(index, 1);

    localStorage.setItem(
        "scores",
        JSON.stringify(historique)
    );

    await synchroniserEtRecharger();

}

function afficherStats() {

    const scores = [
        ...scoresExcel,
        ...entrainementsExcel
    ];

    const meilleurCompetition =
        scoresExcel.length > 0
        ? Math.max(...scoresExcel)
        : 0;

    if (scores.length === 0) {

        document.getElementById("etat").innerHTML =
            "Aucun score trouvé.";

        return;
    }

    const tousLesScores = [];

/* Compétitions */
for (let i = 0; i < datesMatchs.length; i++) {

    tousLesScores.push({
        date: datesMatchs[i],
        score: scoresExcel[i]
    });

}

/* Entraînements */
for (let i = 0; i < datesEntrainements.length; i++) {

    tousLesScores.push({
        date: datesEntrainements[i],
        score: entrainementsExcel[i]
    });

}

/* Tri chronologique */
tousLesScores.sort((a, b) => {

    const [ja, ma] = a.date.split("/");
    const [jb, mb] = b.date.split("/");

    return new Date(2026, ma - 1, ja)
         - new Date(2026, mb - 1, jb);

});

const dernier =
    tousLesScores.length > 0
    ? tousLesScores[tousLesScores.length - 1].score
    : 0;

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

    const totalResultats =
        scoresExcel.length +
        entrainementsExcel.length;
    
    document.getElementById("etat").innerHTML = `

        <h2>📈 Statistiques</h2>

        <p>🏆 Meilleure compétition :
<b>${meilleurCompetition}</b></p>

<p>🎯 Dernier score :
<b>${dernier}</b></p>

<p>📊 Moyenne :
<b>${moyenne}</b></p>

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

<p>📋 Nombre total de résultats :
<b>${totalResultats}</b></p>

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
const labels =
    [...new Set([
        ...datesMatchs,
        ...datesEntrainements
    ])];

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

function exporterScores() {

    const historique =
        JSON.parse(
            localStorage.getItem("scores")
        ) || [];

    if (historique.length === 0) {

        alert("Aucun score à exporter.");

        return;

    }

    const contenu =
        JSON.stringify(
            historique,
            null,
            2
        );

    const blob = new Blob(
        [contenu],
        {
            type: "application/json"
        }
    );

    const url =
        URL.createObjectURL(blob);

    const lien =
        document.createElement("a");

    lien.href = url;
    lien.download = "scores_cecillya.json";

    document.body.appendChild(lien);
    lien.click();
    document.body.removeChild(lien);

    URL.revokeObjectURL(url);

    alert("✅ Export terminé");

}
function exporterExcel() {

    const historique =
        JSON.parse(
            localStorage.getItem("scores")
        ) || [];

    if (historique.length === 0) {

        alert(
            "Aucun score à exporter."
        );

        return;

    }

   const donnees = historique.map(item => ({

    Date: item.date,

    Type:
        item.type === "match"
        ? "Compétition"
        : "Entraînement",

    Score: Number(item.score)

}));
donnees.unshift({

    Date: new Date().toLocaleDateString("fr-FR"),

    Type: "Export Tir Cécillya",

    Score: ""

});
donnees.sort((a, b) => {

    if (
        a.Type === "Export Tir Cécillya"
    ) return -1;

    if (
        b.Type === "Export Tir Cécillya"
    ) return 1;

    return String(a.Date)
        .localeCompare(String(b.Date));

});
    const feuille =
        XLSX.utils.json_to_sheet(
            donnees
        );

    const classeur =
        XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
        classeur,
        feuille,
        "Scores"
    );

    XLSX.writeFile(
        classeur,
        "scores_cecillya.xlsx"
    );

    alert(
        "✅ Export Excel terminé"
    );

}
function importerScores(event) {

    const fichier = event.target.files[0];

    if (!fichier) {
        return;
    }

    const lecteur = new FileReader();

    lecteur.onload = function(e) {

        try {

            const donnees =
                JSON.parse(e.target.result);

            if (!Array.isArray(donnees)) {

                alert("❌ Fichier invalide.");

                return;

            }

            donnees.forEach(item => {

                if (item.type === "Compétition") {
                    item.type = "match";
                }

                if (item.type === "Entraînement") {
                    item.type = "entrainement";
                }

            });

            let historique =
                JSON.parse(
                    localStorage.getItem("scores")
                ) || [];

           const existants =
    new Set(
        historique.map(item =>
            item.date +
            "|" +
            item.type +
            "|" +
            item.score
        )
    );

const nouveaux = donnees.filter(item => {

    const cle =
        item.date +
        "|" +
        item.type +
        "|" +
        item.score;

    return !existants.has(cle);

});

historique = [
    ...historique,
    ...nouveaux
];

historique = Array.from(
    new Map(
        historique.map(item => [
            item.date +
            "|" +
            item.type +
            "|" +
            item.score,
            item
        ])
    ).values()
);
            localStorage.setItem(
                "scores",
                JSON.stringify(historique)
            );

           alert(
    "✅ " +
    nouveaux.length +
    " nouveau(x) score(s) importé(s)."
);

            chargerCalendrier().then(() => {
                afficherResultats();
            });

        }

        catch (erreur) {

            console.error(erreur);

            alert(
                "❌ Erreur lors de l'import."
            );

        }

    };

    lecteur.readAsText(fichier);

}
function afficherTableauDeBord() {

    const tousLesScores = [
        ...scoresExcel,
        ...entrainementsExcel
    ];

    const moyenne =
        tousLesScores.length > 0
        ? (
            tousLesScores.reduce(
                (a, b) => a + b,
                0
            ) / tousLesScores.length
        ).toFixed(1)
        : 0;

    const record =
        tousLesScores.length > 0
        ? Math.max(...tousLesScores)
        : 0;

    const dernier =
        tousLesScores.length > 0
        ? tousLesScores[tousLesScores.length - 1]
        : 0;


    document.getElementById("etat").innerHTML = `

        <h2>🏠 Tableau de bord</h2>

        <div style="
            display:grid;
            grid-template-columns:
                repeat(auto-fit,minmax(220px,1fr));
            gap:10px;
        ">

            <div class="card">
                <h3>🎯 Dernier score</h3>
                <p style="
                    font-size:28px;
                    font-weight:bold;
                ">
                    ${dernier}
                </p>
            </div>

            <div class="card">
                <h3>🏆 Record personnel</h3>
                <p style="
                    font-size:28px;
                    font-weight:bold;
                    color:gold;
                ">
                    ${record}
                </p>
            </div>

            <div class="card">
                <h3>📈 Moyenne saison</h3>
                <p style="
                    font-size:28px;
                    font-weight:bold;
                ">
                    ${moyenne}
                </p>
            </div>

            <div class="card">
                <h3>📋 Résultats</h3>
                <p style="
                    font-size:28px;
                    font-weight:bold;
                ">
                    ${tousLesScores.length}
                </p>
            </div>

        </div>

        <div class="card">

            <h3>📅 Prochaine compétition</h3>

        <p>
    ${prochaineCompetition || "Aucune compétition"}
</p>

        </div>

    `;
}
async function synchroniserScores() {

    const { data, error } =
        await supabaseClient
            .from("scores")
            .select("*");

    if (error) {

        console.error(error);

        alert(
            "❌ " + error.message
        );

        return;

    }

    const historique = data.map(item => ({
        date: item.date,
        type: item.type,
        score: Number(item.score)
    }));

    localStorage.setItem(
        "scores",
        JSON.stringify(historique)
    );

    console.log(
        "✅ Scores récupérés :",
        historique.length
    );

}
async function synchroniserEtRecharger(
    silencieux = false
) {

    await synchroniserScores();

    await chargerCalendrier();

    afficherTableauDeBord();

    if (!silencieux) {

        alert(
            "✅ Synchronisation terminée"
        );

    }

}
function afficherTop10() {

    const tousLesScores = [];

    for (let i = 0; i < datesMatchs.length; i++) {

        tousLesScores.push({
            date: datesMatchs[i],
            type: "🏆 Compétition",
            score: Number(scoresExcel[i])
        });

    }

    for (let i = 0; i < datesEntrainements.length; i++) {

        tousLesScores.push({
            date: datesEntrainements[i],
            type: "🏋️ Entraînement",
            score: Number(entrainementsExcel[i])
        });

    }

    if (tousLesScores.length === 0) {

        document.getElementById("etat").innerHTML =
            "<h2>🥇 Top 10</h2><p>Aucun score.</p>";

        return;

    }

    const top10 = tousLesScores
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
const record =
    top10.length > 0
    ? top10[0].score
    : 0;

const moyenneTop10 =
    top10.length > 0
    ? (
        top10.reduce(
            (total, item) =>
                total + item.score,
            0
        ) / top10.length
      ).toFixed(1)
    : 0;
    let html = `
    <h2>🥇 Top 10 des meilleurs scores</h2>

    <div class="card">

        <p style="
            color:gold;
            font-size:24px;
            font-weight:bold;
        ">
            🏆 Record personnel :
            ${record}
        </p>

        <p style="
            font-size:18px;
        ">
            📈 Moyenne du Top 10 :
            <b>${moyenneTop10}</b>
        </p>

    </div>
`;
    top10.forEach((item, index) => {

        const emoji =
            index === 0 ? "🥇" :
            index === 1 ? "🥈" :
            index === 2 ? "🥉" :
            "🎯";

        html += `
            <div class="competition">

                <h3>
                    ${emoji} #${index + 1}
                </h3>

                <b>${item.score}</b><br>

                ${item.type}<br>

                📅 ${item.date}

            </div>
        `;

    });

    document.getElementById("etat").innerHTML =
        html;

}
