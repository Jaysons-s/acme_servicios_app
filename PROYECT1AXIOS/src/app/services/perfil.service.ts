import { Injectable, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

const CLAVE = 'perfil_usuario';

export interface Perfil {
  nombre: string;
  email: string;
  telefono: string;
  // Ya NO guardamos la imagen completa aquí (pesaba mucho).
  // Solo guardamos el nombre del archivo de la foto; la foto real
  // vive en la galería del teléfono y en una copia ligera dentro de la app.
  fotoArchivo: string | null;
}

const PERFIL_VACIO: Perfil = {
  nombre: '',
  email: '',
  telefono: '',
  fotoArchivo: null
};

@Injectable({
  providedIn: 'root'
})
export class PerfilService {

  perfil = signal<Perfil>(PERFIL_VACIO);

  constructor() {
    this.cargar();
  }

  private async cargar() {
    const { value } = await Preferences.get({ key: CLAVE });
    if (value) {
      this.perfil.set(JSON.parse(value));
    }
  }

  // Lee el perfil directo del disco (para cuando la pantalla necesita
  // el dato ya cargado y no el signal, que puede tardar un instante)
  async obtener(): Promise<Perfil> {
    const { value } = await Preferences.get({ key: CLAVE });
    return value ? JSON.parse(value) : PERFIL_VACIO;
  }

  async guardar(nuevoPerfil: Perfil): Promise<void> {
    this.perfil.set(nuevoPerfil);
    await Preferences.set({ key: CLAVE, value: JSON.stringify(nuevoPerfil) });
  }
}
