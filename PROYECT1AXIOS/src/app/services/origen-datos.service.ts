import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

const CLAVE = 'origen_datos_config';

export interface OrigenDatosConfig {
  ip: string;
  puerto: string;
}

const POR_DEFECTO: OrigenDatosConfig = { ip: '', puerto: '80' };

@Injectable({ providedIn: 'root' })
export class OrigenDatosService {

  // Lee el JSON guardado en el dispositivo
  async obtenerConfig(): Promise<OrigenDatosConfig> {
    const { value } = await Preferences.get({ key: CLAVE });
    return value ? { ...POR_DEFECTO, ...JSON.parse(value) } : POR_DEFECTO;
  }

  // Limpia lo que escriba el usuario (quita http://, rutas y separa "ip:puerto")
  private normalizar(ip: string, puerto: string): OrigenDatosConfig {
    let host = (ip || '').trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
    let port = (puerto || '').trim();
    const m = host.match(/^(.*):(\d+)$/);
    if (m) { host = m[1]; port = m[2]; }
    return { ip: host, puerto: port || '80' };
  }

  async guardarConfig(ip: string, puerto: string): Promise<OrigenDatosConfig> {
    const config = this.normalizar(ip, puerto);
    await Preferences.set({ key: CLAVE, value: JSON.stringify(config) });
    return config;
  }

  // http://IP[:PUERTO]  (si no hay IP guardada usa localhost, útil en el navegador)
  async obtenerUrlBase(): Promise<string> {
    const { ip, puerto } = await this.obtenerConfig();
    const host = ip || 'localhost';
    return puerto && puerto !== '80' ? `http://${host}:${puerto}` : `http://${host}`;
  }
}