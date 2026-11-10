async function chargerCalendrier() {

    try {

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
            const statut = ligne[5];

            if (evenement && statut === "À venir") {



                html += `
                <div style="padding:10px;border-bottom:1px solid #ddd;">
                    <b>${date || ""}</b><br>
                    ${evenement}<br>
                    📍 ${lieu || "-"}<br>
✅ ${statut}

                </div>
                `;

                compteur++;

                if (compteur >= 20) break;
            }
        }

        document.getElementById("etat").innerHTML = html;

    } catch (erreur) {

        document.getElementById("etat").innerHTML =
            "❌ Erreur : " + erreur.message;

    }
}

chargerCalendrier();
function afficherToutes() {

   const cartes =
        document.querySelectorAll(".competition");

    cartes.forEach(carte => {

        carte.style.display = "block";

    });

}

function afficherAVenir() {

    const cartes =
        document.querySelectorAll(".competition");

    cartes.forEach(carte => {

        const texte =
            carte.innerText.toLowerCase();

        if (
            texte.includes("novembre") ||
            texte.includes("décembre") ||
            texte.includes("janvier") ||
            texte.includes("février") ||
            texte.includes("mars") ||
            texte.includes("avril") ||
            texte.includes("mai") ||
            texte.includes("juin") ||
            texte.includes("juillet") ||
            texte.includes("août") ||
            texte.includes("septembre 2027")
        ) {

            carte.style.display = "block";

        } else {

            carte.style.display = "none";

        }

    });

}

function afficherResultats() {

    alert("Résultats");

}

function afficherStats() {

    alert("Statistiques");

}
