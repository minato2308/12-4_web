require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

const app = express();
// Hỗ trợ port của server mạng (process.env.PORT) hoặc 5000 khi chạy ở máy
const port = process.env.PORT || 5000;

app.use(cors({
    origin: [
        'https://foursaliensweb.netlify.app', 
        'http://localhost:5173',
        // 'https://link-web-nhac-cua-ong.netlify.app' // 🟢 CHÚ Ý: Sau này up web_nhac lên Netlify, nhớ bỏ dấu // và dán link vào đây nha!
    ], 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));
app.use(express.json()); 

// ==========================================
// 1. CẤU HÌNH CLOUDINARY
// ==========================================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'class_memories', 
    allowedFormats: ['jpg', 'png', 'jpeg', 'webp'],
  },
});
const upload = multer({ storage: storage });

// ==========================================
// 2. CẤU HÌNH MYSQL TRÊN MÂY (AIVEN)
// ==========================================
const db = mysql.createConnection({
  host: 'minato7-thanhphat792k6-66fe.k.aivencloud.com', 
  port: 19567,            
  user: 'avnadmin',
  password: process.env.DB_PASSWORD,
  database: 'defaultdb',
  ssl: { rejectUnauthorized: false } 
});

db.connect((err) => {
  if (err) return console.error('Lỗi DB:', err);
  console.log('Đã kết nối thành công tới Database Aiven trên mây! ☁️');
});

// ==========================================
// 3. API CHO WEB GỐC (FOUR'S ALIENS)
// ==========================================
app.get('/api/memories', (req, res) => {
  const sql = 'SELECT * FROM memories ORDER BY created_at DESC';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.get('/api/feedbacks', (req, res) => {
    const sql = 'SELECT * FROM feedbacks ORDER BY created_at DESC';
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Lỗi lấy góp ý:", err);
            return res.status(500).json({ error: 'Lỗi server' });
        }
        res.json(results);
    });
});

app.post('/api/feedbacks', (req, res) => {
    const { name, content } = req.body;
    
    if (!name || !content) {
        return res.status(400).json({ error: 'Ê, chưa nhập tên hoặc nội dung kìa!' });
    }

    const sql = 'INSERT INTO feedbacks (name, content) VALUES (?, ?)';
    db.query(sql, [name, content], (err, result) => {
        if (err) {
            console.error("Lỗi lưu góp ý:", err);
            return res.status(500).json({ error: 'Lỗi server' });
        }
        res.json({ message: 'Gửi thành công!', id: result.insertId });
    });
});

app.post('/api/memories', upload.single('imageFile'), (req, res) => {
  const { category } = req.body;

  if (!req.file || !category) {
    return res.status(400).json({ error: 'Thiếu file ảnh hoặc tên thư mục' });
  }

  const url = req.file.path;
  const sql = 'INSERT INTO memories (type, category, url) VALUES (?, ?, ?)';
  db.query(sql, ['photo', category, url], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: 'Upload thành công!', id: result.insertId });
  });
});

// ==========================================
// 4. API CHO WEB NHẠC (BẢN NHÂN BẢN - ĐUÔI _2) 🟢
// ==========================================
app.get('/api/memories_2', (req, res) => {
  const sql = 'SELECT * FROM memories_2 ORDER BY created_at DESC';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.get('/api/feedbacks_2', (req, res) => {
    const sql = 'SELECT * FROM feedbacks_2 ORDER BY created_at DESC';
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Lỗi lấy góp ý web nhạc:", err);
            return res.status(500).json({ error: 'Lỗi server' });
        }
        res.json(results);
    });
});

app.post('/api/feedbacks_2', (req, res) => {
    const { name, content } = req.body;
    
    if (!name || !content) {
        return res.status(400).json({ error: 'Thiếu tên hoặc nội dung nha!' });
    }

    const sql = 'INSERT INTO feedbacks_2 (name, content) VALUES (?, ?)';
    db.query(sql, [name, content], (err, result) => {
        if (err) {
            console.error("Lỗi lưu góp ý web nhạc:", err);
            return res.status(500).json({ error: 'Lỗi server' });
        }
        res.json({ message: 'Gửi thành công!', id: result.insertId });
    });
});

app.post('/api/memories_2', upload.single('imageFile'), (req, res) => {
  const { category, musicLink } = req.body; // 🟢 THÊM musicLink vào đây

  if (!req.file || !category) {
    return res.status(400).json({ error: 'Thiếu file ảnh hoặc tên thư mục' });
  }

  const url = req.file.path;
  // 🟢 Sửa câu SQL để nhét thêm cột music_link
  const sql = 'INSERT INTO memories_2 (type, category, url, music_link) VALUES (?, ?, ?, ?)';
  
  db.query(sql, ['photo', category, url, musicLink || null], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: 'Upload thành công!', id: result.insertId });
  });
});

app.listen(port, () => {
  console.log(`Server Backend đang chạy tại port ${port}`);
});