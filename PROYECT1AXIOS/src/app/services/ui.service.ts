import { Injectable } from '@angular/core';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';

@Injectable({ providedIn: 'root' })
export class UiService {

  constructor(
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {}

  // Muestra el "Loading" mientras corre la solicitud y SIEMPRE lo cierra,
  // tanto si la solicitud sale bien como si falla (por eso el try/finally).
  async conCarga<T>(mensaje: string, tarea: () => Promise<T>): Promise<T> {
    const loading = await this.loadingCtrl.create({
      message: mensaje,
      spinner: 'crescent',
      backdropDismiss: false   // no se puede cerrar tocando afuera mientras carga
    });
    await loading.present();
    try {
      return await tarea();
    } finally {
      await loading.dismiss();
    }
  }

  // Aviso corto en la parte de abajo (verde = éxito, rojo = error)
  async toast(mensaje: string, tipo: 'exito' | 'error' = 'exito'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message: mensaje,
      duration: tipo === 'exito' ? 2200 : 3500,
      position: 'bottom',
      color: tipo === 'exito' ? 'success' : 'danger'
    });
    await toast.present();
  }

  // Pregunta "¿seguro?" antes de una acción que no se puede deshacer.
  // Regresa true si el usuario confirma, false si cancela.
  async confirmar(titulo: string, mensaje: string, textoConfirmar = 'Eliminar'): Promise<boolean> {
    const alert = await this.alertCtrl.create({
      header: titulo,
      message: mensaje,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: textoConfirmar, role: 'destructive' }
      ]
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role === 'destructive';
  }
}