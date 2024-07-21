const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000; // Asegúrate de que tu aplicación escuche en el puerto proporcionado por Render

const pool = new Pool({
  user: 'ualadatabase_user',
  host: 'dpg-cqe4tk9u0jms739528ig-a.oregon-postgres.render.com',
  database: 'ualadatabase',
  password: 'LbNL0slmNjl0SglTHCd8v7AGWNFeSc7R',
  port: 5432,
});

app.use(bodyParser.json());

// Registro de usuario
app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    const result = await pool.query('INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id', [email, hashedPassword]);
    res.status(201).json({ userId: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Inicio de sesión
app.post('/login', async (req, res) => {
  const { email, password, device_ip, device_id } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (isValidPassword) {
        if (!user.device_ip || (user.device_ip === device_ip && user.device_id === device_id)) {
          await pool.query('UPDATE users SET device_ip = $1, device_id = $2 WHERE email = $3', [device_ip, device_id, email]);
          res.status(200).json({ message: 'Login successful' });
        } else {
          res.status(403).json({ error: 'This account is already used on another device' });
        }
      } else {
        res.status(401).json({ error: 'Invalid password' });
      }
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
