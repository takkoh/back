//#region IMPORTS Y LIBRERIAS
const repo = require('../repository/personalQuerys');
//LIBRERIAS
const dayjs = require('dayjs');
const timezone = require('dayjs/plugin/timezone');
const utc = require('dayjs/plugin/utc');
dayjs.extend(utc);
dayjs.extend(timezone);
//#endregion

//#region ── CRUD PERSONAL ─────────────────────────────────────────

/**
 * Retorna todo el personal técnico registrado.
 * @returns {Promise<object[]>}
 */
  async function getAll() {
    const personal = await repo.getAll();
    // Agregar campo enHorarioLaboral a cada miembro del personal
    const resultados = await Promise.all(personal.map(async (p) => {
      const enHorarioLaboral = await validarHorarioLaboral(p);
      return { ...p, enHorarioLaboral };
    }));
    return resultados;
  }
/**
 * Retorna un miembro del personal por su ID.
 * @param {number} id
 * @returns {Promise<object>}
 * @throws {{ status: 404 }} Si no se encuentra
 */
const getById = async (id) => {
  try {
  const p = await repo.getById(id);
  const validarHorario = await validarHorarioLaboral(p);
  if (!p) throw { status: 404, message: 'Personal no encontrado' };
  return { ...p, enHorarioLaboral: validarHorario };
  } catch (e) {
    console.error('Error en getById:', e);
    throw e;
  }
};

/**
 * Registra un nuevo miembro del personal.
 * @param {{ nombre: string, cargo: string, especialidad: string, telefono: string }} data
 * @returns {Promise<object>} Registro creado
 */
const create = async (data) => {
  const id = await repo.create(data);
  return repo.getById(id);
};

/**
 * Actualiza los datos de un miembro del personal.
 * @param {number} id
 * @param {{ nombre: string, cargo: string, especialidad: string, telefono: string }} data
 * @returns {Promise<object>} Registro actualizado
 * @throws {{ status: 404 }} Si no se encuentra
 */
const update = async (id, data) => {
  await getById(id); // valida existencia antes de actualizar
  await repo.update(id, data);
  return repo.getById(id);
};

/**
 * Elimina un miembro del personal.
 * Verifica que no tenga servicios activos asignados antes de proceder.
 * @param {number} id
 * @throws {{ status: 404 }} Si no se encuentra
 * @throws {{ status: 409 }} Si tiene servicios activos asignados
 */
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

//#endregion

//#region ── SERVICIOS DEL TÉCNICO ────────────────────────────────

/**
 * Retorna todos los servicios asignados a un técnico,
 * ordenados por status (activos primero) y luego por prioridad.
 * @param {number} id - ID del técnico
 * @returns {Promise<object[]>} Lista de servicios con datos del solicitante
 * @throws {{ status: 404 }} Si el técnico no existe
 */
const getServiciosAsignados = async (id) => {
  await getById(id); // valida existencia
  return repo.getServiciosAsignados(id);
};

/**
 * Valida si un técnico está actualmente dentro de su horario laboral.
 * @param {object} p - Datos del personal (debe incluir hora_laboral_inicio, hora_laboral_fin, dias_laborales)
 * @returns {Promise<boolean>} true si está en horario laboral, false si no
 */
async function validarHorarioLaboral(p) {
  const diasLaborales = p.dias_laborales.split(',').map(Number);
  const ahora = dayjs().tz('America/Hermosillo');
  const hoy = ahora.day(); // 0 (Dom) a 6 (Sab)
  if (!diasLaborales.includes(hoy)) {
    return false; // No es día laboral
  }
  const fechaActual = ahora.format('YYYY-MM-DD');
  const inicio = dayjs(`${fechaActual}T${p.hora_laboral_inicio}`);
  const fin = dayjs(`${fechaActual}T${p.hora_laboral_fin}`);
  if (ahora.isBefore(inicio) || ahora.isAfter(fin)) {
    return false;
  }
  return true;
}
//#endregion

module.exports = { getAll, getById, create, update, remove, getServiciosAsignados, validarHorarioLaboral };
