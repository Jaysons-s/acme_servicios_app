import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/angular';
import axios from 'axios';
import { OrigenDatosService } from '../services/origen-datos.service';

@Component({
  selector: 'app-origen-datos',
  templateUrl: 'origen-datos.page.html',
  styleUrls: ['origen-datos.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonContent],
})
export class OrigenDatosPage implements OnInit {

  ip = '';
  puerto = '80';
  urlActual = '';
  guardado = false;
  probando = false;
  resultadoPrueba = '';
  pruebaOk = false;

  constructor(private origenDatos: OrigenDatosService, private cdr: ChangeDetectorRef) {}

  async ngOnInit() { await this.cargar(); }

  // Se ejecuta cada vez que entras al tab (Ionic reutiliza la pantalla)
  async ionViewWillEnter() { await this.cargar(); }

  private async cargar() {
    const c = await this.origenDatos.obtenerConfig();
    this.ip = c.ip;
    this.puerto = c.puerto;
    this.urlActual = await this.origenDatos.obtenerUrlBase();
    this.cdr.detectChanges();
  }

  async guardar() {
    const c = await this.origenDatos.guardarConfig(this.ip, this.puerto);
    this.ip = c.ip;
    this.puerto = c.puerto;
    this.urlActual = await this.origenDatos.obtenerUrlBase();
    this.guardado = true;
    this.resultadoPrueba = '';
    this.cdr.detectChanges();
    setTimeout(() => { this.guardado = false; this.cdr.detectChanges(); }, 2500);
  }

  // Hace un GET a la API de contactos para comprobar que la IP responde
  async probar() {
    await this.guardar();
    this.probando = true;
    this.resultadoPrueba = '';
    try {
      const r = await axios.get(`${this.urlActual}/api/index.php`, { timeout: 5000 });
      this.pruebaOk = !!r.data?.success;
      this.resultadoPrueba = this.pruebaOk
        ? `Conectado correctamente a ${this.urlActual}`
        : 'El servidor respondió, pero no con lo esperado.';
    } catch {
      this.pruebaOk = false;
      this.resultadoPrueba = `No se pudo conectar a ${this.urlActual}. Revisa la IP, el WiFi y que Apache esté encendido.`;
    }
    this.probando = false;
    this.cdr.detectChanges();
  }
}