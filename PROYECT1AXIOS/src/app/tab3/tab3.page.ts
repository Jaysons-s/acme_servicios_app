import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonItem, IonInput, IonTextarea, IonButton, IonList,
  IonItemSliding, IonItemOptions, IonItemOption, IonLabel, IonNote
} from '@ionic/angular';
import { NotaService, Nota } from '../services/nota.service';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonItem, IonInput, IonTextarea, IonButton, IonList,
    IonItemSliding, IonItemOptions, IonItemOption, IonLabel, IonNote
  ],
})
export class Tab3Page implements OnInit {

  notas: Nota[] = [];

  // Campos del formulario
  titulo = '';
  contenido = '';

  // Si tiene valor, estamos editando esa nota en vez de crear una nueva
  editandoId: number | null = null;

  constructor(
    private notaService: NotaService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargarNotas();
  }

  async cargarNotas() {
    this.notas = await this.notaService.obtenerNotas();
    this.cdr.detectChanges();
  }

  async guardar() {
    if (!this.titulo.trim() || !this.contenido.trim()) {
      return;
    }

    if (this.editandoId !== null) {
      // MODIFICACIÓN
      await this.notaService.actualizarNota(this.editandoId, this.titulo, this.contenido);
    } else {
      // ALTA
      await this.notaService.agregarNota(this.titulo, this.contenido);
    }

    this.limpiarFormulario();
    await this.cargarNotas();
  }

  editar(nota: Nota) {
    this.editandoId = nota.id;
    this.titulo = nota.titulo;
    this.contenido = nota.contenido;
  }

  cancelarEdicion() {
    this.limpiarFormulario();
  }

  async eliminar(id: number) {
    await this.notaService.eliminarNota(id);
    await this.cargarNotas();
  }

  private limpiarFormulario() {
    this.titulo = '';
    this.contenido = '';
    this.editandoId = null;
  }
}