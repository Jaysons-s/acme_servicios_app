import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { cameraOutline, personOutline, checkmarkCircleOutline } from 'ionicons/icons';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { PerfilService, Perfil } from '../services/perfil.service';

const NOMBRE_ARCHIVO_FOTO = 'perfil.jpg';

@Component({
  selector: 'app-perfil',
  templateUrl: 'perfil.page.html',
  styleUrls: ['perfil.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon
  ],
})
export class PerfilPage implements OnInit {

  nombre = '';
  email = '';
  telefono = '';

  // Es lo que se muestra en el <img>: un "data URL" armado al leer el archivo.
  // Se llama igual que antes para no tocar el HTML.
  fotoBase64: string | null = null;

  private fotoArchivo: string | null = null; // nombre del archivo guardado en la app

  guardado = false;

  constructor(private perfilService: PerfilService) {
    addIcons({
      'camera-outline': cameraOutline,
      'person-outline': personOutline,
      'checkmark-circle-outline': checkmarkCircleOutline
    });
  }

  async ngOnInit() {
    const actual = await this.perfilService.obtener();
    this.nombre = actual.nombre;
    this.email = actual.email;
    this.telefono = actual.telefono;
    this.fotoArchivo = actual.fotoArchivo;

    if (this.fotoArchivo) {
      await this.mostrarFoto(this.fotoArchivo);
    }
  }

  async tomarFoto() {
    try {
      const foto = await Camera.getPhoto({
        quality: 80,
        resultType: CameraResultType.Uri,   // nos da la ruta del archivo, no el texto base64 gigante
        source: CameraSource.Prompt,        // deja elegir entre cámara o galería
        saveToGallery: true,                // ← AQUÍ se guarda la foto en la galería del teléfono
        width: 1024
      });

      if (!foto.webPath) return;

      // Además de la copia en la galería, guardamos una copia dentro de la app,
      // solo para poder mostrarla siempre, aunque la galería cambie o mueva el archivo.
      const respuesta = await fetch(foto.webPath);
      const blob = await respuesta.blob();
      const dataUrl = await this.blobADataUrl(blob);

      await Filesystem.writeFile({
        path: NOMBRE_ARCHIVO_FOTO,
        data: dataUrl.split(',')[1],        // el plugin pide solo el base64, sin el prefijo "data:image/..."
        directory: Directory.Data
      });

      this.fotoArchivo = NOMBRE_ARCHIVO_FOTO;
      this.fotoBase64 = dataUrl;
    } catch (error) {
      // El usuario canceló, o no dio permiso — no es un error grave
      console.log('No se tomó foto:', error);
    }
  }

  // Lee el archivo guardado en la app y lo convierte en algo que <img> entienda
  private async mostrarFoto(nombreArchivo: string) {
    try {
      const archivo = await Filesystem.readFile({
        path: nombreArchivo,
        directory: Directory.Data
      });
      this.fotoBase64 = `data:image/jpeg;base64,${archivo.data}`;
    } catch {
      this.fotoBase64 = null; // el archivo ya no existe, se muestran las iniciales
    }
  }

  private blobADataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const lector = new FileReader();
      lector.onloadend = () => resolve(lector.result as string);
      lector.onerror = reject;
      lector.readAsDataURL(blob);
    });
  }

  async guardarPerfil() {
    const nuevoPerfil: Perfil = {
      nombre: this.nombre,
      email: this.email,
      telefono: this.telefono,
      fotoArchivo: this.fotoArchivo
    };

    await this.perfilService.guardar(nuevoPerfil);

    this.guardado = true;
    setTimeout(() => { this.guardado = false; }, 2500);
  }

  iniciales(): string {
    if (!this.nombre) return '';
    return this.nombre
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(p => p[0].toUpperCase())
      .join('');
  }
}
