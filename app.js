// app.js — interfaz de NutriHome: Semana, Compra, Claude (💬), En casa y Recetas; vuestros datos, en el icono de perfil de arriba.
// Recetas propias, buscador de Mercadona, ticket digital y escáner. Todo lo que va a Claude sale de la pestaña 💬.
// Los datos (productos de Mercadona, recetas, menú y perfiles) llegan cifrados en datos.enc; lo que cambiáis
// (platos cambiados, lista, lo que hay en casa, vuestras recetas…) se guarda en este móvil.
import * as L from './logica.js';

const CLAVE = 'alameda.clave', ESTADO = 'alameda.estado.v1';   // nombres de antes de NutriHome: así no se pierde lo guardado
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const lee = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } };
const guarda = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento: se pierde al cerrar */ } };
const leeTexto = k => { try { return localStorage.getItem(k); } catch { return null; } };
const guardaTexto = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* nada */ } };
const r0 = n => Math.round(n);
const euros = n => n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

let D, E, fac, obj, recetas, NOM = { G: '', P: '' };
const V = { pestana: 'semana', anterior: 'semana', dia: null, filtro: 'todas', busca: '', anadidos: new Set(), borrador: '', adjunto: null };

// ——— Fechas ———
const iso = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const hoy = () => iso(new Date());
const fecha = f => new Date(f + 'T12:00:00');
const masDias = (f, n) => { const d = fecha(f); d.setDate(d.getDate() + n); return iso(d); };
const DS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const DL = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const capital = s => s ? s[0].toUpperCase() + s.slice(1) : s;

// ——— Iconos y dibujos ———
const ic = d => `<svg class="i" viewBox="0 0 24 24">${d}</svg>`;
const SVG = {
  semana: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  compra: '<svg viewBox="0 0 24 24"><path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
  casa: '<svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  recetas: '<svg viewBox="0 0 24 24"><path d="M6 4h10a3 3 0 0 1 3 3v13H8a2 2 0 0 1-2-2V4Z"/><path d="M6 18a2 2 0 0 1 2-2h11M10 8h5M10 11h4"/></svg>',
  nosotros: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2"/><circle cx="16.5" cy="9.5" r="2.5"/><path d="M3.5 19c.6-3.2 2.9-5 5.5-5s4.9 1.8 5.5 5M14.5 14.6c.6-.2 1.3-.3 2-.3 2.2 0 3.9 1.5 4.4 4.2"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  equis: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  mas: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  claude: '<svg viewBox="0 0 24 24"><path d="M4 7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-6.5L6 20v-4.2A3 3 0 0 1 4 13V7Z"/><path d="M8.5 8.5h7M8.5 11.5h4.5"/></svg>',
  volver: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
};
const I = {
  buscar: ic('<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>'),
  chispas: ic('<path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7-4.7-1.8 4.7-1.8z"/><path d="M19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>'),
  caja: ic('<path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>'),
  papelera: ic('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  lapiz: ic('<path d="M4 20h4L20 8l-4-4L4 16v4z"/>'),
  enviar: ic('<path d="M21 3 3 10.5l7 2.5 2.5 7L21 3z"/><path d="M10 13l5-5"/>'),
  carro: ic('<path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2"/><circle cx="10" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/>'),
  calendario: ic('<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
};
const NOMBRE_AGENTE = 'Chef';   // el nombre de la pestaña 💬 lo elige la casa
const PESTANAS = [['semana', 'Semana'], ['compra', 'Compra'], ['claude', NOMBRE_AGENTE], ['casa', 'En casa'], ['recetas', 'Recetas']];
// «Nosotros» ya no es pestaña: se abre con el icono de perfil de la cabecera.
const VISTAS = { semana: vSemana, compra: vCompra, claude: vClaude, casa: vCasa, recetas: vRecetas, nosotros: vNosotros };
const APARATO = { airfryer: 'Air fryer', plancha: 'Plancha', micro: 'Micro', sin: 'Sin fuego', batidora: 'Batidora', olla: 'Olla' };
const APARATO_EMO = { airfryer: '🌀', plancha: '🍳', micro: '⚡', sin: '🥄', batidora: '🥤', olla: '♨️' };
const COMIDA_EMO = { desayuno: '☀️', comida: '🍽️', merienda: '🍎', cena: '🌙' };
// Secciones de la tienda, en el orden en que se recorre Mercadona.
const SECCIONES = ['Fruta y verdura', 'Panadería y pastelería', 'Carne', 'Marisco y pescado', 'Charcutería y quesos', 'Huevos, leche y mantequilla',
  'Postres y yogures', 'Arroz, legumbres y pasta', 'Conservas, caldos y cremas', 'Aceite, especias y salsas', 'Cereales y galletas', 'Aperitivos',
  'Azúcar, caramelos y chocolate', 'Cacao, café e infusiones', 'Zumos', 'Agua y refrescos', 'Bodega', 'Pizzas y platos preparados', 'Congelados',
  'Limpieza y hogar', 'Cuidado del cabello', 'Cuidado facial y corporal', 'Fitoterapia y parafarmacia', 'Maquillaje', 'Bebé', 'Mascotas'];
const CAT_EMO = { 'Fruta y verdura': '🥬', 'Panadería y pastelería': '🥖', 'Carne': '🥩', 'Marisco y pescado': '🐟', 'Charcutería y quesos': '🧀',
  'Huevos, leche y mantequilla': '🥚', 'Postres y yogures': '🥛', 'Arroz, legumbres y pasta': '🍚', 'Conservas, caldos y cremas': '🥫',
  'Aceite, especias y salsas': '🫒', 'Cereales y galletas': '🥣', 'Aperitivos': '🥜', 'Azúcar, caramelos y chocolate': '🍫', 'Cacao, café e infusiones': '☕',
  'Zumos': '🧃', 'Agua y refrescos': '💧', 'Bodega': '🍷', 'Pizzas y platos preparados': '🍕', 'Congelados': '❄️', 'Limpieza y hogar': '🧽',
  'Cuidado del cabello': '💇‍♀️', 'Cuidado facial y corporal': '🧴', 'Fitoterapia y parafarmacia': '💊', 'Maquillaje': '💄', 'Bebé': '🍼', 'Mascotas': '🐾', 'Otros': '🛒' };
const NO_COMIDA = new Set(['Limpieza y hogar', 'Cuidado del cabello', 'Cuidado facial y corporal', 'Fitoterapia y parafarmacia', 'Maquillaje', 'Mascotas']);
const emojiReceta = r => r?.e || L.emojiDe(r?.n || '');
const emojiSeccion = n => CAT_EMO[n] || (E.secciones || []).find(s => s.n === n)?.e || '🏷️';

// Anillo doble (SVG): por fuera las kcal, por dentro la proteína.
function anilloDoble(pk, pp, color, centro, sub, tam = 92) {
  const a = (r, pct, col, w) => { const c = 2 * Math.PI * r, off = c * (1 - Math.max(0, Math.min(1, pct)));
    return `<circle cx="40" cy="40" r="${r}" class="pista" style="stroke-width:${w}"/><circle cx="40" cy="40" r="${r}" class="valor" style="stroke:${col};stroke-width:${w};stroke-dasharray:${c.toFixed(1)};stroke-dashoffset:${off.toFixed(1)};--c:${c.toFixed(1)}"/>`; };
  return `<div class="anillo" style="width:${tam}px;height:${tam}px;flex-basis:${tam}px"><svg viewBox="0 0 80 80">${a(34, pk, color, 8)}${a(23, pp, '#10b981', 7)}</svg>
    <div class="centro"><div><b>${centro}</b><span>${sub}</span></div></div></div>`;
}
function anillo(pct, color, centro, sub, tam = 74) {
  const r = 32, c = 2 * Math.PI * r, off = c * (1 - Math.max(0, Math.min(1, pct)));
  return `<div class="anillo" style="width:${tam}px;height:${tam}px;flex-basis:${tam}px"><svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="${r}" class="pista"/>
    <circle cx="40" cy="40" r="${r}" class="valor" style="stroke:${color};stroke-dasharray:${c.toFixed(1)};stroke-dashoffset:${off.toFixed(1)};--c:${c.toFixed(1)}"/></svg>
    <div class="centro"><div><b>${centro}</b><span>${sub}</span></div></div></div>`;
}
const miniBarra = (pct, color) => `<div class="mini-barra"><i style="width:${Math.max(0, Math.min(100, pct))}%;background:${color}"></i></div>`;

// ——— Datos cifrados ———
const b64 = x => Uint8Array.from(atob(x), c => c.charCodeAt(0));
async function descifra(clave) {
  const r = await fetch('datos.enc', { cache: 'no-cache' });
  if (!r.ok) throw new Error('No se pudieron descargar los datos (' + r.status + ').');
  const { s, i, n, d } = await r.json();
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(clave.trim().toLowerCase()), 'PBKDF2', false, ['deriveKey']);
  const k = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64(s), iterations: n, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  let claro;
  try { claro = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(i) }, k, b64(d)); } catch { throw new Error('clave'); }
  return JSON.parse(new TextDecoder().decode(claro));
}

// ——— Sincronización entre móviles (servidor de la casa, en D.perfiles.servidor) ———
// La clave de casa da la huella de la casa (su id) y cifra todo lo que se sube: el servidor solo guarda bloques cifrados.
// Cada móvil guarda lo último sincronizado («base») y, cuando el servidor tiene algo más nuevo, funde los dos cambios (L.fusiona).
const SYNC = 'alameda.sync.v1';
let sync = null, claveSync = null, casaId = null, tSync, sincronizando = false, otraVez = false;
const servidor = () => (D?.perfiles?.servidor || '').replace(/\/$/, '');
async function preparaSync(clave) {
  const enc = new TextEncoder(), c = clave.trim().toLowerCase();
  casaId = [...new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode('nutrihome|' + c)))].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
  const base = await crypto.subtle.importKey('raw', enc.encode(c), 'PBKDF2', false, ['deriveKey']);
  claveSync = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: enc.encode('nutrihome-sync-v1'), iterations: 150000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  sync = lee(SYNC, { v: 0, base: null });
}
const aB64 = u => { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
async function cifraSync(obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12)), ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, claveSync, new TextEncoder().encode(JSON.stringify(obj))));
  const u = new Uint8Array(12 + ct.length); u.set(iv); u.set(ct, 12); return aB64(u);
}
async function descifraSync(blob) { const u = b64(blob); return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: u.slice(0, 12) }, claveSync, u.slice(12)))); }
// Cuánto «vale» lo guardado: la primera vez que dos móviles se encuentran, manda el que más datos tiene.
const riqueza = x => (x.compras || []).length * 20 + Object.values(x.semanas || {}).reduce((n, s) => n + Object.keys(s.marcados || {}).length + Object.keys(s.noComprado || {}).length + Object.keys(s.hechos || {}).length + Object.keys(s.cambios || {}).length + (s.extra || []).length, 0)
  + (x.propias || []).length * 5 + (x.pendientes || []).length + Object.keys(x.casa || {}).length + (x.escaneos || []).length + (x.favRecetas || []).length + (x.charla || []).length;
function programaSync() { if (!servidor() || !claveSync) return; clearTimeout(tSync); tSync = setTimeout(sincroniza, 1200); }
async function sincroniza() {
  if (!servidor() || !claveSync) return;
  if (sincronizando) { otraVez = true; return; }
  sincronizando = true;
  try {
    const r = await fetch(`${servidor()}/casa/${casaId}`, { cache: 'no-store' });
    if (r.status === 204) await sube(0);   // la casa aún no tiene datos en el servidor: este móvil los estrena
    else if (!r.ok) throw new Error('servidor ' + r.status);
    else {
      const rem = await r.json();
      if (rem.v === sync.v) { if (!L.igual(E, sync.base)) await sube(sync.v); }
      else {
        const E2 = await descifraSync(rem.blob);
        const fundido = sync.base == null ? (riqueza(E) > riqueza(E2) ? L.fusiona(undefined, E2, E) : L.fusiona(undefined, E, E2)) : L.fusiona(sync.base, E, E2);
        const cambiaLocal = !L.igual(fundido, E);
        E = Object.assign(estadoNuevo(), fundido); sync.v = rem.v; sync.base = JSON.parse(JSON.stringify(E)); guarda(ESTADO, E); guarda(SYNC, sync);
        if (!L.igual(fundido, E2)) await sube(rem.v);
        if (cambiaLocal) aplicaRemoto();
      }
    }
    V.sync = 'ok'; V.syncHora = new Date(); V.syncError = '';
  } catch (e) { V.sync = 'error'; V.syncError = e.message; }
  finally { sincronizando = false; pintaSync(); if (otraVez) { otraVez = false; programaSync(); } }
}
async function sube(v) {
  const r = await fetch(`${servidor()}/casa/${casaId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ v, blob: await cifraSync(E) }) });
  if (r.status === 409) { otraVez = true; return; }   // otro móvil subió antes: en la siguiente pasada se funde
  if (!r.ok) throw new Error('subida ' + r.status);
  sync.v = (await r.json()).v; sync.base = JSON.parse(JSON.stringify(E)); guarda(SYNC, sync);
}
function aplicaRemoto() {
  reconstruyeRecetas(); recalcula();
  const escribiendo = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);
  if (escribiendo || $('.hoja')) { V.repintar = true; return; }
  const y = window.scrollY; pinta(); window.scrollTo(0, y);
}
const iconoSync = () => V.sync === 'ok' ? '☁️ ' : V.sync === 'error' ? '⚠️ ' : '';
function pintaSync() { const c = $('.fecha-chip'); if (c) c.textContent = iconoSync() + c.textContent.replace(/^(☁️|⚠️) /, ''); }
function iniciaSync() {
  if (!servidor()) return;
  sincroniza().then(() => { for (const c of E.charla || []) if (!c.r && Date.now() - new Date(c.t) < 864e5) esperaRespuesta(c.id); });   // respuestas que llegaron mientras la app estaba cerrada
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sincroniza(); });
  setInterval(() => { if (document.visibilityState === 'visible') sincroniza(); }, 20000);
  window.addEventListener('online', sincroniza);
}

// ——— Estado guardado en el móvil ———
function estadoNuevo() { return { v: 1, semanas: {}, planes: [], casa: null, consumidos: {}, creatina: {}, perfiles: {}, gimnasio: null, avisos: {}, fijos: null, propias: [], escaneos: [], secciones: [], casaOtros: [], compras: [], favRecetas: [], fijosQuitados: [], precios: {}, pendientes: [], charla: [] }; }
const salva = () => { guarda(ESTADO, E); programaSync(); };
function est(id) {
  if (!E.semanas[id]) E.semanas[id] = { cambios: {}, hechos: {}, marcados: {}, extra: [], quitados: {}, faltaDespensa: id === D.semana.id ? Object.fromEntries((D.semana.falta || []).map(k => [k, true])) : {}, compraHecha: false };
  const s = E.semanas[id];
  s.recetasLista ||= []; s.otrosHechos ||= {}; s.fijosHechos ||= {}; s.noComprado ||= {}; s.alternativas ||= {}; s.menos ||= {}; s.ticketCant ||= {};
  return s;
}
function perfiles() {
  const p = JSON.parse(JSON.stringify(D.perfiles));
  for (const q of L.QUIEN) Object.assign(p[q], E.perfiles[q] || {});
  const gym = E.gimnasio ?? p.gimnasio;
  if (gym) for (const q of L.QUIEN) p[q].actividad = Math.max(p[q].actividad, 1.45);
  return p;
}
function recalcula() { const p = perfiles(); fac = L.factores(p); obj = { G: L.objetivos(p.G), P: L.objetivos(p.P) }; NOM = { G: p.G.nombre || 'G', P: p.P.nombre || 'P' }; }
const todasRecetas = () => [...(E.propias || []), ...D.recetas];
function reconstruyeRecetas() { const fav = new Set(E.favRecetas || []); recetas = Object.fromEntries(todasRecetas().map(r => { r.fav = fav.has(r.id); return [r.id, r]; })); }
const ini = q => esc((NOM[q] || q)[0]);

// Planes: el que llega con los datos y los que se preparan en el móvil con «Preparar la siguiente semana».
function planes() {
  const lista = [D.semana, ...E.planes.filter(p => p.id > D.semana.id)];
  return lista.sort((a, b) => a.id.localeCompare(b.id));
}
function planActivo() {
  const ps = planes(), h = hoy();
  return ps.find(p => h >= p.dias[0].f && h <= p.dias.at(-1).f) || (h < ps[0].dias[0].f ? ps[0] : ps.at(-1));
}
function efectivo(p) {
  const s = est(p.id);
  return { ...p, dias: p.dias.map(d => { const n = { ...d }; for (const c of L.COMIDAS) { const k = d.f + '|' + c; if (k in s.cambios) n[c] = s.cambios[k]; } return n; }) };
}

// Lo que se ha comido sale de «En casa»: al marcar «Ya comido» o, si no se marca, al pasar el día.
function descuentaHueco(v) {
  for (const q of L.QUIEN) {
    const r = recetas[L.recetaDe(v, q)];
    if (!r) continue;
    for (const ing of r.ing) { const g = L.gramos(ing, q, fac); if (g && E.casa[ing[0]] != null) E.casa[ing[0]] = Math.max(0, E.casa[ing[0]] - g); }
  }
  for (const k of Object.keys(E.casa)) if (E.casa[k] <= 0.5) delete E.casa[k];
}
function consumePasados() {
  const h = hoy();
  for (const p of planes()) {
    const pe = efectivo(p);
    for (const d of pe.dias) {
      if (d.f >= h) continue;
      for (const c of L.COMIDAS) {
        const clave = p.id + '|' + d.f + '|' + c;
        if (E.consumidos[clave]) continue;
        E.consumidos[clave] = 1;
        descuentaHueco(d[c]);
      }
    }
  }
  salva();
}

// ——— Arranque ———
async function inicio() {
  E = Object.assign(estadoNuevo(), lee(ESTADO, {}));
  for (const k of ['propias', 'escaneos', 'secciones', 'casaOtros', 'compras', 'favRecetas', 'fijosQuitados', 'pendientes', 'charla']) E[k] ||= [];
  const m = location.hash.match(/^#clave=(.+)$/);
  if (m) { guardaTexto(CLAVE, decodeURIComponent(m[1])); history.replaceState(null, '', location.pathname); }
  const clave = leeTexto(CLAVE);
  if (!clave) return puerta();
  try { D = await descifra(clave); }
  catch (e) { if (e.message === 'clave') { guardaTexto(CLAVE, null); return puerta('Esa clave no abre los datos. Vuelve a escribirla.'); } return puerta(e.message); }
  await preparaSync(clave);
  reconstruyeRecetas();
  if (!E.casa) E.casa = { ...(D.casa_inicial || {}) };
  if (!E.fijos) E.fijos = [...(D.fijos || [])];
  E.fijosQuitados ||= [];
  E.precios ||= {};
  // El precio del último ticket, si es más nuevo que los datos (cuando se rehacen los datos, mandan los suyos).
  for (const [k, v] of Object.entries(E.precios)) { const [pr, f] = Array.isArray(v) ? v : []; if (D.productos[k] && pr > 0 && f >= (D.generado || '').slice(0, 10)) D.productos[k].precio = pr; }
  for (const f of D.fijos || []) if (f.reemplaza) E.fijos = E.fijos.filter(x => x.texto !== f.reemplaza);   // favoritos que antes eran solo texto y ahora son el producto de Mercadona
  for (const f of D.fijos || []) { const id = idFav(f); if (!E.fijos.some(x => idFav(x) === id) && !E.fijosQuitados.includes(id)) E.fijos.push(f); }
  recalcula();
  consumePasados();
  pintaMarco();
  window.addEventListener('hashchange', () => {
    const n = (location.hash.slice(1) || 'semana').split('/')[0];
    if (n === 'nosotros' && V.pestana !== 'nosotros') V.anterior = V.pestana;   // para el botón de volver
    V.pestana = VISTAS[n] ? n : 'semana'; pinta();
  });
  V.pestana = VISTAS[location.hash.slice(1)] ? location.hash.slice(1) : 'semana';
  pinta();
  const ajuste = ajusteAutomatico();   // lo marcado con ✕ (o el ticket ya subido) cambia los platos sin que haya que pedirlo
  if (ajuste.length) setTimeout(() => hojaCambiosMenu(ajuste), 700);
  iniciaSync();   // con servidor: baja lo de los otros móviles y sube lo de este
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(r => r.update()).catch(() => {});
    let recargada = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (!recargada && versionCargada) { recargada = true; location.reload(); } });
  }
  versionCargada = await versionPublicada();
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible') return;
    navigator.serviceWorker?.getRegistration().then(r => r?.update()).catch(() => {});
    const v = await versionPublicada();
    if (v && versionCargada && v !== versionCargada) location.reload();
  });
}
// La versión publicada (la escribe construir.mjs): si cambia mientras la app estaba abierta en segundo plano, se recarga.
let versionCargada = null;
async function versionPublicada() { try { const r = await fetch('version.txt', { cache: 'no-store' }); return r.ok ? (await r.text()).trim() : null; } catch { return null; } }

const marcaHTML = '<span class="nombre-app"><span class="nutri">Nutri</span><span class="home">Home</span></span>';
function puerta(error = '') {
  document.body.innerHTML = `
    <div class="puerta">
      <img class="logo" src="iconos/nutrihome-192.png" alt="">
      <h1>${marcaHTML}</h1>
      <p>Escribe la clave de casa. Solo se pide una vez en cada móvil.</p>
      <form id="f-clave"><label class="sr" for="clave">Clave de casa</label>
        <input id="clave" type="text" inputmode="numeric" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="clave de casa" required>
        <div class="error">${esc(error)}</div>
        <button class="boton principal ancho">Entrar</button></form>
    </div>`;
  $('#f-clave').addEventListener('submit', e => { e.preventDefault(); guardaTexto(CLAVE, $('#clave').value.trim().toLowerCase()); location.reload(); });
}

function pintaMarco() {
  document.body.innerHTML = `
    <header class="cabecera" id="cab"></header>
    <main id="vista"></main>
    <nav class="pestanas" aria-label="Secciones"><div class="dentro">
      ${PESTANAS.map(([k, t]) => `<button data-p="${k}"><span class="ic">${SVG[k]}</span><span>${t}</span></button>`).join('')}
    </div></nav>
    <div class="tostada" id="tostada" role="status"></div>
    <div class="deshacer" id="deshacer" role="status"><span id="deshacer-t"></span><button id="deshacer-b">Deshacer</button></div>`;
  $$('.pestanas button').forEach(b => b.addEventListener('click', () => { location.hash = b.dataset.p; }));
}

let tEntra;
function pinta() {
  $$('.pestanas button').forEach(b => b.setAttribute('aria-current', b.dataset.p === V.pestana ? 'page' : 'false'));
  const f = VISTAS[V.pestana] || vSemana;
  document.body.classList.toggle('con-barra', V.pestana === 'compra');   // en Compra hay un botón fijo abajo
  const vista = $('#vista');
  vista.classList.add('entra');
  f();
  $$('#vista > *').forEach((el, i) => el.style.setProperty('--i', Math.min(i, 12)));
  clearTimeout(tEntra); tEntra = setTimeout(() => vista.classList.remove('entra'), 1100);
  window.scrollTo({ top: 0 });
}
function cabecera(titulo, sub = '') {
  const d = new Date(), perfil = V.pestana === 'nosotros';
  $('#cab').innerHTML = `<div class="marca">${perfil ? `<button class="volver" id="b-volver" aria-label="Volver">${SVG.volver}</button>` : '<span class="logo-mini">🥗</span>'}${marcaHTML}
      <span class="fecha-chip">${iconoSync()}${DS[d.getDay()]} ${d.getDate()} ${MES[d.getMonth()].slice(0, 3)}</span>
      <button class="perfil-btn${perfil ? ' activo' : ''}" id="b-perfil" aria-label="Vuestros datos"><span class="avatar mini g">${ini('G')}</span><span class="avatar mini p">${ini('P')}</span></button></div>
    <h1>${titulo}</h1>${sub ? `<div class="sub">${sub}</div>` : ''}`;
  $('#b-perfil').addEventListener('click', () => { location.hash = perfil ? V.anterior : 'nosotros'; });
  $('#b-volver')?.addEventListener('click', () => { location.hash = V.anterior; });
}

let tTostada, tDeshacer;
function tostada(txt) { const t = $('#tostada'); t.textContent = txt; t.classList.add('visible'); clearTimeout(tTostada); tTostada = setTimeout(() => t.classList.remove('visible'), 2600); }
function conDeshacer(txt, alDeshacer) {
  const b = $('#deshacer'); $('#deshacer-t').textContent = txt; b.classList.add('visible');
  $('#deshacer-b').onclick = () => { b.classList.remove('visible'); alDeshacer(); };
  clearTimeout(tDeshacer); tDeshacer = setTimeout(() => b.classList.remove('visible'), 6000);
}

// Letreros que se quitan deslizando el dedo (o con la ×). Se recuerda que se han quitado.
function deslizable(el, alQuitar) {
  let x0 = null, y0 = 0, dx = 0, horizontal = null;
  const quita = dir => { el.style.transition = 'transform .25s, opacity .25s, max-height .3s .2s, margin .3s .2s, padding .3s .2s'; el.style.transform = `translateX(${dir}120%)`; el.style.opacity = '0';
    setTimeout(() => { el.style.maxHeight = '0'; el.style.margin = '0'; el.style.padding = '0'; }, 200); setTimeout(() => { el.remove(); alQuitar(); }, 520); };
  el.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; dx = 0; horizontal = null; el.style.transition = 'none'; }, { passive: true });
  el.addEventListener('touchmove', e => {
    if (x0 == null) return;
    const mx = e.touches[0].clientX - x0, my = e.touches[0].clientY - y0;
    if (horizontal == null && (Math.abs(mx) > 8 || Math.abs(my) > 8)) horizontal = Math.abs(mx) > Math.abs(my);
    if (!horizontal) return;
    dx = mx; el.style.transform = `translateX(${dx}px)`; el.style.opacity = String(1 - Math.min(.8, Math.abs(dx) / 260));
  }, { passive: true });
  el.addEventListener('touchend', () => {
    if (x0 == null) return;
    if (horizontal && Math.abs(dx) > 80) quita(dx > 0 ? '' : '-');
    else { el.style.transition = 'transform .2s, opacity .2s'; el.style.transform = ''; el.style.opacity = ''; }
    x0 = null;
  });
  el.querySelector('.cerrar-aviso')?.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); quita(''); });
}
function activaLetreros(raiz = document) {
  $$('[data-aviso]', raiz).forEach(el => deslizable(el, () => { E.avisos[el.dataset.aviso] = 1; salva(); }));
}
const letrero = (clave, emo, html, cls = '') => E.avisos[clave] ? '' : `<div class="aviso ${cls}" data-aviso="${esc(clave)}"><span class="emo">${emo}</span><div>${html}</div><button class="cerrar-aviso" aria-label="Quitar">×</button></div>`;

// ——— Hoja inferior ———
function hoja(html, alAbrir) {
  cierraHoja(true);
  const fondo = document.createElement('div'); fondo.className = 'fondo-hoja';
  const h = document.createElement('div'); h.className = 'hoja'; h.setAttribute('role', 'dialog'); h.setAttribute('aria-modal', 'true');
  h.innerHTML = `<div class="asa"></div><button class="cerrar" aria-label="Cerrar">×</button>${html}`;
  document.body.append(fondo, h);
  requestAnimationFrame(() => { fondo.classList.add('abierto'); h.classList.add('abierta'); });
  fondo.addEventListener('click', () => cierraHoja()); h.querySelector('.cerrar').addEventListener('click', () => cierraHoja());
  if (alAbrir) alAbrir(h);
  return h;
}
function cierraHoja(rapido) {
  $$('.hoja, .fondo-hoja').forEach(el => { el.classList.remove('abierta', 'abierto'); setTimeout(() => el.remove(), rapido ? 0 : 300); });
  if (V.repintar && !rapido) { V.repintar = false; setTimeout(pinta, 350); }   // llegó algo de otro móvil mientras la hoja estaba abierta
}

// ——— Semana ———
function horaComida() { const h = new Date().getHours() + new Date().getMinutes() / 60; return h < 11 ? 'desayuno' : h < 16.5 ? 'comida' : h < 19.5 ? 'merienda' : 'cena'; }
function vSemana() {
  const p = planActivo(), pe = efectivo(p), s = est(p.id), h = hoy();
  const ultimo = p.dias.at(-1).f;
  if (!V.dia || !p.dias.some(d => d.f === V.dia)) V.dia = p.dias.find(d => d.f === h)?.f || (h < p.dias[0].f ? p.dias[0].f : p.dias.at(-1).f);
  const i = pe.dias.findIndex(d => d.f === V.dia), d = pe.dias[i];
  const fd = fecha(d.f);
  cabecera(d.f === h ? 'Hoy' : capital(DL[fd.getDay()]), `${fd.getDate()} de ${MES[fd.getMonth()]}`);
  const banners = [];
  if (h > ultimo) banners.push(`<div class="aviso"><span class="emo">🗓️</span><div><b>Semana terminada</b><div class="botones" style="margin-top:8px"><button class="boton principal" id="b-siguiente">${I.chispas}Preparar la siguiente</button></div></div></div>`);
  // Platos con cosas que no comprasteis (✕) o que no hay en casa: se ofrece cambiarlos por otros que sí podáis hacer.
  V.tengo = loQueTenemos(p, s);
  const sinCosas = platosSinCosas(pe, s);
  if (sinCosas.platos) banners.push(letrero('falta:' + p.id + ':' + [...sinCosas.claves].sort().join(','), '🛒',
    `<b>${sinCosas.platos} plato${sinCosas.platos > 1 ? 's' : ''} con cosas que no tenéis</b>: ${esc(enumera(sinCosas.nombres))}.<div class="botones" style="margin-top:8px"><button class="boton principal" id="b-ajustar">🔄 Ajustar el menú</button></div>`));
  if (E.pendientes?.length) banners.push(letrero('pend:' + E.pendientes.map(x => x.id).join(','), '🏪', `<a href="#compra" style="color:inherit;text-decoration:none"><b>Pendiente de otro súper:</b> ${esc(enumera(E.pendientes.map(x => nombreFalta(x.k) || x.n), 4))} →</a>`));
  if (!s.compraHecha && h <= p.dias[1].f) banners.push(letrero('compra:' + p.id, '🛒', '<a href="#compra" style="color:inherit;text-decoration:none"><b>Toca compra</b> · ver la lista →</a>'));
  // Jueves y viernes: recordar la próxima compra y preparar la semana que viene (su lista sale en Compra).
  const dow = fecha(h).getDay(), sig = planes().find(x => x.dias[0].f > h);
  if ((dow === 4 || dow === 5) && h <= ultimo) {
    if (!sig) banners.push(letrero('proxima:' + p.id, '🛒', `<b>Próxima compra:</b> viernes o sábado. ¿Preparo la semana que viene y su lista?<div class="botones" style="margin-top:8px"><button class="boton principal" id="b-preparar">${I.chispas}Preparar la semana</button></div>`));
    else if (!est(sig.id).compraHecha) banners.push(letrero('proxima2:' + sig.id, '🛒', '<a href="#compra" style="color:inherit;text-decoration:none"><b>Próxima compra:</b> la lista de la semana que viene ya está en Compra →</a>'));
  }
  const tot = q => L.totalesDia(d, q, recetas, D.productos, fac);
  const tG = tot('G'), tP = tot('P');
  const caja = (q, t) => {
    const o = obj[q], color = q === 'G' ? 'var(--persona-g)' : 'var(--persona-p)';
    return `<div class="anillo-caja">${anilloDoble(t.kcal / o.kcal, t.p / o.prot, color, r0(t.kcal), 'kcal')}
      <div class="quien ${q === 'G' ? 'persona-g' : 'persona-p'}">${esc(NOM[q])}</div><div class="meta">de ${o.kcal} · 💪 ${r0(t.p)}/${o.prot} g</div></div>`;
  };
  const puntos = x => L.COMIDAS.map(c => { const v = x[c]; return `<i class="${s.hechos[x.f + '|' + c] ? 'h' : v && v.fuera ? 'f' : ''}"></i>`; }).join('');
  const avisos = [...banners, ...consejosDia(pe, i)].filter(Boolean);   // un aviso a la vez: el que más corre
  $('#vista').innerHTML = `
    ${avisos.slice(0, 1).join('')}
    <div class="dias" role="tablist">${pe.dias.map(x => { const dd = fecha(x.f); return `<button class="dia-btn${x.f === h ? ' hoy' : ''}" data-f="${x.f}" aria-pressed="${x.f === V.dia}"><span class="ds">${x.f === h ? 'hoy' : DS[dd.getDay()]}</span><span class="dn">${dd.getDate()}</span><span class="puntos">${puntos(x)}</span></button>`; }).join('')}</div>
    <div class="tarjeta anillos"><div class="anillos-cab"><b>Lo que coméis ${d.f === h ? 'hoy' : 'este día'}</b><span class="leyenda"><i class="l1"></i>kcal <i class="l2"></i>proteína</span></div>${caja('G', tG)}${caja('P', tP)}</div>
    ${L.COMIDAS.map(c => tarjetaComida(p, d, i, c, s, d.f === h && c === horaComida())).join('')}`;
  $$('.dia-btn').forEach(b => b.addEventListener('click', () => { V.dia = b.dataset.f; vSemana(); }));
  $$('[data-acc]').forEach(b => b.addEventListener('click', () => abrirAcciones(p, i, b.dataset.acc, b.dataset.q || null)));
  $('#b-siguiente')?.addEventListener('click', siguienteSemana);
  $('#b-ajustar')?.addEventListener('click', () => { const c = adaptaMenu(p); vSemana(); hojaCambiosMenu(c); });
  $('#b-preparar')?.addEventListener('click', () => { siguienteSemana(); location.hash = 'compra'; });
  activaLetreros();
  $('.dia-btn[aria-pressed="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest' });
}

// ——— El menú se adapta a la compra ———
// Lo que tenéis: lo de «En casa», lo que siempre hay (especias, despensa) y, mientras la compra no esté terminada,
// lo que pide el menú (se va a comprar), salvo lo marcado con ✕. Si la compra está terminada pero «En casa» está casi vacío,
// no se da nada por perdido: solo cuenta lo marcado con ✕.
function loQueTenemos(p, s) {
  const enCasa = Object.keys(E.casa).filter(k => E.casa[k] > 0), tengo = new Set(enCasa);
  for (const [k, x] of Object.entries(D.productos)) if (x.en_casa || x.despensa) tengo.add(k);
  if (!s.compraHecha || enCasa.length < 5) {
    const h = hoy();
    for (const d of efectivo(p).dias) if (d.f >= h) for (const c of L.COMIDAS) for (const id of L.idsDe(d[c])) for (const ing of recetas[id]?.ing || []) tengo.add(ing[0]);
    for (const x of s.extra) if (x.k) tengo.add(x.k);
    for (const f of E.fijos) if (f.k) tengo.add(f.k);
  }
  for (const k of [...Object.keys(s.noComprado), ...Object.keys(s.noHabia || {})]) if ((s.noComprado[k] || s.noHabia?.[k]) && !(E.casa[k] > 0)) tengo.delete(k);
  return tengo;
}
const faltanDe = (r, tengo) => r && tengo ? [...new Set(r.ing.map(i => i[0]).filter(k => D.productos[k] && !tengo.has(k)))] : [];
// Lo que de verdad falta: lo marcado con ✕ (en la lista o al terminar la compra) y que tampoco hay en casa.
const noTenemos = s => new Set([...Object.keys(s.noComprado), ...Object.keys(s.noHabia || {})].filter(k => (s.noComprado[k] || s.noHabia?.[k]) && D.productos[k] && !(E.casa[k] > 0)));
const faltaExplicita = (r, s) => { if (!r) return []; const no = noTenemos(s); return [...new Set(r.ing.map(i => i[0]).filter(k => no.has(k)))]; };
// Nombre corto para los avisos: «Claras de huevo líquidas pasteurizadas» → «claras»; «Queso fresco batido desnatado 0% MG» → «queso fresco batido».
const nombreFalta = k => nombreCorto(D.productos[k]).toLowerCase().replace(/\d+\s?%\s?(mg)?/g, ' ')
  .replace(/\b(desnatad[oa]s?|l[ií]quidas?|pasteurizadas?|laminad[oa]s?|limpi[oa]s?|cocid[oa]s?|coraz[oó]n|romana|virgen extra|de canarias|de huevo|lonchas|para plancha|corte fino|deshuesad[oa]s?|y sin piel|sin piel|congelad[oa]s?|finos|redonda|dulce)\b/g, '')
  .replace(/\s+/g, ' ').trim().split(' ').slice(0, 3).join(' ');
// «a, b, c y 4 más»
const enumera = (arr, n = 5) => arr.length <= n ? arr.join(', ') : arr.slice(0, n).join(', ') + ` y ${arr.length - n} más`;
// Qué platos pendientes (desde hoy, sin comer) usan algo que no tenéis.
function platosSinCosas(pe, s) {
  const h = hoy(), claves = new Set(); let platos = 0;
  for (const d of pe.dias) {
    if (d.f < h) continue;
    for (const c of L.COMIDAS) {
      if (s.hechos[d.f + '|' + c]) continue;
      for (const id of L.idsDe(d[c])) { const f = faltaExplicita(recetas[id], s); if (f.length) { platos++; f.forEach(k => claves.add(k)); } }
    }
  }
  return { platos, claves, nombres: [...claves].map(nombreFalta) };
}
// Cambia cada plato pendiente que use algo que no tenéis por la mejor alternativa que sí se pueda hacer. Devuelve los cambios.
function adaptaMenu(p) {
  const s = est(p.id), h = hoy(), cambios = [], tengo = loQueTenemos(p, s);
  p.dias.forEach((d0, i) => {
    if (d0.f < h) return;
    for (const c of L.COMIDAS) {
      const k = d0.f + '|' + c;
      if (s.hechos[k]) continue;
      const v0 = efectivo(p).dias[i][c];
      if (!v0 || v0.fuera) continue;
      for (const q of (L.esDoble(v0) ? L.QUIEN : [null])) {
        const pe = efectivo(p), v = pe.dias[i][c], id = q ? v[q] : L.idDe(v), r = recetas[id];
        const falta = faltaExplicita(r, s);
        if (!r || !falta.length) continue;
        for (const kk of falta) apuntaPendiente({ k: kk, n: nombreCorto(D.productos[kk]) });   // para comprarlo en otro súper
        const nueva = L.alternativas(pe, i, c, recetas, D.productos, fac, obj.G, 99, Date.now() + i, q).find(x => !faltanDe(x, tengo).length && gustaA(x, q ? [q] : L.QUIEN)) || null;
        if (nueva) {
          if (q) { const base = L.esDoble(v) ? { ...v } : { G: L.idDe(v), P: L.idDe(v) }; base[q] = nueva.id; s.cambios[k] = base; }
          else s.cambios[k] = nueva.id;
        }
        cambios.push({ f: d0.f, c, q, de: r.n, a: nueva ? nueva.n : null, falta: falta.map(nombreFalta) });
      }
    }
  });
  s.ajustado = [...noTenemos(s)].sort().join(',');   // con estas marcas ya se ha ajustado: no se repite al abrir la app
  salva();
  return cambios;
}
// Al abrir la app: si hay platos con cosas marcadas ✕ (o que no había al terminar la compra) y no se ha ajustado todavía con esas marcas,
// se ajusta solo. Si la compra se terminó con la versión anterior (sin «noHabia»), lo que no había se recupera del resumen.
function ajusteAutomatico() {
  const p = planActivo(), s = est(p.id), u = E.compras[0];
  // El ticket se subió otro día y la compra sigue sin cerrar: se cierra sola (lo comprado a «En casa», lo que no había a pendientes).
  if (s.ticket && !s.compraHecha && hoy() > (s.ticket.fecha || hoy())) { const { filas } = lineaCompra(); const res = terminarCompra(filas, true); if (res?.menu?.length) return res.menu; }
  if (!s.noHabia && s.compraHecha && u) {
    s.noHabia = {};
    const f = iso(new Date(u.f));
    if (f >= p.dias[0].f && f <= p.dias.at(-1).f && u.no?.length) {
      const porNombre = Object.fromEntries(Object.entries(D.productos).map(([k, x]) => [L.normaliza(nombreCorto(x)), k]));
      for (const n of u.no) { const k = porNombre[L.normaliza(n)]; if (k && !(E.casa[k] > 0)) { s.noHabia[k] = true; apuntaPendiente({ k, n }); } }
    }
    salva();
  }
  const firma = [...noTenemos(s)].sort().join(',');
  if (!firma || s.ajustado === firma) return [];
  return adaptaMenu(p);
}
function htmlCambiosMenu(cambios) {
  return cambios.map(x => `<div class="cambio-menu"><div class="nota">${COMIDA_EMO[x.c]} ${DS[fecha(x.f).getDay()]} ${fecha(x.f).getDate()} · ${L.NOMBRE_COMIDA[x.c]}${x.q ? ' · ' + esc(NOM[x.q]) : ''} · sin ${esc(enumera(x.falta, 3))}</div>
    <div><s>${esc(x.de)}</s><br>${x.a ? `<b>${esc(x.a)}</b>` : '<b class="persona-g">Sin alternativa con lo que tenéis</b>'}</div></div>`).join('');
}
function hojaCambiosMenu(cambios) {
  const n = cambios.filter(x => x.a).length;
  hoja(`<h2>🔄 Menú ajustado</h2><p class="nota">${cambios.length ? `${n} plato${n === 1 ? '' : 's'} cambiado${n === 1 ? '' : 's'} por otros que podéis hacer con lo que tenéis.${n < cambios.length ? ' Para alguno no he encontrado alternativa: cámbialo a mano o pregúntame.' : ''}` : 'Todos los platos se pueden hacer con lo que tenéis.'}</p>
    ${htmlCambiosMenu(cambios)}`);
}

function tarjetaComida(p, d, i, c, s, ahora) {
  const v = d[c], clave = d.f + '|' + c, hecho = !!s.hechos[clave];
  const mom = `<span class="momento">${COMIDA_EMO[c]} ${L.NOMBRE_COMIDA[c]}${ahora && !hecho ? '<span class="ahora-pill">AHORA</span>' : ''}${hecho ? '<span class="hecho-pill">✓ comido</span>' : ''}</span>`;
  const cls = `tarjeta comida c-${c}${hecho ? ' hecha' : ''}${ahora && !hecho ? ' ahora' : ''}`;
  if (v && v.fuera) return `<button class="${cls} fuera" data-acc="${c}"><span class="tile">🍽️</span><span class="cuerpo">${mom}<span class="nombre">Coméis fuera</span></span><span class="flecha">›</span></button>`;
  const pillFalta = r => { const f = hecho ? [] : faltaExplicita(r, s); return f.length ? `<span class="pill malo">⚠️ sin ${esc(enumera(f.map(nombreFalta), 2))}</span>` : ''; };
  if (L.esDoble(v)) {
    const fila = q => { const r = recetas[v[q]]; const m = r ? L.macrosReceta(r, q, D.productos, fac) : null;
      return `<button class="fila-doble" data-acc="${c}" data-q="${q}"><span class="avatar mini ${q.toLowerCase()}">${ini(q)}</span><span class="mini-tile">${r ? emojiReceta(r) : '➕'}</span>
        <span class="nombre-s">${r ? esc(r.n) : 'Sin plato'}${r && pillFalta(r) ? '<br>' + pillFalta(r) : ''}</span>${m ? `<span class="pill ${q.toLowerCase()}">${r0(m.kcal)}</span>` : ''}<span class="flecha">›</span></button>`; };
    return `<div class="${cls} doble">${mom}${fila('G')}${fila('P')}</div>`;
  }
  const r = recetas[L.idDe(v)];
  if (!r) return `<button class="${cls} fuera" data-acc="${c}"><span class="tile">🏠</span><span class="cuerpo">${mom}<span class="nombre">${esc(v && v.libre ? v.libre : 'Sin plato')}</span></span><span class="flecha">›</span></button>`;
  const mg = L.macrosReceta(r, 'G', D.productos, fac), mp = L.macrosReceta(r, 'P', D.productos, fac);
  return `<button class="${cls}" data-acc="${c}"><span class="tile">${emojiReceta(r)}</span>
    <span class="cuerpo">${mom}<span class="nombre">${esc(r.n)}</span>
      <span class="datos"><span class="pill">${APARATO_EMO[r.ap] || '🍴'} ${r.min}′</span><span class="pill g">${ini('G')} ${r0(mg.kcal)}</span><span class="pill p">${ini('P')} ${r0(mp.kcal)}</span>${r.propia ? '<span class="pill">⭐</span>' : ''}${pillFalta(r)}</span></span>
    <span class="flecha">›</span></button>`;
}

// Al tocar una comida: qué se puede hacer con ella, con botones grandes y claros.
function abrirAcciones(p, i, c, q) {
  const pe = efectivo(p), d = pe.dias[i], v = d[c], s = est(p.id), clave = d.f + '|' + c, hecho = !!s.hechos[clave];
  const dia = `${capital(DL[fecha(d.f).getDay()])} ${fecha(d.f).getDate()}`;
  const rid = q ? L.recetaDe(v, q) : L.idDe(v), r = recetas[rid];
  const quien = q ? `<span class="avatar mini ${q.toLowerCase()}">${ini(q)}</span> ${esc(NOM[q])} · ` : '';
  const btn = (id, emo, txt, cls = '') => `<button class="accion ${cls}" id="${id}"><span class="emo">${emo}</span>${txt}</button>`;
  let botones = '';
  if (v && v.fuera) botones = btn('a-cambiar', '🔄', 'Poner un plato') + btn('a-fuera', '↩️', 'No comemos fuera');
  else if (!r) botones = btn('a-cambiar', '🔄', 'Poner un plato') + btn('a-fuera', '🍽️', 'Comemos fuera');
  else {
    const falta = hecho ? [] : faltaExplicita(r, s);
    botones = btn('a-ver', '📖', 'Receta', falta.length ? '' : 'primaria') + btn('a-hecho', hecho ? '↩️' : '✅', hecho ? 'Desmarcar' : 'Ya comido') + btn('a-cambiar', '🔄', 'Cambiar', falta.length ? 'primaria' : '') + btn('a-fuera', '🍽️', 'Comemos fuera');
    if (falta.length) botones = `<div class="aviso" style="grid-column:1/-1;margin:0 0 4px"><span class="emo">⚠️</span><div><b>No tenéis ${esc(falta.map(nombreFalta).join(' ni '))}.</b> Cambia el plato por otro que podáis hacer.</div></div>` + botones;
  }
  hoja(`<div class="acciones-cab c-${c}"><span class="emo">${r ? emojiReceta(r) : v && v.fuera ? '🍽️' : '🏠'}</span><div><div class="nota">${quien}${COMIDA_EMO[c]} ${L.NOMBRE_COMIDA[c]} · ${dia}</div>
      <h2>${r ? esc(r.n) : v && v.fuera ? 'Coméis fuera' : 'Sin plato'}</h2></div></div>
    <div class="acciones-grid">${botones}</div>`, h => {
    $('#a-ver', h)?.addEventListener('click', () => abrirReceta(r.id, { plan: p.id, f: d.f, c, q }));
    $('#a-hecho', h)?.addEventListener('click', () => { cierraHoja(); alternaHecho(p, d.f, c); });
    $('#a-cambiar', h)?.addEventListener('click', () => abrirCambiar(p, i, c, q));
    $('#a-fuera', h)?.addEventListener('click', () => { cierraHoja(); alternaFuera(p, d.f, c); });
  });
}

// Consejos de congelador: lo fresco que se usa a partir del cuarto día, al congelador al llegar; y la noche antes, sacarlo.
const PROTE_FRESCA = ['Carne', 'Marisco y pescado'];
function usosPorProducto(pe) {
  const usos = {};
  pe.dias.forEach((d, i) => L.COMIDAS.forEach(c => {
    for (const id of L.idsDe(d[c])) { const r = recetas[id]; if (r) for (const ing of r.ing) (usos[ing[0]] ||= []).push({ i, f: d.f, c, r }); }
  }));
  return usos;
}
const PESCADO_CONGELADO = /salm|merluza/i;   // viene congelado y hay que descongelarlo en la nevera (las gambas, no)
function consejosDia(pe, i) {
  const usos = usosPorProducto(pe), partes = [];
  const fresca = k => PROTE_FRESCA.includes(D.productos[k]?.cat);
  const nombre = k => nombreCorto(D.productos[k]).toLowerCase().replace(/^filetes? (de )?/, '').replace(/\b(deshuesad[oa]s?|y sin piel|sin piel|corte fino|para plancha|limpi[oa]s?|congelad[oa]s?|lomos de)\b/g, '').replace(/\s+/g, ' ').trim();
  if (i === 0) {
    const cong = Object.entries(usos).filter(([k, u]) => fresca(k) && u.some(v => v.i >= 3)).map(([k]) => nombre(k));
    if (cong.length) partes.push(letrero('cong:' + pe.dias[0].f, '❄️', `<b>Al congelador:</b> ${esc(cong.join(', '))}`, 'hielo'));
  }
  if (pe.dias[i + 1]) {
    const sacar = Object.entries(usos).filter(([k, u]) => u.some(v => v.i === i + 1) &&
      ((D.productos[k].cat === 'Congelados' && PESCADO_CONGELADO.test(D.productos[k].n)) || (fresca(k) && i + 1 >= 3))).map(([k]) => nombre(k));
    if (sacar.length) partes.push(letrero('noche:' + pe.dias[i].f, '🌙', `<b>Esta noche, a la nevera:</b> ${esc(sacar.join(' y '))}`, 'hielo'));
  }
  return partes;
}

// Guarda cómo estaba un hueco del menú para poder deshacer el cambio.
function recuerdaHueco(p, k) {
  const s = est(p.id), habia = k in s.cambios, antes = s.cambios[k];
  return () => { if (habia) s.cambios[k] = antes; else delete s.cambios[k]; salva(); vSemana(); };
}
function alternaFuera(p, f, c) {
  const s = est(p.id), k = f + '|' + c, actual = efectivo(p).dias.find(d => d.f === f)[c], deshaz = recuerdaHueco(p, k);
  if (actual && actual.fuera) { const orig = p.dias.find(d => d.f === f)[c]; if (orig && orig.fuera) s.cambios[k] = null; else delete s.cambios[k]; }
  else s.cambios[k] = { fuera: true };
  salva(); vSemana();
  conDeshacer(actual && actual.fuera ? '↩️ Ya no coméis fuera' : '🍽️ Coméis fuera', deshaz);
}
function alternaHecho(p, f, c) {
  const s = est(p.id), k = f + '|' + c, ck = p.id + '|' + k;
  if (s.hechos[k]) { delete s.hechos[k]; tostada('Desmarcado'); }
  else {
    s.hechos[k] = 1;
    if (!E.consumidos[ck]) { E.consumidos[ck] = 1; descuentaHueco(efectivo(p).dias.find(d => d.f === f)[c]); }
    tostada('✅ ¡Comido! Descontado de «En casa»');
  }
  salva(); vSemana();
}
function siguienteSemana() {
  const ult = planActivo(), inicio = masDias(ult.dias.at(-1).f, 1);
  if (planes().some(x => x.id === inicio)) { V.dia = inicio; vSemana(); return; }   // ya estaba preparada
  const dias = Array.from({ length: 7 }, (_, n) => {
    const f = masDias(inicio, n), dow = fecha(f).getDay(), d = { f };
    for (const c of L.COMIDAS) d[c] = null;
    if (dow === 0) d.comida = { fuera: true };
    if (dow === 5) d.cena = { fuera: true };
    return d;
  });
  const base = { id: inicio, titulo: `Semana del ${fecha(inicio).getDate()} de ${MES[fecha(inicio).getMonth()]}`, dias };
  const recetasOk = Object.fromEntries(Object.entries(recetas).filter(([, r]) => gustaA(r, L.QUIEN)));   // sin lo que no le gusta a alguno
  const plan = L.proponerSemana(base, recetasOk, D.productos, fac, obj.G);
  E.planes = [...E.planes.filter(x => x.id !== plan.id), plan];
  V.dia = inicio; salva(); vSemana(); tostada('🗓️ Semana preparada');
}

function filaReceta(r, q = null, extra = '') {
  const g = L.macrosReceta(r, 'G', D.productos, fac), p = L.macrosReceta(r, 'P', D.productos, fac);
  const kc = q ? `<span class="pill ${q.toLowerCase()}">${ini(q)} ${r0((q === 'G' ? g : p).kcal)}</span>` : `<span class="pill g">${ini('G')} ${r0(g.kcal)}</span><span class="pill p">${ini('P')} ${r0(p.kcal)}</span>`;
  return `<button class="alternativa" data-id="${r.id}"><span class="emo">${emojiReceta(r)}</span><span style="min-width:0"><span class="nombre" style="display:block">${esc(r.n)}</span>
    <span class="datos"><span class="pill">${APARATO_EMO[r.ap] || '🍴'} ${r.min}′</span>${kc}${r.propia ? '<span class="pill">⭐</span>' : ''}${extra}</span></span></button>`;
}
function abrirCambiar(p, i, c, q) {
  const pe = efectivo(p), d = pe.dias[i], v = d[c];
  const doble = L.DOBLES.includes(c) && !(v && v.fuera);
  const persona = q || (doble ? 'G' : null);
  // Primero lo que se puede hacer con lo que tenéis; lo demás, avisando de lo que falta.
  const tengo = V.tengo || loQueTenemos(p, est(p.id));
  const alts = L.alternativas(pe, i, c, recetas, D.productos, fac, obj.G, 14, Date.now(), persona).filter(r => gustaA(r, persona ? [persona] : L.QUIEN)).slice(0, 10)
    .map(r => ({ r, falta: faltanDe(r, tengo) })).sort((a, b) => a.falta.length - b.falta.length);
  hoja(`<h2>${COMIDA_EMO[c]} Cambiar ${L.NOMBRE_COMIDA[c].toLowerCase()}</h2><div class="nota">${persona ? `Para ${esc(NOM[persona])} · ` : ''}${capital(DL[fecha(d.f).getDay()])} ${fecha(d.f).getDate()}</div>
    ${alts.map(({ r, falta }) => filaReceta(r, persona, falta.length ? `<span class="pill malo">falta ${esc(falta.map(nombreFalta).join(', '))}</span>` : '')).join('')}`, h => {
    $$('[data-id]', h).forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.id, s = est(p.id), k = d.f + '|' + c, deshaz = recuerdaHueco(p, k);
      if (persona) { const base = L.esDoble(v) ? { ...v } : { G: L.idDe(v), P: L.idDe(v) }; base[persona] = id; s.cambios[k] = base; }
      else s.cambios[k] = id;
      salva(); cierraHoja(); vSemana(); conDeshacer('🔄 Plato cambiado', deshaz);
    }));
  });
}

// ——— Receta ———
function abrirReceta(id, ctx) {
  const r = recetas[id];
  if (!r) return;
  const solo = ctx?.q || null;   // en los desayunos y meriendas de cada uno, solo su ración
  const quienes = solo ? [solo] : L.QUIEN;
  const mac = Object.fromEntries(quienes.map(q => [q, L.macrosReceta(r, q, D.productos, fac)]));
  const filas = r.ing.map(ing => {
    const x = D.productos[ing[0]];
    return `<div class="ing-fila${solo ? ' una' : ''}"><span>${esc(nombreCorto(x))}</span>${quienes.map(q => { const g = L.gramos(ing, q, fac); return `<span class="c persona-${q.toLowerCase()}">${g ? esc(L.cantidadTexto(ing[0], g, D.productos)) : '—'}</span>`; }).join('')}</div>`;
  }).join('') + [...(r.otros || []), ...(r.basicos || [])].map(t => `<div class="ing-fila${solo ? ' una' : ''}"><span class="otro">${esc(t)}</span>${quienes.map(() => '<span class="c">·</span>').join('')}</div>`).join('');
  const m = (q, x) => {
    const o = obj[q], color = q === 'G' ? 'var(--persona-g)' : 'var(--persona-p)';
    const bm = (e, v, max) => `<div class="bm"><span>${e}</span>${miniBarra(v / max * 100, color)}<span>${r0(v)} g</span></div>`;
    return `<div class="m ${q.toLowerCase()}"><b class="persona-${q.toLowerCase()}">${esc(NOM[q])}</b><span class="k">${r0(x.kcal)} <small style="font-size:13px">kcal</small></span>
      <div class="barras">${bm('💪', x.p, o.prot * 0.4)}${bm('🍞', x.hc, o.hc * 0.4)}${bm('🥑', x.g, o.grasa * 0.4)}</div></div>`;
  };
  const plan = planActivo();
  const tipoPrincipal = r.tipo?.[0] || 'comida';
  hoja(`<div class="portada-hoja c-${tipoPrincipal}"><span class="emo">${emojiReceta(r)}</span><div><h2>${esc(r.n)}</h2>
      <div class="botones" style="margin-top:8px"><span class="pill verde">${APARATO_EMO[r.ap] || '🍴'} ${APARATO[r.ap] || 'Cocina'}</span><span class="pill">⏱ ${r.min}′</span>${r.propia ? '<span class="pill">⭐ vuestra</span>' : ''}</div></div></div>
    <div class="macros${solo ? ' una' : ''}">${quienes.map(q => m(q, mac[q])).join('')}</div>
    <h3>🥕 Ingredientes</h3>
    <div class="ing-lista"><div class="ing-fila cab${solo ? ' una' : ''}"><span>Ingrediente</span>${quienes.map(q => `<span class="c persona-${q.toLowerCase()}">${esc(NOM[q])}</span>`).join('')}</div>${filas}</div>
    <h3>👩‍🍳 Cómo se hace</h3><ol class="pasos">${r.pasos.map(x => `<li><span>${esc(x)}</span></li>`).join('') || '<li><span>Sin pasos apuntados.</span></li>'}</ol>
    ${r.nota ? `<div class="aviso"><span class="emo">💡</span><div>${esc(r.nota)}</div></div>` : ''}
    <div class="botones" style="margin-top:14px"><button class="boton" id="b-fav-receta">${r.fav ? '❤️ Favorita' : '🤍 Favorita'}</button><button class="boton suave" id="b-a-lista">${I.carro}A la lista</button>
      ${r.propia ? `<button class="boton" id="b-editar">${I.lapiz}Editar</button><button class="boton" id="b-claude-receta">${I.enviar}Al Chef</button><button class="boton peligro" id="b-borrar-receta" aria-label="Borrar">${I.papelera}</button>` : ''}</div>
    ${ctx ? '' : `<h3>${I.calendario} Ponerla en el menú</h3><div class="botones">
      <select id="s-dia" class="boton">${plan.dias.map(d => `<option value="${d.f}">${DS[fecha(d.f).getDay()]} ${fecha(d.f).getDate()}</option>`).join('')}</select>
      <select id="s-com" class="boton">${(r.tipo || L.COMIDAS).map(c => `<option value="${c}">${COMIDA_EMO[c]} ${L.NOMBRE_COMIDA[c]}</option>`).join('')}</select>
      <select id="s-quien" class="boton"><option value="">👫 Los dos</option><option value="G">${esc(NOM.G)}</option><option value="P">${esc(NOM.P)}</option></select>
      <button class="boton principal" id="b-poner">Poner</button></div>`}`, h => {
    $('#b-poner', h)?.addEventListener('click', () => {
      const f = $('#s-dia', h).value, c = $('#s-com', h).value, q = $('#s-quien', h).value, s = est(plan.id), k = f + '|' + c;
      if (q) { const v = efectivo(plan).dias.find(d => d.f === f)[c]; const base = L.esDoble(v) ? { ...v } : { G: L.idDe(v), P: L.idDe(v) }; base[q] = r.id; s.cambios[k] = base; }
      else s.cambios[k] = r.id;
      salva(); cierraHoja(); tostada('📅 Puesta en el menú'); if (V.pestana === 'semana') vSemana();
    });
    $('#b-a-lista', h).addEventListener('click', () => elegirRaciones(r));
    $('#b-fav-receta', h).addEventListener('click', e => {
      E.favRecetas = r.fav ? E.favRecetas.filter(x => x !== r.id) : [...E.favRecetas, r.id];
      reconstruyeRecetas(); salva(); e.currentTarget.textContent = r.fav ? '❤️ Favorita' : '🤍 Favorita'; e.currentTarget.classList.add('pop');
      tostada(r.fav ? '❤️ En vuestras favoritas' : 'Quitada de favoritas'); if (V.pestana === 'recetas') vRecetas();
    });
    $('#b-editar', h)?.addEventListener('click', () => editorReceta(r));
    $('#b-claude-receta', h)?.addEventListener('click', () => irAClaude(textoReceta(r)));
    $('#b-borrar-receta', h)?.addEventListener('click', () => {
      if (!confirm(`¿Borro la receta «${r.n}» de este móvil?`)) return;
      E.propias = E.propias.filter(x => x.id !== r.id); reconstruyeRecetas(); salva(); cierraHoja(); tostada('Receta borrada'); pinta();
    });
  });
}
const nombreCorto = x => x.n.replace(/ Hacendado| ultracongelad[oa]s?| lavad[oa]s?| IGP/g, '').replace(/\s+/g, ' ');
const textoReceta = r => `Receta para NutriHome: ${r.n}\n\nIngredientes (una ración):\n${r.txt?.ing || r.ing.map(i => `${i[1]} g de ${nombreCorto(D.productos[i[0]])}`).join('\n')}\n\nCómo se hace:\n${r.txt?.pasos || r.pasos.join('\n')}`;

// Receta a la lista de la compra: sus ingredientes se suman a lo que pide el menú.
function elegirRaciones(r) {
  hoja(`<h2>🛒 ${esc(r.n)}</h2><div class="nota">¿Para quién?</div>
    <div class="acciones-grid" style="margin-top:12px">
      <button class="accion primaria" data-quien="GP"><span class="emo">👫</span>Los dos</button>
      <button class="accion" data-quien="G"><span class="avatar mini g">${ini('G')}</span>${esc(NOM.G)}</button>
      <button class="accion" data-quien="P"><span class="avatar mini p">${ini('P')}</span>${esc(NOM.P)}</button></div>`, h => {
    $$('[data-quien]', h).forEach(b => b.addEventListener('click', () => {
      est(planCompra().id).recetasLista.push({ id: uid(), r: r.id, quien: b.dataset.quien });
      salva(); cierraHoja(); tostada(`🛒 ${r.n}: a la lista`);
      if (V.pestana === 'compra') vCompra(); else location.hash = 'compra';
    }));
  });
}
function elegirRecetaParaLista() {
  const pintaLista = (h, t) => {
    const n = L.normaliza(t);
    $('#lista-recetas', h).innerHTML = todasRecetas().filter(r => !n || L.normaliza(r.n).includes(n)).slice(0, 40).map(r => filaReceta(r)).join('') || '<div class="vacio">No encuentro esa receta.</div>';
    $$('#lista-recetas [data-id]', h).forEach(b => b.addEventListener('click', () => elegirRaciones(recetas[b.dataset.id])));
  };
  hoja(`<h2>🍲 Receta a la lista</h2>
    <button class="nueva-receta" id="b-crear"><span class="emo">✍️</span><span><b>Crear una nueva</b></span></button>
    <div class="buscador">${I.buscar}<input id="i-busca-r" type="search" placeholder="Buscar receta…" autocomplete="off"></div>
    <div id="lista-recetas"></div>`, h => {
    pintaLista(h, '');
    $('#i-busca-r', h).addEventListener('input', e => pintaLista(h, e.target.value));
    $('#b-crear', h).addEventListener('click', () => editorReceta(null, true));
  });
}

// ——— Vuestras recetas, escritas ———
function editorReceta(r, aLaLista = false, inicial = {}) {
  const nueva = !r;
  const v = { n: r?.n || inicial.n || '', ing: r?.txt?.ing || inicial.ing || '', pasos: r?.txt?.pasos || inicial.pasos || '',
    tipo: r?.tipo || ['comida', 'cena'], ap: r?.ap || 'airfryer', min: r?.min || 20 };
  hoja(`<h2>${nueva ? '✍️ Nueva receta' : '✏️ Editar receta'}</h2>
    <div class="nota">Cantidades para una ración (${esc(NOM.G)}); la de ${esc(NOM.P)} sale sola.</div>
    <h3>📛 Nombre</h3><input class="campo-texto" id="r-nombre" placeholder="Pollo con ñoquis" value="${esc(v.n)}">
    <h3>🥕 Ingredientes</h3><textarea class="campo-texto" id="r-ing" placeholder="150 g de pechuga de pollo&#10;125 g de ñoquis&#10;100 g de tomate cherry&#10;1 cucharadita de aceite">${esc(v.ing)}</textarea>
    <div class="reconocidos" id="r-reco"></div>
    <h3>👩‍🍳 Cómo se hace</h3><textarea class="campo-texto" id="r-pasos" placeholder="Pollo en dados con sal. Air fryer 180 °C, 12 minutos…">${esc(v.pasos)}</textarea>
    <h3>🕐 ¿Cuándo?</h3><div class="botones" id="r-tipo">${L.COMIDAS.map(c => `<button type="button" class="chip" data-tipo="${c}" aria-pressed="${v.tipo.includes(c)}">${COMIDA_EMO[c]} ${L.NOMBRE_COMIDA[c]}</button>`).join('')}</div>
    <h3>🍳 ¿Con qué?</h3><div class="botones" id="r-ap">${['airfryer', 'plancha', 'micro', 'sin'].map(a => `<button type="button" class="chip" data-ap="${a}" aria-pressed="${v.ap === a}">${APARATO_EMO[a]} ${APARATO[a]}</button>`).join('')}
      <label class="chip">⏱ <input id="r-min" type="number" inputmode="numeric" value="${v.min}" style="width:42px;border:0;background:none;font-weight:800;padding:0"> min</label></div>
    <button class="boton principal ancho" id="r-guardar" style="margin-top:18px">💾 Guardar receta</button>`, h => {
    const reco = () => {
      const x = L.interpretaReceta($('#r-ing', h).value, '', D.productos);
      $('#r-reco', h).innerHTML = x.detalle.map(d => d.k
        ? `<span class="pill bueno">✓ ${esc(nombreCorto(D.productos[d.k]))} · ${r0(d.g)} g${d.aprox ? ' ≈' : ''}</span>`
        : d.basico ? `<span class="pill">🏠 ${esc(d.texto)}</span>` : `<span class="pill regular">＋ ${esc(d.texto)}</span>`).join('');
    };
    reco();
    $('#r-ing', h).addEventListener('input', reco);
    $$('[data-tipo]', h).forEach(b => b.addEventListener('click', () => b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true')));
    $$('[data-ap]', h).forEach(b => b.addEventListener('click', () => { $$('[data-ap]', h).forEach(x => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); }));
    $('#r-guardar', h).addEventListener('click', () => {
      const n = $('#r-nombre', h).value.trim(), ingT = $('#r-ing', h).value.trim(), pasosT = $('#r-pasos', h).value.trim();
      if (!n) { $('#r-nombre', h).focus(); tostada('Ponle un nombre'); return; }
      if (!ingT) { $('#r-ing', h).focus(); tostada('Faltan los ingredientes'); return; }
      const x = L.interpretaReceta(ingT, pasosT, D.productos);
      const tipo = $$('[data-tipo][aria-pressed="true"]', h).map(b => b.dataset.tipo);
      const nuevaR = { id: r?.id || 'p-' + uid(), n, e: L.emojiDe(n + ' ' + ingT), tipo: tipo.length ? tipo : ['comida', 'cena'],
        ap: $('[data-ap][aria-pressed="true"]', h)?.dataset.ap || 'plancha', min: Math.max(1, parseInt($('#r-min', h).value, 10) || 20), prot: 'propia',
        ing: x.ing, otros: x.otros, basicos: x.basicos, pasos: x.pasos, txt: { ing: ingT, pasos: pasosT }, propia: true, creada: r?.creada || new Date().toISOString() };
      E.propias = [...E.propias.filter(y => y.id !== nuevaR.id), nuevaR];
      reconstruyeRecetas(); salva();
      tostada(nueva ? '🎉 Receta guardada' : 'Receta actualizada');
      if (V.pestana === 'recetas') vRecetas();
      if (aLaLista) elegirRaciones(nuevaR); else abrirReceta(nuevaR.id);
    });
  });
}

// ——— Buscador de Mercadona (el mismo que usa su web) ———
const ALGOLIA = 'https://7uzjkl1dj0-dsn.algolia.net/1/indexes/products_prod_mad1_es/query?x-algolia-application-id=7UZJKL1DJ0&x-algolia-api-key=9d8f2e39e90df472b4f2e559a116fe17';
const cacheMerca = new Map();
const tamano = pi => !pi ? '' : pi.size_format === 'kg' && pi.unit_size ? `${r0(pi.unit_size * 1000)} g` : pi.size_format === 'l' && pi.unit_size ? `${r0(pi.unit_size * 1000)} ml`
  : pi.total_units ? `${pi.total_units} ${pi.unit_name || 'uds'}` : '';
let idaKcache = null;
const idaK = () => idaKcache ||= Object.fromEntries(Object.entries(D.productos).filter(([, x]) => x.id).map(([kk, x]) => [String(x.id), kk]));
const deAlgolia = h => ({ id: String(h.id), n: h.display_name, foto: (h.thumbnail || '').replace('h=300&w=300', 'h=160&w=160'),
  precio: parseFloat(h.price_instructions?.unit_price) || 0, ref: parseFloat(h.price_instructions?.reference_price) || 0,
  env: [h.packaging, tamano(h.price_instructions)].filter(Boolean).join(' '), cat: h.categories?.[0]?.name || 'Otros', k: idaK()[String(h.id)] || null });
async function buscaMercadona(q, n = 6) {
  const k = L.normaliza(q) + '|' + n;
  if (cacheMerca.has(k)) return cacheMerca.get(k);
  const r = await fetch(ALGOLIA, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ params: 'query=' + encodeURIComponent(q) + '&hitsPerPage=' + n }) });
  if (!r.ok) throw new Error('Mercadona no responde');
  const j = await r.json();
  const res = (j.hits || []).filter(h => h.published !== false).map(deAlgolia);
  cacheMerca.set(k, res);
  return res;
}
// «quiero papel higiénico» → «papel higiénico»
const limpiaPeticion = t => t.trim().replace(/^[¿¡\s]+/, '').replace(/^(quiero|queremos|necesito|necesitamos|añade|añadir|apunta|pon|compra|comprar|me hace falta|hace falta|falta|faltan)\s+/i, '')
  .replace(/^(un|una|unos|unas|el|la|los|las)\s+/i, '').replace(/[.?!]+$/, '').trim();

// ——— Compra ———
const BASICOS = /^(sal|agua|hielo|pimienta|pimienta negra|sal y pimienta|cilantro|perejil|albahaca|oregano|pimenton|canela|comino)$/;
const ordenSeccion = n => { const i = SECCIONES.indexOf(n); if (i >= 0) return i; const j = (E.secciones || []).findIndex(s => s.n === n); return j >= 0 ? 60 + j : 99; };
// La lista de la compra es para la semana que toca comprar: la que viene, si ya está preparada y faltan dos días o menos
// (o la de ahora ya está comprada); si no, la de ahora.
function planCompra() {
  const h = hoy(), act = planActivo(), sig = planes().find(x => x.dias[0].f > h);
  return sig && (masDias(h, 2) >= sig.dias[0].f || est(act.id).compraHecha) ? sig : act;
}
function lineaCompra() {
  const p = planCompra(), s = est(p.id), h = hoy();
  const desde = h > p.dias[0].f ? h : null, pe = efectivo(p);
  const nec = L.necesidades(pe, recetas, fac, desde);
  for (const f of E.fijos) if (f.k && D.productos[f.k]) nec[f.k] = (nec[f.k] || 0) + (f.n || 1) * D.productos[f.k].util;
  const otros = new Map();
  const sumaOtros = (r, para) => { for (const t of r.otros || []) {
    const b = L.normaliza(t).replace(/\b(al gusto|una pizca de|un poco de|pizca de|un chorrito de)\b/g, '').trim(), kk = 'o:' + b;
    if (b && !BASICOS.test(b) && !s.otrosHechos[kk] && !otros.has(kk)) otros.set(kk, { texto: t, para });
  } };
  for (const x of s.recetasLista) {
    const r = recetas[x.r]; if (!r) continue;
    for (const ing of r.ing) for (const q of x.quien.split('')) { const g = L.gramos(ing, q, fac); if (g) nec[ing[0]] = (nec[ing[0]] || 0) + g; }
    sumaOtros(r, r.n);
  }
  for (const d of pe.dias) { if (desde && d.f < desde) continue; for (const c of L.COMIDAS) for (const id of L.idsDe(d[c])) { const r = recetas[id]; if (r?.otros) sumaOtros(r, r.n); } }
  const { filas, despensa, total } = L.listaCompra(nec, D.productos, E.casa || {});
  const vistas = filas.filter(f => !s.quitados[f.k]).map(f => ({ ...f, clave: f.k, fijo: E.fijos.some(x => x.k === f.k) }))
    .map(f => s.menos[f.k] ? { ...f, envases: f.envases - Math.min(f.envases, s.menos[f.k]), precio: (f.envases - Math.min(f.envases, s.menos[f.k])) * D.productos[f.k].precio } : f).filter(f => f.envases > 0);
  for (const k of Object.keys(s.faltaDespensa)) if (s.faltaDespensa[k] && D.productos[k]) vistas.push({ k, clave: k, envases: 1, precio: D.productos[k].precio, despensa: true });
  for (const x of s.extra) {
    const enLista = x.k && vistas.find(v => v.k === x.k);
    if (enLista) { enLista.envases += x.n || 1; enLista.precio += (x.n || 1) * D.productos[x.k].precio; (enLista.extras ||= []).push(x.id); enLista.manual = true; continue; }
    if (x.k) vistas.push({ k: x.k, clave: 'x:' + x.id, envases: x.n || 1, precio: (x.n || 1) * D.productos[x.k].precio, extra: x.id, manual: true });
    else if (x.m) vistas.push({ k: null, m: x.m, clave: 'x:' + x.id, envases: x.n || 1, precio: (x.n || 1) * (x.m.precio || 0), extra: x.id, manual: true, nivel: x.v });
    else vistas.push({ k: null, clave: 'x:' + x.id, texto: x.texto, n: x.n, extra: x.id, manual: true, nivel: x.v, img: x.img, sec: x.sec });
  }
  for (const f of E.fijos) if (f.texto && !s.fijosHechos['f:' + f.texto]) vistas.push({ k: null, clave: 'f:' + f.texto, texto: f.texto, fijo: true });
  for (const f of E.fijos) if (f.m && !s.fijosHechos['f:m:' + f.m.id]) vistas.push({ k: null, m: f.m, clave: 'f:m:' + f.m.id, envases: f.n || 1, precio: (f.n || 1) * (f.m.precio || 0), fijo: true });
  for (const [kk, o] of otros) vistas.push({ k: null, clave: kk, texto: o.texto, otro: true, para: o.para });
  for (const v of vistas) v.seccion = v.k ? D.productos[v.k].cat : v.m ? v.m.cat : v.sec || 'Otros';
  vistas.sort((a, b) => (ordenSeccion(a.seccion) - ordenSeccion(b.seccion)) || nombreFila(a).localeCompare(nombreFila(b), 'es'));
  const quitar = Object.keys(s.quitados).filter(k => s.quitados[k]);
  return { p, s, filas: vistas, despensa: despensa.filter(f => !s.faltaDespensa[f.k]), total: vistas.reduce((t, f) => t + (f.precio || 0), 0), totalMenu: total, quitados: quitar };
}
const nombreFila = f => f.k ? nombreCorto(D.productos[f.k]) : f.m ? f.m.n : f.texto;
const nivelDe = f => f.k ? L.veredicto(L.nutrientesDe(D.productos[f.k])).nivel : f.nivel || null;
const pillNivel = n => n ? `<span class="pill ${n}">${L.NIVEL[n].e}</span>` : '';

// Tarjeta de arriba: subir el ticket digital; con el ticket ya leído, terminar; y, recién terminada, ver la última compra.
const fechaCorta = f => { const d = fecha(f); return `${DS[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`; };
function tarjetaTicket(s, marcas) {
  const u = E.compras[0];
  if (s.ticket) return `<div class="tarjeta pregunta ticket-ok"><span class="emo">🧾</span><div class="t"><b>Ticket${s.ticket.fecha ? ' del ' + fechaCorta(s.ticket.fecha) : ''} · ${euros(s.ticket.total)}</b>
    <span class="nota">${s.ticket.fuera.length ? `＋ ${s.ticket.fuera.length} fuera de la lista · ` : ''}ya puedes terminar</span></div><button class="boton" id="b-ver-ticket">Ver</button></div>`;
  if (!marcas && u && Date.now() - new Date(u.f) < 4 * 864e5) return `<div class="tarjeta pregunta"><span class="emo">🗂️</span><div class="t"><b>Compra del ${fechaCorta(iso(new Date(u.f)))}</b>
    <span class="nota">${u.no.length ? `✕ ${u.no.length} no había` : '✓ No faltó nada'}${u.ticket ? ' · 🧾 ' + euros(u.ticket.total) : ''}</span></div><button class="boton" id="b-ultima">Ver</button></div>`;
  return `<div class="tarjeta pregunta"><span class="emo">🧾</span><div class="t"><b>Ticket digital</b><span class="nota">El PDF del correo o una foto: marco la lista</span></div><button class="boton principal" id="b-ticket">Subir</button></div>`;
}

function vCompra() {
  const { p, s, filas, despensa, total, quitados } = lineaCompra();
  const comprados = filas.filter(f => s.marcados[f.clave]), noHabia = filas.filter(f => s.noComprado[f.clave]), porComprar = filas.filter(f => !s.marcados[f.clave] && !s.noComprado[f.clave]);
  const conTicket = !!s.ticket;
  cabecera('Compra', `Mercadona · ${filas.length} productos`);
  const filaHTML = f => {
    const x = f.k ? D.productos[f.k] : null, estado = s.marcados[f.clave] ? 'si' : s.noComprado[f.clave] ? 'no' : '';
    const foto = x && x.foto ? x.foto : f.m ? f.m.foto : f.img;
    const etiquetas = [f.fijo ? '<span class="pill">⭐</span>' : '', f.despensa ? '<span class="pill">🫙</span>' : '', f.otro ? `<span class="pill">📝 ${esc(f.para)}</span>` : '', f.manual ? pillNivel(nivelDe(f)) : '',
      estado === 'no' ? '<span class="pill malo">no había</span>' : estado === 'si' ? '<span class="pill bueno">comprado</span>' : ''].join('');
    const cant = x ? L.cantidadCompra(f, D.productos) : f.m ? `${f.envases > 1 ? f.envases + ' × ' : ''}${f.m.env}` : f.n && f.n !== 1 ? String(f.n) : '';
    return `<div class="fila-desliza" data-fila="${esc(f.clave)}"><button class="producto ${estado}" data-info="${esc(f.clave)}">
      ${foto ? `<img src="${esc(foto)}" alt="" loading="lazy" width="50" height="50"${f.img ? ' style="object-fit:contain"' : ''}>` : `<div class="sinfoto">${f.otro ? '📝' : emojiSeccion(f.seccion)}</div>`}
      <span class="info"><span class="pn">${esc(nombreFila(f))}</span><span class="pc">${esc(cant)}${etiquetas}</span></span>
      <span class="pp">${f.precio ? euros(f.precio) : ''}</span><span class="flecha">›</span></button></div>`;
  };
  const porSecciones = lista => {
    let sec = '', html = ''; const cuenta = {};
    for (const f of lista) cuenta[f.seccion] = (cuenta[f.seccion] || 0) + 1;
    for (const f of lista) { if (f.seccion !== sec) { if (sec) html += '</div>'; sec = f.seccion; html += `<div class="cat"><span class="emo">${emojiSeccion(sec)}</span>${esc(sec)}<span class="num">${cuenta[sec]}</span></div><div class="lista">`; } html += filaHTML(f); }
    return html + (sec ? '</div>' : '');
  };
  const noFilas = noHabia.filter(f => s.alternativas[f.clave]?.estado !== 'nada' && s.alternativas[f.clave]?.estado !== 'aceptada');
  const recetasLista = s.recetasLista.map(x => recetas[x.r] ? `<button class="chip" data-quitar-receta="${x.id}">${emojiReceta(recetas[x.r])} ${esc(recetas[x.r].n)} ✕</button>` : '').join('');
  const seccionesLista = [...new Set(filas.map(f => f.seccion))];
  $('#vista').innerHTML = `
    <div class="hero"><div><div class="grande">${euros(total)}</div><div class="sub">${esc(p.titulo || 'Esta semana')} · ${filas.length} productos</div></div><span class="hero-emo">🛒</span></div>
    <div class="rapidas">
      <button class="rapida" id="b-anadir"><span class="emo">➕</span>Añadir</button>
      <button class="rapida" id="b-receta-lista"><span class="emo">🍲</span>Receta</button>
      <button class="rapida" id="b-favoritos"><span class="emo">⭐</span>Favoritos</button>
      <button class="rapida" id="b-mas"><span class="emo">⋯</span>Más</button>
    </div>
    ${tarjetaTicket(s, comprados.length + noHabia.length > 0)}
    ${tarjetaPendientes()}
    ${D.semana.id === p.id && D.semana.avisoCompra ? letrero('avisoCompra:' + p.id + ':' + D.semana.avisoCompra.length, '💡', `<b>Chef:</b> ${esc(D.semana.avisoCompra)}`) : ''}
    ${recetasLista ? `<div class="cat"><span class="emo">🍲</span>Recetas añadidas</div><div class="chips-despensa">${recetasLista}</div>` : ''}
    ${noHabia.length ? `<div class="cat"><span class="emo">✕</span>No había<span class="num">${noHabia.length}</span></div><div class="lista">${noHabia.map(filaHTML).join('')}</div>
      <div class="botones" style="margin:8px 0 2px"><button class="chip" id="b-enviar-no">📤 Enviar lo que no había</button></div>` : ''}
    ${noFilas.length ? `<div class="cat"><span class="emo">🔁</span>No lo había: ¿otra cosa?</div><div id="alternativas">${noFilas.map(f => `<div class="tarjeta alt-prop" data-alt="${esc(f.clave)}"><div class="nota">✕ ${esc(nombreFila(f))}</div><div class="alt-cuerpo"><div class="cargando"></div></div></div>`).join('')}</div>` : ''}
    ${porComprar.length ? porSecciones(porComprar) : !comprados.length && !noHabia.length ? '<div class="vacio"><span class="emo">🎉</span>No falta nada para el menú.</div>' : ''}
    ${comprados.length ? `<details class="tarjeta comprados"><summary>✓ Comprado · ${comprados.length}</summary><div class="lista" style="margin-top:8px">${comprados.map(filaHTML).join('')}</div></details>` : ''}
    ${despensa.length ? `<div class="cat"><span class="emo">🫙</span>¿Os queda?</div><div class="chips-despensa">${despensa.map(f => `<button class="chip" data-falta="${f.k}">${esc(nombreCorto(D.productos[f.k]))}</button>`).join('')}</div>` : ''}
    ${quitados.length ? `<div class="cat"><span class="emo">↩️</span>Quitados</div><div class="chips-despensa">${quitados.map(k => `<button class="chip" data-volver="${k}">${esc(nombreCorto(D.productos[k] || { n: k }))} ↺</button>`).join('')}</div>` : ''}
    <div class="barra-accion"><div class="dentro"><button class="boton principal ancho" id="b-terminar"${filas.length ? '' : ' disabled'}>${I.caja}Terminar la compra</button></div></div>`;
  activaLetreros();
  $$('[data-info]').forEach(b => b.addEventListener('click', () => infoProducto(b.dataset.info, filas.find(f => f.clave === b.dataset.info))));
  $$('[data-fila]').forEach(fila => deslizaParaQuitar(fila, () => quitaDeLista(filas.find(f => f.clave === fila.dataset.fila))));
  $$('[data-falta]').forEach(b => b.addEventListener('click', () => { s.faltaDespensa[b.dataset.falta] = true; salva(); vCompra(); tostada('Añadido a la lista'); }));
  $$('[data-volver]').forEach(b => b.addEventListener('click', () => { delete s.quitados[b.dataset.volver]; salva(); vCompra(); }));
  $$('[data-quitar-receta]').forEach(b => b.addEventListener('click', () => { s.recetasLista = s.recetasLista.filter(x => x.id !== b.dataset.quitarReceta); salva(); vCompra(); }));
  $('#b-ticket')?.addEventListener('click', elegirTicket);
  $('#b-ver-ticket')?.addEventListener('click', () => hojaTicketLeido(s, filas));
  $('#b-ultima')?.addEventListener('click', () => hojaCompra(E.compras[0]));
  $('#b-pendientes')?.addEventListener('click', abrirPendientes);
  $('#b-enviar-no')?.addEventListener('click', () => compartirNoHabia(noHabia.map(nombreFila)));
  $('#b-anadir').addEventListener('click', () => abrirAnadir(seccionesLista));
  $('#b-receta-lista').addEventListener('click', elegirRecetaParaLista);
  $('#b-favoritos').addEventListener('click', abrirFavoritos);
  $('#b-mas').addEventListener('click', abrirMas);
  $('#b-terminar').addEventListener('click', () => conTicket ? terminarCompra(filas) : hojaTerminar(filas));
  for (const f of noFilas) pintaAlternativa(f, s);
}
// Terminar sin ticket leído: subirlo ahora o dar por comprado todo lo de la lista.
function hojaTerminar(filas) {
  hoja(`<h2>📦 Terminar la compra</h2><div class="nota">Con el ticket digital marco yo lo comprado y lo que no había. Sin ticket, doy por comprado todo lo que queda en la lista.</div>
    <div class="acciones-grid" style="margin-top:12px"><button class="accion primaria" id="t-ticket"><span class="emo">🧾</span>Subir el ticket</button><button class="accion" id="t-sin"><span class="emo">✓</span>Sin ticket: todo comprado</button></div>`, h => {
    $('#t-ticket', h).addEventListener('click', () => { cierraHoja(); elegirTicket(); });
    $('#t-sin', h).addEventListener('click', () => { const { s } = lineaCompra(); for (const f of filas) if (!s.noComprado[f.clave]) s.marcados[f.clave] = true; salva(); cierraHoja(); terminarCompra(filas); });
  });
}
// El ticket ya leído: qué se compró, qué no había y qué vino fuera de la lista.
function hojaTicketLeido(s, filas) {
  const t = s.ticket, no = filas.filter(f => s.noComprado[f.clave]).map(nombreFila), si = filas.filter(f => s.marcados[f.clave]).map(nombreFila);
  const chips = l => `<div class="chips-despensa">${l.map(x => `<span class="chip">${esc(x)}</span>`).join('')}</div>`;
  hoja(`<h2>🧾 Ticket${t.fecha ? ' del ' + fechaCorta(t.fecha) : ''}</h2>
    <div class="tabla-n" style="grid-template-columns:repeat(3,1fr)"><div><b>✓ ${si.length}</b><span>comprados</span></div><div><b>✕ ${no.length}</b><span>no había</span></div><div><b>＋ ${t.fuera.length}</b><span>fuera de lista</span></div></div>
    <p class="nota"><b>${euros(t.total)}</b>${t.cuadra === false ? ' · ⚠️ no me cuadra el total' : ''}</p>
    ${no.length ? `<h3>✕ No había</h3>${chips(no)}` : ''}
    ${t.fuera.length ? `<h3>＋ Fuera de la lista</h3>${chips(t.fuera.map(nombreFuera))}` : ''}
    <div class="botones" style="margin-top:14px">${no.length ? '<button class="boton" id="b-enviar-no-t">📤 Enviar lo que no había</button>' : ''}<button class="boton" id="b-otro-ticket">📄 Subir otro ticket</button></div>`, h => {
    $('#b-enviar-no-t', h)?.addEventListener('click', () => compartirNoHabia(no));
    $('#b-otro-ticket', h).addEventListener('click', () => { cierraHoja(); elegirTicket(); });
  });
}

// Lo que se usa menos, en un menú «⋯»: enviar la lista, el escáner y la última compra.
function abrirMas() {
  const fila = (id, emo, txt, sub = '') => `<button class="menu-fila" id="${id}"><span class="emo">${emo}</span><span><b>${txt}</b>${sub ? `<span class="nota" style="display:block">${sub}</span>` : ''}</span><span class="flecha">›</span></button>`;
  hoja(`<h2>Más</h2><div class="menu-lista">
    ${fila('m-enviar', '📤', 'Enviar la lista', 'Lo que falta por comprar, para WhatsApp')}
    ${fila('m-escanear', '🔎', '¿Es buena compra?', 'Foto del código de barras')}
    ${E.compras.length ? fila('m-ultima', '🗂️', 'Última compra', 'Lo que no había y lo de fuera de la lista') : ''}</div>`, h => {
    $('#m-enviar', h).addEventListener('click', () => { cierraHoja(); compartirLista(lineaCompra().filas); });
    $('#m-escanear', h).addEventListener('click', abrirEscaner);
    $('#m-ultima', h)?.addEventListener('click', () => hojaCompra(E.compras[0]));
  });
}

// Añadir a la lista: una hoja con el buscador de Mercadona. Se pueden añadir varios seguidos; «Listo» la cierra.
function abrirAnadir(seccionesLista = [...new Set(lineaCompra().filas.map(f => f.seccion))], texto = '') {
  V.anadidos.clear();
  hoja(`<h2>➕ Añadir a la lista</h2><div class="nota">Una cosa o varias: «papel higiénico, yuca y 2 kéfir».</div>
    <form class="anadir" id="f-anadir"><div class="caja"><input id="i-anadir" placeholder="Busca en Mercadona…" autocomplete="off" enterkeyhint="search" value="${esc(texto)}">
      <button class="icono mas" aria-label="Buscar">${I.buscar}</button></div></form>
    <div id="resultados"></div>`, h => {
    let tBusca;
    $('#i-anadir', h).addEventListener('input', e => { clearTimeout(tBusca); tBusca = setTimeout(() => buscaParaAnadir(e.target.value, seccionesLista), 380); });
    $('#f-anadir', h).addEventListener('submit', e => { e.preventDefault(); clearTimeout(tBusca); buscaParaAnadir($('#i-anadir', h).value, seccionesLista, true); });
    setTimeout(() => $('#i-anadir', h)?.focus(), 350);
    if (texto) buscaParaAnadir(texto, seccionesLista);
  });
}
const refrescaCompra = () => { if (V.pestana === 'compra') { const y = window.scrollY; vCompra(); window.scrollTo(0, y); } };

async function buscaParaAnadir(texto, seccionesLista, enviado = false) {
  const caja = $('#resultados'); if (!caja) return;
  const t = limpiaPeticion(texto || '');
  if (t.length < 2) { caja.innerHTML = ''; return; }
  const o = L.interpretar(texto, D.productos);
  if (enviado && ['quitar', 'casa', 'comprado'].includes(o.accion)) { cierraHoja(); ejecuta(texto); return; }
  const varios = L.separa(t).filter(x => x.length > 1);
  if (varios.length > 1) {
    caja.innerHTML = `<div class="nota" style="margin:8px 2px">${varios.length} cosas: ${varios.map(esc).join(' · ')}</div><button class="boton principal ancho" id="b-anadir-varios">➕ Añadir las ${varios.length}</button>`;
    $('#b-anadir-varios').addEventListener('click', async () => {
      const items = [];
      for (const v of varios) {
        const b = L.buscaProducto(v, D.productos);
        if (b && b.k) { items.push({ ...b, original: v }); continue; }
        try { const h = (await buscaMercadona(limpiaPeticion(v), 1))[0]; items.push(h ? (h.k ? { k: h.k, n: b?.n } : { m: h }) : { texto: capital(v) }); } catch { items.push({ texto: capital(v) }); }
      }
      anadeALista(items); cierraHoja(); refrescaCompra();
    });
    return;
  }
  caja.innerHTML = '<div class="cargando"></div><div class="cargando" style="width:70%"></div>';
  let hits = [];
  try { hits = await buscaMercadona(t, 6); } catch { caja.innerHTML = '<div class="nota" style="margin:8px 2px">📡 Sin conexión con Mercadona.</div>'; }
  if ($('#i-anadir') && limpiaPeticion($('#i-anadir').value) !== t) return;   // ya ha escrito otra cosa
  const local = L.buscaProducto(t, D.productos);
  if (local?.k && !hits.some(h => h.k === local.k)) { const x = D.productos[local.k]; hits.unshift({ id: String(x.id), n: x.n, foto: x.foto, precio: x.precio, env: x.env, cat: x.cat, k: local.k }); }
  const secs = [...new Set([...seccionesLista.filter(n => n !== 'Otros'), ...(E.secciones || []).map(s => s.n)])];
  caja.innerHTML = `${hits.slice(0, 6).map((h, i) => `<button class="res${V.anadidos.has(h.id) ? ' anadido' : ''}" data-res="${i}">${h.foto ? `<img src="${esc(h.foto)}" alt="" loading="lazy">` : `<span class="sinfoto">${emojiSeccion(h.cat)}</span>`}
      <span class="res-t"><b>${esc(h.n)}</b><span class="nota">${esc(h.env)} · ${emojiSeccion(h.cat)} ${esc(h.cat)}</span></span>
      ${h.k ? pillNivel(L.veredicto(L.nutrientesDe(D.productos[h.k])).nivel) : ''}<span class="res-p">${h.precio ? euros(h.precio) : ''}</span><span class="icono mas">${(V.anadidos.has(h.id) ? SVG.check : SVG.mas).replace('<svg', '<svg class="i"')}</span></button>`).join('')}
    ${V.anadidos.size ? '<button class="boton ancho" id="b-listo-anadir" style="margin-top:8px">✓ Listo</button>' : ''}
    <div class="nota" style="margin:10px 2px 6px">¿No es ninguno? Añadir «${esc(capital(t))}» en:</div>
    <div class="chips-despensa">${secs.map(n => `<button class="chip" data-sec="${esc(n)}">${emojiSeccion(n)} ${esc(n)}</button>`).join('')}<button class="chip" data-sec-nueva="1">＋ Nueva sección</button></div>`;
  $$('[data-res]', caja).forEach(b => b.addEventListener('click', () => {
    const h = hits[+b.dataset.res]; anadeALista([h.k ? { k: h.k } : { m: h }]);
    V.anadidos.add(h.id); refrescaCompra(); buscaParaAnadir(texto, seccionesLista);   // la hoja sigue abierta para añadir más
  }));
  $('#b-listo-anadir', caja)?.addEventListener('click', () => { V.anadidos.clear(); cierraHoja(); refrescaCompra(); });
  $$('[data-sec]', caja).forEach(b => b.addEventListener('click', () => { anadeALista([{ texto: capital(t), sec: b.dataset.sec }]); cierraHoja(); refrescaCompra(); }));
  $('[data-sec-nueva]', caja)?.addEventListener('click', () => {
    const n = (prompt('Nombre de la sección nueva (por ejemplo: Farmacia):') || '').trim();
    if (!n) return;
    const e = (prompt('Un emoji para ella (opcional):', '🏷️') || '🏷️').trim().slice(0, 4);
    if (!E.secciones.some(s => s.n === n)) E.secciones.push({ n, e });
    anadeALista([{ texto: capital(t), sec: n }]); cierraHoja(); refrescaCompra();
  });
}

// Deslizar un producto a la izquierda lo quita de la lista (con «Deshacer»).
function deslizaParaQuitar(fila, alQuitar) {
  const el = fila.querySelector('.producto');
  let x0 = null, y0 = 0, dx = 0, horizontal = null;
  el.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; dx = 0; horizontal = null; el.style.transition = 'none'; }, { passive: true });
  el.addEventListener('touchmove', e => {
    if (x0 == null) return;
    const mx = e.touches[0].clientX - x0, my = e.touches[0].clientY - y0;
    if (horizontal == null && (Math.abs(mx) > 8 || Math.abs(my) > 8)) horizontal = Math.abs(mx) > Math.abs(my);
    if (!horizontal) return;
    dx = Math.min(0, mx); el.style.transform = `translateX(${dx}px)`; fila.classList.toggle('listo', dx < -90);
  }, { passive: true });
  el.addEventListener('touchend', () => {
    if (x0 == null) return;
    if (horizontal) el.dataset.deslizado = Date.now();
    if (horizontal && dx < -90) {
      el.style.transition = 'transform .18s'; el.style.transform = 'translateX(-110%)';
      setTimeout(() => { fila.style.maxHeight = fila.offsetHeight + 'px'; fila.style.transition = 'max-height .22s, opacity .22s';
        requestAnimationFrame(() => { fila.style.maxHeight = '0'; fila.style.opacity = '0'; }); setTimeout(alQuitar, 240); }, 160);
    } else { el.style.transition = 'transform .2s'; el.style.transform = ''; fila.classList.remove('listo'); }
    x0 = null;
  });
  // tras deslizar, que no cuente como toque en ✓, ✕ o la ficha
  el.addEventListener('click', e => { if (Date.now() - (+el.dataset.deslizado || 0) < 450) { e.stopPropagation(); e.preventDefault(); } }, true);
}
function quitaDeLista(f) {
  if (!f) return;
  const p = planActivo(), s = est(p.id), antes = JSON.stringify(s);
  if (f.k && !f.extra) { s.quitados[f.k] = true; s.extra = s.extra.filter(x => x.k !== f.k); delete s.menos[f.k]; }
  if (f.extra) s.extra = s.extra.filter(x => x.id !== f.extra && !(f.extras || []).includes(x.id));
  if (f.otro) s.otrosHechos[f.clave] = true;
  if (f.fijo && !f.k) s.fijosHechos[f.clave] = true;
  if (f.despensa) delete s.faltaDespensa[f.k];
  delete s.marcados[f.clave]; delete s.noComprado[f.clave];
  salva(); const y = window.scrollY; vCompra(); window.scrollTo(0, y);
  conDeshacer(`🗑️ ${nombreFila(f)}`, () => { E.semanas[p.id] = JSON.parse(antes); salva(); const y2 = window.scrollY; vCompra(); window.scrollTo(0, y2); });
}

// ——— Favoritos («lo de siempre»): entran solos en la lista cada semana ———
const idFav = f => f.k || f.texto || (f.m ? 'm:' + f.m.id : '');
function abrirFavoritos() {
  const pinta = h => {
    $('#favs', h).innerHTML = E.fijos.map((f, i) => {
      const x = f.k ? D.productos[f.k] : null;
      const nombre = x ? nombreCorto(x) : f.m ? f.m.n : f.texto, foto = x?.foto || f.m?.foto;
      const env = x ? x.env : f.m ? f.m.env : '', precio = x ? x.precio : f.m ? f.m.precio : 0;
      return `<div class="fav">${foto ? `<img src="${esc(foto)}" alt="" loading="lazy">` : '<span class="sinfoto">⭐</span>'}
        <div class="fav-t"><b>${esc(nombre)}</b><span class="nota">${esc(env)}${precio ? ' · ' + euros(precio) : ''}</span></div>
        ${f.k || f.m ? `<div class="mini-cant"><button data-fav-menos="${i}" aria-label="Uno menos">−</button><b>${f.n || 1}</b><button data-fav-mas="${i}" aria-label="Uno más">＋</button></div>` : ''}
        <button class="icono" data-fav-quitar="${i}" aria-label="Quitar de favoritos">${I.papelera}</button></div>`;
    }).join('') || '<div class="vacio"><span class="emo">⭐</span>Todavía no hay favoritos.</div>';
    const cambia = () => { salva(); pinta(h); if (V.pestana === 'compra') { const y = window.scrollY; vCompra(); window.scrollTo(0, y); } };
    $$('[data-fav-mas]', h).forEach(b => b.addEventListener('click', () => { const f = E.fijos[+b.dataset.favMas]; f.n = (f.n || 1) + 1; cambia(); }));
    $$('[data-fav-menos]', h).forEach(b => b.addEventListener('click', () => { const f = E.fijos[+b.dataset.favMenos]; f.n = Math.max(1, (f.n || 1) - 1); cambia(); }));
    $$('[data-fav-quitar]', h).forEach(b => b.addEventListener('click', () => {
      const [f] = E.fijos.splice(+b.dataset.favQuitar, 1); E.fijosQuitados = [...new Set([...E.fijosQuitados, idFav(f)])]; cambia(); tostada('Quitado de favoritos');
    }));
  };
  hoja(`<h2>⭐ Favoritos</h2><div class="nota">Lo que compráis siempre: entra solo en la lista cada semana.</div>
    <div id="favs" style="margin-top:10px"></div>
    <h3>➕ Añadir un favorito</h3>
    <form class="anadir" id="f-fav"><div class="caja"><input id="i-fav" placeholder="Busca: anacardos, papel higiénico…" autocomplete="off" enterkeyhint="search"><button class="icono mas" aria-label="Buscar">${I.buscar}</button></div></form>
    <div id="res-fav"></div>`, h => {
    pinta(h);
    let tB;
    const busca = async () => {
      const t = limpiaPeticion($('#i-fav', h).value), caja = $('#res-fav', h);
      if (t.length < 2) { caja.innerHTML = ''; return; }
      caja.innerHTML = '<div class="cargando"></div>';
      let hits = [];
      try { hits = await buscaMercadona(t, 6); } catch { caja.innerHTML = '<div class="nota">📡 Sin conexión con Mercadona.</div>'; return; }
      const local = L.buscaProducto(t, D.productos);
      if (local?.k && !hits.some(x => x.k === local.k)) { const x = D.productos[local.k]; hits.unshift({ id: String(x.id), n: x.n, foto: x.foto, precio: x.precio, env: x.env, cat: x.cat, k: local.k }); }
      caja.innerHTML = hits.map((x, i) => `<button class="res" data-fav-res="${i}">${x.foto ? `<img src="${esc(x.foto)}" alt="" loading="lazy">` : `<span class="sinfoto">${emojiSeccion(x.cat)}</span>`}
        <span class="res-t"><b>${esc(x.n)}</b><span class="nota">${esc(x.env)}</span></span><span class="res-p">${x.precio ? euros(x.precio) : ''}</span><span class="icono mas">⭐</span></button>`).join('') || '<div class="nota">No encuentro nada.</div>';
      $$('[data-fav-res]', caja).forEach(b => b.addEventListener('click', () => {
        const x = hits[+b.dataset.favRes], nuevo = x.k ? { k: x.k, n: 1 } : { m: x, n: 1 };
        if (E.fijos.some(f => idFav(f) === idFav(nuevo))) { tostada('Ya está en favoritos'); return; }
        E.fijos.push(nuevo); E.fijosQuitados = E.fijosQuitados.filter(z => z !== idFav(nuevo));
        $('#i-fav', h).value = ''; caja.innerHTML = ''; salva(); pinta(h); tostada('⭐ ' + (x.k ? nombreCorto(D.productos[x.k]) : x.n));
        if (V.pestana === 'compra') { const y = window.scrollY; vCompra(); window.scrollTo(0, y); }
      }));
    };
    $('#i-fav', h).addEventListener('input', () => { clearTimeout(tB); tB = setTimeout(busca, 380); });
    $('#f-fav', h).addEventListener('submit', e => { e.preventDefault(); clearTimeout(tB); busca(); });
  });
}

// Lo que se marca con ✕: se propone otra cosa de Mercadona; se acepta, se pide otra o nada.
async function pintaAlternativa(f, s) {
  const el = $(`[data-alt="${CSS.escape(f.clave)}"] .alt-cuerpo`); if (!el) return;
  const base = (f.k ? nombreCorto(D.productos[f.k]) : f.m ? f.m.n : f.texto).replace(/ Hacendado|Hacendado /g, '');
  const evitar = f.k ? String(D.productos[f.k].id) : f.m ? f.m.id : null;
  let hits = [];
  try {
    const pal = base.split(' ');
    for (const n of [4, 2, 1]) { hits = (await buscaMercadona(pal.slice(0, n).join(' '), 10)).filter(h => h.id !== evitar); if (hits.length) break; }
  } catch { el.innerHTML = '<div class="nota">📡 Sin conexión.</div>'; return; }
  const st = s.alternativas[f.clave] ||= { i: 0 };
  const h = hits[st.i % Math.max(1, hits.length)];
  if (!h) { el.innerHTML = '<div class="nota">No encuentro nada parecido.</div><div class="botones"><button class="chip" data-alt-nada>✕ Vale</button></div>'; }
  else el.innerHTML = `<div class="res sin-borde">${h.foto ? `<img src="${esc(h.foto)}" alt="">` : ''}<span class="res-t"><b>${esc(h.n)}</b><span class="nota">${esc(h.env)}</span></span><span class="res-p">${h.precio ? euros(h.precio) : ''}</span></div>
    <div class="botones"><button class="chip si" data-alt-si>✓ Esta</button><button class="chip" data-alt-otra>↻ Otra</button><button class="chip" data-alt-nada>✕ Nada</button></div>`;
  el.querySelector('[data-alt-si]')?.addEventListener('click', () => { st.estado = 'aceptada'; anadeALista([h.k ? { k: h.k } : { m: h }]); vCompra(); });
  el.querySelector('[data-alt-otra]')?.addEventListener('click', () => { st.i++; salva(); pintaAlternativa(f, s); });
  el.querySelector('[data-alt-nada]')?.addEventListener('click', () => { st.estado = 'nada'; salva(); vCompra(); });
}

function infoProducto(clave, f) {
  const { p, s } = lineaCompra();
  const k = f && f.k, x = k && D.productos[k];
  const usos = k ? (usosPorProducto(efectivo(p))[k] || []) : [];
  const v = x ? L.veredicto(L.nutrientesDe(x)) : null;
  const foto = x?.foto || f.m?.foto || f.img;
  hoja(`<div class="producto-escaneado">${foto ? `<img src="${esc(foto)}" alt="">` : `<div class="sinfoto" style="width:64px;height:64px;border-radius:14px;display:grid;place-items:center;font-size:30px;background:var(--tarjeta-2)">${f.otro ? '📝' : emojiSeccion(f.seccion)}</div>`}<div><h2>${esc(nombreFila(f))}</h2>
      ${x ? `<div class="nota">${esc(x.env)} · ${euros(x.precio)}</div>` : f.m ? `<div class="nota">${esc(f.m.env)} · ${euros(f.m.precio)} · ${emojiSeccion(f.m.cat)} ${esc(f.m.cat)}</div>` : f.otro ? `<div class="nota">Para «${esc(f.para)}»</div>` : ''}</div></div>
    ${v ? semaforoHTML(v) : f.nivel ? `<div class="botones" style="margin-top:10px">${pillNivel(f.nivel)} ${L.NIVEL[f.nivel].t}</div>` : ''}
    ${x ? `${usos.length ? `<h3>${I.calendario} Para</h3><div class="botones">${usos.map(u => `<span class="pill">${COMIDA_EMO[u.c]} ${DS[fecha(u.f).getDay()]} ${fecha(u.f).getDate()} · ${esc(u.r.n)}</span>`).join('')}</div>` : ''}
      <div class="tabla-n"><div><b>${x.m[0]}</b><span>kcal</span></div><div><b>${x.m[1]} g</b><span>proteína</span></div><div><b>${x.m[2]} g</b><span>hidratos</span></div><div><b>${x.m[3]} g</b><span>grasa</span></div></div>` : ''}
    ${!x && !f.nivel && !f.otro && !NO_COMIDA.has(f.seccion) ? `<button class="boton suave" id="b-escanear-info" style="margin-top:10px">🔎 ¿Es bueno? Escanéalo</button>` : ''}
    ${f.k || f.extra ? `<div class="cantidad"><button id="b-menos" aria-label="Uno menos">−</button><label class="t"><input id="i-cant" type="number" inputmode="numeric" min="0" value="${f.k || f.m ? f.envases : f.n || 1}" aria-label="Cantidad">
      <span>${esc(f.k ? (L.porPieza(x) ? L.plural(x.ud, 2) : x.env) : f.m ? f.m.env : 'unidades')}${f.precio ? ' · ' + euros(f.precio) : ''}</span></label><button class="mas" id="b-mas" aria-label="Uno más">＋</button></div>` : ''}
    <div class="botones" style="margin-top:14px">
      ${k && !f.extra ? `<button class="boton" id="b-quitar">${I.papelera}Quitar de la lista</button>` : ''}
      ${f.extra ? `<button class="boton" id="b-borrar-extra">${I.papelera}Quitar</button>` : ''}
      ${f.otro ? `<button class="boton" id="b-borrar-otro">${I.papelera}Quitar</button>` : ''}
      <button class="boton" id="b-nohabia">${s.noComprado[clave] ? '↩️ Sí lo había' : '✕ No lo había'}</button>
      ${k ? `<button class="boton" id="b-fijo">${E.fijos.some(y => y.k === k) ? '⭐ Quitar de favoritos' : '⭐ A favoritos'}</button>` : ''}
      ${f.m && !f.fijo ? `<button class="boton" id="b-fijo-m">⭐ A favoritos</button>` : ''}
    </div>`, h => {
    $('#b-quitar', h)?.addEventListener('click', () => { s.quitados[k] = true; salva(); cierraHoja(); vCompra(); tostada('Quitado de la lista'); });
    $('#b-nohabia', h)?.addEventListener('click', () => {
      if (s.noComprado[clave]) { delete s.noComprado[clave]; quitaPendiente(f); tostada('Vale, sí lo había'); }
      else { s.noComprado[clave] = true; delete s.marcados[clave]; apuntaPendiente({ k: f.k || null, n: nombreFila(f) }); tostada('✕ No había: apuntado para otro súper'); }
      salva(); cierraHoja(); vCompra();
    });
    $('#b-borrar-extra', h)?.addEventListener('click', () => { s.extra = s.extra.filter(y => y.id !== f.extra); salva(); cierraHoja(); vCompra(); });
    $('#b-borrar-otro', h)?.addEventListener('click', () => { s.otrosHechos[f.clave] = true; salva(); cierraHoja(); vCompra(); });
    $('#b-escanear-info', h)?.addEventListener('click', abrirEscaner);
    // Cantidad: lo añadido a mano se suma o se resta; si no hay nada añadido, se resta de lo que pide el menú.
    const refresca = () => { const y = window.scrollY; vCompra(); window.scrollTo(0, y); const nueva = lineaCompra().filas.find(r => f.k ? r.k === f.k : r.clave === f.clave); if (nueva) infoProducto(nueva.clave, nueva); else cierraHoja(); };
    const actual = f.k || f.m ? f.envases : f.n || 1;
    const fija = T => {
      T = Math.max(0, Math.round(T));
      if (f.k) {
        let d = T - actual;
        if (d > 0) {   // primero se deshace lo bajado a mano; lo demás, como añadido
          const m = Math.min(d, s.menos[f.k] || 0); if (m) { s.menos[f.k] -= m; if (!s.menos[f.k]) delete s.menos[f.k]; d -= m; }
          if (d > 0) s.extra.push({ id: uid(), k: f.k, n: d });
          delete s.quitados[f.k];
        } else if (d < 0) {   // primero se quita lo añadido a mano; si no basta, se baja lo que pide el menú
          let r = -d;
          for (const id of [...(f.extras || (f.extra ? [f.extra] : []))].reverse()) {
            if (!r) break;
            const x = s.extra.find(y => y.id === id); if (!x) continue;
            const q = Math.min(r, x.n || 1); x.n = (x.n || 1) - q; r -= q;
            if (x.n <= 0) s.extra = s.extra.filter(y => y.id !== id);
          }
          if (r > 0) s.menos[f.k] = (s.menos[f.k] || 0) + r;
        }
      } else {
        const x = s.extra.find(y => y.id === f.extra);
        if (x) { if (T <= 0) s.extra = s.extra.filter(y => y.id !== f.extra); else x.n = T; }
      }
      salva(); refresca();
    };
    $('#b-mas', h)?.addEventListener('click', () => fija(actual + 1));
    $('#b-menos', h)?.addEventListener('click', () => fija(actual - 1));
    $('#i-cant', h)?.addEventListener('change', e => { const v = parseInt(e.target.value, 10); if (isFinite(v)) fija(v); });
    $('#b-fijo-m', h)?.addEventListener('click', () => {
      E.fijos.push({ m: f.m, n: f.envases || 1 }); E.fijosQuitados = E.fijosQuitados.filter(x => x !== idFav({ m: f.m }));
      s.extra = s.extra.filter(y => y.id !== f.extra);   // esta semana ya entra como favorito
      salva(); cierraHoja(); vCompra(); tostada('⭐ A favoritos');
    });
    $('#b-fijo', h)?.addEventListener('click', () => {
      if (E.fijos.some(y => y.k === k)) { E.fijos = E.fijos.filter(y => y.k !== k); E.fijosQuitados = [...new Set([...(E.fijosQuitados || []), k])]; }
      else { E.fijos = [...E.fijos, { k, n: 1 }]; E.fijosQuitados = (E.fijosQuitados || []).filter(x => x !== k); }
      salva(); cierraHoja(); vCompra(); tostada(E.fijos.some(y => y.k === k) ? '⭐ A favoritos' : 'Quitado de favoritos');
    });
  });
}

function anadeALista(items) {
  const { s } = lineaCompra(), nombres = [];
  for (const it of items) {
    if (!it || (!it.k && !it.texto && !it.m)) continue;
    if (it.k) delete s.quitados[it.k];
    const texto = it.k || it.m ? undefined : capital(it.original || it.texto);
    s.extra.push({ id: uid(), k: it.k || null, m: it.m || undefined, texto, sec: it.sec, n: it.n && (it.k || it.m) ? Math.max(1, Math.round(it.n)) : it.n || 1, v: it.v, img: it.img, ean: it.ean });
    const nv = it.k ? L.veredicto(L.nutrientesDe(D.productos[it.k])).nivel : it.v;
    nombres.push((nv ? L.NIVEL[nv].e + ' ' : '') + (it.k ? nombreCorto(D.productos[it.k]) : it.m ? it.m.n : texto));
  }
  salva();
  if (nombres.length) tostada('➕ ' + nombres.join(', '));
}

// Terminar la compra: lo marcado con ✓ pasa a «En casa» (con lo que dice el ticket, si se subió); lo marcado con ✕ sigue en la lista;
// lo del ticket que no estaba en la lista también pasa a «En casa». Queda un resumen, para Claude y para «Última compra».
function terminarCompra(filas, silencioso = false) {
  const { s, p } = lineaCompra();
  const res = { f: new Date().toISOString(), si: [], no: [], extra: [], estimado: 0 };
  for (const f of filas) {
    const n = nombreFila(f);
    if (s.marcados[f.clave]) { res.si.push(n); res.estimado += f.precio || 0; if (f.manual) res.extra.push(n); quitaPendiente(f); }
    else if (s.noComprado[f.clave]) { res.no.push(n); apuntaPendiente({ k: f.k || null, n }); }
  }
  let n = 0;
  for (const f of filas) {
    if (!s.marcados[f.clave]) continue;
    if (f.k) {
      const x = D.productos[f.k], c = s.ticketCant[f.clave];   // con ticket, lo que se compró de verdad
      E.casa[f.k] = (E.casa[f.k] || 0) + (c ? (c.kg ? c.kg * 1000 : c.n * x.util) : f.envases * x.util); n++;
      if (f.despensa) delete s.faltaDespensa[f.k];
    }
    else if (f.m && !NO_COMIDA.has(f.m.cat)) { E.casaOtros = [...new Set([...E.casaOtros, f.m.n])]; }
    if (f.extra) s.extra = s.extra.filter(y => y.id !== f.extra);
    if (f.extras) s.extra = s.extra.filter(y => !f.extras.includes(y.id));
    if (f.fijo && !f.k) s.fijosHechos[f.clave] = true;
    if (f.otro) s.otrosHechos[f.clave] = true;
  }
  if (s.ticket) {
    n += aCasaTicket(s.ticket.fuera);
    res.extra.push(...s.ticket.fuera.map(nombreFuera));
    res.ticket = { fecha: s.ticket.fecha, total: s.ticket.total, cuadra: s.ticket.cuadra, lineas: s.ticket.lineas };
  }
  res.estimado = +res.estimado.toFixed(2);
  s.noHabia = Object.fromEntries(Object.keys(s.noComprado).filter(k => s.noComprado[k]).map(k => [k, true]));   // para avisar en Semana
  s.recetasLista = []; s.marcados = {}; s.noComprado = {}; s.alternativas = {}; s.ticketCant = {}; s.ticket = null; s.compraHecha = true;
  V.filtroCompra = 'todo';
  res.menu = adaptaMenu(p);   // los platos con cosas que no había se cambian por otros que podáis hacer
  E.compras = [res, ...E.compras].slice(0, 20); salva();
  if (silencioso) return res;
  hojaCompra(res, n);
  vCompra();
}

// Resumen de una compra (al terminarla o desde «Última compra»): lo que no había, lo de fuera de la lista y el ticket.
function hojaCompra(res, nCasa = null) {
  if (!res) return;
  const t = res.ticket, chips = l => `<div class="chips-despensa">${l.map(x => `<span class="chip">${esc(x)}</span>`).join('')}</div>`;
  hoja(`<h2>${nCasa != null ? '🧾 Compra terminada' : '🗂️ Compra del ' + fechaCorta(iso(new Date(res.f)))}</h2>
    <div class="tabla-n" style="grid-template-columns:repeat(3,1fr)"><div><b>✓ ${res.si.length}</b><span>comprados</span></div><div><b>✕ ${res.no.length}</b><span>no había</span></div><div><b>＋ ${res.extra.length}</b><span>extra</span></div></div>
    ${nCasa != null ? `<p class="nota">${nCasa} productos pasan a «En casa».${res.menu?.filter(x => x.a).length ? ` El menú se ha ajustado: ${res.menu.filter(x => x.a).length} plato${res.menu.filter(x => x.a).length === 1 ? '' : 's'} cambiado${res.menu.filter(x => x.a).length === 1 ? '' : 's'}.` : res.no.length ? ' Lo que no había queda en «Pendiente de otro súper».' : ''}</p>` : ''}
    ${t ? `<p class="nota">🧾 Ticket${t.fecha ? ' del ' + fechaCorta(t.fecha) : ''}: <b>${euros(t.total)}</b>${t.cuadra === false ? ' · ⚠️ no me cuadra el total' : ''}</p>` : ''}
    ${res.no.length ? `<h3>✕ No había</h3>${chips(res.no)}` : ''}
    ${res.sinTicket?.length ? `<h3>🤔 Con ✓ pero no salen en el ticket</h3>${chips(res.sinTicket)}` : ''}
    ${res.extra.length ? `<h3>＋ Extra</h3>${chips(res.extra)}` : ''}
    ${res.menu?.length ? `<h3>🔄 Menú ajustado a la compra</h3>${htmlCambiosMenu(res.menu)}` : ''}
    <div class="botones" style="margin-top:14px">
      ${res.no.length ? '<button class="boton" id="b-enviar-no-h">📤 Enviar lo que no había</button>' : ''}
      ${t ? '' : '<button class="boton" id="b-ticket-h">📄 Subir el ticket</button>'}
    </div>
    <button class="boton principal ancho" id="b-resumen-claude" style="margin-top:10px">${I.enviar}Mandar al Chef para ajustar el plan</button>
    ${nCasa != null ? `<button class="boton ancho" id="b-ir-casa" style="margin-top:8px">${I.caja}Ver «En casa»</button>` : ''}`, h => {
    $('#b-enviar-no-h', h)?.addEventListener('click', () => compartirNoHabia(res.no));
    $('#b-ticket-h', h)?.addEventListener('click', elegirTicket);
    $('#b-resumen-claude', h).addEventListener('click', () => irAClaude(textoCompra(res)));
    $('#b-ir-casa', h)?.addEventListener('click', () => { cierraHoja(); location.hash = 'casa'; });
  });
}
const textoCompra = r => [`Compra del ${new Date(r.f).toLocaleDateString('es-ES')}.`,
  r.ticket ? `Ticket${r.ticket.fecha ? ' del ' + r.ticket.fecha : ''}: ${euros(r.ticket.total)}${r.estimado ? ` (la lista calculaba ${euros(r.estimado)})` : ''}.` : 'Sin ticket.',
  `Comprado (${r.si.length}): ${r.si.join(', ')}`, `No había (${r.no.length}): ${r.no.join(', ') || '—'}`, `Extra (${r.extra.length}): ${r.extra.join(', ') || '—'}`,
  r.sinTicket?.length ? `Con ✓ pero no salen en el ticket: ${r.sinTicket.join(', ')}` : '',
  r.ticket?.lineas?.length ? `Renglones del ticket: ${r.ticket.lineas.map(([n, d, imp, kg]) => `${kg ? String(kg).replace('.', ',') + ' kg' : n} ${d} ${euros(imp)}`).join('; ')}` : '',
  r.ticket ? 'Compáralo con el plan y ajústalo.' : 'Compáralo con el ticket y ajusta el plan.'].filter(Boolean).join('\n');

async function compartirTexto(titulo, txt, copiado) {
  try { if (navigator.share) { await navigator.share({ title: titulo, text: txt }); return; } } catch { return; }
  try { await navigator.clipboard.writeText(txt); tostada(copiado); } catch { tostada('No he podido compartirlo'); }
}
async function compartirLista(filas) {
  const { s } = lineaCompra();
  let sec = '', txt = 'Lista de la compra (Mercadona) · NutriHome\n';
  for (const f of filas) {
    if (s.marcados[f.clave] || s.noComprado[f.clave]) continue;
    if (f.seccion !== sec) { sec = f.seccion; txt += `\n${emojiSeccion(sec)} ${sec}\n`; }
    txt += `☐ ${nombreFila(f)}${f.k ? ` — ${L.cantidadCompra(f, D.productos)}` : f.m ? ` — ${f.m.env}` : ''}\n`;
  }
  compartirTexto('Lista de la compra', txt, 'Lista copiada: pégala en WhatsApp');
}
const compartirNoHabia = nombres => compartirTexto('Lo que no había', 'No había en Mercadona · NutriHome\n' + nombres.map(n => '☐ ' + n).join('\n'), 'Copiado: pégalo en WhatsApp');

async function mandarFoto(fichero, texto = 'Para Claude, desde NutriHome: foto del ticket o de una lista. Compárala con la compra y métela en NutriHome.') {
  if (!fichero) return false;
  try {
    if (navigator.canShare && navigator.canShare({ files: [fichero] })) { tostada('Elige Telegram y el chat con @' + (D.perfiles.bot || 'el bot')); await navigator.share({ files: [fichero], text: texto }); return true; }
  } catch { return false; }
  hoja(`<h2>📷 Mandárselo al Chef</h2><p>Este móvil no deja compartir ficheros desde la app. Mándalo al bot de Telegram <b>@${esc(D.perfiles.bot || '')}</b>.</p>
    <a class="boton principal" href="https://t.me/${esc(D.perfiles.bot || '')}" target="_blank" rel="noopener">Abrir Telegram</a>`);
  return false;
}

// ——— Ticket digital: el PDF que manda Mercadona por correo ———
// Se lee en el móvil (pdf.js, en vendor/), cada renglón se busca en Mercadona para saber qué producto es (si el precio coincide,
// es ese seguro) y se cruza con la lista: lo comprado se marca con ✓, lo que no sale con ✕ y lo de fuera pasa a «En casa» al terminar.
let cargaPDF;
function cargaPDFJS() {
  if (window.pdfjsLib) return Promise.resolve();
  return cargaPDF ||= new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = 'vendor/pdf.min.js';
    s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js'; res(); };
    s.onerror = () => { cargaPDF = null; rej(new Error('Sin conexión no puedo abrir el lector de PDF')); };
    document.head.appendChild(s);
  });
}
// Los trozos de texto del PDF se juntan por renglón (misma altura) y de izquierda a derecha.
async function lineasPDF(fichero) {
  await cargaPDFJS();
  const doc = await window.pdfjsLib.getDocument({ data: new Uint8Array(await fichero.arrayBuffer()) }).promise, lineas = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const tc = await (await doc.getPage(n)).getTextContent();
    const trozos = tc.items.filter(t => t.str.trim()).map(t => ({ s: t.str.trim(), x: t.transform[4], y: t.transform[5], h: Math.abs(t.transform[3]) || 8 }))
      .sort((a, b) => b.y - a.y || a.x - b.x);
    let fila = [], y0 = null;
    const cierra = () => { if (fila.length) lineas.push(fila.sort((a, b) => a.x - b.x).map(t => t.s).join('  ')); fila = []; };
    for (const t of trozos) { if (y0 !== null && Math.abs(t.y - y0) > Math.min(t.h, 6) / 2) cierra(); if (!fila.length) y0 = t.y; fila.push(t); }
    cierra();
  }
  doc.destroy();
  return lineas;
}
function elegirTicket() {
  $$('input.elige-ticket').forEach(x => x.remove());
  const i = document.createElement('input'); i.type = 'file'; i.accept = 'application/pdf,.pdf,image/*'; i.className = 'sr elige-ticket';
  i.addEventListener('change', () => { const f = i.files[0]; i.remove(); abreTicket(f); });
  document.body.appendChild(i); i.click();
}
async function abreTicket(fichero) {
  if (!fichero) return;
  if (/^image\//.test(fichero.type)) return irAClaude('foto del ticket. Compárala con la compra y métela en NutriHome.', fichero);   // la foto la leo yo
  hoja('<h2>🧾 Leyendo el ticket…</h2><div class="cargando"></div><div class="cargando" style="width:70%"></div>');
  let t;
  try { t = L.leeTicket(/pdf$/i.test(fichero.type) || /\.pdf$/i.test(fichero.name) ? await lineasPDF(fichero) : await fichero.text()); }
  catch (e) { return ticketIlegible(fichero, e.message); }
  if (!t.items.length) return ticketIlegible(fichero);
  muestraTicket(t);
}
function ticketIlegible(fichero, motivo = '') {
  hoja(`<h2>🧾 No he podido leerlo</h2>
    <p class="nota">${motivo ? esc(motivo) + '. ' : ''}¿Es el PDF del ticket digital de Mercadona? Puedes mandárselo al Chef, o copiar el texto del ticket y pegarlo aquí.</p>
    <button class="boton principal ancho" id="b-ticket-claude">${I.enviar}Mandárselo al Chef</button>
    <textarea class="campo-texto" id="t-ticket" placeholder="MERCADONA, S.A. … TOTAL (€) …" style="margin-top:12px"></textarea>
    <button class="boton ancho" id="b-leer-ticket" style="margin-top:8px">🧾 Leer el texto</button>`, h => {
    $('#b-ticket-claude', h).addEventListener('click', () => irAClaude('el ticket digital de Mercadona. Compáralo con la compra de NutriHome.', fichero));
    $('#b-leer-ticket', h).addEventListener('click', () => { const t = L.leeTicket($('#t-ticket', h).value); if (t.items.length) muestraTicket(t); else tostada('No encuentro productos en ese texto'); });
  });
}

// Cada renglón distinto se busca en Mercadona, de 20 en 20 en una sola llamada. Sin conexión se compara solo por el nombre.
const ALGOLIA_VARIAS = ALGOLIA.replace('/products_prod_mad1_es/query', '/*/queries');
async function identificaTicket(items) {
  for (let i = 0; i < items.length; i += 20) {
    const trozo = items.slice(i, i + 20);
    const r = await fetch(ALGOLIA_VARIAS, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requests: trozo.map(it => ({
      indexName: 'products_prod_mad1_es', params: 'query=' + encodeURIComponent(it.d) + '&hitsPerPage=3&queryType=prefixAll&removeWordsIfNoResults=allOptional' })) }) });
    if (!r.ok) throw new Error('Mercadona no responde');
    (await r.json()).results.forEach((res, n) => {
      const it = trozo[n], hits = (res.hits || []).filter(h => h.published !== false).map(deAlgolia);
      it.hits = hits; it.seguro = hits.find(h => it.kg ? h.ref && Math.abs(h.ref - it.pu) < 0.011 : it.pu && Math.abs(h.precio - it.pu) < 0.011) || null;
    });
  }
}
// Un mismo producto puede salir en varios renglones: se suman.
function juntaRenglones(items) {
  const m = new Map();
  for (const it of items) {
    const k = L.normaliza(it.d), x = m.get(k);
    if (!x) { m.set(k, { ...it }); continue; }
    x.n += it.n; x.imp = +(x.imp + it.imp).toFixed(2); if (it.kg) x.kg = +((x.kg || 0) + it.kg).toFixed(3);
  }
  return [...m.values()];
}
const idFila = f => f.k ? String(D.productos[f.k].id) : f.m?.id ? String(f.m.id) : null;
const nombreLargo = f => f.k ? D.productos[f.k].n : f.m ? f.m.n : f.texto || '';
// De 0 a 1: ¿es este renglón del ticket esa fila de la lista? Si Mercadona dice (por el precio) que es otro producto,
// solo vale si el nombre es casi igual (otro tamaño del mismo yogur, por ejemplo).
function puntuaTicket(it, f) {
  const id = idFila(f), nombre = nombreLargo(f), t = L.parecido(it.d, nombre);
  if (!id) { const pr = it.seguro || it.hits?.[0]; return pr ? Math.max(t, (it.seguro ? 0.9 : 0.75) * L.parecido(nombre, pr.n)) : t; }
  if (it.seguro) return it.seguro.id === id ? 1 : t >= 0.85 ? t : t * 0.6;
  return it.hits?.[0]?.id === id && t >= 0.3 ? Math.max(t, 0.7) : t;   // lo primero que encuentra Mercadona, si el nombre también se parece
}
const sinMarca = n => nombreCorto({ n }).replace(/ (Deliplus|Bosque Verde|Sabroz|Compy)\b/g, '');
const nombreFuera = x => x.m?.n ? sinMarca(x.m.n) : capital(x.d.toLowerCase());
const resumenTicket = (t, fuera) => ({ fecha: t.fecha, hora: t.hora, total: t.total ?? t.suma, cuadra: t.cuadra, lineas: t.items.map(it => [it.n, it.d, it.imp, it.kg]),
  fuera: fuera.map(it => ({ d: it.d, n: it.n, kg: it.kg, imp: it.imp, k: it.seguro?.k || null,
    m: it.seguro ? { id: it.seguro.id, n: it.seguro.n, cat: it.seguro.cat, foto: it.seguro.foto } : it.hits?.[0] ? { cat: it.hits[0].cat } : null })) });
// Lo de fuera de la lista pasa a «En casa» (lo que no es comida, no). Devuelve cuántos.
function aCasaTicket(fuera = []) {
  let n = 0;
  for (const x of fuera) {
    const cat = x.k ? D.productos[x.k].cat : x.m?.cat;
    if (!cat || NO_COMIDA.has(cat)) continue;
    if (x.k) E.casa[x.k] = (E.casa[x.k] || 0) + (x.kg ? x.kg * 1000 : x.n * D.productos[x.k].util);
    else E.casaOtros = [...new Set([...E.casaOtros, nombreFuera(x)])];
    n++;
  }
  return n;
}
// Si Mercadona confirma el producto y su precio ha cambiado, la lista usa el precio nuevo (con la fecha del ticket).
function aprendePrecios(items, f = hoy()) {
  for (const it of items) { const k = it.seguro?.k; if (k && !it.kg && it.pu > 0 && Math.abs(D.productos[k].precio - it.pu) > 0.004) { E.precios[k] = [it.pu, f]; D.productos[k].precio = it.pu; } }
}
const filaTicket = it => `<div class="res sin-borde">${it.seguro?.foto ? `<img src="${esc(it.seguro.foto)}" alt="" loading="lazy">` : '<div class="sinfoto">🧾</div>'}
  <span class="res-t"><b>${esc(it.seguro ? sinMarca(it.seguro.n) : capital(it.d.toLowerCase()))}</b><span class="nota">${it.kg ? String(it.kg).replace('.', ',') + ' kg' : it.n + ' ud.'}</span></span><span class="res-p">${euros(it.imp)}</span></div>`;

async function muestraTicket(t) {
  const items = juntaRenglones(t.items);
  hoja('<h2>🧾 Buscando cada producto…</h2><div class="cargando"></div><div class="cargando" style="width:70%"></div>');
  let sinRed = false;
  try { await identificaTicket(items); } catch { sinRed = true; }
  const { p, s, filas } = lineaCompra();
  const marcas = filas.some(f => s.marcados[f.clave] || s.noComprado[f.clave]);
  // ¿La compra ya se terminó sin ticket? Entonces se compara con lo que se marcó.
  const u = E.compras[0], fu = u && iso(new Date(u.f));
  if (!marcas && u && !u.ticket && t.fecha && t.fecha <= fu && fecha(fu) - fecha(t.fecha) <= 3 * 864e5) return ticketDeTerminada(t, items, u, sinRed);
  const pares = L.cruzaTicket(items, filas, puntuaTicket);
  const enFila = new Set(pares.map(([, j]) => j)), usados = new Set(pares.map(([i]) => i));
  const faltan = filas.filter((_, j) => !enFila.has(j)), noEstan = faltan.filter(f => !s.marcados[f.clave]), raros = faltan.filter(f => s.marcados[f.clave]);
  const fuera = items.filter((_, i) => !usados.has(i));
  const chips = l => `<div class="chips-despensa">${l.map(f => `<span class="chip">${esc(nombreFila(f))}</span>`).join('')}</div>`;
  hoja(`<h2>🧾 Ticket${t.fecha ? ' del ' + fechaCorta(t.fecha) : ''}</h2>
    <div class="tabla-n" style="grid-template-columns:repeat(3,1fr)"><div><b>✓ ${pares.length}</b><span>de la lista</span></div><div><b>✕ ${noEstan.length}</b><span>no está</span></div><div><b>＋ ${fuera.length}</b><span>fuera de lista</span></div></div>
    <p class="nota"><b>${euros(t.total ?? t.suma)}</b>${t.cuadra ? '' : ' · ⚠️ no me cuadra el total'}${sinRed ? ' · 📡 sin conexión: comparo solo por el nombre' : ''}</p>
    ${noEstan.length ? `<h3>✕ No está en el ticket</h3>${chips(noEstan)}` : ''}
    ${raros.length ? `<h3>🤔 Con ✓ pero no salen en el ticket</h3>${chips(raros)}` : ''}
    ${fuera.length ? `<h3>＋ Fuera de la lista</h3>${fuera.map(filaTicket).join('')}` : ''}
    ${pares.length ? `<details class="emparejados"><summary>✓ Ver los ${pares.length} de la lista</summary>${pares.map(([i, j]) => `<div class="par"><span>${esc(nombreFila(filas[j]))}</span><span class="nota">${esc(items[i].d)}</span></div>`).join('')}</details>` : ''}
    <button class="boton principal ancho" id="b-aplicar-ticket" style="margin-top:14px">✅ Aplicar el ticket</button>`, h => {
    $('#b-aplicar-ticket', h).addEventListener('click', () => {
      for (const [i, j] of pares) { const f = filas[j], it = items[i]; s.marcados[f.clave] = true; delete s.noComprado[f.clave]; delete s.alternativas[f.clave]; s.ticketCant[f.clave] = { n: it.n, kg: it.kg }; }
      for (const f of noEstan) s.noComprado[f.clave] = true;
      s.ticket = resumenTicket(t, fuera); aprendePrecios(items, t.fecha || hoy());
      salva(); cierraHoja();
      const cambios = noEstan.length ? adaptaMenu(p) : [];   // los platos con lo que no había se cambian ya por otros que podáis hacer
      V.filtroCompra = 'todo';
      if (V.pestana !== 'compra') location.hash = 'compra'; else { vCompra(); window.scrollTo({ top: 0 }); }
      tostada(`🧾 ✓ ${pares.length} · ✕ ${noEstan.length} · ＋ ${fuera.length}`);
      if (cambios.length) setTimeout(() => hojaCambiosMenu(cambios), 450);
    });
  });
}
// El ticket llega cuando la compra ya estaba terminada: se compara con lo marcado y lo de fuera de la lista pasa a «En casa».
function ticketDeTerminada(t, items, u, sinRed) {
  const filas = u.si.map(n => ({ texto: n })), pares = L.cruzaTicket(items, filas, puntuaTicket);
  const usados = new Set(pares.map(([i]) => i)), vistos = new Set(pares.map(([, j]) => j));
  const fuera = items.filter((_, i) => !usados.has(i)), sinTicket = u.si.filter((_, j) => !vistos.has(j));
  hoja(`<h2>🧾 Ticket${t.fecha ? ' del ' + fechaCorta(t.fecha) : ''}</h2>
    <p class="nota">La compra ya estaba terminada: lo comparo con lo que marcasteis.</p>
    <div class="tabla-n" style="grid-template-columns:repeat(3,1fr)"><div><b>✓ ${pares.length}</b><span>coinciden</span></div><div><b>🤔 ${sinTicket.length}</b><span>no salen</span></div><div><b>＋ ${fuera.length}</b><span>fuera de lista</span></div></div>
    <p class="nota"><b>${euros(t.total ?? t.suma)}</b>${t.cuadra ? '' : ' · ⚠️ no me cuadra el total'}${sinRed ? ' · 📡 sin conexión: comparo solo por el nombre' : ''}</p>
    ${sinTicket.length ? `<h3>🤔 Con ✓ pero no salen en el ticket</h3><div class="chips-despensa">${sinTicket.map(x => `<span class="chip">${esc(x)}</span>`).join('')}</div>` : ''}
    ${fuera.length ? `<h3>＋ Fuera de la lista</h3>${fuera.map(filaTicket).join('')}` : ''}
    <button class="boton principal ancho" id="b-guardar-ticket" style="margin-top:14px">✅ Guardar${fuera.length ? ' y pasar lo de fuera a «En casa»' : ''}</button>`, h => {
    $('#b-guardar-ticket', h).addEventListener('click', () => {
      const r = resumenTicket(t, fuera);
      aCasaTicket(r.fuera); aprendePrecios(items, t.fecha || hoy());
      u.ticket = { fecha: r.fecha, total: r.total, cuadra: r.cuadra, lineas: r.lineas };
      u.extra = [...u.extra, ...r.fuera.map(nombreFuera)]; u.sinTicket = sinTicket;
      salva(); hojaCompra(u); tostada('🧾 Ticket guardado');
    });
  });
}

// ——— ¿Es buena compra? Escáner de códigos de barras + Open Food Facts + semáforo ———
const ZXING = { src: 'https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js', sri: 'sha384-BzBxP10ZE72aitqj5UMmUsbKFliP/DZqA8Wq+BNNhlIJDGoEd1tpkMYXOg9+n6sB' };
let cargaZX;
function cargaZXing() {
  if (window.ZXing) return Promise.resolve();
  return cargaZX ||= new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = ZXING.src; s.integrity = ZXING.sri; s.crossOrigin = 'anonymous';
    s.onload = res; s.onerror = () => { cargaZX = null; rej(new Error('No se pudo cargar el lector')); }; document.head.append(s);
  });
}
async function leeCodigo(fichero) {
  const bmp = await createImageBitmap(fichero);
  if ('BarcodeDetector' in window) {
    try { const r = await new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] }).detect(bmp); if (r[0]) return r[0].rawValue; } catch { /* a ZXing */ }
  }
  await cargaZXing();
  const Z = window.ZXing, hints = new Map();
  hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.EAN_13, Z.BarcodeFormat.EAN_8, Z.BarcodeFormat.UPC_A, Z.BarcodeFormat.UPC_E, Z.BarcodeFormat.CODE_128]);
  hints.set(Z.DecodeHintType.TRY_HARDER, true);
  const lector = new Z.MultiFormatReader(); lector.setHints(hints);
  // Primero la foto entera; si el código sale pequeño, por trozos que se solapan (centro y una rejilla de 3 × 3).
  const W = bmp.width, H = bmp.height, zonas = [[0, 0, 1, 1, true], [0.15, 0.15, 0.7, 0.7], [0.25, 0.25, 0.5, 0.5]];
  for (const y of [0, 0.25, 0.5]) for (const x of [0, 0.25, 0.5]) zonas.push([x, y, 0.5, 0.5]);
  const intenta = (sx, sy, sw, sh, giro, lado) => {
    const e = Math.min(2, lado / Math.max(sw, sh)), w = Math.round(sw * e), h = Math.round(sh * e);
    const c = document.createElement('canvas'), x = c.getContext('2d', { willReadFrequently: true });
    if (giro) { c.width = h; c.height = w; x.translate(h, 0); x.rotate(Math.PI / 2); } else { c.width = w; c.height = h; }
    x.drawImage(bmp, sx, sy, sw, sh, 0, 0, w, h);
    const fuente = new Z.HTMLCanvasElementLuminanceSource(c);
    for (const B of [Z.HybridBinarizer, Z.GlobalHistogramBinarizer]) { try { return lector.decode(new Z.BinaryBitmap(new B(fuente))).getText(); } catch { /* siguiente */ } }
    return null;
  };
  for (const [zx, zy, zw, zh, entera] of zonas) for (const giro of entera ? [0, 90] : [0]) {
    const t = intenta(zx * W, zy * H, zw * W, zh * H, giro, entera ? 1400 : 1100);
    if (t) return t;
  }
  return null;
}
async function buscaOFF(ean) {
  const campos = 'product_name,product_name_es,generic_name_es,brands,quantity,image_front_small_url,nutriments,nutriscore_grade,nova_group,categories_tags';
  const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(ean)}.json?fields=${campos}`);
  if (!r.ok) return null;
  const j = await r.json();
  return j.status === 1 ? j.product : null;
}
function semaforoHTML(v) {
  const N = L.NIVEL[v.nivel];
  const razones = [...v.pros.map(t => `<span class="pill bueno">👍 ${esc(t)}</span>`), ...v.contras.map(t => `<span class="pill malo">👎 ${esc(t)}</span>`)].join('') || '<span class="pill">normalito: en su ración</span>';
  return `<div class="semaforo ${v.nivel}"><span class="luz">${N.e}</span><div><div class="titulo">${N.t}</div><div class="razones">${razones}</div></div></div>`;
}
function abrirEscaner() {
  hoja(`<h2>🔎 ¿Es buena compra?</h2>
    <label class="escanear-grande" for="i-codigo-foto" style="margin-top:12px"><span class="emo">📷</span>Foto del código de barras</label>
    <input id="i-codigo-foto" type="file" accept="image/*" capture="environment" class="sr">
    <form class="anadir" id="f-ean"><div class="caja"><input id="i-ean" inputmode="numeric" placeholder="…o escribe los números" autocomplete="off"><button class="icono mas" aria-label="Buscar">${I.buscar}</button></div></form>
    <div id="resultado"></div>
    ${E.escaneos.length ? `<h3>🕘 Lo último</h3><div class="botones">${E.escaneos.slice(0, 8).map(x => `<button class="chip" data-ean="${esc(x.ean)}">${L.NIVEL[x.nivel]?.e || '⚪'} ${esc(x.n.slice(0, 28))}</button>`).join('')}</div>` : ''}`, h => {
    const res = $('#resultado', h);
    const consulta = async ean => {
      ean = String(ean || '').replace(/\D/g, '');
      if (ean.length < 8) { res.innerHTML = '<div class="aviso"><span class="emo">🤔</span><div>Ese código es muy corto.</div></div>'; return; }
      res.innerHTML = '<div class="cargando"></div><div class="cargando" style="width:70%"></div>';
      const local = Object.entries(D.productos).find(([, x]) => x.ean && (x.ean === ean || x.ean.replace(/^0+/, '') === ean.replace(/^0+/, '')));
      let n, nombre, img, nut = null;
      if (local) { const [k, x] = local; nut = L.nutrientesDe(x); nombre = nombreCorto(x); img = x.foto; n = { k }; }
      else {
        let pr = null;
        try { pr = await buscaOFF(ean); } catch { res.innerHTML = '<div class="aviso"><span class="emo">📡</span><div>Sin conexión: prueba otra vez.</div></div>'; return; }
        if (!pr) { res.innerHTML = `<div class="aviso"><span class="emo">🙈</span><div><b>No lo encuentro</b> (${esc(ean)}).</div></div><button class="boton suave" id="b-off-claude">${I.enviar}Mandárselo al Chef</button>`;
          $('#b-off-claude', h).addEventListener('click', () => irAClaude(`¿Es buena compra el producto con código ${ean}? Te mando foto.`)); return; }
        nut = L.nutrientesOFF(pr); nombre = pr.product_name_es || pr.product_name || pr.generic_name_es || 'Producto ' + ean; img = pr.image_front_small_url;
        if (pr.brands) nombre += ' · ' + pr.brands.split(',')[0];
        n = { texto: nombre };
      }
      if (nut.kcal == null && !nut.p && !nut.hc) { res.innerHTML = `<div class="aviso"><span class="emo">🤷</span><div><b>${esc(nombre)}</b>: sin tabla nutricional.</div></div>`; return; }
      const v = L.veredicto(nut);
      E.escaneos = [{ ean, n: nombre, nivel: v.nivel, img, f: new Date().toISOString() }, ...E.escaneos.filter(x => x.ean !== ean)].slice(0, 12); salva();
      res.innerHTML = `<div class="producto-escaneado" style="margin-top:14px">${img ? `<img src="${esc(img)}" alt="">` : ''}<div><b>${esc(nombre)}</b></div></div>
        ${semaforoHTML(v)}
        <div class="tabla-n"><div><b>${v.kcal}</b><span>kcal</span></div><div><b>${r0(nut.p * 10) / 10} g</b><span>proteína</span></div><div><b>${nut.az != null ? r0(nut.az * 10) / 10 + ' g' : '—'}</b><span>azúcar</span></div><div><b>${r0(nut.g * 10) / 10} g</b><span>grasa</span></div></div>
        <div class="botones" style="margin-top:12px"><button class="boton ${v.nivel === 'malo' ? '' : 'principal'}" id="b-escaneo-lista">${I.carro}${v.nivel === 'malo' ? 'Añadir igualmente' : 'A la lista'}</button></div>`;
      $('#b-escaneo-lista', h).addEventListener('click', () => { anadeALista([{ ...n, v: v.nivel, img, ean }]); cierraHoja(); if (V.pestana === 'compra') vCompra(); });
    };
    $('#i-codigo-foto', h).addEventListener('change', async e => {
      const f = e.target.files[0]; if (!f) return;
      res.innerHTML = '<div class="nota" style="text-align:center;margin-top:12px">🔍 Leyendo el código…</div><div class="cargando"></div>';
      try {
        const ean = await leeCodigo(f);
        if (ean) { $('#i-ean', h).value = ean; consulta(ean); }
        else res.innerHTML = '<div class="aviso"><span class="emo">📷</span><div><b>No leo el código.</b> Más cerca, con luz y recto, o escribe los números.</div></div>';
      } catch (err) { res.innerHTML = `<div class="aviso"><span class="emo">⚠️</span><div>${esc(err.message || 'No he podido leer la foto')}.</div></div>`; }
      e.target.value = '';
    });
    $('#f-ean', h).addEventListener('submit', e => { e.preventDefault(); consulta($('#i-ean', h).value); });
    $$('[data-ean]', h).forEach(b => b.addEventListener('click', () => { $('#i-ean', h).value = b.dataset.ean; consulta(b.dataset.ean); }));
  });
}

// ——— En casa ———
const LUGAR = k => {
  const c = D.productos[k]?.cat;
  if (c === 'Congelados') return 'Congelador';
  if (c === 'Fruta y verdura') return 'Fruta y verdura';
  if (['Carne', 'Marisco y pescado', 'Charcutería y quesos', 'Huevos, leche y mantequilla', 'Postres y yogures'].includes(c)) return 'Nevera';
  return 'Despensa';
};
const LUGAR_EMO = { 'Nevera': '🧊', 'Fruta y verdura': '🥬', 'Congelador': '❄️', 'Despensa': '🫙' };
function vCasa() {
  const items = Object.entries(E.casa).filter(([k, g]) => D.productos[k] && g > 0);
  cabecera('En casa', `${items.length + E.casaOtros.length} cosas`);
  const grupos = {};
  for (const [k, g] of items) (grupos[LUGAR(k)] ||= []).push([k, g]);
  const orden = ['Nevera', 'Fruta y verdura', 'Congelador', 'Despensa'];
  $('#vista').innerHTML = `
    <div class="tarjeta anadir-mas">
      <h3 style="margin-top:0">📝 ¿Qué tenéis?</h3>
      <textarea class="campo-texto" id="t-casa" placeholder="Escríbelo todo: 6 huevos, 2 latas de atún, arroz, medio pollo, leche…"></textarea>
      <button class="boton principal ancho" id="b-casa" style="margin-top:10px">✅ Apuntar y ajustar la lista</button>
    </div>
    ${items.length ? orden.filter(o => grupos[o]).map(o => `<div class="cat"><span class="emo">${LUGAR_EMO[o]}</span>${o}<span class="num">${grupos[o].length}</span></div><div class="rejilla">
      ${grupos[o].sort((a, b) => D.productos[a[0]].n.localeCompare(D.productos[b[0]].n, 'es')).map(([k, g]) => `<div class="casa-item">
        <div class="arriba">${D.productos[k].foto ? `<img src="${esc(D.productos[k].foto)}" alt="" loading="lazy" width="46" height="46">` : `<div class="sinfoto" style="display:grid;place-items:center;font-size:22px">${CAT_EMO[D.productos[k].cat] || '🫙'}</div>`}
          <div style="min-width:0"><div class="pn">${esc(nombreCorto(D.productos[k]))}</div><div class="cant">${esc(cantidadCasa(k, g))}</div></div></div>
        <div class="mas-menos"><button data-menos="${k}" aria-label="Menos">−</button><button data-mas="${k}" aria-label="Más">+</button></div></div>`).join('')}</div>`).join('') : ''}
    ${E.casaOtros.length ? `<div class="cat"><span class="emo">🧺</span>Otras cosas<span class="num">${E.casaOtros.length}</span></div><div class="chips-despensa">${E.casaOtros.map((t, i) => `<button class="chip" data-otro-casa="${i}">${esc(t)} ✕</button>`).join('')}</div>` : ''}
    ${!items.length && !E.casaOtros.length ? '<div class="vacio"><span class="emo">🧺</span>Todavía no hay nada.</div>' : ''}`;
  const paso = k => { const x = D.productos[k]; return x.gud || Math.max(10, Math.round(x.util / 4 / 10) * 10); };
  $$('[data-menos]').forEach(b => b.addEventListener('click', () => { const k = b.dataset.menos; E.casa[k] = Math.max(0, (E.casa[k] || 0) - paso(k)); if (E.casa[k] <= 0.5) delete E.casa[k]; salva(); vCasa(); }));
  $$('[data-mas]').forEach(b => b.addEventListener('click', () => { const k = b.dataset.mas; E.casa[k] = (E.casa[k] || 0) + paso(k); salva(); vCasa(); }));
  $$('[data-otro-casa]').forEach(b => b.addEventListener('click', () => { E.casaOtros.splice(+b.dataset.otroCasa, 1); salva(); vCasa(); }));
  $('#b-casa').addEventListener('click', () => apuntaCasa($('#t-casa').value));
}
// «6 huevos, 2 latas de atún, arroz…» → En casa (con cantidades) y la lista se ajusta sola.
function apuntaCasa(texto) {
  const partes = (texto || '').split(/\n|,|;| y (?=\S)/).map(t => t.trim()).filter(Boolean);
  if (!partes.length) { tostada('Escribe lo que tenéis'); return; }
  const antes = lineaCompra().filas.length;
  const hechos = [], otros = [];
  for (const t of partes) {
    const d = L.lineaIngrediente(t, D.productos);
    if (d?.basico) continue;
    if (d?.k) {
      const x = D.productos[d.k], conCantidad = /\d|\b(un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|medio|media)\b/i.test(t);
      E.casa[d.k] = (E.casa[d.k] || 0) + (conCantidad ? d.g : x.util);
      hechos.push(nombreCorto(x));
    } else otros.push(capital(t));
  }
  E.casaOtros = [...new Set([...E.casaOtros, ...otros])];
  salva(); vCasa();
  const quitados = antes - lineaCompra().filas.length;
  tostada(`🏠 ${hechos.length + otros.length} apuntadas${quitados > 0 ? ` · ${quitados} fuera de la lista` : ''}`);
}
function cantidadCasa(k, g) {
  const x = D.productos[k];
  if (x.ud && x.gud) { const n = g / x.gud; if (n >= 0.9) return `≈ ${r0(n)} ${L.plural(x.ud, r0(n))}`; }
  if (g >= x.util * 0.95 && x.util) { const n = g / x.util; return `${n >= 1.5 ? r0(n) + ' envases' : '1 envase'}`; }
  return `≈ ${g >= 30 ? Math.round(g / 10) * 10 : r0(g)} g`;
}
function anadeACasa(items) {
  const nombres = [];
  for (const it of items) {
    if (!it || !it.k) continue;
    const x = D.productos[it.k];
    E.casa[it.k] = (E.casa[it.k] || 0) + (it.n ? (x.gud ? it.n * x.gud : it.n * x.util) : x.util);
    nombres.push(nombreCorto(x));
  }
  salva();
  tostada(nombres.length ? '🏠 En casa: ' + nombres.join(', ') : 'No lo encuentro en los productos de la app');
  return nombres.length > 0;
}

// ——— Recetas ———
const FILTROS = [['todas', '✨ Todas'], ['favoritas', '❤️ Favoritas'], ['vuestras', '⭐ Vuestras'], ['desayuno', '☀️ Desayunos'], ['comida', '🍽️ Comidas'], ['cena', '🌙 Cenas'], ['merienda', '🍎 Meriendas'], ['airfryer', '🌀 Air fryer'], ['plancha', '🍳 Plancha'], ['micro', '⚡ Micro'], ['rapidas', '⏱ 10 min']];
function vRecetas() {
  const todas = todasRecetas();
  cabecera('Recetas', `${todas.length} recetas`);
  const pregunta = V.busca.trim();
  const t = L.normaliza(pregunta).replace(/^(como se hace|como hago|como preparo|como se prepara|receta de|receta)\s+/, '').replace(/^(un|una|el|la|los|las)\s+/, '');
  const lista = todas.filter(r => {
    if (t && !L.normaliza(r.n + ' ' + r.ing.map(i => D.productos[i[0]]?.n).join(' ') + ' ' + (r.otros || []).join(' ')).includes(t)) return false;
    const f = V.filtro;
    return f === 'todas' || (f === 'favoritas' && r.fav) || (f === 'vuestras' && r.propia) || r.tipo.includes(f) || r.ap === f || (f === 'rapidas' && r.min <= 10);
  });
  const esPregunta = /^(¿)?\s*(c[oó]mo|qu[eé]|puedo|se puede|receta)/i.test(pregunta) || (t && !lista.length);
  $('#vista').innerHTML = `
    <div class="buscador">${I.buscar}<input id="i-busca" type="search" placeholder="Busca o pregunta: ¿cómo se hace…?" value="${esc(V.busca)}" enterkeyhint="search"></div>
    ${esPregunta && pregunta ? `<div class="tarjeta pregunta"><span class="emo">🤔</span><div><b>${lista.length ? '¿No es ninguna?' : 'No la tengo todavía.'}</b> Pregúntaselo al Chef y la añado.</div><button class="boton principal" id="b-preguntar">${I.enviar}Preguntar</button></div>` : ''}
    <button class="nueva-receta" id="b-nueva"><span class="emo">✍️</span><span><b>Nueva receta</b></span></button>
    <div class="fila-chips">${FILTROS.map(([k, n]) => `<button class="chip" data-filtro="${k}" aria-pressed="${V.filtro === k}">${n}</button>`).join('')}</div>
    <div class="recetas-rejilla">${lista.map(r => { const g = L.macrosReceta(r, 'G', D.productos, fac);
      return `<button class="receta-tarjeta c-${r.tipo[0]}" data-receta="${r.id}"><div class="portada">${r.propia ? '<span class="propia">⭐ VUESTRA</span>' : ''}${r.fav ? '<span class="corazon">❤️</span>' : ''}${emojiReceta(r)}</div>
        <div class="cuerpo"><div class="nombre">${esc(r.n)}</div><div class="datos"><span class="pill">${APARATO_EMO[r.ap] || '🍴'} ${r.min}′</span><span class="pill g">${r0(g.kcal)} kcal</span></div></div></button>`; }).join('')}</div>
    ${lista.length ? '' : `<div class="vacio"><span class="emo">${V.filtro === 'favoritas' ? '❤️' : '🔍'}</span>${V.filtro === 'favoritas' ? 'Toca 🤍 en una receta para guardarla aquí.' : 'No hay recetas con ese filtro.'}</div>`}`;
  $('#b-nueva').addEventListener('click', () => editorReceta(null));
  $('#b-preguntar')?.addEventListener('click', () => irAClaude(`${/^¿/.test(pregunta) ? pregunta : '¿' + capital(pregunta) + '?'} Explícamelo y, si vale, ponla en NutriHome.`));
  $('#i-busca').addEventListener('input', e => { V.busca = e.target.value; const pos = e.target.selectionStart; vRecetas(); const i = $('#i-busca'); i.focus(); i.setSelectionRange(pos, pos); });
  $$('[data-filtro]').forEach(b => b.addEventListener('click', () => { V.filtro = b.dataset.filtro; vRecetas(); }));
  $$('[data-receta]').forEach(b => b.addEventListener('click', () => abrirReceta(b.dataset.receta)));
}

// ——— Nosotros (icono de perfil): vuestros datos, gustos y el súper ———
const SUPERS = [['mercadona', 'Mercadona'], ['lidl', 'Lidl'], ['dia', 'Dia'], ['carrefour', 'Carrefour']];
function vNosotros() {
  const p = perfiles(), h = hoy(), cr = E.creatina[h] || {}, sup = E.super || 'mercadona';
  cabecera('Nosotros', 'Vuestros datos, gustos y súper');
  const tarjeta = q => {
    const x = p[q], o = obj[q];
    return `<div class="tarjeta perfil"><h3><span class="avatar ${q.toLowerCase()}">${ini(q)}</span><span class="${q === 'G' ? 'persona-g' : 'persona-p'}">${esc(x.nombre)}</span></h3>
      <div class="campos">
        <label>Edad<input type="number" inputmode="numeric" data-q="${q}" data-campo="edad" value="${x.edad}"></label>
        <label>Altura (cm)<input type="number" inputmode="numeric" data-q="${q}" data-campo="altura" value="${x.altura}"></label>
        <label>Peso (kg)<input type="number" inputmode="decimal" step="0.5" data-q="${q}" data-campo="peso" value="${x.peso}"></label></div>
      <div class="objetivos"><div class="o1"><span class="emo">🔥</span><b>${o.kcal}</b><span>kcal</span></div><div class="o2"><span class="emo">💪</span><b>${o.prot} g</b><span>proteína</span></div><div class="o3"><span class="emo">🍞</span><b>${o.hc} g</b><span>hidratos</span></div><div class="o4"><span class="emo">🥑</span><b>${o.grasa} g</b><span>grasa</span></div></div>
      <label class="campo-largo">❤️ Me gusta<textarea data-q="${q}" data-texto="gusta" rows="2" placeholder="batidos, fruta, queso de cabra…">${esc(x.gusta || '')}</textarea></label>
      <label class="campo-largo">🚫 No me gusta<textarea data-q="${q}" data-texto="noGusta" rows="2" placeholder="manzana, cilantro… (no entra en vuestros menús)">${esc(x.noGusta || '')}</textarea></label></div>`;
  };
  const gym = E.gimnasio ?? p.gimnasio;
  $('#vista').innerHTML = `
    ${tarjeta('G')}${tarjeta('P')}
    <div class="tarjeta perfil"><h3>🏪 Vuestro súper</h3>
      <div class="botones" style="margin-top:10px">${SUPERS.map(([k, n]) => `<button class="chip" data-super="${k}" aria-pressed="${sup === k}">${n}</button>`).join('')}</div>
      <p class="nota" style="margin:10px 0 0">${sup === 'mercadona' ? 'Productos, precios y ticket digital de Mercadona.' : `Los productos y precios siguen siendo de Mercadona: ${esc(SUPERS.find(([k]) => k === sup)[1])} llegará con la versión para amigos.`}</p></div>
    <div class="tarjeta perfil"><h3>💊 Creatina de hoy</h3>
      <div class="botones" style="margin-top:10px"><button class="chip" data-crea="G" aria-pressed="${!!cr.G}">${cr.G ? '✅' : '⬜'} ${esc(NOM.G)}</button><button class="chip" data-crea="P" aria-pressed="${!!cr.P}">${cr.P ? '✅' : '⬜'} ${esc(NOM.P)}</button></div></div>
    <div class="tarjeta perfil"><button class="interruptor" id="b-gym" aria-pressed="${!!gym}"><span class="sw"></span><span>🏋️ ${gym ? 'Vamos al gimnasio' : 'Todavía sin gimnasio'}</span></button></div>
    <details class="tarjeta perfil"><summary><b>🧮 Cómo lo calculo</b></summary><p class="nota">Gasto en reposo (Mifflin-St Jeor) × actividad (×1,3; ×1,45 con gimnasio), menos un 20 %. Proteína: ${String(p.G.protKg).replace('.', ',')} g/kg ${esc(NOM.G)} y ${String(p.P.protKg).replace('.', ',')} g/kg ${esc(NOM.P)}. Grasa: 0,7 g/kg. Lo demás, hidratos.</p>
      <p class="nota">💊 ${esc(D.perfiles.suplementos.creatina)}<br>🥤 ${esc(D.perfiles.suplementos.huel)}</p></details>
    <div class="tarjeta perfil"><h3>☁️ Sincronización</h3><p class="nota" style="margin:8px 0 0">${servidor() ? (V.sync === 'ok' ? `Este móvil y los demás comparten todo a través del servidor de casa. Última vez: ${V.syncHora ? V.syncHora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '—'}.` : V.sync === 'error' ? `No llego al servidor (${esc(V.syncError)}). Lo guardado se sube en cuanto vuelva la conexión.` : 'Conectando con el servidor de casa…') : 'Sin servidor todavía: lo guardado está solo en este móvil.'}</p></div>
    <div class="tarjeta perfil"><h3>📱 Este móvil</h3>
      <div class="botones"><button class="boton peligro" id="b-borrar">${I.papelera}Borrar lo de este móvil</button></div></div>`;
  $$('input[data-campo]').forEach(i => i.addEventListener('change', () => {
    const v = parseFloat(i.value.replace(',', '.'));
    if (!isFinite(v) || v <= 0) return;
    (E.perfiles[i.dataset.q] ||= {})[i.dataset.campo] = v; salva(); recalcula(); vNosotros(); tostada('Objetivos recalculados');
  }));
  $$('textarea[data-texto]').forEach(t => t.addEventListener('change', () => { (E.perfiles[t.dataset.q] ||= {})[t.dataset.texto] = t.value.trim(); salva(); tostada('Apuntado: lo tengo en cuenta en los menús'); }));
  $$('[data-super]').forEach(b => b.addEventListener('click', () => { E.super = b.dataset.super; salva(); vNosotros(); }));
  $('#b-gym').addEventListener('click', () => { E.gimnasio = !gym; salva(); recalcula(); vNosotros(); });
  $$('[data-crea]').forEach(b => b.addEventListener('click', () => { const x = (E.creatina[h] ||= {}); x[b.dataset.crea] = !x[b.dataset.crea]; salva(); vNosotros(); if (x[b.dataset.crea]) tostada('💊 Apuntada'); }));
  $('#b-borrar').addEventListener('click', () => {
    if (!confirm('¿Borro de este móvil los cambios, la lista, lo de «En casa» y vuestras recetas? El menú y las recetas de la app no se borran.')) return;
    E = estadoNuevo(); E.casa = { ...(D.casa_inicial || {}) }; E.fijos = [...(D.fijos || [])]; reconstruyeRecetas(); salva(); recalcula(); vNosotros(); tostada('Borrado');
  });
}

// ——— Gustos: lo que a alguien no le gusta no entra en sus propuestas ———
const palabrasNo = q => L.normaliza((E.perfiles[q]?.noGusta ?? D.perfiles[q]?.noGusta) || '').split(/[,;\n]| y /).map(s => s.trim()).filter(s => s.length >= 3);
const textoBusca = r => L.normaliza(r.n + ' ' + r.ing.map(i => D.productos[i[0]]?.n || '').join(' ') + ' ' + (r.otros || []).join(' '));
const gustaA = (r, qs) => qs.every(q => { const ws = palabrasNo(q); return !ws.length || !ws.some(w => textoBusca(r).includes(w)); });

// ——— Pendiente de otro súper: lo que no había (✕) se apunta para comprarlo en otro sitio ———
function apuntaPendiente({ k = null, n }) {
  E.pendientes ||= [];
  if (!n || E.pendientes.some(x => (k && x.k === k) || L.normaliza(x.n) === L.normaliza(n))) return;
  E.pendientes.push({ id: uid(), k, n, f: hoy() });
}
function quitaPendiente(f) {
  if (!E.pendientes?.length) return;
  const n = L.normaliza(nombreFila(f));
  E.pendientes = E.pendientes.filter(x => !((f.k && x.k === f.k) || L.normaliza(x.n) === n));
}
const tarjetaPendientes = () => !E.pendientes?.length ? '' : `<div class="tarjeta pregunta"><span class="emo">🏪</span><div class="t"><b>Pendiente de otro súper</b><span class="nota">${esc(enumera(E.pendientes.map(x => x.k && D.productos[x.k] ? nombreFalta(x.k) : x.n), 4))}</span></div><button class="boton" id="b-pendientes">Ver</button></div>`;
function abrirPendientes() {
  const pinta = h => {
    $('#pendientes', h).innerHTML = E.pendientes.map(x => `<div class="pend"><span class="emo">${x.k && D.productos[x.k] ? emojiSeccion(D.productos[x.k].cat) : '🛒'}</span><div class="pend-t"><b>${esc(x.n)}</b><span class="nota">desde el ${fechaCorta(x.f)}</span></div>
      <button class="chip si" data-pend-ya="${x.id}">✓ Ya lo tengo</button><button class="icono" data-pend-quitar="${x.id}" aria-label="Quitar">${I.papelera}</button></div>`).join('') || '<div class="vacio"><span class="emo">🎉</span>No queda nada pendiente.</div>';
    $$('[data-pend-ya]', h).forEach(b => b.addEventListener('click', () => {
      const x = E.pendientes.find(y => y.id === b.dataset.pendYa);
      if (x?.k && D.productos[x.k]) E.casa[x.k] = (E.casa[x.k] || 0) + D.productos[x.k].util;
      E.pendientes = E.pendientes.filter(y => y.id !== b.dataset.pendYa); salva(); pinta(h); tostada(x?.k ? '🏠 Pasa a «En casa»' : 'Quitado'); refrescaCompra();
    }));
    $$('[data-pend-quitar]', h).forEach(b => b.addEventListener('click', () => { E.pendientes = E.pendientes.filter(y => y.id !== b.dataset.pendQuitar); salva(); pinta(h); refrescaCompra(); }));
  };
  hoja(`<h2>🏪 Pendiente de otro súper</h2><div class="nota">Lo que no había en Mercadona. Cuando lo compréis en otro sitio, «Ya lo tengo» lo pasa a «En casa».</div>
    <div id="pendientes" style="margin-top:10px"></div>
    <button class="boton ancho" id="b-enviar-pend" style="margin-top:14px">📤 Enviar la lista</button>`, h => {
    pinta(h);
    $('#b-enviar-pend', h).addEventListener('click', () => compartirTexto('Pendiente de otro súper', 'Pendiente de otro súper · NutriHome\n' + E.pendientes.map(x => '☐ ' + x.n).join('\n'), 'Copiado: pégalo en WhatsApp'));
  });
}

// ——— Claude (💬): el único sitio desde el que se le escribe ———
// Hoy el mensaje sale por Telegram (compartir); cuando esté el servidor, contestará aquí mismo.
function irAClaude(texto = '', fichero = null) {
  V.borrador = texto; V.adjunto = fichero; cierraHoja();
  if (V.pestana === 'claude') pinta(); else location.hash = 'claude';
}
function vClaude() {
  cabecera(NOMBRE_AGENTE, 'Pregunta, pide un cambio o manda una foto');
  const u = E.compras[0], p = planActivo(), d = efectivo(p).dias.find(x => x.f === hoy());
  const enCasa = [...Object.keys(E.casa).filter(k => D.productos[k] && E.casa[k] > 0).map(k => nombreCorto(D.productos[k])), ...E.casaOtros];
  const cena = d && recetas[L.idDe(d.cena)]?.n;
  const atajos = [
    ['🥘', '¿Qué hago con lo que hay?', `¿Qué puedo cocinar con lo que tenemos en casa? Hay: ${enCasa.join(', ') || 'nada apuntado todavía'}.`],
    ['🔄', 'Cambiar un plato', `Cámbiame ${cena ? `la cena de hoy (${cena})` : 'un plato del menú'} por otra cosa.`],
    ['❄️', '¿Esto se congela?', '¿Se puede congelar '],
    ['🧾', 'Última compra', u ? textoCompra(u) : null],
    ['✍️', 'Receta nueva', 'Receta para NutriHome: '],
  ].filter(a => a[2]);
  const conServidor = !!servidor(), charla = (E.charla || []).slice(-12);
  const burbujas = charla.map(c => `<div class="burbuja yo">${esc(c.q)}</div>${c.r ? `<div class="burbuja el">${esc(c.r).replace(/\n/g, '<br>')}</div>` : `<div class="burbuja el pensando" data-charla="${esc(c.id)}">•••</div>`}`).join('');
  $('#vista').innerHTML = `
    ${conServidor && charla.length ? `<div class="charla-hilo" id="hilo">${burbujas}</div>` : ''}
    <div class="tarjeta charla">
      <textarea class="campo-texto" id="t-claude" placeholder="Escríbeme lo que quieras: ¿esto se congela?, cambia la cena del jueves, ¿qué hago con el brócoli?…">${esc(V.borrador || '')}</textarea>
      ${V.adjunto ? `<div class="adjunto"><span>📎 ${esc(V.adjunto.name || 'foto')}</span><button id="b-quitar-adjunto" aria-label="Quitar">×</button></div>` : ''}
      <div class="botones" style="margin-top:10px"><label class="boton" for="i-foto-claude">📷 Foto</label><input id="i-foto-claude" type="file" accept="image/*,application/pdf" class="sr">
        <button class="boton principal" id="b-enviar-claude" style="flex:1">${I.enviar}Enviar</button></div>
    </div>
    <button class="nueva-receta verde" id="b-escanear-claude"><span class="emo">🔎</span><span><b>¿Es buena compra?</b>Escanea el código o hazle una foto: te digo si es 🟢 🟡 🔴</span></button>
    <div class="cat"><span class="emo">⚡</span>Atajos</div>
    <div class="atajos">${atajos.map((a, i) => `<button class="atajo" data-atajo="${i}"><span class="emo">${a[0]}</span>${esc(a[1])}</button>`).join('')}</div>
    ${conServidor ? '<div class="aviso" style="margin-top:16px"><span class="emo">☁️</span><div><b>Contesto desde el Mac de casa</b>, normalmente en menos de un minuto. Las fotos, de momento, van por Telegram.</div></div>'
      : `<div class="aviso" style="margin-top:16px"><span class="emo">📨</span><div><b>Por ahora te contesto por Telegram.</b> Al enviar, elige Telegram y el chat con @${esc(D.perfiles.bot || 'el bot')}. Dentro de poco responderé aquí mismo.</div></div>`}`;
  const ta = $('#t-claude');
  $('#b-escanear-claude').addEventListener('click', abrirEscaner);
  ta.addEventListener('input', () => { V.borrador = ta.value; });
  $$('[data-atajo]').forEach(b => b.addEventListener('click', () => { V.borrador = atajos[+b.dataset.atajo][2]; ta.value = V.borrador; ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }));
  $('#i-foto-claude').addEventListener('change', e => { V.adjunto = e.target.files[0] || null; vClaude(); });
  $('#b-quitar-adjunto')?.addEventListener('click', () => { V.adjunto = null; vClaude(); });
  $('#b-enviar-claude').addEventListener('click', async () => {
    if (!ta.value.trim() && !V.adjunto) { ta.focus(); tostada('Escribe algo o adjunta una foto'); return; }
    if (conServidor && !V.adjunto) {
      const texto = ta.value.trim(); V.borrador = ''; ta.value = '';
      try { await preguntaServidor(texto); vClaude(); $('#hilo')?.scrollIntoView({ block: 'end' }); }
      catch (e) { V.borrador = texto; tostada('No llego al servidor: ' + e.message); vClaude(); }
      return;
    }
    if (await mandarAClaude(ta.value, V.adjunto)) { V.borrador = ''; V.adjunto = null; vClaude(); }
  });
  $$('[data-charla]').forEach(b => esperaRespuesta(b.dataset.charla));
  if (charla.length) setTimeout(() => $('#hilo')?.lastElementChild?.scrollIntoView({ block: 'nearest' }), 100);
}
// Lo que el cerebro necesita saber para contestar: menú próximo, lo que hay, la lista, pendientes, personas.
function contextoParaClaude() {
  const p = planActivo(), pe = efectivo(p), h = hoy(), s = est(p.id), per = perfiles();
  const plato = v => L.esDoble(v) ? L.QUIEN.map(q => `${NOM[q]}: ${recetas[v[q]]?.n || '—'}`).join(' / ') : v && v.fuera ? 'fuera' : recetas[L.idDe(v)]?.n || (v && v.libre) || '—';
  const { filas } = lineaCompra();
  return {
    hoy: h, semana: p.titulo || p.id,
    menu: pe.dias.filter(d => d.f >= h).slice(0, 3).map(d => ({ dia: d.f, ...Object.fromEntries(L.COMIDAS.map(c => [c, plato(d[c])])) })),
    enCasa: [...Object.keys(E.casa).filter(k => D.productos[k] && E.casa[k] > 0).map(k => `${nombreCorto(D.productos[k])} (${cantidadCasa(k, E.casa[k])})`), ...E.casaOtros],
    lista: filas.filter(f => !s.marcados[f.clave]).slice(0, 40).map(nombreFila),
    pendientesOtroSuper: (E.pendientes || []).map(x => x.n),
    personas: L.QUIEN.map(q => ({ nombre: per[q].nombre, objetivo: obj[q], gusta: per[q].gusta || '', noGusta: per[q].noGusta || '' })),
    recetasPropias: (E.propias || []).map(r => r.n),
  };
}
const esperando = new Set();
async function preguntaServidor(texto) {
  const id = uid();
  E.charla = [...(E.charla || []), { id, q: texto, r: null, t: new Date().toISOString() }].slice(-40); salva();
  const r = await fetch(`${servidor()}/casa/${casaId}/pregunta`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid: id, blob: await cifraSync({ texto, contexto: contextoParaClaude(), cuando: new Date().toISOString() }) }) });
  if (!r.ok) { E.charla = E.charla.filter(c => c.id !== id); salva(); throw new Error('servidor ' + r.status); }
  esperaRespuesta(id);
}
async function esperaRespuesta(id, intentos = 50) {
  if (esperando.has(id)) return; esperando.add(id);
  try {
    for (let i = 0; i < intentos; i++) {
      await new Promise(r => setTimeout(r, 3000));
      const x = (E.charla || []).find(c => c.id === id); if (!x || x.r) return;
      try {
        const r = await fetch(`${servidor()}/casa/${casaId}/respuesta/${id}`, { cache: 'no-store' });
        if (r.status === 200) { const resp = await descifraSync((await r.json()).blob); x.r = resp.texto; x.tr = new Date().toISOString(); salva(); if (V.pestana === 'claude' && !$('.hoja')) vClaude(); return; }
      } catch { /* siguiente intento */ }
    }
  } finally { esperando.delete(id); }
}

async function mandarAClaude(texto, fichero = null) {
  const t = 'Para Claude, desde NutriHome: ' + (texto || '').trim();
  if (fichero) return mandarFoto(fichero, t);
  try { if (navigator.share) { await navigator.share({ text: t }); return true; } } catch { return false; }
  window.open('https://t.me/share/url?url=' + encodeURIComponent(location.origin + location.pathname) + '&text=' + encodeURIComponent(t), '_blank');
  return true;
}

// ——— Órdenes escritas («quita los huevos», «tenemos kéfir»…) ———
function diaDeVoz(d) {
  const p = planActivo(), h = hoy();
  if (!d || d === 'hoy') return h;
  if (d === '+1') return masDias(h, 1);
  if (d === '+2') return masDias(h, 2);
  const idx = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'].indexOf(d);
  return p.dias.find(x => fecha(x.f).getDay() === idx)?.f || h;
}
function recetaDeTexto(texto) {
  let t = texto.replace(/^\s*(nueva receta|receta nueva|añade (una |la )?receta|agrega (una |la )?receta|apunta (una |la )?receta)\s*(de\s+)?[:,.]?\s*/i, '');
  const corte = t.search(/\b(pasos|se hace así|se hace asi|se hace|preparación|preparacion|elaboración|elaboracion)\b\s*:?/i);
  let pasos = '';
  if (corte >= 0) { pasos = t.slice(corte).replace(/^\S+(\s+(así|asi|hace))*\s*:?\s*/i, ''); t = t.slice(0, corte); }
  const m = t.match(/^([^:,]+)[:,]\s*(.*)$/s);
  const n = (m ? m[1] : t).trim(), ing = (m ? m[2] : '').split(/,\s*/).map(x => x.trim()).filter(Boolean).join('\n');
  return { n: n ? capital(n) : '', ing, pasos };
}
function ejecuta(texto) {
  const o = L.interpretar(texto, D.productos), p = planActivo(), pc = planCompra();
  const i = f => p.dias.findIndex(d => d.f === f);
  switch (o.accion) {
    case 'anadir': anadeALista(o.items); if (V.pestana === 'compra') vCompra(); break;
    case 'quitar': {
      const s = est(pc.id), n = [];
      for (const it of o.items) if (it.k) { s.quitados[it.k] = true; s.extra = s.extra.filter(x => x.k !== it.k); n.push(nombreCorto(D.productos[it.k])); }
      salva(); tostada(n.length ? 'Quitado: ' + n.join(', ') : 'No lo encuentro en la lista'); if (V.pestana === 'compra') vCompra(); break;
    }
    case 'casa': if (anadeACasa(o.items) && V.pestana === 'casa') vCasa(); if (V.pestana === 'compra') vCompra(); break;
    case 'comprado': {
      const { s, filas } = lineaCompra(), n = [];
      for (const it of o.items) { const f = filas.find(x => x.k === it.k); if (f) { s.marcados[f.clave] = true; n.push(nombreCorto(D.productos[it.k])); } }
      salva(); tostada(n.length ? '✓ ' + n.join(', ') : 'No está en la lista'); if (V.pestana === 'compra') vCompra(); break;
    }
    case 'fuera': {
      const f = diaDeVoz(o.dia);
      if (i(f) < 0) { tostada('Ese día no está en el menú'); break; }
      est(p.id).cambios[f + '|' + o.comida] = { fuera: true }; salva(); V.dia = f; location.hash = 'semana'; vSemana();
      tostada(`Apuntado: ${L.NOMBRE_COMIDA[o.comida].toLowerCase()} fuera`); break;
    }
    case 'receta': editorReceta(null, false, recetaDeTexto(texto)); break;
    case 'escanear': abrirEscaner(); break;
    default: tostada('No lo he entendido');
  }
}

inicio();
