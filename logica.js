// logica.js — cálculos de la app, sin interfaz: objetivos, raciones, macros, lista de la compra,
// propuestas de menú e interpretación de lo que se dicta. Lo usan app.js (navegador) y las herramientas (Node).

export const COMIDAS = ['desayuno', 'comida', 'merienda', 'cena'];
export const NOMBRE_COMIDA = { desayuno: 'Desayuno', comida: 'Comida', merienda: 'Merienda', cena: 'Cena' };
export const QUIEN = ['G', 'P'];
export const PESCADO = ['salmon', 'atun', 'merluza', 'gambas'];
// Reparto orientativo de las calorías del día entre las comidas (para comparar alternativas).
export const REPARTO = { desayuno: 0.22, comida: 0.32, merienda: 0.15, cena: 0.28 };

// Objetivos diarios con la fórmula de Mifflin-St Jeor, un factor de actividad y un déficit moderado.
export function objetivos(p) {
  const tmb = 10 * p.peso + 6.25 * p.altura - 5 * p.edad + (p.sexo === 'M' ? 5 : -161);
  const gasto = tmb * p.actividad;
  const kcal = Math.round(gasto * (1 - p.deficit) / 10) * 10;
  const prot = Math.round(p.peso * p.protKg);
  const grasa = Math.round(p.peso * p.grasaKg);
  const hc = Math.max(0, Math.round((kcal - prot * 4 - grasa * 9) / 4));
  return { tmb: Math.round(tmb), gasto: Math.round(gasto), kcal, prot, grasa, hc };
}

// Las recetas están escritas para la ración de Gabriela; la de Pablo se escala por tipo de ingrediente.
export function factores(perfiles) {
  const a = objetivos(perfiles.G), b = objetivos(perfiles.P);
  return {
    G: { p: 1, h: 1, v: 1, g: 1, 1: 1 },
    P: { p: b.prot / a.prot, h: b.hc / a.hc, v: 1.2, g: b.grasa / a.grasa, 1: 1 },
  };
}

// ing = [clave, gramos de Gabriela, escala (p proteína, h hidratos, v verdura, g grasa, 1 fija), opciones]
// opciones: { P: gramos de Pablo } o { solo: 'G' | 'P' }
export function gramos(ing, quien, fac) {
  const [, g, esc = '1', op = {}] = ing;
  if (op.solo && op.solo !== quien) return 0;
  if (quien === 'P' && op.P != null) return op.P;
  return g * (fac[quien][esc] ?? 1);
}

export function macrosReceta(receta, quien, prod, fac) {
  const t = { kcal: 0, p: 0, hc: 0, g: 0, f: 0, coste: 0 };
  if (!receta) return t;
  for (const ing of receta.ing) {
    const x = prod[ing[0]];
    const gr = x ? gramos(ing, quien, fac) : 0;
    if (!gr) continue;
    const k = gr / 100;
    t.kcal += x.m[0] * k; t.p += x.m[1] * k; t.hc += x.m[2] * k; t.g += x.m[3] * k; t.f += (x.m[4] || 0) * k;
    if (x.util && x.precio && !x.despensa) t.coste += x.precio * gr / x.util;
  }
  return t;
}

// Un hueco del menú puede ser el id de una receta, { fuera: true } o { libre: 'texto' }.
export const idDe = v => (typeof v === 'string' ? v : v && v.r) || null;

export function totalesDia(dia, quien, recetas, prod, fac) {
  const t = { kcal: 0, p: 0, hc: 0, g: 0, f: 0, coste: 0, fuera: 0, libre: 0 };
  for (const c of COMIDAS) {
    const v = dia[c];
    if (v && v.fuera) { t.fuera++; continue; }
    if (!idDe(v)) { t.libre++; continue; }
    const m = macrosReceta(recetas[idDe(v)], quien, prod, fac);
    for (const k of Object.keys(m)) t[k] += m[k];
  }
  return t;
}

// Gramos que pide el menú (los dos), desde una fecha si se indica.
export function necesidades(plan, recetas, fac, desde) {
  const nec = {};
  for (const d of plan.dias) {
    if (desde && d.f < desde) continue;
    for (const c of COMIDAS) {
      const r = recetas[idDe(d[c])];
      if (!r) continue;
      for (const ing of r.ing) for (const q of QUIEN) {
        const gr = gramos(ing, q, fac);
        if (gr) nec[ing[0]] = (nec[ing[0]] || 0) + gr;
      }
    }
  }
  return nec;
}

// Lista de la compra: lo que pide el menú menos lo que hay en casa, en envases de Mercadona.
// casa = { clave: gramos }. La despensa (aceite, especias…) sale aparte, para comprobar si queda.
export function listaCompra(nec, prod, casa = {}, tol = 0.06) {
  const filas = [], despensa = [];
  for (const [k, g] of Object.entries(nec)) {
    const x = prod[k];
    if (!x || x.en_casa) continue;
    if (x.despensa) { despensa.push({ k, gramos: g }); continue; }
    const falta = g - (casa[k] || 0);
    if (falta <= 1) continue;
    // Si lo que falta pasa por poco de los envases enteros (un 6 % de la semana o de un envase), se redondea hacia abajo:
    // así la lista no pide un paquete entero por 20 g y, después de comprar, no vuelve a salir.
    let env = Math.ceil(falta / x.util);
    if (falta - (env - 1) * x.util <= Math.max(tol * x.util, tol * g)) env -= 1;
    if (env < 1) continue;
    filas.push({ k, gramos: g, falta, envases: env, precio: env * x.precio, sobra: Math.max(0, env * x.util - falta) });
  }
  const orden = (a, b) => (prod[a.k].orden - prod[b.k].orden) || prod[a.k].n.localeCompare(prod[b.k].n, 'es');
  filas.sort(orden); despensa.sort(orden);
  return { filas, despensa, total: filas.reduce((s, f) => s + f.precio, 0) };
}

export const porPieza = x => x.ud && x.gud && Math.abs(x.util - x.gud) < 1;

export function plural(ud, n) {
  if (n === 1 || !ud) return ud || '';
  if (/[aeiouáéó]$/.test(ud)) return ud + 's';
  if (/[áéíóú]n$/.test(ud)) return ud.slice(0, -2) + 'aeiou'['áéíóú'.indexOf(ud.at(-2))] + 'nes';
  if (/z$/.test(ud)) return ud.replace(/z$/, 'ces');
  return ud + 'es';
}

const fracciones = [[0.25, '¼'], [0.5, '½'], [0.75, '¾'], [0.33, '⅓'], [0.67, '⅔']];
function aproxUnidades(u) {
  const ent = Math.floor(u + 0.08), resto = u - ent;
  if (Math.abs(resto) < 0.12) return { n: ent, txt: String(ent) };
  for (const [v, s] of fracciones) if (Math.abs(resto - v) < 0.09) return { n: u, txt: (ent ? ent + ' ' : '') + s };
  return null;
}

// Cantidad legible de un ingrediente para una persona.
export function cantidadTexto(k, g, prod) {
  const x = prod[k];
  if (!x || !g) return '';
  if (x.despensa && x.m[0] === 0) return 'al gusto';
  if (k === 'aceite_spray') { const n = Math.max(1, Math.round(g)); return `${n} ${n === 1 ? 'pulverización' : 'pulverizaciones'}`; }
  if (k === 'aceite_oliva') {
    const c = Math.max(1, Math.round(g / 5));
    return `${c} ${c === 1 ? 'cucharadita' : 'cucharaditas'} (${Math.round(g)} g)`;
  }
  const r = g >= 30 ? Math.round(g / 5) * 5 : g >= 3 ? Math.round(g) : Math.round(g * 10) / 10;
  const peso = k === 'claras' || k === 'leche_soja' ? `${r} ml` : `${r} g`;
  if (x.ud && x.gud) {
    const u = aproxUnidades(g / x.gud);
    if (u && u.n > 0) {
      const singular = u.txt === '1' || /^[¼½¾⅓⅔]$/.test(u.txt);
      const unidades = `${u.txt} ${plural(x.ud, singular ? 1 : 2)}`;
      // Lo que se cuenta entero (huevos, yogures, rebanadas…) va en unidades; las piezas partidas, en gramos con la referencia.
      if (Number.isInteger(u.n) && CONTABLES.includes(x.ud)) return unidades;
      return `${peso} (${/^\d+$/.test(u.txt) ? '' : '≈ '}${unidades})`;
    }
  }
  return peso;
}
const CONTABLES = ['huevo', 'rebanada', 'tortilla', 'yogur', 'lata', 'lomo', 'tarrina', 'bola', 'mandarina', 'cacito', 'cogollo', 'latita', 'kiwi', 'plátano', 'manzana', 'pera', 'naranja', 'tortita'];

export function cantidadCompra(fila, prod) {
  const x = prod[fila.k];
  if (porPieza(x)) return `${fila.envases} ${plural(x.ud, fila.envases)}`;
  return `${fila.envases} × ${x.env || 'envase'}`;
}

// ——— Propuestas de menú ———

function azar(semilla) { let s = semilla >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function puntuacion(r, plan, i, comida, recetas, prod, fac, objG, rnd) {
  let pen = 0;
  const dia = plan.dias[i];
  const usado = plan.dias.some((d, j) => COMIDAS.some(c => !(j === i && c === comida) && idDe(d[c]) === r.id));
  if (usado) pen += comida === 'desayuno' || comida === 'merienda' ? 4 : 20;
  if (comida === 'comida' || comida === 'cena') {
    const prots = (d, salvo) => d ? ['comida', 'cena'].filter(c => !(d === dia && c === salvo)).map(c => recetas[idDe(d[c])]?.prot).filter(Boolean) : [];
    if (prots(dia, comida).includes(r.prot)) pen += 8;
    if (prots(plan.dias[i - 1]).includes(r.prot)) pen += 5;
    if (prots(plan.dias[i + 1]).includes(r.prot)) pen += 5;
    const contar = tags => plan.dias.reduce((s, d) => s + ['comida', 'cena'].filter(c => !(d === dia && c === comida)).filter(c => tags.includes(recetas[idDe(d[c])]?.prot)).length, 0);
    if (PESCADO.includes(r.prot) && contar(PESCADO) >= 2) pen += 10;
    if (r.prot === 'ternera' && contar(['ternera']) >= 2) pen += 6;
    const otra = comida === 'comida' ? 'cena' : 'comida';
    const hayEnsalada = recetas[idDe(dia[otra])]?.ens || dia[otra]?.fuera;
    if (!hayEnsalada && r.ens) pen -= 3;
    if (!hayEnsalada && !r.ens) pen += 2;
  }
  const kcal = macrosReceta(r, 'G', prod, fac).kcal;
  pen += Math.abs(kcal - objG.kcal * REPARTO[comida]) / 60;
  return pen + rnd() * 2.5;
}

export function alternativas(plan, i, comida, recetas, prod, fac, objG, n = 8, semilla = Date.now()) {
  const rnd = azar(semilla), actual = idDe(plan.dias[i][comida]);
  return Object.values(recetas)
    .filter(r => r.tipo.includes(comida) && r.id !== actual)
    .map(r => ({ r, pen: puntuacion(r, plan, i, comida, recetas, prod, fac, objG, rnd) }))
    .sort((a, b) => a.pen - b.pen).slice(0, n).map(x => x.r);
}

// Rellena de nuevo los huecos que no estén marcados como «fuera» o «libre».
export function proponerSemana(plan, recetas, prod, fac, objG, semilla = Date.now()) {
  const rnd = azar(semilla);
  const nuevo = { ...plan, dias: plan.dias.map(d => {
    const nd = { ...d };
    for (const c of COMIDAS) if (typeof nd[c] === 'string') nd[c] = null;
    return nd;
  }) };
  for (let i = 0; i < nuevo.dias.length; i++) for (const c of ['comida', 'cena', 'desayuno', 'merienda']) {
    if (nuevo.dias[i][c] !== null) continue;
    const cand = Object.values(recetas).filter(r => r.tipo.includes(c))
      .map(r => ({ r, pen: puntuacion(r, nuevo, i, c, recetas, prod, fac, objG, rnd) }))
      .sort((a, b) => a.pen - b.pen);
    nuevo.dias[i][c] = cand.length ? cand[0].r.id : null;
  }
  return nuevo;
}

// ——— Lo que se dicta por el micrófono ———

export const normaliza = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[¿?¡!.,;:]/g, ' ').replace(/\s+/g, ' ').trim();

const NUMEROS = { un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, medio: 0.5, media: 0.5 };
const RELLENO = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'paquete', 'paquetes', 'bandeja', 'bandejas', 'bote', 'botes', 'tarrina', 'tarrinas', 'bolsa', 'bolsas', 'kilo', 'kilos', 'mas', 'tambien', 'por', 'favor', 'lista', 'compra', 'a', 'en', 'unos', 'unas', 'algo', 'poco']);
const SINONIMOS = {
  pechuga_pollo: 'pollo pechuga pechugas', pavo_filetes: 'pavo filetes', pavo_lonchas: 'fiambre lonchas jamon york',
  huevos: 'huevo huevos docena', queso_batido: 'queso batido', yogur_proteinas: 'yogur yogures proteinas',
  leche_soja: 'leche soja bebida', platano: 'platano platanos banana bananas', tomate_cherry: 'tomate tomates cherry',
  frutos_rojos: 'frutos rojos', aceite_oliva: 'aceite', claras: 'claras', kefir: 'kefir', avena: 'avena copos',
  pan_integral: 'pan molde', arroz: 'arroz', brotes: 'ensalada lechuga brotes', almendras: 'almendras almendra',
  nueces: 'nueces nuez', salmon: 'salmon', atun_natural: 'atun', entrecot: 'entrecot entrecote', mandarina: 'mandarinas mandarina',
};

function cantidadYResto(s) {
  const p = s.split(' ');
  let n = null;
  if (p.length && (NUMEROS[p[0]] != null || /^\d+([.,]\d+)?$/.test(p[0]))) n = NUMEROS[p[0]] ?? parseFloat(p.shift().replace(',', '.'));
  if (n != null && NUMEROS[p[0]] != null) p.shift();
  return { n, resto: p.join(' ') };
}
const raiz = w => w.replace(/(es|s)$/, '');

export function buscaProducto(texto, prod) {
  const { n, resto } = cantidadYResto(normaliza(texto));
  const palabras = resto.split(' ').filter(w => w && !RELLENO.has(w)).map(raiz);
  if (!palabras.length) return null;
  let mejor = null, mejorP = 0;
  for (const [k, x] of Object.entries(prod)) {
    if (x.en_casa) continue;
    const nombre = new Set((normaliza(x.n) + ' ' + (SINONIMOS[k] || '')).split(' ').map(raiz));
    const aciertos = palabras.filter(w => nombre.has(w)).length;
    const p = aciertos / palabras.length + (SINONIMOS[k] && palabras.every(w => SINONIMOS[k].split(' ').map(raiz).includes(w)) ? 0.5 : 0);
    if (p > mejorP) { mejorP = p; mejor = k; }
  }
  return { texto: resto, n, k: mejorP >= 0.5 ? mejor : null };
}

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
function diaDe(t) {
  if (/\bhoy\b/.test(t)) return 'hoy';
  if (/\bpasado manana\b/.test(t)) return '+2';
  if (/\bmanana\b/.test(t)) return '+1';
  const d = DIAS_SEMANA.find(x => new RegExp('\\b' + x + '\\b').test(t));
  return d || null;
}
function comidaDe(t) {
  if (/desayun/.test(t)) return 'desayuno';
  if (/merend|merienda/.test(t)) return 'merienda';
  if (/\bcen(a|o|amos|ar)\b/.test(t)) return 'cena';
  if (/\bcom(ida|o|emos|er)\b|almuerz/.test(t)) return 'comida';
  return null;
}
const separa = s => s.split(/,| y | e /).map(x => x.trim()).filter(Boolean);

export function interpretar(texto, prod) {
  const t = normaliza(texto);
  if (!t) return { accion: 'nada' };
  let m;
  if ((m = t.match(/^(?:anade|anadir|apunta|apuntar|pon|poner|agrega|agregar|compra|comprar|necesitamos|hay que comprar|falta|faltan)\s+(.+)$/)))
    return { accion: 'anadir', items: separa(m[1]).map(s => buscaProducto(s, prod)).filter(Boolean) };
  if ((m = t.match(/^(?:quita|quitar|borra|borrar|elimina|eliminar)\s+(.+)$/)))
    return { accion: 'quitar', items: separa(m[1]).map(s => buscaProducto(s, prod)).filter(Boolean) };
  if ((m = t.match(/^(?:ya tenemos|tenemos|todavia hay|aun hay|hay|queda|quedan|nos queda|nos quedan)\s+(.+)$/)) && !/\bque\b/.test(m[1].split(' ')[0]))
    return { accion: 'casa', items: separa(m[1]).map(s => buscaProducto(s, prod)).filter(Boolean) };
  if ((m = t.match(/^(?:ya )?(?:hemos comprado|compramos|comprado)\s+(.+)$/)))
    return { accion: 'comprado', items: separa(m[1]).map(s => buscaProducto(s, prod)).filter(Boolean) };
  if (/\bfuera\b/.test(t) && /(comemos|cenamos|comer|cenar|desayunamos|salimos)/.test(t))
    return { accion: 'fuera', dia: diaDe(t) || 'hoy', comida: comidaDe(t) || 'cena' };
  if (/^(cambia|cambiar|cambiame|otra|otro|no me apetece|no nos apetece)/.test(t))
    return { accion: 'cambiar', dia: diaDe(t) || 'hoy', comida: comidaDe(t) };
  if (/\bque\b/.test(t) && comidaDe(t))
    return { accion: 'ver', dia: diaDe(t) || 'hoy', comida: comidaDe(t) };
  if (/lista|compra/.test(t)) return { accion: 'ir', a: 'compra' };
  return { accion: 'desconocida', texto };
}
