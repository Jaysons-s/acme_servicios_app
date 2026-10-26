import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { Network } from '@capacitor/network';

@Injectable({
  providedIn: 'root'
})
export class ConectividadService {

  // signal: cualquier pantalla que lo lea se actualiza sola cuando cambia
  conectado = signal(true);

  // Eventos: se emiten solo cuando el estado CAMBIA (no en cada lectura)
  readonly reconectado$ = new Subject<void>();
  readonly desconectado$ = new Subject<void>();

  constructor() {
    this.inicializar();
  }

  private async inicializar() {
    const estado = await Network.getStatus();
    this.conectado.set(estado.connected);

    Network.addListener('networkStatusChange', (nuevo) => {
      const antes = this.conectado();
      this.conectado.set(nuevo.connected);
      if (!antes && nuevo.connected) this.reconectado$.next();
      if (antes && !nuevo.connected) this.desconectado$.next();
    });
  }

  async estaConectado(): Promise<boolean> {
    const estado = await Network.getStatus();
    return estado.connected;
  }
}