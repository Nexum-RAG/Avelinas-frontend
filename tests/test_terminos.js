// /terminos — Condiciones generales. Levanta el server.js REAL (proceso aparte, puerto libre) y comprueba:
// la ruta responde (también /terminos/ y /terminos.html → 301), <title> y descripción propios, los 11 puntos del
// condiciones_avelinas.md con sus títulos y anclas, el índice apunta a cada uno, TODAS las líneas del .md están en
// la página (sin reescribir), el pie de la landing tiene el link, y las rutas de siempre (/, /tienda, comodín SPA,
// 404 con extensión) siguen igual. Además: el texto se escapa (HTML en el .md no se ejecuta) y sin el .md la
// ruta responde 503 en vez de romperse. No usa red externa.
//   node tests/test_terminos.js
const path = require('path');
const fs = require('fs');
const net = require('net');
const { spawn } = require('child_process');
const RAIZ = path.resolve(__dirname, '..');

let ok = 0, fail = 0;
const check = (c, m) => { if (c) { ok++; console.log('   ✓', m); } else { fail++; console.log('   ✗ FALLÓ:', m); } };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const puertoLibre = () => new Promise(r => { const s = net.createServer().listen(0, () => { const p = s.address().port; s.close(() => r(p)); }); });

(async () => {
  const md = fs.readFileSync(path.join(RAIZ, 'condiciones_avelinas.md'), 'utf8').replace(/^﻿/, '');
  const lineas = md.replace(/\r\n?/g, '\n').split('\n').map(l => l.trim()).filter(Boolean);
  const titulosMd = lineas.filter(l => /^##\s/.test(l)).map(l => l.replace(/^##\s+/, ''));

  const PORT = await puertoLibre();
  const srv = spawn(process.execPath, ['server.js'], { cwd: RAIZ, env: { ...process.env, PORT: String(PORT) }, stdio: ['ignore', 'pipe', 'pipe'] });
  let salida = '';
  srv.stdout.on('data', d => { salida += d; }); srv.stderr.on('data', d => { salida += d; });
  for (let i = 0; i < 50 && !/corriendo/.test(salida); i++) await new Promise(r => setTimeout(r, 100));
  const base = `http://127.0.0.1:${PORT}`;
  const get = async (p, opt = {}) => { const r = await fetch(base + p, { redirect: 'manual', ...opt }); return { status: r.status, tipo: r.headers.get('content-type') || '', ubicacion: r.headers.get('location'), html: await r.text() }; };

  try {
    console.log('1) La ruta responde');
    const t = await get('/terminos');
    check(t.status === 200 && /text\/html/.test(t.tipo), `/terminos → 200 HTML (${t.status}, ${t.tipo})`);
    check(/<title>Condiciones generales — Avelinas<\/title>/.test(t.html), '<title> propio');
    check(/<meta name="description" content="[^"]{40,}">/.test(t.html), 'meta description propia');
    check(!/noindex/.test(t.html), 'sin noindex');
    check(/<meta name="viewport" content="width=device-width, initial-scale=1.0">/.test(t.html), 'viewport para celular');
    const barra = await get('/terminos/');
    check(barra.status === 200 && barra.html === t.html, '/terminos/ → la misma página');
    const conHtml = await get('/terminos.html');
    check(conHtml.status === 301 && conHtml.ubicacion === '/terminos', `/terminos.html → 301 a /terminos (${conHtml.status} ${conHtml.ubicacion})`);
    const conQuery = await get('/terminos?utm=wa');
    check(conQuery.status === 200 && conQuery.html === t.html, '/terminos?utm=wa → la misma página');

    console.log('\n2) Los 11 puntos con sus títulos, en orden, con ancla e índice');
    check(titulosMd.length === 11, `el .md tiene 11 títulos de punto (${titulosMd.length})`);
    const h2 = [...t.html.matchAll(/<section class="punto" id="(punto-\d+)">\s*<h2>([^<]*)<\/h2>/g)].map(m => ({ id: m[1], titulo: m[2] }));
    check(h2.length === 11, `11 secciones en la página (${h2.length})`);
    check(h2.every((h, i) => h.titulo === esc(titulosMd[i])), 'cada título es el del .md, en el mismo orden');
    check(h2.every((h, i) => h.id === 'punto-' + (i + 1)), 'anclas punto-1 … punto-11');
    const indice = [...t.html.matchAll(/<li><a href="#(punto-\d+)">([^<]*)<\/a><\/li>/g)].map(m => ({ id: m[1], titulo: m[2] }));
    check(indice.length === 11 && indice.every((x, i) => x.id === h2[i].id && x.titulo === h2[i].titulo), 'el índice tiene los 11 y cada link apunta a su punto');
    check(new Set(h2.map(h => h.id)).size === 11, 'sin anclas repetidas');
    const tituloPag = lineas[0].replace(/^#\s+/, '');
    check(t.html.includes('<h1>' + esc(tituloPag) + '</h1>'), `título de la página: "${tituloPag}"`);
    check(t.html.includes('<h3>Cancelaciones y reprogramaciones por parte de Avelinas</h3>'), 'el subtítulo del punto 2 sale como subtítulo');

    console.log('\n3) El texto está completo: cada línea del .md aparece tal cual');
    const faltan = lineas.filter(l => !/^-{3,}$/.test(l)).map(l => l.replace(/^#{1,3}\s+/, '').replace(/^[-*]\s+/, '')).filter(l => !t.html.includes(esc(l)));
    check(faltan.length === 0, `las ${lineas.length - 1} líneas de texto están en la página${faltan.length ? ' — faltan: ' + faltan.slice(0, 3).join(' | ') : ''}`);
    const items = lineas.filter(l => /^-\s/.test(l)).length;
    check((t.html.match(/<li>(?!<a )/g) || []).length === items, `los ${items} ítems de lista salen como lista`);
    check(t.html.includes('<div class="firma">AVELINAS | BELLEZA INTEGRAL</div>'), 'el cierre final con la firma');
    const enPuntos = t.html.slice(t.html.indexOf('<div class="puntos">'), t.html.indexOf('<div class="cierre">'));
    check(!enPuntos.includes('AVELINAS | BELLEZA INTEGRAL'), 'el cierre no queda metido dentro del punto 11');

    console.log('\n4) Link en la landing y rutas de siempre');
    const inicio = await get('/');
    check(inicio.status === 200 && inicio.html.includes('<a href="/terminos"') && inicio.html.includes('>Condiciones generales</a>'), 'el pie de la landing tiene "Condiciones generales" → /terminos');
    check(inicio.html === fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8'), '/ sigue sirviendo index.html');
    const tienda = await get('/tienda');
    check(tienda.status === 200 && tienda.html === fs.readFileSync(path.join(RAIZ, 'tienda.html'), 'utf8'), '/tienda sigue sirviendo tienda.html');
    const comodin = await get('/mis-turnos-x');
    check(comodin.status === 200 && comodin.html === inicio.html, 'ruta sin extensión desconocida → index.html, como siempre');
    const noExiste = await get('/nada.html');
    check(noExiste.status === 404, 'archivo inexistente con extensión → 404, como siempre');
  } finally {
    srv.kill();
  }

  console.log('\n5) Escapado y .md ausente (terminos.js directo)');
  const terminos = require(path.join(RAIZ, 'terminos.js'));
  const malo = terminos.paginaTerminos('# Hola <b>\n## 1. Uno <script>alert(1)</script>\n- <img src=x onerror=alert(1)>\nTexto "con" comillas & cosas');
  check(!/<script>alert|<img src=x/.test(malo) && malo.includes('&lt;script&gt;') && malo.includes('&lt;img src=x onerror=alert(1)&gt;'), 'HTML dentro del .md sale como texto, no se ejecuta');
  const d = terminos.interpretar('# T\nintro\n## 1. A\n- x\n- y\np\n## 2. B\n---\nFIRMA\ngracias');
  check(d.puntos.length === 2 && d.puntos[0].html === '<ul><li>x</li><li>y</li></ul>\n<p>p</p>' && d.cierre.length === 2, 'listas, párrafos y cierre se arman bien');
  check(terminos.interpretar('﻿# T\r\n## 1. A\r\n').puntos[0].titulo === '1. A', 'tolera BOM y saltos CRLF (si se edita en Windows)');
  const fsOrig = fs.readFileSync;
  let estado = null, cuerpo = '';
  fs.readFileSync = (p, ...r) => { if (p === terminos.ARCHIVO_MD) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' }); return fsOrig(p, ...r); };
  const errOrig = console.error; console.error = () => {};
  try {
    terminos.servirTerminos({}, { status(c) { estado = c; return this; }, type() { return this; }, send(b) { cuerpo = b; return this; } });
  } finally { fs.readFileSync = fsOrig; console.error = errOrig; }
  check(estado === 503 && /no están disponibles/.test(cuerpo), 'sin condiciones_avelinas.md → 503 con un aviso, no un error 500');

  console.log(`\nResultado: ${ok} OK, ${fail} fallidos`);
  process.exitCode = fail ? 1 : 0;
})().catch(e => { console.error('ERROR', e); process.exitCode = 1; });
