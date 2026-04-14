const pool = require('../config/database');
const path = require('path');

// Helper robusto: obtiene cliente_id del usuario desde el token o desde la BD
const getClienteId = async (usuario) => {
  try {
    // 1. Si ya viene en el token, usarlo directamente
    if (usuario.cliente_id) return usuario.cliente_id;

    // 2. Buscar en la BD por el ID del usuario
    const r = await pool.query(
      'SELECT cliente_id, admin_id FROM usuarios WHERE id=$1',
      [usuario.id]
    );
    if (!r.rows[0]) return null;

    // 3. Si tiene cliente_id directo en la BD
    if (r.rows[0].cliente_id) return r.rows[0].cliente_id;

    // 4. Si es auxiliar, buscar a través de su admin
    if (r.rows[0].admin_id) {
      const admin = await pool.query(
        'SELECT cliente_id FROM usuarios WHERE id=$1',
        [r.rows[0].admin_id]
      );
      if (admin.rows[0]?.cliente_id) return admin.rows[0].cliente_id;
    }

    return null;
  } catch (e) {
    console.warn('getClienteId error:', e.message);
    return null;
  }
};

// ── GET ficha de un paciente ──────────────────────────────────────────────────
const getFicha = async (req, res) => {
  try {
    const { paciente_id } = req.params;
    const clienteId = await getClienteId(req.usuario);

    // Si no tiene cliente_id, devolver null (ficha nueva vacía)
    if (!clienteId) {
      return res.json(null);
    }

    const r = await pool.query(
      `SELECT ft.*, u.nombre as creador_nombre, u.cargo as creador_cargo, u.firma_url as creador_firma
       FROM fichas_tecnicas ft
       LEFT JOIN usuarios u ON ft.creado_por = u.id
       WHERE ft.paciente_id=$1 AND ft.cliente_id=$2
       ORDER BY ft.created_at DESC LIMIT 1`,
      [paciente_id, clienteId]
    );

    if (r.rows.length === 0) return res.json(null);

    const ficha = r.rows[0];

    // Adjuntos
    const adjuntos = await pool.query(
      'SELECT * FROM fichas_adjuntos WHERE ficha_id=$1 ORDER BY created_at DESC',
      [ficha.id]
    );
    ficha.adjuntos = adjuntos.rows;

    res.json(ficha);
  } catch (e) {
    console.error('getFicha error:', e);
    res.status(500).json({ error: e.message });
  }
};

// ── CREAR O ACTUALIZAR ficha ──────────────────────────────────────────────────
const upsertFicha = async (req, res) => {
  try {
    const { paciente_id } = req.params;

    // Obtener cliente_id del usuario
    let clienteIdFinal = await getClienteId(req.usuario);

    // Si aún no hay cliente_id, intentar obtenerlo desde el paciente
    if (!clienteIdFinal) {
      const pac = await pool.query(
        'SELECT cliente_id FROM pacientes WHERE id=$1',
        [paciente_id]
      );
      clienteIdFinal = pac.rows[0]?.cliente_id || null;
    }

    if (!clienteIdFinal) {
      return res.status(400).json({
        error: 'No se pudo determinar la clínica. Por favor cierra sesión y vuelve a entrar.'
      });
    }

    const {
      motivo_ingreso, condicion_llegada, peso_ingreso, temperatura_ingreso,
      vacunas_al_dia, desparasitado, fecha_ultima_desparasitacion, esterilizado,
      enfermedades_previas, cirugias_previas, alergias, medicacion_actual, condiciones_especiales,
      autoriza_cirugia, autoriza_anestesia, autoriza_hospitalizacion,
      autoriza_eutanasia, autoriza_transfusion, observaciones_autorizacion,
      contacto_emergencia_nombre, contacto_emergencia_telefono, contacto_emergencia_relacion,
      tutor_nombre, tutor_documento, tutor_telefono, tutor_email,
      firma_tutor_url, estado, observaciones_generales
    } = req.body;

    // Obtener firma del receptor (usuario actual) desde su perfil
    const receptor = await pool.query(
      'SELECT nombre, cargo, firma_url FROM usuarios WHERE id=$1',
      [req.usuario.id]
    );
    const receptorData = receptor.rows[0] || {};

    // firma_tutor_url puede ser base64 (data:image/png;base64,...) o null
    const firmaGuardar = firma_tutor_url || null;

    // ¿Ya existe ficha para este paciente en este cliente?
    const existe = await pool.query(
      'SELECT id FROM fichas_tecnicas WHERE paciente_id=$1 AND cliente_id=$2 LIMIT 1',
      [paciente_id, clienteIdFinal]
    );

    let ficha;
    if (existe.rows.length > 0) {
      // ── ACTUALIZAR ──
      const fichaId = existe.rows[0].id;
      ficha = await pool.query(
        `UPDATE fichas_tecnicas SET
          motivo_ingreso=$1, condicion_llegada=$2, peso_ingreso=$3, temperatura_ingreso=$4,
          vacunas_al_dia=$5, desparasitado=$6, fecha_ultima_desparasitacion=$7, esterilizado=$8,
          enfermedades_previas=$9, cirugias_previas=$10, alergias=$11,
          medicacion_actual=$12, condiciones_especiales=$13,
          autoriza_cirugia=$14, autoriza_anestesia=$15, autoriza_hospitalizacion=$16,
          autoriza_eutanasia=$17, autoriza_transfusion=$18, observaciones_autorizacion=$19,
          contacto_emergencia_nombre=$20, contacto_emergencia_telefono=$21,
          contacto_emergencia_relacion=$22,
          tutor_nombre=$23, tutor_documento=$24, tutor_telefono=$25, tutor_email=$26,
          firma_tutor_url=$27, firma_receptor_url=$28, receptor_nombre=$29, receptor_cargo=$30,
          estado=$31, observaciones_generales=$32, updated_at=NOW()
         WHERE id=$33 RETURNING *`,
        [
          motivo_ingreso || null,
          condicion_llegada || 'buena',
          peso_ingreso ? parseFloat(peso_ingreso) : null,
          temperatura_ingreso ? parseFloat(temperatura_ingreso) : null,
          vacunas_al_dia === true || vacunas_al_dia === 'true',
          desparasitado === true || desparasitado === 'true',
          fecha_ultima_desparasitacion || null,
          esterilizado === true || esterilizado === 'true',
          enfermedades_previas || null,
          cirugias_previas || null,
          alergias || null,
          medicacion_actual || null,
          condiciones_especiales || null,
          autoriza_cirugia === true || autoriza_cirugia === 'true',
          autoriza_anestesia === true || autoriza_anestesia === 'true',
          autoriza_hospitalizacion === true || autoriza_hospitalizacion === 'true',
          autoriza_eutanasia === true || autoriza_eutanasia === 'true',
          autoriza_transfusion === true || autoriza_transfusion === 'true',
          observaciones_autorizacion || null,
          contacto_emergencia_nombre || null,
          contacto_emergencia_telefono || null,
          contacto_emergencia_relacion || null,
          tutor_nombre || null,
          tutor_documento || null,
          tutor_telefono || null,
          tutor_email || null,
          firmaGuardar,
          receptorData.firma_url || null,
          receptorData.nombre || null,
          receptorData.cargo || null,
          estado || 'borrador',
          observaciones_generales || null,
          fichaId
        ]
      );
    } else {
      // ── INSERTAR ──
      ficha = await pool.query(
        `INSERT INTO fichas_tecnicas (
          paciente_id, cliente_id, creado_por,
          motivo_ingreso, condicion_llegada, peso_ingreso, temperatura_ingreso,
          vacunas_al_dia, desparasitado, fecha_ultima_desparasitacion, esterilizado,
          enfermedades_previas, cirugias_previas, alergias, medicacion_actual, condiciones_especiales,
          autoriza_cirugia, autoriza_anestesia, autoriza_hospitalizacion,
          autoriza_eutanasia, autoriza_transfusion, observaciones_autorizacion,
          contacto_emergencia_nombre, contacto_emergencia_telefono, contacto_emergencia_relacion,
          tutor_nombre, tutor_documento, tutor_telefono, tutor_email,
          firma_tutor_url, firma_receptor_url, receptor_nombre, receptor_cargo,
          estado, observaciones_generales
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
          $17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35
        ) RETURNING *`,
        [
          paciente_id,
          clienteIdFinal,
          req.usuario.id,
          motivo_ingreso || null,
          condicion_llegada || 'buena',
          peso_ingreso ? parseFloat(peso_ingreso) : null,
          temperatura_ingreso ? parseFloat(temperatura_ingreso) : null,
          vacunas_al_dia === true || vacunas_al_dia === 'true',
          desparasitado === true || desparasitado === 'true',
          fecha_ultima_desparasitacion || null,
          esterilizado === true || esterilizado === 'true',
          enfermedades_previas || null,
          cirugias_previas || null,
          alergias || null,
          medicacion_actual || null,
          condiciones_especiales || null,
          autoriza_cirugia === true || autoriza_cirugia === 'true',
          autoriza_anestesia === true || autoriza_anestesia === 'true',
          autoriza_hospitalizacion === true || autoriza_hospitalizacion === 'true',
          autoriza_eutanasia === true || autoriza_eutanasia === 'true',
          autoriza_transfusion === true || autoriza_transfusion === 'true',
          observaciones_autorizacion || null,
          contacto_emergencia_nombre || null,
          contacto_emergencia_telefono || null,
          contacto_emergencia_relacion || null,
          tutor_nombre || null,
          tutor_documento || null,
          tutor_telefono || null,
          tutor_email || null,
          firmaGuardar,
          receptorData.firma_url || null,
          receptorData.nombre || null,
          receptorData.cargo || null,
          estado || 'borrador',
          observaciones_generales || null
        ]
      );
    }

    // Devolver la ficha completa con adjuntos
    const fichaGuardada = ficha.rows[0];
    const adjuntos = await pool.query(
      'SELECT * FROM fichas_adjuntos WHERE ficha_id=$1 ORDER BY created_at DESC',
      [fichaGuardada.id]
    );
    fichaGuardada.adjuntos = adjuntos.rows;

    res.json({ mensaje: '✅ Ficha guardada', ficha: fichaGuardada });
  } catch (e) {
    console.error('upsertFicha error:', e);
    res.status(500).json({ error: e.message });
  }
};

// ── SUBIR DOCUMENTO FIRMADO ───────────────────────────────────────────────────
const subirDocumentoFirmado = async (req, res) => {
  try {
    const { ficha_id } = req.body;
    if (!req.file) return res.status(400).json({ error: 'Sin archivo' });
    const url = `/uploads/${req.file.filename}`;
    await pool.query(
      `UPDATE fichas_tecnicas SET documento_firmado_url=$1, documento_firmado_nombre=$2, estado='firmada' WHERE id=$3`,
      [url, req.file.originalname, ficha_id]
    );
    res.json({ url, mensaje: '✅ Documento firmado subido' });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── SUBIR ADJUNTO GENERAL ─────────────────────────────────────────────────────
const subirAdjunto = async (req, res) => {
  try {
    const { ficha_id, nombre } = req.body;
    if (!req.file) return res.status(400).json({ error: 'Sin archivo' });
    const ext = req.file.originalname.split('.').pop().toLowerCase();
    const tipo = ['pdf'].includes(ext) ? 'pdf'
      : ['jpg','jpeg','png','webp'].includes(ext) ? 'imagen'
      : 'documento';
    const r = await pool.query(
      'INSERT INTO fichas_adjuntos (ficha_id, nombre, archivo_url, tipo) VALUES ($1,$2,$3,$4) RETURNING *',
      [ficha_id, nombre || req.file.originalname, `/uploads/${req.file.filename}`, tipo]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const eliminarAdjunto = async (req, res) => {
  try {
    await pool.query('DELETE FROM fichas_adjuntos WHERE id=$1', [req.params.id]);
    res.json({ mensaje: '✅ Adjunto eliminado' });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── GUARDAR FIRMA DEL USUARIO (su propia firma) ───────────────────────────────
const guardarFirmaUsuario = async (req, res) => {
  try {
    const { firma_url, cargo } = req.body;
    await pool.query(
      'UPDATE usuarios SET firma_url=$1, cargo=$2 WHERE id=$3',
      [firma_url, cargo || null, req.usuario.id]
    );
    res.json({ mensaje: '✅ Firma guardada en tu perfil' });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

module.exports = {
  getFicha,
  upsertFicha,
  subirDocumentoFirmado,
  subirAdjunto,
  eliminarAdjunto,
  guardarFirmaUsuario
};