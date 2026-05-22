---
icon: user-pen
---

# Solicitantes

## GET /api/solicitantes/

Esta ruta se encarga de obtener todos los solicitantes.

### Referencia API

#### repository: getAll

* Retorna todo los solicitantes con sus datos

```javascript
const getAll = async () => {
  const [rows] = await pool.execute(
    `SELECT * FROM solicitantes ORDER BY nombre_area`
  );
  return rows;
};
```

### Endpoint

#### Response

```json
{
    "id": 5,
    "nombre_area": "UNISON HERMOSILLO",
    "nombre_contacto": "Alfredo Gonzales",
    "telefono": "662341523",
    "email": "alfreditoelpillo@unison.mx",
    "direccion": "5k201",
    "servicios_activos": 0,
    "total_servicios_completados": 0,
    "created_at": "2026-05-05T01:53:41.000Z",
    "updated_at": "2026-05-05T01:53:41.000Z"
}
{
    "id": 6,
    "nombre_area": "UNISON HERMOSILLO",
    "nombre_contacto": "Pablo Frenillo",
    "telefono": "662341523",
    "email": "PabloF@unison.mx",
    "direccion": "5A301",
    "servicios_activos": 0,
    "total_servicios_completados": 0,
    "created_at": "2026-05-05T01:53:41.000Z",
    "updated_at": "2026-05-05T01:53:41.000Z"
}
{
    "id": 7,
    "nombre_area": "UNISON HERMOSILLO",
    "nombre_contacto": "Fernando Orozco",
    "telefono": "662341523",
    "email": "Fernandoowo@unison.mx",
    "direccion": "5F101",
    "servicios_activos": 0,
    "total_servicios_completados": 0,
    "created_at": "2026-05-05T01:53:41.000Z",
    "updated_at": "2026-05-05T01:53:41.000Z"
}
```

#### Error 500

```json
{
    "message": "Bind parameters must not contain undefined. To pass SQL NULL specify JS null"
}
```

## POST /api/solicitantes/

Esta ruta se encarga de crear solicitantes.

### Referencia API

#### repository: create

* Inserta un nuevo solicitante en la base de datos
* Retorna el Id generado (insertId)

```javascript
const create = async ({ nombre_area, nombre_contacto, telefono, email, direccion }) => {
  const [result] = await pool.execute(
    `INSERT INTO solicitantes (nombre_area, nombre_contacto, telefono, email, direccion)
     VALUES (?, ?, ?, ?, ?)`,
    [nombre_area, nombre_contacto, telefono, email, direccion]
  );
  return result.insertId;
};
```

### Enpoint

#### Body

```json
{
    "nombre_area": "UNISON HERMOSILLO",
    "nombre_contacto": "Alfredo Gonzales",
    "telefono": "662341523",
    "email": "alfreditoelpillo@unison.mx",
    "direccion": "5k201"
}
```

#### Response

```json
{
    "id": 5,
    "nombre_area": "UNISON HERMOSILLO",
    "nombre_contacto": "Alfredo Gonzales",
    "telefono": "662341523",
    "email": "alfreditoelpillo@unison.mx",
    "direccion": "5k201",
    "servicios_activos": 0,
    "total_servicios_completados": 0,
    "created_at": "2026-05-05T01:53:41.000Z",
    "updated_at": "2026-05-05T01:53:41.000Z"
}
```

#### Error 500

```json
{
    "message": "Bind parameters must not contain undefined. To pass SQL NULL specify JS null"
}
```

## GET /api/solicitantes/:id

Esta ruta se encarga de obtener solicitantes por medio de id.

### Referencia API

#### repository: getById

* Retorna un solicitante por su ID
* si no existe, retorna null

```javascript
const getById = async (id) => {
  const [rows] = await pool.execute(
    `SELECT * FROM solicitantes WHERE id = ?`, [id]
  );
  return rows[0] || null;
};
```

### Params

* id: identificador del solicitante

#### Response

```json
{
    "id": 6,
    "nombre_area": "UNISON HERMOSILLO",
    "nombre_contacto": "Pablo Frenillo",
    "telefono": "662341523",
    "email": "PabloF@unison.mx",
    "direccion": "5A301",
    "servicios_activos": 0,
    "total_servicios_completados": 0,
    "created_at": "2026-05-05T01:53:41.000Z",
    "updated_at": "2026-05-05T01:53:41.000Z"
}
```

#### Error 404

```json
{
    "message": "Solicitante no encontrado"
}
```

#### Error 500

```json
{
    "message": "Bind parameters must not contain undefined. To pass SQL NULL specify JS null"
}
```

## PUT /api/solicitantes/:id

Esta ruta se encarga de actualizar la inforamacion del solicitante por medio del id.

### Referencia API

#### repository: update

* Actualiza un solicitante existente por su Id
* Retorna el numero de filas afectadas

```javascript
const update = async (id, { nombre_area, nombre_contacto, telefono, email, direccion }) => {
  const [result] = await pool.execute(
    `UPDATE solicitantes SET nombre_area=?, nombre_contacto=?, telefono=?,
     email=?, direccion=? WHERE id = ?`,
    [nombre_area, nombre_contacto, telefono, email, direccion, id]
  );
  return result.affectedRows;
};
```

### Endpoint

### Params

* id: identificador del solicitante

#### Body

```json
{
    "nombre_area": "UNISON HERMOSILLO",
    "nombre_contacto": "Angel Gonzales",
    "telefono": "662341523",
    "email": "alfreditoelpillo@unison.mx",
    "direccion": "5M101"
}
```

#### Response

```json
{
    "id": 5,
    "nombre_area": "UNISON HERMOSILLO",
    "nombre_contacto": "Angel Gonzales",
    "telefono": "662341523",
    "email": "alfreditoelpillo@unison.mx",
    "direccion": "5M101",
    "servicios_activos": 0,
    "total_servicios_completados": 0,
    "created_at": "2026-05-05T01:53:41.000Z",
    "updated_at": "2026-05-05T01:53:41.000Z"
}
```

#### Error 404

```json
{
    "message": "Solicitante no encontrado"
}
```

#### Error 500

```json
{
    "message": "Bind parameters must not contain undefined. To pass SQL NULL specify JS null"
}
```

## DELETE /api/solicitantes/:id

Esta ruta se encarga de borrar solicitantes por medio de id.

### Referencia API

#### repository: remove

* Elimina un solicitante por su id
* Retorna si se vio afectado
* No se puede eliminar si el solicitante tiene servicios activos

```javascript
const remove = async (id) => {
  const [result] = await pool.execute(
    `DELETE FROM solicitantes WHERE id = ?`, [id]
  );
  return result.affectedRows;
};
```

### Endpoint

### Params

* id: identificador del solicitante

### Response

```json
{
    "message": "Solicitante eliminado"
}
```

#### Error 404

```json
{
    "message": "Solicitante no encontrado"
}
```

#### Error 409

```json
{
    "message": "No se puede eliminar ${solicitante.nombre_area}: tiene ${solicitante.servicios_activos} servicio(s) activo(s). Completa o cancela los servicios primero."
}
```

#### Error 500

```json
{
    "message": "Bind parameters must not contain undefined. To pass SQL NULL specify JS null"
}
```
