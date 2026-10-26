import { Injectable, computed, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { Preferences } from '@capacitor/preferences';
import { ContactoService } from './contacto.service';
import { ConectividadService } from './conectividad.service';
import { UiService } from './ui.service';
import { Almacen, ColaSync, ContactoNuevo, ItemCola, ResultadoSync, parsearCola } from './sync.core';

const CLAVE_COLA = 'cola_sync';          // contactos que esperan ser enviados
const CLAVE_ULTIMA = 'sync_ultima';      // cuándo se sincronizó por última vez
const REINTENTO_MS = 20000;              // cada 20 s revisa si ya se puede enviar lo pendiente

// Persistencia local de la cola: Capacitor Preferences (localStorage en navegador, nativo en Android)
const almacenPreferences: Almacen = {
  async leer() {
    const { value } = await Preferences.get({ key: CLAVE_COLA });
    return parsearCola(value);
  },
  async guardar(items) {
    await Preferences.set({ key: CLAVE_COLA, value: JSON.stringify(items) });
  }
};

@Injectable({ providedIn: 'root' })
export class SyncService {

  // ---- estado que leen las pantallas ----
  readonly cola = signal<ItemCola[]>([]);
  readonly sincronizando = signal(false);
  readonly ultimaSync = signal<string | null>(null);
  readonly pendientes = computed(() => this.cola().filter(i => i.estado === 'pendiente').length);
  readonly rechazados = computed(() => this.cola().filter(i => i.estado === 'error').length);

  // Se emite cuando se subieron contactos al servidor, para que las pantallas recarguen su lista
  readonly sincronizado$ = new Subject<ResultadoSync>();

  private readonly core: ColaSync;

  constructor(
    private contactos: ContactoService,
    private red: ConectividadService,
    private ui: UiService
  ) {
    this.core = new ColaSync(almacenPreferences, { crear: c => this.contactos.crearContacto(c) });
    void this.iniciar();
  }

  private async iniciar() {
    this.cola.set(await this.core.cargar());
    const { value } = await Preferences.get({ key: CLAVE_ULTIMA });
    this.ultimaSync.set(value);

    // Recuperación de conexión: al volver el internet se envía lo pendiente
    this.red.reconectado$.subscribe(() => void this.sincronizar());
    // Pérdida de conexión: se avisa al usuario
    this.red.desconectado$.subscribe(() =>
      void this.ui.toast('Sin conexión. Los mensajes nuevos se guardarán en tu dispositivo.', 'aviso'));

    // Hay WiFi pero el servidor no responde (o regresa más tarde): no hay evento de red, así que se reintenta cada cierto tiempo
    setInterval(() => {
      if (this.pendientes() > 0 && this.red.conectado()) void this.sincronizar();
    }, REINTENTO_MS);

    // Al abrir la app: si quedó algo pendiente de la vez anterior, se intenta enviar
    if (this.pendientes() > 0 && (await this.red.estaConectado())) void this.sincronizar();
  }

  // Guarda un contacto en el dispositivo (cuando no hay conexión con el servidor)
  async guardarOffline(contacto: ContactoNuevo): Promise<ItemCola> {
    const item = await this.core.encolar(contacto);
    this.cola.set(this.core.obtener());
    return item;
  }

  async descartar(idLocal: string): Promise<void> {
    await this.core.descartar(idLocal);
    this.cola.set(this.core.obtener());
  }

  async reintentar(idLocal: string): Promise<void> {
    await this.core.reintentar(idLocal);
    this.cola.set(this.core.obtener());
    await this.sincronizar(true);
  }

  // Anota que el dispositivo quedó al día con el servidor (se llama también tras cada consulta GET exitosa)
  async registrarSincronizacion(): Promise<void> {
    const ahora = new Date().toISOString();
    this.ultimaSync.set(ahora);
    await Preferences.set({ key: CLAVE_ULTIMA, value: ahora });
  }

  // Envía los contactos pendientes. "manual" = el usuario lo pidió (muestra avisos aunque no haya nada que hacer)
  async sincronizar(manual = false): Promise<ResultadoSync | null> {
    if (this.pendientes() === 0) {
      if (manual) await this.ui.toast('Todo está sincronizado.');
      return null;
    }
    if (!(await this.red.estaConectado())) {
      if (manual) await this.ui.toast('Sin conexión: no se puede sincronizar ahora.', 'aviso');
      return null;
    }

    this.sincronizando.set(true);
    try {
      const r = await this.core.sincronizar();
      this.cola.set(this.core.obtener());

      if (r.enviados > 0) {
        await this.registrarSincronizacion();
        try { await this.contactos.obtenerContactos(); } catch { /* si falla, queda el caché anterior */ }
        this.sincronizado$.next(r);
        await this.ui.toast(`Se sincronizaron ${r.enviados} contacto(s) con el servidor.`);
      }
      if (r.rechazados > 0) {
        await this.ui.toast(`${r.rechazados} contacto(s) fueron rechazados por el servidor. Revísalos en la lista.`, 'error');
      }
      if (r.detenidoPorRed && manual) {
        await this.ui.toast('No se pudo conectar con el servidor. Se reintentará automáticamente.', 'aviso');
      }
      return r;
    } finally {
      this.sincronizando.set(false);
    }
  }
}