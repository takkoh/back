---
icon: chart-simple-horizontal
---

# Reportes

## GET api/reportes/historial

Esta ruta se encarga de obtener todo el historial de servicios completados.

### Referencia API

#### Repository: getHistorialServicios

* Retorna el historial de servicios completados con filtros opcionales por query params.
* Se hacen joins en la tabla solicitantes y personal.
* Todos los filtros son opcionales y se combinan con AND.

```javascript
const getHistorialServicios = async ({ fecha_inicio, fecha_fin, solicitante_id, personal_id, tipo } = {}) => {
  let query = `
    SELECT hs.*,
           sol.nombre_area, sol.nombre_contacto,
           p.nombre AS nombre_personal
    FROM historial_servicios hs
    JOIN solicitantes sol ON sol.id = hs.solicitante_id
    LEFT JOIN personal p   ON p.id  = hs.personal_id
    WHERE 1=1`;
  const params = [];

  // Construir filtros dinámicamente según los parámetros recibidos
  if (fecha_inicio)   { query += ` AND hs.fecha_inicio >= ?`;    params.push(fecha_inicio); }
  if (fecha_fin)      { query += ` AND hs.fecha_fin    <= ?`;    params.push(fecha_fin); }
  if (solicitante_id) { query += ` AND hs.solicitante_id = ?`;   params.push(solicitante_id); }
  if (personal_id)    { query += ` AND hs.personal_id    = ?`;   params.push(personal_id); }
  if (tipo)           { query += ` AND hs.tipo_hs_servicio = ?`; params.push(tipo); }

  query += ` ORDER BY hs.fecha_fin DESC`;
  const [rows] = await pool.execute(query, params);
  return rows;
};
```

### Endpoint

#### Response

```json
    {
        "id": 1,
        "nombre_servicio": "Mesa 1234",
        "servicio_id": 3,
        "solicitante_id": 2,
        "personal_id": 1,
        "tipo_hs_servicio": "Reparación",
        "fecha_inicio": "2026-04-30T07:00:00.000Z",
        "fecha_fin": "2026-04-30T07:00:00.000Z",
        "status_final": "Completado",
        "duracion_dias": 0,
        "notas": "aaaaaaa",
        "registrado_at": "2026-04-30T18:00:05.000Z",
        "nombre_area": "UNISON HERMOSILLO",
        "nombre_contacto": "Pedro Ortega",
        "nombre_personal": "Gabriel"
    }
```

#### Error 500

```json
{
    "message": "Bind parameters must not contain undefined. To pass SQL NULL specify JS null"
}
```

## GET api/reportes/dashboard

Esta ruta se encarga de la información que se mostrara en el dashboard, como por ejemplo: conteo de servicios agrupado por status, conteo por prioridad etc.

### Referencia API

#### Repository: getDashboard

* Ejecuta múltiples queries en paralelo para armar el resumen del dashboard.
* Retorna conteos por status, por prioridad, urgentes, alertas de utensilios y las listas de los 10 servicios más urgentes en cada estado activo.

Conteo de servicios agripado por status

```javascript
    const getDashboard = async () => {
  const [porStatus] = await pool.execute(
    `SELECT status, COUNT(*) AS total
     FROM servicios
     GROUP BY status`
  );
```

Conteo por prioridad solo de servicios activos (sin los completados)

```javascript
  const [porPrioridad] = await pool.execute(
    `SELECT prioridad, COUNT(*) AS total
     FROM servicios
     WHERE status IN ('Pendiente', 'En progreso')
     GROUP BY prioridad`
  );
```

Selecciona Urgentes donde la prioridad sea alta + activos

```javascript
  const [urgentes] = await pool.execute(
    `SELECT COUNT(*) AS total FROM servicios
     WHERE prioridad = 'alta' AND status IN ('Pendiente', 'En progreso')`
  );
```

Selecciona los Top 10 servicios pendientes ordenados por prioridad y antigüedad

```javascript
  const [pendientes] = await pool.execute(
    `SELECT s.id, s.nombre_servicio, s.tipo_servicio, s.prioridad, s.fecha_inicio,
            s.ubicacion, sol.nombre_area, p.nombre AS tecnico
     FROM servicios s
     JOIN solicitantes sol ON sol.id = s.solicitante_id
     LEFT JOIN personal p  ON p.id  = s.personal_id
     WHERE s.status = 'Pendiente'
     ORDER BY FIELD(s.prioridad,'alta','media','baja'), s.fecha_inicio ASC
     LIMIT 10`
  );
```

Selecciona los Top 10 servicios en progreso ordenados por prioridad y antigüedad

```javascript
  const [enProgreso] = await pool.execute(
    `SELECT s.id, s.nombre_servicio, s.tipo_servicio, s.prioridad, s.fecha_inicio,
            s.ubicacion, sol.nombre_area, p.nombre AS tecnico
     FROM servicios s
     JOIN solicitantes sol ON sol.id = s.solicitante_id
     LEFT JOIN personal p  ON p.id  = s.personal_id
     WHERE s.status = 'En progreso'
     ORDER BY FIELD(s.prioridad,'alta','media','baja'), s.fecha_inicio ASC
     LIMIT 10`
  );
```

Utensilios que requieren atención del supervisor (Mantenimiento)

```javascript
  const [utensiliosAlerta] = await pool.execute(
    `SELECT COUNT(*) AS total FROM utensilios
     WHERE status_mantenimiento IN ('Próximo','En proceso')`
  );
```

Mapea arrays a objetos para fácil acceso en el frontend y returna estos valores

```javascript
  const statusMap = { Pendiente: 0, 'En progreso': 0, Completado: 0 };
  porStatus.forEach(r => { statusMap[r.status] = r.total; });

  const prioridadMap = { baja: 0, media: 0, alta: 0 };
  porPrioridad.forEach(r => { prioridadMap[r.prioridad] = r.total; });

  return {
    resumen: {
      pendientes:        statusMap['Pendiente'],
      en_progreso:       statusMap['En progreso'],
      completados:       statusMap['Completado'],
      urgentes:          urgentes[0].total,
      por_prioridad:     prioridadMap,
      utensilios_alerta: utensiliosAlerta[0].total,
    },
    servicios_pendientes:   pendientes,
    servicios_en_progreso:  enProgreso,
  };
};
```

### Endpoint

#### Response

```json
    {
    "resumen": {
        "pendientes": 2,
        "en_progreso": 1,
        "completados": 1,
        "urgentes": 1,
        "por_prioridad": {
            "baja": 1,
            "media": 1,
            "alta": 1
        },
        "utensilios_alerta": 0
    },
    "servicios_pendientes": [
        {
            "id": 4,
            "nombre_servicio": "silla 1234",
            "tipo_servicio": "Reparación",
            "prioridad": "alta",
            "fecha_inicio": "2026-04-30T07:00:00.000Z",
            "ubicacion": "UNISON HERMOSILLO 5K201",
            "nombre_area": "UNISON HERMOSILLO",
            "tecnico": "Gabriel"
        },
        {
            "id": 6,
            "nombre_servicio": "vestibulo 1234",
            "tipo_servicio": "Reparación",
            "prioridad": "baja",
            "fecha_inicio": "2026-04-30T07:00:00.000Z",
            "ubicacion": "UNISON HERMOSILLO 5K201",
            "nombre_area": "UNISON CABORCA",
            "tecnico": "Jorge"
        }
    ],
    "servicios_en_progreso": [
        {
            "id": 5,
            "nombre_servicio": "estufa 1234",
            "tipo_servicio": "Reparación",
            "prioridad": "media",
            "fecha_inicio": "2026-04-30T07:00:00.000Z",
            "ubicacion": "UNISON HERMOSILLO 5K201",
            "nombre_area": "UNISON HERMOSILLO",
            "tecnico": "Gabriel"
        }
    ]
    }
```

#### Error 500

```json
{
    "message": "Bind parameters must not contain undefined. To pass SQL NULL specify JS null"
}
```

## GET api/reportes/resumen-tipo

Esta ruta se encarga de obtener el historial de tipos de servicio con su informacion como: total de servicios hechos del tipo de servicio y el promedio de dias.

### Referencia API

#### Repository: resumenPorTipo

* Retorna el conteo de servicios completados y el promedio de días agrupado por tipo.

```javascript
const resumenPorTipo = async () => {
  const [rows] = await pool.execute(
    `SELECT tipo_hs_servicio AS tipo,
            COUNT(*) AS total,
            AVG(duracion_dias) AS promedio_dias
     FROM historial_servicios
     WHERE status_final = 'Completado'
     GROUP BY tipo_hs_servicio`
  );
  return rows;
};
```

### Endpoint

#### Response

```json
    {
        "tipo": "Reparación",
        "total": 10,
        "promedio_dias": "3.3333"
    },
    {
        "tipo": "Mantenimiento preventivo",
        "total": 10,
        "promedio_dias": "3.3333"
    },
    {
        "tipo": "Instalación",
        "total": 10,
        "promedio_dias": "3.3333"
    },
    {
        "tipo": "Otros",
        "total": 10,
        "promedio_dias": "3.3333"
    }
```

#### Error 500

```json
{
    "message": "Bind parameters must not contain undefined. To pass SQL NULL specify JS null"
}
```

## GET api/reportes/activos

Esta ruta se encarga de obtener los servicios activos

### Referencia API

#### Repository: getServiciosActivos

* Retorna todos los servicios en estado 'Pendiente' o 'En progreso', ordenados por prioridad descendente y fecha ascendente.

```javascript
const getServiciosActivos = async () => {
  const [rows] = await pool.execute(
    `SELECT s.*,
            sol.nombre_area, sol.nombre_contacto,
            p.nombre AS nombre_personal
     FROM servicios s
     JOIN solicitantes sol ON sol.id = s.solicitante_id
     LEFT JOIN personal p   ON p.id  = s.personal_id
     WHERE s.status IN ('Pendiente','En progreso')
     ORDER BY FIELD(s.prioridad,'alta','media','baja'), s.fecha_inicio ASC`
  );
  return rows;
};
```

### Endpoint

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
        "status": "Pendiente",
        "prioridad": "alta",
        "ubicacion": "UNISON HERMOSILLO 5K201",
        "created_at": "2026-05-05T16:32:08.000Z",
        "updated_at": "2026-05-05T16:36:46.000Z",
        "nombre_area": "UNISON HERMOSILLO",
        "nombre_contacto": "Pedro Ortega",
        "nombre_personal": "Gabriel"
    },
    {
        "id": 5,
        "nombre_servicio": "estufa 1234",
        "solicitante_id": 2,
        "personal_id": 1,
        "tipo_servicio": "Reparación",
        "fecha_inicio": "2026-04-30T07:00:00.000Z",
        "fecha_fin": null,
        "status": "En progreso",
        "prioridad": "media",
        "ubicacion": "UNISON HERMOSILLO 5K201",
        "created_at": "2026-05-05T16:32:17.000Z",
        "updated_at": "2026-05-05T16:35:08.000Z",
        "nombre_area": "UNISON HERMOSILLO",
        "nombre_contacto": "Pedro Ortega",
        "nombre_personal": "Gabriel"
    },
    {
        "id": 6,
        "nombre_servicio": "vestibulo 1234",
        "solicitante_id": 3,
        "personal_id": 2,
        "tipo_servicio": "Reparación",
        "fecha_inicio": "2026-04-30T07:00:00.000Z",
        "fecha_fin": null,
        "status": "Pendiente",
        "prioridad": "baja",
        "ubicacion": "UNISON HERMOSILLO 5K201",
        "created_at": "2026-05-05T16:32:36.000Z",
        "updated_at": "2026-05-05T16:36:50.000Z",
        "nombre_area": "UNISON CABORCA",
        "nombre_contacto": "Yahir Felele",
        "nombre_personal": "Jorge"
    }
```

#### Error 500

```json
{
    "message": "Bind parameters must not contain undefined. To pass SQL NULL specify JS null"
}
```

## GET api/reportes/historial-mantenimiento

Esta ruta se encarga de obtener el historial de mantenimiento de los utensilios.

### Referencia API

#### Repository: getHistorialMantenimiento

* Retorna el historial de mantenimientos con filtros opcionales.

```javascript
const getHistorialMantenimiento = async ({ utensilio_id, fecha_inicio, fecha_fin } = {}) => {
  let query = `
    SELECT hm.*, u.tipo_utensilio, u.clasificacion,
           p.nombre AS tecnico
    FROM historial_mantenimiento hm
    JOIN utensilios u ON u.id = hm.utensilio_id
    LEFT JOIN personal p ON p.id = hm.personal_id
    WHERE 1=1`;
  const params = [];

  if (utensilio_id) { query += ` AND hm.utensilio_id = ?`;         params.push(utensilio_id); }
  if (fecha_inicio) { query += ` AND hm.fecha_mantenimiento >= ?`; params.push(fecha_inicio); }
  if (fecha_fin)    { query += ` AND hm.fecha_mantenimiento <= ?`; params.push(fecha_fin); }

  query += ` ORDER BY hm.fecha_mantenimiento DESC`;
  const [rows] = await pool.execute(query, params);
  return rows;
};
```

### Endpoint

#### Response

```json
    {
        "id": 5,
        "utensilio_id": 1,
        "personal_id": 2,
        "fecha_mantenimiento": "2026-04-29T07:00:00.000Z",
        "tipo": "Correctivo",
        "descripcion": "Tenia irregularidades en la parte metallica",
        "proxima_fecha": "2027-04-29T07:00:00.000Z",
        "created_at": "2026-04-29T19:17:23.000Z",
        "tipo_utensilio": "Martillo",
        "clasificacion": "Herramienta",
        "tecnico": "Jorge"
    },
    {
        "id": 6,
        "utensilio_id": 2,
        "personal_id": 4,
        "fecha_mantenimiento": "2026-04-29T07:00:00.000Z",
        "tipo": "Correctivo",
        "descripcion": "Tenia irregularidades en la parte metallica",
        "proxima_fecha": "2027-04-29T07:00:00.000Z",
        "created_at": "2026-04-29T19:18:19.000Z",
        "tipo_utensilio": "Taladro",
        "clasificacion": "Maquinaria",
        "tecnico": "Tuti"
    },
    {
        "id": 7,
        "utensilio_id": 2,
        "personal_id": 4,
        "fecha_mantenimiento": "2026-04-29T07:00:00.000Z",
        "tipo": "Correctivo",
        "descripcion": "Falla en el motorcito del taladro",
        "proxima_fecha": "2027-04-29T07:00:00.000Z",
        "created_at": "2026-04-29T19:19:42.000Z",
        "tipo_utensilio": "Taladro",
        "clasificacion": "Maquinaria",
        "tecnico": "Tuti"
    },
    {
        "id": 1,
        "utensilio_id": 5,
        "personal_id": 2,
        "fecha_mantenimiento": "2026-04-29T07:00:00.000Z",
        "tipo": "Preventivo",
        "descripcion": "Tenia una pata floja",
        "proxima_fecha": "2027-04-29T07:00:00.000Z",
        "created_at": "2026-04-29T19:14:04.000Z",
        "tipo_utensilio": "lentes Protectores",
        "clasificacion": "Equipo",
        "tecnico": "Jorge"
    }
```

#### Error 500

```json
{
    "message": "Bind parameters must not contain undefined. To pass SQL NULL specify JS null"
}
```

## GET api/reportes/ranking-personal

Esta ruta se encarga de hacer un ranking de personal el cual consiste en saber quien tiene el numero mas alto de servicios realizados.

### Referencia API

#### Repository: rankingPersonal

* Retorna el personal ordenado por servicios completados descendente.
* Incluye promedio de días por servicio para evaluar eficiencia.

```javascript
const rankingPersonal = async () => {
  const [rows] = await pool.execute(
    `SELECT p.id, p.nombre, p.cargo, p.especialidad,
            COUNT(hs.id) AS servicios_completados,
            AVG(hs.duracion_dias) AS promedio_dias
     FROM personal p
     LEFT JOIN historial_servicios hs ON hs.personal_id = p.id
       AND hs.status_final = 'Completado'
     GROUP BY p.id
     ORDER BY servicios_completados DESC`
  );
  return rows;
};
```

### Endpoint

#### Response

```json
    {
        "id": 1,
        "nombre": "Gabriel",
        "cargo": "supervisor",
        "especialidad": "Mantenimiento",
        "servicios_completados": 500,
        "promedio_dias": "2.0000"
    },
    {
        "id": 2,
        "nombre": "Jorge",
        "cargo": "Tecnico",
        "especialidad": "Reparacion",
        "servicios_completados": 60,
        "promedio_dias": "1.0000"
    },
    {
        "id": 5,
        "nombre": "Alfredo",
        "cargo": "Carpintero",
        "especialidad": "Mantenimiento",
        "servicios_completados": 0,
        "promedio_dias": null
    }
```

#### Error 500

```json
{
    "message": "Bind parameters must not contain undefined. To pass SQL NULL specify JS null"
}
```
