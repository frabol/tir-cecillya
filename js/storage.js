const supabaseUrl = "https://tfotbvxoozlbfdzmifdu.supabase.co";
const supabaseKey = "sb_publishable_X-6C7DV9K8B7AiUlnpqAvw_KYEaUOKl";
export const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

/* ---------------------------------------------------------------
   PROTECTION EN ÉCRITURE
   Une seule personne autorisée à écrire (toi) ; lecture ouverte.
   L'écriture cloud exige une session Supabase Auth valide, et la
   base refuse toute modification sans elle (RLS, voir supabase.sql).
   --------------------------------------------------------------- */
const EMAIL_AUTORISE = "frabol2@hotmail.com";
const CLE_SESSION = "cecillya_session";

export async function estConnecte() {
    try {
        const { data } = await supabaseClient.auth.getSession();
        return Boolean(data && data.session);
    } catch (e) {
        return false;
    }
}

let _dejaSignale = false;

/**
 * Refuse l'écriture cloud si personne n'est connecté.
 * Retourne { autorise: true } ou { autorise: false, message: "..." }.
 */
export async function verifierEcriture() {
    if (await estConnecte()) return { autorise: true };

    if (localStorage.getItem(CLE_SESSION)) {
        return { autorise: false, message: "Session expirée — reconnexion nécessaire." };
    }

    if (!_dejaSignale) {
        _dejaSignale = true;
        return { autorise: false, message: "Mode lecture seule : connexion requise pour modifier." };
    }
    return { autorise: false };
}

/** Connexion — à appeler depuis un formulaire discret. */
export async function seConnecter(email, motDePasse) {
    if (email.trim().toLowerCase() !== EMAIL_AUTORISE) {
        return { ok: false, message: "Compte non autorisé en écriture." };
    }
    const { error } = await supabaseClient.auth.signInWithPassword({
        email: EMAIL_AUTORISE,
        password: motDePasse
    });
    if (error) return { ok: false, message: "Email ou mot de passe incorrect." };
    localStorage.setItem(CLE_SESSION, "1");
    _dejaSignale = false;
    return { ok: true };
}

export async function seDeconnecter() {
    try { await supabaseClient.auth.signOut(); } catch (e) {}
    localStorage.removeItem(CLE_SESSION);
}

export function getScoresLocaux() {
    return JSON.parse(localStorage.getItem("scores")) || [];
}

export function setScoresLocaux(scores) {
    localStorage.setItem("scores", JSON.stringify(scores));
}

export function getObjectifPersonnel() {
    return Number(localStorage.getItem("objectif_tir")) || 620;
}

export function setObjectifPersonnel(val) {
    localStorage.setItem("objectif_tir", Number(val));
}

export async function synchroniserScores() {
    try {
        const { data, error } = await supabaseClient.from("scores").select("*");
        if (error) {
            console.error(error);
            return;
        }
        const locaux = getScoresLocaux();
        const notesMap = new Map(locaux.map(l => [`${l.date}|${l.type}|${l.score}`, { note: l.note, series: l.series, lieu: l.lieu }]));

        const historique = data.map(item => {
            const key = `${item.date}|${item.type}|${Number(item.score)}`;
            const extra = notesMap.get(key) || {};
            return {
                date: item.date,
                type: item.type,
                lieu: item.lieu || extra.lieu || "",
                score: Number(item.score),
                note: extra.note || "",
                series: extra.series || []
            };
        });
        setScoresLocaux(historique);
    } catch (e) {
        console.warn("Mode hors-ligne : utilisation du cache local.");
    }
}

export async function ajouterScore(nouveauScore) {
    const historique = getScoresLocaux();
    const existe = historique.some(item =>
        item.date === nouveauScore.date &&
        item.type === nouveauScore.type &&
        Number(item.score) === nouveauScore.score
    );
    if (existe) {
        return { ok: false, raison: "existe" };
    }

    // --- Contrôle d'écriture AVANT toute modification ---
    const droit = await verifierEcriture();
    if (!droit.autorise) {
        return { ok: false, raison: "non-connecte", message: droit.message };
    }

    historique.push(nouveauScore);
    setScoresLocaux(historique);

    const { error } = await supabaseClient.from("scores").insert([{
        date: nouveauScore.date,
        type: nouveauScore.type,
        lieu: nouveauScore.lieu || "",
        score: nouveauScore.score
    }]);

    return { ok: true, offline: Boolean(error) };
}

export async function supprimerScoreParIndex(index) {
    const historique = getScoresLocaux();
    const scoreASupprimer = historique[index];
    if (!scoreASupprimer) return { ok: false };

    // --- Contrôle d'écriture AVANT toute modification ---
    const droit = await verifierEcriture();
    if (!droit.autorise) {
        return { ok: false, raison: "non-connecte", message: droit.message };
    }

    // Offline-first : on retire en local dans tous les cas, puis on tente le cloud.
    historique.splice(index, 1);
    setScoresLocaux(historique);

    try {
        const { error } = await supabaseClient.from("scores").delete()
            .eq("date", scoreASupprimer.date)
            .eq("type", scoreASupprimer.type)
            .eq("score", scoreASupprimer.score);
        return { ok: true, offline: Boolean(error) };
    } catch (e) {
        return { ok: true, offline: true };
    }
}
