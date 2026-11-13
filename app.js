let pageActuelle = "tableau";
let scoresExcel = [];
let entrainementsExcel = [];
let datesMatchs = [];
let datesEntrainements = [];
let prochaineCompetition = "";
let filtreDisciplineActif = "all";

// --- Correctifs visuel/graph/sync ---
let graphiqueInstance = null;
let syncEnCours = false;

function dateFRversTS(d) {
    try {
        const p = String(d).split("/");
        if (p.length < 2) return 0;
        const j = parseInt(p[0], 10), m = parseInt(p[1], 10);
        if (!j || !m) return 0;
        return new Date(2026, m - 1, j).getTime();
    } catch (e) { return 0; }
}

function afficherToast(msg) {
    let t = document.getElementById("toast-sync");
    if (!t) {
        t = document.createElement("div");
        t.id = "toast-sync";
        document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove("show"), 2200);
}

const supabaseUrl = "https://tfotbvxoozlbfdzmifdu.supabase.co";
const supabaseKey = "sb_publishable_X-6C7DV9K8B7AiUlnpqAvw_KYEaUOKl";
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

async function chargerCalendrier(filtre = "avenir", afficher = true) {
    if (afficher) pageActuelle = "calendrier";

    try {
        const response = await fetch("Calendrier_Ligue_Tir_NPdC_2026_2027_dernier.xlsx?v=" + Date.now());
        const data = await response.arrayBuffer();
        const workbook = XLSX.read(data);
        const sheetGraph = workbook.Sheets["Chart Data"];
        const donneesGraph = XLSX.utils.sheet_to_json(sheetGraph, { header: 1 });

        scoresExcel = [];
        entrainementsExcel = [];
        datesMatchs = [];
        datesEntrainements = [];

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
                if (dateEntrainement) datesEntrainements.push(dateEntrainement);
                entrainementsExcel.push(valeurEntrainement);
            }

            const valeur = Number(score);
            if (!isNaN(valeur) && valeur >= 300) {
                if (dateMatch) datesMatchs.push(dateMatch);
                if (valeur < 500) {
                    scoresExcel.push(Number((valeur * 60 / 40).toFixed(1)));
                } else {
                    scoresExcel.push(valeur);
                }
            }
        }

        let historique = JSON.parse(localStorage.getItem("scores")) || [];
        historique.forEach(item => {
            let date = item.date;
            if (item.date.includes("-")) {
                const morceaux = item.date.split("-");
                date = morceaux[2] + "/" + morceaux[1];
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
        const lignes = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        prochaineCompetition = "";
        let prochainMatchObj = null;

        for (let i = 4; i < lignes.length; i++) {
            const ligne = lignes[i];
            if (!ligne) continue;
            const date = ligne[1];
            const evenement = ligne[2];
            const lieu = ligne[3];
            const statut = ligne[5];

            if (evenement && statut === "À venir" && !prochainMatchObj) {
                prochaineCompetition = `${date} - ${evenement}`;
                prochainMatchObj = { date, evenement, lieu };
                break;
            }
        }

        // 1. Encart du Prochain Match
        let html = `<h2>📅 Calendrier de la saison</h2>`;

        if (prochainMatchObj) {
            html += `
                <div class="next-match-card">
                    <h2>🎯 Prochain Match à venir</h2>
                    <div style="font-size: 1.15em; font-weight: bold; margin: 5px 0; color: #fff;">
                        ${prochainMatchObj.evenement}
                    </div>
                    <div style="font-size: 0.95em; color: #cbd5e1;">
                        📅 <b>${prochainMatchObj.date || ""}</b> &nbsp;|&nbsp; 📍 ${prochainMatchObj.lieu || "-"}
                    </div>
                </div>
            `;
        }

        // 2. Boutons de filtres par discipline
        const disciplines = [
            { id: "all", label: "Tous" },
            { id: "10m", label: "10m" },
            { id: "25m", label: "25m" },
            { id: "carabine10m", label: "Carabine 10m" },
            { id: "carabine50m", label: "Carabine 50m" },
            { id: "pistolet", label: "Pistolet" }
        ];

        html += `
            <div class="filters-section">
                <h3>Filtrer par discipline</h3>
                <div class="filter-buttons">
        `;
        disciplines.forEach(d => {
            const actif = (filtreDisciplineActif === d.id);
            html += `
                <button class="filter-btn ${actif ? 'active' : ''}" onclick="filtrerParDiscipline('${d.id}')">
                    ${d.label}
                </button>
            `;
        });
        html += `</div></div>`;

        // 3. Liste des mois et événements en cartes modernes
        let moisCourant = "Septembre 2026";
        html += `
            <div class="month-header">
                📅 Septembre 2026
            </div>
            <div class="calendar-grid">
        `;

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
                    </div>
                    <div class="month-header" style="margin-top:30px;">
                        📅 ${mois}
                    </div>
                    <div class="calendar-grid">
                `;
            }

            if (evenement && (filtre === "toutes" || statut === "À venir")) {
                const texteComplet = `${date || ""} ${evenement} ${lieu || ""}`.toLowerCase();
                const estAvenir = (statut === "À venir");
                
                html += `
                    <div class="competition competition-card" data-texte="${texteComplet}">
                        <div class="competition-left">
                            <div class="competition-date-badge">
                                ${date || "-"}
                            </div>
                            <div class="competition-details">
                                <div class="competition-title">${evenement}</div>
                                <div class="competition-location">
                                    📍 ${lieu || "Lieu non spécifié"}
                                </div>
                            </div>
                        </div>
                        <div>
                            <span class="competition-badge-status ${estAvenir ? 'status-avenir' : 'status-passe'}">
                                ${estAvenir ? '✅ À venir' : '📌 Passé'}
                            </span>
                        </div>
                    </div>
                `;
            }
        }
        html += `</div>`;

        if (afficher) {
            document.getElementById("etat").innerHTML = html;
            appliquerFiltresCalendrier();
        }

    } catch (erreur) {
        if (afficher) {
            document.getElementById("etat").innerHTML = "❌ Erreur : " + erreur.message;
        }
    }
}

function filtrerParDiscipline(discipline) {
    filtreDisciplineActif = discipline;
    const boutons = document.querySelectorAll(".filter-btn");
    boutons.forEach(btn => {
        const onClickAttr = btn.getAttribute("onclick") || "";
        const estActif = onClickAttr.includes(`'${discipline}'`);
        if (estActif) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });
    appliquerFiltresCalendrier();
}

function appliquerFiltresCalendrier() {
    const champRecherche = document.getElementById("recherche");
    const texteRecherche = champRecherche ? champRecherche.value.toLowerCase() : "";
    const cartes = document.querySelectorAll(".competition");

    cartes.forEach(carte => {
        const texte = (carte.getAttribute("data-texte") || carte.innerText).toLowerCase();

        let okDiscipline = true;
        if (filtreDisciplineActif === "pistolet") {
            okDiscipline = texte.includes("pistolet") || texte.includes("p10") || texte.includes("pv") || texte.includes("p std");
        } else if (filtreDisciplineActif === "carabine10m") {
            okDiscipline = (texte.includes("carabine") || texte.includes("c10")) && !texte.includes("50m") && !texte.includes("300m");
        } else if (filtreDisciplineActif === "carabine50m") {
            okDiscipline = texte.includes("50m") || texte.includes("300m") || texte.includes("carabine 50");
        } else if (filtreDisciplineActif === "10m") {
            okDiscipline = texte.includes("10m") || texte.includes("c10") || texte.includes("p10");
        } else if (filtreDisciplineActif === "25m") {
            okDiscipline = texte.includes("25m");
        } else if (filtreDisciplineActif !== "all") {
            okDiscipline = texte.includes(filtreDisciplineActif);
        }

        const okRecherche = texte.includes(texteRecherche);
        carte.style.display = (okDiscipline && okRecherche) ? "flex" : "none";
    });
}

function rechercherCompetition() {
    appliquerFiltresCalendrier();
}

async function initialiserApplication() {
    const theme = localStorage.getItem("theme");
    if (theme === "dark") {
        document.body.classList.add("dark");
    }
    await synchroniserScores();
    await chargerCalendrier("avenir", true);
    afficherTableauDeBord();

    if (!window._intervalSync) {
        window._intervalSync = setInterval(() => {
            synchroniserEtRecharger(true);
        }, 60000);
    }
}
initialiserApplication();

function afficherToutes() { chargerCalendrier("toutes"); }
function afficherAVenir() { chargerCalendrier("avenir"); }

function afficherResultats() {
    pageActuelle = "resultats";
    let html = "<h2>🏆 Résultats</h2>";
    let resultats = [];

    for (let i = 0; i < datesMatchs.length; i++) {
        resultats.push({ date: datesMatchs[i], type: "🏆 Compétition", score: scoresExcel[i] });
    }
    for (let i = 0; i < datesEntrainements.length; i++) {
        resultats.push({ date: datesEntrainements[i], type: "🏋️ Entraînement", score: entrainementsExcel[i] });
    }

    resultats.sort((a, b) => {
        const [ja, ma] = a.date.split("/");
        const [jb, mb] = b.date.split("/");
        return new Date(2026, ma - 1, ja) - new Date(2026, mb - 1, jb);
    });

    resultats.forEach(item => {
        html += `
            <div class="competition competition-card">
                <div class="competition-left">
                    <div class="competition-date-badge">${item.date}</div>
                    <div class="competition-details">
                        <div class="competition-title">${item.type}</div>
                    </div>
                </div>
                <div>
                    <span class="competition-badge-status status-avenir">Score : <b>${item.score}</b></span>
                </div>
            </div>
        `;
    });
    document.getElementById("etat").innerHTML = html;
}

function afficherAjoutScore() {
    document.getElementById("etat").innerHTML = `
        <h2>➕ Nouveau score</h2>
        <p>Date :</p><input type="date" id="dateScore">
        <p>Type :</p>
        <select id="typeScore">
            <option value="entrainement">Entraînement</option>
            <option value="match">Compétition</option>
        </select>
        <p>Score :</p><input type="number" step="0.1" id="valeurScore" placeholder="Ex : 617.5">
        <br><br><button class="btn btn-primary" onclick="enregistrerScore()">💾 Enregistrer</button>
    `;
}

async function enregistrerScore() {
    const date = document.getElementById("dateScore").value;
    const type = document.getElementById("typeScore").value;
    const score = Number(document.getElementById("valeurScore").value);

    if (!date || isNaN(score)) {
        alert("Veuillez saisir une date et un score.");
        return;
    }

    const nouveauScore = { date, type, score };
    let historique = JSON.parse(localStorage.getItem("scores")) || [];

    const existe = historique.some(item => item.date === date && item.type === type && Number(item.score) === score);
    if (existe) {
        alert("⚠️ Ce score existe déjà.");
        return;
    }

    historique.push(nouveauScore);
    localStorage.setItem("scores", JSON.stringify(historique));

    const { error } = await supabaseClient.from("scores").insert([{ date, type, score }]);
    if (error) {
        alert("❌ Erreur Supabase : " + error.message);
        return;
    }

    const morceaux = date.split("-");
    const date
