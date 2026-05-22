const servicioRepo    = require('../repository/servicioQuerys');
const seguimientoRepo = require('../repository/seguimientoQuerys');
const pool            = require('../database/conexionBD');
const personalModule  = require('../modules/personalModule');

// Librerías para manejo de tiempo
const dayjs    = require('dayjs');
const timezone = require('dayjs/plugin/timezone');
const utc      = require('dayjs/plugin/utc');
dayjs.extend(utc);
dayjs.extend(timezone);

// Zona horaria del proyecto
const TZ = 'America/Hermosillo';

// Valores válidos para validaciones
const VALID_STATUS    = ['Pendiente', 'En progreso', 'Completado'];
const VALID_PRIORIDAD = ['baja', 'media', 'alta'];

//#region ── CRUD SERVICIOS ────────────────────────────────────────

/**
 * Retorna todos los servicios con datos del solicitante y técnico asignado.
 * @returns {Promise<object[]>}
 */
const getAll = async () => servicioRepo.getAll();

/**
 * Retorna un servicio por su ID.
 * @param {number} id
 * @returns {Promise<object>}
 * @throws {{ status: 404 }} Si no se encuentra
 */
const getById = async (id) => {
  const s = await servicioRepo.getById(id);
  if (!s) throw { status: 404, message: 'Servicio no encontrado' };
  return s;
};

/**
 * Crea un nuevo servicio con las siguientes validaciones previas:
 * 1. Verifica que el técnico asignado exista.
 * 2. Verifica que hora_inicio/hora_fin estén dentro del horario laboral del técnico.
 * 3. Verifica que el técnico trabaje el día de la semana solicitado.
 * Genera automáticamente el seguimiento 1:1.
 *
 * @param {{ nombre_servicio: string, solicitante_id: number, personal_id?: number,
 *           tipo_servicio: string, fecha_inicio: string, ubicacion: string,
 *           hora_inicio: string, hora_fin: string, prioridad?: string,
 *           fecha_fin_estimada?: string, observaciones?: string }} data
 * @returns {Promise<object>} Servicio creado + campo validacion_horario
 * @throws {{ status: 400 }} Si las horas del servicio no caben en el horario del técnico
 */
const create = async (data) => {
  try {
    // Solo validar horario si se asignó un técnico
    if (data.personal_id) {
      const personalData = await personalModule.getById(data.personal_id);

      const validacion_horario = verificarHorarioServicio(
        data.hora_inicio,
        data.hora_fin,
        personalData.hora_laboral_inicio,
        personalData.hora_laboral_fin,
        personalData.dias_laborales,
        data.fecha_inicio
      );

      if (!validacion_horario.valido) {
        throw { status: 400, message: validacion_horario.motivo };
      }
    }

    const id = await servicioRepo.create(data);

    // Crear seguimiento ligado automáticamente — relación 1:1
    await seguimientoRepo.create({
      nombre_servicio:    data.nombre_servicio,
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
  } catch (err) {
    throw err;
  }
};

/**
 * Actualiza todos los campos de un servicio.
 * Si cambia personal_id, ajusta contadores servicios_activos.
 * Si cambia hora_inicio/hora_fin, re-valida contra el horario del técnico.
 * @param {number} id
 * @param {object} data
 * @returns {Promise<object>} Servicio actualizado
 * @throws {{ status: 404 }} Si no se encuentra
 * @throws {{ status: 400 }} Si las horas no caben en el horario del técnico
 */
const update = async (id, data) => {
  await getById(id);

  if (data.personal_id) {
    const personalData = await personalModule.getById(data.personal_id);
    const validacion_horario = verificarHorarioServicio(
      data.hora_inicio,
      data.hora_fin,
      personalData.hora_laboral_inicio,
      personalData.hora_laboral_fin,
      personalData.dias_laborales,
      data.fecha_inicio
    );
    if (!validacion_horario.valido) {
      throw { status: 400, message: validacion_horario.motivo };
    }
  }

  await servicioRepo.update(id, data);
  return servicioRepo.getById(id);
};

/**
 * Elimina un servicio. Revierte contadores y libera utensilios si no estaba completado.
 * @param {number} id
 * @throws {{ status: 404 }} Si no se encuentra
 */
const remove = async (id) => {
  await getById(id);
  return servicioRepo.remove(id);
};

//#endregion

//#region ── CAMBIOS DE ESTADO ─────────────────────────────────────

/**
 * Completa un servicio: registra fecha_fin, guarda en historial_servicios,
 * decrementa contadores y libera los utensilios asignados.
 * @param {number} id
 * @param {{ fecha_fin: string, notas?: string }} param1
 * @returns {Promise<{ message: string }>}
 */
const completar = async (id, { fecha_fin, notas }) => {
  return servicioRepo.completar(id, fecha_fin, notas);
};

/**
 * Cambia el status del servicio con la siguiente lógica:
 * - Si el servicio está 'Completado' y se pide 'Pendiente' o 'En progreso':
 *   ejecuta revertirCompletado() que restaura contadores, utensilios e historial.
 * - Si el servicio está activo (Pendiente/En progreso):
 *   hace un UPDATE simple sin afectar contadores.
 * - No permite cambiar a 'Completado' desde aquí — usar completar().
 *
 * BUG FIX: la versión original usaba `conn` sin definir y llamaba
 * repo.cambiarStatus() que no existía. Ahora delega correctamente al repo.
 *
 * @param {number} id
 * @param {string} status - 'Pendiente' | 'En progreso'
 * @returns {Promise<object>} Servicio actualizado
 * @throws {{ status: 400 }} Si el status no es válido o intenta completar desde aquí
 * @throws {{ status: 404 }} Si no se encuentra
 */
const cambiarStatus = async (id, status) => {
  if (!VALID_STATUS.includes(status))
    throw { status: 400, message: `Status inválido. Valores permitidos: ${VALID_STATUS.join(', ')}` };

  if (status === 'Completado')
    throw { status: 400, message: 'Para completar un servicio usa PATCH /servicios/:id/completar (requiere fecha_fin).' };

  const servicio = await getById(id);

  if (servicio.status === 'Completado') {
    // Revertir completado — restaura contadores, utensilios e historial
    await servicioRepo.revertirCompletado(id, status);
  } else {
    // Cambio simple entre Pendiente ↔ En progreso
    await servicioRepo.cambiarStatusActivo(id, status);
  }

  return servicioRepo.getById(id);
};

/**
 * Cambia la prioridad del servicio sin afectar otros campos.
 * @param {number} id
 * @param {string} prioridad - 'baja' | 'media' | 'alta'
 * @returns {Promise<object>} Servicio actualizado
 * @throws {{ status: 400 }} Si la prioridad no es válida
 */
const cambiarPrioridad = async (id, prioridad) => {
  if (!VALID_PRIORIDAD.includes(prioridad))
    throw { status: 400, message: `Prioridad inválida. Valores permitidos: ${VALID_PRIORIDAD.join(', ')}` };

  await getById(id);
  await pool.execute(`UPDATE servicios SET prioridad = ? WHERE id = ?`, [prioridad, id]);
  return servicioRepo.getById(id);
};

//#endregion

//#region ── UTENSILIOS DEL SERVICIO ──────────────────────────────

/**
 * Retorna los utensilios asignados a un servicio.
 * @param {number} servicio_id
 * @returns {Promise<object[]>}
 */
const getUtensilios = (servicio_id) => servicioRepo.getUtensilios(servicio_id);

/**
 * Asigna un utensilio al servicio.
 * Cambia status_utensilio a 'En uso' y asigna operador_id.
 * @param {number} servicio_id
 * @param {number} utensilio_id
 * @throws {{ status: 409 }} Si el utensilio no está disponible
 */
const addUtensilio = (servicio_id, utensilio_id) =>
  servicioRepo.addUtensilio(servicio_id, utensilio_id);

/**
 * Desasigna un utensilio del servicio y lo regresa a 'Disponible'.
 * @param {number} servicio_id
 * @param {number} utensilio_id
 */
const removeUtensilio = (servicio_id, utensilio_id) =>
  servicioRepo.removeUtensilio(servicio_id, utensilio_id);

//#endregion

//#region ── EVIDENCIAS (Base64) ───────────────────────────────────

// Tipos MIME aceptados para las imágenes de evidencia
const VALID_MIME = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Guarda una imagen de evidencia en Base64.
 * Valida el tipo MIME y el tamaño máximo (~5 MB).
 * @param {number}           servicio_id
 * @param {'inicio'|'fin'}   tipo
 * @param {string}           base64Data - 'data:image/jpeg;base64,...'
 * @throws {{ status: 400 }} Si el MIME no es válido o supera 5 MB
 */
const addEvidencia = async (servicio_id, tipo, base64Data) => {
  await getById(servicio_id);

  const mimeMatch = base64Data.match(/^data:([^;]+);base64,/);
  if (!mimeMatch || !VALID_MIME.includes(mimeMatch[1]))
    throw { status: 400, message: 'Formato de imagen no válido. Usa JPEG, PNG o WEBP.' };

  // ~5 MB en base64 ≈ 6.7M caracteres — margen de seguridad a 7M
  if (base64Data.length > 7_000_000)
    throw { status: 400, message: 'La imagen supera el tamaño máximo permitido (5 MB).' };

  await pool.execute(
    `INSERT INTO evidencia (servicio_id, tipo, url_image) VALUES (?, ?, ?)`,
    [servicio_id, tipo, base64Data]
  );
};

/**
 * Retorna todas las evidencias de un servicio, ordenadas por tipo y fecha.
 * @param {number} servicio_id
 * @returns {Promise<object[]>}
 */
const getEvidencias = async (servicio_id) => {
  await getById(servicio_id);
  const [rows] = await pool.execute(
    `SELECT id, servicio_id, tipo, url_image, created_at
     FROM evidencia WHERE servicio_id = ? ORDER BY tipo, created_at`,
    [servicio_id]
  );
  return rows;
};

/**
 * Elimina una evidencia por su ID.
 * @param {number} evidencia_id
 * @throws {{ status: 404 }} Si no se encuentra
 */
const deleteEvidencia = async (evidencia_id) => {
  const [result] = await pool.execute(
    `DELETE FROM evidencia WHERE id = ?`, [evidencia_id]
  );
  if (!result.affectedRows) throw { status: 404, message: 'Evidencia no encontrada' };
};

//#endregion

//#region ── HORARIO Y DISPONIBILIDAD ─────────────────────────────

/**
 * Verifica si las horas de un servicio caben dentro del horario laboral del técnico
 * y si el técnico trabaja el día de la semana de la fecha solicitada.
 *
 * BUG FIX: la versión original usaba `&` (bitwise AND) en lugar de `&&` (logical AND),
 * lo que causaba resultados incorrectos en la comparación de horas.
 *
 * @param {string} hora_inicio          - 'HH:MM' o 'HH:MM:SS' — hora inicio del servicio
 * @param {string} hora_fin             - 'HH:MM' o 'HH:MM:SS' — hora fin del servicio
 * @param {string} hora_laboral_inicio  - 'HH:MM:SS' — inicio del turno del técnico
 * @param {string} hora_laboral_fin     - 'HH:MM:SS' — fin del turno del técnico
 * @param {string} dias_laborales       - CSV de días '1,2,3,4,5' (0=Dom … 6=Sáb)
 * @param {string} fecha_inicio         - 'YYYY-MM-DD' — fecha del servicio para validar el día
 * @returns {{ valido: boolean, motivo: string|null }}
 */
const verificarHorarioServicio = (hora_inicio, hora_fin, hora_laboral_inicio,
                                   hora_laboral_fin, dias_laborales, fecha_inicio) => {
  // Validar que hora_inicio sea menor que hora_fin
  if (hora_inicio >= hora_fin) {
    return { valido: false, motivo: 'hora_inicio debe ser menor que hora_fin' };
  }

  // Verificar que el técnico trabaje ese día de la semana
  const diaSemana = dayjs(fecha_inicio).tz(TZ).day(); // 0=Dom … 6=Sáb
  const diasLaborales = dias_laborales.split(',').map(Number);

  if (!diasLaborales.includes(diaSemana)) {
    return {
      valido: false,
      motivo: `El técnico no trabaja el día ${['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][diaSemana]} (días laborales: ${dias_laborales})`,
    };
  }

  // Verificar que las horas del servicio queden dentro del horario del técnico
  // BUG FIX: `&` → `&&`
  const dentroDeHorario = hora_laboral_inicio <= hora_inicio &&
                          hora_laboral_fin    >= hora_fin;

  if (!dentroDeHorario) {
    return {
      valido: false,
      motivo: `El horario del servicio (${hora_inicio}–${hora_fin}) no está dentro del horario laboral del técnico (${hora_laboral_inicio}–${hora_laboral_fin})`,
    };
  }

  return { valido: true, motivo: null };
};

/**
 * Retorna el personal disponible para un rango horario y día de semana específicos.
 * Útil para que el frontend muestre solo técnicos válidos al crear un servicio.
 *
 * @param {string} hora_inicio  - 'HH:MM:SS'
 * @param {string} hora_fin     - 'HH:MM:SS'
 * @param {string} fecha        - 'YYYY-MM-DD' — se extrae el día de la semana
 * @returns {Promise<object[]>} Personal disponible con campo enHorarioLaboral
 */
const getPersonalDisponible = async (hora_inicio, hora_fin, fecha) => {
  const diaSemana = dayjs(fecha).tz(TZ).day();
  const personal  = await servicioRepo.getPersonalDisponible(hora_inicio, hora_fin, diaSemana);

  // Añadir campo enHorarioLaboral (si están laborando en este momento)
  return Promise.all(
    personal.map(async (p) => {
      const enHorarioLaboral = await personalModule.validarHorarioLaboral(p);
      return { ...p, enHorarioLaboral };
    })
  );
};

//#endregion

//#region ── CONTEO REGRESIVO ─────────────────────────────────────

/**
 * Calcula los segundos restantes del servicio en curso (hora_fin - ahora).
 * El frontend convierte los segundos a HH:MM:SS para el conteo regresivo visual.
 *
 * Lógica:
 * - Si el servicio está 'Completado' → retorna 0 (ya terminó).
 * - Si la hora actual es antes de hora_inicio → retorna los segundos hasta hora_fin
 *   (el servicio aún no empezó pero se calcula desde el inicio para dar contexto).
 * - Si la hora actual es después de hora_fin → retorna 0 (expirado).
 * - Si estamos entre hora_inicio y hora_fin → retorna segundos restantes hasta hora_fin.
 *
 * @param {number} id - ID del servicio
 * @returns {Promise<{ segundos_restantes: number, estado: string }>}
 *   estado: 'en_curso' | 'no_iniciado' | 'expirado' | 'completado'
 * @throws {{ status: 404 }} Si no se encuentra
 */
const getTiempoRestante = async (id) => {
  const servicio = await getById(id);

  // Servicio ya completado formalmente
  if (servicio.status === 'Completado') {
    return { segundos_restantes: 0, estado: 'completado' };
  }

  // Construir datetimes combinando fecha_inicio con hora_inicio/hora_fin
  const fechaBase = dayjs(servicio.fecha_inicio).tz(TZ).format('YYYY-MM-DD');
  const ahora     = dayjs().tz(TZ);
  const horaFin   = dayjs.tz(`${fechaBase}T${servicio.hora_fin}`, TZ);
  const horaInic  = dayjs.tz(`${fechaBase}T${servicio.hora_inicio}`, TZ);

  // Hora de fin ya pasó
  if (ahora.isAfter(horaFin)) {
    return { segundos_restantes: 0, estado: 'expirado' };
  }

  // Todavía no empieza — devolver segundos desde ahora hasta hora_fin
  // para que el frontend tenga referencia del total
  if (ahora.isBefore(horaInic)) {
    const segundos = horaFin.diff(ahora, 'second');
    return { segundos_restantes: segundos, estado: 'no_iniciado' };
  }

  // En curso — segundos restantes hasta hora_fin
  const segundos = horaFin.diff(ahora, 'second');
  return { segundos_restantes: segundos, estado: 'en_curso' };
};

//#endregion

module.exports = {
  getAll, getById, create, update, completar, remove,
  cambiarStatus, cambiarPrioridad,
  getUtensilios, addUtensilio, removeUtensilio,
  addEvidencia, getEvidencias, deleteEvidencia,
  verificarHorarioServicio, getPersonalDisponible, getTiempoRestante,
};
