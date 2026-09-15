# Acme Servicios — App Ionic + Angular

## Objetivo de la aplicación

Aplicación móvil desarrollada con **Ionic + Angular** que permite a los usuarios de "Acme Servicios" enviar un mensaje de contacto a la empresa desde un formulario, y consultar el listado de contactos que han sido recibidos. La app se conecta a una **API REST en PHP** (CRUD completo: GET, POST, PUT, PATCH, DELETE) usando **Axios** desde el frontend, y muestra el resultado de cada operación (éxito o error) mediante modales.

## Páginas / Vistas

| Vista | Descripción |
|---|---|
| **Login** | Pantalla de inicio de sesión de acceso a la app. |
| **Tab1 – Formulario de contacto** | Formulario reactivo (nombre, empresa, correo, teléfono, mensaje) que envía los datos vía `POST` a la API PHP. Muestra modal verde de éxito o modal rojo de error según la respuesta. |
| **Tab2 – Contactos recibidos** | Lista (`GET`) de todos los contactos guardados en la base de datos, con estado de carga, estado vacío, manejo de error y "pull to refresh". |

## Modelo inicial de datos

Base de datos: `acme_servicios`

### Tabla `contactos`

| Campo | Tipo | Descripción |
|---|---|---|
| id | INT (PK, autoincrement) | Identificador único |
| nombre | VARCHAR(150) | Nombre de quien contacta (obligatorio) |
| empresa | VARCHAR(150) | Empresa del contacto (opcional) |
| email | VARCHAR(150) | Correo electrónico (obligatorio) |
| telefono | VARCHAR(30) | Teléfono de contacto (obligatorio) |
| mensaje | TEXT | Mensaje enviado (obligatorio) |
| created_at | TIMESTAMP | Fecha de creación (automática) |
| updated_at | TIMESTAMP | Fecha de última actualización (automática) |

Script completo en [`api/schema.sql`](./api/schema.sql).

## Tecnologías usadas

- **Frontend:** Ionic + Angular (standalone components), Reactive Forms, Axios
- **Backend:** PHP (API REST con CORS habilitado, PDO para MySQL)
- **Base de datos:** MySQL (XAMPP)

## Cómo correr el proyecto

1. Levantar Apache y MySQL en XAMPP.
2. Importar `api/schema.sql` en phpMyAdmin.
3. Copiar la carpeta `api/` dentro de `C:\xampp\htdocs\api`.
4. Ajustar `API_URL` en `src/app/services/contacto.service.ts` si es necesario.
5. Instalar dependencias del proyecto Ionic: `npm install`
6. Correr la app: `ionic serve`

## Evidencia de prompts usados con IA

### Prompt 1
> "tengo un proyecto de ionic con angular... ahora tengo que usar codepen para poner un formulario de html y css"

**Uso:** Se usó como punto de partida para estructurar el formulario de contacto (HTML + CSS ya existente del ejercicio de clase).

### Prompt 2
> "tambien requiero una api en php de tipo CRUD, GET, POST, DELETE, PUT, PATCH, OPTIONS, CORS, esto lo tengo que conectar en el tab1... genera el TS para conectar el front con el api, mediante AXIOS, donde los mensajes de error del api se desplieguen en modal, al igual mensajes de exito"

**Uso:** Se generó la API completa en PHP (`config.php`, `index.php`) y el servicio Angular (`contacto.service.ts`) con Axios, junto con la lógica de modales de éxito/error en `tab1.page.ts`.

### Prompt 3
> "Viendo que ya tienes login, tab1 (formulario), tab2 y tab3 armados por Ionic, ¿qué quieres que haga la segunda pantalla? → Lista de contactos guardados"

**Uso:** Se generó `tab2.page.ts/.html/.scss` para listar los contactos guardados, reutilizando el mismo servicio de Axios ya creado.

## Qué código generado por IA fue aceptado, modificado o descartado

- **Aceptado tal cual:** la estructura del CRUD en `index.php` (rutas GET/POST/PUT/PATCH/DELETE, validaciones básicas y respuestas JSON), y el servicio `contacto.service.ts` con Axios.
- **Modificado:** el import de los componentes de Ionic en `tab1.page.ts`/`tab2.page.ts` — la IA inicialmente sugirió `'@ionic/angular/standalone'`, pero en este proyecto la ruta correcta es `'@ionic/angular'`, ya que esa versión de Ionic no expone ese subpath. Se corrigió manualmente tras un error de compilación.
- **Descartado:** no se usó el componente `ExploreContainerComponent` que traía Tab1 por defecto, ya que fue reemplazado completamente por el formulario de contacto.