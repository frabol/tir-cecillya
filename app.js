let pageActuelle = "tableau";
let scoresExcel = [];
let entrainementsExcel = [];
let datesMatchs = [];
let datesEntrainements = [];
let prochainesCompetitions = [];
let toutesCompetitionsCalendrier = [];
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
    t._timer = setTimeout(() => t.classList.remove("show"), 2500);
}

const supabaseUrl = "https://tfotbvxoozlbfdzmifdu.supabase.co";
const supabaseKey = "sb_publishable_X-6C7DV9K8B7AiUlnpqAvw_KYEaUOKl";
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// --- EXPORT AGENDA (.ICS) ---
function exporterEvenementICS(titre, dateBrute, moisBrut, lieu) {
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
    ].join("
");

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `competition_${dateDebut}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    afficherToast("📅 Événement téléchargé pour votre agenda !");
}

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

        prochainesCompetitions = [];
        toutesCompetitionsCalendrier = [];
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
            const dateReelle = ligne[4];

            if (evenement) {
                toutesCompetitionsCalendrier.push({ mois: moisCourantRecherche, date, evenement, lieu, statut, dateReelle });

                if (statut === "À venir") {
                    if (!dateProchainMatch) {
                        dateProchainMatch = `${moisCourantRecherche}|${date}`;
                    }
                    if (`${moisCourantRecherche}|${date}` === dateProchainMatch) {
                        prochainesCompetitions.push({
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
                const evSafe = String(evenement).replace(/'/g, "\'");
                const lieuSafe = String(lieu || "Lieu non spécifié").replace(/'/g, "\'");
                const dateSafe = String(date || "").replace(/'/g, "\'");
                const moisSafe = String(moisCourant || "").replace(/'/g, "\'");

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
                        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                            ${estAvenir ? `<button class="btn" style="padding:6px 10px!important; font-size:12px!important;" onclick="exporterEvenementICS('${evSafe}', '${dateSafe}', '${moisSafe}', '${lieuSafe}')" title="Ajouter à mon agenda">📆 Agenda</button>` : ""}
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
        afficherToast("⚠️ Erreur lors du chargement du calendrier");
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
        document.documentElement.setAttribute("data-theme", "dark");
    }
    await synchroniserScores();
    await chargerCalendrier("avenir", false);
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

    if (resultats.length === 0) {
        html += `<p>Aucun résultat enregistré.</p>`;
    } else {
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
    }
    document.getElementById("etat").innerHTML = html;
}

// --- MODE STAND DE TIR : SAISIE ÉCLAIR & SÉRIES DE 10 PLOMBS ---
function ajusterScoreRapide(delta) {
    const input = document.getElementById("valeurScore");
    if (!input) return;
    let val = parseFloat(input.value) || 600.0;
    val = Math.max(0, Math.round((val + delta) * 10) / 10);
    input.value = val.toFixed(1);
}

function recalculerTotalSeries() {
    let somme = 0;
    let auMoinsUne = false;
    for (let i = 1; i <= 6; i++) {
        const el = document.getElementById(`serie_${i}`);
        if (el && el.value !== "") {
            somme += parseFloat(el.value) || 0;
            auMoinsUne = true;
        }
    }
    if (auMoinsUne) {
        const inputTotal = document.getElementById("valeurScore");
        if (inputTotal) inputTotal.value = (Math.round(somme * 10) / 10).toFixed(1);
    }
}

function afficherAjoutScore() {
    const aujourdhui = new Date().toISOString().split("T")[0];
    const tousLesScores = [...scoresExcel, ...entrainementsExcel];
    const scoreDefaut = tousLesScores.length > 0 ? tousLesScores[tousLesScores.length - 1] : 605.0;

    let inputsSeriesHtml = "";
    for (let i = 1; i <= 6; i++) {
        inputsSeriesHtml += `
            <div>
                <label style="font-size:12px;">Série ${i}</label>
                <input type="number" step="0.1" id="serie_${i}" placeholder="101.5" oninput="recalculerTotalSeries()"
                    style="padding:8px; text-align:center; font-weight:700;">
            </div>
        `;
    }

    document.getElementById("etat").innerHTML = `
        <h2>➕ Nouveau score — Mode Stand de Tir</h2>
        <div style="display:flex; flex-direction:column; gap:14px; max-width:480px;">
            <div>
                <label for="dateScore">📅 Date :</label><br>
                <input type="date" id="dateScore" value="${aujourdhui}" style="margin-top:6px;">
            </div>
            <div>
                <label for="typeScore">🎯 Type de tir :</label><br>
                <select id="typeScore" style="margin-top:6px;">
                    <option value="entrainement">🏋️ Entraînement</option>
                    <option value="match">🏆 Compétition</option>
                </select>
            </div>
            <details style="background:var(--bg); border:1px solid var(--border); border-radius:12px; padding:10px 12px;">
                <summary style="cursor:pointer; font-weight:700; color:var(--blue);">🎯 Saisir le détail des 6 séries (60 coups)</summary>
                <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:8px; margin-top:10px;">
                    ${inputsSeriesHtml}
                </div>
            </details>
            <div>
                <label for="valeurScore">🔢 Score total (Saisie éclair) :</label><br>
                <input type="number" step="0.1" id="valeurScore" value="${scoreDefaut}" placeholder="Ex : 617.5"
                    style="margin-top:6px; font-size:26px; font-weight:800; text-align:center; padding:14px;">
                <div style="display:grid; grid-template-columns: repeat(5, 1fr); gap:8px; margin-top:10px;">
                    <button type="button" class="btn" style="justify-content:center; padding:12px 4px!important; font-weight:800!important;" onclick="ajusterScoreRapide(-1)">-1</button>
                    <button type="button" class="btn" style="justify-content:center; padding:12px 4px!important; font-weight:800!important;" onclick="ajusterScoreRapide(-0.5)">-0.5</button>
                    <button type="button" class="btn" style="justify-content:center; padding:12px 4px!important; font-weight:800!important;" onclick="ajusterScoreRapide(0.1)">+0.1</button>
                    <button type="button" class="btn" style="justify-content:center; padding:12px 4px!important; font-weight:800!important;" onclick="ajusterScoreRapide(0.5)">+0.5</button>
                    <button type="button" class="btn" style="justify-content:center; padding:12px 4px!important; font-weight:800!important;" onclick="ajusterScoreRapide(1)">+1</button>
                </div>
            </div>
            <div>
                <label for="noteScore">📝 Notes techniques (plombs, dioptre, sensations) :</label><br>
                <input type="text" id="noteScore" placeholder="Ex : Plombs R10 4.49, +2 clics haut" style="margin-top:6px;">
            </div>
            <button class="btn btn-primary" style="justify-content:center; padding:14px!important; font-size:16px!important; margin-top:6px;" onclick="enregistrerScore()">
                💾 Enregistrer le score
            </button>
        </div>
    `;
}

async function enregistrerScore() {
    const date = document.getElementById("dateScore").value;
    const type = document.getElementById("typeScore").value;
    const score = Number(document.getElementById("valeurScore").value);
    const note = (document.getElementById("noteScore")?.value || "").trim();

    const series = [];
    for (let i = 1; i <= 6; i++) {
        const val = parseFloat(document.getElementById(`serie_${i}`)?.value);
        if (!isNaN(val) && val > 0) series.push(val);
    }

    if (!date || isNaN(score) || score <= 0) {
        afficherToast("⚠️ Veuillez saisir une date et un score valide.");
        return;
    }

    const nouveauScore = { date, type, score, note, series };
    let historique = JSON.parse(localStorage.getItem("scores")) || [];

    const existe = historique.some(item => item.date === date && item.type === type && Number(item.score) === score);
    if (existe) {
        afficherToast("⚠️ Ce score existe déjà.");
        return;
    }

    historique.push(nouveauScore);
    localStorage.setItem("scores", JSON.stringify(historique));

    const { error } = await supabaseClient.from("scores").insert([{ date, type, score }]);
    if (error) {
        afficherToast("⚠️ Sauvegardé en local (hors-ligne)");
    } else {
        afficherToast("✅ Score enregistré et synchronisé");
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

    afficherResultats();
}

function voirScores() {
    let historique = JSON.parse(localStorage.getItem("scores")) || [];
    let html = "<h2>📋 Scores saisis</h2>";

    if (historique.length === 0) {
        html += `<p>Aucun score enregistré.</p>`;
    } else {
        historique.forEach((item, index) => {
            const detailSeries = item.series && item.series.length > 0
                ? `<div style="font-size:0.82em; color:var(--blue); margin-top:2px;">Séries : ${item.series.join(" • ")}</div>`
                : "";
            const detailNote = item.note
                ? `<div style="font-size:0.82em; color:var(--muted); font-style:italic; margin-top:2px;">📝 ${item.note}</div>`
                : "";

            html += `
                <div class="competition competition-card">
                    <div class="competition-left">
                        <div class="competition-date-badge">${item.date}</div>
                        <div class="competition-details">
                            <div class="competition-title">${item.type === "match" ? "🏆 Compétition" : "🏋️ Entraînement"}</div>
                            <div class="competition-location">Score : <b>${item.score}</b></div>
                            ${detailSeries}
                            ${detailNote}
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

    const { error } = await supabaseClient.from("scores").delete()
        .eq("date", scoreASupprimer.date)
        .eq("type", scoreASupprimer.type)
        .eq("score", scoreASupprimer.score);

    if (error) {
        afficherToast("❌ Erreur lors de la suppression Supabase");
        return;
    }

    historique.splice(index, 1);
    localStorage.setItem("scores", JSON.stringify(historique));
    afficherToast("🗑️ Score supprimé");
    await synchroniserEtRecharger(true);
    voirScores();
}

function modifierObjectifPersonnel() {
    const objectifActuel = localStorage.getItem("objectif_tir") || 620;
    const nouvelObjectif = prompt("🎯 Entrez votre objectif personnel de score :", objectifActuel);
    if (nouvelObjectif !== null && !isNaN(nouvelObjectif) && Number(nouvelObjectif) > 0) {
        localStorage.setItem("objectif_tir", Number(nouvelObjectif));
        afficherTableauDeBord();
        afficherToast("✅ Objectif mis à jour !");
    }
}

function afficherTableauDeBord() {
    pageActuelle = "tableau";
    const tousLesScores = [...scoresExcel, ...entrainementsExcel];
    const moyenne = tousLesScores.length > 0 ? (tousLesScores.reduce((a, b) => a + b, 0) / tousLesScores.length).toFixed(1) : 0;
    const record = tousLesScores.length > 0 ? Math.max(...tousLesScores) : 0;
    const dernier = tousLesScores.length > 0 ? tousLesScores[tousLesScores.length - 1] : 0;
    const objectif = Number(localStorage.getItem("objectif_tir")) || 620;

    let pourcentageObjectif = Math.min(100, Math.round((record / objectif) * 100));

    let alerteNotification = "";
    if (prochainesCompetitions.length > 0) {
        alerteNotification = `
            <div class="alert-competition">
                <span style="font-size: 28px;">🔔</span>
                <div>
                    <div style="font-weight: bold; font-size: 1.05em;">Alerte Compétition Imminente !</div>
                    <div style="font-size: 0.95em; opacity: 0.9;">Prochain événement : <b>${prochainesCompetitions[0].evenement}</b> (${prochainesCompetitions[0].date}) à ${prochainesCompetitions[0].lieu}</div>
                </div>
            </div>
        `;
    }

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
        ${alerteNotification}
        <h2>🏠 Tableau de bord</h2>
        <div style="display:grid; grid-template-columns: repeat(auto-fit,minmax(220px,1fr)); gap:10px;">
            <div class="card"><h3>🎯 Dernier score</h3><p style="font-size:28px; font-weight:bold;">${dernier}</p></div>
            <div class="card"><h3>🏆 Record personnel</h3><p style="font-size:28px; font-weight:bold; color:gold;">${record}</p></div>
            <div class="card"><h3>📈 Moyenne saison</h3><p style="font-size:28px; font-weight:bold;">${moyenne}</p></div>
            <div class="card"><h3>📋 Résultats</h3><p style="font-size:28px; font-weight:bold;">${tousLesScores.length}</p></div>
        </div>

        <div class="objective-card" onclick="modifierObjectifPersonnel()" style="cursor: pointer;" title="Cliquez pour modifier l'objectif">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin: 0; color: #ffd84d; font-size: 1.1em;">🎯 Objectif Personnel : ${objectif} pts</h3>
                <span style="font-size: 0.85em; background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 999px;">Modifier ⚙️</span>
            </div>
            <p style="margin: 6px 0 0 0; font-size: 0.95em; opacity: 0.9;">Record actuel : <b>${record} pts</b> (${pourcentageObjectif}% de l'objectif)</p>
            <div class="progress-bar-container">
                <div class="progress-bar-fill" style="width: ${pourcentageObjectif}%;"></div>
            </div>
        </div>

        <div class="card" style="border-left: 5px solid #2563eb; margin-top:16px;">
            <h3>${titreCardProchaine}</h3>
            ${contenuProchainesComp}
        </div>
    `;
}

function afficherStats() {
    pageActuelle = "stats";
    const scores = [...scoresExcel, ...entrainementsExcel];

    if (scores.length === 0) {
        document.getElementById("etat").innerHTML = "Aucun score trouvé.";
        return;
    }

    const meilleurGlobal = Math.max(...scores);
    const moyNum = scores.reduce((a, b) => a + b, 0) / scores.length;
    const moyenne = moyNum.toFixed(1);
    const totalResultats = scoresExcel.length + entrainementsExcel.length;
    const objectif = Number(localStorage.getItem("objectif_tir")) || 620;

    // --- STATISTIQUES AVANCÉES : FORME RÉCENTE & RÉGULARITÉ ---
    const derniers5 = scores.slice(-5);
    const moyenne5 = (derniers5.reduce((a, b) => a + b, 0) / derniers5.length).toFixed(1);
    const diffForme = (Number(moyenne5) - Number(moyenne)).toFixed(1);
    const badgeForme = Number(diffForme) >= 0 ? `+${diffForme} pts vs saison` : `${diffForme} pts vs saison`;

    const variance = scores.reduce((acc, val) => acc + Math.pow(val - moyNum, 2), 0) / scores.length;
    const ecartType = Math.sqrt(variance).toFixed(2);
    const appreciationRegularite = Number(ecartType) <= 3.5 ? "Très régulier" : Number(ecartType) <= 6.0 ? "Régulier" : "Variable";

    let tousLesScoresDetailles = [];
    for (let i = 0; i < datesMatchs.length; i++) tousLesScoresDetailles.push({ date: datesMatchs[i], score: scoresExcel[i] });
    for (let i = 0; i < datesEntrainements.length; i++) tousLesScoresDetailles.push({ date: datesEntrainements[i], score: entrainementsExcel[i] });

    let statsParMois = {};
    tousLesScoresDetailles.forEach(item => {
        const parts = item.date.split("/");
        if (parts.length === 2) {
            const moisKey = parts[1];
            const nomsMois = { "09": "Septembre 2026", "10": "Octobre 2026", "11": "Novembre 2026", "12": "Décembre 2026", "01": "Janvier 2027", "02": "Février 2027", "03": "Mars 2027", "04": "Avril 2027", "05": "Mai 2027", "06": "Juin 2027" };
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

    let htmlMensuel = "";
    for (let mois in statsParMois) {
        let moyMois = (statsParMois[mois].somme / statsParMois[mois].count).toFixed(1);
        htmlMensuel += `
            <div class="monthly-stat-item">
                <span>📅 ${mois} (${statsParMois[mois].count} tirs)</span>
                <span>Moyenne : <b>${moyMois}</b> | Max : <b style="color:gold;">${statsParMois[mois].max}</b></span>
            </div>
        `;
    }

    const dernier = tousLesScoresDetailles.length > 0 ? tousLesScoresDetailles[tousLesScoresDetailles.length - 1].score : 0;

    document.getElementById("etat").innerHTML = `
        <h2>📈 Statistiques & Progression</h2>
        <div style="display:grid; grid-template-columns: repeat(auto-fit,minmax(220px,1fr)); gap:15px;">
            <div class="card"><h3>🎯 Dernier score</h3><p style="font-size:32px; font-weight:bold;">${dernier}</p></div>
            <div class="card"><h3>🏆 Record</h3><p style="font-size:32px; font-weight:bold; color:gold;">${meilleurGlobal}</p></div>
            <div class="card"><h3>📊 Moyenne saison</h3><p style="font-size:32px; font-weight:bold;">${moyenne}</p></div>
            <div class="card"><h3>📋 Résultats</h3><p style="font-size:32px; font-weight:bold;">${totalResultats}</p></div>
        </div>

        <div style="display:grid; grid-template-columns: repeat(auto-fit,minmax(250px,1fr)); gap:15px; margin-top:15px;">
            <div class="card" style="border-left: 4px solid #10b981;">
                <h3>🔥 Forme du moment (5 derniers tirs)</h3>
                <p style="font-size:28px; font-weight:bold; margin:8px 0 4px 0;">${moyenne5} pts</p>
                <small style="color:var(--muted); font-weight:600;">${badgeForme}</small>
            </div>
            <div class="card" style="border-left: 4px solid #f5b301;">
                <h3>📐 Régularité (Écart-type)</h3>
                <p style="font-size:28px; font-weight:bold; margin:8px 0 4px 0;">± ${ecartType} pts</p>
                <small style="color:var(--muted); font-weight:600;">Profil : ${appreciationRegularite}</small>
            </div>
        </div>

        <div class="card" style="margin-top:20px;">
            <h3>📈 Progression mensuelle automatique</h3>
            ${htmlMensuel || "<p>Aucune donnée mensuelle disponible.</p>"}
        </div>

        <hr style="margin:20px 0; border:0; border-top:1px solid var(--border);">
        <h3>📊 Évolution des performances & Objectif (${objectif} pts)</h3>
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
    const serieObjectif = events.map(() => objectif);

    const allScores = [...scoresExcel, ...entrainementsExcel, objectif];
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

function exporterScores() {
    const historique = JSON.parse(localStorage.getItem("scores")) || [];
    if (historique.length === 0) { afficherToast("⚠️ Aucun score à exporter."); return; }
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
    afficherToast("✅ Export JSON terminé");
}

function exporterExcel() {
    const historique = JSON.parse(localStorage.getItem("scores")) || [];
    if (historique.length === 0) { afficherToast("⚠️ Aucun score à exporter."); return; }
    const donnees = historique.map(item => ({
        Date: item.date,
        Type: item.type === "match" ? "Compétition" : "Entraînement",
        Score: Number(item.score),
        Series: (item.series || []).join(" | "),
        Notes: item.note || ""
    }));
    donnees.unshift({ Date: new Date().toLocaleDateString("fr-FR"), Type: "Export Tir Cécillya", Score: "", Series: "", Notes: "" });
    const feuille = XLSX.utils.json_to_sheet(donnees);
    const classeur = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(classeur, feuille, "Scores");
    XLSX.writeFile(classeur, "scores_cecillya.xlsx");
    afficherToast("✅ Export Excel terminé");
}

function importerScores(event) {
    const fichier = event.target.files[0];
    if (!fichier) return;

    const lecteur = new FileReader();
    lecteur.onload = function (e) {
        try {
            const donnees = JSON.parse(e.target.result);
            if (!Array.isArray(donnees)) { afficherToast("❌ Fichier JSON invalide."); return; }
            donnees.forEach(item => {
                if (item.type === "Compétition") item.type = "match";
                if (item.type === "Entraînement") item.type = "entrainement";
            });

            let historique = JSON.parse(localStorage.getItem("scores")) || [];
            const existants = new Set(historique.map(item => item.date + "|" + item.type + "|" + item.score));
            const nouveaux = donnees.filter(item => item.date && !isNaN(Number(item.score)) && !existants.has(item.date + "|" + item.type + "|" + item.score));

            historique = [...historique, ...nouveaux];
            localStorage.setItem("scores", JSON.stringify(historique));
            afficherToast("✅ " + nouveaux.length + " nouveau(x) score(s) importé(s).");
            chargerCalendrier().then(() => { afficherResultats(); });
        } catch (erreur) {
            afficherToast("❌ Erreur lors de l'import.");
        }
    };
    lecteur.readAsText(fichier);
}

async function synchroniserScores() {
    try {
        const { data, error } = await supabaseClient.from("scores").select("*");
        if (error) { console.error(error); return; }
        const locaux = JSON.parse(localStorage.getItem("scores")) || [];
        const notesMap = new Map(locaux.map(l => [`${l.date}|${l.type}|${l.score}`, { note: l.note, series: l.series }]));

        const historique = data.map(item => {
            const key = `${item.date}|${item.type}|${Number(item.score)}`;
            const extra = notesMap.get(key) || {};
            return { date: item.date, type: item.type, score: Number(item.score), note: extra.note || "", series: extra.series || [] };
        });
        localStorage.setItem("scores", JSON.stringify(historique));
    } catch (e) {
        console.warn("Mode hors-ligne : utilisation du cache local.");
    }
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
        document.getElementById("etat").innerHTML = "<h2>🥇 Top 10 & Historique des records</h2><p>Aucun score.</p>";
        return;
    }

    tousLesScores.sort((a, b) => {
        const [ja, ma] = a.date.split("/");
        const [jb, mb] = b.date.split("/");
        return new Date(2026, ma - 1, ja) - new Date(2026, mb - 1, jb);
    });

    let historiqueRecords = [];
    let recordMaxActuel = 0;
    tousLesScores.forEach(item => {
        if (item.score > recordMaxActuel) {
            recordMaxActuel = item.score;
            historiqueRecords.push({ date: item.date, score: item.score, type: item.type });
        }
    });

    const top10 = [...tousLesScores].sort((a, b) => b.score - a.score).slice(0, 10);
    const record = top10.length > 0 ? Math.max(...tousLesScores.map(s => s.score)) : 0;
    const moyenneTop10 = top10.length > 0 ? (top10.reduce((total, item) => total + item.score, 0) / top10.length).toFixed(1) : 0;

    let htmlHistorique = "";
    historiqueRecords.forEach(rec => {
        htmlHistorique += `
            <div class="monthly-stat-item">
                <span>📅 ${rec.date} (${rec.type})</span>
                <span>Nouveau record : <b style="color:gold;">${rec.score} pts</b></span>
            </div>
        `;
    });

    let html = `
        <h2>🥇 Top 10 & 🏆 Historique des records</h2>
        <div class="podium" style="display:flex; gap:10px; margin-bottom:16px;">
            <div class="second card" style="text-align:center; flex:1;">🥈<br><b>${top10[1] ? top10[1].score : "-"}</b></div>
            <div class="first card" style="text-align:center; flex:1; border:2px solid gold;">🥇<br><b style="color:gold;">${top10[0] ? top10[0].score : "-"}</b></div>
            <div class="third card" style="text-align:center; flex:1;">🥉<br><b>${top10[2] ? top10[2].score : "-"}</b></div>
        </div>
        <div class="card" style="margin-bottom:16px;">
            <p style="color:gold; font-size:20px; font-weight:bold; margin:0 0 6px 0;">🏆 Record personnel absolu : ${record}</p>
            <p style="font-size:16px; margin:0;">📈 Moyenne du Top 10 : <b>${moyenneTop10}</b></p>
        </div>

        <div class="card" style="margin-bottom:20px;">
            <h3>🏆 Historique des records battus</h3>
            ${htmlHistorique || "<p>Aucun record enregistré.</p>"}
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
