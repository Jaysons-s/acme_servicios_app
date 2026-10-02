import { Injectable } from '@angular/core';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { Preferences } from '@capacitor/preferences';

// URL base de la API en PHP.
const API_URL = 'http://localhost/api';

const CACHE_KEY = 'contactos_cache'; // clave donde guardamos la última lista buena que llegó

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

  private http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 8000
    });
  }

  private extraerMensajeError(error: AxiosError<ApiResponse>): string {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.request) {
      return 'No se pudo conectar con el servidor. Verifica tu conexión.';
    }
    return 'Ocurrió un error inesperado.';
  }

  // ---------- CACHÉ ----------
  // Guarda la última lista de contactos que sí llegó bien, para poder
  // mostrarla después aunque no haya conexión.
  private async guardarCache(contactos: Contacto[]): Promise<void> {
    await Preferences.set({ key: CACHE_KEY, value: JSON.stringify(contactos) });
  }

  // Lee lo que haya guardado en caché (arreglo vacío si nunca se guardó nada)
  private async leerCache(): Promise<Contacto[]> {
    const { value } = await Preferences.get({ key: CACHE_KEY });
    return value ? JSON.parse(value) : [];
  }

  // ---------- CRUD ----------

  // READ (listar todos) → GET /index.php
  // Ahora con estrategia de caché: si la API responde bien, actualiza el caché.
  // Si la API falla (sin conexión, servidor caído), regresa lo último guardado.
  async obtenerContactos(): Promise<ResultadoContactos> {
    try {
      const { data } = await this.http.get<ApiResponse<Contacto[]>>('/index.php');
      await this.guardarCache(data.data); // guarda copia fresca para la próxima vez que falle
      return { contactos: data.data, desdeCache: false };
    } catch (error) {
      // Si falla la petición real, intenta rescatar lo que haya en caché
      const cache = await this.leerCache();
      if (cache.length > 0) {
        return { contactos: cache, desdeCache: true };
      }
      // Si ni siquiera hay caché (primera vez que se usa la app sin conexión), sí se lanza el error
      throw new Error(this.extraerMensajeError(error as AxiosError<ApiResponse>));
    }
  }

  async obtenerContacto(id: number): Promise<Contacto> {
    try {
      const { data } = await this.http.get<ApiResponse<Contacto>>(`/index.php?id=${id}`);
      return data.data;
    } catch (error) {
      throw new Error(this.extraerMensajeError(error as AxiosError<ApiResponse>));
    }
  }

  // CREATE → POST /index.php
  async crearContacto(contacto: Contacto): Promise<Contacto> {
    try {
      const { data } = await this.http.post<ApiResponse<Contacto>>('/index.php', contacto);
      return data.data;
    } catch (error) {
      throw new Error(this.extraerMensajeError(error as AxiosError<ApiResponse>));
    }
  }

  async actualizarContacto(id: number, contacto: Contacto): Promise<Contacto> {
    try {
      const { data } = await this.http.put<ApiResponse<Contacto>>(`/index.php?id=${id}`, contacto);
      return data.data;
    } catch (error) {
      throw new Error(this.extraerMensajeError(error as AxiosError<ApiResponse>));
    }
  }

  async actualizarContactoParcial(id: number, cambios: Partial<Contacto>): Promise<Contacto> {
    try {
      const { data } = await this.http.patch<ApiResponse<Contacto>>(`/index.php?id=${id}`, cambios);
      return data.data;
    } catch (error) {
      throw new Error(this.extraerMensajeError(error as AxiosError<ApiResponse>));
    }
  }

  async eliminarContacto(id: number): Promise<void> {
    try {
      await this.http.delete<ApiResponse<null>>(`/index.php?id=${id}`);
    } catch (error) {
      throw new Error(this.extraerMensajeError(error as AxiosError<ApiResponse>));
    }
  }
}