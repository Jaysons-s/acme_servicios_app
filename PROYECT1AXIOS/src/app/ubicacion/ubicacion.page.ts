import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  locationOutline, navigateOutline, refreshOutline, warningOutline,
  shieldCheckmarkOutline, businessOutline
} from 'ionicons/icons';
import { UbicacionService } from '../services/ubicacion.service';
import { SUCURSALES } from '../services/sucursales.config';
import {
  Coordenadas, ErrorUbicacion,
  ordenarPorCercania, formatearDistancia, formatearCoordenada, urlComoLlegar
} from '../services/ubicacion.core';

type Estado = 'inicial' | 'cargando' | 'listo' | 'error';

@Component({
  selector: 'app-ubicacion',
  templateUrl: 'ubicacion.page.html',
  styleUrls: ['ubicacion.page.scss'],
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, IonSpinner],
})
export class UbicacionPage {

  // Estado de la pantalla (signals: la vista se actualiza sola cuando cambian)
  estado = signal<Estado>('inicial');
  coordenadas = signal<Coordenadas | null>(null);
  modo = signal<'precisa' | 'aproximada'>('precisa');
  error = signal<ErrorUbicacion | null>(null);

  // Funcionalidad basada en ubicación: sucursales ordenadas por cercanía a donde estás
  sucursales = computed(() => {
    const c = this.coordenadas();
    return c ? ordenarPorCercania(c, SUCURSALES) : [];
  });
  masCercana = computed(() => this.sucursales()[0] ?? null);
  otras = computed(() => this.sucursales().slice(1));
  hora = computed(() => {
    const c = this.coordenadas();
    return c ? new Date(c.marcaTiempo).toLocaleTimeString() : '';
  });

  // Se usan desde el HTML
  distancia = formatearDistancia;
  coordenada = formatearCoordenada;
  comoLlegar = urlComoLlegar;

  constructor(private ubicacionService: UbicacionService) {
    addIcons({
      'location-outline': locationOutline,
      'navigate-outline': navigateOutline,
      'refresh-outline': refreshOutline,
      'warning-outline': warningOutline,
      'shield-checkmark-outline': shieldCheckmarkOutline,
      'business-outline': businessOutline
    });
  }

  // Pide el permiso (si hace falta), obtiene latitud y longitud y calcula la sucursal más cercana
  async obtener() {
    this.estado.set('cargando');
    this.error.set(null);

    const resultado = await this.ubicacionService.obtener();

    if (resultado.ok) {
      this.coordenadas.set(resultado.coordenadas);
      this.modo.set(resultado.modo);
      this.estado.set('listo');
    } else {
      this.error.set(resultado.error);
      this.estado.set('error');
    }
  }
}