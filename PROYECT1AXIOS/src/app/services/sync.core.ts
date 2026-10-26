// ---------------------------------------------------------------------------
//  Cola de sincronización (outbox)
//  Cuando no se puede enviar un contacto al servidor, se guarda aquí, en el
//  dispositivo, y se reintenta después. Este archivo no depende de Angular ni
//  de Capacitor: recibe el almacenamiento y la API como parámetros, así se
//  puede probar por separado.
// ---------------------------------------------------------------------------

export interface ContactoNuevo {
  nombre: string;
  empresa?: string;
  email: string;
  telefono: string;
  mensaje: string;
}

// pendiente = esperando conexión | error = el servidor lo rechazó (ej. datos inválidos)
export type EstadoItem = 'pendiente' | 'error';

export interface ItemCola {
  idLocal: string;          // identificador temporal (todavía no existe id en la base de datos)
  contacto: ContactoNuevo;
  creadoEn: string;         // fecha ISO en que se guardó en el dispositivo
  intentos: number;
  estado: EstadoItem;
  mensajeError?: string;
}

export interface Almacen {
  leer(): Promise<ItemCola[]>;
  guardar(items: ItemCola[]): Promise<void>;
}

export interface ApiCrear {
  crear(contacto: ContactoNuevo): Promise<unknown>;
}

export interface ResultadoSync {
  enviados: number;          // se subieron al servidor
  rechazados: number;        // el servidor los rechazó (quedan marcados con error)
  pendientes: number;        // siguen esperando
  detenidoPorRed: boolean;   // se cortó porque no hubo conexión con el servidor
}

// ---------- lectura segura del almacenamiento ----------
function esItemValido(x: any): x is ItemCola {
  return !!x
    && typeof x.idLocal === 'string'
    && !!x.contacto
    && typeof x.contacto.nombre === 'string'
    && typeof x.contacto.email === 'string'
    && typeof x.contacto.telefono === 'string'
    && typeof x.contacto.mensaje === 'string'
    && (x.estado === 'pendiente' || x.estado === 'error')
    && typeof x.intentos === 'number';
}

// Si el texto guardado está dañado o no tiene la forma esperada, no truena: regresa una cola vacía.
export function parsearCola(texto: string | null): ItemCola[] {
  if (!texto) return [];
  try {
    const datos: unknown = JSON.parse(texto);
    return Array.isArray(datos) ? datos.filter(esItemValido) : [];
  } catch {
    return [];
  }
}

// ---------- ¿el fallo se arregla esperando, o el servidor dijo que no? ----------
export type ClaseError = 'temporal' | 'rechazado';

export function clasificarError(e: unknown): { clase: ClaseError; mensaje: string } {
  const err = e as { esRed?: boolean; status?: number; message?: string } | null;
  const mensaje = err?.message || 'Error desconocido';
  // Sin respuesta del servidor (sin internet, IP mal, servidor apagado, timeout) → reintentar luego
  if (err?.esRed === true) return { clase: 'temporal', mensaje };
  if (typeof err?.status === 'number') {
    // 5xx (fallo del servidor), 408 (timeout) y 429 (demasiadas peticiones) → reintentar luego
    if (err.status >= 500 || err.status === 408 || err.status === 429) return { clase: 'temporal', mensaje };
    // 4xx (ej. 422 datos inválidos) → reintentar no sirve, se marca como rechazado
    return { clase: 'rechazado', mensaje };
  }
  return { clase: 'rechazado', mensaje };
}

function idAleatorio(): string {
  const c = (globalThis as any).crypto;
  return c?.randomUUID ? c.randomUUID() : `loc_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export class ColaSync {
  private items: ItemCola[] = [];
  private cargado = false;
  private enCurso: Promise<ResultadoSync> | null = null;

  constructor(
    private almacen: Almacen,
    private api: ApiCrear,
    private opciones: { generarId?: () => string; ahora?: () => Date } = {}
  ) {}

  private copia(): ItemCola[] {
    return this.items.map(i => ({ ...i, contacto: { ...i.contacto } }));
  }

  private async asegurarCarga(): Promise<void> {
    if (!this.cargado) await this.cargar();
  }

  async cargar(): Promise<ItemCola[]> {
    this.items = await this.almacen.leer();
    this.cargado = true;
    return this.copia();
  }

  obtener(): ItemCola[] {
    return this.copia();
  }

  pendientes(): number {
    return this.items.filter(i => i.estado === 'pendiente').length;
  }

  // Guarda un contacto en el dispositivo para enviarlo después
  async encolar(contacto: ContactoNuevo): Promise<ItemCola> {
    await this.asegurarCarga();
    const item: ItemCola = {
      idLocal: (this.opciones.generarId ?? idAleatorio)(),
      contacto: { ...contacto },
      creadoEn: (this.opciones.ahora ?? (() => new Date()))().toISOString(),
      intentos: 0,
      estado: 'pendiente'
    };
    this.items.push(item);
    await this.almacen.guardar(this.items);
    return { ...item, contacto: { ...item.contacto } };
  }

  async descartar(idLocal: string): Promise<void> {
    await this.asegurarCarga();
    this.items = this.items.filter(i => i.idLocal !== idLocal);
    await this.almacen.guardar(this.items);
  }

  // Un contacto rechazado vuelve a la fila de pendientes
  async reintentar(idLocal: string): Promise<void> {
    await this.asegurarCarga();
    const item = this.items.find(i => i.idLocal === idLocal);
    if (!item) return;
    item.estado = 'pendiente';
    delete item.mensajeError;
    await this.almacen.guardar(this.items);
  }

  // Envía los pendientes, en orden. Si ya hay una sincronización en curso, comparte su resultado
  // (así nunca se manda el mismo contacto dos veces al mismo tiempo).
  sincronizar(): Promise<ResultadoSync> {
    if (this.enCurso) return this.enCurso;
    this.enCurso = this.procesar().finally(() => { this.enCurso = null; });
    return this.enCurso;
  }

  private async procesar(): Promise<ResultadoSync> {
    await this.asegurarCarga();
    const ids = this.items.filter(i => i.estado === 'pendiente').map(i => i.idLocal);
    let enviados = 0;
    let rechazados = 0;
    let detenidoPorRed = false;

    for (const id of ids) {
      const item = this.items.find(i => i.idLocal === id);
      if (!item || item.estado !== 'pendiente') continue;   // lo descartaron mientras se sincronizaba

      try {
        await this.api.crear(item.contacto);
        this.items = this.items.filter(i => i.idLocal !== id);
        enviados++;
        // Se guarda enseguida: si la app se cierra ahora, este contacto ya no se reenvía.
        await this.almacen.guardar(this.items);
      } catch (e) {
        const { clase, mensaje } = clasificarError(e);
        item.intentos++;
        if (clase === 'temporal') {
          // Sin conexión con el servidor: se conserva todo y se corta (no tiene caso insistir con los demás)
          detenidoPorRed = true;
          await this.almacen.guardar(this.items);
          break;
        }
        item.estado = 'error';
        item.mensajeError = mensaje;
        rechazados++;
        await this.almacen.guardar(this.items);
      }
    }

    return { enviados, rechazados, pendientes: this.pendientes(), detenidoPorRed };
  }
}