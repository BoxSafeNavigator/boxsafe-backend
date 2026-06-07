const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());

// ── POOL DE CONEXIONES ────────────────────────────────────────────────────────
// Se usa pool en lugar de createConnection para que Railway no tire el servidor
// cuando la conexión MySQL se cierra por inactividad (error 4031).
// El pool crea nuevas conexiones automáticamente cuando las necesita.
const db = mysql.createPool({
  host:              process.env.MYSQLHOST,
  user:              process.env.MYSQLUSER,
  password:          process.env.MYSQLPASSWORD,
  database:          process.env.MYSQLDATABASE,
  port:              process.env.MYSQLPORT,
  waitForConnections: true,
  connectionLimit:   10,
  queueLimit:        0,
  enableKeepAlive:   true,
  keepAliveInitialDelay: 0,
});

// Verificar conexión al arrancar
db.getConnection((err, connection) => {
  if (err) {
    console.log('❌ Error conectando a MySQL:', err.message);
    return;
  }
  console.log('✅ Conectado a MySQL correctamente');
  connection.release();
});

// ── REGISTRO DE USUARIO ───────────────────────────────────────────────────────
app.post('/registro', async (req, res) => {
  const { nombre_usuario, email, contraseña } = req.body;
  const hash = await bcrypt.hash(contraseña, 10);
  const sql = 'INSERT INTO Usuario (nombre_usuario, email, contraseña) VALUES (?, ?, ?)';
  db.query(sql, [nombre_usuario, email, hash], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ mensaje: 'Usuario registrado', id_usuario: result.insertId });
  });
});

// ── LOGIN ─────────────────────────────────────────────────────────────────────
app.post('/login', (req, res) => {
  const { email, contraseña } = req.body;
  const sql = 'SELECT * FROM Usuario WHERE email = ?';
  db.query(sql, [email], async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(401).json({ error: 'Usuario no encontrado' });
    const usuario = results[0];
    const valido = await bcrypt.compare(contraseña, usuario.contraseña);
    if (!valido) return res.status(401).json({ error: 'Contraseña incorrecta' });
    res.json({ mensaje: 'Login exitoso', id_usuario: usuario.id_usuario, nombre: usuario.nombre_usuario });
  });
});

// ── GUARDAR PERFIL DEL PERRO ──────────────────────────────────────────────────
app.post('/perro', (req, res) => {
  const { id_usuario, nombre_perro, edad_perro, sexo } = req.body;
  const sql = 'INSERT INTO Perro (id_usuario, nombre_perro, edad_perro, sexo) VALUES (?, ?, ?, ?)';
  db.query(sql, [id_usuario, nombre_perro, edad_perro, sexo], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ mensaje: 'Perro registrado', id_perro: result.insertId });
  });
});

// ── OBTENER PERFIL DEL PERRO ──────────────────────────────────────────────────
app.get('/perro/:id_usuario', (req, res) => {
  const sql = 'SELECT * FROM Perro WHERE id_usuario = ?';
  db.query(sql, [req.params.id_usuario], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'Perro no encontrado' });
    res.json(results[0]);
  });
});

// ── EDITAR PERFIL DEL PERRO ───────────────────────────────────────────────────
app.put('/perro/:id_usuario', (req, res) => {
  const { nombre_perro, edad_perro, sexo } = req.body;
  const sql = 'UPDATE Perro SET nombre_perro=?, edad_perro=?, sexo=? WHERE id_usuario=?';
  db.query(sql, [nombre_perro, edad_perro, sexo, req.params.id_usuario], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ mensaje: 'Perfil actualizado' });
  });
});

// ── GUARDAR HISTORIAL ─────────────────────────────────────────────────────────
app.post('/historial', (req, res) => {
  const { id_perro, temperatura, bpm, rpm, fecha, hora } = req.body;
  const sql = 'INSERT INTO Historial (id_perro, temperatura, bpm, rpm, fecha, hora) VALUES (?, ?, ?, ?, ?, ?)';
  db.query(sql, [id_perro, temperatura, bpm, rpm, fecha, hora], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ mensaje: 'Historial guardado' });
  });
});

// ── OBTENER HISTORIAL ─────────────────────────────────────────────────────────
app.get('/historial/:id_perro', (req, res) => {
  const sql = 'SELECT * FROM Historial WHERE id_perro = ? ORDER BY fecha DESC, hora DESC';
  db.query(sql, [req.params.id_perro], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// ── RECUPERAR CONTRASEÑA ──────────────────────────────────────────────────────
app.post('/recuperar', (req, res) => {
  const { email } = req.body;
  const sql = 'SELECT * FROM Usuario WHERE email = ?';
  db.query(sql, [email], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'Correo no registrado' });
    res.json({ mensaje: 'Correo encontrado', id_usuario: results[0].id_usuario });
  });
});

// ── RESTABLECER CONTRASEÑA ────────────────────────────────────────────────────
app.put('/restablecer/:id_usuario', async (req, res) => {
  const { contraseña } = req.body;
  const hash = await bcrypt.hash(contraseña, 10);
  const sql = 'UPDATE Usuario SET contraseña = ? WHERE id_usuario = ?';
  db.query(sql, [hash, req.params.id_usuario], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ mensaje: 'Contraseña actualizada' });
  });
});

// ── OBTENER PERFIL DE USUARIO ─────────────────────────────────────────────────
app.get('/usuario/:id_usuario', (req, res) => {
  const sql = 'SELECT id_usuario, nombre_usuario, email FROM Usuario WHERE id_usuario = ?';
  db.query(sql, [req.params.id_usuario], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(results[0]);
  });
});

// ── SERVIDOR ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});