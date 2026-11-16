// ============================================================
//  /terminos — Condiciones generales de Avelinas.
//
//  El TEXTO vive en un solo lugar: condiciones_avelinas.md (en esta misma
//  carpeta). Para corregirlo se edita ese archivo y se vuelve a deployar;
//  esta página no lleva texto propio. Formato que se entiende:
//    # Título            → título de la página (uno solo, arriba)
//    ## 1. Título        → cada punto: entra al índice con un ancla (#punto-1)
//    ### Subtítulo       → subtítulo dentro de un punto
//    - texto             → ítem de lista
//    ---                 → separa el cierre final (firma y agradecimiento)
//    cualquier otra línea → un párrafo
//  No se reescribe ni se reordena nada: cada línea sale como está.
// ============================================================
const fs = require('fs');
const path = require('path');

const ARCHIVO_MD = path.join(__dirname, 'condiciones_avelinas.md');

const esc = s => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Texto del .md → { titulo, intro, puntos: [{ id, titulo, html }], cierre }
function interpretar(md) {
  const lineas = String(md).replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n');
  let titulo = '';
  const intro = [], cierre = [], puntos = [];
  let destino = intro;          // dónde van los bloques que siguen
  let lista = null;             // <ul> abierta
  let enCierre = false;
  const cerrarLista = () => { if (lista) { destino.push('<ul>' + lista.join('') + '</ul>'); lista = null; } };

  for (const cruda of lineas) {
    const l = cruda.trim();
    if (!l) { cerrarLista(); continue; }
    if (/^-{3,}$/.test(l)) { cerrarLista(); enCierre = true; destino = cierre; continue; }
    let m;
    if (!enCierre && !titulo && (m = l.match(/^#\s+(.+)$/))) { titulo = m[1]; continue; }
    if (!enCierre && (m = l.match(/^##\s+(.+)$/))) {
      cerrarLista();
      const num = (m[1].match(/^(\d+)[.)]/) || [])[1];
      const p = { id: 'punto-' + (num || puntos.length + 1), titulo: m[1], bloques: [] };
      puntos.push(p);
      destino = p.bloques;
      continue;
    }
    if ((m = l.match(/^###\s+(.+)$/))) { cerrarLista(); destino.push('<h3>' + esc(m[1]) + '</h3>'); continue; }
    if ((m = l.match(/^[-*]\s+(.+)$/))) { (lista = lista || []).push('<li>' + esc(m[1]) + '</li>'); continue; }
    cerrarLista();
    destino.push('<p>' + esc(l) + '</p>');
  }
  cerrarLista();
  return { titulo, intro, puntos: puntos.map(p => ({ id: p.id, titulo: p.titulo, html: p.bloques.join('\n') })), cierre };
}

const LOGO = 'https://lh3.googleusercontent.com/d/1qybhZ-VI4Kyjer-kWVeVCrQOlZS47Jnc';
const DESCRIPCION = 'Condiciones generales de servicios, turnos y atención de Avelinas: reservas y señas, cancelaciones, precios, vouchers, garantías y más.';

function paginaTerminos(md) {
  const d = interpretar(md);
  const indice = d.puntos.map(p => `<li><a href="#${esc(p.id)}">${esc(p.titulo)}</a></li>`).join('\n          ');
  const puntos = d.puntos.map(p => `<section class="punto" id="${esc(p.id)}">
        <h2>${esc(p.titulo)}</h2>
        ${p.html}
      </section>`).join('\n      ');
  const [firma, ...restoCierre] = d.cierre;
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Condiciones generales — Avelinas</title>
  <meta name="description" content="${esc(DESCRIPCION)}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap" rel="stylesheet">
  <style>
    :root{--olive:#5a6348;--olive-deep:#3e4733;--olive-mid:#6e7d5b;--olive-light:#8fa07a;--olive-pale:#c8d3b0;--cream:#f6f1e9;--cream-dark:#ede5d4;--cream-mid:#e4d9c4;--white:#fdfaf5;--ink:#252820;--ink-mid:#484b3e;--ink-soft:#7a7d6d;--serif:'Cormorant Garamond',Georgia,serif;--sans:'DM Sans',system-ui,sans-serif;}
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    html{scroll-behavior:smooth;scroll-padding-top:104px;}
    body{background:var(--cream);color:var(--ink);font-family:var(--sans);font-weight:300;line-height:1.5;overflow-x:hidden;}
    nav{position:fixed;top:0;left:0;right:0;z-index:200;padding:12px 60px;display:flex;align-items:center;justify-content:space-between;gap:20px;background:var(--cream);box-shadow:0 1px 0 rgba(90,99,72,0.12),0 6px 18px rgba(37,40,32,0.10);}
    .nav-logo{display:flex;align-items:center;text-decoration:none;}
    .nav-logo img{height:64px;width:auto;display:block;}
    .nav-links{display:flex;gap:30px;list-style:none;}
    .nav-links a{text-decoration:none;font-size:.78rem;font-weight:400;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-mid);transition:color .2s;}
    .nav-links a:hover{color:var(--olive);}
    .nav-btn{background:var(--olive);color:var(--white);padding:10px 22px;border-radius:50px;font-size:.78rem;font-weight:400;letter-spacing:.08em;text-decoration:none;transition:background .2s;white-space:nowrap;}
    .nav-btn:hover{background:var(--olive-mid);}
    main{max-width:820px;margin:0 auto;padding:140px 24px 80px;}
    .sec-label{font-size:.7rem;letter-spacing:.2em;text-transform:uppercase;color:var(--olive-mid);font-weight:400;margin-bottom:14px;display:flex;align-items:center;gap:12px;}
    .sec-label::before{content:'';width:22px;height:1px;background:var(--olive-mid);display:block;}
    h1{font-family:var(--serif);font-size:clamp(2.3rem,5vw,3.4rem);font-weight:600;line-height:1.08;color:var(--ink);margin-bottom:26px;letter-spacing:-.01em;overflow-wrap:break-word;}
    .intro p{font-size:1rem;line-height:1.8;color:var(--ink-mid);margin-bottom:10px;}
    .indice{background:var(--white);border-radius:20px;padding:28px 32px;margin:36px 0 48px;box-shadow:0 4px 32px rgba(62,71,51,.07);}
    .indice-tit{font-family:var(--serif);font-size:1.35rem;font-weight:400;color:var(--olive-deep);margin-bottom:12px;}
    .indice ol{list-style:none;columns:2;column-gap:32px;}
    .indice li{break-inside:avoid;padding:5px 0;}
    .indice a{color:var(--ink-mid);text-decoration:none;font-size:.9rem;border-bottom:1px solid transparent;transition:color .2s,border-color .2s;}
    .indice a:hover{color:var(--olive);border-bottom-color:var(--olive-pale);}
    .punto{padding:30px 0;border-top:1px solid var(--cream-mid);}
    .punto h2{font-family:var(--serif);font-size:clamp(1.6rem,3.4vw,2rem);font-weight:600;color:var(--olive-deep);line-height:1.2;margin-bottom:14px;overflow-wrap:break-word;}
    .punto h3{font-family:var(--serif);font-size:1.3rem;font-weight:600;color:var(--ink);margin:22px 0 8px;}
    .punto p{font-size:.96rem;line-height:1.8;color:var(--ink-mid);margin-bottom:10px;overflow-wrap:break-word;}
    .punto ul{list-style:none;margin:6px 0 14px;}
    .punto li{position:relative;padding-left:20px;font-size:.96rem;line-height:1.75;color:var(--ink-mid);margin-bottom:6px;overflow-wrap:break-word;}
    .punto li::before{content:'';position:absolute;left:2px;top:.72em;width:7px;height:7px;border-radius:50%;background:var(--olive-light);}
    .volver{display:inline-block;margin-top:6px;font-size:.78rem;letter-spacing:.06em;color:var(--olive-mid);text-decoration:none;}
    .volver:hover{color:var(--olive);}
    .cierre{margin-top:36px;background:var(--olive-deep);color:var(--white);border-radius:24px;padding:40px 36px;text-align:center;}
    .cierre .firma{font-family:var(--serif);font-size:1.5rem;font-weight:400;letter-spacing:.12em;margin-bottom:14px;}
    .cierre p{font-size:.94rem;line-height:1.8;color:rgba(255,255,255,.78);max-width:560px;margin:0 auto 8px;}
    footer{background:var(--ink);color:rgba(255,255,255,.4);padding:30px 60px;font-size:.74rem;display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;}
    footer a{color:rgba(255,255,255,.6);text-decoration:none;}
    footer a:hover{color:var(--white);}
    @media(max-width:900px){
      nav{padding:10px 22px;}
      .nav-logo img{height:52px;}
      .nav-links{display:none;}
      main{padding-top:112px;}
      footer{padding:26px 22px;flex-direction:column;text-align:center;}
    }
    @media(max-width:600px){
      html{scroll-padding-top:84px;}
      main{padding:100px 18px 56px;}
      .indice{padding:22px 20px;border-radius:16px;}
      .indice ol{columns:1;}
      .cierre{padding:30px 20px;border-radius:18px;}
    }
  </style>
</head>
<body>

<nav>
  <a href="/" class="nav-logo" aria-label="Avelinas — inicio">
    <img src="${LOGO}" alt="Avelinas"/>
  </a>
  <ul class="nav-links">
    <li><a href="/">Inicio</a></li>
    <li><a href="/#servicios">Servicios</a></li>
    <li><a href="/tienda">Tienda</a></li>
    <li><a href="/#club">Club</a></li>
    <li><a href="/#contacto">Contacto</a></li>
  </ul>
  <a href="/#turnos" class="nav-btn">Reservar turno</a>
</nav>

<main>
  <div class="sec-label">Avelinas</div>
  <h1>${esc(d.titulo || 'Condiciones generales')}</h1>
  <div class="intro">
    ${d.intro.join('\n    ')}
  </div>

  <div class="indice" role="navigation" aria-label="Índice">
    <div class="indice-tit">Índice</div>
    <ol>
          ${indice}
    </ol>
  </div>

  <div class="puntos">
      ${puntos}
  </div>
${firma ? `
  <div class="cierre">
    <div class="firma">${firma.replace(/^<p>|<\/p>$/g, '')}</div>
    ${restoCierre.join('\n    ')}
  </div>` : ''}
  <p style="margin-top:30px;"><a class="volver" href="#">↑ Volver al índice</a></p>
</main>

<footer>
  <div>© 2025 Avelinas Centro de Belleza Integral · Paz 743, Buenos Aires</div>
  <div><a href="/">Inicio</a> · <a href="/terminos">Condiciones generales</a></div>
</footer>

</body>
</html>
`;
}

// Handler de Express: lee el .md en cada pedido (son 8 KB), así un cambio
// del texto sale con el próximo deploy sin tocar nada más.
function servirTerminos(req, res) {
  let md;
  try { md = fs.readFileSync(ARCHIVO_MD, 'utf8'); } catch (err) {
    console.error('No se pudo leer condiciones_avelinas.md:', err.message);
    return res.status(503).type('text/plain; charset=utf-8').send('Las condiciones generales no están disponibles en este momento.');
  }
  res.type('html').send(paginaTerminos(md));
}

module.exports = { interpretar, paginaTerminos, servirTerminos, ARCHIVO_MD };
