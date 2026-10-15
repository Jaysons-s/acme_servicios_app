import { Component, ElementRef, HostListener, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonSpinner, IonRefresher, IonRefresherContent, IonIcon
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { cloudOfflineOutline } from 'ionicons/icons';
import { ContactoService, Contacto } from '../services/contacto.service';
import {
  Kpis, agruparPorDia, agruparPorEmpresa, conVsSinEmpresa, calcularKpis,
  dibujarBarrasPorDia, dibujarBarrasPorEmpresa, dibujarDona
} from './graficas.d3';

@Component({
  selector: 'app-graficas',
  templateUrl: 'graficas.page.html',
  styleUrls: ['graficas.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonSpinner, IonRefresher, IonRefresherContent, IonIcon
  ],
})
export class GraficasPage {

  // Los contenedores siempre existen en el HTML (static: true), así D3 puede dibujar en ellos
  @ViewChild('chartDias', { static: true }) chartDias!: ElementRef<HTMLElement>;
  @ViewChild('chartEmpresas', { static: true }) chartEmpresas!: ElementRef<HTMLElement>;
  @ViewChild('chartDona', { static: true }) chartDona!: ElementRef<HTMLElement>;

  contactos: Contacto[] = [];
  kpis: Kpis = { total: 0, empresas: 0, ultimos7: 0 };
  cargando = true;
  error = '';
  desdeCache = false;

  private visible = false; // solo se dibuja cuando la pantalla ya está a la vista (así el ancho es real)
  private frame = 0;

  constructor(
    private contactoService: ContactoService,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({ 'cloud-offline-outline': cloudOfflineOutline });
  }

  // Cada vez que se entra al tab se piden los datos de nuevo
  async ionViewWillEnter() {
    await this.cargar();
  }

  ionViewDidEnter() {
    this.visible = true;
    this.dibujar();
  }

  ionViewWillLeave() {
    this.visible = false;
  }

  async cargar(event?: any) {
    this.error = '';
    this.cargando = true;
    try {
      // Mismo GET de siempre (ContactoService); si no hay conexión usa el caché
      const resultado = await this.contactoService.obtenerContactos();
      this.contactos = resultado.contactos;
      this.desdeCache = resultado.desdeCache;
      this.kpis = calcularKpis(this.contactos);
    } catch (err: any) {
      this.contactos = [];
      this.error = err?.message || 'No se pudieron cargar los datos.';
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();   // muestra el contenido ANTES de dibujar, para medir el ancho real
      this.dibujar();
      event?.target?.complete();
    }
  }

  private dibujar() {
    if (!this.visible || this.cargando || this.error || this.contactos.length === 0) return;

    const ancho = (el: ElementRef<HTMLElement>) => Math.round(el.nativeElement.clientWidth) || 320;

    dibujarBarrasPorDia(this.chartDias.nativeElement, agruparPorDia(this.contactos), ancho(this.chartDias));
    dibujarBarrasPorEmpresa(this.chartEmpresas.nativeElement, agruparPorEmpresa(this.contactos), ancho(this.chartEmpresas));
    dibujarDona(this.chartDona.nativeElement, conVsSinEmpresa(this.contactos), ancho(this.chartDona));
  }

  // Si se gira el celular o cambia el tamaño, se redibuja con el nuevo ancho
  @HostListener('window:resize')
  onResize() {
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => this.dibujar());
  }
}