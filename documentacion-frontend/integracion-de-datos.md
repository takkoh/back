---
icon: hexagon-nodes
---

# Integración de Datos

## Capa de Servicio (API)

El sistema utiliza una instancia centralizada de **Axios** para gestionar la comunicación con el backend real alojado en **Render**.

### Configuración de Producción

* **Cliente HTTP:** Axios.
* **URL Base:** `https://carpenter-back.onrender.com/api`
* **Seguridad:** Uso de `withCredentials: true` para persistencia de sesión.

### Interceptores de Request

Para permitir la transición entre desarrollo y producción, el interceptor realiza dos tareas críticas:

1. **Normalización:** Elimina el prefijo `/api` de las rutas para coincidir con la estructura del backend externo.
2. **Inyección de Token:** Extrae el JWT del `workshop_current_user` en LocalStorage y lo inyecta en el header `Authorization`.

#### Implementación (`src/app/lib/api.ts`)

```tsx
const API_URL = '[https://carpenter-back.onrender.com/api](https://carpenter-back.onrender.com/api)';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  // Limpieza de prefijo para compatibilidad
  if (config.url?.startsWith('/api/')) {
    config.url = config.url.replace('/api', '');
  }
  // Recuperación de sesión conectada
  const userStr = localStorage.getItem('workshop_current_user');
  if (userStr) {
    const user = JSON.parse(userStr);
    if (user.token) config.headers.Authorization = `Bearer ${user.token}`;
  }
  return config;
});
```

## Módulos de Servicio (Capa de Abstracción)

Los módulos de servicio actúan como intermediarios entre la interfaz y la API de Render. Su función principal es encapsular las llamadas de Axios, aplicar mappers de salida y normalizar los datos de entrada.

#### Catálogo de Módulos y Responsabilidades

| Módulo             | Responsabilidad Principal                        | Métodos Clave                                                        |
| ------------------ | ------------------------------------------------ | -------------------------------------------------------------------- |
| **authApi**        | Gestión de identidad y acceso.                   | `login`, `listUsers`, `createUser`                                   |
| **serviceApi**     | Control del ciclo de vida de órdenes de trabajo. | `getAll`, `getById`, `create`, `update`, `completar`, `addEvidencia` |
| **utensiliosApi**  | Gestión de herramientas y mantenimiento.         | `getAll`, `create`, `update`, `scheduleMaintenance`                  |
| **reportesApi**    | Obtención de métricas para el Dashboard.         | `getStats`, `getDashboardData`                                       |
| **solicitanteApi** | Directorio de clientes/solicitantes.             | `getAll`, `create`, `getById`                                        |
| **personalApi**    | Gestión de técnicos y operarios.                 | `getTécnicos`, `updateProfile`                                       |

#### Integración de Lógica de Negocio

A diferencia de una llamada simple a una API, estos módulos integran la lógica de **limpieza y transformación** necesaria para el backend real:

1. **Mapeo de Salida:** Antes de cada `POST/PUT`, el módulo transforma el objeto de la UI mediante `toBackend*` (ej. cambia `id` por `service_id`).
2. **Sanitización:** Se aplica `withNulls()` para asegurar que no viajen valores `undefined` que puedan romper la base de datos SQL.
3. **Normalización de Entrada:** Los datos que llegan del backend pasan por `normalize*` para que la UI siempre reciba el mismo formato de objeto, independientemente de si los datos vienen de la API o del prototipo (`LocalStorage`).

## Flujo de Datos (Prototipo vs. Backend)

El proyecto implementa una arquitectura flexible que permite alternar entre un entorno de prototipado local y la integración con el servidor real.

### Estrategia de Switch (`USE_MOCKS`)

El flujo de datos se bifurca según la configuración en `src/app/lib/storage.ts`:

1. **Modo Prototipo (Mock):** Los componentes llaman a funciones de `storage.ts`. Los datos se guardan exclusivamente en el navegador (`LocalStorage`). Esto permitió validar la UX antes de tener el servidor listo.
2. **Modo Conectado (Backend):** Los componentes invocan los módulos de `api.ts`. Los datos viajan al servidor SQL en Render.

### Transformación y Mapeo

Para que el paso del prototipo al backend fuera transparente, se utilizan **Mappers**:

* **Hacia el Backend:** La utilidad `toBackendService` traduce los nombres de campos de la UI (ej. `name`) a los nombres de la base de datos (ej. `nombre_servicio`).
* **Hacia la UI:** Las funciones `normalize*` aseguran que, sin importar la fuente (Mock o API), la interfaz reciba objetos con el mismo formato.

#### Ejemplo de Payload de Salida

```json
{
  name: "Reparación Silla", // -> nombre_servicio: "Reparación Silla"​
  type: "corrective", // -> tipo_servicio: "Reparación"
  location: "Edificio A", // -> ubicacion: "Edificio A | ..."
  startDate: "2024-05-20T..." // -> fecha_inicio: "2024-05-20"
}
```

## Gestión de Estado y Persistencia Local

La persistencia fue la columna vertebral de la fase de prototipado y sigue siendo vital para la gestión de la sesión del usuario.

### Persistencia del Prototipo (`storage.ts`)

Durante la fase inicial, se diseñó un sistema CRUD completo que opera sobre **LocalStorage**. Esto garantiza que, incluso sin conexión al backend, la aplicación sea funcional para demostraciones.

#### Claves de Persistencia

| Clave                   | Rol en el Prototipo                                                 |
| ----------------------- | ------------------------------------------------------------------- |
| `workshop_services`     | Almacena las órdenes de trabajo creadas localmente.                 |
| `workshop_equipment`    | Controla el inventario de herramientas del taller.                  |
| `technicians`           | Directorio de personal utilizado para asignaciones en el prototipo. |
| `workshop_current_user` | Almacena el token y perfil del usuario conectado al Backend real.   |
