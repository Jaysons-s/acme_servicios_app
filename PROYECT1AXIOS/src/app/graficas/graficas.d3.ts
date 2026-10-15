import * as d3 from 'd3';

// ---------- Tipos de datos ----------
export interface ContactoMin {
  empresa?: string | null;
  created_at?: string | null;
}
export interface PuntoDia { clave: string; etiqueta: string; total: number; }
export interface PuntoEmpresa { empresa: string; total: number; }
export interface PuntoSeccion { nombre: string; total: number; color: string; }
export interface Kpis { total: number; empresas: number; ultimos7: number; }

const C = {
  navy: '#14213D',
  blue: '#2C5AA0',
  slate: '#5B6B7C',
  border: '#D7DEE7',
  gris: '#8A99AB',
};

// Fechas en español (d3 trae los meses en inglés por defecto)
const es = d3.timeFormatLocale({
  dateTime: '%A, %e de %B de %Y, %X',
  date: '%d/%m/%Y',
  time: '%H:%M:%S',
  periods: ['AM', 'PM'],
  days: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
  shortDays: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'],
  months: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  shortMonths: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
});
const fmtClave = d3.timeFormat('%Y-%m-%d');
const fmtEtiqueta = es.format('%d %b');
const parseDia = d3.timeParse('%Y-%m-%d');

// =====================================================
//  1) AGRUPACIÓN DE DATOS (los datos vienen del GET de la API)
// =====================================================

// Cuenta contactos por día, incluyendo los días sin contactos (total 0)
export function agruparPorDia(contactos: ContactoMin[]): PuntoDia[] {
  const conteo = new Map<string, number>();
  for (const c of contactos) {
    if (!c.created_at) continue;
    const dia = c.created_at.slice(0, 10); // "2026-09-11 21:51:26" -> "2026-09-11"
    conteo.set(dia, (conteo.get(dia) ?? 0) + 1);
  }
  const fechas = [...conteo.keys()]
    .map(k => parseDia(k))
    .filter((d): d is Date => d !== null)
    .sort((a, b) => a.getTime() - b.getTime());
  if (fechas.length === 0) return [];

  const dias = d3.timeDay.range(fechas[0], d3.timeDay.offset(fechas[fechas.length - 1], 1));
  return dias.map(f => ({
    clave: fmtClave(f),
    etiqueta: fmtEtiqueta(f),
    total: conteo.get(fmtClave(f)) ?? 0,
  }));
}

// Cuenta contactos por empresa (solo los que escribieron empresa), de mayor a menor
export function agruparPorEmpresa(contactos: ContactoMin[], max = 8): PuntoEmpresa[] {
  const conteo = new Map<string, number>();
  for (const c of contactos) {
    const nombre = (c.empresa ?? '').trim();
    if (!nombre) continue;
    conteo.set(nombre, (conteo.get(nombre) ?? 0) + 1);
  }
  return [...conteo.entries()]
    .map(([empresa, total]) => ({ empresa, total }))
    .sort((a, b) => b.total - a.total || a.empresa.localeCompare(b.empresa))
    .slice(0, max);
}

// Contactos con empresa vs. sin empresa
export function conVsSinEmpresa(contactos: ContactoMin[]): PuntoSeccion[] {
  const con = contactos.filter(c => (c.empresa ?? '').trim() !== '').length;
  return [
    { nombre: 'Con empresa', total: con, color: C.blue },
    { nombre: 'Sin empresa', total: contactos.length - con, color: C.gris },
  ];
}

// Números grandes de resumen
export function calcularKpis(contactos: ContactoMin[], ahora: Date = new Date()): Kpis {
  const empresas = new Set(
    contactos.map(c => (c.empresa ?? '').trim().toLowerCase()).filter(e => e !== '')
  );
  // "Últimos 7 días" = hoy y los 6 días anteriores (días calendario, igual que el eje de la gráfica)
  const inicio = d3.timeDay.floor(d3.timeDay.offset(ahora, -6)).getTime();
  const ultimos7 = contactos.filter(c => {
    if (!c.created_at) return false;
    const t = new Date(c.created_at.replace(' ', 'T')).getTime();
    return !Number.isNaN(t) && t >= inicio;
  }).length;
  return { total: contactos.length, empresas: empresas.size, ultimos7 };
}

// =====================================================
//  2) AYUDAS DE DIBUJO
// =====================================================

function limpiar(cont: HTMLElement): void {
  d3.select(cont).selectAll('*').remove();
}

function mensajeVacio(cont: HTMLElement, texto: string): void {
  d3.select(cont).append('p')
    .style('color', C.slate).style('font-size', '0.9rem')
    .style('text-align', 'center').style('padding', '2rem 0').style('margin', '0')
    .text(texto);
}

// Respeta la preferencia del sistema "reducir movimiento"
function duracion(): number {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 450;
  } catch {
    return 0;
  }
}

function recortar(texto: string, max: number): string {
  return texto.length > max ? texto.slice(0, Math.max(1, max - 1)) + '…' : texto;
}

// Tooltip: usa .text() (nunca .html()) para que un nombre de empresa
// con etiquetas HTML no se pueda "inyectar" en la página.
function crearTooltip(cont: HTMLElement) {
  d3.select(cont).style('position', 'relative');
  const tip = d3.select(cont).append('div')
    .style('position', 'absolute').style('pointer-events', 'none').style('opacity', '0')
    .style('background', C.navy).style('color', '#fff').style('padding', '6px 9px')
    .style('border-radius', '3px').style('font-size', '12px').style('white-space', 'nowrap')
    .style('z-index', '2').style('transition', 'opacity 0.12s');

  const mostrar = (event: MouseEvent, texto: string) => {
    const [px, py] = d3.pointer(event, cont);
    tip.text(texto).style('opacity', '1');
    const w = (tip.node() as HTMLElement).offsetWidth;
    const left = Math.min(Math.max(px - w / 2, 0), Math.max(0, cont.clientWidth - w));
    tip.style('left', `${left}px`).style('top', `${Math.max(py - 38, 0)}px`);
  };
  const ocultar = () => { tip.style('opacity', '0'); };
  return { mostrar, ocultar };
}

// =====================================================
//  3) GRÁFICAS
// =====================================================

// --- Barras verticales: contactos por día ---
export function dibujarBarrasPorDia(cont: HTMLElement, datos: PuntoDia[], ancho: number): void {
  limpiar(cont);
  if (datos.length === 0) { mensajeVacio(cont, 'Sin datos para mostrar'); return; }

  const alto = 250;
  const m = { top: 14, right: 12, bottom: 34, left: 32 };
  const maxY = Math.max(1, d3.max(datos, d => d.total) ?? 1);
  const etiquetas = new Map(datos.map(d => [d.clave, d.etiqueta] as [string, string]));

  const svg = d3.select(cont).append('svg')
    .attr('viewBox', `0 0 ${ancho} ${alto}`).attr('width', '100%')
    .attr('role', 'img').attr('aria-label', 'Gráfica de barras: contactos recibidos por día')
    .style('display', 'block');

  const x = d3.scaleBand<string>()
    .domain(datos.map(d => d.clave)).range([m.left, ancho - m.right]).padding(0.25);
  const y = d3.scaleLinear().domain([0, maxY]).nice().range([alto - m.bottom, m.top]);

  // Eje Y con líneas de guía (solo enteros: no existen "medio contacto")
  svg.append('g').attr('transform', `translate(${m.left},0)`)
    .call(d3.axisLeft(y).tickValues(y.ticks(5).filter(Number.isInteger)).tickFormat(d3.format('d'))
      .tickSize(-(ancho - m.left - m.right)))
    .call(g => g.select('.domain').remove())
    .call(g => g.selectAll('line').attr('stroke', C.border))
    .call(g => g.selectAll('text').attr('fill', C.slate).attr('font-size', 11));

  // Eje X: muestra solo algunas fechas si no caben todas
  const maxTicks = Math.max(2, Math.floor(ancho / 56));
  const paso = Math.ceil(datos.length / maxTicks);
  svg.append('g').attr('transform', `translate(0,${alto - m.bottom})`)
    .call(d3.axisBottom(x)
      .tickValues(x.domain().filter((_, i) => i % paso === 0))
      .tickFormat(k => etiquetas.get(k) ?? k).tickSizeOuter(0))
    .call(g => g.selectAll('text').attr('fill', C.slate).attr('font-size', 11))
    .call(g => g.selectAll('line,path').attr('stroke', C.border));

  const tip = crearTooltip(cont);
  const dur = duracion();

  const barras = svg.append('g').selectAll('rect').data(datos).join('rect')
    .attr('x', d => x(d.clave) ?? 0).attr('width', x.bandwidth()).attr('rx', 2)
    .attr('fill', C.blue).attr('y', y(0)).attr('height', 0)
    .on('mouseenter', (event: MouseEvent, d) => tip.mostrar(event, `${d.etiqueta}: ${d.total} contacto(s)`))
    .on('mousemove', (event: MouseEvent, d) => tip.mostrar(event, `${d.etiqueta}: ${d.total} contacto(s)`))
    .on('mouseleave', () => tip.ocultar());
  barras.transition().duration(dur)
    .attr('y', d => y(d.total)).attr('height', d => y(0) - y(d.total));

  // Número encima de cada barra, si caben
  if (x.bandwidth() >= 14) {
    svg.append('g').selectAll('text').data(datos.filter(d => d.total > 0)).join('text')
      .attr('x', d => (x(d.clave) ?? 0) + x.bandwidth() / 2).attr('y', d => y(d.total) - 4)
      .attr('text-anchor', 'middle').attr('font-size', 11).attr('font-weight', 600)
      .attr('fill', C.navy).text(d => d.total);
  }
}

// --- Barras horizontales: contactos por empresa ---
export function dibujarBarrasPorEmpresa(cont: HTMLElement, datos: PuntoEmpresa[], ancho: number): void {
  limpiar(cont);
  if (datos.length === 0) { mensajeVacio(cont, 'Aún no hay contactos con empresa'); return; }

  const m = { top: 8, right: 36, bottom: 26, left: Math.round(Math.min(170, ancho * 0.42)) };
  const alto = datos.length * 36 + m.top + m.bottom;
  const maxX = Math.max(1, d3.max(datos, d => d.total) ?? 1);

  const svg = d3.select(cont).append('svg')
    .attr('viewBox', `0 0 ${ancho} ${alto}`).attr('width', '100%')
    .attr('role', 'img').attr('aria-label', 'Gráfica de barras: contactos por empresa')
    .style('display', 'block');

  const y = d3.scaleBand<string>()
    .domain(datos.map(d => d.empresa)).range([m.top, alto - m.bottom]).padding(0.3);
  const x = d3.scaleLinear().domain([0, maxX]).nice().range([m.left, ancho - m.right]);

  svg.append('g').attr('transform', `translate(${m.left},0)`)
    .call(d3.axisLeft(y).tickFormat(n => recortar(n, Math.floor(m.left / 6.3))).tickSize(0))
    .call(g => g.select('.domain').attr('stroke', C.border))
    .call(g => g.selectAll('text').attr('fill', C.navy).attr('font-size', 12));

  svg.append('g').attr('transform', `translate(0,${alto - m.bottom})`)
    .call(d3.axisBottom(x).tickValues(x.ticks(5).filter(Number.isInteger)).tickFormat(d3.format('d'))
      .tickSizeOuter(0))
    .call(g => g.selectAll('text').attr('fill', C.slate).attr('font-size', 11))
    .call(g => g.selectAll('line,path').attr('stroke', C.border));

  const tip = crearTooltip(cont);
  const dur = duracion();

  const barras = svg.append('g').selectAll('rect').data(datos).join('rect')
    .attr('x', m.left).attr('y', d => y(d.empresa) ?? 0).attr('height', y.bandwidth())
    .attr('rx', 2).attr('fill', C.blue).attr('width', 0)
    .on('mouseenter', (event: MouseEvent, d) => tip.mostrar(event, `${d.empresa}: ${d.total} contacto(s)`))
    .on('mousemove', (event: MouseEvent, d) => tip.mostrar(event, `${d.empresa}: ${d.total} contacto(s)`))
    .on('mouseleave', () => tip.ocultar());
  barras.transition().duration(dur).attr('width', d => x(d.total) - m.left);

  svg.append('g').selectAll('text').data(datos).join('text')
    .attr('x', d => x(d.total) + 6).attr('y', d => (y(d.empresa) ?? 0) + y.bandwidth() / 2)
    .attr('dominant-baseline', 'middle').attr('font-size', 12).attr('font-weight', 600)
    .attr('fill', C.navy).text(d => d.total);
}

// --- Dona: con empresa vs sin empresa ---
export function dibujarDona(cont: HTMLElement, datos: PuntoSeccion[], ancho: number): void {
  limpiar(cont);
  const total = d3.sum(datos, d => d.total);
  if (total === 0) { mensajeVacio(cont, 'Sin datos para mostrar'); return; }

  const lado = Math.max(160, Math.min(ancho, 230));
  const radio = lado / 2;

  const svg = d3.select(cont).append('svg')
    .attr('viewBox', `0 0 ${lado} ${lado}`).attr('width', lado).attr('height', lado)
    .attr('role', 'img').attr('aria-label', 'Gráfica de dona: contactos con y sin empresa')
    .style('display', 'block').style('margin', '0 auto');
  const g = svg.append('g').attr('transform', `translate(${radio},${radio})`);

  const pie = d3.pie<PuntoSeccion>().value(d => d.total).sort(null).padAngle(0.02);
  const arco = d3.arc<d3.PieArcDatum<PuntoSeccion>>().innerRadius(radio * 0.62).outerRadius(radio - 2);

  const tip = crearTooltip(cont);
  const pct = (n: number) => Math.round((n / total) * 100);

  g.selectAll('path').data(pie(datos)).join('path')
    .attr('d', arco).attr('fill', d => d.data.color)
    .on('mouseenter', (event: MouseEvent, d) =>
      tip.mostrar(event, `${d.data.nombre}: ${d.data.total} (${pct(d.data.total)}%)`))
    .on('mousemove', (event: MouseEvent, d) =>
      tip.mostrar(event, `${d.data.nombre}: ${d.data.total} (${pct(d.data.total)}%)`))
    .on('mouseleave', () => tip.ocultar());

  g.append('text').attr('text-anchor', 'middle').attr('y', 4).attr('font-size', 30)
    .attr('font-weight', 700).attr('fill', C.navy).text(total);
  g.append('text').attr('text-anchor', 'middle').attr('y', 24).attr('font-size', 12)
    .attr('fill', C.slate).text('contactos');

  // Leyenda con el dato escrito (el color no es la única pista)
  const leyenda = d3.select(cont).append('div')
    .style('display', 'flex').style('justify-content', 'center').style('flex-wrap', 'wrap')
    .style('gap', '0.4rem 1.25rem').style('margin-top', '0.75rem')
    .style('font-size', '0.85rem').style('color', C.navy);
  const items = leyenda.selectAll('div').data(datos).join('div')
    .style('display', 'flex').style('align-items', 'center').style('gap', '0.4rem');
  items.append('span').style('width', '12px').style('height', '12px').style('border-radius', '2px')
    .style('background', d => d.color).style('display', 'inline-block');
  items.append('span').text(d => `${d.nombre}: ${d.total} (${pct(d.total)}%)`);
}