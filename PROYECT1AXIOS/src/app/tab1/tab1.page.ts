import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonIcon,
  IonModal, IonButtons, IonButton
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { close, checkmarkCircleOutline, alertCircleOutline } from 'ionicons/icons';
import { ContactoService, Contacto } from '../services/contacto.service';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonIcon,
    IonModal, IonButtons, IonButton
  ],
})
export class Tab1Page implements OnInit {

  contactoForm!: FormGroup;
  enviando = false;

  modalExitoAbierto = false;
  modalErrorAbierto = false;
  mensajeExito = '';
  mensajeError = '';

  constructor(
    private fb: FormBuilder,
    private contactoService: ContactoService
  ) {
    // Registramos los íconos que usa el HTML (close, check, alert)
    addIcons({
      'close': close,
      'checkmark-circle-outline': checkmarkCircleOutline,
      'alert-circle-outline': alertCircleOutline
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

    this.enviando = true;

    const nuevoContacto: Contacto = this.contactoForm.value;

    try {
      const creado = await this.contactoService.crearContacto(nuevoContacto);

      this.mensajeExito = `¡Gracias ${creado.nombre}! Tu mensaje fue enviado correctamente.`;
      this.modalExitoAbierto = true;

      this.contactoForm.reset();
    } catch (error: any) {
      this.mensajeError = error?.message || 'Ocurrió un error al enviar el formulario.';
      this.modalErrorAbierto = true;
    } finally {
      this.enviando = false;
    }
  }

  cerrarModalExito() {
    this.modalExitoAbierto = false;
  }

  cerrarModalError() {
    this.modalErrorAbierto = false;
  }
}