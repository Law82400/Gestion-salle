const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const initDatabase = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS salles (
        id SERIAL PRIMARY KEY,
        nom TEXT NOT NULL,
        capacite INTEGER NOT NULL,
        equipements TEXT,
        date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS formations (
        id SERIAL PRIMARY KEY,
        nom TEXT NOT NULL,
        apprenants INTEGER NOT NULL,
        debut DATE NOT NULL,
        fin DATE NOT NULL,
        besoins TEXT,
        date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS affectations (
        id SERIAL PRIMARY KEY,
        formation_id INTEGER NOT NULL,
        salle_id INTEGER NOT NULL,
        date DATE NOT NULL,
        date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (formation_id) REFERENCES formations(id),
        FOREIGN KEY (salle_id) REFERENCES salles(id)
      );

      CREATE INDEX IF NOT EXISTS idx_affectations_formation ON affectations(formation_id);
      CREATE INDEX IF NOT EXISTS idx_affectations_salle ON affectations(salle_id);
    `);
    return pool;
  } catch (error) {
    throw new Error('Erreur lors de l’initialisation de la base de données : ' + error.message);
  }
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
  getSalles: () => pool.query('SELECT * FROM salles ORDER BY nom'),
  addSalle: (salle) => pool.query(
    'INSERT INTO salles (nom, capacite, equipements) VALUES ($1, $2, $3) RETURNING *',
    [salle.nom, salle.capacite, salle.equipements]
  ),
  updateSalle: (salle) => pool.query(
    'UPDATE salles SET nom = $1, capacite = $2, equipements = $3, date_modification = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
    [salle.nom, salle.capacite, salle.equipements, salle.id]
  ),
  deleteSalle: (id) => pool.query(
    'DELETE FROM salles WHERE id = $1 AND NOT EXISTS (SELECT 1 FROM affectations WHERE salle_id = $1)',
    [id]
  ),
  getFormations: () => pool.query('SELECT * FROM formations ORDER BY debut'),
  addFormation: (formation) => {
    validateFormation(formation);
    return pool.query(
      'INSERT INTO formations (nom, apprenants, debut, fin, besoins) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [formation.nom, formation.apprenants, formation.debut, formation.fin, formation.besoins]
    );
  },
  updateFormation: (formation) => {
    validateFormation(formation);
    return pool.query(
      'UPDATE formations SET nom = $1, apprenants = $2, debut = $3, fin = $4, besoins = $5, date_modification = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *',
      [formation.nom, formation.apprenants, formation.debut, formation.fin, formation.besoins, formation.id]
    );
  },
  deleteFormation: (id) => pool.query(
    'WITH deleted_affectations AS (DELETE FROM affectations WHERE formation_id = $1) DELETE FROM formations WHERE id = $1 RETURNING *',
    [id]
  ),
  getAffectations: () => pool.query(`
    SELECT a.id, a.date, a.date_creation,
           f.id as formation_id, f.nom as formation_nom, f.apprenants, f.debut, f.fin, f.besoins,
           s.id as salle_id, s.nom as salle_nom, s.capacite, s.equipements
    FROM affectations a
    JOIN formations f ON a.formation_id = f.id
    JOIN salles s ON a.salle_id = s.id
    ORDER BY a.date
  `),
  addAffectation: (affectation) => pool.query(
    'INSERT INTO affectations (formation_id, salle_id, date, date_creation) VALUES ($1, $2, $3, $4) RETURNING *',
    [affectation.formation_id, affectation.salle_id, affectation.date, affectation.date_creation || new Date().toISOString()]
  ),
  optimiserAffectations: async () => {
    const formations = await pool.query(`
      SELECT f.id as formation_id, f.nom as formation_nom, f.apprenants, f.debut, f.fin, f.besoins
      FROM formations f
      LEFT JOIN affectations a ON f.id = a.formation_id
      WHERE a.id IS NULL AND f.debut >= CURRENT_DATE
      ORDER BY f.debut
    `);

    if (!formations.rows || formations.rows.length === 0) {
      return [];
    }

    const suggestions = [];
    for (const f of formations.rows) {
      const sallesDisponibles = await pool.query(`
        SELECT * FROM salles 
        WHERE capacite >= $1 AND (equipements LIKE $2 OR equipements IS NULL)
        AND id NOT IN (SELECT salle_id FROM affectations WHERE date = $3)
      `, [f.apprenants, `%${f.besoins}%`, f.debut]);

      if (sallesDisponibles.rows.length > 0) {
        const salle = sallesDisponibles.rows.reduce((best, current) =>
          current.capacite - f.apprenants < best.capacite - f.apprenants ? current : best
        );
        suggestions.push({
          formation_id: f.formation_id,
          formation_nom: f.formation_nom,
          apprenants: f.apprenants,
          date: f.debut,
          salle_id: salle.id,
          salle_nom: salle.nom,
          capacite: salle.capacite,
          optimisation: Math.round((f.apprenants / salle.capacite) * 100)
        });
      }
    }
    return suggestions;
  },
};
