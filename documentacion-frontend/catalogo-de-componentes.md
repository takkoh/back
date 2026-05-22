---
icon: react
---

# Catálogo de Componentes

Para cada componente se indica: propósito, tabla de propiedades y un ejemplo del su uso en el proyecto.

***

### 1) Button

**Propósito**: Botón reutilizable con variantes visuales y tamaños. Se usa en toda la UI para acciones primarias, secundarias y controles iconográficos.

| Nombre        | Tipo                                                                          | Descripción                                                                           |
| ------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **variant**   | `"default" \| "destructive" \| "outline" \| "secondary" \| "ghost" \| "link"` | Variante visual; controla colores y comportamiento hover (default: "default").        |
| **size**      | `"default" \| "sm" \| "lg" \| "icon"`                                         | Tamaño visual del botón (default: "default").                                         |
| **asChild**   | `boolean`                                                                     | Si true renderiza usando Slot para permitir pasar un wrapper externo (enlaces, etc.). |
| **className** | `string`                                                                      | Clases CSS adicionales (Tailwind).                                                    |
| **...props**  | `React.ComponentProps<"button">`                                              | Props nativas de `<button>` (onClick, disabled, type, aria-\*, etc.).                 |

#### Ejemplo de uso

**Ubicación:** `src/app/pages/DashboardPage.tsx`

```tsx
<Button size="lg" onClick="{()"> window.location.href = "/services/new"} 
  className="bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg transition-all duration-200 cursor-pointer hover:brightness-110 hover:shadow-2xl hover:-translate-y-[2px] active:scale-95"
>
  <Plus className="mr-2 h-5 w-5"/> 
  Nuevo Servicio 
</Button>
```

### 2) Card

**(y subcomponentes: CardHeader, CardTitle, CardDescription, CardContent, CardFooter)**

**Propósito**: Contenedor estilizado para agrupar bloques de contenido (encabezado, descripción, cuerpo y pie). Se emplea en paneles, listas y secciones de las vistas.

| Nombre        | Tipo                          | Descripción                                                     |
| ------------- | ----------------------------- | --------------------------------------------------------------- |
| **className** | `string`                      | Clases CSS para ajustar estilo (padding, sombras, colores).     |
| **children**  | `React.ReactNode`             | Contenido interior (composición con subcomponentes).            |
| **...props**  | `React.ComponentProps<"div">` | Props nativas de div aplicables al contenedor o subcomponentes. |

#### Ejemplo de uso&#x20;

**Ubicación**: `src/app/pages/UsersPage.tsx`&#x20;

```tsx
<Card className="border-0 shadow-lg bg-blue-50">
  <CardContent className="pt-6">
    <div className="space-y-2">
      <h3 className="font-semibold text-blue-900">Información importante:</h3>
      <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
        <li>Los jefes de taller pueden ver y gestionar todos los módulos del sistema</li>
        <li>El apartado de técnicos se gestiona por separado en la sección de Técnicos</li>
        <li>La contraseña debe tener al menos 6 caracteres</li>
        <li>Los jefes de taller deben usar su email y contraseña para iniciar sesión</li>
      </ul>
    </div>
  </CardContent>
</Card>
```

### 3) Input

**Propósito**: Control de entrada de texto estilizado (text, email, tel, date, etc.). Se usa en formularios de login, creación/edición de recursos y filtros.

| Nombre        | Tipo                            | Descripción                                                                                   |
| ------------- | ------------------------------- | --------------------------------------------------------------------------------------------- |
| **type**      | `string`                        | Tipo nativo del input ("text", "email", "password", "date", "tel", ...).                      |
| **className** | `string`                        | Clases CSS adicionales (altura, padding, estilos).                                            |
| **...props**  | `React.ComponentProps<"input">` | Props estándar de input (id, value, onChange, placeholder, required, min, max, accept, etc.). |

#### Ejemplo de uso&#x20;

**Ubicación**: `src/app/pages/LoginPage.tsx` — campo email

```tsx
<Input 
  id="email" 
  type="email" 
  placeholder="usuario@empresa.com" 
  value={email} 
  onChange={(e) => setEmail(e.target.value)} 
  className="h-11 bg-white/10 border-white/10 text-white placeholder:text-blue-200 focus:border-blue-400" 
  required 
/>
```
