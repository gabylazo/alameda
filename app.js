// app.js — interfaz de la app: Semana, Compra, En casa, Recetas, Nosotros y el micrófono.
// Los datos (productos de Mercadona, recetas, menú y perfiles) llegan cifrados en datos.enc; lo que cambiáis
// (platos cambiados, lista tachada, lo que hay en casa…) se guarda en este móvil.
import * as L from './logica.js';

const CLAVE = 'alameda.clave', ESTADO = 'alameda.estado.v1';
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const lee = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } };
const guarda = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento: se pierde al cerrar */ } };
const leeTexto = k => { try { return localStorage.getItem(k); } catch { return null; } };
const guardaTexto = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* nada */ } };
const r0 = n => Math.round(n);
const euros = n => n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

let D, E, fac, obj, recetas, NOM = { G: '', P: '' };
const V = { pestana: 'semana', dia: null, filtro: 'todas', busca: '' };

// ——— Fechas ———
const iso = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const hoy = () => iso(new Date());
const fecha = f => new Date(f + 'T12:00:00');
const masDias = (f, n) => { const d = fecha(f); d.setDate(d.getDate() + n); return iso(d); };
const DS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const DL = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const diaLargo = f => { const d = fecha(f); return `${DL[d.getDay()]} ${d.getDate()} de ${MES[d.getMonth()]}`; };

// ——— Iconos ———
const SVG = {
  semana: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  compra: '<svg viewBox="0 0 24 24"><path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
  casa: '<svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M5 10h14M8.5 6.5v1M8.5 13v2.5"/></svg>',
  recetas: '<svg viewBox="0 0 24 24"><path d="M6 4h10a3 3 0 0 1 3 3v13H8a2 2 0 0 1-2-2V4Z"/><path d="M6 18a2 2 0 0 1 2-2h11M10 8h5M10 11h4"/></svg>',
  nosotros: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2"/><circle cx="16.5" cy="9.5" r="2.5"/><path d="M3.5 19c.6-3.2 2.9-5 5.5-5s4.9 1.8 5.5 5M14.5 14.6c.6-.2 1.3-.3 2-.3 2.2 0 3.9 1.5 4.4 4.2"/></svg>',
  micro: '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
};
const PESTANAS = [['semana', 'Semana'], ['compra', 'Compra'], ['casa', 'En casa'], ['recetas', 'Recetas'], ['nosotros', 'Nosotros']];
const APARATO = { airfryer: 'Air fryer', plancha: 'Plancha', micro: 'Micro', sin: 'Sin fuego', batidora: 'Batidora' };

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

// ——— Estado guardado en el móvil ———
function estadoNuevo() { return { v: 1, semanas: {}, planes: [], casa: null, consumidos: {}, creatina: {}, perfiles: {}, gimnasio: null, avisos: {}, fijos: null }; }
const salva = () => guarda(ESTADO, E);
function est(id) {
  if (!E.semanas[id]) E.semanas[id] = { cambios: {}, hechos: {}, marcados: {}, extra: [], quitados: {}, faltaDespensa: id === D.semana.id ? Object.fromEntries((D.semana.falta || []).map(k => [k, true])) : {}, compraHecha: false };
  return E.semanas[id];
}
function perfiles() {
  const p = JSON.parse(JSON.stringify(D.perfiles));
  for (const q of L.QUIEN) Object.assign(p[q], E.perfiles[q] || {});
  const gym = E.gimnasio ?? p.gimnasio;
  if (gym) for (const q of L.QUIEN) p[q].actividad = Math.max(p[q].actividad, 1.45);
  return p;
}
function recalcula() { const p = perfiles(); fac = L.factores(p); obj = { G: L.objetivos(p.G), P: L.objetivos(p.P) }; NOM = { G: p.G.nombre || 'G', P: p.P.nombre || 'P' }; }

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

// Lo que se ha comido sale de «En casa»: al marcar «Hecho» o, si no se marca, al pasar el día.
function descuentaReceta(r) {
  if (!r) return;
  for (const ing of r.ing) for (const q of L.QUIEN) {
    const g = L.gramos(ing, q, fac);
    if (g && E.casa[ing[0]] != null) E.casa[ing[0]] = Math.max(0, E.casa[ing[0]] - g);
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
        descuentaReceta(recetas[L.idDe(d[c])]);
      }
    }
  }
  salva();
}

// ——— Arranque ———
async function inicio() {
  E = Object.assign(estadoNuevo(), lee(ESTADO, {}));
  const m = location.hash.match(/^#clave=(.+)$/);
  if (m) { guardaTexto(CLAVE, decodeURIComponent(m[1])); history.replaceState(null, '', location.pathname); }
  const clave = leeTexto(CLAVE);
  if (!clave) return puerta();
  try { D = await descifra(clave); }
  catch (e) { if (e.message === 'clave') { guardaTexto(CLAVE, null); return puerta('Esa clave no abre los datos. Vuelve a escribirla.'); } return puerta(e.message); }
  recetas = Object.fromEntries(D.recetas.map(r => [r.id, r]));
  if (!E.casa) E.casa = { ...(D.casa_inicial || {}) };
  if (!E.fijos) E.fijos = [...(D.fijos || [])];
  recalcula();
  consumePasados();
  pintaMarco();
  window.addEventListener('hashchange', () => { V.pestana = (location.hash.slice(1) || 'semana').split('/')[0]; pinta(); });
  V.pestana = PESTANAS.some(([k]) => k === location.hash.slice(1)) ? location.hash.slice(1) : 'semana';
  pinta();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}

function puerta(error = '') {
  document.body.innerHTML = `
    <div class="puerta">
      <img class="logo" src="iconos/icono-192.png" alt="">
      <h1>Alameda</h1>
      <p>La app de nuestra cocina. Escribe la clave de casa para abrirla; solo se pide una vez en cada móvil.</p>
      <form id="f-clave"><label class="sr" for="clave">Clave de casa</label>
        <input id="clave" type="text" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="clave de casa" required>
        <div class="error">${esc(error)}</div>
        <button class="boton principal" style="width:100%;justify-content:center">Entrar</button></form>
    </div>`;
  $('#f-clave').addEventListener('submit', e => { e.preventDefault(); guardaTexto(CLAVE, $('#clave').value.trim().toLowerCase()); location.reload(); });
}

function pintaMarco() {
  document.body.innerHTML = `
    <header class="cabecera" id="cab"></header>
    <main id="vista"></main>
    <button class="micro" id="b-micro" aria-label="Hablar o escribir">${SVG.micro}</button>
    <nav class="pestanas" aria-label="Secciones"><div class="dentro">
      ${PESTANAS.map(([k, t]) => `<button data-p="${k}">${SVG[k]}<span>${t}</span></button>`).join('')}
    </div></nav>
    <div class="tostada" id="tostada" role="status"></div>`;
  document.querySelectorAll('.pestanas button').forEach(b => b.addEventListener('click', () => { location.hash = b.dataset.p; }));
  $('#b-micro').addEventListener('click', abrirMicro);
}

function pinta() {
  document.querySelectorAll('.pestanas button').forEach(b => b.setAttribute('aria-current', b.dataset.p === V.pestana ? 'page' : 'false'));
  const f = { semana: vSemana, compra: vCompra, casa: vCasa, recetas: vRecetas, nosotros: vNosotros }[V.pestana] || vSemana;
  f();
  window.scrollTo({ top: 0 });
}
const cabecera = (titulo, sub = '') => { $('#cab').innerHTML = `<div class="marca">Alameda · Cocina</div><h1>${titulo}</h1>${sub ? `<div class="sub">${sub}</div>` : ''}`; };

let tTostada;
function tostada(txt) { const t = $('#tostada'); t.textContent = txt; t.classList.add('visible'); clearTimeout(tTostada); tTostada = setTimeout(() => t.classList.remove('visible'), 2600); }

// ——— Hoja inferior ———
function hoja(html, alAbrir) {
  cierraHoja();
  const fondo = document.createElement('div'); fondo.className = 'fondo-hoja';
  const h = document.createElement('div'); h.className = 'hoja'; h.setAttribute('role', 'dialog'); h.setAttribute('aria-modal', 'true');
  h.innerHTML = `<div class="asa"></div><button class="cerrar" aria-label="Cerrar">×</button>${html}`;
  document.body.append(fondo, h);
  requestAnimationFrame(() => { fondo.classList.add('abierto'); h.classList.add('abierta'); });
  fondo.addEventListener('click', cierraHoja); h.querySelector('.cerrar').addEventListener('click', cierraHoja);
  if (alAbrir) alAbrir(h);
  return h;
}
function cierraHoja() {
  document.querySelectorAll('.hoja, .fondo-hoja').forEach(el => { el.classList.remove('abierta', 'abierto'); setTimeout(() => el.remove(), 250); });
  if (window.__rec) { try { window.__rec.abort(); } catch { /* nada */ } window.__rec = null; }
}

// ——— Semana ———
function vSemana() {
  const p = planActivo(), pe = efectivo(p), s = est(p.id), h = hoy();
  const ultimo = p.dias.at(-1).f;
  if (!V.dia || !p.dias.some(d => d.f === V.dia)) V.dia = p.dias.find(d => d.f === h)?.f || (h < p.dias[0].f ? p.dias[0].f : p.dias.at(-1).f);
  const i = pe.dias.findIndex(d => d.f === V.dia), d = pe.dias[i];
  cabecera('Semana', `${esc(p.titulo || 'Menú de la semana')}`);
  const banners = [];
  if (h > ultimo) banners.push(`<div class="aviso"><div><b>Esta semana ya ha terminado.</b> ¿Preparo la siguiente con vuestras recetas? Después la podéis cambiar plato a plato.<div class="botones" style="margin-top:8px"><button class="boton principal" id="b-siguiente">Preparar la siguiente semana</button></div></div></div>`);
  if (!s.compraHecha && h <= p.dias[1].f) banners.push(`<div class="aviso"><div><b>Toca compra.</b> La lista ya está hecha con este menú. <a href="#compra">Ver la lista</a>.</div></div>`);
  const consejo = consejosDia(pe, i);
  const tarjetas = L.COMIDAS.map(c => tarjetaComida(p, d, i, c, s)).join('');
  const tot = q => L.totalesDia(d, q, recetas, D.productos, fac);
  const barra = (q, t) => {
    const o = obj[q], pk = Math.min(100, t.kcal / o.kcal * 100), pp = Math.min(100, t.p / o.prot * 100);
    return `<div class="total-persona"><div class="quien ${q === 'G' ? 'persona-g' : 'persona-p'}">${esc(NOM[q])} <span>${r0(t.kcal)} / ${o.kcal} kcal · ${r0(t.p)} / ${o.prot} g prot</span></div>
      <div class="barra ${q.toLowerCase()}"><i style="width:${pk}%"></i></div><div class="barra ${q.toLowerCase()}" style="margin-top:4px;height:5px"><i style="width:${pp}%;opacity:.6"></i></div></div>`;
  };
  const tG = tot('G'), tP = tot('P');
  const faltaG = obj.G.kcal - tG.kcal, faltaP = obj.P.kcal - tP.kcal;
  const pista = tG.fuera ? '<div class="nota">Lo que comáis fuera no cuenta aquí. Fuera, mejor plancha y ensalada; no hace falta compensar después.</div>'
    : tG.libre ? '<div class="nota">Lo que no tiene plato puesto no cuenta en estas barras.</div>'
    : (faltaG > 150 || faltaP > 200) ? `<div class="nota">Hoy os quedáis algo cortos (${faltaG > 150 ? `${esc(NOM.G)} ~${r0(faltaG / 10) * 10} kcal` : ''}${faltaG > 150 && faltaP > 200 ? ', ' : ''}${faltaP > 200 ? `${esc(NOM.P)} ~${r0(faltaP / 10) * 10} kcal` : ''}): una fruta o un puñado de almendras (20 g) para picar.</div>` : '';
  $('#vista').innerHTML = `
    ${banners.join('')}
    <div class="dias" role="tablist">${pe.dias.map(x => { const dd = fecha(x.f); return `<button class="dia-btn${x.f === h ? ' hoy' : ''}" data-f="${x.f}" aria-pressed="${x.f === V.dia}"><span class="ds">${DS[dd.getDay()]}</span><span class="dn">${dd.getDate()}</span></button>`; }).join('')}</div>
    <div class="seccion"><h2>${diaLargo(d.f)[0].toUpperCase() + diaLargo(d.f).slice(1)}</h2><span class="mini">${d.f === h ? 'hoy' : ''}</span></div>
    ${consejo}
    ${tarjetas}
    <div class="tarjeta totales"><div class="seccion" style="margin:0 0 6px"><h2 style="font-size:16px">Lo de hoy</h2><span class="mini">kcal y proteína</span></div>${barra('G', tG)}${barra('P', tP)}${pista}</div>
    <div class="botones" style="margin:6px 0 18px"><button class="boton" id="b-proponer">Proponer otra semana</button></div>`;
  document.querySelectorAll('.dia-btn').forEach(b => b.addEventListener('click', () => { V.dia = b.dataset.f; vSemana(); }));
  document.querySelectorAll('[data-abrir]').forEach(b => b.addEventListener('click', () => abrirReceta(b.dataset.abrir, { plan: p.id, f: b.dataset.f, c: b.dataset.c })));
  document.querySelectorAll('[data-cambiar]').forEach(b => b.addEventListener('click', () => abrirCambiar(p, i, b.dataset.cambiar)));
  document.querySelectorAll('[data-fuera]').forEach(b => b.addEventListener('click', () => alternaFuera(p, d.f, b.dataset.fuera)));
  document.querySelectorAll('[data-hecho]').forEach(b => b.addEventListener('click', () => alternaHecho(p, d.f, b.dataset.hecho)));
  $('#b-proponer').addEventListener('click', () => proponer(p));
  $('#b-siguiente')?.addEventListener('click', siguienteSemana);
}

function tarjetaComida(p, d, i, c, s) {
  const v = d[c], clave = d.f + '|' + c, r = recetas[L.idDe(v)];
  const cab = `<div class="arriba"><span class="momento">${L.NOMBRE_COMIDA[c]}</span>${r ? `<span class="meta">${APARATO[r.ap] || ''} · ${r.min} min</span>` : ''}</div>`;
  if (v && v.fuera) return `<article class="tarjeta comida fuera">${cab}<div class="nombre">Coméis fuera</div><div class="acciones"><button data-fuera="${c}" aria-pressed="true">Fuera</button><button data-cambiar="${c}">Poner un plato</button></div></article>`;
  if (!r) return `<article class="tarjeta comida fuera">${cab}<div class="nombre">${esc(v && v.libre ? v.libre : 'Sin plato')}</div><div class="acciones"><button data-cambiar="${c}">Poner un plato</button><button data-fuera="${c}">Fuera</button></div></article>`;
  const mg = L.macrosReceta(r, 'G', D.productos, fac), mp = L.macrosReceta(r, 'P', D.productos, fac);
  const hecho = !!s.hechos[clave];
  return `<article class="tarjeta comida${hecho ? ' hecha' : ''}">${cab}
    <button class="nombre" data-abrir="${r.id}" data-f="${d.f}" data-c="${c}">${esc(r.n)}</button>
    ${r.sub ? `<div class="subt">${esc(r.sub)}</div>` : ''}
    <div class="raciones"><span class="persona-g"><b>${esc(NOM.G)}</b> ${r0(mg.kcal)} kcal · ${r0(mg.p)} g prot</span><span class="persona-p"><b>${esc(NOM.P)}</b> ${r0(mp.kcal)} kcal · ${r0(mp.p)} g prot</span></div>
    <div class="acciones"><button data-hecho="${c}" aria-pressed="${hecho}">${hecho ? 'Hecho ✓' : 'Hecho'}</button><button data-cambiar="${c}">Cambiar</button><button data-fuera="${c}">Fuera</button></div>
  </article>`;
}

// Consejos de congelador: lo fresco que se usa a partir del cuarto día, al congelador al llegar;
// y la noche antes, sacar lo que toque.
const PROTE_FRESCA = ['Carne', 'Marisco y pescado'];
function usosPorProducto(pe) {
  const usos = {};
  pe.dias.forEach((d, i) => L.COMIDAS.forEach(c => {
    const r = recetas[L.idDe(d[c])];
    if (r) for (const ing of r.ing) (usos[ing[0]] ||= []).push({ i, f: d.f, c, r });
  }));
  return usos;
}
const PESCADO_CONGELADO = /salm|merluza/i;   // viene congelado y hay que descongelarlo en la nevera (las gambas, no)
function consejosDia(pe, i) {
  const usos = usosPorProducto(pe), partes = [];
  const fresca = k => PROTE_FRESCA.includes(D.productos[k]?.cat);
  const nombre = k => nombreCorto(D.productos[k]).toLowerCase();
  if (i === 0) {
    const cong = Object.entries(usos).filter(([k]) => fresca(k)).map(([k, u]) => {
      const tarde = [...new Set(u.filter(v => v.i >= 3).map(v => DL[fecha(v.f).getDay()]))];
      return tarde.length ? `${nombre(k)} (${u[0].i >= 3 ? 'es' : 'la parte'} para el ${tarde.join(' y el ')})` : null;
    }).filter(Boolean);
    if (cong.length) partes.push(`<b>Al llegar de la compra, al congelador:</b> ${esc(cong.join('; '))}. La noche antes, a la nevera.`);
  }
  if (pe.dias[i + 1]) {
    const sacar = Object.entries(usos).filter(([k, u]) => u.some(v => v.i === i + 1) &&
      ((D.productos[k].cat === 'Congelados' && PESCADO_CONGELADO.test(D.productos[k].n)) || (fresca(k) && i + 1 >= 3))).map(([k]) => nombre(k));
    if (sacar.length) partes.push(`<b>Esta noche:</b> pasa del congelador a la nevera ${esc(sacar.join(' y '))}, que ${sacar.length > 1 ? "son" : "es"} para mañana.`);
  }
  return partes.map(t => `<div class="aviso"><div>${t}</div></div>`).join('');
}

function alternaFuera(p, f, c) {
  const s = est(p.id), k = f + '|' + c, actual = efectivo(p).dias.find(d => d.f === f)[c];
  if (actual && actual.fuera) { const orig = p.dias.find(d => d.f === f)[c]; if (orig && orig.fuera) s.cambios[k] = null; else delete s.cambios[k]; }
  else s.cambios[k] = { fuera: true };
  salva(); vSemana();
}
function alternaHecho(p, f, c) {
  const s = est(p.id), k = f + '|' + c, ck = p.id + '|' + k;
  if (s.hechos[k]) { delete s.hechos[k]; tostada('Desmarcado'); }
  else {
    s.hechos[k] = 1;
    if (!E.consumidos[ck]) { E.consumidos[ck] = 1; descuentaReceta(recetas[L.idDe(efectivo(p).dias.find(d => d.f === f)[c])]); }
    tostada('¡Hecho! Descontado de «En casa»');
  }
  salva(); vSemana();
}
function proponer(p) {
  if (!confirm('¿Cambio todos los platos de la semana por otra propuesta? Lo que esté marcado como «fuera» se queda igual.')) return;
  const s = est(p.id), pe = efectivo(p);
  const nuevo = L.proponerSemana(pe, recetas, D.productos, fac, obj.G);
  for (const d of nuevo.dias) for (const c of L.COMIDAS) {
    const orig = pe.dias.find(x => x.f === d.f)[c];
    if (typeof orig === 'string' || orig === null) s.cambios[d.f + '|' + c] = d[c];
  }
  salva(); vSemana(); tostada('Semana nueva propuesta');
}
function siguienteSemana() {
  const ult = planActivo(), inicio = masDias(ult.dias.at(-1).f, 1);
  const dias = Array.from({ length: 7 }, (_, n) => {
    const f = masDias(inicio, n), dow = fecha(f).getDay(), d = { f };
    for (const c of L.COMIDAS) d[c] = null;
    if (dow === 0) d.comida = { fuera: true };
    if (dow === 5) d.cena = { fuera: true };
    return d;
  });
  const base = { id: inicio, titulo: `Semana del ${fecha(inicio).getDate()} de ${MES[fecha(inicio).getMonth()]}`, dias };
  const plan = L.proponerSemana(base, recetas, D.productos, fac, obj.G);
  E.planes = [...E.planes.filter(x => x.id !== plan.id), plan];
  V.dia = inicio; salva(); vSemana(); tostada('Semana preparada');
}

function abrirCambiar(p, i, c) {
  const pe = efectivo(p), d = pe.dias[i];
  const alts = L.alternativas(pe, i, c, recetas, D.productos, fac, obj.G);
  hoja(`<h2>Cambiar ${L.NOMBRE_COMIDA[c].toLowerCase()}</h2><div class="nota">${diaLargo(d.f)}. Primero, los que mejor encajan con el resto de la semana.</div>
    ${alts.map(r => { const g = L.macrosReceta(r, 'G', D.productos, fac), q = L.macrosReceta(r, 'P', D.productos, fac);
      return `<button class="alternativa" data-id="${r.id}"><div class="nombre">${esc(r.n)}</div><div class="meta">${APARATO[r.ap]} · ${r.min} min · ${esc(NOM.G)} ${r0(g.kcal)} kcal, ${r0(g.p)} g prot · ${esc(NOM.P)} ${r0(q.kcal)} kcal</div></button>`; }).join('')}
    <div class="botones" style="margin-top:10px"><button class="boton" data-otro="fuera">Coméis fuera</button><button class="boton" data-otro="libre">Lo que haya en casa</button></div>`, h => {
    h.querySelectorAll('[data-id]').forEach(b => b.addEventListener('click', () => { est(p.id).cambios[d.f + '|' + c] = b.dataset.id; salva(); cierraHoja(); vSemana(); tostada('Plato cambiado'); }));
    h.querySelectorAll('[data-otro]').forEach(b => b.addEventListener('click', () => {
      est(p.id).cambios[d.f + '|' + c] = b.dataset.otro === 'fuera' ? { fuera: true } : { libre: 'Lo que haya en casa' };
      salva(); cierraHoja(); vSemana();
    }));
  });
}

// ——— Receta ———
function abrirReceta(id, ctx) {
  const r = recetas[id];
  if (!r) return;
  const mg = L.macrosReceta(r, 'G', D.productos, fac), mp = L.macrosReceta(r, 'P', D.productos, fac);
  const filas = r.ing.map(ing => {
    const x = D.productos[ing[0]], g = L.gramos(ing, 'G', fac), q = L.gramos(ing, 'P', fac);
    return `<tr><td>${esc(nombreCorto(x))}</td><td class="c persona-g">${g ? esc(L.cantidadTexto(ing[0], g, D.productos)) : '—'}</td><td class="c persona-p">${q ? esc(L.cantidadTexto(ing[0], q, D.productos)) : '—'}</td></tr>`;
  }).join('');
  const m = (t, q, x) => `<div class="m ${q}"><b>${t}</b>${r0(x.kcal)} kcal · ${r0(x.p)} g prot<br>${r0(x.hc)} g hidratos · ${r0(x.g)} g grasa<br><span class="nota">${euros(x.coste)} por ración</span></div>`;
  const planes = planActivo();
  hoja(`<h2>${esc(r.n)}</h2>${r.sub ? `<div class="nota">${esc(r.sub)}</div>` : ''}
    <div class="botones" style="margin:10px 0 2px"><span class="etiqueta verde">${APARATO[r.ap]}</span><span class="etiqueta">${r.min} min</span>${r.ens ? '<span class="etiqueta">Con ensalada</span>' : ''}</div>
    <table class="ingredientes"><thead><tr><th>Ingrediente</th><th class="persona-g">${esc(NOM.G)}</th><th class="persona-p">${esc(NOM.P)}</th></tr></thead><tbody>${filas}</tbody></table>
    <div class="macros">${m(esc(NOM.G), 'g', mg)}${m(esc(NOM.P), 'p', mp)}</div>
    <h3 style="margin-top:14px">Cómo se hace</h3><ol class="pasos">${r.pasos.map(x => `<li>${esc(x)}</li>`).join('')}</ol>
    ${r.nota ? `<div class="aviso"><div>${esc(r.nota)}</div></div>` : ''}
    ${ctx ? '' : `<h3 style="margin-top:14px">Ponerla en el menú</h3><div class="botones" style="margin-top:8px">
      <select id="s-dia" class="boton">${planes.dias.map(d => `<option value="${d.f}">${DS[fecha(d.f).getDay()]} ${fecha(d.f).getDate()}</option>`).join('')}</select>
      <select id="s-com" class="boton">${r.tipo.map(c => `<option value="${c}">${L.NOMBRE_COMIDA[c]}</option>`).join('')}</select>
      <button class="boton principal" id="b-poner">Poner</button></div>`}
    <div class="nota" style="margin-top:12px">Valores aproximados: etiquetas de Mercadona, Open Food Facts y tablas de referencia para lo fresco.</div>`, h => {
    h.querySelector('#b-poner')?.addEventListener('click', () => {
      est(planes.id).cambios[h.querySelector('#s-dia').value + '|' + h.querySelector('#s-com').value] = r.id;
      salva(); cierraHoja(); tostada('Puesta en el menú');
    });
  });
}
const nombreCorto = x => x.n.replace(/ Hacendado| ultracongelad[oa]s?| lavad[oa]s?| IGP/g, '').replace(/\s+/g, ' ');

// ——— Compra ———
function lineaCompra() {
  const p = planActivo(), s = est(p.id), h = hoy();
  const nec = L.necesidades(efectivo(p), recetas, fac, h > p.dias[0].f ? h : null);
  for (const f of E.fijos) if (f.k && D.productos[f.k]) nec[f.k] = (nec[f.k] || 0) + (f.n || 1) * D.productos[f.k].util;
  const { filas, despensa, total } = L.listaCompra(nec, D.productos, E.casa || {});
  const vistas = filas.filter(f => !s.quitados[f.k]).map(f => ({ ...f, clave: f.k, fijo: E.fijos.some(x => x.k === f.k) }));
  for (const k of Object.keys(s.faltaDespensa)) if (s.faltaDespensa[k] && D.productos[k]) vistas.push({ k, clave: k, envases: 1, precio: D.productos[k].precio, despensa: true });
  for (const x of s.extra) {
    const enLista = x.k && vistas.find(v => v.k === x.k);
    if (enLista) { enLista.envases += x.n || 1; enLista.precio += (x.n || 1) * D.productos[x.k].precio; (enLista.extras ||= []).push(x.id); continue; }
    vistas.push(x.k ? { k: x.k, clave: 'x:' + x.id, envases: x.n || 1, precio: (x.n || 1) * D.productos[x.k].precio, extra: x.id }
      : { k: null, clave: 'x:' + x.id, texto: x.texto, n: x.n, extra: x.id });
  }
  for (const f of E.fijos) if (!f.k && !(s.fijosHechos || {})['f:' + f.texto]) vistas.push({ k: null, clave: 'f:' + f.texto, texto: f.texto, fijo: true });
  vistas.sort((a, b) => ((a.k ? D.productos[a.k].orden : 98) - (b.k ? D.productos[b.k].orden : 98)) || (a.k ? D.productos[a.k].n : a.texto).localeCompare(b.k ? D.productos[b.k].n : b.texto, 'es'));
  const quitar = Object.keys(s.quitados).filter(k => s.quitados[k]);
  return { p, s, filas: vistas, despensa: despensa.filter(f => !s.faltaDespensa[f.k]), total: vistas.reduce((t, f) => t + (f.precio || 0), 0), totalMenu: total, quitados: quitar };
}

function vCompra() {
  const { p, s, filas, despensa, total, quitados } = lineaCompra();
  const hechos = filas.filter(f => s.marcados[f.clave]).length;
  cabecera('Compra', `Mercadona · ${esc(p.titulo || '')}`);
  let cat = '', html = '';
  for (const f of filas) {
    const x = f.k ? D.productos[f.k] : null, c = x ? x.cat : 'Otros';
    if (c !== cat) { if (cat) html += '</div>'; cat = c; html += `<div class="cat"><span>${esc(c)}</span></div><div class="lista">`; }
    const marcado = !!s.marcados[f.clave];
    html += `<div class="producto${marcado ? ' marcado' : ''}" data-clave="${esc(f.clave)}">
      <button class="check" data-marca="${esc(f.clave)}" aria-label="${marcado ? 'Desmarcar' : 'En el carro'}">${SVG.check}</button>
      ${x && x.foto ? `<img src="${esc(x.foto)}" alt="" loading="lazy" width="46" height="46">` : '<div class="sinfoto">🛒</div>'}
      <button class="info" data-info="${esc(f.clave)}"><div class="pn">${esc(x ? x.n : f.texto)}</div><div class="pc">${x ? esc(L.cantidadCompra(f, D.productos)) : (f.n && f.n !== 1 ? f.n + ' · ' : '') + (f.fijo ? 'apuntado a mano' : 'añadido a mano')}${f.fijo ? ' · lo de siempre' : ''}${f.despensa ? ' · despensa' : ''}</div></button>
      <div class="pp">${f.precio ? euros(f.precio) : ''}</div></div>`;
  }
  if (cat) html += '</div>';
  $('#vista').innerHTML = `
    ${E.avisos.ticket ? '' : `<div class="aviso"><div><b>En caja, pedid el ticket digital:</b> dad vuestro móvil y os escribirán por WhatsApp para pedir el correo. Así llega el ticket al correo y la app sabe lo que habéis comprado.</div><button class="cerrar-aviso" id="b-aviso-ticket" aria-label="Cerrar aviso">×</button></div>`}
    <div class="tarjeta resumen-compra"><div><div class="grande">${euros(total)}</div><div class="nota">aprox. · ${filas.length} productos</div></div>
      <div class="progreso"><div class="nota" style="text-align:right">${hechos} de ${filas.length} en el carro</div><div class="barra"><i style="width:${filas.length ? hechos / filas.length * 100 : 0}%;background:var(--acento)"></i></div></div></div>
    <form class="anadir" id="f-anadir"><input id="i-anadir" placeholder="Añadir: huevos, aguacates…" autocomplete="off" enterkeyhint="done"><button class="boton principal">Añadir</button></form>
    ${html || '<div class="vacio">No falta nada para el menú de esta semana.</div>'}
    ${despensa.length ? `<div class="cat"><span>¿Os queda?</span></div><div class="nota" style="margin-bottom:8px">Básicos que usan las recetas. Toca lo que falte y pasa a la lista.</div>
      <div class="botones">${despensa.map(f => `<button class="chip" data-falta="${f.k}">${esc(nombreCorto(D.productos[f.k]))}</button>`).join('')}</div>` : ''}
    ${quitados.length ? `<div class="nota" style="margin-top:14px">Quitados de la lista: ${quitados.map(k => `<button class="chip" data-volver="${k}">${esc(nombreCorto(D.productos[k] || { n: k }))} ↺</button>`).join(' ')}</div>` : ''}
    <div class="botones" style="margin:18px 0 6px">
      <button class="boton principal" id="b-a-casa"${hechos ? '' : ' disabled'}>Pasar lo comprado a «En casa»</button>
      <button class="boton" id="b-compartir">Compartir lista</button>
      <label class="boton" for="i-foto">Foto del ticket o de una lista</label><input id="i-foto" type="file" accept="image/*" class="sr">
    </div>
    <div class="nota" style="margin-bottom:18px">La foto se manda a Claude por Telegram (al bot @${esc(D.perfiles.bot || '')}): la lee y mete en la app lo que hayáis comprado.</div>`;
  $('#b-aviso-ticket')?.addEventListener('click', () => { E.avisos.ticket = 1; salva(); vCompra(); });
  document.querySelectorAll('[data-marca]').forEach(b => b.addEventListener('click', () => { const k = b.dataset.marca; s.marcados[k] = !s.marcados[k]; salva(); vCompra(); }));
  document.querySelectorAll('[data-info]').forEach(b => b.addEventListener('click', () => infoProducto(b.dataset.info, filas.find(f => f.clave === b.dataset.info))));
  document.querySelectorAll('[data-falta]').forEach(b => b.addEventListener('click', () => { s.faltaDespensa[b.dataset.falta] = true; salva(); vCompra(); tostada('Añadido a la lista'); }));
  document.querySelectorAll('[data-volver]').forEach(b => b.addEventListener('click', () => { delete s.quitados[b.dataset.volver]; salva(); vCompra(); }));
  $('#f-anadir').addEventListener('submit', e => { e.preventDefault(); const t = $('#i-anadir').value.trim(); if (t) { anadeALista([L.buscaProducto(t, D.productos)]); vCompra(); } });
  $('#b-a-casa').addEventListener('click', () => pasarACasa(filas));
  $('#b-compartir').addEventListener('click', () => compartirLista(filas));
  $('#i-foto').addEventListener('change', e => mandarFoto(e.target.files[0]));
}

function infoProducto(clave, f) {
  const { p, s } = lineaCompra();
  const k = f && f.k, x = k && D.productos[k];
  const usos = k ? (usosPorProducto(efectivo(p))[k] || []) : [];
  hoja(`<h2>${esc(x ? x.n : f.texto)}</h2>
    ${x ? `<div class="nota">${esc(x.env)} · ${euros(x.precio)}${x.aprox ? ' (peso aproximado)' : ''}</div>
      <p>${f.falta ? `El menú pide unos ${r0(f.falta)} g; con ${esc(L.cantidadCompra(f, D.productos))} sobran unos ${r0(f.sobra)} g, que pasan a «En casa».` : ''}</p>
      ${usos.length ? `<h3>Para</h3><ul class="lista-simple">${usos.map(u => `<li>${DS[fecha(u.f).getDay()]} ${fecha(u.f).getDate()} · ${L.NOMBRE_COMIDA[u.c].toLowerCase()}: ${esc(u.r.n)}</li>`).join('')}</ul>` : ''}
      <div class="nota">Por 100 g: ${x.m[0]} kcal · ${x.m[1]} g prot · ${x.m[2]} g hidratos · ${x.m[3]} g grasa (${esc(x.fm)}).</div>` : ''}
    <div class="botones" style="margin-top:14px">
      ${k && !f.extra ? `<button class="boton" id="b-quitar">Quitar de la lista</button>` : ''}
      ${f.extra ? `<button class="boton" id="b-borrar-extra">Quitar</button>` : ''}
      ${k ? `<button class="boton" id="b-fijo">${E.fijos.some(y => y.k === k) ? 'Quitar de «lo de siempre»' : 'Añadir a «lo de siempre»'}</button>` : ''}
    </div>`, h => {
    h.querySelector('#b-quitar')?.addEventListener('click', () => { s.quitados[k] = true; salva(); cierraHoja(); vCompra(); tostada('Quitado de la lista'); });
    h.querySelector('#b-borrar-extra')?.addEventListener('click', () => { s.extra = s.extra.filter(y => y.id !== f.extra); salva(); cierraHoja(); vCompra(); });
    h.querySelector('#b-fijo')?.addEventListener('click', () => {
      E.fijos = E.fijos.some(y => y.k === k) ? E.fijos.filter(y => y.k !== k) : [...E.fijos, { k, n: 1 }];
      salva(); cierraHoja(); vCompra(); tostada('Hecho');
    });
  });
}

function anadeALista(items) {
  const { s } = lineaCompra(), nombres = [];
  for (const it of items) {
    if (!it || (!it.k && !it.texto)) continue;
    if (it.k) delete s.quitados[it.k];
    s.extra.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), k: it.k, texto: it.texto, n: it.n && it.k ? Math.max(1, Math.round(it.n)) : it.n || 1 });
    nombres.push(it.k ? nombreCorto(D.productos[it.k]) : it.texto);
  }
  salva();
  if (nombres.length) tostada('Añadido: ' + nombres.join(', '));
}

function pasarACasa(filas) {
  const { s } = lineaCompra();
  let n = 0;
  for (const f of filas) {
    if (!s.marcados[f.clave] || !f.k) continue;
    const x = D.productos[f.k];
    E.casa[f.k] = (E.casa[f.k] || 0) + f.envases * x.util; n++;
    if (f.extra) s.extra = s.extra.filter(y => y.id !== f.extra);
    if (f.extras) s.extra = s.extra.filter(y => !f.extras.includes(y.id));
    if (f.despensa) delete s.faltaDespensa[f.k];
  }
  for (const f of filas) {
    if (!s.marcados[f.clave] || f.k) continue;
    if (f.extra) s.extra = s.extra.filter(y => y.id !== f.extra);
    if (f.fijo) (s.fijosHechos ||= {})[f.clave] = true;
  }
  s.marcados = {}; s.compraHecha = true; salva();
  tostada(`${n} productos pasados a «En casa»`);
  location.hash = 'casa';
}

async function compartirLista(filas) {
  const { s } = lineaCompra();
  let cat = '', txt = 'Lista de la compra (Mercadona)\n';
  for (const f of filas) {
    if (s.marcados[f.clave]) continue;
    const x = f.k ? D.productos[f.k] : null, c = x ? x.cat : 'Otros';
    if (c !== cat) { cat = c; txt += `\n${c}\n`; }
    txt += `☐ ${x ? `${x.n} — ${L.cantidadCompra(f, D.productos)}` : f.texto}\n`;
  }
  try { if (navigator.share) { await navigator.share({ title: 'Lista de la compra', text: txt }); return; } } catch { return; }
  try { await navigator.clipboard.writeText(txt); tostada('Lista copiada: pégala en WhatsApp'); } catch { tostada('No he podido compartirla'); }
}

async function mandarFoto(fichero) {
  if (!fichero) return;
  const texto = 'Para Claude: foto de la compra o de una lista. Métela en la app.';
  try {
    if (navigator.canShare && navigator.canShare({ files: [fichero] })) { await navigator.share({ files: [fichero], text: texto }); tostada('Elige Telegram y el chat con @' + (D.perfiles.bot || 'el bot')); return; }
  } catch { return; }
  hoja(`<h2>Mandar la foto</h2><p>Este móvil no deja compartir fotos desde la app. Mándala tú al bot de Telegram <b>@${esc(D.perfiles.bot || '')}</b> y la meto yo.</p>
    <a class="boton principal" href="https://t.me/${esc(D.perfiles.bot || '')}" target="_blank" rel="noopener">Abrir Telegram</a>`);
}

// ——— En casa ———
const LUGAR = k => {
  const c = D.productos[k]?.cat;
  if (c === 'Congelados') return 'Congelador';
  if (c === 'Fruta y verdura') return 'Fruta y verdura';
  if (['Carne', 'Marisco y pescado', 'Charcutería y quesos', 'Huevos, leche y mantequilla', 'Postres y yogures'].includes(c)) return 'Nevera';
  return 'Despensa';
};
function vCasa() {
  cabecera('En casa', 'Lo que tenéis: se descuenta de la lista de la compra');
  const items = Object.entries(E.casa).filter(([k, g]) => D.productos[k] && g > 0);
  const grupos = {};
  for (const [k, g] of items) (grupos[LUGAR(k)] ||= []).push([k, g]);
  const orden = ['Nevera', 'Fruta y verdura', 'Congelador', 'Despensa'];
  $('#vista').innerHTML = `
    <form class="anadir" id="f-casa"><input id="i-casa" placeholder="Tenemos… (huevos, arroz…)" autocomplete="off" enterkeyhint="done"><button class="boton principal">Añadir</button></form>
    <div class="nota">Lo de En casa se gasta solo: al marcar un plato como «Hecho», o al pasar el día si no lo marcáis.</div>
    ${items.length ? orden.filter(o => grupos[o]).map(o => `<div class="cat"><span>${o}</span><span>${grupos[o].length}</span></div><div class="lista">
      ${grupos[o].sort((a, b) => D.productos[a[0]].n.localeCompare(D.productos[b[0]].n, 'es')).map(([k, g]) => `<div class="casa-item">
        ${D.productos[k].foto ? `<img src="${esc(D.productos[k].foto)}" alt="" loading="lazy" width="40" height="40" style="width:40px;height:40px;border-radius:9px;border:1px solid var(--linea);object-fit:cover;background:#fff">` : ''}
        <div class="info"><div class="pn" style="font-weight:620">${esc(nombreCorto(D.productos[k]))}</div><div class="nota">${esc(cantidadCasa(k, g))}</div></div>
        <div class="mas-menos"><button data-menos="${k}" aria-label="Menos">−</button><button data-mas="${k}" aria-label="Más">+</button></div></div>`).join('')}</div>`).join('')
      : '<div class="vacio">Todavía no hay nada apuntado. Al volver de la compra, en la lista: «Pasar lo comprado a En casa».</div>'}
    <div class="nota" style="margin:16px 0">El Huel y la creatina no se apuntan aquí: están en «Nosotros».</div>`;
  const paso = k => { const x = D.productos[k]; return x.gud || Math.max(10, Math.round(x.util / 4 / 10) * 10); };
  document.querySelectorAll('[data-menos]').forEach(b => b.addEventListener('click', () => { const k = b.dataset.menos; E.casa[k] = Math.max(0, (E.casa[k] || 0) - paso(k)); if (E.casa[k] <= 0.5) delete E.casa[k]; salva(); vCasa(); }));
  document.querySelectorAll('[data-mas]').forEach(b => b.addEventListener('click', () => { const k = b.dataset.mas; E.casa[k] = (E.casa[k] || 0) + paso(k); salva(); vCasa(); }));
  $('#f-casa').addEventListener('submit', e => { e.preventDefault(); const it = L.buscaProducto($('#i-casa').value, D.productos); if (anadeACasa([it])) vCasa(); });
}
function cantidadCasa(k, g) {
  const x = D.productos[k];
  if (x.ud && x.gud) { const n = g / x.gud; if (n >= 0.9) return `≈ ${r0(n)} ${L.plural(x.ud, r0(n))}`; }
  if (g >= x.util * 0.95 && x.util) { const n = g / x.util; return `${n >= 1.5 ? r0(n) + ' envases' : '1 envase'} (${esc(x.env)})`; }
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
  tostada(nombres.length ? 'En casa: ' + nombres.join(', ') : 'No lo encuentro en los productos de la app');
  return nombres.length > 0;
}

// ——— Recetas ———
const FILTROS = [['todas', 'Todas'], ['desayuno', 'Desayunos'], ['comida', 'Comidas'], ['cena', 'Cenas'], ['merienda', 'Meriendas'], ['airfryer', 'Air fryer'], ['plancha', 'Plancha'], ['micro', 'Micro'], ['rapidas', 'En 10 min']];
const QUESOS = [['queso_burgos', 'Para cada día: casi sin grasa'], ['cottage', 'Cremoso, para ensaladas y tostadas'], ['queso_batido', 'Base de salsas y batidos'],
  ['mozzarella_light', 'Con tomate, tomate seco y rúcula'], ['queso_cabra', 'Vuestro favorito: unos 20 g por ensalada'], ['feta', 'Poco y desmigado: sabe mucho'], ['grana_padano', 'En lascas: con 10 g basta']];
function vRecetas() {
  cabecera('Recetas', `${D.recetas.length} recetas sencillas: air fryer, plancha y micro`);
  const t = L.normaliza(V.busca);
  const lista = D.recetas.filter(r => {
    if (t && !L.normaliza(r.n + ' ' + r.ing.map(i => D.productos[i[0]]?.n).join(' ')).includes(t)) return false;
    const f = V.filtro;
    return f === 'todas' || r.tipo.includes(f) || r.ap === f || (f === 'rapidas' && r.min <= 10);
  });
  $('#vista').innerHTML = `
    <input class="buscador" id="i-busca" type="search" placeholder="Buscar: pollo, ensalada, feta…" value="${esc(V.busca)}">
    <div class="fila-chips">${FILTROS.map(([k, n]) => `<button class="chip" data-filtro="${k}" aria-pressed="${V.filtro === k}">${n}</button>`).join('')}</div>
    <details class="tarjeta quesos"><summary><b>Quesos para vuestras ensaladas</b></summary>
      <div class="nota" style="margin-top:6px">Cuanta más proteína y menos grasa, más cantidad podéis poner. Por 100 g:</div>
      <table><thead><tr><th>Queso</th><th class="num">Prot.</th><th class="num">Grasa</th></tr></thead><tbody>
      ${QUESOS.filter(([k]) => D.productos[k]).map(([k, t]) => `<tr><td><b>${esc(nombreCorto(D.productos[k]).replace(/ desnatado.*| semidesnatado.*| de vaca/, ''))}</b><br><span class="nota">${esc(t)}</span></td><td class="num">${D.productos[k].m[1]} g</td><td class="num">${D.productos[k].m[3]} g</td></tr>`).join('')}
      </tbody></table></details>
    ${lista.map(r => { const g = L.macrosReceta(r, 'G', D.productos, fac);
      return `<button class="tarjeta receta-tarjeta" data-receta="${r.id}"><div class="nombre">${esc(r.n)}</div>
        <div class="linea"><span class="etiqueta verde">${APARATO[r.ap]}</span><span class="etiqueta">${r.min} min</span><span class="etiqueta">${r.tipo.map(c => L.NOMBRE_COMIDA[c]).join(' · ')}</span>${r.ens ? '<span class="etiqueta">Ensalada</span>' : ''}</div>
        <div class="nota" style="margin-top:6px">${esc(NOM.G)}: ${r0(g.kcal)} kcal · ${r0(g.p)} g de proteína</div></button>`; }).join('') || '<div class="vacio">No hay recetas con ese filtro.</div>'}`;
  $('#i-busca').addEventListener('input', e => { V.busca = e.target.value; const pos = e.target.selectionStart; vRecetas(); const i = $('#i-busca'); i.focus(); i.setSelectionRange(pos, pos); });
  document.querySelectorAll('[data-filtro]').forEach(b => b.addEventListener('click', () => { V.filtro = b.dataset.filtro; vRecetas(); }));
  document.querySelectorAll('[data-receta]').forEach(b => b.addEventListener('click', () => abrirReceta(b.dataset.receta)));
}

// ——— Nosotros ———
function vNosotros() {
  const p = perfiles(), h = hoy(), cr = E.creatina[h] || {};
  cabecera('Nosotros', 'Objetivos, gustos y suplementos');
  const tarjeta = q => {
    const x = p[q], o = obj[q];
    return `<div class="tarjeta perfil"><h3 class="${q === 'G' ? 'persona-g' : 'persona-p'}">${x.nombre}</h3>
      <div class="campos">
        <label>Edad<input type="number" inputmode="numeric" data-q="${q}" data-campo="edad" value="${x.edad}"></label>
        <label>Altura (cm)<input type="number" inputmode="numeric" data-q="${q}" data-campo="altura" value="${x.altura}"></label>
        <label>Peso (kg)<input type="number" inputmode="decimal" step="0.5" data-q="${q}" data-campo="peso" value="${x.peso}"></label></div>
      <div class="objetivos"><div><b>${o.kcal}</b><span>kcal</span></div><div><b>${o.prot} g</b><span>proteína</span></div><div><b>${o.hc} g</b><span>hidratos</span></div><div><b>${o.grasa} g</b><span>grasa</span></div></div></div>`;
  };
  const gym = E.gimnasio ?? p.gimnasio;
  $('#vista').innerHTML = `
    ${tarjeta('G')}${tarjeta('P')}
    <details class="tarjeta perfil"><summary><b>Cómo lo calculo</b></summary><p class="nota">Gasto en reposo con la fórmula de Mifflin-St Jeor, por un factor de actividad ligera (×1,3; ×1,45 cuando vayáis al gimnasio), y un 20 % menos para perder grasa sin pasar hambre. Proteína: ${String(p.G.protKg).replace('.', ',')} g por kilo para ${esc(NOM.G)} y ${String(p.P.protKg).replace('.', ',')} para ${esc(NOM.P)}. Grasa: 0,7 g por kilo, para no bajar de un mínimo (también por el ciclo). Lo demás, hidratos. Son estimaciones: si en 3 semanas no bajáis, se ajusta.</p>
      <p class="nota">Las recetas están escritas para la ración de ${esc(NOM.G)}; la de ${esc(NOM.P)} se calcula sola: más proteína y más hidratos.</p></details>
    <div class="tarjeta perfil"><h3>Gimnasio</h3>
      <div class="botones" style="margin-top:8px"><button class="chip" id="b-gym" aria-pressed="${!!gym}">${gym ? 'Ya vamos al gimnasio' : 'Todavía no vamos'}</button></div>
      <div class="nota" style="margin-top:8px">Cuando empecéis, decídmelo: subo la actividad y meto más hidratos los días de entreno.</div></div>
    <div class="tarjeta perfil"><h3>Suplementos</h3>
      <p><b>Creatina:</b> ${esc(D.perfiles.suplementos.creatina)}</p>
      <div class="creatina"><span class="nota">Hoy:</span><button class="chip" data-crea="G" aria-pressed="${!!cr.G}">${esc(NOM.G)} ${cr.G ? '✓' : ''}</button><button class="chip" data-crea="P" aria-pressed="${!!cr.P}">${esc(NOM.P)} ${cr.P ? '✓' : ''}</button></div>
      <p><b>Huel:</b> ${esc(D.perfiles.suplementos.huel)}</p></div>
    <div class="tarjeta perfil"><h3>Lo que os gusta</h3><ul class="lista-simple">${D.perfiles.gustos.map(g => `<li>${esc(g)}</li>`).join('')}</ul>
      <div class="nota">¿Algo más que no os guste o que os encante? Decídmelo por el micrófono o por Telegram.</div></div>
    <div class="tarjeta perfil"><h3>Próximamente</h3><p class="nota">Piel, pelo, uñas y ciclo. Esta primera parte es la de la cocina.</p></div>
    <div class="tarjeta perfil"><h3>Datos</h3><p class="nota">Lo que cambiáis se guarda en este móvil. De momento cada móvil lleva lo suyo; la siguiente versión lo sincronizará entre los dos.<br>Datos de la app: ${esc(D.generado ? new Date(D.generado).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) : '')}.</p>
      <div class="botones"><button class="boton" id="b-claude">Mandar algo a Claude</button><button class="boton peligro" id="b-borrar">Borrar lo de este móvil</button></div></div>`;
  document.querySelectorAll('[data-campo]').forEach(i => i.addEventListener('change', () => {
    const v = parseFloat(i.value.replace(',', '.'));
    if (!isFinite(v) || v <= 0) return;
    (E.perfiles[i.dataset.q] ||= {})[i.dataset.campo] = v; salva(); recalcula(); vNosotros(); tostada('Objetivos recalculados');
  }));
  $('#b-gym').addEventListener('click', () => { E.gimnasio = !gym; salva(); recalcula(); vNosotros(); });
  document.querySelectorAll('[data-crea]').forEach(b => b.addEventListener('click', () => { const x = (E.creatina[h] ||= {}); x[b.dataset.crea] = !x[b.dataset.crea]; salva(); vNosotros(); }));
  $('#b-claude').addEventListener('click', () => mandarAClaude(''));
  $('#b-borrar').addEventListener('click', () => {
    if (!confirm('¿Borro de este móvil los cambios, la lista tachada y lo de «En casa»? El menú y las recetas no se borran.')) return;
    E = estadoNuevo(); E.casa = { ...(D.casa_inicial || {}) }; E.fijos = [...(D.fijos || [])]; salva(); recalcula(); vNosotros(); tostada('Borrado');
  });
}

async function mandarAClaude(texto) {
  const t = texto ? 'Para Claude, desde la app: ' + texto : 'Para Claude, desde la app: ';
  try { if (navigator.share) { await navigator.share({ text: t }); return; } } catch { return; }
  window.open('https://t.me/share/url?url=' + encodeURIComponent(location.origin + location.pathname) + '&text=' + encodeURIComponent(t), '_blank');
}

// ——— Micrófono ———
function abrirMicro() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  hoja(`<h2>¿Qué necesitas?</h2>
    <button class="micro-grande" id="b-escuchar" aria-label="Hablar">${SVG.micro}</button>
    <div class="transcripcion" id="trans">${SR ? 'Toca y habla' : 'Escríbelo o usa el micrófono del teclado'}</div>
    <form id="f-micro"><input class="campo-texto" id="i-micro" placeholder="Por ejemplo: apunta huevos y aguacates" autocomplete="off" enterkeyhint="send"></form>
    <div class="ejemplos">${['Apunta huevos y aguacates', '¿Qué cenamos hoy?', 'Cambia la comida del jueves', 'Hoy cenamos fuera', 'Tenemos kéfir'].map(x => `<button class="chip" data-ej="${esc(x)}">${esc(x)}</button>`).join('')}</div>`, h => {
    const trans = h.querySelector('#trans'), boton = h.querySelector('#b-escuchar');
    h.querySelector('#f-micro').addEventListener('submit', e => { e.preventDefault(); ejecuta(h.querySelector('#i-micro').value); });
    h.querySelectorAll('[data-ej]').forEach(b => b.addEventListener('click', () => ejecuta(b.dataset.ej)));
    boton.addEventListener('click', () => {
      if (!SR) { h.querySelector('#i-micro').focus(); return; }
      try {
        const rec = new SR(); window.__rec = rec;
        rec.lang = 'es-ES'; rec.interimResults = true; rec.maxAlternatives = 1;
        let final = '';
        rec.onresult = e => { let t = ''; for (const r of e.results) { t += r[0].transcript; if (r.isFinal) final = t; } trans.textContent = t; };
        rec.onerror = () => { trans.textContent = 'No te he oído bien. Prueba otra vez o escríbelo.'; boton.classList.remove('escuchando'); };
        rec.onend = () => { boton.classList.remove('escuchando'); window.__rec = null; if (final) ejecuta(final); };
        boton.classList.add('escuchando'); trans.textContent = 'Te escucho…'; rec.start();
      } catch { trans.textContent = 'El micrófono no está disponible aquí: escríbelo o usa el del teclado.'; h.querySelector('#i-micro').focus(); }
    });
  });
}

function diaDeVoz(d) {
  const p = planActivo(), h = hoy();
  if (!d || d === 'hoy') return h;
  if (d === '+1') return masDias(h, 1);
  if (d === '+2') return masDias(h, 2);
  const idx = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'].indexOf(d);
  return p.dias.find(x => fecha(x.f).getDay() === idx)?.f || h;
}

function ejecuta(texto) {
  const o = L.interpretar(texto, D.productos), p = planActivo();
  const i = f => p.dias.findIndex(d => d.f === f);
  switch (o.accion) {
    case 'anadir': cierraHoja(); anadeALista(o.items); if (V.pestana === 'compra') vCompra(); else location.hash = 'compra'; break;
    case 'quitar': {
      const s = est(p.id), n = [];
      for (const it of o.items) if (it.k) { s.quitados[it.k] = true; s.extra = s.extra.filter(x => x.k !== it.k); n.push(nombreCorto(D.productos[it.k])); }
      salva(); cierraHoja(); tostada(n.length ? 'Quitado: ' + n.join(', ') : 'No lo encuentro en la lista'); if (V.pestana === 'compra') vCompra(); break;
    }
    case 'casa': cierraHoja(); if (anadeACasa(o.items) && V.pestana === 'casa') vCasa(); break;
    case 'comprado': {
      const { s, filas } = lineaCompra(), n = [];
      for (const it of o.items) { const f = filas.find(x => x.k === it.k); if (f) { s.marcados[f.clave] = true; n.push(nombreCorto(D.productos[it.k])); } }
      salva(); cierraHoja(); tostada(n.length ? 'Tachado: ' + n.join(', ') : 'No está en la lista'); if (V.pestana === 'compra') vCompra(); break;
    }
    case 'fuera': {
      const f = diaDeVoz(o.dia);
      if (i(f) < 0) { tostada('Ese día no está en el menú'); break; }
      est(p.id).cambios[f + '|' + o.comida] = { fuera: true }; salva(); cierraHoja(); V.dia = f; location.hash = 'semana'; vSemana();
      tostada(`Apuntado: ${L.NOMBRE_COMIDA[o.comida].toLowerCase()} fuera`); break;
    }
    case 'cambiar': {
      const f = diaDeVoz(o.dia);
      if (i(f) < 0) { tostada('Ese día no está en el menú'); break; }
      V.dia = f; location.hash = 'semana'; vSemana(); abrirCambiar(p, i(f), o.comida || 'cena'); break;
    }
    case 'ver': {
      const f = diaDeVoz(o.dia), d = efectivo(p).dias.find(x => x.f === f);
      V.dia = f; cierraHoja(); location.hash = 'semana'; vSemana();
      const r = d && recetas[L.idDe(d[o.comida])];
      if (r) abrirReceta(r.id, { plan: p.id, f, c: o.comida }); else tostada(d && d[o.comida]?.fuera ? 'Ese día coméis fuera' : 'No hay plato puesto');
      break;
    }
    case 'ir': cierraHoja(); location.hash = o.a; break;
    case 'nada': break;
    default: {
      const h = document.querySelector('.hoja');
      h.querySelector('#trans').innerHTML = `No lo he entendido: «${esc(texto)}».<div class="botones" style="justify-content:center;margin-top:10px"><button class="boton principal" id="b-a-claude">Mandárselo a Claude</button></div>`;
      h.querySelector('#b-a-claude').addEventListener('click', () => mandarAClaude(texto));
    }
  }
}

inicio();
