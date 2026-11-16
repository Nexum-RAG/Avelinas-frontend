const express = require('express');
const path = require('path');
const app = express();
const { servirTerminos } = require('./terminos');

// Condiciones generales: /terminos arma la página desde condiciones_avelinas.md
// (el texto se edita solo ahí). Va antes del static para que /terminos.html
// también caiga acá, con una sola dirección pública.
app.get(['/terminos', '/terminos/'], servirTerminos);
app.get('/terminos.html', (req, res) => res.redirect(301, '/terminos'));

app.use(express.static(path.join(__dirname)));

// Tienda online (catálogo): /tienda sirve tienda.html
app.get('/tienda', (req, res) => {
  res.sendFile(path.join(__dirname, 'tienda.html'));
});

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
