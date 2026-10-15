import { Injectable } from '@angular/core';
import axios, { AxiosError } from 'axios';
import { Preferences } from '@capacitor/preferences';
import { OrigenDatosService } from './origen-datos.service';

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

@Injectable({
  providedIn: 'root'
})
export class ContactoService {

  constructor(private origenDatos: OrigenDatosService) {}

  // La URL se arma en cada llamada con la IP/puerto guardados (Origen de datos)
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

  private async guardarCache(contactos: Contacto[]): Promise<void> {
    await Preferences.set({ key: CACHE_KEY, value: JSON.stringify(contactos) });
  }

  private async leerCache(): Promise<Contacto[]> {
    const { value } = await Preferences.get({ key: CACHE_KEY });
    return value ? JSON.parse(value) : [];
  }

  // GET lista (con caché)
  async obtenerContactos(): Promise<ResultadoContactos> {
    try {
      const { data } = await axios.get<ApiResponse<Contacto[]>>(await this.url('/index.php'), { timeout: 8000 });
      await this.guardarCache(data.data);
      return { contactos: data.data, desdeCache: false };
    } catch (error) {
      const cache = await this.leerCache();
      if (cache.length > 0) {
        return { contactos: cache, desdeCache: true };
      }
      throw new Error(this.extraerMensajeError(error as AxiosError<ApiResponse>));
    }
  }

  async obtenerContacto(id: number): Promise<Contacto> {
    try {
      const { data } = await axios.get<ApiResponse<Contacto>>(await this.url(`/index.php?id=${id}`), { timeout: 8000 });
      return data.data;
    } catch (error) {
      throw new Error(this.extraerMensajeError(error as AxiosError<ApiResponse>));
    }
  }

  // POST crear
  async crearContacto(contacto: Contacto): Promise<Contacto> {
    try {
      const { data } = await axios.post<ApiResponse<Contacto>>(await this.url('/index.php'), contacto, { timeout: 8000 });
      return data.data;
    } catch (error) {
      throw new Error(this.extraerMensajeError(error as AxiosError<ApiResponse>));
    }
  }

  // PUT actualizar completo
  async actualizarContacto(id: number, contacto: Contacto): Promise<Contacto> {
    try {
      const { data } = await axios.put<ApiResponse<Contacto>>(await this.url(`/index.php?id=${id}`), contacto, { timeout: 8000 });
      return data.data;
    } catch (error) {
      throw new Error(this.extraerMensajeError(error as AxiosError<ApiResponse>));
    }
  }

  // PATCH actualizar parcial
  async actualizarContactoParcial(id: number, cambios: Partial<Contacto>): Promise<Contacto> {
    try {
      const { data } = await axios.patch<ApiResponse<Contacto>>(await this.url(`/index.php?id=${id}`), cambios, { timeout: 8000 });
      return data.data;
    } catch (error) {
      throw new Error(this.extraerMensajeError(error as AxiosError<ApiResponse>));
    }
  }

  // DELETE eliminar
  async eliminarContacto(id: number): Promise<void> {
    try {
      await axios.delete<ApiResponse<null>>(await this.url(`/index.php?id=${id}`), { timeout: 8000 });
    } catch (error) {
      throw new Error(this.extraerMensajeError(error as AxiosError<ApiResponse>));
    }
  }
}