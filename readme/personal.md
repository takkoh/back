---
icon: child-reaching
---

# Personal

## POST /api/personal/

Esta ruta se encarga de agregar personal.

### Endpoint

#### Body

```json
{
    "nombre":"Gabriel",
    "cargo":"supervisor",
    "especialidad":"Mantenimiento",
    "telefono":"66245898"
}
```

#### Response

```json
{
    "id": 7,
    "nombre": "Gabriel",
    "cargo": "supervisor",
    "especialidad": "Mantenimiento",
    "telefono": "66245898",
    "servicios_activos": 0,
    "created_at": "2026-05-04T22:08:53.000Z",
    "updated_at": "2026-05-04T22:08:53.000Z"
}
```

#### Error 500

```json
{
    "message": "Bind parameters must not contain undefined. To pass SQL NULL specify JS null"
}
```

## GET api/personal

Esta ruta se encarga de obtener todo el personal.

### Endpoint

#### Response

```json
{
        "id": 5,
        "nombre": "Alfredo",
        "cargo": "Carpintero",
        "especialidad": "Mantenimiento",
        "telefono": "66323452443",
        "servicios_activos": 0,
        "created_at": "2026-04-30T01:07:24.000Z",
        "updated_at": "2026-05-03T03:14:18.000Z"
    },
    {
        "id": 1,
        "nombre": "Gabriel",
        "cargo": "supervisor",
        "especialidad": "Mantenimiento",
        "telefono": "66245898",
        "servicios_activos": 0,
        "created_at": "2026-04-30T00:26:10.000Z",
        "updated_at": "2026-05-01T23:52:42.000Z"
    },
    {
        "id": 2,
        "nombre": "Jorge",
        "cargo": "Tecnico",
        "especialidad": "Reparacion",
        "telefono": "662438921",
        "servicios_activos": 0,
        "created_at": "2026-04-30T00:30:15.000Z",
        "updated_at": "2026-05-01T23:52:03.000Z"
    },
    {
        "id": 4,
        "nombre": "Tuti",
        "cargo": "Carpintero",
        "especialidad": "Mantenimiento",
        "telefono": "66323452443",
        "servicios_activos": 0,
        "created_at": "2026-04-30T01:07:15.000Z",
        "updated_at": "2026-05-02T00:00:57.000Z"
    }
```

#### Error 500

```json
{
    "message": "Bind parameters must not contain undefined. To pass SQL NULL specify JS null"
}
```

## GET api/personal/:ID

Esta ruta se encarga de obtener el personal por id

### Endpoint

#### Params

* id: identificador del personal

#### Response

```json
{
    "id": 5,
    "nombre": "Alfredo",
    "cargo": "Carpintero",
    "especialidad": "Mantenimiento",
    "telefono": "66323452443",
    "servicios_activos": 0,
    "created_at": "2026-04-30T01:07:24.000Z",
    "updated_at": "2026-05-03T03:14:18.000Z"
}
```

#### Error 404

```json
{
    "message": "Personal no encontrado"
}
```

#### Error 500

```json
{
    "message": "Bind parameters must not contain undefined. To pass SQL NULL specify JS null"
}
```

## PUT api/personal/:ID

Esta ruta se encarga de actualizar información del personal.

### Referencia API

#### Module: update

* Actualiza los datos de un miembro del personal.
* valida la existencia del personal antes de actualizar.

```javascript
const update = async (id, data) => {
  await getById(id); // valida existencia antes de actualizar
  await repo.update(id, data);
  return repo.getById(id);
};
```

### Endpoint

#### Params

* id: identificador del personal

#### Body

```json
{
    "nombre":"carlos",
    "cargo":"",
    "especialidad":"",
    "telefono":""
}
```

#### Response

```json
{
    "id": 5,
    "nombre": "carlos",
    "cargo": "",
    "especialidad": "",
    "telefono": "",
    "servicios_activos": 0,
    "created_at": "2026-04-30T01:07:24.000Z",
    "updated_at": "2026-05-04T23:16:41.000Z"
}
```

#### Error 404

```json
{
    "message": "Personal no encontrado"
}
```

#### Error 500

```json
{
    "message": "Bind parameters must not contain undefined. To pass SQL NULL specify JS null"
}
```

## DELETE /api/personal/:ID

Esta ruta se encarga de borrar el personal por medio de id

### Referencia API

#### Module: remove

* Elimina un miembro del personal.
* Verifica que no tenga servicios activos asignados antes de proceder.

```javascript
const remove = async (id) => {
  await getById(id);

  // Impedir eliminación si tiene servicios activos para no dejar servicios sin responsable
  const activos = await repo.countServiciosActivos(id);
  if (activos > 0) {
    throw {
      status: 409,
      message: `No se puede eliminar: el técnico tiene ${activos} servicio(s) activo(s) asignados.`,
    };
  }
  return repo.remove(id);
};
```

#### Repository: getServiciosAsignados

* Retorna todos los servicios asignados a un técnico, ordenados: activos primero (En progreso → Pendiente → Completado), luego por fecha descendente.

```javascript
const remove = async (id) => {
  await getById(id);

  // Impedir eliminación si tiene servicios activos para no dejar servicios sin responsable
  const activos = await repo.countServiciosActivos(id);
  if (activos > 0) {
    throw {
      status: 409,
      message: `No se puede eliminar: el técnico tiene ${activos} servicio(s) activo(s) asignados.`,
    };
  }
  return repo.remove(id);
};
```

### Endpoint

#### Params

* id: identificador del personal

#### Respone

```json
{
    "message": "Personal eliminado"
}
```

#### Error 404

```json
{
    "message": "Personal no encontrado"
}
```

#### Error 409

```json
{
    "message": "No se puede eliminar: el tecnico tiene ${activos} servicio(S) activo(S) asignados."
}
```

#### Error 500

```json
{
    "message": "Bind parameters must not contain undefined. To pass SQL NULL specify JS null"
}
```
