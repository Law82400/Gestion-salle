let currentDate = new Date(); // Variable globale pour suivre le mois actuel

async function loadPlanning() {
  const affectations = await fetch('/api/affectations').then(res => res.json());
  document.getElementById('current-month').textContent = currentDate.toLocaleString('fr', { month: 'long', year: 'numeric' });
  
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  let html = '';
  const monthsToShow = 12; // Afficher 12 mois pour le défilement vertical

  for (let i = 0; i < monthsToShow; i++) {
    const month = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
    let currentDay = new Date(month.getFullYear(), month.getMonth(), 1);
    while (currentDay.getDay() !== 1) currentDay.setDate(currentDay.getDate() - 1);

    html += `<h3>${month.toLocaleString('fr', { month: 'long', year: 'numeric' })}</h3>`;
    html += '<div class="calendar-month">';
    do {
      html += '<div class="calendar-week">';
      for (let j = 0; j < 5; j++) { // 5 jours par semaine (lundi à vendredi)
        const dateStr = currentDay.toISOString().split('T')[0];
        const dayAffectations = affectations.filter(a => a.date === dateStr);
        const isCurrentMonth = currentDay.getMonth() === month.getMonth();
        html += `
          <div class="calendar-day ${isCurrentMonth ? '' : 'inactive'}">
            <div class="day-number">${currentDay.getDate()}</div>
            ${dayAffectations.map(a => `<div class="event">${a.formation_nom} (${a.salle_nom})</div>`).join('')}
          </div>
        `;
        currentDay.setDate(currentDay.getDate() + 1);
      }
      html += '</div>';
    } while (currentDay.getMonth() === month.getMonth());
    html += '</div>';
  }

  document.getElementById('calendar-body').innerHTML = html;

  // Ajouter les écouteurs pour les boutons (assurez-vous qu’ils sont appelés à chaque chargement)
  document.getElementById('prev-month').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    loadPlanning(); // Recharger le calendrier pour le mois précédent
  });
  document.getElementById('next-month').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    loadPlanning(); // Recharger le calendrier pour le mois suivant
  });
}

// Appeler loadPlanning au chargement initial
document.addEventListener('DOMContentLoaded', () => {
  // ... (autres événements existants)
  loadPlanning(); // Assurez-vous que loadPlanning est appelé ici
});
// Sauvegarder le mois actuel dans localStorage à chaque changement
function saveCurrentDate() {
  localStorage.setItem('currentPlanningDate', currentDate.toISOString());
}

// Restaurer le mois actuel depuis localStorage au chargement
document.addEventListener('DOMContentLoaded', () => {
  // Restaurer la date si elle existe dans localStorage
  const savedDate = localStorage.getItem('currentPlanningDate');
  if (savedDate) {
    currentDate = new Date(savedDate);
  } else {
    currentDate = new Date(); // Date actuelle par défaut
  }

  // ... (autres événements existants, comme loadDashboard, loadSalles, etc.)
  loadPlanning(); // Charger le planning avec la date restaurée

  // Ajouter les écouteurs pour les boutons (déjà présents dans loadPlanning, mais ici pour confirmation)
  document.getElementById('prev-month').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    loadPlanning();
    saveCurrentDate(); // Sauvegarder après chaque changement
  });
  document.getElementById('next-month').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    loadPlanning();
    saveCurrentDate(); // Sauvegarder après chaque changement
  });
});
async function loadAffectations() {
  const affectations = await fetch('/api/affectations').then(res => res.json());
  // Vous pouvez trier ou filtrer les affectations par date_creation pour l’historique
  console.log('Affectations avec historique :', affectations);
  // Mettez à jour l’affichage dans le planning ou ailleurs si nécessaire
}

// Appelez loadAffectations dans DOMContentLoaded ou ailleurs selon vos besoins
document.addEventListener('DOMContentLoaded', () => {
  // ... (autres événements existants)
  loadAffectations();
});