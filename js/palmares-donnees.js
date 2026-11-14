/* Palmarès officiel — source : Statis'tir / FFTir, fiche BOLVIN Cécillya (Carabiniers Maubeuge) */
const PALMARES = [
  /* ===== CARABINE 10 MÈTRES (sur 600) ===== */
  { saison: "2025-2026", date: "2025-10", discipline: "10m", categorie: "Dames 1", competition: "Championnat départemental 10m — Nord", score: 604, place: 3, sur: 0 },
  { saison: "2025-2026", date: "2025-11", discipline: "10m", categorie: "Dames 1", competition: "Championnat régional 10m — NPdC", score: 605.1, place: 5, sur: 0 },
  { saison: "2024-2025", date: "2024-10", discipline: "10m", categorie: "Dames 1", competition: "Championnat départemental 10m — Nord", score: 607.8, place: 2, sur: 0 },
  { saison: "2024-2025", date: "2024-11", discipline: "10m", categorie: "Dames 1", competition: "Championnat régional 10m — NPdC", score: 605.3, place: 2, sur: 0 },
  { saison: "2023-2024", date: "2023-09", discipline: "10m", categorie: "Juniors filles", competition: "Championnat départemental 10m — Nord", score: 603.9, place: 2, sur: 0 },
  { saison: "2023-2024", date: "2023-10", discipline: "10m", categorie: "Juniors filles", competition: "Championnat régional 10m — NPdC", score: 598.2, place: 3, sur: 0 },
  { saison: "2023-2024", date: "2024-02", discipline: "10m", categorie: "Juniors filles", competition: "Championnat de France 10m — Tarbes", score: 598.4, place: 55, sur: 0 },
  { saison: "2022-2023", date: "2022-09", discipline: "10m", categorie: "Juniors filles", competition: "Championnat départemental 10m — Nord", score: 601.6, place: 1, sur: 0 },
  { saison: "2022-2023", date: "2022-10", discipline: "10m", categorie: "Juniors filles", competition: "Championnat régional 10m — NPdC", score: 603.2, place: 1, sur: 0 },
  { saison: "2022-2023", date: "2023-02", discipline: "10m", categorie: "Juniors filles", competition: "Championnat de France 10m — Montluçon", score: 598, place: 40, sur: 0 },
  { saison: "2021-2022", date: "2021-09", discipline: "10m", categorie: "Juniors filles", competition: "Championnat départemental 10m — Nord", score: 597, place: 3, sur: 0 },
  { saison: "2021-2022", date: "2021-10", discipline: "10m", categorie: "Juniors filles", competition: "Championnat régional 10m — NPdC", score: 584.1, place: 5, sur: 0 },
  { saison: "2021-2022", date: "2022-02", discipline: "10m", categorie: "Juniors filles", competition: "Championnat de France 10m — Besançon", score: 593.7, place: 39, sur: 0 },
  { saison: "2019-2020", date: "2019-10", discipline: "10m", categorie: "Cadettes filles", competition: "Championnat départemental 10m — Nord", score: 586.8, place: 4, sur: 0 },
  { saison: "2019-2020", date: "2019-11", discipline: "10m", categorie: "Cadettes filles", competition: "Championnat régional 10m — NPdC", score: 581.8, place: 7, sur: 0 },
  { saison: "2019-2020", date: "2020-02", discipline: "10m", categorie: "Cadettes filles", competition: "Championnat de France 10m — Niort", score: 586.2, place: 66, sur: 0 },
  { saison: "2017-2018", date: "2018-05", discipline: "10m", categorie: "Minimes filles", competition: "CdF Écoles de tir — 10m école", score: 390.6, place: 12, sur: 400 },
  { saison: "2017-2018", date: "2018-05", discipline: "10m", categorie: "Minimes filles", competition: "CdF Écoles de tir — 10m 3 positions", score: 277, place: 19, sur: 300 },
  { saison: "2017-2018", date: "2018-04", discipline: "10m", categorie: "Minimes filles", competition: "Régional Écoles de tir — 10m école", score: 389.5, place: 2, sur: 400 },
  { saison: "2017-2018", date: "2018-04", discipline: "10m", categorie: "Minimes filles", competition: "Régional Écoles de tir — 10m 3 pos.", score: 275, place: 5, sur: 300 },

  /* ===== CARABINE 60 BALLES COUCHÉ — 50 M (sur 654) ===== */
  { saison: "2025-2026", date: "2025-10", discipline: "50m", categorie: "Dames 1", competition: "Championnat départemental 25/50m — Nord", score: 604.3, place: 2, sur: 0 },
  { saison: "2025-2026", date: "2025-11", discipline: "50m", categorie: "Dames 1", competition: "Championnat régional 25/50m — NPdC", score: 602, place: 3, sur: 0 },
  { saison: "2025-2026", date: "2026-07", discipline: "50m", categorie: "Dames 1", competition: "47e CdF 25/50m — Volmerange", score: 602.4, place: 32, sur: 0 },
  { saison: "2024-2025", date: "2024-10", discipline: "50m", categorie: "Dames 1", competition: "Championnat départemental 25/50m — Nord", score: 612, place: 1, sur: 0 },
  { saison: "2024-2025", date: "2024-11", discipline: "50m", categorie: "Dames 1", competition: "Championnat régional 25/50m — NPdC", score: 610.8, place: 3, sur: 0 },
  { saison: "2023-2024", date: "2023-10", discipline: "50m", categorie: "Juniors filles", competition: "Championnat départemental 25/50m — Nord", score: 614.3, place: 1, sur: 0 },
  { saison: "2023-2024", date: "2023-11", discipline: "50m", categorie: "Juniors filles", competition: "Championnat régional 25/50m — NPdC", score: 615.6, place: 1, sur: 0 },
  { saison: "2023-2024", date: "2024-07", discipline: "50m", categorie: "Juniors filles", competition: "CdF 25/50m — Moulins", score: 607.2, place: 17, sur: 0 },
  { saison: "2022-2023", date: "2022-10", discipline: "50m", categorie: "Juniors filles", competition: "Championnat départemental 25/50m — Nord", score: 602.6, place: 1, sur: 0 },
  { saison: "2022-2023", date: "2022-11", discipline: "50m", categorie: "Juniors filles", competition: "Championnat régional 25/50m — NPdC", score: 603.8, place: 3, sur: 0 },
  { saison: "2022-2023", date: "2023-07", discipline: "50m", categorie: "Juniors filles", competition: "CdF 25/50m — 50m couché", score: 605.8, place: 10, sur: 0 },
  { saison: "2021-2022", date: "2021-10", discipline: "50m", categorie: "Juniors filles", competition: "Championnat départemental 25/50m — Nord", score: 591.1, place: 2, sur: 0 },
  { saison: "2021-2022", date: "2021-11", discipline: "50m", categorie: "Juniors filles", competition: "Championnat régional 25/50m — NPdC", score: 587.6, place: 3, sur: 0 },
  { saison: "2021-2022", date: "2022-07", discipline: "50m", categorie: "Juniors filles", competition: "CdF 25/50m — Volmerange", score: 590.7, place: 19, sur: 0 },
  { saison: "2019-2020", date: "2019-10", discipline: "50m", categorie: "Cadettes filles", competition: "Championnat départemental 25/50m — Nord", score: 578.2, place: 4, sur: 0 },
  { saison: "2019-2020", date: "2019-11", discipline: "50m", categorie: "Cadettes filles", competition: "Championnat régional 25/50m — NPdC", score: 588.4, place: 3, sur: 0 },
  { saison: "2019-2020", date: "2020-07", discipline: "50m", categorie: "Cadettes filles", competition: "CdF 25/50m — 50m couché", score: 595.9, place: 29, sur: 0 },

  /* ===== AUTRES DISCIPLINES 50 M ===== */
  { saison: "2022-2023", date: "2022-11", discipline: "50m-3x20", categorie: "Juniors filles", competition: "Championnat régional 25/50m — 3x20", score: 524, place: 3, sur: 600 },
  { saison: "2021-2022", date: "2021-11", discipline: "50m-3x40", categorie: "Juniors filles", competition: "Championnat régional 25/50m — 3x40", score: 1083, place: 1, sur: 1200 },
  { saison: "2021-2022", date: "2021-10", discipline: "50m-3x40", categorie: "Juniors filles", competition: "Championnat départemental 25/50m — 3x40", score: 1042, place: 2, sur: 1200 },
  { saison: "2021-2022", date: "2022-07", discipline: "50m-3x40", categorie: "Juniors filles", competition: "CdF 25/50m — 3x40", score: 1042, place: 26, sur: 1200 },

  /* ===== PAR ÉQUIPES ===== */
  { saison: "2025-2026", date: "2026-03", discipline: "equipe", categorie: "Équipe", competition: "CdF des Clubs 10m — équipe NPdC", score: 1422.2, place: 7, sur: 0, membres: "BRACQ Florian, COLLET Marie-Claude, GUERIN Jean-Baptiste, LYS Thomas, BOLVIN Cécillya" },
  { saison: "2025-2026", date: "2026-03", discipline: "equipe", categorie: "Équipe", competition: "CdF des Clubs 10m — Écoles de tir", score: 539.1, place: 15, sur: 0, membres: "DENIS Lorie, MORSA Quentin, BOLVIN Cécillya" }
];

export { PALMARES };
