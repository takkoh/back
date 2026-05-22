---
icon: screwdriver
---

# Untensilios

## POST api/utensilio/

Esta ruta se encarga de crear utensilios.

### Referencia API

#### Repository: create

* Inserta un nuevo utensilio en la base de datos
* Retorna el idi generado (insertId)
* algunos campos permiten tener null:
  * solicitantes\_id
  * operador\_id
  * Rangos\_mantenimiento
  * ultimo\_mantenimiento

```javascript
const create = async ({ clasificacion, tipo_utensilio, solicitante_id, operador_id, Rangos_mantenimiento, ultimo_mantenimiento }) => {
  const [result] = await pool.execute(
    `INSERT INTO utensilios (clasificacion, tipo_utensilio, solicitante_id, operador_id, Rangos_mantenimiento, ultimo_mantenimiento)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [clasificacion, tipo_utensilio, solicitante_id || null, operador_id || null,
     Rangos_mantenimiento || null, ultimo_mantenimiento || null]
  );
  return result.insertId;
};
```

### Endpoint

#### Body

```json
{
  "clasificacion": "Herramienta",
  "tipo_utensilio": "Martillo",
  "solicitante_id": "",
  "operador_id": "",
  "Rangos_mantenimiento": "30",
  "ultimo_mantenimiento": ""
}
```

#### Response

```json
{
  "id": 1,
  "clasificacion": "Herramienta",
  "tipo_utensilio": "Martillo",
  "solicitante_id": null,
  "operador_id": null,
  "Rangos_mantenimiento": "30",
  "status_mantenimiento":"Al día",
  "status_utensilio": "Disponible",
  "ultimo_mantenimiento": null,
  "created_at": "2026-04-29T18:41:32.000Z",
  "updated_at": "2026-04-29T18:41:32.000Z",
  "ubicacion_area": null,
  "operador_nombre": null
}
```

#### Error 500

```json
{
    "message": "Bind parameters must not contain undefined. To pass SQL NULL specify JS null"
}
```

## GET api/utensilios/

Esta ruta se encarga de obtener todos los utensilios.

### Referencia API

#### Repository: getAll

* Retorna todos los utensilios
* incluye informacion adicional mediante relacions:
  * ubicacion\_area -> nombre del area (solicitante)
  * operador\_nombre -> nombre del operador (personal)
* Ordenados por:
  * clasificacion
  * tipo\_utensilio

```javascript
const getAll = async () => {
  const [rows] = await pool.execute(
    `SELECT u.*,
            s.nombre_area AS ubicacion_area,
            p.nombre AS operador_nombre
     FROM utensilios u
     LEFT JOIN solicitantes s ON s.id = u.solicitante_id
     LEFT JOIN personal p     ON p.id = u.operador_id
     ORDER BY u.clasificacion, u.tipo_utensilio`
  );
  return rows;
};
```

### Endpoint

#### Response

```json
{
  "id": 1,
  "clasificacion": "Herramienta",
  "tipo_utensilio": "Martillo",
  "solicitante_id": null,
  "operador_id": null,
  "Rangos_mantenimiento": "30",
  "status_mantenimiento":"Al día",
  "status_utensilio": "Disponible",
  "ultimo_mantenimiento": null,
  "created_at": "2026-04-29T18:41:32.000Z",
  "updated_at": "2026-04-29T18:41:32.000Z",
  "ubicacion_area": null,
  "operador_nombre": null
}
{
  "id": 2,
  "clasificacion": "Herramienta",
  "tipo_utensilio": "Destornillador",
  "solicitante_id": null,
  "operador_id": null,
  "Rangos_mantenimiento": "30",
  "status_mantenimiento":"Al día",
  "status_utensilio": "Disponible",
  "ultimo_mantenimiento": null,
  "created_at": "2026-04-29T18:41:32.000Z",
  "updated_at": "2026-04-29T18:41:32.000Z",
  "ubicacion_area": null,
  "operador_nombre": null
}
```

#### Error 500

```json
{
    "message": "Bind parameters must not contain undefined. To pass SQL NULL specify JS null"
}
```

## GET api/utensilios/:id

Esta ruta se encarga de obtener utensilios por id.

### Referencia API

#### Repository: getById

* Retorna un utensilio por su id
* incluye informacion relacionada:
  * ubicacion\_area -> nombre del area (solicitante)
  * operador\_nombre -> nombre del operador (personal)
* si no existe retorna null

```javascript
const getById = async (id) => {
  const [rows] = await pool.execute(
    `SELECT u.*,
            s.nombre_area AS ubicacion_area,
            p.nombre AS operador_nombre
     FROM utensilios u
     LEFT JOIN solicitantes s ON s.id = u.solicitante_id
     LEFT JOIN personal p     ON p.id = u.operador_id
     WHERE u.id = ?`,
    [id]
  );
  return rows[0] || null;
};
```

### Endpoint

### Params

* id: identificador del utensilio

#### Response

```json
{
  "id": 2,
  "clasificacion": "Herramienta",
  "tipo_utensilio": "Destornillador",
  "solicitante_id": null,
  "operador_id": null,
  "Rangos_mantenimiento": "30",
  "status_mantenimiento":"Al día",
  "status_utensilio": "Disponible",
  "ultimo_mantenimiento": null,
  "created_at": "2026-04-29T18:41:32.000Z",
  "updated_at": "2026-04-29T18:41:32.000Z",
  "ubicacion_area": null,
  "operador_nombre": null
}
```

#### Error 404

```json
{
    "message": "Utensilio no encontrado"
}
```

#### Error 500

```json
{
    "message": "Bind parameters must not contain undefined. To pass SQL NULL specify JS null"
}
```

## PUT api/utensilios/:id

Esta ruta se encarga de actualizar utensilios por medio de id.

### Referencia API

#### Repository: update

* Actualiza un utensilio por su id
* permite modificar:
  * datos generales
  * asignaciones(dolicitante, operador)
  * estados(status\_mantenimiento, status\_utensilio)
  * mantenimiento
* Retorna la fila afectada

```javascript
const update = async (id, fields) => {
  const { clasificacion, tipo_utensilio, solicitante_id, operador_id,
          Rangos_mantenimiento, status_mantenimiento, status_utensilio, ultimo_mantenimiento } = fields;
  const [result] = await pool.execute(
    `UPDATE utensilios SET clasificacion=?, tipo_utensilio=?, solicitante_id=?,
     operador_id=?, Rangos_mantenimiento=?, status_mantenimiento=?,
     status_utensilio=?, ultimo_mantenimiento=? WHERE id = ?`,
    [clasificacion, tipo_utensilio, solicitante_id || null, operador_id || null,
     Rangos_mantenimiento || null, status_mantenimiento, status_utensilio,
     ultimo_mantenimiento || null, id]
  );
  return result.affectedRows;
};
```

### Endpoint

### Params

* id: identificador del utensilio

#### Body

```json
{
  "clasificacion": "Herramienta",
  "tipo_utensilio": "Destornillador",
  "solicitante_id": 1,
  "operador_id": 1,
  "Rangos_mantenimiento": "30",
  "status_mantenimiento":"Al día",
  "status_utensilio": "Disponible",
  "ultimo_mantenimiento": null,
}
```

#### Response

```json
{
  "id": 2,
  "clasificacion": "Herramienta",
  "tipo_utensilio": "Destornillador",
  "solicitante_id": 1,
  "operador_id": 1,
  "Rangos_mantenimiento": "30",
  "status_mantenimiento":"Al día",
  "status_utensilio": "Disponible",
  "ultimo_mantenimiento": null,
  "created_at": "2026-04-29T18:41:32.000Z",
  "updated_at": "2026-04-29T18:41:32.000Z",
  "ubicacion_area": "UNISON Hermosillo 5G201",
  "operador_nombre": "Gabriel"
}
```

#### Error 404

```json
{
    "message": "Utensilio no encontrado"
}
```

#### Error 500

```json
{
    "message": "Bind parameters must not contain undefined. To pass SQL NULL specify JS null"
}
```

## DELETE api/utensilios/:id

Esta ruta se encarga de borrar utensilios por medio de id.

### Referencia API

#### Repository: remove

* Elimina un utensilio por su id
* Retorna si el utensilio fue eliminado

```javascript
const remove = async (id) => {
  const [result] = await pool.execute(
    `DELETE FROM utensilios WHERE id = ?`, [id]
  );
  return result.affectedRows;
};
```

### Endpoint

### Params

* id: identificador del utensilio

#### Response

```json
{
  "message": "Utensilio eliminado"
}
```

#### Error 404

```json
{
    "message": "Utensilio no encontrado"
}
```

#### Error 500

```json
{
    "message": "Bind parameters must not contain undefined. To pass SQL NULL specify JS null"
}
```

## POST api/utensilios/:id/mantenimiento

Esta ruta se encarga de agregar a mantenimiento un utensilio.

### Referencia API

#### Repository: addMantenimiento

* Registra un mantenimiento para un utensilio
* Inserta un registro en historial\_mantenimiento
* Actualiza automaticamente el utensilio:
  * ultimo\_mantenimiento -> fecha del mantenimiento
  * status\_mantenimiento -> "al dia"
  * status\_utensilio -> "disponible"

```javascript
const addMantenimiento = async ({ utensilio_id, personal_id, fecha_mantenimiento, tipo, descripcion, proxima_fecha }) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.execute(
      `INSERT INTO historial_mantenimiento (utensilio_id, personal_id, fecha_mantenimiento, tipo, descripcion, proxima_fecha)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [utensilio_id, personal_id || null, fecha_mantenimiento, tipo, descripcion, proxima_fecha || null]
    );

    // Resetear estado del utensilio después del mantenimiento
    await conn.execute(
      `UPDATE utensilios SET ultimo_mantenimiento=?, status_mantenimiento='Al día', status_utensilio='Disponible'
       WHERE id = ?`,
      [fecha_mantenimiento, utensilio_id]
    );
```

### Endpoint

### Params

* id: identificador del utensilio

#### Body

```json
{
  "personal_id": 2,
  "fecha_mantenimiento": "2026-04-29",
  "tipo": "Preventivo",
  "operador_id": 1,
  "descripcion": "Tenia una pata floja",
  "proxima_fecha": "2027-04-29",
}
```

#### Response

```json
{
  "id": 1,
  "message": "Mantenimiento registrado"
}
```

#### Error 404

```json
{
    "message": "Utensilio no encontrado"
}
```

#### Error 500

```json
{
    "message": "Bind parameters must not contain undefined. To pass SQL NULL specify JS null"
}
```

## GET api/utensilios/:id/mantenimiento

Esta ruta se encarga de obtener el utensilio es estado Mantenimiento por id.

### Referencia API

#### Repository: getHistorialMantenimiento

* Retorna el historial de mantenimiento de un utensilio
* inclute informacion del tecnico (personal)
* Ordenado por fecha de mantenimiento (mas reciente primero)

```javascript
const getHistorialMantenimiento = async (utensilio_id) => {
  const [rows] = await pool.execute(
    `SELECT hm.*, p.nombre AS tecnico
     FROM historial_mantenimiento hm
     LEFT JOIN personal p ON p.id = hm.personal_id
     WHERE hm.utensilio_id = ?
     ORDER BY hm.fecha_mantenimiento DESC`,
    [utensilio_id]
  );
  return rows;
};
```

### Endpoint

### Params

* id: identificador del utensilio

#### Response

```json
{
  "id": 5,
  "utensilio_id": 1,
  "personal_id": 2,
  "fecha_mantenimiento": "2026-04-29",
  "tipo": "Correctivo",
  "descripcion": "Tenia irregularidades en la parte metalica",
  "proxima_fecha": "2027-04-29",
  "created_at": "2026-04-29T18:41:32.000Z",
  "tecnico": "Jorge"
}
```

#### Error 404

```json
{
    "message": "Utensilio no encontrado"
}
```

#### Error 500

```json
{
    "message": "Bind parameters must not contain undefined. To pass SQL NULL specify JS null"
}
```
