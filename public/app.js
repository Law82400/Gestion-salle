function showNotification(message, type = 'info') {
  const notif = document.getElementById('notifications');
  if (notif) {
    notif.innerHTML = `<div class="${type}">${message}</div>`;
    setTimeout(() => notif.innerHTML = '', 5000);
  }
}

function switchPage(pageId) {
  try {
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    const page = document.getElementById(pageId);
    if (page) page.style.display = 'block';
    const activeLink = document.querySelector('nav a.active');
    if (activeLink) activeLink.classList.remove('active');
    const newActiveLink = document.querySelector(`nav a[data-page="${pageId}"]`);
    if (newActiveLink) newActiveLink.classList.add('active');
  } catch (error) {
    console.error('Erreur lors du changement d’onglet :', error);
    showNotification('Erreur lors du changement d’onglet : ' + error.message, 'error');
  }
}

let currentDate = new Date();

function saveCurrentDate() {
  localStorage.setItem('currentPlanningDate', currentDate.toISOString());
}

async function loadSalles() {
  try {
    const salles = await fetch('/api/salles').then(res => {
      if (!res.ok) throw new Error('Erreur lors du chargement des salles');
      return res.json();
    });
    const tbody = document.querySelector('#salles-table tbody');
    if (tbody) {
      tbody.innerHTML = salles.length
        ? salles.map(s => `
          <tr data-id="${s.id}">
            <td>${s.nom}</td>
            <td>${s.capacite}</td>
            <td>${s.equipements || ''}</td>
            <td>
              <button class="edit-salle">Modifier</button>
              <button class="delete-salle">Supprimer</button>
            </td>
          </tr>
        `).join('')
        : '<tr><td colspan="4" class="center">Aucune salle enregistrée</td></tr>';
    }
  } catch (error) {
    console.error('Erreur lors du chargement des salles :', error);
    const tbody = document.querySelector('#salles-table tbody');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="4" class="center">Erreur de chargement</td></tr>';
    }
    showNotification('Erreur lors du chargement des salles : ' + error.message, 'error');
  }
}

async function loadFormations() {
  try {
    const formations = await fetch('/api/formations').then(res => {
      if (!res.ok) throw new Error('Erreur lors du chargement des formations');
      return res.json();
    });
    const tbody = document.querySelector('#formations-table tbody');
    if (tbody) {
      tbody.innerHTML = formations.length
        ? formations.map(f => `
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
        `).join('')
        : '<tr><td colspan="6" class="center">Aucune formation enregistrée</td></tr>';
    }
  } catch (error) {
    console.error('Erreur lors du chargement des formations :', error);
    const tbody = document.querySelector('#formations-table tbody');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="6" class="center">Erreur de chargement</td></tr>';
    }
    showNotification('Erreur lors du chargement des formations : ' + error.message, 'error');
  }
}

async function loadAffectations() {
  try {
    const affectations = await fetch('/api/affectations') .then(res => {
      if (!res.ok) throw new Error('Erreur lors du chargement des affectations');
      return res.json();
    });
    console.log('Affectations chargées :', affectations);
  } catch (error) {
    console.error('Erreur lors du chargement des affectations :', error);
    showNotification('Erreur lors du chargement des affectations : ' + error.message, 'error');
  }
}

async function loadDashboard() {
  try {
    const [salles, formations, affectations] = await Promise.all([
      fetch('/api/salles') .then(res => {
        if (!res.ok) throw new Error('Erreur lors du chargement des salles');
        return res.json();
      }),
      fetch('/api/formations') .then(res => {
        if (!res.ok) throw new Error('Erreur lors du chargement des formations');
        return res.json();
      }),
      fetch('/api/affectations') .then(res => {
        if (!res.ok) throw new Error('Erreur lors du chargement des affectations');
        return res.json();
      }),
    ]);

    document.getElementById('stats-salles').textContent = salles.length || '0';
    document.getElementById('stats-formations').textContent = formations.length || '0';
    document.getElementById('stats-affectations').textContent = affectations.length || '0';
    const taux = affectations.length ? Math.round(affectations.reduce((acc, a) => acc + (a.apprenants / a.capacite || 0), 0) / affectations.length * 100) : 0;
    document.getElementById('stats-remplissage').textContent = `${taux}%`;

    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    const prochaines = affectations.filter(a => {
      const d = new Date(a.date);
      return d >= today && d <= nextWeek;
    });
    const prochainesTbody = document.querySelector('#dashboard-prochaines-formations tbody');
    if (prochainesTbody) {
      prochainesTbody.innerHTML = prochaines.length
        ? prochaines.map(a => `<tr><td>${a.formation_nom}</td><td>${a.date}</td><td>${a.apprenants}</td><td>${a.salle_nom}</td></tr>`).join('')
        : '<tr><td colspan="4" class="center">Aucune formation prévue</td></tr>';
    }

    const optimiserBtn = document.getElementById('optimiser-btn');
    if (optimiserBtn) {
      optimiserBtn.addEventListener('click', async () => {
        try {
          const suggestions = await fetch('/api/optimisation' .then(res => {
            if (!res.ok) throw new Error('Erreur lors de l’optimisation');
            return res.json();
          }));
          const suggestionsTbody = document.querySelector('#optimisation-suggestions tbody');
          if (suggestionsTbody) {
            suggestionsTbody.innerHTML = suggestions.length
              ? suggestions.map(s => `
                <tr data-formation="${s.formation_id}" data-salle="${s.salle_id}" data-date="${s.date}">
                  <td>${s.formation_nom}</td>
                  <td>${s.date}</td>
                  <td>${s.apprenants}</td>
                  <td>${s.salle_nom}</td>
                  <td>${s.capacite}</td>
                  <td>${s.optimisation}%</td>
                  <td><button class="valider-affectation">Valider</button></td>
                </tr>
              `).join('')
              : '<tr><td colspan="7" class="center">Aucune suggestion d’optimisation</td></tr>';
          }
        } catch (error) {
          showNotification('Erreur lors de l’optimisation : ' + error.message, 'error');
        }
      });
    }
  } catch (error) {
    console.error('Erreur lors du chargement du tableau de bord :', error);
    showNotification('Erreur lors du chargement du tableau de bord : ' + error.message, 'error');
    document.getElementById('stats-salles').textContent = '0';
    document.getElementById('stats-formations').textContent = '0';
    document.getElementById('stats-affectations').textContent = '0';
    document.getElementById('stats-remplissage').textContent = '0%';
    const prochainesTbody = document.querySelector('#dashboard-prochaines-formations tbody');
    if (prochainesTbody) {
      prochainesTbody.innerHTML = '<tr><td colspan="4" class="center">Erreur de chargement</td></tr>';
    }
    const suggestionsTbody = document.querySelector('#optimisation-suggestions tbody');
    if (suggestionsTbody) {
      suggestionsTbody.innerHTML = '<tr><td colspan="7" class="center">Erreur de chargement</td></tr>';
    }
  }
}

async function loadPlanning() {
  try {
    const affectations = await fetch('/api/affectations' .then(res => {
      if (!res.ok) throw new Error('Erreur lors du chargement du planning');
      return res.json();
    }));
    const currentMonth = document.getElementById('current-month');
    if (currentMonth) {
      currentMonth.textContent = currentDate.toLocaleString('fr', { month: 'long', year: 'numeric' });
    }
    
    const monthsToShow = 12;
    let html = '';

    for (let i = 0; i < monthsToShow; i++) {
      const month = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      html += `<h3>${month.toLocaleString('fr', { month: 'long', year: 'numeric' })}</h3>`;
      html += '<div class="calendar-month">';
      let currentDay = new Date(month.getFullYear(), month.getMonth(), 1);
      while (currentDay.getDay() !== 1) currentDay.setDate(currentDay.getDate() - 1); // Aligner sur lundi

      do {
        if (currentDay.getDay() >= 1 && currentDay.getDay() <= 5) { // Afficher seulement lundi à vendredi
          html += '<div class="calendar-week">';
          for (let j = 0; j < 5; j++) { // 5 jours (lundi à vendredi)
            const dateStr = currentDay.toISOString().split('T')[0];
            const dayAffectations = affectations.filter(a => {
              const start = new Date(a.debut);
              const end = new Date(a.fin);
              const day = new Date(dateStr);
              return day >= start && day <= end && a.date === dateStr;
            });
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
        } else {
          currentDay.setDate(currentDay.getDate() + 1); // Passer les week-ends
        }
      } while (currentDay.getMonth() === month.getMonth());
      html += '</div>';
    }

    const calendarBody = document.getElementById('calendar-body');
    if (calendarBody) {
      calendarBody.innerHTML = html;
    }

    const prevMonth = document.getElementById('prev-month');
    const nextMonth = document.getElementById('next-month');
    if (prevMonth && nextMonth) {
      prevMonth.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        loadPlanning();
        saveCurrentDate();
      });
      nextMonth.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        loadPlanning();
        saveCurrentDate();
      });
    }
  } catch (error) {
    console.error('Erreur lors du chargement du planning :', error);
    const calendarBody = document.getElementById('calendar-body');
    if (calendarBody) {
      calendarBody.innerHTML = '<div class="center">Erreur de chargement</div>';
    }
    showNotification('Erreur lors du chargement du planning : ' + error.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    document.querySelectorAll('nav a').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const pageId = link.getAttribute('data-page');
        if (pageId) {
          switchPage(pageId);
          setTimeout(() => {
            if (pageId === 'dashboard') loadDashboard();
            else if (pageId === 'salles') loadSalles();
            else if (pageId === 'formations') loadFormations();
            else if (pageId === 'planning') loadPlanning();
          }, 100);
        }
      });
    });

    const savedDate = localStorage.getItem('currentPlanningDate');
    if (savedDate) {
      currentDate = new Date(savedDate);
    } else {
      currentDate = new Date();
    }

    loadDashboard();

    const salleModal = document.getElementById('salle-modal');
    if (salleModal) {
      document.getElementById('add-salle-btn').addEventListener('click', () => {
        document.getElementById('salle-modal-title').textContent = 'Ajouter une salle';
        const form = document.getElementById('salle-form');
        if (form) form.reset();
        document.getElementById('salle-id').value = '';
        salleModal.style.display = 'block';
      });

      const form = document.querySelector('#salle-form');
      if (form) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const salle = {
            id: document.getElementById('salle-id').value,
            nom: document.getElementById('salle-nom').value || '',
            capacite: parseInt(document.getElementById('salle-capacite').value) || 0,
            equipements: document.getElementById('salle-equipements').value || '',
          };
          try {
            const method = salle.id ? 'PUT' : 'POST';
            const url = salle.id ? '/api/salles/' + salle.id : '/api/salles';
            const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(salle), timeout: 5000 });
            if (!response.ok) throw new Error('Erreur serveur');
            showNotification('Salle enregistrée avec succès', 'success');
            salleModal.style.display = 'none';
            loadSalles();
            loadDashboard();
          } catch (error) {
            showNotification('Erreur lors de l’enregistrement de la salle : ' + error.message, 'error');
          }
        });
      }

      const sallesTable = document.querySelector('#salles-table');
      if (sallesTable) {
        sallesTable.addEventListener('click', async (e) => {
          const id = e.target.closest('tr')?.dataset.id;
          if (!id) return;
          if (e.target.classList.contains('edit-salle')) {
            try {
              const salles = await fetch('/api/salles' .then(res => res.json()));
              const salle = salles.find(s => s.id == id);
              if (salle) {
                document.getElementById('salle-modal-title').textContent = 'Modifier la salle';
                document.getElementById('salle-id').value = salle.id;
                document.getElementById('salle-nom').value = salle.nom;
                document.getElementById('salle-capacite').value = salle.capacite;
                document.getElementById('salle-equipements').value = salle.equipements || '';
                salleModal.style.display = 'block';
              }
            } catch (error) {
              showNotification('Erreur lors du chargement de la salle : ' + error.message, 'error');
            }
          } else if (e.target.classList.contains('delete-salle')) {
            if (confirm('Confirmer la suppression ?')) {
              try {
                const response = await fetch('/api/salles/' + id, { method: 'DELETE', timeout: 5000 });
                if (!response.ok) throw new Error('Erreur serveur');
                showNotification('Salle supprimée', 'success');
                loadSalles();
                loadDashboard();
              } catch (error) {
                showNotification('Erreur lors de la suppression : ' + error.message, 'error');
              }
            }
          }
        });
      }
    }

    const formationModal = document.getElementById('formation-modal');
    if (formationModal) {
      document.getElementById('add-formation-btn').addEventListener('click', () => {
        document.getElementById('formation-modal-title').textContent = 'Ajouter une formation';
        const form = document.getElementById('formation-form');
        if (form) form.reset();
        document.getElementById('formation-id').value = '';
        formationModal.style.display = 'block';
      });

      const form = document.querySelector('#formation-form');
      if (form) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const formation = {
            id: document.getElementById('formation-id').value,
            nom: document.getElementById('formation-nom').value || '',
            apprenants: parseInt(document.getElementById('formation-apprenants').value) || 0,
            debut: document.getElementById('formation-debut').value || '',
            fin: document.getElementById('formation-fin').value || '',
            besoins: document.getElementById('formation-besoins').value || '',
          };
          try {
            const method = formation.id ? 'PUT' : 'POST';
            const url = formation.id ? '/api/formations/' + formation.id : '/api/formations';
            const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formation), timeout: 5000 });
            if (!response.ok) throw new Error('Erreur serveur');
            showNotification('Formation enregistrée avec succès', 'success');
            formationModal.style.display = 'none';
            loadFormations();
            loadDashboard();
          } catch (error) {
            showNotification('Erreur lors de l’enregistrement de la formation : ' + error.message, 'error');
          }
        });
      }

      const formationsTable = document.querySelector('#formations-table');
      if (formationsTable) {
        formationsTable.addEventListener('click', async (e) => {
          const id = e.target.closest('tr')?.dataset.id;
          if (!id) return;
          if (e.target.classList.contains('edit-formation')) {
            try {
              const formations = await fetch('/api/formations' .then(res => res.json());
              const formation = formations.find(f => f.id == id);
              if (formation) {
                document.getElementById('formation-modal-title').textContent = 'Modifier la formation';
                document.getElementById('formation-id').value = formation.id;
                document.getElementById('formation-nom').value = formation.nom;
                document.getElementById('formation-apprenants').value = formation.apprenants;
                document.getElementById('formation-debut').value = formation.debut;
                document.getElementById('formation-fin').value = formation.fin;
                document.getElementById('formation-besoins').value = formation.besoins || '';
                formationModal.style.display = 'block';
              }
            } catch (error) {
              showNotification('Erreur lors du chargement de la formation : ' + error.message, 'error');
            }
          } else if (e.target.classList.contains('delete-formation')) {
            if (confirm('Confirmer la suppression ?')) {
              try {
                const response = await fetch('/api/formations/' + id, { method: 'DELETE', timeout: 5000 });
                if (!response.ok) throw new Error('Erreur serveur');
                showNotification('Formation supprimée', 'success');
                loadFormations();
                loadDashboard();
              } catch (error) {
                showNotification('Erreur lors de la suppression : ' + error.message, 'error');
              }
            }
          }
        });
      }
    }

    const optimiserBtn = document.getElementById('optimiser-btn');
    if (optimiserBtn) {
      optimiserBtn.addEventListener('click', async () => {
        try {
          const suggestions = await fetch('/api/optimisation' .then(res => {
            if (!res.ok) throw new Error('Erreur lors de l’optimisation');
            return res.json();
          });
          const suggestionsTbody = document.querySelector('#optimisation-suggestions tbody');
          if (suggestionsTbody) {
            suggestionsTbody.innerHTML = suggestions.length
              ? suggestions.map(s => `
                <tr data-formation="${s.formation_id}" data-salle="${s.salle_id}" data-date="${s.date}">
                  <td>${s.formation_nom}</td>
                  <td>${s.date}</td>
                  <td>${s.apprenants}</td>
                  <td>${s.salle_nom}</td>
                  <td>${s.capacite}</td>
                  <td>${s.optimisation}%</td>
                  <td><button class="valider-affectation">Valider</button></td>
                </tr>
              `).join('')
              : '<tr><td colspan="7" class="center">Aucune suggestion d’optimisation</td></tr>';
          }
        } catch (error) {
          showNotification('Erreur lors de l’optimisation : ' + error.message, 'error');
        }
      });
    }

    const optimisationSuggestions = document.querySelector('#optimisation-suggestions');
    if (optimisationSuggestions) {
      optimisationSuggestions.addEventListener('click', async (e) => {
        if (e.target.classList.contains('valider-affectation')) {
          const tr = e.target.closest('tr');
          const affectation = {
            formation_id: tr.dataset.formation,
            salle_id: tr.dataset.salle,
            date: tr.dataset.date,
          };
          try {
            const response = await fetch('/api/affectations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(affectation),
              timeout: 5000
            });
            if (!response.ok) throw new Error('Erreur serveur');
            showNotification('Affectation validée', 'success');
            loadDashboard();
            loadPlanning();
            if (tr) tr.remove();
          } catch (error) {
            showNotification('Erreur lors de la validation : ' + error.message, 'error');
          }
        }
      });
    }

    const modals = document.querySelectorAll('.modal .close, .modal .close-modal');
    modals.forEach(btn => {
      btn.addEventListener('click', () => {
        const modal = btn.closest('.modal');
        if (modal) modal.style.display = 'none';
      });
    });
  } catch (error) {
    console.error('Erreur lors de l’initialisation :', error);
    showNotification('Erreur lors de l’initialisation de l’application : ' + error.message, 'error');
  }
}
