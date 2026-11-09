
async function chargerCalendrier() {

    const response = await fetch(
        "Calendrier_Ligue_Tir_NPdC_2026_2027_dernier.xlsx"
    );

    const data = await response.arrayBuffer();

    const workbook = XLSX.read(data);

    document.getElementById("etat").innerHTML =
        "✅ Excel chargé : " +
        workbook.SheetNames.length +
        " feuille(s)";
}

chargerCalendrier();
