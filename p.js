// ╔══════════════════════════════════════════════════════════════════╗
// ║               GANTI LOGO ANDA DI SINI                          ║
// ╚══════════════════════════════════════════════════════════════════╝
const LOGO_URL = "logo.png"; // Isi dengan URL gambar logo Anda

// ╔══════════════════════════════════════════════════════════════════╗
// ║           URL API GOOGLE APPS SCRIPT ANDA                     ║
// ╚══════════════════════════════════════════════════════════════════╝
const API_URL = "https://script.google.com/macros/s/AKfycbzMXlDzRgFmgotxorSqFCMq5taodIWVEbB5iFtesXbhtMuiL_TZOOs-SV7qi5XKXG0u/exec";

const ADMIN_USER = 'admin';
const ADMIN_PASS = 'adminpabersi2024';

// ==================== FUNGSI LOGO ====================
function renderLogo(size = 70, isLogin = false) {
    const className = isLogin ? 'login-logo' : 'logo-icon';
    const style = isLogin ? '' : `width:${size}px;height:${size}px;`;
    if (LOGO_URL) {
        return `<div class="${className}" style="background:transparent;${style}"><img src="${LOGO_URL}" alt="Logo PABERSI SOKO"></div>`;
    } else {
        const fontSize = isLogin ? '48px' : (size * 0.5) + 'px';
        return `<div class="${className}" style="${style}font-size:${fontSize};">PS</div>`;
    }
}

// ==================== STATE ====================
let currentUser = null;
let loginMode = 'login';
let ANAK_USERS = [];      // cache user + data
let dataAnak = {};        // id -> data (tidak terpakai karena langsung di ANAK_USERS)

// ==================== API CALLS ====================
async function apiGet(action, params = {}) {
    const url = new URL(API_URL);
    url.searchParams.set('action', action);
    for (const key in params) {
        url.searchParams.set(key, params[key]);
    }
    const res = await fetch(url.toString());
    return await res.json();
}

async function apiPost(action, body = {}) {
    const res = await fetch(API_URL + '?action=' + action, {
        method: 'POST',
        body: JSON.stringify(body)
    });
    return await res.json();
}

// ==================== INISIALISASI ====================
async function loadUsers() {
    const result = await apiGet('getAllUsers');
    if (result.status === 'success') {
        ANAK_USERS = result.users;
        // Bangun dataAnak untuk kompatibilitas internal
        dataAnak = {};
        ANAK_USERS.forEach(u => {
            dataAnak[u.id] = u.data;
        });
    }
}

// Tidak diperlukan lagi loadData/saveData terpisah, gunakan loadUsers dan apiPost

// ==================== RENDER ====================
const app = document.getElementById('app');

async function render() {
    if (!currentUser) {
        renderLogin();
    } else if (currentUser.type === 'admin') {
        await renderAdminDashboard();
    } else if (currentUser.type === 'anak') {
        await renderAnakDashboard();
    }
}

// ==================== LOGIN & REGISTER ====================
function renderLogin() {
    const logoHtml = renderLogo(120, true);
    const title = '<h2 class="login-title">PABERSI SOKO</h2>';
    const subtitle = '<p class="login-subtitle">Sistem Pendataan Anak</p>';

    if (loginMode === 'register') {
        app.innerHTML = `
        <div class="login-container">
            <div class="login-card">
                ${logoHtml}
                ${title}
                <p style="color:var(--text-light);margin-bottom:24px;">Pendaftaran Akun Baru</p>
                <div class="error-msg" id="regError"></div>
                <div class="success-msg" id="regSuccess"></div>
                <div class="form-group"><input id="regNama" placeholder="Nama Lengkap"></div>
                <div class="form-group"><input id="regUsername" placeholder="Username"></div>
                <div class="form-group"><input type="password" id="regPassword" placeholder="Password"></div>
                <button class="btn btn-accent" onclick="window._doRegister()" style="width:100%;justify-content:center;margin-bottom:12px;">📝 Daftar</button>
                <button class="btn btn-outline btn-sm" onclick="window._switchMode('login')">← Kembali ke Login</button>
            </div>
        </div>`;
    } else {
        app.innerHTML = `
        <div class="login-container">
            <div class="login-card">
                ${logoHtml}
                ${title}
                ${subtitle}
                <div class="error-msg" id="loginError"></div>
                <input id="loginUsername" placeholder="Username" style="width:100%;padding:12px;border:2px solid #ddd;border-radius:25px;margin-bottom:12px;text-align:center;">
                <input type="password" id="loginPassword" placeholder="Password" style="width:100%;padding:12px;border:2px solid #ddd;border-radius:25px;margin-bottom:12px;text-align:center;">
                <button class="btn" onclick="window._doLogin()" style="width:100%;justify-content:center;margin-bottom:12px;">🔐 Masuk</button>
                <button class="btn btn-outline btn-sm" onclick="window._switchMode('register')">✨ Belum punya akun? Daftar</button>
            </div>
        </div>`;
    }
}

window._switchMode = (mode) => { loginMode = mode; render(); };

window._doLogin = async () => {
    const u = document.getElementById('loginUsername').value.trim();
    const p = document.getElementById('loginPassword').value.trim();
    const err = document.getElementById('loginError');
    if (!u || !p) {
        err.textContent = 'Harap isi username dan password!';
        err.style.display = 'block';
        return;
    }
    if (u.toLowerCase() === ADMIN_USER && p === ADMIN_PASS) {
        currentUser = { type: 'admin' };
        await loadUsers();
        render();
        return;
    }
    const res = await apiGet('login', { username: u, password: p });
    if (res.status === 'success') {
        currentUser = { type: 'anak', id: res.user.id, username: res.user.username, nama: res.user.nama };
        await loadUsers();
        render();
    } else {
        err.textContent = res.message || 'Username atau password salah!';
        err.style.display = 'block';
    }
};

window._doRegister = async () => {
    const nama = document.getElementById('regNama').value.trim();
    const user = document.getElementById('regUsername').value.trim();
    const pass = document.getElementById('regPassword').value.trim();
    const err = document.getElementById('regError');
    const succ = document.getElementById('regSuccess');
    err.style.display = 'none';
    succ.style.display = 'none';
    if (!nama || !user || !pass) {
        err.textContent = 'Semua field harus diisi!';
        err.style.display = 'block';
        return;
    }
    const res = await apiGet('register', { nama, username: user, password: pass });
    if (res.status === 'success') {
        currentUser = { type: 'anak', id: res.user.id, username: res.user.username, nama: res.user.nama };
        await loadUsers();
        loginMode = 'login';
        render();
    } else {
        err.textContent = res.message || 'Gagal mendaftar';
        err.style.display = 'block';
    }
};

// ==================== MODAL FOTO ====================
window._showPhoto = (src) => {
    document.getElementById('modalImage').src = src;
    document.getElementById('photoModal').style.display = 'flex';
};

// ==================== ADMIN DASHBOARD ====================
async function renderAdminDashboard() {
    await loadUsers(); // pastikan data terbaru
    const logoHtml = renderLogo(70);
    let tableRows = '';
    ANAK_USERS.forEach(a => {
        const d = a.data;
        const kej = (d.kejuaraan || []).map(k => k.nama || k).join(', ') || '-';
        const renderFoto = (data) => data ? `<img src="${data}" class="thumbnail" onclick="window._showPhoto('${data}')">` : '<span style="color:#ccc;">-</span>';
        tableRows += `<tr>
            <td>${a.id}</td><td>${a.nama}</td><td>${a.username}</td>
            <td><div class="password-cell"><span id="pw_${a.id}">••••••</span><button class="toggle-pw" onclick="window._togglePW(${a.id},'${a.password.replace(/'/g,"\\'")}')">👁️</button></div></td>
            <td>${d.ktp||'-'}</td><td>${d.kk||'-'}</td><td>${d.bpjs||'-'}</td><td>${d.rekening||'-'}</td>
            <td>${kej}</td><td>${renderFoto(d.fotoKtp)}</td><td>${renderFoto(d.fotoKk)}</td><td>${renderFoto(d.fotoBpjs)}</td><td>${renderFoto(d.fotoRekening)}</td>
        </tr>`;
    });

    app.innerHTML = `
    <div class="header">
        <div class="logo-area">${logoHtml}<div class="header-text"><h1>PABERSI SOKO</h1><p class="subtitle">Dashboard Admin</p></div></div>
        <div class="header-right"><span class="welcome-text">👑 Admin</span><button class="btn btn-outline btn-sm" onclick="window._logout()">🚪 Logout</button></div>
    </div>
    <div class="card">
        <div style="display:flex;justify-content:space-between;"><h2>📊 Data Anak (${ANAK_USERS.length} user)</h2><button class="btn btn-accent btn-sm" onclick="window._tambahAnak()">➕ Tambah</button></div>
        <div class="table-wrapper"><table><thead><tr><th>ID</th><th>Nama</th><th>Username</th><th>Password</th><th>KTP</th><th>KK</th><th>BPJS</th><th>Rek</th><th>Kejuaraan</th><th>Foto KTP</th><th>Foto KK</th><th>Foto BPJS</th><th>Foto Rek</th></tr></thead><tbody>${tableRows}</tbody></table></div>
    </div>
    <div class="card">
        <h2>✏️ Edit Data</h2>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;">${ANAK_USERS.map(a => `<button class="btn btn-outline btn-sm" onclick="window._adminEdit('${a.id}')">👤 ${a.nama}</button>`).join('')}</div>
        <div id="adminEditForm"></div>
    </div>`;
}

window._togglePW = (id, pw) => {
    const el = document.getElementById('pw_'+id);
    el.textContent = el.textContent==='••••••' ? pw : '••••••';
};

window._tambahAnak = async () => {
    const nama = prompt('Nama anak:'); if(!nama) return;
    const user = prompt('Username:'); if(!user) return;
    const pass = prompt('Password:'); if(!pass) return;
    const res = await apiGet('register', { nama, username: user, password: pass });
    if (res.status === 'success') {
        await loadUsers();
        render();
    } else {
        alert('Gagal: ' + res.message);
    }
};

window._adminEdit = (id) => {
    const anak = ANAK_USERS.find(a => a.id === id);
    if(!anak) return;
    const d = anak.data;
    const fotoPrev = (label, data) => data ? `<p><strong>${label}:</strong><br><img src="${data}" style="max-width:200px;cursor:pointer;" onclick="window._showPhoto('${data}')">` : `<p><strong>${label}:</strong> <span style="color:#999;">Belum diunggah</span>`;
    document.getElementById('adminEditForm').innerHTML = `
    <div style="background:#f8fafc;padding:18px;border-radius:10px;">
        <h3>Edit ${anak.nama} (ID: ${id})</h3>
        <div class="form-row">
            <div class="form-group"><label>Username</label><input id="admU_${id}" value="${anak.username}"></div>
            <div class="form-group"><label>Password</label><input id="admP_${id}" value="${anak.password}"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>KTP</label><input id="admKtp_${id}" value="${d.ktp||''}"></div>
            <div class="form-group"><label>KK</label><input id="admKk_${id}" value="${d.kk||''}"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>BPJS</label><input id="admBpjs_${id}" value="${d.bpjs||''}"></div>
            <div class="form-group"><label>Rekening</label><input id="admRek_${id}" value="${d.rekening||''}"></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:16px 0;">
            ${fotoPrev('Foto KTP', d.fotoKtp)} ${fotoPrev('Foto KK', d.fotoKk)}
            ${fotoPrev('Foto BPJS', d.fotoBpjs)} ${fotoPrev('Foto Rekening', d.fotoRekening)}
        </div>
        <button class="btn" onclick="window._adminSave('${id}')">💾 Simpan</button>
        <button class="btn btn-danger btn-sm" onclick="window._adminHapus('${id}')">🗑 Hapus</button>
        <span id="admStatus_${id}" style="color:var(--success);display:none;">✅</span>
    </div>`;
};

window._adminSave = async (id) => {
    const anak = ANAK_USERS.find(a => a.id === id);
    if (anak) {
        anak.username = document.getElementById('admU_'+id).value.trim();
        anak.password = document.getElementById('admP_'+id).value.trim();
        // update password via API
        await apiGet('changePassword', { id, newPassword: anak.password });
        // update username? tidak ada endpoint khusus, kita bisa update langsung di array, tapi untuk sentralisasi lebih baik simpan ulang user.
        // Untuk sederhana, kita panggil register tidak bisa. Saya tambahkan endpoint saveUser nanti.
        // Sementara, username hanya bisa diubah di sheet manual. Kita fokus data.
    }
    const data = {
        ktp: document.getElementById('admKtp_'+id).value.trim(),
        kk: document.getElementById('admKk_'+id).value.trim(),
        bpjs: document.getElementById('admBpjs_'+id).value.trim(),
        rekening: document.getElementById('admRek_'+id).value.trim(),
        kejuaraan: anak?.data?.kejuaraan || [],
        fotoKtp: anak?.data?.fotoKtp || '',
        fotoKk: anak?.data?.fotoKk || '',
        fotoBpjs: anak?.data?.fotoBpjs || '',
        fotoRekening: anak?.data?.fotoRekening || ''
    };
    await apiPost('saveData', { id, data });
    await loadUsers();
    render();
};

window._adminHapus = async (id) => {
    if(!confirm('Hapus permanen?')) return;
    await apiGet('deleteUser', { id });
    await loadUsers();
    render();
};

// ==================== ANAK DASHBOARD ====================
async function renderAnakDashboard() {
    await loadUsers();
    const id = currentUser.id;
    const anak = ANAK_USERS.find(a => a.id === id);
    if (!anak) { currentUser = null; render(); return; }
    const d = anak.data;
    const logoHtml = renderLogo(70);

    const createUpload = (label, field, data) => {
        const pid = 'prev_'+field;
        return `
        <div class="form-group"><label>📷 ${label}</label>
            <div style="display:flex;align-items:center;gap:16px;">
                <div id="${pid}" style="width:120px;height:80px;border:2px dashed #ddd;border-radius:8px;display:flex;align-items:center;justify-content:center;">${data?`<img src="${data}" style="max-width:100%;max-height:100%;">`:'<span style="color:#aaa;">Kosong</span>'}</div>
                <div><input type="file" id="inp_${field}" accept="image/*" onchange="window._prevFoto('inp_${field}','${pid}')"><button class="btn btn-outline btn-sm" onclick="window._clearFoto('inp_${field}','${pid}','${field}')">🗑</button></div>
            </div>
        </div>`;
    };

    const kejHtml = (d.kejuaraan||[]).map((k,i)=>`
        <div style="background:#fafbfc;padding:14px;border-radius:10px;margin-bottom:10px;border:1px dashed #ddd;position:relative;">
            <button onclick="window._delKej(${i})" style="position:absolute;top:8px;right:10px;background:var(--danger);color:#fff;border:none;width:26px;height:26px;border-radius:50%;">×</button>
            <div class="form-row"><div class="form-group"><label>Nama</label><input value="${k.nama||''}" readonly></div><div class="form-group"><label>Tahun</label><input value="${k.tahun||''}" readonly></div></div>
            <div class="form-row"><div class="form-group"><label>Tingkat</label><input value="${k.tingkat||''}" readonly></div><div class="form-group"><label>Prestasi</label><input value="${k.prestasi||''}" readonly></div></div>
        </div>`).join('') || '<p style="color:#999;">Belum ada kejuaraan.</p>';

    app.innerHTML = `
    <div class="header">
        <div class="logo-area">${logoHtml}<div class="header-text"><h1>PABERSI SOKO</h1><p class="subtitle">Data Pribadi - ${anak.nama}</p></div></div>
        <div class="header-right"><span>👤 ${anak.nama}</span><button class="btn btn-outline btn-sm" onclick="window._logout()">🚪 Logout</button></div>
    </div>
    <div class="info-box">🔒 Data Anda tersimpan di cloud (Google Sheets).</div>
    <div class="card">
        <h2>📝 Identitas</h2>
        <div class="form-row"><div class="form-group"><label>KTP</label><input id="editKtp" value="${d.ktp||''}"></div><div class="form-group"><label>KK</label><input id="editKk" value="${d.kk||''}"></div></div>
        <div class="form-row"><div class="form-group"><label>BPJS</label><input id="editBpjs" value="${d.bpjs||''}"></div><div class="form-group"><label>Rekening</label><input id="editRek" value="${d.rekening||''}"></div></div>
        <button class="btn" onclick="window._saveId()">💾 Simpan</button><span id="saveIdStat" style="color:var(--success);display:none;">✅</span>
    </div>
    <div class="card">
        <h2>🖼️ Foto Dokumen</h2>
        <div class="form-row">${createUpload('Foto KTP','fotoKtp',d.fotoKtp)} ${createUpload('Foto KK','fotoKk',d.fotoKk)}</div>
        <div class="form-row">${createUpload('Foto BPJS','fotoBpjs',d.fotoBpjs)} ${createUpload('Foto Rekening','fotoRekening',d.fotoRekening)}</div>
        <button class="btn btn-accent" onclick="window._savePhotos()">💾 Simpan Foto</button><span id="savePhotoStat" style="color:var(--success);display:none;">✅</span>
    </div>
    <div class="card">
        <h2>🏆 Kejuaraan</h2>
        <div>${kejHtml}</div>
        <button class="btn btn-accent mt-3" onclick="window._showAddKej()">➕ Tambah</button>
        <div id="addKejForm" class="hidden" style="margin-top:16px;background:#fffdf5;padding:18px;border-radius:10px;border:1px dashed var(--accent);">
            <div class="form-row"><div class="form-group"><label>Nama*</label><input id="newNama"></div><div class="form-group"><label>Tahun</label><input id="newTahun"></div></div>
            <div class="form-row"><div class="form-group"><label>Tingkat</label><select id="newTingkat"><option value="">Pilih</option><option>Kecamatan</option><option>Kab/Kota</option><option>Provinsi</option><option>Nasional</option><option>Internasional</option></select></div><div class="form-group"><label>Prestasi</label><input id="newPrestasi"></div></div>
            <button class="btn btn-accent btn-sm" onclick="window._addKej()">✅ Simpan</button><button class="btn btn-outline btn-sm" onclick="window._hideAddKej()">Batal</button>
        </div>
    </div>`;
}

// Helper untuk anak
window._saveId = async () => {
    const anak = ANAK_USERS.find(a => a.id === currentUser.id);
    const data = { ...anak.data,
        ktp: document.getElementById('editKtp').value.trim(),
        kk: document.getElementById('editKk').value.trim(),
        bpjs: document.getElementById('editBpjs').value.trim(),
        rekening: document.getElementById('editRek').value.trim()
    };
    await apiPost('saveData', { id: currentUser.id, data });
    await loadUsers();
    document.getElementById('saveIdStat').style.display = 'inline';
    setTimeout(() => document.getElementById('saveIdStat').style.display = 'none', 2000);
};

window._prevFoto = (inpId, prevId) => {
    const i=document.getElementById(inpId), p=document.getElementById(prevId);
    if(i.files[0]){ const r=new FileReader(); r.onload=e=>p.innerHTML=`<img src="${e.target.result}" style="max-width:100%;max-height:100%;">`; r.readAsDataURL(i.files[0]); }
};
window._clearFoto = (inpId, prevId, field) => {
    document.getElementById(inpId).value='';
    document.getElementById(prevId).innerHTML='<span style="color:#aaa;">Kosong</span>';
    // Hapus data foto sementara (tersimpan saat save)
    const anak = ANAK_USERS.find(a => a.id === currentUser.id);
    if (anak) anak.data[field] = '';
};
window._savePhotos = async () => {
    const anak = ANAK_USERS.find(a => a.id === currentUser.id);
    const fields = ['fotoKtp','fotoKk','fotoBpjs','fotoRekening'];
    for (const f of fields) {
        const inp = document.getElementById('inp_'+f);
        if (inp && inp.files[0]) {
            const dataUrl = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target.result);
                reader.readAsDataURL(inp.files[0]);
            });
            anak.data[f] = dataUrl;
        }
    }
    await apiPost('saveData', { id: currentUser.id, data: anak.data });
    await loadUsers();
    document.getElementById('savePhotoStat').style.display = 'inline';
    setTimeout(() => document.getElementById('savePhotoStat').style.display = 'none', 2000);
    render();
};

window._showAddKej = () => document.getElementById('addKejForm').classList.remove('hidden');
window._hideAddKej = () => {
    document.getElementById('addKejForm').classList.add('hidden');
    ['newNama','newTahun','newPrestasi'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('newTingkat').value='';
};
window._addKej = async () => {
    const nama = document.getElementById('newNama').value.trim();
    if(!nama) return alert('Nama harus diisi');
    const kej = { nama, tahun: document.getElementById('newTahun').value.trim(), tingkat: document.getElementById('newTingkat').value, prestasi: document.getElementById('newPrestasi').value.trim() };
    const anak = ANAK_USERS.find(a => a.id === currentUser.id);
    anak.data.kejuaraan = anak.data.kejuaraan || [];
    anak.data.kejuaraan.push(kej);
    await apiPost('saveData', { id: currentUser.id, data: anak.data });
    await loadUsers();
    window._hideAddKej();
    render();
};
window._delKej = async (index) => {
    if(confirm('Hapus?')) {
        const anak = ANAK_USERS.find(a => a.id === currentUser.id);
        anak.data.kejuaraan.splice(index,1);
        await apiPost('saveData', { id: currentUser.id, data: anak.data });
        await loadUsers();
        render();
    }
};

window._logout = () => { currentUser = null; loginMode = 'login'; render(); };

// Enter key handler
document.addEventListener('keydown', e => {
    if (!currentUser && e.key === 'Enter') {
        if (loginMode === 'register') window._doRegister();
        else window._doLogin();
    }
});

// Init
(async () => {
    await loadUsers();
    render();
})();