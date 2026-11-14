const supabaseUrl = "https://tfotbvxoozlbfdzmifdu.supabase.co";
const supabaseKey = "sb_publishable_X-6C7DV9K8B7AiUlnpqAvw_KYEaUOKl";
export const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

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

    const { error } = await supabaseClient.from("scores").delete()
        .eq("date", scoreASupprimer.date)
        .eq("type", scoreASupprimer.type)
        .eq("score", scoreASupprimer.score);

    if (error) {
        return { ok: false };
    }

    historique.splice(index, 1);
    setScoresLocaux(historique);
    return { ok: true };
}
