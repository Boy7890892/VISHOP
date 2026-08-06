const express = require('express');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors());
// DINAIKKAN KE 50MB: Agar foto profil high-res dari HP tidak menyebabkan error
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// TAMBAHKAN BARIS INI:
app.use(express.static(__dirname));

// Mengimpor Supabase Client
const { createClient } = require('@supabase/supabase-js');

// Konfigurasi Database Supabase
const supabaseUrl = 'https://ywzlszwaasiwuyfryzof.supabase.co'; // Hapus '/rest/v1/' di akhir URL
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3emxzendhYXNpd3V5ZnJ5em9mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NzIyOTAsImV4cCI6MjEwMTU0ODI5MH0.w1uch1X0GbcVvwwMEz59mxlxIne8W6nJwSZG8gpfANM';
const supabase = createClient(supabaseUrl, supabaseKey);

// 3. API: Ambil / Cari Produk
app.get('/api/products', async (req, res) => {
    const kataKunci = req.query.search; 
    let query = supabase.from('products').select('*');

    if (kataKunci) {
        // Menggunakan ilike untuk pencarian teks (case-insensitive)
        query = query.or(`title.ilike.%${kataKunci}%,location.ilike.%${kataKunci}%`);
    }
    
    const { data, error } = await query;

    if (error) {
        console.error(error);
        return res.status(500).json({ error: 'Gagal mengambil data dari database' });
    }
    res.json(data);
});

// 4. API: Tambah Produk
app.post('/api/products', async (req, res) => {
    let { title, price, discount, location, image, is_new, is_trending } = req.body;
    
    // Pastikan nilai angka aman
    price = Number(price) || 0;
    discount = Number(discount) || 0;
    is_new = is_new ? 1 : 0;
    is_trending = is_trending ? 1 : 0;

    const { data, error } = await supabase
        .from('products')
        .insert([{ title, price, discount, location, image, is_new, is_trending }])
        .select(); // .select() mengembalikan data yang baru di-insert

    if (error) {
        console.error(error);
        return res.status(500).json({ error: 'Gagal menambah produk ke database' });
    }
    res.json({ message: 'Hore! Produk berhasil ditambahkan!', id: data[0].id });
});

// 5. API: Hapus Produk
app.delete('/api/products/:id', async (req, res) => {
    const idProduk = req.params.id;
    
    const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', idProduk);
        
    if (error) {
        console.error(error);
        return res.status(500).json({ error: 'Gagal menghapus produk' });
    }
    res.json({ message: 'Sip! Produk berhasil dihapus dari database.' });
});

// 6. API: Login Pengguna
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .single(); // Ambil satu baris saja
        
    if (error || !data) {
        return res.status(401).json({ error: 'Username atau password salah!' });
    }
    
    const userData = {
        username: data.username,
        role: data.role,
        profile_image: data.profile_image
    };
    res.json({ message: 'Login berhasil!', user: userData });
});

// 7. API: Daftar Akun
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    
    // Cek apakah username sudah ada
    const { data: existingUser } = await supabase
        .from('users')
        .select('username')
        .eq('username', username)
        .maybeSingle(); // maybeSingle tidak akan melempar error jika data kosong
        
    if (existingUser) {
        return res.status(400).json({ error: 'Username sudah terdaftar! Pilih yang lain.' });
    }
    
    // Insert user baru
    const { error: insertError } = await supabase
        .from('users')
        .insert([{ 
            username: username, 
            password: password, 
            role: 'user', 
            profile_image: 'https://cdn-icons-png.flaticon.com/512/149/149071.png' 
        }]);
        
    if (insertError) {
        return res.status(500).json({ error: 'Gagal membuat akun' });
    }
    res.json({ message: 'Pendaftaran berhasil! Silakan login.' });
});

// 8. API: Update Profil Pengguna
app.post('/api/update-profile', async (req, res) => {
    const { usernameLama, usernameBaru, profileImage } = req.body;

    if (usernameLama !== usernameBaru) {
        // Cek apakah username baru sudah dipakai orang lain
        const { data: existingUser } = await supabase
            .from('users')
            .select('username')
            .eq('username', usernameBaru)
            .maybeSingle();
            
        if (existingUser) {
            return res.status(400).json({ error: 'Username sudah digunakan orang lain, pilih yang berbeda.' });
        }
    }

    // Lakukan Update
    const { error } = await supabase
        .from('users')
        .update({ username: usernameBaru, profile_image: profileImage })
        .eq('username', usernameLama);
        
    if (error) {
        console.error("Error Database:", error);
        return res.status(500).json({ error: 'Gagal memperbarui profil di database' });
    }
    
    res.json({ message: 'Profil berhasil diperbarui!', username: usernameBaru, profile_image: profileImage });
});

// Cek jika tidak berjalan di Vercel (production), maka gunakan port lokal
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`Server Backend VISHOP menyala di http://localhost:${port}`);
    });
}

// Export app agar bisa dibaca oleh Vercel
module.exports = app;