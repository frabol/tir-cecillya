async function chargerCalendrier() {

  const response = await fetch(
    "Calendrier_Ligue_Tir_NPdC_2026_2027_dernier.xlsx"
  );

  if (!response.ok) {
    console.error("Impossible de charger le fichier Excel");
    return;
  }

  document.getElementById("etat").innerHTML =
    "✅ Calendrier chargé";
}

chargerCalendrier();
