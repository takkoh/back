---
description: Pasos para ejecutar el proyecto en un entorno local de desarrollo.
icon: desktop-arrow-down
---

# Guía de Instalación y Setup

#### Requisitos Previos

* Node.js: Versión 18.x o superior.
* npm: Gestor de paquetes oficial.

#### Instalación y Ejecución

1. Instalar dependencias: `npm install`
2. Modo desarrollo: `npm run dev` _- Disponible en `http://localhost:5173`._
3.  Build de producción: `npm run build`

    _Genera la versión optimizada en la carpeta `dist/`._

#### Variables de Entorno

Crea un archivo `.env` en la raíz para configurar la conexión:

* `VITE_API_URL=[https://carpenter-back.onrender.com/api]` (URL de producción).
* `VITE_API_URL=http://localhost:3000` (URL local).
