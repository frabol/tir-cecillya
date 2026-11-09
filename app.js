async function chargerCalendrier() {

    const response = await fetch(
        "Calendrier_Ligue_Tir_NPdC_2026_2027_dernier.xlsx"
    );

    const data = await response.arrayBuffer();

    const workbook = XLSX.read(data);

    let html = "✅ Excel chargé<br><br>";

    html += "<b>Feuilles trouvées :</b><br>";

    workbook.SheetNames.forEach(sheet => {
        html += "• " + sheet + "<br>";
    });

    document.getElementById("etat").innerHTML = html;
}

chargerCalendrier();

