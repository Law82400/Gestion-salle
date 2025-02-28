function showNotification(message, type = 'info') {
  const notif = document.getElementById('notifications');
  notif.innerHTML = `<div class="${type}">${message}</div>`;
  setTimeout(() => notif.innerHTML = '', 5000);
}

function switchPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
  document.getElementById(pageId).style.display = 'block';
  document.querySelector('nav a.active')?.classList.remove('active');
  document.querySelector(`nav a[data-page="${pageId}"]`).classList.add('active');
}

async function loadDashboard() {
  const [salles, formations, affectations] = await Promise.all([
    fetch('/api/salles').then(res => res.json()),
    fetch('/api/formations').then(res => res.json()),
    fetch('/api/affectations').then(res => res.json()),
  ]);

  document.getElementById('stats-salles').textContent = salles.length;
  document.getElementById('stats-formations').textContent = formations.length;
  document.getElementById('stats-affectations').textContent = affectations.length;
  const taux = affectations.length ? Math.round(affectations.reduce((acc, a) => acc + (a.apprenants / a.capacite), 0) / affectations.length * 100) : 0;
  document.getElementById('stats-remplissage').textContent = `${taux}%`;

  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  const prochaines = affectations.filter(a => {
    const d = new Date(a.date);
    return d >= today && d <= nextWeek;
  });
  document.querySelector('#dashboard-prochaines-formations tbody').innerHTML = prochaines.length
    ? prochaines.map(a => `<tr><td>${a.formation_nom}</td><td>${a.date}</td><td>${a.apprenants}</td><td>${a.salle_nom}</td></tr>`).join('')
    : '<tr><td colspan="4" class="center">Aucune formation prévue</td></tr>';
}

async function loadSalles() {
  const salles = await fetch('/api/salles').then(res => res.json());
  document.querySelector('#salles-table tbody').innerHTML = salles.map(s => `
    <tr data-id="${s.id}">
      <td>${s.nom}</td>
      <td>${s.capacite}</td>
      <td>${s.equipements || ''}</td>
      <td>
        <button class="edit-salle">Modifier</button>
        <button class="delete-salle">Supprimer</button>
      </td>
    </tr>
  `).join('');
}

async function loadFormations() {
  const formations = await fetch('/api/formations').then(res => res.json());
  document.querySelector('#formations-table tbody').innerHTML = formations.map(f => `
    <tr data-id="${f.id}">
      <td>${f.nom}</td>
      <td>${f.apprenants}</td>
      <td>${f.debut}</td>
      <td>${f.fin}</td>
      <td>${f.besoins || ''}</td>
      <td>
        <button class="edit-formation">Modifier</button>
        <button class="delete-formation">Supprimer</button>
      </td>
    </tr>
  `).join('');
}

async function loadPlanning() {
  const affectations = await fetch('/api/affectations').then(res => res.json());
  const month = new Date();
  document.getElementById('current-month').textContent = month.toLocaleString('fr', { month: 'long', year: 'numeric' });
  
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  let html = '';
  let currentDay = new Date(firstDay);
  while (currentDay.getDay() !== 1) currentDay.setDate(currentDay.getDate() - 1);

  do {
    html += '<div class="calendar-week">';
    for (let i = 0; i < 5; i++) {
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
  } while (currentDay.getMonth() <= month.getMonth());

  document.getElementById('calendar-body').innerHTML = html;
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      switchPage(link.getAttribute('data-page'));
    });
  });

  loadDashboard();
  loadSalles();
  loadFormations();
  loadPlanning();

  // Salles
  const salleModal = document.getElementById('salle-modal');
  document.getElementById('add-salle-btn').addEventListener('click', () => {
    document.getElementById('salle-modal-title').textContent = 'Ajouter une salle';
    document.getElementById('salle-form').reset();
    document.getElementById('salle-id').value = '';
    salleModal.style.display = 'block';
  });

  document.querySelector('#salle-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const salle = {
      id: document.getElementById('salle-id').value,
      nom: document.getElementById('salle-nom').value,
      capacite: parseInt(document.getElementById('salle-capacite').value),
      equipements: document.getElementById('salle-equipements').value,
    };
    try {
      const method = salle.id ? 'PUT' : 'POST';
      const url = salle.id ? `/api/salles/${salle.id}` : '/api/salles';
      await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(salle) });
      showNotification('Salle enregistrée avec succès', 'success');
      salleModal.style.display = 'none';
      loadSalles();
      loadDashboard();
    } catch (error) {
      showNotification(error.message, 'error');
    }
  });

  document.querySelector('#salles-table').addEventListener('click', async (e) => {
    const id = e.target.closest('tr')?.dataset.id;
    if (!id) return;
    if (e.target.classList.contains('edit-salle')) {
      const salle = (await fetch('/api/salles').then(res => res.json())).find(s => s.id == id);
      document.getElementById('salle-modal-title').textContent = 'Modifier la salle';
      document.getElementById('salle-id').value = salle.id;
      document.getElementById('salle-nom').value = salle.nom;
      document.getElementById('salle-capacite').value = salle.capacite;
      document.getElementById('salle-equipements').value = salle.equipements || '';
      salleModal.style.display = 'block';
    } else if (e.target.classList.contains('delete-salle')) {
      if (confirm('Confirmer la suppression ?')) {
        try {
          await fetch(`/api/salles/${id}`, { method: 'DELETE' });
          showNotification('Salle supprimée', 'success');
          loadSalles();
          loadDashboard();
        } catch (error) {
          showNotification(error.message, 'error');
        }
      }
    }
  });

  // Formations
  const formationModal = document.getElementById('formation-modal');
  document.getElementById('add-formation-btn').addEventListener('click', () => {
    document.getElementById('formation-modal-title').textContent = 'Ajouter une formation';
    document.getElementById('formation-form').reset();
    document.getElementById('formation-id').value = '';
    formationModal.style.display = 'block';
  });

  document.querySelector('#formation-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formation = {
      id: document.getElementById('formation-id').value,
      nom: document.getElementById('formation-nom').value,
      apprenants: parseInt(document.getElementById('formation-apprenants').value),
      debut: document.getElementById('formation-debut').value,
      fin: document.getElementById('formation-fin').value,
      besoins: document.getElementById('formation-besoins').value,
    };
    try {
      const method = formation.id ? 'PUT' : 'POST';
      const url = formation.id ? `/api/formations/${formation.id}` : '/api/formations';
      await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formation) });
      showNotification('Formation enregistrée avec succès', 'success');
      formationModal.style.display = 'none';
      loadFormations();
      loadDashboard();
    } catch (error) {
      showNotification(error.message, 'error');
    }
  });

  document.querySelector('#formations-table').addEventListener('click', async (e) => {
    const id = e.target.closest('tr')?.dataset.id;
    if (!id) return;
    if (e.target.classList.contains('edit-formation')) {
      const formation = (await fetch('/api/formations').then(res => res.json())).find(f => f.id == id);
      document.getElementById('formation-modal-title').textContent = 'Modifier la formation';
      document.getElementById('formation-id').value = formation.id;
      document.getElementById('formation-nom').value = formation.nom;
      document.getElementById('formation-apprenants').value = formation.apprenants;
      document.getElementById('formation-debut').value = formation.debut;
      document.getElementById('formation-fin').value = formation.fin;
      document.getElementById('formation-besoins').value = formation.besoins || '';
      formationModal.style.display = 'block';
    } else if (e.target.classList.contains('delete-formation')) {
      if (confirm('Confirmer la suppression ?')) {
        try {
          await fetch(`/api/formations/${id}`, { method: 'DELETE' });
          showNotification('Formation supprimée', 'success');
          loadFormations();
          loadDashboard();
        } catch (error) {
          showNotification(error.message, 'error');
        }
      }
    }
  });

  // Optimisation
  document.getElementById('optimiser-btn').addEventListener('click', async () => {
    try {
      const suggestions = await fetch('/api/optimisation').then(res => res.json());
      document.querySelector('#optimisation-suggestions tbody').innerHTML = suggestions.map(s => `
        <tr data-formation="${s.formation_id}" data-salle="${s.salle_id}" data-date="${s.date}">
          <td>${s.formation_nom}</td>
          <td>${s.date}</td>
          <td>${s.apprenants}</td>
          <td>${s.salle_nom}</td>
          <td>${s.capacite}</td>
          <td>${s.optimisation}%</td>
          <td><button class="valider-affectation">Valider</button></td>
        </tr>
      `).join('');
    } catch (error) {
      showNotification(error.message, 'error');
    }
  });

  document.querySelector('#optimisation-suggestions').addEventListener('click', async (e) => {
    if (e.target.classList.contains('valider-affectation')) {
      const tr = e.target.closest('tr');
      const affectation = {
        formation_id: tr.dataset.formation,
        salle_id: tr.dataset.salle,
        date: tr.dataset.date,
      };
      try {
        await fetch('/api/affectations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(affectation),
        });
        showNotification('Affectation validée', 'success');
        loadDashboard();
        tr.remove();
      } catch (error) {
        showNotification(error.message, 'error');
      }
    }
  });

  document.querySelectorAll('.modal .close, .modal .close-modal').forEach(btn => {
    btn.addEventListener('click', () => btn.closest('.modal').style.display = 'none');
  });
});