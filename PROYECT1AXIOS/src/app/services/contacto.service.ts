import { Injectable } from '@angular/core';
import axios, { AxiosInstance, AxiosError } from 'axios';

// Ajusta esta URL a donde tengas montada tu API PHP
// Ejemplo local con XAMPP/WAMP: 'http://localhost/api'
// Ejemplo con IP de tu servidor: 'http://192.168.1.10/api'
const API_URL = 'http://localhost/api';

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
      timeout: 10000
    });
  }

  // Extrae un mensaje de error legible venga de donde venga
  private extraerMensajeError(error: AxiosError<ApiResponse>): string {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.request) {
      return 'No se pudo conectar con el servidor. Verifica tu conexión.';
    }
    return 'Ocurrió un error inesperado.';
  }

  // GET - listar todos
  async obtenerContactos(): Promise<Contacto[]> {
    try {
      const { data } = await this.http.get<ApiResponse<Contacto[]>>('/index.php');
      return data.data;
    } catch (error) {
      throw new Error(this.extraerMensajeError(error as AxiosError<ApiResponse>));
    }
  }

  // GET - obtener uno
  async obtenerContacto(id: number): Promise<Contacto> {
    try {
      const { data } = await this.http.get<ApiResponse<Contacto>>(`/index.php?id=${id}`);
      return data.data;
    } catch (error) {
      throw new Error(this.extraerMensajeError(error as AxiosError<ApiResponse>));
    }
  }

  // POST - crear
  async crearContacto(contacto: Contacto): Promise<Contacto> {
    try {
      const { data } = await this.http.post<ApiResponse<Contacto>>('/index.php', contacto);
      return data.data;
    } catch (error) {
      throw new Error(this.extraerMensajeError(error as AxiosError<ApiResponse>));
    }
  }

  // PUT - actualizar completo
  async actualizarContacto(id: number, contacto: Contacto): Promise<Contacto> {
    try {
      const { data } = await this.http.put<ApiResponse<Contacto>>(`/index.php?id=${id}`, contacto);
      return data.data;
    } catch (error) {
      throw new Error(this.extraerMensajeError(error as AxiosError<ApiResponse>));
    }
  }

  // PATCH - actualizar parcial
  async actualizarContactoParcial(id: number, cambios: Partial<Contacto>): Promise<Contacto> {
    try {
      const { data } = await this.http.patch<ApiResponse<Contacto>>(`/index.php?id=${id}`, cambios);
      return data.data;
    } catch (error) {
      throw new Error(this.extraerMensajeError(error as AxiosError<ApiResponse>));
    }
  }

  // DELETE - eliminar
  async eliminarContacto(id: number): Promise<void> {
    try {
      await this.http.delete<ApiResponse<null>>(`/index.php?id=${id}`);
    } catch (error) {
      throw new Error(this.extraerMensajeError(error as AxiosError<ApiResponse>));
    }
  }
}