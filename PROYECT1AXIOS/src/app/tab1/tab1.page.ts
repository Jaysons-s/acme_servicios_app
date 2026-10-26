import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonIcon,
  IonModal, IonButtons, IonButton
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  close, checkmarkCircleOutline, alertCircleOutline,
  personOutline, businessOutline, mailOutline, callOutline, chatbubbleOutline,
  locationOutline, cloudOfflineOutline
} from 'ionicons/icons';
import { ContactoService, Contacto, ErrorApi } from '../services/contacto.service';
import { ConectividadService } from '../services/conectividad.service';
import { UiService } from '../services/ui.service';
import { SyncService } from '../services/sync.service';
import { EstadoConexionComponent } from '../shared/estado-conexion.component';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonIcon,
    IonModal, IonButtons, IonButton,
    EstadoConexionComponent
  ],
})
export class Tab1Page implements OnInit {

  contactoForm!: FormGroup;
  enviando = false;

  modalExitoAbierto = false;
  modalErrorAbierto = false;
  tituloExito = '¡Éxito!';
  mensajeExito = '';
  mensajeError = '';

  constructor(
    private fb: FormBuilder,
    private contactoService: ContactoService,
    public conectividad: ConectividadService, // público para leerlo desde el HTML (banner)
    private ui: UiService,
    private sync: SyncService
  ) {
    addIcons({
      'close': close,
      'checkmark-circle-outline': checkmarkCircleOutline,
      'alert-circle-outline': alertCircleOutline,
      'person-outline': personOutline,
      'business-outline': businessOutline,
      'mail-outline': mailOutline,
      'call-outline': callOutline,
      'chatbubble-outline': chatbubbleOutline,
      'location-outline': locationOutline,
      'cloud-offline-outline': cloudOfflineOutline
    });
  }

  ngOnInit() {
    this.contactoForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      empresa: [''],
      email: ['', [Validators.required, Validators.email]],
      telefono: ['', [Validators.required, Validators.minLength(7)]],
      mensaje: ['', [Validators.required, Validators.minLength(3)]],
    });
  }

  async onSubmit() {
    if (this.contactoForm.invalid) {
      this.contactoForm.markAllAsTouched();
      const camposInvalidos = Object.keys(this.contactoForm.controls)
        .filter(campo => this.contactoForm.get(campo)?.invalid);
      this.mensajeError = `Revisa estos campos: ${camposInvalidos.join(', ')}.`;
      this.modalErrorAbierto = true;
      return;
    }

    const nuevoContacto: Contacto = this.contactoForm.value;
    this.enviando = true;

    try {
      // 1) Sin red en el dispositivo: se guarda localmente y se enviará al reconectar
      if (!(await this.conectividad.estaConectado())) {
        await this.guardarParaDespues(nuevoContacto);
        return;
      }

      // 2) Hay red: se intenta el POST, con el "Loading" de Ionic visible
      try {
        const creado = await this.ui.conCarga('Enviando mensaje...', () =>
          this.contactoService.crearContacto(nuevoContacto)
        );
        this.tituloExito = '¡Enviado!';
        this.mensajeExito = `¡Gracias ${creado.nombre}! Tu mensaje fue enviado correctamente.`;
        this.modalExitoAbierto = true;
        this.contactoForm.reset();
      } catch (error: any) {
        if (error instanceof ErrorApi && error.esRed) {
          // Hay WiFi pero el servidor no responde (IP mal, Apache apagado, timeout...): tampoco se pierde el mensaje
          await this.guardarParaDespues(nuevoContacto);
        } else {
          // El servidor sí respondió y rechazó los datos (ej. 422): eso se corrige, no se guarda para después
          this.mensajeError = error?.message || 'Ocurrió un error al enviar el formulario.';
          this.modalErrorAbierto = true;
        }
      }
    } finally {
      this.enviando = false;
    }
  }

  // Guarda el contacto en el dispositivo (cola de sincronización) y avisa al usuario
  private async guardarParaDespues(contacto: Contacto) {
    await this.sync.guardarOffline(contacto);
    this.tituloExito = 'Guardado sin conexión';
    this.mensajeExito =
      'No hay conexión con el servidor. Tu mensaje se guardó en este dispositivo y se enviará solo cuando vuelva la conexión.';
    this.modalExitoAbierto = true;
    this.contactoForm.reset();
  }

  cerrarModalExito() {
    this.modalExitoAbierto = false;
  }

  cerrarModalError() {
    this.modalErrorAbierto = false;
  }
}