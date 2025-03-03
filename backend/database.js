const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'gestion-formation.db');

const initDatabase = () => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) return reject(err);

      db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS salles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nom TEXT NOT NULL,
          capacite INTEGER NOT NULL,
          equipements TEXT,
          date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
          date_modification DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        
        db.run(`CREATE TABLE IF NOT EXISTS formations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nom TEXT NOT NULL,
          apprenants INTEGER NOT NULL,
          debut DATE NOT NULL,
          fin DATE NOT NULL,
          besoins TEXT,
          date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
          date_modification DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        
        db.run(`CREATE TABLE IF NOT EXISTS affectations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          formation_id INTEGER NOT NULL,
          salle_id INTEGER NOT NULL,
          date DATE NOT NULL,
          FOREIGN KEY (formation_id) REFERENCES formations(id),
          FOREIGN KEY (salle_id) REFERENCES salles(id)
        )`);
        
        db.run('CREATE INDEX IF NOT EXISTS idx_affectations_formation ON affectations(formation_id)');
        db.run('CREATE INDEX IF NOT EXISTS idx_affectations_salle ON affectations(salle_id)');

        resolve(db);
      });
    });
  });
};

const validateFormation = (formation) => {
  if (!formation.nom || formation.apprenants < 1 || !formation.debut || !formation.fin) {
    throw new Error('Données de formation invalides');
  }
  if (new Date(formation.debut) > new Date(formation.fin)) {
    throw new Error('La date de début doit être antérieure à la date de fin');
  }
};

const validateSalle = (salle) => {
  if (!salle.nom || salle.capacite < 1) {
    throw new Error('Données de salle invalides');
  }
};

module.exports = {
  initDatabase,
  getSalles: (db) => new Promise((resolve, reject) => {
    db.all('SELECT * FROM salles ORDER BY nom', (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  }),
  addSalle: (db, salle) => new Promise((resolve, reject) => {
    validateSalle(salle);
    const stmt = db.prepare('INSERT INTO salles (nom, capacite, equipements) VALUES (?, ?, ?)');
    stmt.run(salle.nom, salle.capacite, salle.equipements, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, ...salle });
      stmt.finalize();
    });
  }),
  updateSalle: (db, salle) => new Promise((resolve, reject) => {
    validateSalle(salle);
    const stmt = db.prepare('UPDATE salles SET nom = ?, capacite = ?, equipements = ?, date_modification = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(salle.nom, salle.capacite, salle.equipements, salle.id, function (err) {
      if (err) reject(err);
      else resolve({ ...salle });
      stmt.finalize();
    });
  }),
  deleteSalle: (db, id) => new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) as count FROM affectations WHERE salle_id = ?', [id], (err, row) => {
      if (err) return reject(err);
      if (row.count > 0) return reject(new Error('Salle utilisée dans des affectations'));
      const stmt = db.prepare('DELETE FROM salles WHERE id = ?');
      stmt.run(id, function (err) {
        if (err) reject(err);
        else resolve({ success: true, id });
        stmt.finalize();
      });
    });
  }),
  getFormations: (db) => new Promise((resolve, reject) => {
    db.all('SELECT * FROM formations ORDER BY debut', (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  }),
  addFormation: (db, formation) => new Promise((resolve, reject) => {
    validateFormation(formation);
    const stmt = db.prepare('INSERT INTO formations (nom, apprenants, debut, fin, besoins) VALUES (?, ?, ?, ?, ?)');
    stmt.run(formation.nom, formation.apprenants, formation.debut, formation.fin, formation.besoins, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, ...formation });
      stmt.finalize();
    });
  }),
  updateFormation: (db, formation) => new Promise((resolve, reject) => {
    validateFormation(formation);
    const stmt = db.prepare('UPDATE formations SET nom = ?, apprenants = ?, debut = ?, fin = ?, besoins = ?, date_modification = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(formation.nom, formation.apprenants, formation.debut, formation.fin, formation.besoins, formation.id, function (err) {
      if (err) reject(err);
      else resolve({ ...formation });
      stmt.finalize();
    });
  }),
  deleteFormation: (db, id) => new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      db.run('DELETE FROM affectations WHERE formation_id = ?', [id], (err) => {
        if (err) {
          db.run('ROLLBACK');
          return reject(err);
        }
        db.run('DELETE FROM formations WHERE id = ?', [id], (err) => {
          if (err) {
            db.run('ROLLBACK');
            return reject(err);
          }
          db.run('COMMIT', (err) => {
            if (err) return reject(err);
            resolve({ success: true, id });
          });
        });
      });
    });
  }),
  getAffectations: (db) => new Promise((resolve, reject) => {
    const query = `
      SELECT a.id, a.date, 
             f.id as formation_id, f.nom as formation_nom, f.apprenants, f.debut, f.fin, f.besoins,
             s.id as salle_id, s.nom as salle_nom, s.capacite, s.equipements
      FROM affectations a
      JOIN formations f ON a.formation_id = f.id
      JOIN salles s ON a.salle_id = s.id
      ORDER BY a.date
    `;
    db.all(query, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  }),
  addAffectation: (db, affectation) => new Promise((resolve, reject) => {
    const stmt = db.prepare('INSERT INTO affectations (formation_id, salle_id, date) VALUES (?, ?, ?)');
    stmt.run(affectation.formation_id, affectation.salle_id, affectation.date, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, ...affectation });
      stmt.finalize();
    });
  }),
  optimiserAffectations: (db) => new Promise(async (resolve, reject) => {
    try {
      const formations = await module.exports.getFormations(db);
      const salles = await module.exports.getSalles(db);
      const affectations = await module.exports.getAffectations(db);

      const sallesOccupees = {};
      affectations.forEach(a => {
        if (!sallesOccupees[a.date]) sallesOccupees[a.date] = [];
        sallesOccupees[a.date].push(a.salle_id);
      });

      const propositions = [];
      for (const formation of formations) {
        const formationAffectee = affectations.some(a => a.formation_id === formation.id);
        if (formationAffectee) continue;

        const debut = new Date(formation.debut);
        const fin = new Date(formation.fin);
        const dates = [];
        for (let d = new Date(debut); d <= fin; d.setDate(d.getDate() + 1)) {
          if (d.getDay() !== 0 && d.getDay() !== 6) {
            dates.push(new Date(d).toISOString().split('T')[0]);
          }
        }

        for (const date of dates) {
          const sallesDisponibles = salles.filter(s => !sallesOccupees[date]?.includes(s.id));
          sallesDisponibles.sort((a, b) => {
            if (formation.besoins) {
              const aConvient = a.equipements?.includes(formation.besoins);
              const bConvient = b.equipements?.includes(formation.besoins);
              if (aConvient && !bConvient) return -1;
              if (!aConvient && bConvient) return 1;
            }
            if (a.capacite < formation.apprenants) return 1;
            if (b.capacite < formation.apprenants) return -1;
            return (a.capacite - formation.apprenants) - (b.capacite - formation.apprenants);
          });

          if (sallesDisponibles.length && sallesDisponibles[0].capacite >= formation.apprenants) {
            const salle = sallesDisponibles[0];
            propositions.push({
              formation_id: formation.id,
              formation_nom: formation.nom,
              salle_id: salle.id,
              salle_nom: salle.nom,
              date,
              apprenants: formation.apprenants,
              capacite: salle.capacite,
              optimisation: Math.round((formation.apprenants / salle.capacite) * 100),
            });
            if (!sallesOccupees[date]) sallesOccupees[date] = [];
            sallesOccupees[date].push(salle.id);
          }
        }
      }
      resolve(propositions);
    } catch (error) {
      reject(error);
    }
  }),
};
// Dans initDatabase de database.js
db.run(`CREATE TABLE IF NOT EXISTS affectations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  formation_id INTEGER NOT NULL,
  salle_id INTEGER NOT NULL,
  date DATE NOT NULL,
  date_creation DATETIME DEFAULT CURRENT_TIMESTAMP, -- Ajouter cette ligne
  FOREIGN KEY (formation_id) REFERENCES formations(id),
  FOREIGN KEY (salle_id) REFERENCES salles(id)
)`);

// Modifier addAffectation dans database.js
module.exports.addAffectation = (db, affectation) => {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`
      INSERT INTO affectations (formation_id, salle_id, date, date_creation) 
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(
      affectation.formation_id,
      affectation.salle_id,
      affectation.date,
      affectation.date_creation || new Date().toISOString(), // Utiliser la date fournie ou une nouvelle
      function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...affectation });
        stmt.finalize();
      }
    );
  });
};