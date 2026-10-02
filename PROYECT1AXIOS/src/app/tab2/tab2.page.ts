import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonSpinner, IonRefresher, IonRefresherContent, IonIcon
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { mailOutline, callOutline, businessOutline, timeOutline, cloudOfflineOutline } from 'ionicons/icons';
import { ContactoService, Contacto } from '../services/contacto.service';
import { ConectividadService } from '../services/conectividad.service';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonSpinner, IonRefresher, IonRefresherContent, IonIcon
  ],
})
export class Tab2Page implements OnInit {

  contactos: Contacto[] = [];
  cargando = true;
  error = '';
  mostrandoCache = false; // true cuando los datos en pantalla vienen del caché, no del servidor

  constructor(
    private contactoService: ContactoService,
    public conectividad: ConectividadService, // público para poder leerlo directo desde el HTML
    private cdr: ChangeDetectorRef
  ) {
    addIcons({
      'mail-outline': mailOutline,
      'call-outline': callOutline,
      'business-outline': businessOutline,
      'time-outline': timeOutline,
      'cloud-offline-outline': cloudOfflineOutline
    });
  }

  ngOnInit() {
    this.cargarContactos();
  }

  async cargarContactos(event?: any) {
    this.error = '';
    this.cargando = true;
    this.mostrandoCache = false;

    try {
      const resultado = await this.contactoService.obtenerContactos();
      this.contactos = resultado.contactos;
      this.mostrandoCache = resultado.desdeCache;
    } catch (err: any) {
      // Esto solo pasa si falló Y no había absolutamente nada en caché
      this.error = err?.message || 'No se pudieron cargar los contactos.';
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
      if (event) {
        event.target.complete();
      }
    }
  }

  iniciales(nombre: string): string {
    return nombre
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(p => p[0].toUpperCase())
      .join('');
  }
}