import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonSpinner, IonRefresher, IonRefresherContent, IonIcon,
  IonModal, IonButtons, IonButton
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  mailOutline, callOutline, businessOutline, timeOutline, cloudOfflineOutline,
  createOutline, trashOutline, cloudUploadOutline, syncOutline
} from 'ionicons/icons';
import { ContactoService, Contacto } from '../services/contacto.service';
import { ConectividadService } from '../services/conectividad.service';
import { UiService } from '../services/ui.service';
import { SyncService } from '../services/sync.service';
import { EstadoConexionComponent } from '../shared/estado-conexion.component';
import { calcularCambios } from './cambios.util';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonSpinner, IonRefresher, IonRefresherContent, IonIcon,
    IonModal, IonButtons, IonButton,
    EstadoConexionComponent
  ],
})
export class Tab2Page implements OnInit {

  contactos: Contacto[] = [];
  cargando = true;
  error = '';
  mostrandoCache = false; // true cuando lo que se ve viene del caché, no del servidor

  // Edición (PATCH)
  editForm: FormGroup;
  contactoEditando: Contacto | null = null;
  modalEditarAbierto = false;
  errorEdicion = '';

  constructor(
    private contactoService: ContactoService,
    public conectividad: ConectividadService,
    private ui: UiService,
    public sync: SyncService, // público: la pantalla lee la cola de pendientes
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({
      'mail-outline': mailOutline,
      'call-outline': callOutline,
      'business-outline': businessOutline,
      'time-outline': timeOutline,
      'cloud-offline-outline': cloudOfflineOutline,
      'create-outline': createOutline,
      'trash-outline': trashOutline,
      'cloud-upload-outline': cloudUploadOutline,
      'sync-outline': syncOutline
    });

    // Cuando se suben contactos pendientes al servidor, la lista se actualiza sola
    this.sync.sincronizado$.pipe(takeUntilDestroyed()).subscribe(() => void this.recargarSilencioso());

    this.editForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      empresa: [''],
      email: ['', [Validators.required, Validators.email]],
      telefono: ['', [Validators.required, Validators.minLength(7)]],
      mensaje: ['', [Validators.required, Validators.minLength(3)]],
    });
  }

  ngOnInit() {
    this.cargarContactos();
  }

  // Solo se puede editar/eliminar con datos reales del servidor y con conexión
  get puedeModificar(): boolean {
    return !this.mostrandoCache && this.conectividad.conectado();
  }

  // ---------------- GET: listar (el spinner de la página es su "loading") ----------------
  async cargarContactos(event?: any) {
    this.error = '';
    this.cargando = true;
    this.mostrandoCache = false;

    try {
      const resultado = await this.contactoService.obtenerContactos();
      this.contactos = resultado.contactos;
      this.mostrandoCache = resultado.desdeCache;
      if (!resultado.desdeCache) void this.sync.registrarSincronizacion();
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

  // Actualiza la lista sin ocultarla con el spinner (se usa tras sincronizar en segundo plano)
  private async recargarSilencioso() {
    try {
      const resultado = await this.contactoService.obtenerContactos();
      this.contactos = resultado.contactos;
      this.mostrandoCache = resultado.desdeCache;
      this.error = '';
      this.cdr.detectChanges();
    } catch { /* se queda lo que ya había en pantalla */ }
  }

  // Vuelve a pedir la lista después de un cambio, para mostrar lo que de verdad hay en el servidor.
  // Si justo en ese momento el servidor no responde, aplica el cambio de forma local.
  private async refrescarLista(ajusteLocal: (lista: Contacto[]) => Contacto[]) {
    const resultado = await this.contactoService.obtenerContactos();
    this.contactos = resultado.desdeCache ? ajusteLocal(resultado.contactos) : resultado.contactos;
    this.mostrandoCache = resultado.desdeCache;
    this.cdr.detectChanges();
  }

  // ---------------- PATCH: editar ----------------
  abrirEditar(contacto: Contacto) {
    this.contactoEditando = contacto;
    this.editForm.reset({
      nombre: contacto.nombre,
      empresa: contacto.empresa ?? '',
      email: contacto.email,
      telefono: contacto.telefono,
      mensaje: contacto.mensaje
    });
    this.errorEdicion = '';
    this.modalEditarAbierto = true;
  }

  cerrarModalEditar() {
    this.modalEditarAbierto = false;
  }

  async guardarEdicion() {
    const original = this.contactoEditando;
    if (!original || original.id === undefined) return;

    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      const malos = Object.keys(this.editForm.controls).filter(c => this.editForm.get(c)?.invalid);
      this.errorEdicion = `Revisa estos campos: ${malos.join(', ')}.`;
      return;
    }

    // Solo viajan los campos que cambiaron
    const cambios = calcularCambios(original, this.editForm.value);
    if (Object.keys(cambios).length === 0) {
      this.errorEdicion = 'No hiciste ningún cambio.';
      return;
    }

    this.errorEdicion = '';
    const id = original.id;
    try {
      await this.ui.conCarga('Guardando cambios...', async () => {
        await this.contactoService.actualizarContactoParcial(id, cambios);
        await this.refrescarLista(lista => lista.map(c => (c.id === id ? { ...c, ...cambios } : c)));
      });
      this.cerrarModalEditar();
      await this.ui.toast('Contacto actualizado');
    } catch (err: any) {
      // El error se muestra dentro del modal, para que el usuario pueda corregir y reintentar
      this.errorEdicion = err?.message || 'No se pudo guardar el cambio.';
      this.cdr.detectChanges();
    }
  }

  // ---------------- DELETE: eliminar ----------------
  async eliminar(contacto: Contacto) {
    if (contacto.id === undefined) return;
    const id = contacto.id;

    const confirmado = await this.ui.confirmar(
      'Eliminar contacto',
      `¿Seguro que quieres eliminar a ${contacto.nombre}? Esta acción no se puede deshacer.`
    );
    if (!confirmado) return;

    try {
      await this.ui.conCarga('Eliminando...', async () => {
        await this.contactoService.eliminarContacto(id);
        await this.refrescarLista(lista => lista.filter(c => c.id !== id));
      });
      await this.ui.toast('Contacto eliminado');
    } catch (err: any) {
      await this.ui.toast(err?.message || 'No se pudo eliminar el contacto.', 'error');
    }
  }

  // ---------------- Cola de sincronización ----------------
  sincronizarAhora() {
    void this.sync.sincronizar(true);
  }

  reintentarPendiente(idLocal: string) {
    void this.sync.reintentar(idLocal);
  }

  async descartarPendiente(idLocal: string, nombre: string) {
    const ok = await this.ui.confirmar('Descartar contacto',
      `¿Descartar el mensaje de ${nombre}? No se enviará al servidor.`, 'Descartar');
    if (ok) await this.sync.descartar(idLocal);
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