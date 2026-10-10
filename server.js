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
    origin: 'https://foursaliensweb.netlify.app', // Cấp quyền cho web giao diện của ông
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));
app.use(express.json()); 

// ==========================================
// 1. CẤU HÌNH CLOUDINARY (Lấy ở Bước 1)
// ==========================================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'class_memories', // Tự tạo thư mục tên này trên Cloudinary
    allowedFormats: ['jpg', 'png', 'jpeg', 'webp'],
  },
});
const upload = multer({ storage: storage });

// ==========================================
// 2. CẤU HÌNH MYSQL TRÊN MÂY (AIVEN)
// ==========================================
const db = mysql.createConnection({
  host: 'minato7-thanhphat792k6-66fe.k.aivencloud.com', // BÊ NGUYÊN CÁI LINK HOST CỦA AIVEN BỎ VÀO ĐÂY
  port: 19567,            // CỔNG PORT CỦA AIVEN
  user: 'avnadmin',
  password: process.env.DB_PASSWORD,
  database: 'defaultdb',
  ssl: { rejectUnauthorized: false } // Dòng này bắt buộc phải có để Aiven cho kết nối
});

db.connect((err) => {
  if (err) return console.error('Lỗi DB:', err);
  console.log('Đã kết nối thành công tới Database Aiven trên mây! ☁️');
});

// ==========================================
// 3. API NHẬN VÀ GỬI ẢNH
// ==========================================
app.get('/api/memories', (req, res) => {
  const sql = 'SELECT * FROM memories ORDER BY created_at DESC';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post('/api/memories', upload.single('imageFile'), (req, res) => {
  const { category } = req.body;

  if (!req.file || !category) {
    return res.status(400).json({ error: 'Thiếu file ảnh hoặc tên thư mục' });
  }

  // Cloudinary nhận ảnh xong sẽ trả về link xịn qua req.file.path
  const url = req.file.path;

  const sql = 'INSERT INTO memories (type, category, url) VALUES (?, ?, ?)';
  db.query(sql, ['photo', category, url], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: 'Upload thành công!', id: result.insertId });
  });
});

app.listen(port, () => {
  console.log(`Server Backend đang chạy tại port ${port}`);
});