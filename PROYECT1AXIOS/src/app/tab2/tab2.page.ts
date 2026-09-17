import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonList, IonItem, IonLabel, IonNote, IonSpinner,
  IonRefresher, IonRefresherContent, IonIcon
} from '@ionic/angular';
import { ContactoService, Contacto } from '../services/contacto.service';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonList, IonItem, IonLabel, IonNote, IonSpinner,
    IonRefresher, IonRefresherContent, IonIcon
  ],
})
export class Tab2Page implements OnInit {

  contactos: Contacto[] = [];
  cargando = true;
  error = '';

  constructor(
    private contactoService: ContactoService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargarContactos();
  }

  async cargarContactos(event?: any) {
    this.error = '';
    this.cargando = true;
    try {
      this.contactos = await this.contactoService.obtenerContactos();
    } catch (err: any) {
      this.error = err?.message || 'No se pudieron cargar los contactos.';
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
      if (event) {
        event.target.complete();
      }
    }
  }
}