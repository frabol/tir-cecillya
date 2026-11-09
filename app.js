async function chargerCalendrier() {

    const response = await fetch(
        "Calendrier_Ligue_Tir_NPdC_2026_2027_dernier.xlsx"
    );

    const data = await response.arrayBuffer();

    const workbook = XLSX.read(data);

    const sheet = workbook.Sheets["Calendrier 2026-2027"];

    const lignes = XLSX.utils.sheet_to_json(sheet, {
        header: 1
    });

    let htmlCompetitions = "";

    for (let i = 4; i < lignes.length; i++) {

        const ligne = lignes[i];

        if (!ligne) continue;

        const date = ligne[1];
        const evenement = ligne[2];
        const lieu = ligne[3];
        const statut = ligne[5];

        if (statut === "À venir") {

            htmlCompetitions += `
            <div class="competition">
                <div class="date">${date || ""}</div>
                <b>${evenement || ""}</b><br>
                📍 ${lieu || "-"}<br>
                <span style="color:green">
                ✅ ${statut}
                </span>
            </div>
            `;
        }
    }

    document.getElementById("competitions")
        .innerHTML = htmlCompetitions;

    document.getElementById("etat")
        .innerHTML =
        "✅ Filtre 'À venir' activé";
}

chargerCalendrier();
