import { afficherToast } from './ui.js';

let timerInterval = null;
let tempsRestant = 15 * 60; // en secondes
let dureeTotalePhase = 15 * 60;
let phaseActuelle = "essais"; // "essais" ou "match"
let timerActif = false;
let modeActuelConfig = { essais: 15, match: 75, nom: "10m - 60 coups (Électro)" };

export function jouerBip(frequence = 880, duree = 0.2, type = 'sine') {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.value = frequence;
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duree);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duree);
    } catch (e) {
        console.warn("Audio non supporté", e);
    }
}

export function testerSonTimer() {
    jouerBip(880, 0.15);
    setTimeout(() => jouerBip(880, 0.15), 200);
    setTimeout(() => jouerBip(1320, 0.4), 400);
    afficherToast("🔊 Test audio du stand effectué");
}

export function formaterTemps(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return String(m).padStart(2, '0') + ":" + String(s).padStart(2, '0');
}

export function appliquerPresetTimer(essaisMin, matchMin, nom) {
    arreterTimer();
    modeActuelConfig = { essais: essaisMin, match: matchMin, nom };
    phaseActuelle = essaisMin > 0 ? "essais" : "match";
    dureeTotalePhase = (phaseActuelle === "essais" ? essaisMin : matchMin) * 60;
    tempsRestant = dureeTotalePhase;
    mettreAJourAffichageTimer();
    afficherToast("🎯 Preset chargé : " + nom);
}

export function changerPhaseTimer() {
    arreterTimer();
    if (phaseActuelle === "essais" && modeActuelConfig.match > 0) {
        phaseActuelle = "match";
        dureeTotalePhase = modeActuelConfig.match * 60;
        tempsRestant = dureeTotalePhase;
        jouerBip(1046, 0.5);
        afficherToast("🏆 Passage à la phase MATCH !");
    } else {
        phaseActuelle = "essais";
        dureeTotalePhase = modeActuelConfig.essais * 60;
        tempsRestant = dureeTotalePhase;
        jouerBip(659, 0.3);
        afficherToast("🎯 Retour aux ESSAIS");
    }
    mettreAJourAffichageTimer();
}

export function demarrerPauseTimer() {
    const btn = document.getElementById("btn-start-pause");
    if (timerActif) {
        clearInterval(timerInterval);
        timerActif = false;
        if (btn) { btn.textContent = "▶ Reprendre"; btn.style.background = "#10b981"; }
        afficherToast("⏸️ Timer en pause");
    } else {
        if (tempsRestant <= 0) return;
        timerActif = true;
        if (btn) { btn.textContent = "⏸️ Pause"; btn.style.background = "#d97706"; }
        
        if ('wakeLock' in navigator) {
            navigator.wakeLock.request('screen').catch(() => {});
        }

        timerInterval = setInterval(() => {
            if (tempsRestant > 0) {
                tempsRestant--;
                if (tempsRestant === 60) {
                    jouerBip(587, 0.3);
                    afficherToast("⚠️ Dernière minute !");
                }
                if (tempsRestant <= 0) {
                    arreterTimer();
                    jouerBip(880, 0.2);
                    setTimeout(() => jouerBip(880, 0.2), 300);
                    setTimeout(() => jouerBip(1320, 0.6), 600);
                    if (phaseActuelle === "essais" && modeActuelConfig.match > 0) {
                        if (confirm("⏱️ Fin des essais ! Passer au match (" + modeActuelConfig.match + " min) ?")) {
                            changerPhaseTimer();
                            demarrerPauseTimer();
                        }
                    } else {
                        alert("🏁 TEMPS ÉCOULÉ ! Fin de la séance.");
                    }
                }
            }
            mettreAJourAffichageTimer();
        }, 1000);
        afficherToast("▶️ Timer démarré");
    }
}

export function arreterTimer() {
    clearInterval(timerInterval);
    timerActif = false;
    const btn = document.getElementById("btn-start-pause");
    if (btn) { btn.textContent = "▶ Démarrer"; btn.style.background = ""; }
}

export function resetTimer() {
    arreterTimer();
    dureeTotalePhase = (phaseActuelle === "essais" ? modeActuelConfig.essais : modeActuelConfig.match) * 60;
    tempsRestant = dureeTotalePhase;
    mettreAJourAffichageTimer();
    afficherToast("🔄 Timer réinitialisé");
}

export function ajusterTempsTimer(minutes) {
    tempsRestant = Math.max(0, tempsRestant + minutes * 60);
    dureeTotalePhase = Math.max(tempsRestant, dureeTotalePhase);
    mettreAJourAffichageTimer();
}

export function mettreAJourAffichageTimer() {
    const affichage = document.getElementById("timer-affichage");
    const titrePhase = document.getElementById("timer-phase-titre");
    const barreProgression = document.getElementById("timer-progression");
    if (!affichage) return;

    affichage.textContent = formaterTemps(tempsRestant);
    if (titrePhase) {
        titrePhase.textContent = phaseActuelle === "essais" ? "🎯 Phase d'Essais (Illimités)" : "🏆 Phase de Match Officiel";
    }
    if (barreProgression && dureeTotalePhase > 0) {
        const pct = (tempsRestant / dureeTotalePhase) * 100;
        barreProgression.style.width = pct + "%";
        barreProgression.style.background = phaseActuelle === "essais" ? "#10b981" : "var(--primary)";
    }

    const cardChrono = document.getElementById("timer-card-main");
    if (cardChrono) {
        if (tempsRestant <= 60 && tempsRestant > 0) {
            cardChrono.style.border = "3px solid #ef4444";
        } else {
            cardChrono.style.border = "1px solid var(--border)";
        }
    }
    document.title = "[" + formaterTemps(tempsRestant) + "] Tir Cécillya Timer";
}

export function afficherTimer() {
    window.pageActuelle = "timer";
    let html = '<h2>⏱️ Timer & Stand de Tir Officiel</h2>' +
        '<p style="color:var(--muted); margin-bottom:16px;">Chronométrage officiel FFTir (Règlement ISSF) avec alertes sonores.</p>' +
        
        '<div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:16px;">' +
            '<button class="btn btn-primary" onclick="appliquerPresetTimer(15, 75, \'10m - 60 coups (Électro)\')">🎯 10m 60c (15+75)</button>' +
            '<button class="btn" onclick="appliquerPresetTimer(15, 50, \'10m - 40 coups (Électro)\')">🎯 10m 40c (15+50)</button>' +
            '<button class="btn" onclick="appliquerPresetTimer(15, 50, \'50m Couché (Électro 15+50)\')">📏 50m Couché (15+50)</button>' +
            '<button class="btn" onclick="appliquerPresetTimer(15, 75, \'50m Couché (Papier 15+75)\')">📏 50m Couché (15+75)</button>' +
            '<button class="btn" onclick="appliquerPresetTimer(15, 90, \'50m 3x20 Int. (15+90)\')">🏅 3x20 Int (15+90)</button>' +
            '<button class="btn" onclick="testerSonTimer()">🔊 Test Son</button>' +
        '</div>' +

        '<div id="timer-card-main" class="card" style="text-align:center; padding:30px; background:linear-gradient(135deg, var(--card-bg) 0%, var(--bg) 100%); transition: all 0.3s;">' +
            '<div id="timer-phase-titre" style="font-size:1.2rem; font-weight:800; color:var(--primary); margin-bottom:10px;">🎯 Phase d\'Essais</div>' +
            '<div id="timer-affichage" style="font-size:5rem; font-weight:900; font-variant-numeric:tabular-nums; letter-spacing:0.05em; margin:15px 0;">15:00</div>' +
            
            '<div style="background:var(--border); border-radius:999px; height:12px; width:100%; overflow:hidden; margin-bottom:20px;">' +
                '<div id="timer-progression" style="background:#10b981; height:100%; width:100%; transition: width 1s linear;"></div>' +
            '</div>' +

            '<div style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap; margin-bottom:15px;">' +
                '<button id="btn-start-pause" class="btn btn-primary" style="font-size:1.1rem; padding:12px 24px;" onclick="demarrerPauseTimer()">▶ Démarrer</button>' +
                '<button class="btn" style="font-size:1.1rem; padding:12px 18px;" onclick="resetTimer()">🔄 Reset</button>' +
                '<button class="btn" style="font-size:1.1rem; padding:12px 18px;" onclick="changerPhaseTimer()">🔀 Changer Phase</button>' +
            '</div>' +

            '<div style="display:flex; justify-content:center; gap:8px;">' +
                '<button class="btn" onclick="ajusterTempsTimer(-5)">-5 min</button>' +
                '<button class="btn" onclick="ajusterTempsTimer(-1)">-1 min</button>' +
                '<button class="btn" onclick="ajusterTempsTimer(1)">+1 min</button>' +
                '<button class="btn" onclick="ajusterTempsTimer(5)">+5 min</button>' +
            '</div>' +
        '</div>';

    document.getElementById("etat").innerHTML = html;
    mettreAJourAffichageTimer();
}
