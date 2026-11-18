import { Injectable } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';
import { obtenerUbicacion, ResultadoUbicacion } from './ubicacion.core';

@Injectable({ providedIn: 'root' })
export class UbicacionService {
  // Pide el permiso (si hace falta) y obtiene latitud y longitud con el plugin de Capacitor
  obtener(): Promise<ResultadoUbicacion> {
    return obtenerUbicacion(Geolocation);
  }
}