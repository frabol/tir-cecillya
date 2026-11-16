window._majAttenteSync = function(){
  const btn = document.getElementById('btn-sync');
  if(!btn) return;
  let n = 0;
  try { n = Number(localStorage.getItem('scores_en_attente')) || 0; } catch(e) {}
  const ancien = btn.querySelector('.badge-attente');
  if(ancien) ancien.remove();

  /* On ne touche JAMAIS a btn.id : l'id change casserait
     toutes les recherches getElementById('btn-sync') suivantes,
     et le badge resterait fige pour toujours. */
  btn.classList.toggle('btn-sync-attente', n > 0);

  if(n > 0){
    const badge = document.createElement('span');
    badge.className = 'badge-attente';
    badge.style.cssText = 'background:#f0c020; color:#2a1204; border-radius:999px; padding:1px 7px; font-size:.72rem; font-weight:800; margin-left:4px;';
    badge.textContent = n;
    badge.title = n + ' score(s) en attente de synchronisation';
    btn.appendChild(badge);
  }
};