let pageActuelle = "tableau";
let scoresExcel = [];
let entrainementsExcel = [];
let datesMatchs = [];
let datesEntrainements = [];
let prochainesCompetitions = [];
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

        // Récupérer TOUTES les compétitions de la prochaine date "À venir"
        prochainesCompetitions = [];
        let dateProchainMatch = null;
        let moisCourantRecherche = "";

        for (let i = 3; i < lignes.length; i++) {
            const ligne = lignes[i];
            if (!ligne) continue;
            if (ligne[0]) moisCourantRecherche = ligne[0];

            const date = ligne[1];
            const evenement = ligne[2];
            const lieu = ligne[3];
            const statut = ligne[5];

            if (evenement && statut === "À venir") {
                if (!dateProchainMatch) {
                    dateProchainMatch = `${moisCourantRecherche}|${date}`;
                }
                if (`${moisCourantRecherche}|${date}` === dateProchainMatch) {
                    prochainesCompetitions.push({
                        mois: moisCourantRecherche,
                        date: date || "",
                        evenement: evenement,
                        lieu: lieu || "Lieu non spécifié"
                    });
                } else {
                    break; // On s'arrête dès que la date change
                }
            }
        }

        // 1. Encart du / des Prochain(s) Match(s)
        let html = `<h2>📅 Calendrier de la saison</h2>`;

        if (prochainesCompetitions.length > 0) {
            const titreEncart = prochainesCompetitions.length > 1
                ? `🎯 Prochaines compétitions (${prochainesCompetitions.length})`
                : `🎯 Prochain Match à venir`;

            html += `
                <div class="next-match-card">
                    <h2>${titreEncart}</h2>
                    <div style="font-size: 0.9em; color: #93c5fd; font-weight: 700; margin-bottom: 10px;">
                        📅 ${prochainesCompetitions[0].date} (${prochainesCompetitions[0].mois})
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
            `;

            prochainesCompetitions.forEach((comp, idx) => {
                const borderStyle = idx > 0 ? "border-top: 1px solid rgba(255,255,255,0.12); padding-top: 10px;" : "";
                html += `
                    <div style="${borderStyle}">
                        <div style="font-size: 1.1em; font-weight: bold; color: #fff;">
                            ${comp.evenement}
                        </div>
                        <div style="font-size: 0.9em; color: #cbd5e1; margin-top: 2px;">
                            📍 ${comp.lieu}
                        </div>
                    </div>
                `;
            });

            html += `
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

        // 3. Liste des mois et événements en cartes modernes (avec mémorisation robuste du mois)
        let moisCourant = "";
        let premierMoisAffiche = false;
        let dernierMoisAffiche = "";

        for (let i = 3; i < lignes.length; i++) {
            const ligne = lignes[i];
            if (!ligne) continue;

            const moisBrut = ligne[0];
            const date = ligne[1];
            const evenement = ligne[2];
            const lieu = ligne[3];
            const statut = ligne[5];

            if (moisBrut) {
                moisCourant = moisBrut;
            }

            if (evenement && (filtre === "toutes" || statut === "À venir")) {
                if (!premierMoisAffiche) {
                    html += `
                        <div class="month-header">
                            📅 ${moisCourant || "Septembre 2026"}
                        </div>
                        <div class="calendar-grid">
                    `;
                    premierMoisAffiche = true;
                    dernierMoisAffiche = moisCourant;
                } else if (moisCourant && moisCourant !== dernierMoisAffiche) {
                    html += `</div>
                        <div class="month-header" style="margin-top:25px;">
                            📅 ${moisCourant}
                        </div>
                        <div class="calendar-grid">
                    `;
                    dernierMoisAffiche = moisCourant;
                }

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
        if (premierMoisAffiche) {
            html += `</div>`;
        }

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
    const dateFormatee = morceaux[2] + "/" + morceaux[1];

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
    let historique = JSON.parse(localStorage.getItem("scores")) || [];
    let html = "<h2>📋 Scores saisis</h2>";

    if (historique.length === 0) {
        html += `<p>Aucun score enregistré.</p>`;
    } else {
        historique.forEach((item, index) => {
            html += `
                <div class="competition competition-card">
                    <div class="competition-left">
                        <div class="competition-date-badge">${item.date}</div>
                        <div class="competition-details">
                            <div class="competition-title">${item.type === "match" ? "🏆 Compétition" : "🏋️ Entraînement"}</div>
                            <div class="competition-location">Score : <b>${item.score}</b></div>
                        </div>
                    </div>
                    <div>
                        <button onclick="supprimerScore(${index})" style="background:#dc3545; color:white; border:none; padding:6px 12px; border-radius:8px; cursor:pointer; font-weight:600;">
                            🗑️ Supprimer
                        </button>
                    </div>
                </div>
            `;
        });
    }
    document.getElementById("etat").innerHTML = html;
}

async function supprimerScore(index) {
    if (!confirm("Supprimer ce score ?")) return;

    let historique = JSON.parse(localStorage.getItem("scores")) || [];
    const scoreASupprimer = historique[index];

    await supabaseClient.from("scores").delete()
        .eq("date", scoreASupprimer.date)
        .eq("type", scoreASupprimer.type)
        .eq("score", scoreASupprimer.score);

    historique.splice(index, 1);
    localStorage.setItem("scores", JSON.stringify(historique));
    await synchroniserEtRecharger();
}

function afficherStats() {
    pageActuelle = "stats";
    const scores = [...scoresExcel, ...entrainementsExcel];

    if (scores.length === 0) {
        document.getElementById("etat").innerHTML = "Aucun score trouvé.";
        return;
    }

    const meilleurCompetition = scoresExcel.length > 0 ? Math.max(...scoresExcel) : 0;
    const meilleurEntrainement = entrainementsExcel.length > 0 ? Math.max(...entrainementsExcel) : 0;
    const moyenne = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
    const totalResultats = scoresExcel.length + entrainementsExcel.length;

    const tousLesScores = [];
    for (let i = 0; i < datesMatchs.length; i++) tousLesScores.push({ date: datesMatchs[i], score: scoresExcel[i] });
    for (let i = 0; i < datesEntrainements.length; i++) tousLesScores.push({ date: datesEntrainements[i], score: entrainementsExcel[i] });

    tousLesScores.sort((a, b) => {
        const [ja, ma] = a.date.split("/");
        const [jb, mb] = b.date.split("/");
        return new Date(2026, ma - 1, ja) - new Date(2026, mb - 1, jb);
    });

    const dernier = tousLesScores.length > 0 ? tousLesScores[tousLesScores.length - 1].score : 0;

    document.getElementById("etat").innerHTML = `
        <h2>📈 Statistiques</h2>
        <div style="display:grid; grid-template-columns: repeat(auto-fit,minmax(220px,1fr)); gap:15px;">
            <div class="card"><h3>🎯 Dernier score</h3><p style="font-size:32px; font-weight:bold;">${dernier}</p></div>
            <div class="card"><h3>🏆 Record</h3><p style="font-size:32px; font-weight:bold; color:gold;">${meilleurEntrainement}</p></div>
            <div class="card"><h3>📊 Moyenne</h3><p style="font-size:32px; font-weight:bold;">${moyenne}</p></div>
            <div class="card"><h3>📋 Résultats</h3><p style="font-size:32px; font-weight:bold;">${totalResultats}</p></div>
        </div>
        <hr style="margin:20px 0; border:0; border-top:1px solid var(--border);">
        <h3>📊 Évolution des performances</h3>
        <div class="chart-wrap"><canvas id="graphiqueScores"></canvas></div>
    `;

    if (graphiqueInstance) {
        try { graphiqueInstance.destroy(); } catch (e) {}
        graphiqueInstance = null;
    }

    const ctx = document.getElementById("graphiqueScores");
    const events = [];
    for (let i = 0; i < datesMatchs.length; i++) events.push({ date: datesMatchs[i], ts: dateFRversTS(datesMatchs[i]), score: Number(scoresExcel[i]), type: "match", idx: i });
    for (let i = 0; i < datesEntrainements.length; i++) events.push({ date: datesEntrainements[i], ts: dateFRversTS(datesEntrainements[i]), score: Number(entrainementsExcel[i]), type: "entrainement", idx: i });
    events.sort((a, b) => (a.ts - b.ts) || (a.idx - b.idx));

    const compteDate = {};
    const labels = events.map(e => {
        compteDate[e.date] = (compteDate[e.date] || 0) + 1;
        return compteDate[e.date] > 1 ? e.date + " (" + compteDate[e.date] + ")" : e.date;
    });
    const serieMatchs = events.map(e => e.type === "match" ? e.score : null);
    const serieEntrainements = events.map(e => e.type === "entrainement" ? e.score : null);

    graphiqueInstance = new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [
                { label: "Compétitions", data: serieMatchs, borderColor: "#17365D", backgroundColor: "rgba(23,54,93,0.20)", borderWidth: 4, tension: 0.4, spanGaps: true, pointRadius: 8 },
                { label: "Entraînements", data: serieEntrainements, borderColor: "#28a745", backgroundColor: "rgba(40,167,69,0.20)", borderWidth: 4, tension: 0.4, spanGaps: true, pointRadius: 8 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            plugins: { legend: { labels: { font: { size: 14, weight: "bold" } } } },
            scales: {
                y: { suggestedMin: 550, suggestedMax: 650, grid: { color: "rgba(0,0,0,0.06)" } },
                x: { grid: { display: false } }
            }
        }
    });
}

function exporterScores() {
    const historique = JSON.parse(localStorage.getItem("scores")) || [];
    if (historique.length === 0) { alert("Aucun score à exporter."); return; }
    const contenu = JSON.stringify(historique, null, 2);
    const blob = new Blob([contenu], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement("a");
    lien.href = url;
    lien.download = "scores_cecillya.json";
    document.body.appendChild(lien);
    lien.click();
    document.body.removeChild(lien);
    URL.revokeObjectURL(url);
    alert("✅ Export terminé");
}

function exporterExcel() {
    const historique = JSON.parse(localStorage.getItem("scores")) || [];
    if (historique.length === 0) { alert("Aucun score à exporter."); return; }
    const donnees = historique.map(item => ({
        Date: item.date,
        Type: item.type === "match" ? "Compétition" : "Entraînement",
        Score: Number(item.score)
    }));
    donnees.unshift({ Date: new Date().toLocaleDateString("fr-FR"), Type: "Export Tir Cécillya", Score: "" });
    const feuille = XLSX.utils.json_to_sheet(donnees);
    const classeur = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(classeur, feuille, "Scores");
    XLSX.writeFile(classeur, "scores_cecillya.xlsx");
    alert("✅ Export Excel terminé");
}

function importerScores(event) {
    const fichier = event.target.files[0];
    if (!fichier) return;

    const lecteur = new FileReader();
    lecteur.onload = function (e) {
        try {
            const donnees = JSON.parse(e.target.result);
            if (!Array.isArray(donnees)) { alert("❌ Fichier invalide."); return; }
            donnees.forEach(item => {
                if (item.type === "Compétition") item.type = "match";
                if (item.type === "Entraînement") item.type = "entrainement";
            });

            let historique = JSON.parse(localStorage.getItem("scores")) || [];
            const existants = new Set(historique.map(item => item.date + "|" + item.type + "|" + item.score));
            const nouveaux = donnees.filter(item => !existants.has(item.date + "|" + item.type + "|" + item.score));

            historique = [...historique, ...nouveaux];
            localStorage.setItem("scores", JSON.stringify(historique));
            alert("✅ " + nouveaux.length + " nouveau(x) score(s) importé(s).");
            chargerCalendrier().then(() => { afficherResultats(); });
        } catch (erreur) {
            alert("❌ Erreur lors de l'import.");
        }
    };
    lecteur.readAsText(fichier);
}

function afficherTableauDeBord() {
    pageActuelle = "tableau";
    const tousLesScores = [...scoresExcel, ...entrainementsExcel];
    const moyenne = tousLesScores.length > 0 ? (tousLesScores.reduce((a, b) => a + b, 0) / tousLesScores.length).toFixed(1) : 0;
    const record = tousLesScores.length > 0 ? Math.max(...tousLesScores) : 0;
    const dernier = tousLesScores.length > 0 ? tousLesScores[tousLesScores.length - 1] : 0;

    let contenuProchainesComp = `<p style="font-size:1.1em; font-weight:bold; margin:6px 0 0 0;">Aucune compétition</p>`;
    if (prochainesCompetitions.length > 0) {
        contenuProchainesComp = `
            <div style="font-size: 0.9em; color: var(--blue); font-weight: 700; margin: 6px 0 10px 0;">
                📅 ${prochainesCompetitions[0].date} (${prochainesCompetitions[0].mois})
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
                ${prochainesCompetitions.map((c, idx) => `
                    <div style="${idx > 0 ? 'border-top: 1px solid var(--border); padding-top: 8px;' : ''}">
                        <div style="font-size: 1.05em; font-weight: bold;">${c.evenement}</div>
                        <div style="font-size: 0.88em; color: var(--muted);">📍 ${c.lieu}</div>
                    </div>
                `).join("")}
            </div>
        `;
    }

    const titreCardProchaine = prochainesCompetitions.length > 1
        ? `📅 Prochaines compétitions (${prochainesCompetitions.length})`
        : `📅 Prochaine compétition`;

    document.getElementById("etat").innerHTML = `
        <h2>🏠 Tableau de bord</h2>
        <div style="display:grid; grid-template-columns: repeat(auto-fit,minmax(220px,1fr)); gap:10px;">
            <div class="card"><h3>🎯 Dernier score</h3><p style="font-size:28px; font-weight:bold;">${dernier}</p></div>
            <div class="card"><h3>🏆 Record personnel</h3><p style="font-size:28px; font-weight:bold; color:gold;">${record}</p></div>
            <div class="card"><h3>📈 Moyenne saison</h3><p style="font-size:28px; font-weight:bold;">${moyenne}</p></div>
            <div class="card"><h3>📋 Résultats</h3><p style="font-size:28px; font-weight:bold;">${tousLesScores.length}</p></div>
        </div>
        <div class="card" style="border-left: 5px solid #2563eb; margin-top:16px;">
            <h3>${titreCardProchaine}</h3>
            ${contenuProchainesComp}
        </div>
    `;
}

async function synchroniserScores() {
    const { data, error } = await supabaseClient.from("scores").select("*");
    if (error) { console.error(error); return; }
    const historique = data.map(item => ({ date: item.date, type: item.type, score: Number(item.score) }));
    localStorage.setItem("scores", JSON.stringify(historique));
}

async function synchroniserEtRecharger(silencieux = false) {
    if (syncEnCours) return;
    syncEnCours = true;
    const badge = document.getElementById("sync-badge");
    if (badge) { badge.textContent = "🔄 Sync…"; badge.classList.add("syncing"); }
    const scrollY = window.scrollY;
    const rechercheActive = document.getElementById("recherche") ? document.getElementById("recherche").value : "";

    try {
        await synchroniserScores();
        scoresExcel = []; entrainementsExcel = []; datesMatchs = []; datesEntrainements = [];
        const doitAfficherCalendrier = (pageActuelle !== "stats" && pageActuelle !== "resultats" && pageActuelle !== "top10" && pageActuelle !== "tableau");
        await chargerCalendrier("avenir", doitAfficherCalendrier);

        switch (pageActuelle) {
            case "stats": afficherStats(); break;
            case "resultats": afficherResultats(); break;
            case "top10": afficherTop10(); break;
            case "calendrier": break;
            default: afficherTableauDeBord();
        }
        if (!silencieux) afficherToast("✅ Synchronisation terminée");
    } finally {
        syncEnCours = false;
        if (badge) { badge.textContent = "● À jour"; badge.classList.remove("syncing"); }
        window.scrollTo(0, scrollY);
        const r = document.getElementById("recherche");
        if (r && rechercheActive) { r.value = rechercheActive; }
    }
}

function afficherTop10() {
    pageActuelle = "top10";
    const tousLesScores = [];
    for (let i = 0; i < datesMatchs.length; i++) tousLesScores.push({ date: datesMatchs[i], type: "🏆 Compétition", score: Number(scoresExcel[i]) });
    for (let i = 0; i < datesEntrainements.length; i++) tousLesScores.push({ date: datesEntrainements[i], type: "🏋️ Entraînement", score: Number(entrainementsExcel[i]) });

    if (tousLesScores.length === 0) {
        document.getElementById("etat").innerHTML = "<h2>🥇 Top 10</h2><p>Aucun score.</p>";
        return;
    }

    const top10 = tousLesScores.sort((a, b) => b.score - a.score).slice(0, 10);
    const record = top10.length > 0 ? top10[0].score : 0;
    const moyenneTop10 = top10.length > 0 ? (top10.reduce((total, item) => total + item.score, 0) / top10.length).toFixed(1) : 0;

    let html = `
        <h2>🥇 Top 10 des meilleurs scores</h2>
        <div class="podium" style="display:flex; gap:10px; margin-bottom:16px;">
            <div class="second card" style="text-align:center; flex:1;">🥈<br><b>${top10[1] ? top10[1].score : "-"}</b></div>
            <div class="first card" style="text-align:center; flex:1; border:2px solid gold;">🥇<br><b style="color:gold;">${top10[0] ? top10[0].score : "-"}</b></div>
            <div class="third card" style="text-align:center; flex:1;">🥉<br><b>${top10[2] ? top10[2].score : "-"}</b></div>
        </div>
        <div class="card" style="margin-bottom:16px;">
            <p style="color:gold; font-size:20px; font-weight:bold; margin:0 0 6px 0;">🏆 Record personnel : ${record}</p>
            <p style="font-size:16px; margin:0;">📈 Moyenne du Top 10 : <b>${moyenneTop10}</b></p>
        </div>
    `;

    top10.forEach((item, index) => {
        const emoji = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "🎯";
        html += `
            <div class="competition competition-card">
                <div class="competition-left">
                    <div class="competition-date-badge">${emoji} #${index + 1}</div>
                    <div class="competition-details">
                        <div class="competition-title">${item.type}</div>
                        <div class="competition-location">📅 ${item.date}</div>
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

function toggleTheme() {
    document.body.classList.toggle("dark");
    document.documentElement.setAttribute("data-theme", document.body.classList.contains("dark") ? "dark" : "light");
    const modeSombre = document.body.classList.contains("dark");
    localStorage.setItem("theme", modeSombre ? "dark" : "light");
}
