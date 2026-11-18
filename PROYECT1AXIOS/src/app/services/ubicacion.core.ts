//Geolocalización: lógica sin dependencias de Angular, para poder probarla sola.
//1) cálculos (distancia, rumbo, formato)
//2) flujo de permisos + obtención de la posición
//3) clasificación de errores

export interface Punto { latitud: number; longitud: number; }

export interface Coordenadas extends Punto {
  precision: number | null;   // margen de error en metros
  altitud: number | null;
  marcaTiempo: number;        // milisegundos desde 1970
}

export interface Sucursal extends Punto { id: string; nombre: string; direccion: string; }
export interface SucursalConDistancia extends Sucursal { distanciaM: number; rumbo: string; }

// ============================ 1) CÁLCULOS ============================

const RADIO_TIERRA_M = 6371008.8;
const aRadianes = (grados: number) => (grados * Math.PI) / 180;

// Distancia en línea recta sobre la superficie de la Tierra (fórmula de Haversine)
export function distanciaMetros(a: Punto, b: Punto): number {
  const dLat = aRadianes(b.latitud - a.latitud);
  const dLon = aRadianes(b.longitud - a.longitud);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aRadianes(a.latitud)) * Math.cos(aRadianes(b.latitud)) * Math.sin(dLon / 2) ** 2;
  return 2 * RADIO_TIERRA_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

const RUMBOS = ['norte', 'noreste', 'este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste'];

// Hacia qué lado queda el destino (norte, noreste, este...)
export function rumboCardinal(desde: Punto, hacia: Punto): string {
  const f1 = aRadianes(desde.latitud);
  const f2 = aRadianes(hacia.latitud);
  const dl = aRadianes(hacia.longitud - desde.longitud);
  const y = Math.sin(dl) * Math.cos(f2);
  const x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl);
  const grados = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  return RUMBOS[Math.round(grados / 45) % 8];
}

// Sucursales ordenadas de la más cercana a la más lejana
export function ordenarPorCercania(origen: Punto, sucursales: Sucursal[]): SucursalConDistancia[] {
  return sucursales
    .map(s => ({ ...s, distanciaM: distanciaMetros(origen, s), rumbo: rumboCardinal(origen, s) }))
    .sort((a, b) => a.distanciaM - b.distanciaM);
}

export function formatearDistancia(metros: number): string {
  const redondeado = Math.round(metros);
  if (redondeado < 1000) return `${redondeado} m`;            // 850 m
  const km = Math.round(metros / 100) / 10;                    // un decimal, ya redondeado
  if (km < 100) return `${km.toFixed(1)} km`;                  // 12.3 km  (999.6 m -> 1.0 km, no "1000 m")
  return `${Math.round(metros / 1000)} km`;                    // 461 km   (99 960 m -> 100 km, no "100.0 km")
}

export function formatearCoordenada(valor: number): string {
  return valor.toFixed(6);
}

// Abre la app de mapas con la ruta desde donde estás hasta la sucursal
export function urlComoLlegar(destino: Punto): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${destino.latitud},${destino.longitud}`;
}

// ============================ 3) ERRORES ============================

export type TipoErrorUbicacion =
  | 'permiso-denegado'   // el usuario no dio el permiso
  | 'gps-apagado'        // la ubicación del dispositivo está desactivada
  | 'tiempo-agotado'     // no se obtuvo la posición a tiempo
  | 'no-disponible'      // el dispositivo no pudo calcularla
  | 'configuracion'      // la app no declara el permiso en AndroidManifest.xml
  | 'desconocido';

export interface ErrorUbicacion { tipo: TipoErrorUbicacion; titulo: string; mensaje: string; }

const TEXTOS: Record<TipoErrorUbicacion, { titulo: string; mensaje: string }> = {
  'permiso-denegado': {
    titulo: 'Permiso de ubicación denegado',
    mensaje: 'Sin este permiso no podemos calcular qué sucursal te queda más cerca. Para activarlo, abre los ajustes del teléfono, entra a los permisos de esta aplicación, elige Ubicación y permítela. Después vuelve a intentar.'
  },
  'gps-apagado': {
    titulo: 'La ubicación del teléfono está apagada',
    mensaje: 'Activa la ubicación desde el panel de ajustes rápidos (el ícono de ubicación) y vuelve a intentar.'
  },
  'tiempo-agotado': {
    titulo: 'No se pudo obtener tu ubicación a tiempo',
    mensaje: 'Intenta salir a un lugar abierto o revisa tu señal. Después vuelve a intentar.'
  },
  'no-disponible': {
    titulo: 'Tu ubicación no está disponible',
    mensaje: 'El dispositivo no pudo calcular dónde estás en este momento. Vuelve a intentar en unos segundos.'
  },
  'configuracion': {
    titulo: 'Falta declarar el permiso de ubicación',
    mensaje: 'La app no tiene los permisos de ubicación en AndroidManifest.xml. Agrega ACCESS_COARSE_LOCATION y ACCESS_FINE_LOCATION, y vuelve a compilar la app.'
  },
  'desconocido': {
    titulo: 'No se pudo obtener tu ubicación',
    mensaje: 'Ocurrió un error inesperado. Vuelve a intentar.'
  }
};

export function crearError(tipo: TipoErrorUbicacion): ErrorUbicacion {
  return { tipo, ...TEXTOS[tipo] };
}

// Convierte cualquier error del plugin en uno de los tipos de arriba.
//  - Android/iOS: el plugin manda códigos de texto, p. ej. "OS-PLUG-GLOC-0003"
//  - Navegador:   manda el código numérico estándar 1 (permiso), 2 (no disponible) o 3 (tiempo)
export function clasificarErrorUbicacion(e: unknown): ErrorUbicacion {
  const err = e as { code?: string | number; message?: string } | null;
  const codigo = err?.code;
  const mensaje = String(err?.message ?? '');

  if (typeof codigo === 'string') {
    const n = /GLOC-(\d+)/.exec(codigo)?.[1];
    switch (n) {
      case '0003': return crearError('permiso-denegado');
      case '0007': case '0009': case '0017': return crearError('gps-apagado');
      case '0010': return crearError('tiempo-agotado');
      case '0018': return crearError('configuracion');
      case '0002': case '0014': case '0015': case '0016': return crearError('no-disponible');
    }
  }
  if (typeof codigo === 'number') {
    if (codigo === 1) return crearError('permiso-denegado');
    if (codigo === 2) return crearError('no-disponible');
    if (codigo === 3) return crearError('tiempo-agotado');
  }
  // Respaldo: por si el código no viene, se revisa el texto del mensaje
  if (/permission.*denied|denied.*permission|user denied/i.test(mensaje)) return crearError('permiso-denegado');
  if (/not enabled|turned off|disabled/i.test(mensaje)) return crearError('gps-apagado');
  if (/in time|timeout|timed out/i.test(mensaje)) return crearError('tiempo-agotado');
  return crearError('desconocido');
}

// ================= 2) FLUJO: permisos + posición =================

export interface EstadoPermisos { location?: string; coarseLocation?: string; }

// Lo mínimo que usamos del plugin @capacitor/geolocation (así se puede probar con uno falso)
export interface PluginUbicacion {
  checkPermissions(): Promise<EstadoPermisos>;
  requestPermissions(): Promise<EstadoPermisos>;
  getCurrentPosition(opciones?: { enableHighAccuracy?: boolean; timeout?: number; maximumAge?: number }): Promise<{
    timestamp: number;
    coords: { latitude: number; longitude: number; accuracy?: number | null; altitude?: number | null };
  }>;
}

export type ResultadoUbicacion =
  | { ok: true; coordenadas: Coordenadas; modo: 'precisa' | 'aproximada' }
  | { ok: false; error: ErrorUbicacion };

// En Android 12+ el usuario puede dar solo ubicación aproximada (coarse): también cuenta como permiso.
const concedido = (p: EstadoPermisos) => p.location === 'granted' || p.coarseLocation === 'granted';

// En el navegador el plugin no implementa requestPermissions (el navegador pregunta solo al pedir la posición)
function noImplementado(e: unknown): boolean {
  const err = e as { code?: string; message?: string } | null;
  return err?.code === 'UNIMPLEMENTED' || err?.code === 'UNAVAILABLE' || /not implemented/i.test(String(err?.message ?? ''));
}

export async function obtenerUbicacion(
  plugin: PluginUbicacion,
  ajustes: { timeoutPreciso?: number; timeoutAproximado?: number } = {}
): Promise<ResultadoUbicacion> {
  const timeoutPreciso = ajustes.timeoutPreciso ?? 15000;
  const timeoutAproximado = ajustes.timeoutAproximado ?? 10000;

  // --- 1) Permisos: primero se revisa; si no están dados, se piden ---
  let permisos: EstadoPermisos | null = null;
  try {
    permisos = await plugin.checkPermissions();
  } catch {
    permisos = null;   // algunos navegadores no tienen la API de permisos
  }

  if (!permisos || !concedido(permisos)) {
    try {
      const respuesta = await plugin.requestPermissions();
      if (!concedido(respuesta)) {
        return { ok: false, error: crearError('permiso-denegado') };
      }
    } catch (e) {
      if (!noImplementado(e)) return { ok: false, error: clasificarErrorUbicacion(e) };
      // navegador: se sigue, y será el propio navegador quien pregunte
    }
  }

  // --- 2) Posición: primero precisa (GPS); si no se logra, un segundo intento aproximado ---
  const pedir = (alta: boolean, timeout: number) =>
    plugin.getCurrentPosition({ enableHighAccuracy: alta, timeout, maximumAge: 0 });

  let posicion: Awaited<ReturnType<PluginUbicacion['getCurrentPosition']>>;
  let modo: 'precisa' | 'aproximada' = 'precisa';
  try {
    posicion = await pedir(true, timeoutPreciso);
  } catch (e1) {
    const err1 = clasificarErrorUbicacion(e1);
    if (err1.tipo !== 'tiempo-agotado' && err1.tipo !== 'no-disponible') {
      return { ok: false, error: err1 };
    }
    try {
      posicion = await pedir(false, timeoutAproximado);
      modo = 'aproximada';
    } catch (e2) {
      return { ok: false, error: clasificarErrorUbicacion(e2) };
    }
  }

  const { latitude, longitude, accuracy, altitude } = posicion.coords;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { ok: false, error: crearError('no-disponible') };
  }
  return {
    ok: true,
    modo,
    coordenadas: {
      latitud: latitude,
      longitud: longitude,
      precision: Number.isFinite(accuracy as number) ? (accuracy as number) : null,
      altitud: Number.isFinite(altitude as number) ? (altitude as number) : null,
      marcaTiempo: posicion.timestamp
    }
  };
}