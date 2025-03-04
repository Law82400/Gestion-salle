const express = require('express');
const { 
  initDatabase, 
  getSalles, addSalle, updateSalle, deleteSalle, 
  getFormations, addFormation, updateFormation, deleteFormation, 
  getAffectations, addAffectation, optimiserAffectations 
} = require('./database');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// On sert les fichiers depuis le dossier "public"
app.use(express.static(path.join(__dirname, 'public')));

let db;

async function startServer() {
  try {
    db = await initDatabase();
    console.log('Base de données initialisée avec succès');

    // API pour les salles
    app.get('/api/salles', async (req, res) => {
      try {
        const salles = await getSalles(db);
        res.json(salles || []);
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

    // API pour les formations
    app.get('/api/formations', async (req, res) => {
      try {
        const formations = await getFormations(db);
        res.json(formations || []);
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

    // API pour les affectations et l'optimisation
    app.get('/api/affectations', async (req, res) => {
      try {
        const affectations = await getAffectations(db);
        res.json(affectations || []);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    app.post('/api/affectations', async (req, res) => {
      try {
        const affectation = await addAffectation(db, {
          ...req.body,
          date_creation: new Date().toISOString()
        });
        res.json(affectation);
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    });
    app.get('/api/optimisation', async (req, res) => {
      try {
        const suggestions = await optimiserAffectations(db);
        res.json(suggestions || []);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Route catch-all pour renvoyer l'index
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Serveur démarré sur le port ${PORT}`);
    });
  } catch (error) {
    console.error('Erreur lors de l’initialisation de la base de données :', error);
    process.exit(1);
  }
}

startServer().catch(error => {
  console.error('Erreur fatale lors du démarrage :', error);
  process.exit(1);
});
