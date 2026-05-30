const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '1234',
  database: 'boxsafe'
});

db.connect((err) => {
  if (err) {
    console.log('Error conectando a MySQL:', err);
    return;
  }
  console.log('✅ Conectado a MySQL correctamente');
});

// ── REGISTRO DE USUARIO ──
app.post('/registro', async (req, res) => {
  const { nombre_usuario, email, contraseña } = req.body;
  const hash = await bcrypt.hash(contraseña, 10);
  const sql = 'INSERT INTO Usuario (nombre_usuario, email, contraseña) VALUES (?, ?, ?)';
  db.query(sql, [nombre_usuario, email, hash], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ mensaje: 'Usuario registrado', id_usuario: result.insertId });
  });
});

// ── LOGIN ──
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

// ── GUARDAR PERFIL DEL PERRO ──
app.post('/perro', (req, res) => {
  const { id_usuario, nombre_perro, edad_perro, sexo } = req.body;
  const sql = 'INSERT INTO Perro (id_usuario, nombre_perro, edad_perro, sexo) VALUES (?, ?, ?, ?)';
  db.query(sql, [id_usuario, nombre_perro, edad_perro, sexo], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ mensaje: 'Perro registrado', id_perro: result.insertId });
  });
});

// ── OBTENER PERFIL DEL PERRO ──
app.get('/perro/:id_usuario', (req, res) => {
  const sql = 'SELECT * FROM Perro WHERE id_usuario = ?';
  db.query(sql, [req.params.id_usuario], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'Perro no encontrado' });
    res.json(results[0]);
  });
});

// ── EDITAR PERFIL DEL PERRO ──
app.put('/perro/:id_usuario', (req, res) => {
  const { nombre_perro, edad_perro, sexo } = req.body;
  const sql = 'UPDATE Perro SET nombre_perro=?, edad_perro=?, sexo=? WHERE id_usuario=?';
  db.query(sql, [nombre_perro, edad_perro, sexo, req.params.id_usuario], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ mensaje: 'Perfil actualizado' });
  });
});

// ── GUARDAR HISTORIAL ──
app.post('/historial', (req, res) => {
  const { id_perro, temperatura, bpm, rpm, fecha, hora } = req.body;
  const sql = 'INSERT INTO Historial (id_perro, temperatura, bpm, rpm, fecha, hora) VALUES (?, ?, ?, ?, ?, ?)';
  db.query(sql, [id_perro, temperatura, bpm, rpm, fecha, hora], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ mensaje: 'Historial guardado' });
  });
});

// ── OBTENER HISTORIAL ──
app.get('/historial/:id_perro', (req, res) => {
  const sql = 'SELECT * FROM Historial WHERE id_perro = ? ORDER BY fecha DESC, hora DESC';
  db.query(sql, [req.params.id_perro], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.listen(3000, () => {
  console.log('🚀 Servidor corriendo en http://localhost:3000');
});