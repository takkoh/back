---
icon: diagram-sankey
---

# Conexion a la base de datos

* Se añadio un pool para gestionar y reutilizar recursos costosos y evitar abrir conexiones inecesarias a lo largo de todo el proyecto.

## Pool

```javascript
const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'taller_carpinteriaBD',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
});
```

## Conexion

* Realizamos la conexion con nuestra base de datos el cual si es true nos muestra un mensaje en la consola\
  si no se establece conexion entonces nos lanzara un error en consola.

```javascript
pool.getConnection()
  .then(conn => {
    console.log('✅ Conectado a MySQL correctamente');
    conn.release();
  })
  .catch(err => {
    console.error('❌ Error al conectar con MySQL:', err.message);
  });
```
