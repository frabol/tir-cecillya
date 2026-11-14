import { state, chargerDonneesExcelEtCalendrier, appliquerFiltresCalendrier, exporterEvenementICS } from './calendar.js';
import { getScoresLocaux, setScoresLocaux, getObjectifPersonnel, setObjectifPersonnel, ajouterScore, supprimerScoreParIndex } from './storage.js';
import { calculerStatistiques, dessinerGraphique } from './stats.js';

export let pageActuelle = "tableau";

export function afficherToast(msg) {
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

export async function afficherCalendrier(filtre = "avenir") {
    pageActuelle = "calendrier";
    try {
        const lignes = await chargerDonneesExcelEtCalendrier(filtre);
        let html = "<h2>📅 Calendrier de la saison</h2>";

        if (state.prochainesCompetitions.length > 0) {
            const titreEncart = state.prochainesCompetitions.length > 1
                ? "🎯 Prochaines compétitions (" + state.prochainesCompetitions.length + ")"
                : "🎯 Prochain Match à venir";

            html += '<div class="next-match-card">' +
                    '<h2>' + titreEncart + '</h2>' +
                    '<div style="font-size: 0.9em; color: #93c5fd; font-weight: 700; margin-bottom: 10px;">' +
                        '📅 ' + state.prochainesCompetitions[0].date + ' (' + state.prochainesCompetitions[0].mois + ')' +
                    '</div>' +
                    '<div style="display: flex; flex-direction: column; gap: 10px;">';

            state.prochainesCompetitions.forEach((comp, idx) => {
                const borderStyle = idx > 0 ? "border-top: 1px solid rgba(255,255,255,0.12); padding-top: 10px;" : "";
                html += '<div style="' + borderStyle + '">' +
                            '<div style="font-size: 1.1em; font-weight: bold; color: #fff;">' + comp.evenement + '</div>' +
                            '<div style="font-size: 0.9em; color: #cbd5e1; margin-top: 2px;">📍 ' + comp.lieu + '</div>' +
                        '</div>';
            });
            html += '</div></div>';
        }

        const disciplines = [
            { id: "all", label: "Tous" },
            { id: "10m", label: "10m" },
            { id: "25m", label: "25m" },
            { id: "carabine10m", label: "Carabine 10m" },
            { id: "carabine50m", label: "Carabine 50m" },
            { id: "pistolet", label: "Pistolet" }
        ];

        html += '<div class="filters-section"><h3>Filtrer par discipline</h3><div class="filter-buttons">';
        disciplines.forEach(d => {
            const actif = (state.filtreDisciplineActif === d.id);
            html += '<button class="filter-btn ' + (actif ? 'active' : '') + '" onclick="filtrerParDiscipline(\'' + d.id + '\')">' + d.label + '</button>';
        });
        html += '</div></div>';

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

            if (moisBrut) moisCourant = moisBrut;

            if (evenement && (filtre === "toutes" || statut === "À venir")) {
                if (!premierMoisAffiche) {
                    html += '<div class="month-header">📅 ' + (moisCourant || "Septembre 2026") + '</div><div class="calendar-grid">';
                    premierMoisAffiche = true;
                    dernierMoisAffiche = moisCourant;
                } else if (moisCourant && moisCourant !== dernierMoisAffiche) {
                    html += '</div><div class="month-header" style="margin-top:25px;">📅 ' + moisCourant + '</div><div class="calendar-grid">';
                    dernierMoisAffiche = moisCourant;
                }

                const texteComplet = (String(date || "") + " " + String(evenement) + " " + String(lieu || "")).toLowerCase();
                const estAvenir = (statut === "À venir");
                const evSafe = String(evenement).replace(/'/g, "\\'");
                const lieuSafe = String(lieu || "Lieu non spécifié").replace(/'/g, "\\'");
                const dateSafe = String(date || "").replace(/'/g, "\\'");
                const moisSafe = String(moisCourant || "").replace(/'/g, "\\'");

                html += '<div class="competition competition-card" data-texte="' + texteComplet + '">' +
                            '<div class="competition-left">' +
                                '<div class="competition-date-badge">' + (date || "-") + '</div>' +
                                '<div class="competition-details">' +
                                    '<div class="competition-title">' + evenement + '</div>' +
                                    '<div class="competition-location">📍 ' + (lieu || "Lieu non spécifié") + '</div>' +
                                '</div>' +
                            '</div>' +
                            '<div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">';
                if (estAvenir) {
                    html += '<button class="btn" style="padding:6px 10px!important; font-size:12px!important;" onclick="exporterEvenementICS(\'' + evSafe + '\', \'' + dateSafe + '\', \'' + moisSafe + '\', \'' + lieuSafe + '\')" title="Ajouter à mon agenda">📆 Agenda</button>';
                }
                html += '<span class="competition-badge-status ' + (estAvenir ? 'status-avenir' : 'status-passe') + '">' +
                            (estAvenir ? '✅ À venir' : '📌 Passé') +
                        '</span>' +
                        '</div></div>';
            }
        }
        if (premierMoisAffiche) html += '</div>';

        document.getElementById("etat").innerHTML = html;
        appliquerFiltresCalendrier();
    } catch (erreur) {
        document.getElementById("etat").innerHTML = "❌ Erreur : " + erreur.message;
        afficherToast("⚠️ Erreur lors du chargement du calendrier");
    }
}

export function filtrerParDiscipline(discipline) {
    state.filtreDisciplineActif = discipline;
    document.querySelectorAll(".filter-btn").forEach(btn => {
        const onClickAttr = btn.getAttribute("onclick") || "";
        btn.classList.toggle("active", onClickAttr.includes("'" + discipline + "'"));
    });
    appliquerFiltresCalendrier();
}

export function afficherTableauDeBord() {
    pageActuelle = "tableau";
    const tousLesScores = [...state.scoresExcel, ...state.entrainementsExcel];
    const moyenne = tousLesScores.length > 0 ? (tousLesScores.reduce((a, b) => a + b, 0) / tousLesScores.length).toFixed(1) : 0;
    const record = tousLesScores.length > 0 ? Math.max(...tousLesScores) : 0;
    const dernier = tousLesScores.length > 0 ? tousLesScores[tousLesScores.length - 1] : 0;
    const objectif = getObjectifPersonnel();
    const pourcentageObjectif = Math.min(100, Math.round((record / objectif) * 100));

    let alerteNotification = "";
    if (state.prochainesCompetitions.length > 0) {
        alerteNotification = '<div class="alert-competition">' +
            '<span style="font-size: 28px;">🔔</span>' +
            '<div>' +
                '<div style="font-weight: bold; font-size: 1.05em;">Alerte Compétition Imminente !</div>' +
                '<div style="font-size: 0.95em; opacity: 0.9;">Prochain événement : <b>' + state.prochainesCompetitions[0].evenement + '</b> (' + state.prochainesCompetitions[0].date + ') à ' + state.prochainesCompetitions[0].lieu + '</div>' +
            '</div>' +
        '</div>';
    }

    let contenuProchainesComp = '<p style="font-size:1.1em; font-weight:bold; margin:6px 0 0 0;">Aucune compétition</p>';
    if (state.prochainesCompetitions.length > 0) {
        contenuProchainesComp = '<div style="font-size: 0.9em; color: var(--blue); font-weight: 700; margin: 6px 0 10px 0;">📅 ' + state.prochainesCompetitions[0].date + ' (' + state.prochainesCompetitions[0].mois + ')</div>' +
            '<div style="display: flex; flex-direction: column; gap: 8px;">' +
                state.prochainesCompetitions.map((c, idx) => 
                    '<div style="' + (idx > 0 ? 'border-top: 1px solid var(--border); padding-top: 8px;' : '') + '">' +
                        '<div style="font-size: 1.05em; font-weight: bold;">' + c.evenement + '</div>' +
                        '<div style="font-size: 0.88em; color: var(--muted);">📍 ' + c.lieu + '</div>' +
                    '</div>'
                ).join("") +
            '</div>';
    }

    const titreCardProchaine = state.prochainesCompetitions.length > 1
        ? "📅 Prochaines compétitions (" + state.prochainesCompetitions.length + ")"
        : "📅 Prochaine compétition";

    document.getElementById("etat").innerHTML = alerteNotification +
        '<h2>🏠 Tableau de bord</h2>' +
        '<div style="display:grid; grid-template-columns: repeat(auto-fit,minmax(220px,1fr)); gap:10px;">' +
            '<div class="card"><h3>🎯 Dernier score</h3><p style="font-size:28px; font-weight:bold;">' + dernier + '</p></div>' +
            '<div class="card"><h3>🏆 Record personnel</h3><p style="font-size:28px; font-weight:bold; color:gold;">' + record + '</p></div>' +
            '<div class="card"><h3>📈 Moyenne saison</h3><p style="font-size:28px; font-weight:bold;">' + moyenne + '</p></div>' +
            '<div class="card"><h3>📋 Résultats</h3><p style="font-size:28px; font-weight:bold;">' + tousLesScores.length + '</p></div>' +
        '</div>' +
        '<div class="objective-card" onclick="modifierObjectifPersonnel()" style="cursor: pointer;" title="Cliquez pour modifier l\'objectif">' +
            '<div style="display: flex; justify-content: space-between; align-items: center;">' +
                '<h3 style="margin: 0; color: #ffd84d; font-size: 1.1em;">🎯 Objectif Personnel : ' + objectif + ' pts</h3>' +
                '<span style="font-size: 0.85em; background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 999px;">Modifier ⚙️</span>' +
            '</div>' +
            '<p style="margin: 6px 0 0 0; font-size: 0.95em; opacity: 0.9;">Record actuel : <b>' + record + ' pts</b> (' + pourcentageObjectif + '% de l\'objectif)</p>' +
            '<div class="progress-bar-container"><div class="progress-bar-fill" style="width: ' + pourcentageObjectif + '%;"></div></div>' +
        '</div>' +
        '<div class="card" style="border-left: 5px solid #2563eb; margin-top:16px;">' +
            '<h3>' + titreCardProchaine + '</h3>' +
            contenuProchainesComp +
        '</div>';
}

export function modifierObjectifPersonnel() {
    const objectifActuel = getObjectifPersonnel();
    const nouvelObjectif = prompt("🎯 Entrez votre objectif personnel de score :", objectifActuel);
    if (nouvelObjectif !== null && !isNaN(nouvelObjectif) && Number(nouvelObjectif) > 0) {
        setObjectifPersonnel(nouvelObjectif);
        afficherTableauDeBord();
        afficherToast("✅ Objectif mis à jour !");
    }
}

export function afficherResultats() {
    pageActuelle = "resultats";
    let html = "<h2>🏆 Résultats</h2>";
    const resultats = [];

    const historiqueLocaux = getScoresLocaux();
    const mapLocaux = new Map(historiqueLocaux.map(item => {
        let d = item.date;
        if (d && d.includes("-")) {
            const p = d.split("-");
            d = p[2] + "/" + p[1];
        }
        return [d + "|" + item.type + "|" + Number(item.score), item];
    }));

    for (let i = 0; i < state.datesMatchs.length; i++) {
        const date = state.datesMatchs[i];
        const score = Number(state.scoresExcel[i]);
        const key = date + "|match|" + score;
        const local = mapLocaux.get(key);
        resultats.push({ date: date, type: "🏆 Compétition", score: score, lieu: local?.lieu || state.lieuxParDate[date] || "" });
    }

    for (let i = 0; i < state.datesEntrainements.length; i++) {
        const date = state.datesEntrainements[i];
        const score = Number(state.entrainementsExcel[i]);
        const key = date + "|entrainement|" + score;
        const local = mapLocaux.get(key);
        resultats.push({ date: date, type: "🏋️ Entraînement", score: score, lieu: local?.lieu || state.lieuxParDate[date] || "" });
    }

    resultats.sort((a, b) => {
        const [ja, ma] = (a.date || "").split("/");
        const [jb, mb] = (b.date || "").split("/");
        return new Date(2026, (ma || 1) - 1, ja || 1) - new Date(2026, (mb || 1) - 1, jb || 1);
    });

    if (resultats.length === 0) {
        html += "<p>Aucun résultat enregistré.</p>";
    } else {
        resultats.forEach(item => {
            const detailLieu = item.lieu ? '<div style="font-size:0.88em; color:var(--muted); margin-top:2px;">📍 ' + item.lieu + '</div>' : "";
            html += '<div class="competition competition-card">' +
                        '<div class="competition-left">' +
                            '<div class="competition-date-badge">' + item.date + '</div>' +
                            '<div class="competition-details">' +
                                '<div class="competition-title">' + item.type + '</div>' +
                                detailLieu +
                            '</div>' +
                        '</div>' +
                        '<div><span class="competition-badge-status status-avenir">Score : <b>' + item.score + '</b></span></div>' +
                    '</div>';
        });
    }
    document.getElementById("etat").innerHTML = html;
}

export function ajusterScoreRapide(delta) {
    const input = document.getElementById("valeurScore");
    if (!input) return;
    let val = parseFloat(input.value) || 600.0;
    val = Math.max(0, Math.round((val + delta) * 10) / 10);
    input.value = val.toFixed(1);
}

export function recalculerTotalSeries() {
    let somme = 0;
    let auMoinsUne = false;
    for (let i = 1; i <= 6; i++) {
        const el = document.getElementById("serie_" + i);
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

export function afficherAjoutScore() {
    const aujourdhui = new Date().toISOString().split("T")[0];
    const tousLesScores = [...state.scoresExcel, ...state.entrainementsExcel];
    const scoreDefaut = tousLesScores.length > 0 ? tousLesScores[tousLesScores.length - 1] : 605.0;

    let inputsSeriesHtml = "";
    for (let i = 1; i <= 6; i++) {
        inputsSeriesHtml += '<div><label style="font-size:12px;">Série ' + i + '</label>' +
                            '<input type="number" step="0.1" id="serie_' + i + '" placeholder="101.5" oninput="recalculerTotalSeries()" style="padding:8px; text-align:center; font-weight:700;"></div>';
    }

    document.getElementById("etat").innerHTML = '<h2>➕ Nouveau score — Mode Stand de Tir</h2>' +
        '<div style="display:flex; flex-direction:column; gap:14px; max-width:480px;">' +
            '<div><label for="dateScore">📅 Date :</label><br><input type="date" id="dateScore" value="' + aujourdhui + '" style="margin-top:6px;"></div>' +
            '<div><label for="typeScore">🎯 Type de tir :</label><br><select id="typeScore" style="margin-top:6px;"><option value="entrainement">🏋️ Entraînement</option><option value="match">🏆 Compétition</option></select></div>' +
            '<div><label for="lieuScore">📍 Lieu :</label><br><input type="text" id="lieuScore" placeholder="Ex : Maubeuge, Lille..." style="margin-top:6px;"></div>' +
            '<details style="background:var(--bg); border:1px solid var(--border); border-radius:12px; padding:10px 12px;"><summary style="cursor:pointer; font-weight:700; color:var(--blue);">🎯 Saisir le détail des 6 séries (60 coups)</summary><div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:8px; margin-top:10px;">' + inputsSeriesHtml + '</div></details>' +
            '<div><label for="valeurScore">🔢 Score total (Saisie éclair) :</label><br><input type="number" step="0.1" id="valeurScore" value="' + scoreDefaut + '" placeholder="Ex : 617.5" style="margin-top:6px; font-size:26px; font-weight:800; text-align:center; padding:14px;">' +
            '<div style="display:grid; grid-template-columns: repeat(5, 1fr); gap:8px; margin-top:10px;">' +
                '<button type="button" class="btn" style="justify-content:center; padding:12px 4px!important; font-weight:800!important;" onclick="ajusterScoreRapide(-1)">-1</button>' +
                '<button type="button" class="btn" style="justify-content:center; padding:12px 4px!important; font-weight:800!important;" onclick="ajusterScoreRapide(-0.5)">-0.5</button>' +
                '<button type="button" class="btn" style="justify-content:center; padding:12px 4px!important; font-weight:800!important;" onclick="ajusterScoreRapide(0.1)">+0.1</button>' +
                '<button type="button" class="btn" style="justify-content:center; padding:12px 4px!important; font-weight:800!important;" onclick="ajusterScoreRapide(0.5)">+0.5</button>' +
                '<button type="button" class="btn" style="justify-content:center; padding:12px 4px!important; font-weight:800!important;" onclick="ajusterScoreRapide(1)">+1</button>' +
            '</div></div>' +
            '<div><label for="noteScore">📝 Notes techniques (plombs, dioptre, sensations) :</label><br><input type="text" id="noteScore" placeholder="Ex : Plombs R10 4.49, +2 clics haut" style="margin-top:6px;"></div>' +
            '<button class="btn btn-primary" style="justify-content:center; padding:14px!important; font-size:16px!important; margin-top:6px;" onclick="enregistrerScore()">💾 Enregistrer le score</button>' +
        '</div>';
}

export async function enregistrerScore() {
    const date = document.getElementById("dateScore").value;
    const type = document.getElementById("typeScore").value;
    const lieu = (document.getElementById("lieuScore")?.value || "").trim();
    const score = Number(document.getElementById("valeurScore").value);
    const note = (document.getElementById("noteScore")?.value || "").trim();

    const series = [];
    for (let i = 1; i <= 6; i++) {
        const val = parseFloat(document.getElementById("serie_" + i)?.value);
        if (!isNaN(val) && val > 0) series.push(val);
    }

    if (!date || isNaN(score) || score <= 0) {
        afficherToast("⚠️ Veuillez saisir une date et un score valide.");
        return;
    }

    const res = await ajouterScore({ date, type, lieu, score, note, series });
    if (!res.ok) {
        afficherToast("⚠️ Ce score existe déjà.");
        return;
    }

    afficherToast(res.offline ? "⚠️ Sauvegardé en local (hors-ligne)" : "✅ Score enregistré et synchronisé");

    const morceaux = date.split("-");
    const dateFormatee = morceaux[2] + "/" + morceaux[1];

    if (type === "match") {
        state.datesMatchs.push(dateFormatee);
        state.scoresExcel.push(score);
    } else {
        state.datesEntrainements.push(dateFormatee);
        state.entrainementsExcel.push(score);
    }

    afficherResultats();
}

export function voirScores() {
    const historique = getScoresLocaux();
    let html = "<h2>📋 Scores saisis</h2>";

    if (historique.length === 0) {
        html += "<p>Aucun score enregistré.</p>";
    } else {
        historique.forEach((item, index) => {
            const detailLieu = item.lieu ? '<div style="font-size:0.88em; color:var(--blue); font-weight:600; margin-top:2px;">📍 ' + item.lieu + '</div>' : '<div style="font-size:0.88em; color:var(--muted); font-style:italic; margin-top:2px;">📍 Lieu non renseigné</div>';
            const detailSeries = item.series && item.series.length > 0 ? '<div style="font-size:0.82em; color:var(--blue); margin-top:2px;">Séries : ' + item.series.join(" • ") + '</div>' : "";
            const detailNote = item.note ? '<div style="font-size:0.82em; color:var(--muted); font-style:italic; margin-top:2px;">📝 ' + item.note + '</div>' : "";

            html += '<div class="competition competition-card">' +
                        '<div class="competition-left">' +
                            '<div class="competition-date-badge">' + item.date + '</div>' +
                            '<div class="competition-details">' +
                                '<div class="competition-title">' + (item.type === "match" ? "🏆 Compétition" : "🏋️ Entraînement") + '</div>' +
                                detailLieu +
                                '<div class="competition-location">Score : <b>' + item.score + '</b></div>' +
                                detailSeries +
                                detailNote +
                            '</div>' +
                        '</div>' +
                        '<div><button onclick="supprimerScore(' + index + ')" style="background:#dc3545; color:white; border:none; padding:6px 12px; border-radius:8px; cursor:pointer; font-weight:600;">🗑️ Supprimer</button></div>' +
                    '</div>';
        });
    }
    document.getElementById("etat").innerHTML = html;
}

export async function supprimerScore(index, callbackReload) {
    if (!confirm("Supprimer ce score ?")) return;
    const res = await supprimerScoreParIndex(index);
    if (!res.ok) {
        afficherToast("❌ Erreur lors de la suppression");
        return;
    }
    afficherToast("🗑️ Score supprimé");
    if (callbackReload) await callbackReload();
    voirScores();
}

export function afficherStats() {
    pageActuelle = "stats";
    const stats = calculerStatistiques();

    if (!stats) {
        document.getElementById("etat").innerHTML = "Aucun score trouvé.";
        return;
    }

    let htmlMensuel = "";
    for (const mois in stats.statsParMois) {
        const moyMois = (stats.statsParMois[mois].somme / stats.statsParMois[mois].count).toFixed(1);
        htmlMensuel += '<div class="monthly-stat-item">' +
            '<span>📅 ' + mois + ' (' + stats.statsParMois[mois].count + ' tirs)</span>' +
            '<span>Moyenne : <b>' + moyMois + '</b> | Max : <b style="color:gold;">' + stats.statsParMois[mois].max + '</b></span>' +
        '</div>';
    }

    document.getElementById("etat").innerHTML = '<h2>📈 Statistiques & Progression</h2>' +
        '<div style="display:grid; grid-template-columns: repeat(auto-fit,minmax(220px,1fr)); gap:15px;">' +
            '<div class="card"><h3>🎯 Dernier score</h3><p style="font-size:32px; font-weight:bold;">' + stats.dernier + '</p></div>' +
            '<div class="card"><h3>🏆 Record</h3><p style="font-size:32px; font-weight:bold; color:gold;">' + stats.meilleurGlobal + '</p></div>' +
            '<div class="card"><h3>📊 Moyenne saison</h3><p style="font-size:32px; font-weight:bold;">' + stats.moyenne + '</p></div>' +
            '<div class="card"><h3>📋 Résultats</h3><p style="font-size:32px; font-weight:bold;">' + stats.totalResultats + '</p></div>' +
        '</div>' +
        '<div style="display:grid; grid-template-columns: repeat(auto-fit,minmax(250px,1fr)); gap:15px; margin-top:15px;">' +
            '<div class="card" style="border-left: 4px solid #10b981;">' +
                '<h3>🔥 Forme du moment (5 derniers tirs)</h3>' +
                '<p style="font-size:28px; font-weight:bold; margin:8px 0 4px 0;">' + stats.moyenne5 + ' pts</p>' +
                '<small style="color:var(--muted); font-weight:600;">' + stats.badgeForme + '</small>' +
            '</div>' +
            '<div class="card" style="border-left: 4px solid #f5b301;">' +
                '<h3>📐 Régularité (Écart-type)</h3>' +
                '<p style="font-size:28px; font-weight:bold; margin:8px 0 4px 0;">± ' + stats.ecartType + ' pts</p>' +
                '<small style="color:var(--muted); font-weight:600;">Profil : ' + stats.appreciationRegularite + '</small>' +
            '</div>' +
        '</div>' +
        '<div class="card" style="margin-top:20px;">' +
            '<h3>📈 Progression mensuelle automatique</h3>' +
            (htmlMensuel || "<p>Aucune donnée mensuelle disponible.</p>") +
        '</div>' +
        '<hr style="margin:20px 0; border:0; border-top:1px solid var(--border);">' +
        '<h3>📊 Évolution des performances & Objectif (' + stats.objectif + ' pts)</h3>' +
        '<div class="chart-wrap"><canvas id="graphiqueScores"></canvas></div>';

    dessinerGraphique("graphiqueScores");
}

export function afficherTop10() {
    pageActuelle = "top10";
    const tousLesScores = [];
    for (let i = 0; i < state.datesMatchs.length; i++) {
        tousLesScores.push({ date: state.datesMatchs[i], type: "🏆 Compétition", score: Number(state.scoresExcel[i]) });
    }
    for (let i = 0; i < state.datesEntrainements.length; i++) {
        tousLesScores.push({ date: state.datesEntrainements[i], type: "🏋️ Entraînement", score: Number(state.entrainementsExcel[i]) });
    }

    if (tousLesScores.length === 0) {
        document.getElementById("etat").innerHTML = "<h2>🥇 Top 10 & Historique des records</h2><p>Aucun score.</p>";
        return;
    }

    tousLesScores.sort((a, b) => {
        const [ja, ma] = a.date.split("/");
        const [jb, mb] = b.date.split("/");
        return new Date(2026, ma - 1, ja) - new Date(2026, mb - 1, jb);
    });

    const historiqueRecords = [];
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
        htmlHistorique += '<div class="monthly-stat-item"><span>📅 ' + rec.date + ' (' + rec.type + ')</span><span>Nouveau record : <b style="color:gold;">' + rec.score + ' pts</b></span></div>';
    });

    let html = '<h2>🥇 Top 10 & 🏆 Historique des records</h2>' +
        '<div class="podium" style="display:flex; gap:10px; margin-bottom:16px;">' +
            '<div class="second card" style="text-align:center; flex:1;">🥈<br><b>' + (top10[1] ? top10[1].score : "-") + '</b></div>' +
            '<div class="first card" style="text-align:center; flex:1; border:2px solid gold;">🥇<br><b style="color:gold;">' + (top10[0] ? top10[0].score : "-") + '</b></div>' +
            '<div class="third card" style="text-align:center; flex:1;">🥉<br><b>' + (top10[2] ? top10[2].score : "-") + '</b></div>' +
        '</div>' +
        '<div class="card" style="margin-bottom:16px;">' +
            '<p style="color:gold; font-size:20px; font-weight:bold; margin:0 0 6px 0;">🏆 Record personnel absolu : ' + record + '</p>' +
            '<p style="font-size:16px; margin:0;">📈 Moyenne du Top 10 : <b>' + moyenneTop10 + '</b></p>' +
        '</div>' +
        '<div class="card" style="margin-bottom:20px;"><h3>🏆 Historique des records battus</h3>' + (htmlHistorique || "<p>Aucun record enregistré.</p>") + '</div>';

    top10.forEach((item, index) => {
        const emoji = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "🎯";
        html += '<div class="competition competition-card">' +
                    '<div class="competition-left">' +
                        '<div class="competition-date-badge">' + emoji + ' #' + (index + 1) + '</div>' +
                        '<div class="competition-details">' +
                            '<div class="competition-title">' + item.type + '</div>' +
                            '<div class="competition-location">📅 ' + item.date + '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div><span class="competition-badge-status status-avenir">Score : <b>' + item.score + '</b></span></div>' +
                '</div>';
    });

    document.getElementById("etat").innerHTML = html;
}

export function exporterScoresJSON() {
    const historique = getScoresLocaux();
    if (historique.length === 0) { afficherToast("⚠️ Aucun score à exporter."); return; }
    const blob = new Blob([JSON.stringify(historique, null, 2)], { type: "application/json" });
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

export function exporterScoresExcel() {
    const historique = getScoresLocaux();
    if (historique.length === 0) { afficherToast("⚠️ Aucun score à exporter."); return; }
    const donnees = historique.map(item => ({
        Date: item.date,
        Type: item.type === "match" ? "Compétition" : "Entraînement",
        Lieu: item.lieu || "",
        Score: Number(item.score),
        Series: (item.series || []).join(" | "),
        Notes: item.note || ""
    }));
    donnees.unshift({ Date: new Date().toLocaleDateString("fr-FR"), Type: "Export Tir Cécillya", Lieu: "", Score: "", Series: "", Notes: "" });
    const feuille = XLSX.utils.json_to_sheet(donnees);
    const classeur = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(classeur, feuille, "Scores");
    XLSX.writeFile(classeur, "scores_cecillya.xlsx");
    afficherToast("✅ Export Excel terminé");
}

export function importerScoresJSON(event, callbackReload) {
    const fichier = event.target.files[0];
    if (!fichier) return;

    const lecteur = new FileReader();
    lecteur.onload = async function (e) {
        try {
            const donnees = JSON.parse(e.target.result);
            if (!Array.isArray(donnees)) { afficherToast("❌ Fichier JSON invalide."); return; }
            donnees.forEach(item => {
                if (item.type === "Compétition") item.type = "match";
                if (item.type === "Entraînement") item.type = "entrainement";
            });

            const historique = getScoresLocaux();
            const existants = new Set(historique.map(item => item.date + "|" + item.type + "|" + item.score));
            const nouveaux = donnees.filter(item =>
                item.date && !isNaN(Number(item.score)) && !existants.has(item.date + "|" + item.type + "|" + item.score)
            );

            setScoresLocaux([...historique, ...nouveaux]);
            afficherToast("✅ " + nouveaux.length + " nouveau(x) score(s) importé(s).");
            if (callbackReload) await callbackReload();
            afficherResultats();
        } catch (erreur) {
            afficherToast("❌ Erreur lors de l'import.");
        }
    };
    lecteur.readAsText(fichier);
}
