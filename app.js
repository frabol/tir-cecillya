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

    let html = "<h3>📅 Compétitions trouvées</h3>";

    let compteur = 0;

    for (let i = 4; i < lignes.length; i++) {

        const ligne = lignes[i];

        if (!ligne) continue;

        const date = ligne[1];
        const evenement = ligne[2];
        const lieu = ligne[3];

        if (evenement) {

            html += `
                <div style="
                padding:10px;
                margin:10px 0;
                border-bottom:1px solid #ddd;">
                <b>${date || ""}</b><br>
                ${evenement}<br>
                📍 ${lieu || "-"}
                </div>
            `;

            compteur++;

            if (compteur >= 15) break;
        }
    }

    document.getElementById("etat").innerHTML = html;
}

chargerCalendrier();
