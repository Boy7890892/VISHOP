const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');

const app = express();
const port = 3000;

app.use(cors());
// DINAINKAN KE 50MB: Agar foto profil high-res dari HP tidak menyebabkan error
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 1. Menggunakan Pool Koneksi MySQL
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',      
    password: '',      
    database: 'vishop_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// 2. Mengecek apakah pool koneksi siap
db.getConnection((err, connection) => {
    if (err) {
        console.error('Yah, Gagal koneksi ke database:', err);
        return;
    }
    console.log('Mantap! Berhasil terhubung ke database MySQL VISHOP.');
    connection.release();
});

// 3. API: Ambil / Cari Produk (Diperbarui untuk mendukung fitur admin & pencarian fleksibel)
app.get('/api/products', (req, res) => {
    const kataKunci = req.query.search; 
    let querySQL = 'SELECT * FROM products';
    let variabelSQL = [];

    if (kataKunci) {
        querySQL += ' WHERE title LIKE ? OR location LIKE ?';
        variabelSQL.push(`%${kataKunci}%`, `%${kataKunci}%`); 
    }
    
    db.query(querySQL, variabelSQL, (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Gagal mengambil data dari database' });
        } else {
            res.json(results);
        }
    });
});

// 4. API: Tambah Produk (Diperbarui agar otomatis mendeteksi kategori status)
app.post('/api/products', (req, res) => {
    let { title, price, discount, location, image, is_new, is_trending } = req.body;
    
    // Pastikan nilai angka aman (jika undefined diubah jadi 0)
    price = Number(price) || 0;
    discount = Number(discount) || 0;
    is_new = is_new ? 1 : 0;
    is_trending = is_trending ? 1 : 0;

    const querySQL = 'INSERT INTO products (title, price, discount, location, image, is_new, is_trending) VALUES (?, ?, ?, ?, ?, ?, ?)';
    
    db.query(querySQL, [title, price, discount, location, image, is_new, is_trending], (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Gagal menambah produk ke database' });
        } else {
            res.json({ message: 'Hore! Produk berhasil ditambahkan!', id: result.insertId });
        }
    });
});

// 5. API: Hapus Produk
app.delete('/api/products/:id', (req, res) => {
    const idProduk = req.params.id;
    const querySQL = 'DELETE FROM products WHERE id = ?';
    
    db.query(querySQL, [idProduk], (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Gagal menghapus produk' });
        } else {
            res.json({ message: 'Sip! Produk berhasil dihapus dari database.' });
        }
    });
});

// 6. API: Login Pengguna
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const querySQL = 'SELECT * FROM users WHERE username = ? AND password = ?';
    
    db.query(querySQL, [username, password], (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Gagal menghubungi database' });
        } else if (results.length > 0) {
            const userData = {
                username: results[0].username,
                role: results[0].role,
                profile_image: results[0].profile_image
            };
            res.json({ message: 'Login berhasil!', user: userData });
        } else {
            res.status(401).json({ error: 'Username atau password salah!' });
        }
    });
});

// 7. API: Daftar Akun
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    const cekSQL = 'SELECT * FROM users WHERE username = ?';
    
    db.query(cekSQL, [username], (err, results) => {
        if (err) return res.status(500).json({ error: 'Gagal menghubungi database' });
        
        if (results.length > 0) {
            return res.status(400).json({ error: 'Username sudah terdaftar! Pilih yang lain.' });
        }
        
        const insertSQL = "INSERT INTO users (username, password, role, profile_image) VALUES (?, ?, 'user', 'https://cdn-icons-png.flaticon.com/512/149/149071.png')";
        db.query(insertSQL, [username, password], (err, insertResult) => {
            if (err) return res.status(500).json({ error: 'Gagal membuat akun' });
            res.json({ message: 'Pendaftaran berhasil! Silakan login.' });
        });
    });
});

// 8. API: Update Profil Pengguna
app.post('/api/update-profile', (req, res) => {
    const { usernameLama, usernameBaru, profileImage } = req.body;

    if (usernameLama !== usernameBaru) {
        const cekUsernameSQL = 'SELECT * FROM users WHERE username = ?';
        db.query(cekUsernameSQL, [usernameBaru], (err, results) => {
            if (err) return res.status(500).json({ error: 'Terjadi kesalahan di server' });
            
            if (results.length > 0) {
                return res.status(400).json({ error: 'Username sudah digunakan orang lain, pilih yang berbeda.' });
            }
            
            lakukanUpdate();
        });
    } else {
        lakukanUpdate(); 
    }

    function lakukanUpdate() {
        const querySQL = 'UPDATE users SET username = ?, profile_image = ? WHERE username = ?';
        db.query(querySQL, [usernameBaru, profileImage, usernameLama], (err, result) => {
            if (err) {
                console.error("Error Database:", err);
                return res.status(500).json({ error: 'Gagal memperbarui profil di database' });
            }
            res.json({ message: 'Profil berhasil diperbarui!', username: usernameBaru, profile_image: profileImage });
        });
    }
});

// Cek jika tidak berjalan di Vercel (production), maka gunakan port lokal
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`Server Backend VISHOP menyala di http://localhost:${port}`);
    });
}

// Export app agar bisa dibaca oleh Vercel
module.exports = app;