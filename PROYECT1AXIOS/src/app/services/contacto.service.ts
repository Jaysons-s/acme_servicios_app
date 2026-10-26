import { Injectable, signal } from '@angular/core';
import axios, { AxiosError } from 'axios';
import { Preferences } from '@capacitor/preferences';
import { OrigenDatosService } from './origen-datos.service';
import { instalarMonitorServidor } from './monitor-servidor';

const CACHE_KEY = 'contactos_cache';

export interface Contacto {
  id?: number;
  nombre: string;
  empresa?: string;
  email: string;
  telefono: string;
  mensaje: string;
  created_at?: string;
  updated_at?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
}

export interface ResultadoContactos {
  contactos: Contacto[];
  desdeCache: boolean;
}

// Error de la API con datos extra para decidir qué hacer:
//  - esRed = true  → no hubo respuesta (sin internet, IP mal, servidor apagado, timeout)
//  - status        → código HTTP cuando el servidor sí respondió (ej. 422 datos inválidos)
export class ErrorApi extends Error {
  constructor(message: string, public esRed: boolean, public status?: number) {
    super(message);
    this.name = 'ErrorApi';
  }
}

@Injectable({
  providedIn: 'root'
})
export class ContactoService {

  // true mientras el servidor responde; false cuando una petición no recibe respuesta
  readonly servidorDisponible = signal(true);

  // Cliente Axios propio. La URL base cambia según Origen de datos, por eso se manda completa en cada llamada.
  private http = axios.create({ timeout: 8000, headers: { 'Content-Type': 'application/json' } });

  constructor(private origenDatos: OrigenDatosService) {
    instalarMonitorServidor(this.http, disponible => this.servidorDisponible.set(disponible));
  }

  private async url(ruta: string): Promise<string> {
    const base = await this.origenDatos.obtenerUrlBase();
    return `${base}/api${ruta}`;
  }

  private extraerMensajeError(error: AxiosError<ApiResponse>): string {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.request) {
      return 'No se pudo conectar con el servidor. Verifica tu conexión o la IP en Origen de datos.';
    }
    return 'Ocurrió un error inesperado.';
  }

  private convertirError(error: unknown): ErrorApi {
    const e = error as AxiosError<ApiResponse>;
    return new ErrorApi(this.extraerMensajeError(e), !e.response, e.response?.status);
  }

  private async guardarCache(contactos: Contacto[]): Promise<void> {
    await Preferences.set({ key: CACHE_KEY, value: JSON.stringify(contactos) });
  }

  private async leerCache(): Promise<Contacto[]> {
    const { value } = await Preferences.get({ key: CACHE_KEY });
    try {
      return value ? JSON.parse(value) : [];
    } catch {
      return [];
    }
  }

  // GET lista (con caché local: sincronización servidor → dispositivo)
  async obtenerContactos(): Promise<ResultadoContactos> {
    try {
      const { data } = await this.http.get<ApiResponse<Contacto[]>>(await this.url('/index.php'));
      await this.guardarCache(data.data);
      return { contactos: data.data, desdeCache: false };
    } catch (error) {
      const cache = await this.leerCache();
      if (cache.length > 0) {
        return { contactos: cache, desdeCache: true };
      }
      throw this.convertirError(error);
    }
  }

  async obtenerContacto(id: number): Promise<Contacto> {
    try {
      const { data } = await this.http.get<ApiResponse<Contacto>>(await this.url(`/index.php?id=${id}`));
      return data.data;
    } catch (error) {
      throw this.convertirError(error);
    }
  }

  // POST crear
  async crearContacto(contacto: Contacto): Promise<Contacto> {
    try {
      const { data } = await this.http.post<ApiResponse<Contacto>>(await this.url('/index.php'), contacto);
      return data.data;
    } catch (error) {
      throw this.convertirError(error);
    }
  }

  // PUT actualizar completo
  async actualizarContacto(id: number, contacto: Contacto): Promise<Contacto> {
    try {
      const { data } = await this.http.put<ApiResponse<Contacto>>(await this.url(`/index.php?id=${id}`), contacto);
      return data.data;
    } catch (error) {
      throw this.convertirError(error);
    }
  }

  // PATCH actualizar parcial
  async actualizarContactoParcial(id: number, cambios: Partial<Contacto>): Promise<Contacto> {
    try {
      const { data } = await this.http.patch<ApiResponse<Contacto>>(await this.url(`/index.php?id=${id}`), cambios);
      return data.data;
    } catch (error) {
      throw this.convertirError(error);
    }
  }

  // DELETE eliminar
  async eliminarContacto(id: number): Promise<void> {
    try {
      await this.http.delete<ApiResponse<null>>(await this.url(`/index.php?id=${id}`));
    } catch (error) {
      throw this.convertirError(error);
    }
  }
}