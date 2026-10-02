import { Routes } from '@angular/router';

// Este arreglo define TODAS las rutas (URLs) de la app y qué componente
// se muestra en cada una. Es el "mapa" de navegación de toda la aplicación.
export const routes: Routes = [
  {
    // Cuando la URL está vacía (recién abres la app), redirige a /login
    path: '',
    redirectTo: 'login',
    pathMatch: 'full', // "full" = la URL completa debe estar vacía, no solo empezar vacía
  },
  {
    // Cuando la URL es /login, carga el componente LoginPage
    // loadComponent = "lazy loading": solo descarga ese código cuando hace falta,
    // no todo de golpe al abrir la app (hace la app más rápida al inicio).
    path: 'login',
    loadComponent: () => import('./login/login.page').then((m) => m.LoginPage),
  },
  {
    // Para cualquier otra ruta (ej. /tabs/tab1, /tabs/tab2...),
    // delega el control a OTRO archivo de rutas: tabs.routes.ts
    // loadChildren = carga un grupo completo de rutas hijas, no un solo componente.
    path: '',
    loadChildren: () => import('./tabs/tabs.routes').then((m) => m.routes),
  },

  // ⚠️ NOTA IMPORTANTE PARA LA PRESENTACIÓN:
  // Aquí NO hay ningún "guard" (canActivate). Eso significa que ahora mismo
  // cualquiera puede entrar directo a /tabs/tab1 escribiendo la URL,
  // sin necesidad de haber iniciado sesión antes. El login existe visualmente,
  // pero no está protegiendo el acceso a las demás pantallas todavía.
];