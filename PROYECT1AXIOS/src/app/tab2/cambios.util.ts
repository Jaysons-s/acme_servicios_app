import type { Contacto } from '../services/contacto.service';

export const CAMPOS_EDITABLES = ['nombre', 'empresa', 'email', 'telefono', 'mensaje'] as const;

// Compara el contacto original con lo que quedó en el formulario y regresa
// SOLO los campos que cambiaron. Eso es lo que se manda en el PATCH.
export function calcularCambios(
  original: Contacto,
  valores: Partial<Record<(typeof CAMPOS_EDITABLES)[number], string | null>>
): Partial<Contacto> {
  const cambios: Partial<Contacto> = {};
  for (const campo of CAMPOS_EDITABLES) {
    const nuevo = (valores[campo] ?? '').trim();
    const viejo = (original[campo] ?? '').trim();   // "empresa" puede venir vacía o null
    if (nuevo !== viejo) {
      cambios[campo] = nuevo;
    }
  }
  return cambios;
}