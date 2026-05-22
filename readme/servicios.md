---
icon: gear-api
---

# Servicios

## POST /api/servicios

Esta ruta se encarga de crear servicios nuevos.

### Referencia API

#### Module: create

* Crea un nuevo servicio y genera automáticamente su registro de seguimiento.
* También incrementa servicios\_activos del solicitante y del personal asignado.

```javascript
const create = async (data) => {
  const id = await servicioRepo.create(data);
  await seguimientoRepo.create({
    nombre_servicio : data.nombre_servicio,
    servicio_id:        id,
    solicitante_id:     data.solicitante_id,
    personal_id:        data.personal_id        || null,
    ubicacion:          data.ubicacion,
    tipo_seg_servicio:  data.tipo_servicio,
    fecha_inicio:       data.fecha_inicio,
    fecha_fin_estimada: data.fecha_fin_estimada  || null,
    observaciones:      data.observaciones       || null,
  });
  return servicioRepo.getById(id);
};
```

#### Repository: create

Inserta un nuevo seguimiento. Llamado automáticamente al crear un servicio y lo fragmenta para el uso del mas sencillo del front.

```javascript
const create = async ({ servicio_id, solicitante_id, personal_id, ubicacion, tipo_seg_servicio, fecha_inicio, fecha_fin_estimada, observaciones }) => {
    const [rows] = await pool.execute(
        'SELECT nombre_servicio FROM servicios WHERE id = ?',
        [servicio_id]
    );
    if (rows.length === 0) {
        throw new Error('servicio_id no existe');
    }
    const nombre_servicio = rows[0].nombre_servicio;

    const [result] = await pool.execute(
        `INSERT INTO seguimiento (
            servicio_id,
            nombre_servicio,
            solicitante_id,
            personal_id,
            ubicacion,
            tipo_seg_servicio,
            fecha_inicio,
            fecha_fin_estimada,
            observaciones
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            servicio_id,
            nombre_servicio,
            solicitante_id,
            personal_id        || null,
            ubicacion,
            tipo_seg_servicio,
            fecha_inicio,
            fecha_fin_estimada || null,
            observaciones      || null,
        ]
    );

    return result.insertId;
};
```

#### Repository: create

* Inserta un nuevo servicio en una transacción que también incrementa los contadores:
* solicitante.servicios\_activos + 1
* personal.servicios\_activos + 1 (si se asignó técnico)
* se hace uso de beginTransaction para tener constancia en la operacion de los queries

```javascript
const create = async ({ nombre_servicio, solicitante_id, personal_id, tipo_servicio, fecha_inicio, fecha_fin, status, ubicacion, prioridad }) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.execute(
        `INSERT INTO servicios (nombre_servicio, solicitante_id, personal_id, tipo_servicio, fecha_inicio, fecha_fin, status, ubicacion, prioridad)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          nombre_servicio,
          solicitante_id,
          personal_id  || null,
          tipo_servicio,
          fecha_inicio,
          fecha_fin    || null,
          status       || 'pendiente',
          ubicacion,
          prioridad    || 'media',
        ]
    );
```

Incrementar servicios activos del área solicitante

```javascript
    await conn.execute(
        `UPDATE solicitantes SET servicios_activos = servicios_activos + 1 WHERE id = ?`,
        [solicitante_id]
    );
```

Incrementar servicios activos del técnico asignado (si hay), finalmente hace un commit el cual aplica todos los cambios y manda a insertar el resultado, en caso de fallar todo el proceso se hara un rollback el cual no aplicara los cambios anteriormente hechos, finalmente cerrara conexion con la base de datos.

```javascript
    if (personal_id) {
      await conn.execute(
          `UPDATE personal SET servicios_activos = servicios_activos + 1 WHERE id = ?`,
          [personal_id]
      );
    }

    await conn.commit();
    return result.insertId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};
```

### Endpoint

#### Body

```json
{
    "nombre_servicio": "posteando",
    "solicitante_id": 5,
    "personal_id": 2,
    "tipo_servicio": "Reparacion",
    "fecha_inicio": "2026-04-29",
    "fecha,fin": "2026-04-29",
    "status": "pendiente",
    "ubicacion": "artes",
    "prioridad": "alta"
}
```

#### Response

```json
{
    "id": 5,
    "nombre_servicio": "posteando",
    "solicitante_id": 5,
    "personal_id": 2,
    "tipo_servicio": "Reparación",
    "fecha_inicio": "2026-04-29T07:00:00.000Z",
    "fecha_fin": null,
    "status": "Pendiente",
    "prioridad": "alta",
    "ubicacion": "artes",
    "created_at": "2026-05-05T01:53:41.000Z",
    "updated_at": "2026-05-05T01:53:41.000Z",
    "nombre_area": "Hermosillo",
    "nombre_contacto": "maria jose",
    "telefono": "1122334455",
    "email": "hola@hola.com",
    "nombre_personal": "Jorge"
}
```

#### Error 500

```json
{
    "message": "Bind parameters must not contain undefined. To pass SQL NULL specify JS null"
}
```

## GET /api/servicios

Esta ruta se encarga de obtener todos los servicios.

### Referencia API

#### Repository: getAll

* Retorna todos los servicios con datos del solicitante y técnico asignado, ordenados por fecha de inicio descendente.

```javascript
const getAll = async () => {
  const [rows] = await pool.execute(
      `SELECT s.*,
              sol.nombre_area, sol.nombre_contacto, sol.telefono, sol.email,
              p.nombre AS nombre_personal
       FROM servicios s
              JOIN solicitantes sol ON sol.id = s.solicitante_id
              LEFT JOIN personal p   ON p.id  = s.personal_id
       ORDER BY s.fecha_inicio DESC`
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
        "solicitante_id": 6,
        "personal_id": null,
        "tipo_servicio": "Instalación",
        "fecha_inicio": "2026-05-02T07:00:00.000Z",
        "fecha_fin": "2026-05-03T07:00:00.000Z",
        "status": "Completado",
        "prioridad": "baja",
        "ubicacion": "hermosillo | prueba",
        "created_at": "2026-05-03T02:45:17.000Z",
        "updated_at": "2026-05-03T03:14:18.000Z",
        "nombre_area": "Hermosillo",
        "nombre_contacto": "ramires",
        "telefono": "1122334455",
        "email": "hola@hola.com",
        "nombre_personal": null
    },
    {
        "id": 1,
        "nombre_servicio": "hola",
        "solicitante_id": 1,
        "personal_id": 2,
        "tipo_servicio": "Instalación",
        "fecha_inicio": "2026-05-01T07:00:00.000Z",
        "fecha_fin": "2026-04-30T07:00:00.000Z",
        "status": "Completado",
        "prioridad": "media",
        "ubicacion": "hermosillo",
        "created_at": "2026-05-01T23:37:05.000Z",
        "updated_at": "2026-05-01T23:52:03.000Z",
        "nombre_area": "UNISON HERMOSILLO",
        "nombre_contacto": "Alfredo Gonzales",
        "telefono": "663443567",
        "email": "alfreditoelpillo@unison.mx",
        "nombre_personal": "Jorge"
    },
    {
        "id": 2,
        "nombre_servicio": "tren",
        "solicitante_id": 4,
        "personal_id": 1,
        "tipo_servicio": "Instalación",
        "fecha_inicio": "2026-05-01T07:00:00.000Z",
        "fecha_fin": "2026-05-01T07:00:00.000Z",
        "status": "Completado",
        "prioridad": "baja",
        "ubicacion": "hermosillo | aaaa",
        "created_at": "2026-05-01T23:44:31.000Z",
        "updated_at": "2026-05-01T23:52:42.000Z",
        "nombre_area": "qumica",
        "nombre_contacto": "maria jose",
        "telefono": "1122334455",
        "email": "hola@hola.com",
        "nombre_personal": "Gabriel"
    },
    {
        "id": 3,
        "nombre_servicio": "p",
        "solicitante_id": 5,
        "personal_id": 4,
        "tipo_servicio": "Mantenimiento preventivo",
        "fecha_inicio": "2026-05-01T07:00:00.000Z",
        "fecha_fin": "2026-05-02T07:00:00.000Z",
        "status": "Completado",
        "prioridad": "alta",
        "ubicacion": "hermosillo | chamoy",
        "created_at": "2026-05-02T00:00:26.000Z",
        "updated_at": "2026-05-02T00:00:57.000Z",
        "nombre_area": "Hermosillo",
        "nombre_contacto": "maria jose",
        "telefono": "1122334455",
        "email": "hola@hola.com",
        "nombre_personal": "Tuti"
    }
```

#### Error 500

```json
{
    "message": "Bind parameters must not contain undefined. To pass SQL NULL specify JS null"
}
```

## GET /api/servicios/:ID

Esta ruta se encarga de obtener servicios por medio de id.

### Referencia API

#### Repository: getById

* Busca un servicio por su ID con datos del solicitante y técnico.

```javascript
const getById = async (id) => {
  const [rows] = await pool.execute(
      `SELECT s.*,
              sol.nombre_area, sol.nombre_contacto, sol.telefono, sol.email,
              p.nombre AS nombre_personal
       FROM servicios s
              JOIN solicitantes sol ON sol.id = s.solicitante_id
              LEFT JOIN personal p   ON p.id  = s.personal_id
       WHERE s.id = ?`,
      [id]
  );
  return rows[0] || null;
};
```

### Endpoint

#### Params

* id: identificador del servicio

#### Response

```json
{
    "id": 1,
    "nombre_servicio": "hola",
    "solicitante_id": 1,
    "personal_id": 2,
    "tipo_servicio": "Instalación",
    "fecha_inicio": "2026-05-01T07:00:00.000Z",
    "fecha_fin": "2026-04-30T07:00:00.000Z",
    "status": "Completado",
    "prioridad": "media",
    "ubicacion": "hermosillo",
    "created_at": "2026-05-01T23:37:05.000Z",
    "updated_at": "2026-05-01T23:52:03.000Z",
    "nombre_area": "UNISON HERMOSILLO",
    "nombre_contacto": "Alfredo Gonzales",
    "telefono": "663443567",
    "email": "alfreditoelpillo@unison.mx",
    "nombre_personal": "Jorge"
}
```

#### Error 404

```json
{
    "message": "Servicio no encontrado"
}
```

#### Error 500

```json
{
    "message": "Bind parameters must not contain undefined. To pass SQL NULL specify JS null"
}
```

## PUT /api/servicios/:ID

Esta ruta se encarga de actualizar servicios por medio de id

### Referencia API

#### Module: update

* Actualiza todos los campos de un servicio.
* Si cambia el personal\_id, ajusta los contadores servicios\_activos del técnico anterior (decrementa) y del nuevo (incrementa).
* verifica si existe el id del servicio en getById, despues manda los datos a update y returna el valor para mostrarlo en formato json.

```javascript
const update = async (id, data) => {
  await getById(id);
  await servicioRepo.update(id, data);
  return servicioRepo.getById(id);
};
```

#### Module: update

* Actualiza todos los campos de un servicio.
* Si cambia el personal\_id, ajusta los contadores servicios\_activos del técnico anterior (decrementa) y del nuevo (incrementa).
* hace un beginTransaction para consistencia de la informacion.

```javascript
const update = async (id, fields) => {
  const { nombre_servicio, solicitante_id, personal_id, tipo_servicio, fecha_inicio, fecha_fin, status, prioridad, ubicacion } = fields;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
```

Lee el estado actual antes de modificar para comparar personal

```javascript
    const [rows] = await conn.execute(`SELECT personal_id, status FROM servicios WHERE id = ?`, [id]);
    const actual = rows[0];
    const [result] = await conn.execute(
      `UPDATE servicios SET nombre_servicio=?, solicitante_id=?, personal_id=?, tipo_servicio=?,
       fecha_inicio=?, fecha_fin=?, status=?, prioridad=?, ubicacion=?
       WHERE id = ?`,
      [nombre_servicio, solicitante_id, personal_id || null, tipo_servicio, fecha_inicio,
       fecha_fin || null, status, prioridad, ubicacion, id]
    );
```

Ajustar contadores solo si el servicio sigue activo y cambió el técnico, aplica los cambios con commit y da un return a los cambios hechos, si falla el proceso se da un rollback el cual evita que se apliquen los cambios anteriores y finalmente cierra conexion a la bd.

```javascript
    if (actual && actual.status !== 'Completado') {
      const personalAnterior = actual.personal_id;
      const personalNuevo    = personal_id || null;

      if (personalAnterior !== personalNuevo) {
        if (personalAnterior) {
          await conn.execute(
            `UPDATE personal SET servicios_activos = GREATEST(servicios_activos - 1, 0) WHERE id = ?`,
            [personalAnterior]
          );
        }
        if (personalNuevo) {
          await conn.execute(
            `UPDATE personal SET servicios_activos = servicios_activos + 1 WHERE id = ?`,
            [personalNuevo]
          );
        }
      }
    }

    await conn.commit();
    return result.affectedRows;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};
```

#### Module: getById

* Busca un servicio por su ID con datos del solicitante y técnico.

```javascript
const getById = async (id) => {
  const [rows] = await pool.execute(
      `SELECT s.*,
              sol.nombre_area, sol.nombre_contacto, sol.telefono, sol.email,
              p.nombre AS nombre_personal
       FROM servicios s
              JOIN solicitantes sol ON sol.id = s.solicitante_id
              LEFT JOIN personal p   ON p.id  = s.personal_id
       WHERE s.id = ?`,
      [id]
  );
  return rows[0] || null;
};
```

### Endpoint

#### Params

* id: identificador del servicio

#### Body

```json
{
    "nombre_servicio": "cambiando",
    "solicitante_id": 5,
    "personal_id": 2,
    "tipo_servicio": "Reparacion",
    "fecha_inicio": "2026-04-29",
    "fecha_fin": "2026-04-30",
    "status": "pendiente",
    "ubicacion": "artes",
    "prioridad": "alta"
}
```

#### Response

```json
{
    "id": 5,
    "nombre_servicio": "cambiando",
    "solicitante_id": 5,
    "personal_id": 2,
    "tipo_servicio": "Reparación",
    "fecha_inicio": "2026-04-29T07:00:00.000Z",
    "fecha_fin": "2026-04-30T07:00:00.000Z",
    "status": "Pendiente",
    "prioridad": "alta",
    "ubicacion": "artes",
    "created_at": "2026-05-05T01:53:41.000Z",
    "updated_at": "2026-05-05T01:58:09.000Z",
    "nombre_area": "Hermosillo",
    "nombre_contacto": "maria jose",
    "telefono": "1122334455",
    "email": "hola@hola.com",
    "nombre_personal": "Jorge"
}
```

#### Error 404

```json
{
    "message": "Servicio no encontrado"
}
```

#### Error 500

```json
{
    "message": "Bind parameters must not contain undefined. To pass SQL NULL specify JS null"
}
```

## DELETE /api/servicios/:ID

Esta ruta se encarga de borrar un servicio por medio de id

### Referencia API

#### Module: remove

-Verifica si existe la id Elimina un servicio. Si no estaba completado:

* Revierte servicios\_activos del solicitante y personal
* Libera todos los utensilios asignados (status → 'Disponible') (incrementa).

```javascript
const remove = async (id) => {
  await getById(id);
  return servicioRepo.remove(id);
};
```

#### Repository: getById

* Busca un servicio por su ID con datos del solicitante y técnico.

```javascript
const getById = async (id) => {
  const [rows] = await pool.execute(
      `SELECT s.*,
              sol.nombre_area, sol.nombre_contacto, sol.telefono, sol.email,
              p.nombre AS nombre_personal
       FROM servicios s
              JOIN solicitantes sol ON sol.id = s.solicitante_id
              LEFT JOIN personal p   ON p.id  = s.personal_id
       WHERE s.id = ?`,
      [id]
  );
  return rows[0] || null;
};
```

#### Repository: remove

Elimina un servicio. Si no estaba completado, en la misma transacción:

* Revierte servicios\_activos del solicitante y del técnico
* Libera los utensilios asignados (status → 'Disponible', operador\_id → NULL)

```javascript
const remove = async (id) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.execute(`SELECT * FROM servicios WHERE id = ?`, [id]);
    const servicio = rows[0];
    if (!servicio) throw new Error('Servicio no encontrado');
```

Revierte contadores solo si el servicio no estaba completado

```javascript
 if (servicio.status !== 'Completado') {
      await conn.execute(
        `UPDATE solicitantes SET servicios_activos = GREATEST(servicios_activos - 1, 0) WHERE id = ?`,
        [servicio.solicitante_id]
      );

      if (servicio.personal_id) {
        await conn.execute(
          `UPDATE personal SET servicios_activos = GREATEST(servicios_activos - 1, 0) WHERE id = ?`,
          [servicio.personal_id]
        );
      }
```

Liberar utensilios al eliminar el servicio activo

```javascript
 await conn.execute(
        `UPDATE utensilios u
         JOIN servicio_utensilios su ON su.utensilio_id = u.id
         SET u.status_utensilio = 'Disponible', u.operador_id = NULL
         WHERE su.servicio_id = ? AND u.status_utensilio = 'En uso'`,
        [id]
      );
    }

    const [result] = await conn.execute(`DELETE FROM servicios WHERE id = ?`, [id]);
    await conn.commit();
    return result.affectedRows;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};
```

### Endpoint

#### Params

* id: identificador del servicio

#### Response

```json
{
    "message": "Servicio eliminado"
}
```

#### Error 404

```json
{
    "message": "Servicio no encontrado"
}
```

#### Error 500

```json
{
    "message": "Bind parameters must not contain undefined. To pass SQL NULL specify JS null"
}
```

## PATCH /api/servicios/:ID/completar

Esta ruta se encarga de cambiar de status a un servicio como completado.

### Referencia API

#### Module: completar

* Completa un servicio: registra fecha\_fin, guarda en historial\_servicios, decrementa contadores del solicitante y personal, y libera los utensilios asignados.
* Insertar registro inmutable en historial para reportes futuros
* busca el servicio por id para confirmar la existencia de este.

```javascript
const completar = async (id, { fecha_fin, notas }) => {
  const servicio = await getById(id);
  await servicioRepo.completar(id, fecha_fin);
  await pool.execute(
    `INSERT INTO historial_servicios
     (nombre_servicio, servicio_id, solicitante_id, personal_id, tipo_hs_servicio, fecha_inicio, fecha_fin, status_final, notas)
     VALUES ( ?, ?, ?, ?, ?, ?, ?, 'Completado', ?)`,
    [servicio.nombre_servicio, id, servicio.solicitante_id, servicio.personal_id,
     servicio.tipo_servicio, servicio.fecha_inicio, fecha_fin, notas || null]
  );

  return { message: 'Servicio completado y registrado en historial' };
};
```

#### Repository: completar

Marca el servicio como 'Completado' y en la misma transacción:

* Decrementa solicitante.servicios\_activos y suma total\_servicios\_completados
* Decrementa personal.servicios\_activos del técnico asignado
* Libera todos los utensilios asignados (status → 'Disponible', operador\_id → NULL)

```javascript
const completar = async (id, fecha_fin) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.execute(`SELECT * FROM servicios WHERE id = ?`, [id]);
    const servicio = rows[0];
    if (!servicio) throw new Error('Servicio no encontrado');

    // Marcar como completado
    await conn.execute(
      `UPDATE servicios SET status='Completado', fecha_fin=? WHERE id = ?`,
      [fecha_fin, id]
    );
```

Actualizar contadores del solicitante

```javascript
    await conn.execute(
      `UPDATE solicitantes
       SET servicios_activos = GREATEST(servicios_activos - 1, 0),
           total_servicios_completados = total_servicios_completados + 1
       WHERE id = ?`,
      [servicio.solicitante_id]
    );
```

Decrementar servicios activos del técnico

```javascript
    if (servicio.personal_id) {
      await conn.execute(
        `UPDATE personal SET servicios_activos = GREATEST(servicios_activos - 1, 0) WHERE id = ?`,
        [servicio.personal_id]
      );
    }
```

Liberar utensilios asignados al servicio

```javascript
    await conn.execute(
      `UPDATE utensilios u
       JOIN servicio_utensilios su ON su.utensilio_id = u.id
       SET u.status_utensilio = 'Disponible', u.operador_id = NULL , u.solicitante_id = NULL
       WHERE su.servicio_id = ? AND u.status_utensilio = 'En uso'`,
      [id]
    );
    await conn.execute(
      `UPDATE servicio_utensilios su SET su.Status='Finalizado' WHERE su.servicio_id = ? AND su.Status = 'En uso' `,
      [id]
    );

    await conn.commit();
    return true;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};
```

### Endpoint

#### Body

```json
{
    "fecha_fin":"2026-05-04",
    "notas": "servicio terminado"
}
```

#### Response

```json
{
    "message": "Servicio completado y registrado en historial"
}
```

#### Error 404

```json
{
    "message": "Servicio no encontrado"
}
```

#### Error 500

```json
{
    "message": "Bind parameters must not contain undefined. To pass SQL NULL specify JS null"
}
```

## PATCH /api/servicios/:id/status

Esta ruta se encarga de cambiar estatus a un servicio por medio de id.

### Referencia API

#### Module: cambiarStatus

* Cambia el status del servicio entre 'Pendiente' y 'En progreso'.
* No permite cambiar a 'Completado' desde aquí — usar la ruta completar() para eso.
* verifica existencia de servicio por medio de getById
* returna para imprimir el servicio en getById en formato json.
* Hace las querys directamente en esta funcion.

```javascript
const cambiarStatus = async (id, status) => {
  if (!VALID_STATUS.includes(status))
    throw { status: 400, message: `Status inválido. Valores permitidos: ${VALID_STATUS.join(', ')}` };
  const servicio = await getById(id);
  // Un servicio completado no puede retroceder de estado
  if (servicio.status === 'Completado')
    throw { status: 409, message: 'No se puede cambiar el status de un servicio ya completado. Usa el endpoint /completar.' };
  // Redirigir al flujo correcto si intentan completar desde aquí
  if (status === 'Completado')
    throw { status: 400, message: 'Para completar un servicio usa PATCH /servicios/:id/completar (requiere fecha_fin).' };
  await pool.execute(`UPDATE servicios SET status = ? WHERE id = ?`, [status, id]);
  return servicioRepo.getById(id);
};
```

### Endpoint

#### Params

* id: identificador de servicio

#### Body

```json
{
    "status": "En progreso"
}
```

#### Response

```json
  {
    "id": 4,
    "nombre_servicio": "silla 1234",
    "solicitante_id": 2,
    "personal_id": 1,
    "tipo_servicio": "Reparación",
    "fecha_inicio": "2026-04-30T07:00:00.000Z",
    "fecha_fin": null,
    "status": "En progreso",
    "prioridad": "alta",
    "ubicacion": "UNISON HERMOSILLO 5K201",
    "created_at": "2026-05-05T16:32:08.000Z",
    "updated_at": "2026-05-06T15:33:17.000Z",
    "nombre_area": "UNISON HERMOSILLO",
    "nombre_contacto": "Pedro Ortega",
    "telefono": "663443567",
    "email": "pedro@unison.mx",
    "nombre_personal": "Gabriel"
}
```

#### Error 400

```json
{
    "message": "Falta el campo status"
}
```

#### Error 400

```json
{
    "message": "Status inválido. Valores permitidos: Pendiente, En progreso, Completado"
}
```

#### Error 400

```json
{
    "message": "Para completar un servicio usa PATCH /servicios/:id/completar (requiere fecha_fin)."
}
```

#### Error 404

```json
{
    "message": "Servicio no encontrado"
}
```

#### Error 409

```json
{
    "message": "No se puede cambiar el status de un servicio ya completado. Usa el endpoint /completar."
}
```

#### Error 500

```json
{
    "message": "Error interno del servidor"
}
```

## PATCH /api/servicios/:id/prioridad

Esta ruta se encarga de cambiar la prioridad de un servicio por medio de Id

### Referencia API

#### Module: cambiarPrioridad

* Cambia la prioridad del servicio sin afectar otros campos.
* verifica si existe por medio del module getById
* Hace un update a la tabla servicios en el campo prioridad donde se encuentre la id ingresada como parametro

```javascript
const cambiarPrioridad = async (id, prioridad) => {
  if (!VALID_PRIORIDAD.includes(prioridad))
    throw { status: 400, message: `Prioridad inválida. Valores permitidos: ${VALID_PRIORIDAD.join(', ')}` };

  await getById(id);
  await pool.execute(`UPDATE servicios SET prioridad = ? WHERE id = ?`, [prioridad, id]);
  return servicioRepo.getById(id);
};  
```

### Endpoint

#### Params

* id: identificador de servicio

#### Body

```json
{
    "prioridad": "alta"
}
```

#### Response

```json
{
    "id": 5,
    "nombre_servicio": "estufa 1234",
    "solicitante_id": 2,
    "personal_id": 1,
    "tipo_servicio": "Reparación",
    "fecha_inicio": "2026-04-30T07:00:00.000Z",
    "fecha_fin": null,
    "status": "En progreso",
    "prioridad": "alta",
    "ubicacion": "UNISON HERMOSILLO 5K201",
    "created_at": "2026-05-05T16:32:17.000Z",
    "updated_at": "2026-05-06T15:46:17.000Z",
    "nombre_area": "UNISON HERMOSILLO",
    "nombre_contacto": "Pedro Ortega",
    "telefono": "663443567",
    "email": "pedro@unison.mx",
    "nombre_personal": "Gabriel"
}
```

#### Error 400

```json
{
  "message": "Falta el campo prioridad"
}
```

#### Error 400

```json
{
   "message": "Falta el campo prioridad"
}
```

#### Error 500

```json
{
  "message": "Error interno del servidor"
}
```

## GET /api/servicios/:id/utensilios

Esta ruta se encarga de obtener todos los utensilios de un servicio por medio del id del servicio.

### Referencia API

#### Repository: getUtensilios

* Retorna los utensilios asignados a un servicio mediante la tabla pivote.

```javascript
const getUtensilios = async (servicio_id) => {
  const [rows] = await pool.execute(
    `SELECT u.* FROM utensilios u
     JOIN servicio_utensilios su ON su.utensilio_id = u.id
     WHERE su.servicio_id = ?`,
    [servicio_id]
  );
  return rows;
};
```

### Endpoint

#### Params

* id: identificador de servicio

#### Response

```json
[
    {
        "id": 1,
        "clasificacion": "Herramienta",
        "tipo_utensilio": "Martillo",
        "solicitante_id": null,
        "operador_id": null,
        "Rangos_mantenimiento": "30",
        "status_mantenimiento": "Al día",
        "status_utensilio": "Disponible",
        "ultimo_mantenimiento": "2026-04-29T07:00:00.000Z",
        "created_at": "2026-04-29T18:41:32.000Z",
        "updated_at": "2026-04-30T18:11:09.000Z"
    }
]
```

#### Error 500

```json
{
  "message": "Error interno del servidor"
}
```

## POST /api/servicios/:id/utensilios

Esta ruta se encarga de añadir utensilios a un servicio por medio del id del servicio.

### Referencia API

#### Repository: addUtensilio

Asigna un utensilio al servicio en una transacción que también:

* Valida que el utensilio esté 'Disponible' (no 'En uso' ni 'Mantenimiento')
* Cambia su status\_utensilio a 'En uso'
* Asigna el personal\_id del servicio como operador\_id del utensilio

```javascript
const addUtensilio = async (servicio_id, utensilio_id) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
```

Verificar disponibilidad del utensilio antes de asignar

```javascript
    const [check] = await conn.execute(
      `SELECT status_utensilio FROM utensilios WHERE id = ?`, [utensilio_id]
    );
    if (check[0] && check[0].status_utensilio === 'En uso') {
      throw { status: 409, message: 'El utensilio ya está en uso en otro servicio' };
    }
    if (check[0] && check[0].status_utensilio === 'Mantenimiento') {
      throw { status: 409, message: 'El utensilio está en mantenimiento y no puede asignarse' };
    }
```

Registrar en tabla pivote (IGNORE evita duplicados silenciosamente)

```javascript
    await conn.execute(
      `INSERT IGNORE INTO servicio_utensilios (servicio_id, utensilio_id) VALUES (?, ?)`,
      [servicio_id, utensilio_id]
    );
```

Obtener el técnico del servicio para asignarlo como operador del utensilio

```javascript
    const [svcRows] = await conn.execute(
      `SELECT personal_id FROM servicios WHERE id = ?`, [servicio_id]
    );
    const operador_id = svcRows[0]?.personal_id || null;
```

Marcar utensilio como en uso y asignar operador

```javascript
    await conn.execute(
      `UPDATE utensilios SET status_utensilio = 'En uso', operador_id = ? WHERE id = ?`,
      [operador_id, utensilio_id]
    );

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};
```

### Endpoint

#### Params

* id: identificador de servicio

#### Body

```json
{
    "utensilio_id": 1
}
```

#### Response

```json
{
    "message": "Utensilio asignado"
}
```

#### Error 409

```json
{
  "message": "El utensilio ya está en uso en otro servicio"
}
```

#### Error 409

```json
{
  "message": "El utensilio está en mantenimiento y no puede asignarse"
}
```

#### Error 500

```json
{
  "message": "Error interno del servidor"
}
```

## DELETE /api/servicios/:id/utensilios/:utensilio\_id

Esta ruta se encarga de borrar utensilios de un servicio por medio de id de servicio y id de utensilio

### Referencia API

#### Repository: removeUtensilio

Realiza un beginTransaction para congruencia de la operacion y hace un pool a la bd

```javascript
const removeUtensilio = async (servicio_id, utensilio_id) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
```

ejecuta la query para borrar el utensilio de servicio\_utensilios

```javascript
    await conn.execute(
      `DELETE FROM servicio_utensilios WHERE servicio_id=? AND utensilio_id=?`,
      [servicio_id, utensilio_id]
    );
```

Libera el utensilio al quitarlo del servicio, si la operacion fue exitosa lanzara un commit aplicando todos los cambios hechos, si falla algo se hara un rollback el cual cancela la operacion, fianlmente se cierra la conexión a la bd.

```javascript
    await conn.execute(
      `UPDATE utensilios SET status_utensilio = 'Disponible', operador_id = NULL WHERE id = ?`,
      [utensilio_id]
    );

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};
```

### Endpoint

#### Params

* id: identificador de servicio
* utensilio\_id: identificador del utensilio

#### Response

```json
{
  "message": "Utensilio removido"
}
```

#### Error 500

```json
{
  "message": "Error interno del servidor"
}
```

## POST /api/servicios/:id/evidencias

Esta ruta se encarga de agregar evidencias a un servicio por medio de identificador de un servicio.

### Referencia API

#### Module: addEvidencia

Busca el servicio por id en getByid para despues extraer el MIME del prefijo del base64

```javascript
const addEvidencia = async (servicio_id, tipo, base64Data) => {
  await getById(servicio_id);
  const mimeMatch = base64Data.match(/^data:([^;]+);base64,/);
  if (!mimeMatch || !VALID_MIME.includes(mimeMatch[1])) {
    throw { status: 400, message: 'Formato de imagen no válido. Usa JPEG, PNG o WEBP.' };
  }
```

* Se tiene de limite 5 MB en base64 que es igual a 6.7M caracteres menos el margen de seguridad a 7M de caracteres
* Inserta la informacion en la tabla evidencia

```javascript
  if (base64Data.length > 7_000_000) {
    throw { status: 400, message: 'La imagen supera el tamaño máximo permitido (5 MB).' };
  }
  await pool.execute(
    `INSERT INTO evidencia (servicio_id, tipo, url_image) VALUES (?, ?, ?)`,
    [servicio_id, tipo, base64Data]
  );
};
```

### Endpoint

#### Params

* id: identificador de servicio

#### Body

```json
{
  "tipo": "inicio",
  "base64Data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII="
}
```

#### Response

```json
{
  "message": "Evidencia guardada"
}
```

#### Error 400

```json
{
  "message": "Se requieren tipo e image (base64)"
}
```

#### Error 400

```json
{
  "message": "Formato de imagen no válido. Usa JPEG, PNG o WEBP."
}
```

#### Error 400

```json
{
  "message": "La imagen supera el tamaño máximo permitido (5 MB)."
}
```

#### Error 500

```json
{
  "message": "Error interno del servidor"
}
```

## GET /api/servicios/:id/evidencias

Esta ruta se encarga de obtener las evidencias de un servicio por medio del id del servicio

### Referencia API

#### Module: getEvidencias

* Retorna todas las evidencias de un servicio, ordenadas por tipo y fecha.
* verifica existencia del servicio por id en getById

```javascript
const getEvidencias = async (servicio_id) => {
  await getById(servicio_id);
  const [rows] = await pool.execute(
    `SELECT id, servicio_id, tipo, url_image, created_at
     FROM evidencia WHERE servicio_id = ? ORDER BY tipo, created_at`,
    [servicio_id]
  );
  return rows;
};
```

### Endpoint

#### Params

* id: identificador de servicio

#### Response

```json
{
  "id": 2,
        "servicio_id": 5,
        "tipo": "inicio",
        "url_image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII="
}
```

#### Error 500

```json
{
  "message": "Error interno del servidor"
}
```

## DELETE /api/servicios/:id/evidencias/:evidencia\_id

Esta ruta se encarga de borrar evidencias de un servicio por medio de id del servicio y id de la evidencia.

### Endpoint

#### Params

* id: identificador de servicio
* evidencia\_id: identificador de la evidencia

#### Response

```json
{
    "message": "Evidencia eliminada"
}
```

#### Error 404

```json
{
  "message": "Evidencia no encontrada"
}
```

#### Error 500

```json
{
  "message": "Error interno del servidor"
}
```
