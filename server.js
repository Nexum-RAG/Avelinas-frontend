const express = require('express');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname)));

app.get('*', (req, res) => {
  // Si la ruta tiene extensión (ej: .html, .js, .css), dejar que el static lo maneje
  if (path.extname(req.path)) {
    res.status(404).send('Not found');
  } else {
    res.sendFile(path.join(__dirname, 'index.html'));
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Frontend corriendo en puerto ' + PORT));
