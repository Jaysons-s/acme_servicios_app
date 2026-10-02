import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

export interface Nota {
  id: number;
  titulo: string;
  contenido: string;
  fecha: string;
}

const STORAGE_KEY = 'notas_locales';

@Injectable({
  providedIn: 'root'
})
export class NotaService {

  // Lee todo el arreglo guardado en el dispositivo
  private async leerTodas(): Promise<Nota[]> {
    const { value } = await Preferences.get({ key: STORAGE_KEY });
    return value ? JSON.parse(value) : [];
  }

  // Guarda el arreglo completo de vuelta en el dispositivo
  private async guardarTodas(notas: Nota[]): Promise<void> {
    await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(notas) });
  }

  // CONSULTA (Read) - todas las notas
  async obtenerNotas(): Promise<Nota[]> {
    const notas = await this.leerTodas();
    // Más recientes primero
    return notas.sort((a, b) => b.id - a.id);
  }

  // ALTA (Create)
  async agregarNota(titulo: string, contenido: string): Promise<Nota> {
    const notas = await this.leerTodas();
    const nuevaNota: Nota = {
      id: Date.now(), // id sencillo basado en la fecha/hora actual
      titulo,
      contenido,
      fecha: new Date().toLocaleString()
    };
    notas.push(nuevaNota);
    await this.guardarTodas(notas);
    return nuevaNota;
  }

  // MODIFICACIÓN (Update)
  async actualizarNota(id: number, titulo: string, contenido: string): Promise<void> {
    const notas = await this.leerTodas();
    const index = notas.findIndex(n => n.id === id);
    if (index !== -1) {
      notas[index].titulo = titulo;
      notas[index].contenido = contenido;
      notas[index].fecha = new Date().toLocaleString() + ' (editado)';
      await this.guardarTodas(notas);
    }
  }

  // ELIMINACIÓN (Delete)
  async eliminarNota(id: number): Promise<void> {
    const notas = await this.leerTodas();
    const filtradas = notas.filter(n => n.id !== id);
    await this.guardarTodas(filtradas);
  }
}