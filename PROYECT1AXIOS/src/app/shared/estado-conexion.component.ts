import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { cloudDoneOutline, cloudOfflineOutline, syncOutline, timeOutline, warningOutline } from 'ionicons/icons';
import { ConectividadService } from '../services/conectividad.service';
import { ContactoService } from '../services/contacto.service';
import { SyncService } from '../services/sync.service';

type Estado = 'offline' | 'sin-servidor' | 'sincronizando' | 'pendientes' | 'online';

// Indicador de estado: se ve en la barra de arriba. Usa ícono + texto (no solo color).
@Component({
  selector: 'app-estado-conexion',
  standalone: true,
  imports: [CommonModule, IonIcon],
  template: `
    <button type="button" class="pill" [ngClass]="estado()" (click)="alTocar()"
            [attr.aria-label]="'Estado de conexión: ' + texto() + '. Toca para sincronizar.'">
      <ion-icon [name]="icono()"></ion-icon>
      <span aria-live="polite">{{ texto() }}</span>
    </button>
  `,
  styles: [`
    .pill {
      display: inline-flex; align-items: center; gap: 0.35rem;
      margin-right: 0.6rem; padding: 0.3rem 0.7rem;
      font-family: inherit; font-size: 0.75rem; font-weight: 600; line-height: 1.2;
      border-radius: 999px; border: 1px solid; cursor: pointer;
    }
    .pill:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
    ion-icon { font-size: 1rem; flex-shrink: 0; }

    .online        { color: #1B7F3B; background: #E6F4EA; border-color: #A8D5B5; }
    .offline       { color: #B3261E; background: #FDECEA; border-color: #F5C6C2; }
    .sin-servidor  { color: #8A5A00; background: #FFF4E5; border-color: #FFE0A3; }
    .pendientes    { color: #8A5A00; background: #FFF4E5; border-color: #FFE0A3; }
    .sincronizando { color: #2C5AA0; background: #E8EEF6; border-color: #B9CBE6; }

    .sincronizando ion-icon { animation: girar 1s linear infinite; }
    @keyframes girar { to { transform: rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) { .sincronizando ion-icon { animation: none; } }
  `]
})
export class EstadoConexionComponent {
  private red = inject(ConectividadService);
  private contactos = inject(ContactoService);
  private sync = inject(SyncService);

  // Prioridad: sin red > sincronizando > sin servidor > pendientes > todo bien
  estado = computed<Estado>(() => {
    if (!this.red.conectado()) return 'offline';
    if (this.sync.sincronizando()) return 'sincronizando';
    if (!this.contactos.servidorDisponible()) return 'sin-servidor';
    if (this.sync.pendientes() > 0) return 'pendientes';
    return 'online';
  });

  texto = computed(() => {
    switch (this.estado()) {
      case 'offline': return this.sync.pendientes() > 0 ? `Sin conexión · ${this.sync.pendientes()} pendiente(s)` : 'Sin conexión';
      case 'sincronizando': return 'Sincronizando…';
      case 'sin-servidor': return this.sync.pendientes() > 0 ? `Sin servidor · ${this.sync.pendientes()} pendiente(s)` : 'Sin servidor';
      case 'pendientes': return `${this.sync.pendientes()} pendiente(s)`;
      default: return 'En línea';
    }
  });

  icono = computed(() => {
    switch (this.estado()) {
      case 'offline': return 'cloud-offline-outline';
      case 'sincronizando': return 'sync-outline';
      case 'sin-servidor': return 'warning-outline';
      case 'pendientes': return 'time-outline';
      default: return 'cloud-done-outline';
    }
  });

  constructor() {
    addIcons({
      'cloud-done-outline': cloudDoneOutline,
      'cloud-offline-outline': cloudOfflineOutline,
      'sync-outline': syncOutline,
      'time-outline': timeOutline,
      'warning-outline': warningOutline
    });
  }

  alTocar() {
    void this.sync.sincronizar(true);
  }
}