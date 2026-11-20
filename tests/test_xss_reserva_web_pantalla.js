// XSS en la reserva web pública (../index.html) en Chromium REAL con la API simulada: categoría, servicio y
// profesional con <img onerror>, comillas y &; foto "javascript:" y color con HTML; y un turno en "Mis turnos" cuyo
// servicio y estado traen HTML (el nombre de servicio lo puede mandar una visitante al reservar: pendientes.js lo
// guarda tal cual y pagos.js lo copia al turno). Nada se ejecuta, todo se ve como texto, y lo que viajaba en
// onclick (categoría, servicio, profesional) llega exacto a sus funciones por data-*. FRONT_HTML cambia el archivo
// (para validar la prueba con copias sin escapar). Necesita playwright-core y un Chromium; si falta, se omite.
const path = require('path');
const fs = require('fs');
const PAGINA = process.env.FRONT_HTML || path.resolve(__dirname, '../index.html');
const omitir = m => { console.log('⚠️  Prueba omitida: ' + m); process.exit(0); };
if (!fs.existsSync(PAGINA)) omitir('no encontré ' + PAGINA);
const buscarModulo = n => { for (const b of [__dirname, process.env.PLAYWRIGHT_DIR].filter(Boolean)) { try { return require(require.resolve(n, { paths: [b] })); } catch (_) {} } return null; };
const pw = buscarModulo('playwright-core');
if (!pw) omitir('falta playwright-core (o PLAYWRIGHT_DIR)');
const exe = process.env.PLAYWRIGHT_CHROMIUM || (() => {
  const raiz = path.join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  if (!fs.existsSync(raiz)) return null;
  const d = fs.readdirSync(raiz).filter(x => /^chromium-\d+$/.test(x)).sort().pop();
  const p = d && path.join(raiz, d, 'chrome-win64', 'chrome.exe');
  return p && fs.existsSync(p) ? p : null;
})();
if (!exe) omitir('no encontré un Chromium (PLAYWRIGHT_CHROMIUM)');

let ok = 0, fail = 0;
const check = (c, m) => { if (c) { ok++; console.log('   ✓', m); } else { fail++; console.log('   ✗ FALLÓ:', m); } };
const carga = k => `<img src=x onerror="window.__xss='${k}'">`;
const CAT = carga('categoria') + `Pelu' "Top" & más`;
const SRV = carga('servicio') + `Corte '1' "Pro" & más`;
const PROF = carga('profesional') + `Xime 'Q' "R" & Cía`;
const SRV_PUB = carga('mis-turnos') + 'Servicio cargado por una visitante & "x"';
const ESTADO = carga('estado') + 'raro';
const hoy = new Date().toISOString().slice(0, 10);
const SERVICIOS = [{ id: 1, nombre: SRV, categoria: CAT, precio: 10000, duracion: 60, activo: true }, { id: 2, nombre: 'Corte', categoria: 'Peluquería', precio: 8000, duracion: 30, activo: true }];
const PROFES = [
  { id: 7, nombre: PROF, iniciales: null, color: `red;"><img src=x onerror="window.__xss='color'">`, foto_url: 'javascript:window.__xss="foto"' },
  { id: 8, nombre: 'María', iniciales: 'MA', color: '#5a6348', foto_url: null },
];

(async () => {
  const browser = await pw.chromium.launch({ executablePath: exe });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const errores = []; page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.dismiss());
  const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' };
  await page.route('**/*', async route => {
    const req = route.request(); const u = new URL(req.url());
    if (u.protocol === 'file:') return route.continue();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const json = b => route.fulfill({ status: 200, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
    if (!/porto-estudio-avelinas/.test(u.host)) return route.abort();
    if (u.pathname === '/api/servicios') return json(SERVICIOS);
    if (u.pathname === '/api/profesionales') return json(PROFES);
    if (u.pathname === '/api/turnos/publico') return json([{ fecha: hoy, hora_inicio: '10:00:00', servicio_nombre: SRV_PUB, estado: ESTADO }]);
    return json([]);
  });
  await page.goto('file:///' + PAGINA.replace(/\\/g, '/'));
  await page.waitForTimeout(800);
  const limpio = async donde => {
    const r = await page.evaluate(() => ({ xss: window.__xss || null, imgs: document.querySelectorAll('img[src="x"]').length }));
    check(!r.xss && r.imgs === 0, `${donde}: nada se ejecuta ni se inyecta${r.xss ? ' (se ejecutó: ' + r.xss + ')' : ''}${r.imgs ? ' (' + r.imgs + ' <img> inyectadas)' : ''}`);
  };

  console.log('1) Categorías y servicios');
  await page.evaluate(async () => { if (!serviciosData.length) await cargarServicios(); renderCategorias(); });
  const cats = await page.$$eval('#catGrid .ssb', b => b.map(x => x.innerText.trim()));
  check(cats.some(t => t.includes(CAT)), 'la categoría se ve como texto');
  await limpio('categorías');
  await page.$$eval('#catGrid .ssb', b => b.find(x => x.innerText.includes('Pelu')).click());
  check(await page.$eval('#p1bTitle', e => e.textContent) === CAT, 'al elegirla, la categoría llega exacta (comillas, apóstrofo y & incluidos)');
  const srvs = await page.$$eval('#srvGrid .ssb', b => b.map(x => x.innerText.trim()));
  check(srvs.some(t => t.includes(SRV)), 'el servicio se ve como texto');
  await page.evaluate(() => { window.goStep = () => {}; });   // no avanzar de paso: solo interesa lo elegido
  await page.$$eval('#srvGrid .ssb', b => b[0].click());
  await page.waitForTimeout(350);
  const bk = await page.evaluate(() => ({ srv: bk.srv, id: bk.servicioId, dur: bk.duracion }));
  check(bk.srv === SRV && bk.id === 1 && bk.dur === 60, 'al elegirlo, el servicio llega exacto con su id y duración');
  await limpio('servicios');

  console.log('\n2) Profesionales');
  await page.evaluate(() => renderProfesionales());
  await page.waitForFunction(() => document.querySelectorAll('#profGrid .prof-btn').length === 2, null, { timeout: 5000 });
  const profs = await page.$$eval('#profGrid .prof-btn', b => b.map(x => ({ t: x.innerText.trim(), bg: x.querySelector('.prof-av').style.background, img: !!x.querySelector('.prof-av img') })));
  check(profs[0].t.includes(PROF), 'el nombre de la profesional se ve como texto');
  check(!profs[0].img, 'foto "javascript:" no se usa (se muestran las iniciales)');
  check(!/img|onerror|</.test(profs[0].bg), `color con HTML descartado (fondo: ${profs[0].bg || 'paleta'})`);
  await page.$$eval('#profGrid .prof-btn', b => b[0].click());
  check(await page.evaluate(() => bk.profesionalNombre) === PROF && await page.evaluate(() => bk.profesionalId) === 7, 'al elegirla, el nombre llega exacto');
  await limpio('profesionales');

  console.log('\n3) Mis turnos (consulta por DNI)');
  await page.evaluate(() => { document.getElementById('turnosDni').value = '30111222'; return consultarMisTurnos(); });
  await page.waitForTimeout(400);
  const lista = await page.$eval('#turnosLista', e => e.innerText);
  check(lista.includes(SRV_PUB) && lista.includes(ESTADO), 'servicio y estado del turno como texto');
  await limpio('Mis turnos');
  check(errores.length === 0, 'sin errores de JavaScript' + (errores.length ? ': ' + errores.join(' | ') : ''));
  await browser.close();
  console.log(`\nResultado: ${ok} OK, ${fail} fallidos`);
  process.exitCode = fail ? 1 : 0;
})().catch(e => { console.error('ERROR', e); process.exit(2); });
