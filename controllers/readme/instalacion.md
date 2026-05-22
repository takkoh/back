---
icon: down
---

# Instalación

## Requisitos

* Node.js 24.14.0 o compatible con la versión
* MySQL 8.0.31 o compatible con la versión

## Pasos

```bash
git clone --branch lanzamiento --single-branch https://github.com/GabsNavarro/CarpinteriaSF.git
cd CarpinteriaSF
git checkout lanzamiento # revisamos la existencia del branch
npm install # o npm i
```

## Variables de entorno

```sql
DB_HOST=localhost
DB_USER=root
DB_PASS=
DB_NAME=taller_carpinteriaBD.sql
PORT=3306
```

## Ejecutables

```bash
npm start # node app.js
npm dev # nodemon app.js 
```
