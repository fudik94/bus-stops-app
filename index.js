const express = require('express');
const mysql = require('mysql2');

const app = express();
const PORT = 3000;

const path = require('path');
app.use(express.static(path.join(__dirname)));

// Настройки подключения к MySQL:
const connection = mysql.createConnection({
  host: process.env.HOST,
  user: process.env.USER,
  password: process.env.PASSWORD,
  database: process.env.DATABASE
});


// Получить все районы
app.get('/zones', (req, res) => {
  connection.query('SELECT DISTINCT zone_name FROM fuad_stops WHERE zone_name IS NOT NULL AND zone_name != ""', (error, results) => {
    if (error) {
      return res.status(500).send('Ошибка запроса к базе');
    }
    res.json(results.map(row => row.zone_name));
  });
});

// Получить все остановки выбранного района
app.get('/stops', (req, res) => {
  const zone = req.query.zone_name;
  if (!zone) return res.status(400).send('Укажите параметр zone_name');
  connection.query(
    'SELECT stop_id, stop_name FROM fuad_stops WHERE zone_name = ?',
    [zone],
    (error, results) => {
      if (error) return res.status(500).send('Ошибка при запросе к базе данных');
      res.json(results);
    }
  );
});

// Получить список всех уникальных "городов" (authority)
app.get('/cities', (req, res) => {
  connection.query(
    'SELECT DISTINCT authority FROM fuad_stops WHERE authority IS NOT NULL AND authority != ""',
    (error, results) => {
      if (error) return res.status(500).send('Ошибка при запросе к базе данных');
      res.json(results.map(row => row.authority));
    }
  );
});

// Получить остановки конкретного "города"/authority
app.get('/stops_by_city', (req, res) => {
  const city = req.query.city_name;
  if (!city) return res.status(400).send('Укажите параметр city_name');
  connection.query(
    'SELECT stop_id, stop_name FROM fuad_stops WHERE authority = ?',
    [city],
    (error, results) => {
      if (error) return res.status(500).send('Ошибка при запросе к базе данных');
      res.json(results);
    }
  );
});

// Получить автобусы для остановки
app.get('/buses', (req, res) => {
  const stop_id = req.query.stop_id;
  if (!stop_id) return res.status(400).send('Укажите параметр stop_id');
  connection.query(
    `SELECT DISTINCT r.route_short_name
     FROM fuad_stop_times st
     JOIN fuad_trips t ON st.trip_id = t.trip_id
     JOIN fuad_routes r ON t.route_id = r.route_id
     WHERE st.stop_id = ?
     ORDER BY r.route_short_name ASC`,
    [stop_id],
    (error, results) => {
      if (error) return res.status(500).send('Ошибка при запросе к базе данных');
      res.json(results.map(r => r.route_short_name));
    }
  );
});

// Получить ближайшие времена прибытия автобуса на остановку
app.get('/arrivals', (req, res) => {
  const stop_id = req.query.stop_id;
  const bus_number = req.query.bus_number;
  if (!stop_id || !bus_number) return res.status(400).send('Укажите stop_id и bus_number');
  
  connection.query(
    `SELECT st.arrival_time
     FROM fuad_stop_times st
     JOIN fuad_trips t ON st.trip_id = t.trip_id
     JOIN fuad_routes r ON t.route_id = r.route_id
     WHERE st.stop_id = ? AND r.route_short_name = ?
     ORDER BY st.arrival_time ASC
     LIMIT 5`,
    [stop_id, bus_number],
    (error, results) => {
      if (error) return res.status(500).send('Ошибка при запросе к базе данных');
      res.json(results.map(r => r.arrival_time));
    }
  );
});

// Запуск сервера — ДОЛЖЕН БЫТЬ В КОНЦЕ!
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);

});
