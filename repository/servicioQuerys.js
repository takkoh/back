const pool = require('../database/conexionBD');

//#region ── CONSULTAS DE SERVICIOS ───────────────────────────────

/**
 * Retorna todos los servicios con datos del solicitante y técnico asignado,
 * ordenados por fecha de inicio descendente.
 * @returns {Promise<object[]>}
 */
const getAll = async () => {
  const [rows] = await pool.execute(
    `SELECT s.*,
            sol.nombre_area, sol.nombre_contacto, sol.telefono, sol.email,
            p.nombre AS nombre_personal
     FROM servicios s
     JOIN solicitantes sol ON sol.id = s.solicitante_id
     LEFT JOIN personal p  ON p.id  = s.personal_id
     ORDER BY s.fecha_inicio DESC`
  );
  return rows;
};

/**
 * Busca un servicio por su ID con datos del solicitante y técnico.
 * @param {number} id
 * @returns {Promise<object|null>}
 */
const getById = async (id) => {
  const [rows] = await pool.execute(
    `SELECT s.*,
            sol.nombre_area, sol.nombre_contacto, sol.telefono, sol.email,
            p.nombre AS nombre_personal
     FROM servicios s
     JOIN solicitantes sol ON sol.id = s.solicitante_id
     LEFT JOIN personal p  ON p.id  = s.personal_id
     WHERE s.id = ?`,
    [id]
  );
  return rows[0] || null;
};

//#endregion

//#region ── OPERACIONES DE ESCRITURA ─────────────────────────────

/**
 * Inserta un nuevo servicio en una transacción que también incrementa los contadores:
 * - solicitante.servicios_activos + 1
 * - personal.servicios_activos   + 1 (si se asignó técnico)
 * @param {{ nombre_servicio: string, solicitante_id: number, personal_id?: number, tipo_servicio: string, fecha_inicio: string, ubicacion: string, hora_inicio: string, hora_fin: string, prioridad?: string }} param0
 * @returns {Promise<number>} ID del servicio creado
 */
const create = async ({ nombre_servicio, solicitante_id, personal_id, tipo_servicio,
                        fecha_inicio, fecha_fin, status, ubicacion,
                        hora_inicio, hora_fin, prioridad }) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.execute(
      `INSERT INTO servicios
         (nombre_servicio, solicitante_id, personal_id, tipo_servicio,
          fecha_inicio, fecha_fin, status, ubicacion, hora_inicio, hora_fin, prioridad)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombre_servicio, solicitante_id, personal_id || null, tipo_servicio,
       fecha_inicio, fecha_fin || null, status || 'Pendiente',
       ubicacion, hora_inicio, hora_fin, prioridad || 'media']
    );

    // Incrementar servicios activos del área solicitante
    await conn.execute(
      `UPDATE solicitantes SET servicios_activos = servicios_activos + 1 WHERE id = ?`,
      [solicitante_id]
    );

    // Incrementar servicios activos del técnico asignado (si hay)
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

/**
 * Actualiza todos los campos de un servicio.
 * Si cambia el personal_id y el servicio no está completado,
 * ajusta los contadores servicios_activos del técnico anterior y el nuevo.
 * @param {number} id
 * @param {object} fields
 * @returns {Promise<number>} Filas afectadas
 *
 * BUG CORREGIDO: hora_fin=? faltaba la asignación en la query original.
 */
const update = async (id, fields) => {
  const { nombre_servicio, solicitante_id, personal_id, tipo_servicio,
          fecha_inicio, fecha_fin, status, prioridad,
          ubicacion, hora_inicio, hora_fin } = fields;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.execute(
      `SELECT personal_id, status FROM servicios WHERE id = ?`, [id]
    );
    const actual = rows[0];

    const [result] = await conn.execute(
      `UPDATE servicios
       SET nombre_servicio=?, solicitante_id=?, personal_id=?, tipo_servicio=?,
           fecha_inicio=?, fecha_fin=?, status=?, prioridad=?, ubicacion=?,
           hora_inicio=?, hora_fin=?
       WHERE id = ?`,
      [nombre_servicio, solicitante_id, personal_id || null, tipo_servicio,
       fecha_inicio, fecha_fin || null, status, prioridad,
       ubicacion, hora_inicio, hora_fin, id]
    );

    // Ajustar contadores solo si el servicio sigue activo y cambió el técnico
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

/**
 * Marca el servicio como 'Completado' en una transacción que también:
 * - Decrementa solicitante.servicios_activos y suma total_servicios_completados
 * - Decrementa personal.servicios_activos del técnico asignado
 * - Libera todos los utensilios asignados y marca la pivote como 'Finalizado'
 * - Inserta registro en historial_servicios
 * @param {number}      id
 * @param {string}      fecha_fin
 * @param {string|null} notas
 * @returns {Promise<{ message: string }>}
 */
const completar = async (id, fecha_fin, notas) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.execute(`SELECT * FROM servicios WHERE id = ?`, [id]);
    const servicio = rows[0];
    if (!servicio) throw new Error('Servicio no encontrado');
    if (servicio.status === 'Completado') throw new Error('El servicio ya está completado');

    await conn.execute(
      `UPDATE servicios SET status = 'Completado', fecha_fin = ? WHERE id = ?`,
      [fecha_fin, id]
    );
    await conn.execute(
      `UPDATE solicitantes
       SET servicios_activos = GREATEST(servicios_activos - 1, 0),
           total_servicios_completados = total_servicios_completados + 1
       WHERE id = ?`,
      [servicio.solicitante_id]
    );
    if (servicio.personal_id) {
      await conn.execute(
        `UPDATE personal SET servicios_activos = GREATEST(servicios_activos - 1, 0) WHERE id = ?`,
        [servicio.personal_id]
      );
    }
    await conn.execute(
      `UPDATE utensilios u
       JOIN servicio_utensilios su ON su.utensilio_id = u.id
       SET u.status_utensilio = 'Disponible', u.operador_id = NULL
       WHERE su.servicio_id = ? AND u.status_utensilio = 'En uso'`,
      [id]
    );
    await conn.execute(
      `UPDATE servicio_utensilios SET Status = 'Finalizado' WHERE servicio_id = ?`, [id]
    );
    await conn.execute(
      `INSERT INTO historial_servicios
         (nombre_servicio, servicio_id, solicitante_id, personal_id,
          tipo_hs_servicio, fecha_inicio, fecha_fin, status_final, notas)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Completado', ?)`,
      [servicio.nombre_servicio, servicio.id, servicio.solicitante_id,
       servicio.personal_id, servicio.tipo_servicio,
       servicio.fecha_inicio, fecha_fin, notas || null]
    );

    await conn.commit();
    return { message: 'Servicio completado y registrado en historial' };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

/**
 * Revierte un servicio de 'Completado' a 'En progreso' o 'Pendiente'.
 * Restaura contadores del solicitante, personal y utensilios,
 * y elimina el registro del historial asociado.
 *
 * BUG FIX: la función original usaba `conn` sin definir y llamaba
 * repo.cambiarStatus() que no existía en este archivo.
 *
 * @param {number} id     - ID del servicio
 * @param {string} status - 'En progreso' | 'Pendiente'
 * @returns {Promise<true>}
 */
const revertirCompletado = async (id, status) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.execute(`SELECT * FROM servicios WHERE id = ?`, [id]);
    const servicio = rows[0];
    if (!servicio) throw new Error('Servicio no encontrado');

    // Limpiar fecha_fin al revertir
    await conn.execute(
      `UPDATE servicios SET status = ?, fecha_fin = NULL WHERE id = ?`,
      [status, id]
    );
    await conn.execute(
      `UPDATE solicitantes
       SET servicios_activos = servicios_activos + 1,
           total_servicios_completados = GREATEST(total_servicios_completados - 1, 0)
       WHERE id = ?`,
      [servicio.solicitante_id]
    );
    if (servicio.personal_id) {
      await conn.execute(
        `UPDATE personal SET servicios_activos = servicios_activos + 1 WHERE id = ?`,
        [servicio.personal_id]
      );
    }
    // Restaurar utensilios que estaban finalizados
    await conn.execute(
      `UPDATE utensilios u
       JOIN servicio_utensilios su ON su.utensilio_id = u.id
       SET u.status_utensilio = 'En uso',
           u.operador_id = ?,
           u.solicitante_id = ?
       WHERE su.servicio_id = ? AND su.Status = 'Finalizado'`,
      [servicio.personal_id, servicio.solicitante_id, id]
    );
    await conn.execute(
      `UPDATE servicio_utensilios SET Status = 'En uso'
       WHERE servicio_id = ? AND Status = 'Finalizado'`,
      [id]
    );
    // Eliminar del historial (ya no está completado)
    await conn.execute(
      `DELETE FROM historial_servicios WHERE servicio_id = ?`, [id]
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

/**
 * Cambia el status de un servicio activo (Pendiente ↔ En progreso).
 * Solo para servicios NO completados — los completados usan revertirCompletado().
 * @param {number} id
 * @param {string} status - 'Pendiente' | 'En progreso'
 * @returns {Promise<number>} Filas afectadas
 */
const cambiarStatusActivo = async (id, status) => {
  const [result] = await pool.execute(
    `UPDATE servicios SET status = ? WHERE id = ?`, [status, id]
  );
  return result.affectedRows;
};

/**
 * Elimina un servicio. Si no estaba completado revierte contadores y libera utensilios.
 * @param {number} id
 * @returns {Promise<number>} Filas afectadas
 */
const remove = async (id) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.execute(`SELECT * FROM servicios WHERE id = ?`, [id]);
    const servicio = rows[0];
    if (!servicio) throw new Error('Servicio no encontrado');

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

//#endregion

//#region ── UTENSILIOS DEL SERVICIO ──────────────────────────────

/**
 * Retorna los utensilios asignados a un servicio con su status de asignación.
 * @param {number} servicio_id
 * @returns {Promise<object[]>}
 */
const getUtensilios = async (servicio_id) => {
  const [rows] = await pool.execute(
    `SELECT u.*, su.Status AS status_asignacion
     FROM utensilios u
     JOIN servicio_utensilios su ON su.utensilio_id = u.id
     WHERE su.servicio_id = ?`,
    [servicio_id]
  );
  return rows;
};

/**
 * Asigna un utensilio al servicio validando su disponibilidad.
 * @param {number} servicio_id
 * @param {number} utensilio_id
 * @throws {{ status: 409 }} Si el utensilio no está disponible
 */
const addUtensilio = async (servicio_id, utensilio_id) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [check] = await conn.execute(
      `SELECT status_utensilio FROM utensilios WHERE id = ?`, [utensilio_id]
    );
    if (check[0]?.status_utensilio === 'En uso')
      throw { status: 409, message: 'El utensilio ya está en uso en otro servicio' };
    if (check[0]?.status_utensilio === 'Mantenimiento')
      throw { status: 409, message: 'El utensilio está en mantenimiento y no puede asignarse' };

    await conn.execute(
      `INSERT IGNORE INTO servicio_utensilios (servicio_id, utensilio_id) VALUES (?, ?)`,
      [servicio_id, utensilio_id]
    );
    const [svcRows] = await conn.execute(
      `SELECT personal_id FROM servicios WHERE id = ?`, [servicio_id]
    );
    const operador_id = svcRows[0]?.personal_id || null;
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

/**
 * Desasigna un utensilio del servicio y lo regresa a 'Disponible'.
 * @param {number} servicio_id
 * @param {number} utensilio_id
 */
const removeUtensilio = async (servicio_id, utensilio_id) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(
      `DELETE FROM servicio_utensilios WHERE servicio_id=? AND utensilio_id=?`,
      [servicio_id, utensilio_id]
    );
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

//#endregion

//#region ── PERSONAL DISPONIBLE POR HORARIO ──────────────────────

/**
 * Retorna el personal cuyo horario laboral cubre completamente
 * el rango hora_inicio–hora_fin solicitado Y que trabaja en el día indicado.
 * Usado para sugerir técnicos válidos al crear o editar un servicio.
 *
 * @param {string} hora_inicio - 'HH:MM:SS' hora inicio del servicio
 * @param {string} hora_fin    - 'HH:MM:SS' hora fin del servicio
 * @param {number} dia_semana  - 0=Dom, 1=Lun … 6=Sáb
 * @returns {Promise<object[]>} Personal disponible con datos completos
 */
const getPersonalDisponible = async (hora_inicio, hora_fin, dia_semana) => {
  // Filtrar por rango horario en SQL (más eficiente)
  const [rows] = await pool.execute(
    `SELECT * FROM personal
     WHERE hora_laboral_inicio <= ?
       AND hora_laboral_fin    >= ?
     ORDER BY nombre`,
    [hora_inicio, hora_fin]
  );

  // Filtrar por día laboral en JS (dias_laborales es CSV: '1,2,3,4,5')
  return rows.filter(p => {
    const dias = p.dias_laborales.split(',').map(Number);
    return dias.includes(Number(dia_semana));
  });
};

//#endregion

module.exports = {
  getAll, getById,
  create, update, completar, revertirCompletado, cambiarStatusActivo, remove,
  getUtensilios, addUtensilio, removeUtensilio,
  getPersonalDisponible,
};
