// Firebase 설정
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, orderBy, query, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBI1VSgzPHDjkCjYbzZqj21c1lsLqZv0KY",
  authDomain: "apt-cost-institute.firebaseapp.com",
  projectId: "apt-cost-institute",
  storageBucket: "apt-cost-institute.firebasestorage.app",
  messagingSenderId: "948279454478",
  appId: "1:948279454478:web:47106a141de528c77a055f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 현재 편집 중인 문서 ID
let editingId = null;
let currentSection = 'dashboard';

// 인증 상태 감지
onAuthStateChanged(auth, user => {
  if (user) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-screen').style.display = 'flex';
    document.getElementById('user-email').textContent = user.email;
    loadDashboard();
    navigate('dashboard');
  } else {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('admin-screen').style.display = 'none';
  }
});

// 로그인
window.doLogin = async () => {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-pw').value;
  const errEl = document.getElementById('login-error');
  errEl.style.display = 'none';
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch(e) {
    errEl.textContent = '이메일 또는 비밀번호가 올바르지 않습니다.';
    errEl.style.display = 'block';
  }
};

// 로그아웃
window.doLogout = () => signOut(auth);

// 로그인 엔터키
document.getElementById('login-pw')?.addEventListener('keydown', e => { if(e.key==='Enter') doLogin(); });

// 네비게이션
window.navigate = (section) => {
  currentSection = section;
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.querySelector(`[data-nav="${section}"]`)?.classList.add('active');
  document.querySelectorAll('.page-section').forEach(el => el.classList.remove('active'));
  document.getElementById(`page-${section}`)?.classList.add('active');

  const titles = { dashboard:'대시보드', notices:'공지사항 관리', research:'연구자료 관리', images:'이미지 관리', consults:'상담 내역' };
  document.getElementById('page-title').textContent = titles[section] || '';

  if(section === 'notices') loadNotices();
  if(section === 'research') loadResearch();
  if(section === 'consults') loadConsults();
  if(section === 'images') loadImages();
};

// 토스트 알림
function toast(msg, type='success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type} show`;
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ===== 대시보드 =====
async function loadDashboard() {
  try {
    const [notices, research, consults] = await Promise.all([
      getDocs(collection(db, 'notices')),
      getDocs(collection(db, 'research')),
      getDocs(collection(db, 'consults'))
    ]);
    document.getElementById('stat-notices').textContent = notices.size;
    document.getElementById('stat-research').textContent = research.size;
    document.getElementById('stat-consults').textContent = consults.size;
  } catch(e) { console.error(e); }
}

// ===== 공지사항 =====
async function loadNotices() {
  const tbody = document.getElementById('notices-tbody');
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:#999;">불러오는 중...</td></tr>';
  try {
    const q = query(collection(db, 'notices'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    if(snap.empty) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:#999;">등록된 공지사항이 없습니다.</td></tr>'; return; }
    tbody.innerHTML = '';
    snap.forEach(d => {
      const data = d.data();
      tbody.innerHTML += `
        <tr>
          <td><span class="badge badge-${data.type==='새글'?'new':'notice'}">${data.type||'공지'}</span></td>
          <td>${data.title}</td>
          <td>${data.content?.substring(0,40)||''}...</td>
          <td>${data.createdAt?.toDate().toLocaleDateString('ko-KR')||'-'}</td>
          <td>
            <button class="btn btn-outline btn-sm" onclick="openNoticeEdit('${d.id}','${data.title.replace(/'/g,"\\'")}','${(data.content||'').replace(/'/g,"\\'")}','${data.type||'공지'}')">수정</button>
            <button class="btn btn-danger btn-sm" style="margin-left:6px" onclick="deleteNotice('${d.id}')">삭제</button>
          </td>
        </tr>`;
    });
  } catch(e) { toast('불러오기 실패: '+e.message, 'error'); }
}

window.openNoticeModal = () => {
  editingId = null;
  document.getElementById('notice-modal-title').textContent = '공지사항 추가';
  document.getElementById('notice-title').value = '';
  document.getElementById('notice-content').value = '';
  document.getElementById('notice-type').value = '공지';
  document.getElementById('notice-modal').classList.add('show');
};

window.openNoticeEdit = (id, title, content, type) => {
  editingId = id;
  document.getElementById('notice-modal-title').textContent = '공지사항 수정';
  document.getElementById('notice-title').value = title;
  document.getElementById('notice-content').value = content;
  document.getElementById('notice-type').value = type;
  document.getElementById('notice-modal').classList.add('show');
};

window.closeNoticeModal = () => document.getElementById('notice-modal').classList.remove('show');

window.saveNotice = async () => {
  const title = document.getElementById('notice-title').value.trim();
  const content = document.getElementById('notice-content').value.trim();
  const type = document.getElementById('notice-type').value;
  if(!title || !content) { toast('제목과 내용을 입력하세요.', 'error'); return; }
  try {
    if(editingId) {
      await updateDoc(doc(db, 'notices', editingId), { title, content, type, updatedAt: serverTimestamp() });
      toast('공지사항이 수정됐습니다.');
    } else {
      await addDoc(collection(db, 'notices'), { title, content, type, createdAt: serverTimestamp() });
      toast('공지사항이 등록됐습니다.');
    }
    closeNoticeModal();
    loadNotices();
    loadDashboard();
  } catch(e) { toast('저장 실패: '+e.message, 'error'); }
};

window.deleteNotice = async (id) => {
  if(!confirm('정말 삭제하시겠습니까?')) return;
  try {
    await deleteDoc(doc(db, 'notices', id));
    toast('삭제됐습니다.');
    loadNotices();
    loadDashboard();
  } catch(e) { toast('삭제 실패', 'error'); }
};

// ===== 연구자료 =====
async function loadResearch() {
  const tbody = document.getElementById('research-tbody');
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:#999;">불러오는 중...</td></tr>';
  try {
    const q = query(collection(db, 'research'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    if(snap.empty) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:#999;">등록된 자료가 없습니다.</td></tr>'; return; }
    tbody.innerHTML = '';
    snap.forEach(d => {
      const data = d.data();
      tbody.innerHTML += `
        <tr>
          <td><span class="badge badge-notice">${data.category||'연구보고서'}</span></td>
          <td>${data.title}</td>
          <td>${data.date||'-'}</td>
          <td>${data.fileUrl ? `<a href="${data.fileUrl}" target="_blank" style="color:var(--primary-light)">링크</a>` : '-'}</td>
          <td>
            <button class="btn btn-outline btn-sm" onclick="openResearchEdit('${d.id}')">수정</button>
            <button class="btn btn-danger btn-sm" style="margin-left:6px" onclick="deleteResearch('${d.id}')">삭제</button>
          </td>
        </tr>`;
    });
  } catch(e) { toast('불러오기 실패', 'error'); }
}

window.openResearchModal = () => {
  editingId = null;
  document.getElementById('research-modal-title').textContent = '연구자료 추가';
  document.getElementById('research-title').value = '';
  document.getElementById('research-category').value = '연구보고서';
  document.getElementById('research-date').value = '';
  document.getElementById('research-desc').value = '';
  document.getElementById('research-url').value = '';
  document.getElementById('research-modal').classList.add('show');
};

window.openResearchEdit = async (id) => {
  editingId = id;
  const snap = await getDocs(collection(db, 'research'));
  snap.forEach(d => {
    if(d.id === id) {
      const data = d.data();
      document.getElementById('research-modal-title').textContent = '연구자료 수정';
      document.getElementById('research-title').value = data.title||'';
      document.getElementById('research-category').value = data.category||'연구보고서';
      document.getElementById('research-date').value = data.date||'';
      document.getElementById('research-desc').value = data.description||'';
      document.getElementById('research-url').value = data.fileUrl||'';
    }
  });
  document.getElementById('research-modal').classList.add('show');
};

window.closeResearchModal = () => document.getElementById('research-modal').classList.remove('show');

window.saveResearch = async () => {
  const title = document.getElementById('research-title').value.trim();
  const category = document.getElementById('research-category').value;
  const date = document.getElementById('research-date').value.trim();
  const description = document.getElementById('research-desc').value.trim();
  const fileUrl = document.getElementById('research-url').value.trim();
  if(!title) { toast('제목을 입력하세요.', 'error'); return; }
  try {
    if(editingId) {
      await updateDoc(doc(db, 'research', editingId), { title, category, date, description, fileUrl, updatedAt: serverTimestamp() });
      toast('연구자료가 수정됐습니다.');
    } else {
      await addDoc(collection(db, 'research'), { title, category, date, description, fileUrl, createdAt: serverTimestamp() });
      toast('연구자료가 등록됐습니다.');
    }
    closeResearchModal();
    loadResearch();
    loadDashboard();
  } catch(e) { toast('저장 실패: '+e.message, 'error'); }
};

window.deleteResearch = async (id) => {
  if(!confirm('정말 삭제하시겠습니까?')) return;
  try {
    await deleteDoc(doc(db, 'research', id));
    toast('삭제됐습니다.');
    loadResearch();
    loadDashboard();
  } catch(e) { toast('삭제 실패', 'error'); }
};

// ===== 이미지 관리 =====
async function loadImages() {
  const grid = document.getElementById('images-grid');
  grid.innerHTML = '<p style="color:#999;text-align:center;padding:20px">불러오는 중...</p>';
  try {
    const q = query(collection(db, 'images'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    if(snap.empty) { grid.innerHTML = '<p style="color:#999;text-align:center;padding:20px">등록된 이미지가 없습니다.</p>'; return; }
    grid.innerHTML = '';
    snap.forEach(d => {
      const data = d.data();
      grid.innerHTML += `
        <div style="background:#f8faff;border:1px solid var(--border);border-radius:8px;padding:12px;text-align:center;">
          <img src="${data.url}" style="width:100%;height:140px;object-fit:cover;border-radius:6px;margin-bottom:8px" onerror="this.src='data:image/svg+xml,<svg xmlns=\\"http://www.w3.org/2000/svg\\" width=\\"100\\" height=\\"100\\"><rect fill=\\"%23eee\\" width=\\"100\\" height=\\"100\\"/><text fill=\\"%23999\\" x=\\"50\\" y=\\"55\\" text-anchor=\\"middle\\">이미지 없음</text></svg>'">
          <p style="font-size:12px;color:#666;margin-bottom:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${data.name||'이미지'}</p>
          <button class="btn btn-danger btn-sm" onclick="deleteImage('${d.id}')">삭제</button>
        </div>`;
    });
  } catch(e) { toast('불러오기 실패', 'error'); }
}

window.openImageModal = () => {
  document.getElementById('img-name').value = '';
  document.getElementById('img-url').value = '';
  document.getElementById('img-preview-el').style.display = 'none';
  document.getElementById('image-modal').classList.add('show');
};
window.closeImageModal = () => document.getElementById('image-modal').classList.remove('show');

window.previewImage = () => {
  const url = document.getElementById('img-url').value.trim();
  const prev = document.getElementById('img-preview-el');
  if(url) { prev.src = url; prev.style.display = 'block'; }
};

window.saveImage = async () => {
  const name = document.getElementById('img-name').value.trim();
  const url = document.getElementById('img-url').value.trim();
  if(!url) { toast('이미지 URL을 입력하세요.', 'error'); return; }
  try {
    await addDoc(collection(db, 'images'), { name: name||'이미지', url, createdAt: serverTimestamp() });
    toast('이미지가 등록됐습니다.');
    closeImageModal();
    loadImages();
  } catch(e) { toast('저장 실패', 'error'); }
};

window.deleteImage = async (id) => {
  if(!confirm('이미지를 삭제하시겠습니까?')) return;
  try {
    await deleteDoc(doc(db, 'images', id));
    toast('삭제됐습니다.');
    loadImages();
  } catch(e) { toast('삭제 실패', 'error'); }
};

// ===== 상담 내역 =====
async function loadConsults() {
  const list = document.getElementById('consults-list');
  list.innerHTML = '<p style="color:#999;text-align:center;padding:20px">불러오는 중...</p>';
  try {
    const q = query(collection(db, 'consults'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    if(snap.empty) { list.innerHTML = '<p style="color:#999;text-align:center;padding:20px">접수된 상담이 없습니다.</p>'; return; }
    list.innerHTML = '';
    snap.forEach(d => {
      const data = d.data();
      list.innerHTML += `
        <div class="consult-item">
          <div class="consult-header">
            <div>
              <span class="consult-name">${data.name||'-'}</span>
              <span style="font-size:12px;color:#999;margin-left:10px">${data.consultType||''}</span>
            </div>
            <div style="display:flex;align-items:center;gap:10px">
              <span class="consult-date">${data.createdAt?.toDate().toLocaleDateString('ko-KR')||'-'}</span>
              <button class="btn btn-danger btn-sm" onclick="deleteConsult('${d.id}')">삭제</button>
            </div>
          </div>
          <div style="font-size:13px;color:#555;margin-bottom:6px">
            📞 ${data.phone||'-'} &nbsp;|&nbsp; ✉️ ${data.email||'-'} &nbsp;|&nbsp; 🏢 ${data.org||'-'}
          </div>
          <div class="consult-content">${data.content||'-'}</div>
        </div>`;
    });
  } catch(e) { toast('불러오기 실패', 'error'); }
}

window.deleteConsult = async (id) => {
  if(!confirm('상담 내역을 삭제하시겠습니까?')) return;
  try {
    await deleteDoc(doc(db, 'consults', id));
    toast('삭제됐습니다.');
    loadConsults();
    loadDashboard();
  } catch(e) { toast('삭제 실패', 'error'); }
};
