import type { AxiosInstance } from 'axios';

// Estar conectado al WiFi no significa que el servidor esté disponible (IP mal, Apache apagado,
// laptop en otra red...). Este monitor observa cada respuesta de Axios y avisa:
//   - llegó una respuesta (aunque sea un error 4xx/5xx)  -> el servidor SÍ está disponible
//   - no llegó ninguna respuesta (red, timeout, apagado) -> el servidor NO está disponible
export function instalarMonitorServidor(
  cliente: Pick<AxiosInstance, 'interceptors'>,
  alCambiar: (disponible: boolean) => void
): void {
  cliente.interceptors.response.use(
    respuesta => {
      alCambiar(true);
      return respuesta;
    },
    error => {
      alCambiar(!!error?.response);
      return Promise.reject(error);
    }
  );
}