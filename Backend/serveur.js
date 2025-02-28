const express = require('express');
const { initDatabase, getSalles, addSalle, updateSalle, deleteSalle, getFormations, addFormation, updateFormation, deleteFormation, getAffectations, addAffectation, optimiserAffectations } = require('./database');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors()); // Permettre les requêtes cross-origin
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend'))); // Servir le frontend

let db;

async function startServer() {
  db = await initDatabase();

  // API Salles
  app.get('/api/salles', async (req, res) => {
    try {
      const salles = await getSalles(db);
      res.json(salles);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/salles', async (req, res) => {
    try {
      const salle = await addSalle(db, req.body);
      res.json(salle);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put('/api/salles/:id', async (req, res) => {
    try {
      const salle = await updateSalle(db, { id: req.params.id, ...req.body });
      res.json(salle);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/api/salles/:id', async (req, res) => {
    try {
      await deleteSalle(db, req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // API Formations
  app.get('/api/formations', async (req, res) => {
    try {
      const formations = await getFormations(db);
      res.json(formations);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/formations', async (req, res) => {
    try {
      const formation = await addFormation(db, req.body);
      res.json(formation);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put('/api/formations/:id', async (req, res) => {
    try {
      const formation = await updateFormation(db, { id: req.params.id, ...req.body });
      res.json(formation);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/api/formations/:id', async (req, res) => {
    try {
      await deleteFormation(db, req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // API Affectations
  app.get('/api/affectations', async (req, res) => {
    try {
      const affectations = await getAffectations(db);
      res.json(affectations);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/affectations', async (req, res) => {
    try {
      const affectation = await addAffectation(db, req.body);
      res.json(affectation);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // API Optimisation
  app.get('/api/optimisation', async (req, res) => {
    try {
      const suggestions = await optimiserAffectations(db);
      res.json(suggestions);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Servir l'index.html pour toutes les autres routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
  });
}

startServer();