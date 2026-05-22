---
icon: face-smile-plus
---

# Seguimientos

## GET /api/seguimineto

Esta ruta se encarga de obtener todos los seguimientos

### Referencia API

#### Repository: getAll

* Retorna todos los seguimientos con datos del solicitante y técnico asignado, ordenados por fecha de inicio descendente.

```javascript
const getAll = async () => {
  const [rows] = await pool.execute(
    `SELECT seg.*,
            -- Datos del servicio padre
            svc.nombre_servicio, svc.tipo_servicio, svc.status       AS status_servicio,
            svc.prioridad,     svc.fecha_inicio  AS svc_fecha_inicio,
            svc.fecha_fin,     svc.ubicacion     AS svc_ubicacion,
            -- Datos del área solicitante
            sol.nombre_area, sol.nombre_contacto, sol.telefono AS tel_solicitante,
            -- Nombre del técnico
            p.nombre AS nombre_personal
     FROM seguimiento seg
     JOIN servicios    svc ON svc.id  = seg.servicio_id
     JOIN solicitantes sol ON sol.id  = seg.solicitante_id
     LEFT JOIN personal p  ON p.id   = seg.personal_id
     ORDER BY seg.fecha_inicio DESC`
  );
  return rows;
};
```

### Endpoint

#### Response

```json
{
        "id": 4,
        "nombre_servicio": "prueba",
        "servicio_id": 4,
        "solicitante_id": 6,
        "personal_id": null,
        "ubicacion": "hermosillo | prueba",
        "tipo_seg_servicio": "Instalación",
        "fecha_inicio": "2026-05-02T07:00:00.000Z",
        "fecha_fin_estimada": "2026-05-02T07:00:00.000Z",
        "observaciones": "prueba",
        "created_at": "2026-05-03T02:45:17.000Z",
        "updated_at": "2026-05-03T02:45:17.000Z",
        "tipo_servicio": "Instalación",
        "status_servicio": "Completado",
        "prioridad": "baja",
        "svc_fecha_inicio": "2026-05-02T07:00:00.000Z",
        "fecha_fin": "2026-05-03T07:00:00.000Z",
        "svc_ubicacion": "hermosillo | prueba",
        "nombre_area": "Hermosillo",
        "nombre_contacto": "ramires",
        "tel_solicitante": "1122334455",
        "nombre_personal": null
    },
    {
        "id": 1,
        "nombre_servicio": "hola",
        "servicio_id": 1,
        "solicitante_id": 1,
        "personal_id": 2,
        "ubicacion": "hermosillo",
        "tipo_seg_servicio": "Instalación",
        "fecha_inicio": "2026-05-01T07:00:00.000Z",
        "fecha_fin_estimada": "2026-05-01T07:00:00.000Z",
        "observaciones": "hola",
        "created_at": "2026-05-01T23:39:51.000Z",
        "updated_at": "2026-05-01T23:39:51.000Z",
        "tipo_servicio": "Instalación",
        "status_servicio": "Completado",
        "prioridad": "media",
        "svc_fecha_inicio": "2026-05-01T07:00:00.000Z",
        "fecha_fin": "2026-04-30T07:00:00.000Z",
        "svc_ubicacion": "hermosillo",
        "nombre_area": "UNISON HERMOSILLO",
        "nombre_contacto": "Alfredo Gonzales",
        "tel_solicitante": "663443567",
        "nombre_personal": "Jorge"
    },
    {
        "id": 2,
        "nombre_servicio": "tren",
        "servicio_id": 2,
        "solicitante_id": 4,
        "personal_id": 1,
        "ubicacion": "hermosillo | aaaa",
        "tipo_seg_servicio": "Instalación",
        "fecha_inicio": "2026-05-01T07:00:00.000Z",
        "fecha_fin_estimada": "2026-05-01T07:00:00.000Z",
        "observaciones": "aaaa",
        "created_at": "2026-05-01T23:44:31.000Z",
        "updated_at": "2026-05-01T23:44:31.000Z",
        "tipo_servicio": "Instalación",
        "status_servicio": "Completado",
        "prioridad": "baja",
        "svc_fecha_inicio": "2026-05-01T07:00:00.000Z",
        "fecha_fin": "2026-05-01T07:00:00.000Z",
        "svc_ubicacion": "hermosillo | aaaa",
        "nombre_area": "qumica",
        "nombre_contacto": "maria jose",
        "tel_solicitante": "1122334455",
        "nombre_personal": "Gabriel"
    },
    {
        "id": 3,
        "nombre_servicio": "p",
        "servicio_id": 3,
        "solicitante_id": 5,
        "personal_id": 4,
        "ubicacion": "hermosillo | chamoy",
        "tipo_seg_servicio": "Mantenimiento preventivo",
        "fecha_inicio": "2026-05-01T07:00:00.000Z",
        "fecha_fin_estimada": "2026-05-02T07:00:00.000Z",
        "observaciones": "chamoy",
        "created_at": "2026-05-02T00:00:26.000Z",
        "updated_at": "2026-05-02T00:00:26.000Z",
        "tipo_servicio": "Mantenimiento preventivo",
        "status_servicio": "Completado",
        "prioridad": "alta",
        "svc_fecha_inicio": "2026-05-01T07:00:00.000Z",
        "fecha_fin": "2026-05-02T07:00:00.000Z",
        "svc_ubicacion": "hermosillo | chamoy",
        "nombre_area": "Hermosillo",
        "nombre_contacto": "maria jose",
        "tel_solicitante": "1122334455",
        "nombre_personal": "Tuti"
    },
    {
        "id": 5,
        "nombre_servicio": "cambiando",
        "servicio_id": 5,
        "solicitante_id": 5,
        "personal_id": 2,
        "ubicacion": "artes",
        "tipo_seg_servicio": "Reparación",
        "fecha_inicio": "2026-04-29T07:00:00.000Z",
        "fecha_fin_estimada": null,
        "observaciones": null,
        "created_at": "2026-05-05T01:53:41.000Z",
        "updated_at": "2026-05-05T01:53:41.000Z",
        "tipo_servicio": "Reparación",
        "status_servicio": "Completado",
        "prioridad": "alta",
        "svc_fecha_inicio": "2026-04-29T07:00:00.000Z",
        "fecha_fin": "2026-05-04T07:00:00.000Z",
        "svc_ubicacion": "artes",
        "nombre_area": "Hermosillo",
        "nombre_contacto": "maria jose",
        "tel_solicitante": "1122334455",
        "nombre_personal": "Jorge"
    }
```

#### Error 500

```json
{
    "message": "Bind parameters must not contain undefined. To pass SQL NULL specify JS null"
}
```

## GET /api/seguimiento/:ID

Esta ruta se encarga de obtener los seguimientos por id

### Referencia API

#### Repository: getById

* Retorna un seguimiento por su ID propio (no por servicio\_id).

```javascript
const getById = async (id) => {
  const [rows] = await pool.execute(
    `SELECT seg.*,
            svc.nombre_servicio, svc.tipo_servicio, svc.status       AS status_servicio,
            svc.prioridad,     svc.fecha_inicio  AS svc_fecha_inicio,
            svc.fecha_fin,     svc.ubicacion     AS svc_ubicacion,
            sol.nombre_area, sol.nombre_contacto, sol.telefono AS tel_solicitante,
            p.nombre AS nombre_personal
     FROM seguimiento seg
     JOIN servicios    svc ON svc.id  = seg.servicio_id
     JOIN solicitantes sol ON sol.id  = seg.solicitante_id
     LEFT JOIN personal p  ON p.id   = seg.personal_id
     WHERE seg.id = ?`,
    [id]
  );
  return rows[0] || null;
};
```

### Endpoint

#### Params

* id: identificador del seguimiento

#### Response

```json
{
    "id": 3,
    "nombre_servicio": "p",
    "servicio_id": 3,
    "solicitante_id": 5,
    "personal_id": 4,
    "ubicacion": "hermosillo | chamoy",
    "tipo_seg_servicio": "Mantenimiento preventivo",
    "fecha_inicio": "2026-05-01T07:00:00.000Z",
    "fecha_fin_estimada": "2026-05-02T07:00:00.000Z",
    "observaciones": "chamoy",
    "created_at": "2026-05-02T00:00:26.000Z",
    "updated_at": "2026-05-02T00:00:26.000Z",
    "tipo_servicio": "Mantenimiento preventivo",
    "status_servicio": "Completado",
    "prioridad": "alta",
    "svc_fecha_inicio": "2026-05-01T07:00:00.000Z",
    "fecha_fin": "2026-05-02T07:00:00.000Z",
    "svc_ubicacion": "hermosillo | chamoy",
    "nombre_area": "Hermosillo",
    "nombre_contacto": "maria jose",
    "tel_solicitante": "1122334455",
    "nombre_personal": "Tuti"
}
```

### Error 404

```json
{
    "message": "Seguimiento no encontrado"
}
```

#### Error 500

```json
{
    "message": "Bind parameters must not contain undefined. To pass SQL NULL specify JS null"
}
```

## GET /api/seguimiento/servicio/:servicio\_id

Esta ruta se encarga de obtener el servicio ligado al seguimiento

### Referencia API

#### Repository: getByServicioId

* Retorna el seguimiento ligado a un servicio (relación 1:1) con todos los datos enriquecidos.

```javascript
const getByServicioId = async (servicio_id) => {
  const [rows] = await pool.execute(
    `SELECT seg.*,
            svc.nombre_servicio, svc.tipo_servicio, svc.status       AS status_servicio,
            svc.prioridad,     svc.fecha_inicio  AS svc_fecha_inicio,
            svc.fecha_fin,     svc.ubicacion     AS svc_ubicacion,
            sol.nombre_area, sol.nombre_contacto, sol.telefono AS tel_solicitante,
            p.nombre AS nombre_personal
     FROM seguimiento seg
     JOIN servicios    svc ON svc.id  = seg.servicio_id
     JOIN solicitantes sol ON sol.id  = seg.solicitante_id
     LEFT JOIN personal p  ON p.id   = seg.personal_id
     WHERE seg.servicio_id = ?`,
    [servicio_id]
  );
  return rows[0] || null;
};
```

### Endpoint

#### Params

* id: identificador del seguimiento

#### Response

```json
{
    "id": 1,
    "nombre_servicio": "hola",
    "servicio_id": 1,
    "solicitante_id": 1,
    "personal_id": 2,
    "ubicacion": "hermosillo",
    "tipo_seg_servicio": "Instalación",
    "fecha_inicio": "2026-05-01T07:00:00.000Z",
    "fecha_fin_estimada": "2026-05-01T07:00:00.000Z",
    "observaciones": "hola",
    "created_at": "2026-05-01T23:39:51.000Z",
    "updated_at": "2026-05-01T23:39:51.000Z",
    "tipo_servicio": "Instalación",
    "status_servicio": "Completado",
    "prioridad": "media",
    "svc_fecha_inicio": "2026-05-01T07:00:00.000Z",
    "fecha_fin": "2026-04-30T07:00:00.000Z",
    "svc_ubicacion": "hermosillo",
    "nombre_area": "UNISON HERMOSILLO",
    "nombre_contacto": "Alfredo Gonzales",
    "tel_solicitante": "663443567",
    "nombre_personal": "Jorge"
}
```

### Error 404

```json
{
    "message": "Seguimiento no encontrado para ese servicio"
}
```

#### Error 500

```json
{
    "message": "Bind parameters must not contain undefined. To pass SQL NULL specify JS null"
}
```

## PUT /api/seguimiento/:ID

Esta ruta se encarga de actualizar un seguimiento por id, a la vez actualiza el servicio padre.

### Referencia API

#### Module: update

Actualiza el seguimiento y sincroniza los cambios relevantes al servicio padre. Lógica de sincronización:

* Si cambia personal\_id: ajusta servicios\_activos del técnico anterior (−1) y del nuevo (+1), y actualiza operador\_id en los utensilios 'En uso' del servicio.
* Si cambia personal\_id o ubicacion: refleja el cambio en la tabla servicios.
* Todo ocurre dentro de una transacción para garantizar consistencia.

Bbtenemos los datos del seguimiento por id y obtenemos el pool de la bd, realizamos un beginTransaction para manejar multiples queries relacionadas para consistencia de datos seguido de actualizar la tabla de seguimiento.

```javascript
const update = async (id, data) => {
  const seg  = await getById(id);
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();
    await conn.execute(
      `UPDATE seguimiento SET personal_id=?, ubicacion=?, fecha_fin_estimada=?, observaciones=? WHERE id=?`,
      [data.personal_id || null, data.ubicacion, data.fecha_fin_estimada || null, data.observaciones || null, id]
    );
```

Detectar qué campos cambiaron para saber si hay que sincronizar

```javascript
    const personalCambio  = data.personal_id != seg.personal_id;
    const ubicacionCambio = data.ubicacion   !== seg.ubicacion;
```

Si uno de los campos se cambio entonces verificara si el servicio padre no esta completado antes de mover contadores

```javascrippt
    if (personalCambio || ubicacionCambio) {
      if (personalCambio) {
        const [svcRows] = await conn.execute(
          `SELECT status, personal_id FROM servicios WHERE id = ?`, [seg.servicio_id]
        );
        const svc = svcRows[0];

        if (svc && svc.status !== 'Completado') {
          const personalAnterior = svc.personal_id;
          const personalNuevo    = data.personal_id || null;
```

Decrementa el contador (servicios\_activos) del tecnico que se va.

```javascript
          if (personalAnterior) {
            await conn.execute(
              `UPDATE personal SET servicios_activos = GREATEST(servicios_activos - 1, 0) WHERE id = ?`,
              [personalAnterior]
            );
          }
```

Incrementa contador (servicios\_activos) del técnico que entra.

```javascript
          if (personalNuevo) {
            await conn.execute(
              `UPDATE personal SET servicios_activos = servicios_activos + 1 WHERE id = ?`,
              [personalNuevo]
            );
          }
```

Reasignar operador\_id en los utensilios 'En uso' de este servicio

```javascript
          if (personalNuevo !== personalAnterior) {
            await conn.execute(
              `UPDATE utensilios u
               JOIN servicio_utensilios su ON su.utensilio_id = u.id
               SET u.operador_id = ?
               WHERE su.servicio_id = ? AND u.status_utensilio = 'En uso'`,
              [personalNuevo, seg.servicio_id]
            );
          }
        }
      }
```

Reflejar personal\_id y ubicacion en el servicio padre (fuente de verdad compartida), manda un commit y retorna a el query de getById para mostrar el json, en caso de que falle pasaria al catch en donde se hace un rollback el cual cancela todo el beginTransaction, esto significa que todo el proceso que se hizo con anterioridad no se vera reflejado, finalmente cierra la conexion.

```javascript
      await conn.execute(
        `UPDATE servicios SET personal_id=?, ubicacion=? WHERE id=?`,
        [data.personal_id || null, data.ubicacion, seg.servicio_id]
      );
    }

    await conn.commit();
    return repo.getById(id);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};
```

#### Repository:

### Endpoint

#### Params

* id: identificador del seguimiento

#### Body

```json
{
    "ubicacion": "hermosillo",
    "fecha_fin_estimada":"",
    "observaciones":"documentando we"
}
```

#### Response

```json
{
    "id": 5,
    "nombre_servicio": "cambiando",
    "servicio_id": 5,
    "solicitante_id": 5,
    "personal_id": null,
    "ubicacion": "hermosillo",
    "tipo_seg_servicio": "Reparación",
    "fecha_inicio": "2026-04-29T07:00:00.000Z",
    "fecha_fin_estimada": null,
    "observaciones": "documentando we",
    "created_at": "2026-05-05T01:53:41.000Z",
    "updated_at": "2026-05-05T02:26:05.000Z",
    "tipo_servicio": "Reparación",
    "status_servicio": "Completado",
    "prioridad": "alta",
    "svc_fecha_inicio": "2026-04-29T07:00:00.000Z",
    "fecha_fin": "2026-05-04T07:00:00.000Z",
    "svc_ubicacion": "hermosillo",
    "nombre_area": "Hermosillo",
    "nombre_contacto": "maria jose",
    "tel_solicitante": "1122334455",
    "nombre_personal": null
}
```

### Error 500

```json
{
    "message": "Bind parameters must not contain undefined. To pass SQL NULL specify JS null"
}
```

### Error 404

```json
{
    "message": "Seguimiento no encontrado"
}
```

## PUT /api/seguimiento/:ID/:observaciones

Esta ruta se encarga de agregar observaciones a un seguimiento por id

### Referencia API

#### Modules: addObservacion

* Agrega o reemplaza las observaciones/notas técnicas de un seguimiento.
* Endpoint ligero que evita enviar todos los campos solo para anotar algo.

```javascript
const addObservacion = async (id, observaciones) => {
  await getById(id);
  await repo.updateObservaciones(id, observaciones);
  return repo.getById(id);
};
```

### Endpoint

#### Params

* id: identificador del seguimiento
* observaciones: observaciones del seguimiento

#### Body

```json
{
  "observaciones":"funciona"
}
```

#### Response

```json
{
    "id": 5,
    "nombre_servicio": "cambiando",
    "servicio_id": 5,
    "solicitante_id": 5,
    "personal_id": 2,
    "ubicacion": "uni | a",
    "tipo_seg_servicio": "Reparación",
    "fecha_inicio": "2026-04-29T07:00:00.000Z",
    "fecha_fin_estimada": "2026-04-29T07:00:00.000Z",
    "observaciones": "funciona",
    "created_at": "2026-05-05T01:53:41.000Z",
    "updated_at": "2026-05-05T02:30:18.000Z",
    "tipo_servicio": "Reparación",
    "status_servicio": "Completado",
    "prioridad": "alta",
    "svc_fecha_inicio": "2026-04-29T07:00:00.000Z",
    "fecha_fin": "2026-05-04T07:00:00.000Z",
    "svc_ubicacion": "uni | a",
    "nombre_area": "Hermosillo",
    "nombre_contacto": "maria jose",
    "tel_solicitante": "1122334455",
    "nombre_personal": "Jorge"
}
```

### Error 404

```json
{
    "message": "Seguimiento no encontrado"
}
```

#### Error 400

```json
{
    "message": "Falta campo observaciones"
}
```

#### Error 500

```json
{
    "message": "Bind parameters must not contain undefined. To pass SQL NULL specify JS null"
}
```
