import type { Sucursal } from './ubicacion.core';

// Sucursales de Acme Servicios. Los datos son de ejemplo (ciudades grandes de México).
// PARA TU DEMOSTRACIÓN: cámbialos por lugares cercanos a ti (tu escuela, tu casa, un parque)
// para que la distancia salga corta y se vea que funciona. Puedes copiar las coordenadas
// desde Google Maps: mantén presionado un punto del mapa y toca los números que aparecen.
export const SUCURSALES: Sucursal[] = [
  { id: 'centro', nombre: 'Acme Durango', direccion: 'Centro Histórico', latitud: 24.0277, longitud: -104.6532 },
  { id: 'guadiana', nombre: 'Acme Durango', direccion: 'Parque Guadiana', latitud: 24.0349, longitud: -104.6578 },
  { id: 'paseo', nombre: 'Acme Durango', direccion: 'Zona Paseo Durango', latitud: 24.0381, longitud: -104.6444 },
];