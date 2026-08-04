// ==========================================
// 1. INISIALISASI DATA LOCALSTORAGE
// ==========================================
let keranjang = JSON.parse(localStorage.getItem('keranjangVishop')) || [];
let userAktif = JSON.parse(localStorage.getItem('userVishop'));

// ==========================================
// 2. FUNGSI RENDER HEADER OTOMATIS (USER / ADMIN / TAMU)
// ==========================================
function renderHeader() {
    const userMenu = document.getElementById('userMenu');
    if (!userMenu) return; // Keluar jika elemen tidak ada di halaman ini

    if (userAktif) {
        // Jika sudah login, gunakan foto profil kustom atau default
        const profileImgSrc = userAktif.profile_image ? userAktif.profile_image : 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
        
        let menuHTML = `
            <a href="profile.html" class="user-profile" title="Ubah Profil" style="display: flex; align-items: center; gap: 8px; text-decoration: none;">
                <img src="${profileImgSrc}" alt="Profil" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover; border: 2px solid #ee4d2d;">
                <span style="font-weight: 600; color: #333;">${userAktif.username}</span>
            </a>
            <a href="cart.html" class="cart-btn" onclick="bukaKeranjang(event)" style="text-decoration:none; color:#555; display:flex; align-items:center; gap:6px; font-weight:600;">
                🛒 Keranjang (<span id="cartCount">${keranjang.length}</span>)
            </a>
        `;

        // Jika yang login adalah admin, tambahkan jalan pintas ke Panel Admin
        if (userAktif.role === 'admin') {
            menuHTML += `<a href="admin.html" class="nav-link" style="color: #007bff; text-decoration:none; font-weight:600;">Panel Admin</a>`;
        }

        menuHTML += `<button onclick="logout()" class="btn-logout" style="padding: 8px 16px; background: #fff0ed; color: #ff3b3b; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">Logout</button>`;
        
        userMenu.innerHTML = menuHTML;
    } else {
        // Jika belum login sama sekali
        userMenu.innerHTML = `
            <a href="login.html" class="nav-link" style="text-decoration:none; color:#555; font-weight:600;">Login</a>
            <a href="register.html" class="nav-link" style="text-decoration:none; background:#ee4d2d; color:white; padding:8px 16px; border-radius:8px; font-weight:600;">Daftar</a>
        `;
    }
}

// ==========================================
// 3. FUNGSI AMBIL & TAMPILKAN PRODUK (BERANDA UTAMA)
// ==========================================
async function ambilDanTampilkanProduk(kataKunci = '') {
    const productGrid = document.getElementById('productGrid');
    if (!productGrid) return; 

    productGrid.innerHTML = '<p style="text-align: center; grid-column: 1/-1; color: #777;">Memuat produk VISHOP...</p>'; 

    try {
        const url = kataKunci ? `http://localhost:3000/api/products?search=${kataKunci}` : 'http://localhost:3000/api/products';
        const response = await fetch(url);
        const products = await response.json();
        
        productGrid.innerHTML = ''; 

        if (products.length === 0) {
            productGrid.innerHTML = '<p style="text-align: center; grid-column: 1/-1; color: #777;">Maaf, produk yang Anda cari tidak ditemukan.</p>';
            return; 
        }

        products.forEach(product => {
            productGrid.innerHTML += `
                <div class="product-card" style="background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.04); display:flex; flex-direction:column;">
                    <div style="width:100%; height:220px; overflow:hidden;">
                        <img src="${product.image}" alt="${product.title}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='https://via.placeholder.com/250x250?text=Gambar+Tidak+Tersedia'">
                    </div>
                    <div style="padding:15px 20px 20px; flex:1; display:flex; flex-direction:column;">
                        <h3 style="font-size:14px; font-weight:500; color:#2c2c2c; margin-bottom:8px; min-height:40px; overflow:hidden;">${product.title}</h3>
                        <div style="font-size:18px; font-weight:700; color:#ee4d2d; margin-bottom:5px;">${product.price}</div>
                        <div style="font-size:12px; color:#888; margin-bottom:15px;">📍 ${product.location}</div>
                        <button onclick="tambahKeKeranjang('${product.id}', '${product.title}', '${product.price}')" style="margin-top:auto; width:100%; padding:10px; background:white; color:#ee4d2d; border:1px solid #ee4d2d; border-radius:8px; font-weight:600; cursor:pointer; transition:all 0.3s;">Masukkan Keranjang</button>
                    </div>
                </div>
            `;
        });
    } catch (error) {
        console.error("Gagal mengambil data:", error);
        productGrid.innerHTML = '<p style="text-align: center; color: red; grid-column: 1/-1;">Gagal terhubung ke server backend.</p>';
    }
}

// ==========================================
// 4. FUNGSI TAMBAH KE KERANJANG (DENGAN PENJAGA PINTU)
// ==========================================
window.tambahKeKeranjang = function(id, title, price) {
    // Cek apakah user benar-benar sudah login
    if (!userAktif) {
        alert("Silakan login terlebih dahulu untuk mulai berbelanja!");
        window.location.href = 'login.html';
        return; 
    }

    keranjang.push({ id: id, title: title, price: price });
    localStorage.setItem('keranjangVishop', JSON.stringify(keranjang));
    updateNotifKeranjang();
    
    alert(`"${title}" berhasil dimasukkan ke keranjang!`);
};

// Memperbarui angka keranjang secara real-time
function updateNotifKeranjang() {
    const cartCountEl = document.getElementById('cartCount');
    if (cartCountEl) {
        cartCountEl.innerText = keranjang.length;
    }
}

// Mengarahkan ke halaman keranjang (cart.html)
window.bukaKeranjang = function(e) {
    e.preventDefault();
    if (!userAktif) {
        alert("Silakan login terlebih dahulu.");
        window.location.href = 'login.html';
        return;
    }
    window.location.href = 'cart.html';
};

// ==========================================
// 5. FITUR PENCARIAN LIVE
// ==========================================
const searchInput = document.querySelector('.search-bar input');
const searchBtn = document.querySelector('.search-bar button');

if (searchBtn && searchInput) {
    searchBtn.addEventListener('click', () => {
        ambilDanTampilkanProduk(searchInput.value);
    });
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            ambilDanTampilkanProduk(searchInput.value);
        }
    });
}

// ==========================================
// 6. FUNGSI LOGOUT
// ==========================================
window.logout = function() {
    localStorage.removeItem('userVishop');
    localStorage.removeItem('keranjangVishop');
    alert("Anda telah berhasil keluar.");
    window.location.href = 'login.html';
};

// ==========================================
// 7. EKSEKUSI SAAT HALAMAN DIBUKA
// ==========================================
window.onload = function() {
    renderHeader();
    ambilDanTampilkanProduk();
    updateNotifKeranjang();
};