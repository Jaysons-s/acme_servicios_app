import { Injectable, signal } from '@angular/core';
import { Network } from '@capacitor/network';

@Injectable({
  providedIn: 'root'
})
export class ConectividadService {

  // signal() = una variable "reactiva" de Angular moderno: cuando cambia,
  // cualquier parte del HTML que la use se actualiza sola, sin ChangeDetectorRef.
  conectado = signal(true);

  constructor() {
    this.inicializar();
  }

  private async inicializar() {
    // Estado inicial al abrir la app
    const estado = await Network.getStatus();
    this.conectado.set(estado.connected);

    // Se suscribe a cambios futuros (el usuario activa/desactiva WiFi, pierde señal, etc.)
    Network.addListener('networkStatusChange', (estado) => {
      this.conectado.set(estado.connected);
    });
  }

  // Método de ayuda para preguntar el estado actual en cualquier momento
  async estaConectado(): Promise<boolean> {
    const estado = await Network.getStatus();
    return estado.connected;
  }
}
