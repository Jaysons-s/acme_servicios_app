import { Component, OnInit, ViewChild, ElementRef, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent } from '@ionic/angular';
import { Router } from '@angular/router';
import axios from 'axios';
import anime from 'animejs';
import { OrigenDatosService } from '../services/origen-datos.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, FormsModule],
})
export class LoginPage implements OnInit {
  @ViewChild('pathRef') pathRef!: ElementRef<SVGPathElement>;

  email = '';
  password = '';
  ip = '';          // IP de la laptop (se guarda en el dispositivo)
  puerto = '80';
  error = '';
  cargando = false;

  private currentAnim: anime.AnimeInstance | null = null;

  constructor(
    private router: Router,
    private origenDatos: OrigenDatosService,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  // Al abrir la app, recupera la IP guardada la última vez (no hay que volver a escribirla)
  async ngOnInit() {
    const config = await this.origenDatos.obtenerConfig();
    this.ip = config.ip;
    this.puerto = config.puerto;
    this.cdr.detectChanges();
  }

  animatePath(offset: number, dasharray: string) {
    if (!this.pathRef) return;
    if (this.currentAnim) this.currentAnim.pause();
    this.currentAnim = anime({
      targets: this.pathRef.nativeElement,
      strokeDashoffset: { value: offset, duration: 700, easing: 'easeOutQuart' },
      strokeDasharray: { value: dasharray, duration: 700, easing: 'easeOutQuart' },
    });
  }

  // Muestra un mensaje y fuerza a Angular a repintar (Axios corre fuera de la zona de Angular)
  private mostrarError(mensaje: string) {
    this.zone.run(() => {
      this.error = mensaje;
      this.cargando = false;
      this.cdr.detectChanges();
    });
  }

  async handleLogin(e: Event) {
    e.preventDefault();
    this.error = '';

    if (!this.email.trim() || !this.password) {
      this.mostrarError('Escribe tu correo y contraseña.');
      return;
    }

    this.cargando = true;
    try { this.animatePath(-730, '530 1386'); } catch { /* la animación no es crítica */ }

    try {
      // 1) Guarda la IP/puerto en el dispositivo (JSON) para toda la app
      const config = await this.origenDatos.guardarConfig(this.ip, this.puerto);
      this.ip = config.ip;
      this.puerto = config.puerto;

      // 2) Llama a la API de login en esa IP
      const base = await this.origenDatos.obtenerUrlBase();
      const response = await axios.post(
        `${base}/miapi/login.php`,
        { email: this.email, password: this.password },
        { timeout: 8000 }
      );

      if (response.data?.success) {
        this.zone.run(() => {
          this.cargando = false;
          this.router.navigateByUrl('/tabs/tab1');
        });
      } else {
        this.mostrarError(response.data?.message || 'Usuario o contraseña incorrectos');
      }
    } catch (err: any) {
      console.error('Error de login:', err);
      if (err?.code === 'ECONNABORTED') {
        this.mostrarError(`El servidor (${this.ip || 'localhost'}) tardó demasiado. Revisa la IP y que Apache esté encendido.`);
      } else if (err?.response) {
        this.mostrarError(`El servidor respondió con error ${err.response.status}.`);
      } else {
        this.mostrarError(`No se pudo conectar a ${this.ip || 'localhost'}:${this.puerto}. Revisa la IP y que estés en la misma red WiFi.`);
      }
    }
  }
}