// 모바일 메뉴 토글
const menuToggle = document.querySelector('.menu-toggle');
const navMenu = document.querySelector('nav ul');
if (menuToggle && navMenu) {
  menuToggle.addEventListener('click', () => navMenu.classList.toggle('open'));
}

// 현재 페이지 네비 활성화
const currentPage = location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('nav a').forEach(a => {
  if (a.getAttribute('href') === currentPage) a.classList.add('active');
});

// 공사비 계산기
function calculate() {
  const area = parseFloat(document.getElementById('area')?.value) || 0;
  const type = document.getElementById('buildType')?.value;
  const grade = document.getElementById('grade')?.value;

  const unitCosts = {
    apt: { basic: 320, standard: 380, premium: 460 },
    villa: { basic: 260, standard: 310, premium: 380 },
    officetel: { basic: 290, standard: 350, premium: 420 },
    commercial: { basic: 350, standard: 420, premium: 510 }
  };

  if (!area || area <= 0) { alert('면적을 입력해주세요.'); return; }

  const unitCost = unitCosts[type]?.[grade] || 380;
  const baseCost = area * unitCost;
  const designCost = baseCost * 0.04;
  const supervisionCost = baseCost * 0.025;
  const contingency = baseCost * 0.05;
  const total = baseCost + designCost + supervisionCost + contingency;

  const fmt = n => Math.round(n).toLocaleString('ko-KR');

  document.getElementById('r-unit').textContent = unitCost.toLocaleString() + '만원/㎡';
  document.getElementById('r-base').textContent = fmt(baseCost) + '만원';
  document.getElementById('r-design').textContent = fmt(designCost) + '만원';
  document.getElementById('r-supervision').textContent = fmt(supervisionCost) + '만원';
  document.getElementById('r-contingency').textContent = fmt(contingency) + '만원';
  document.getElementById('r-total').textContent = fmt(total) + '만원';

  document.getElementById('calc-result').style.display = 'block';
}

// 상담 폼 제출
function submitConsult(e) {
  e.preventDefault();
  showModal('접수 완료', '상담 신청이 접수되었습니다.\n담당자가 2~3일 이내에 연락드리겠습니다.');
  e.target.reset();
}

// 모달
function showModal(title, msg) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-msg').textContent = msg;
  document.getElementById('modal').classList.add('show');
}
function closeModal() {
  document.getElementById('modal').classList.remove('show');
}

// 숫자 카운터 애니메이션
function animateCounters() {
  document.querySelectorAll('.stat-num[data-target]').forEach(el => {
    const target = parseInt(el.dataset.target);
    const duration = 1500;
    const step = target / (duration / 16);
    let current = 0;
    const timer = setInterval(() => {
      current += step;
      if (current >= target) { current = target; clearInterval(timer); }
      el.textContent = Math.floor(current).toLocaleString() + (el.dataset.suffix || '');
    }, 16);
  });
}

const observer = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { animateCounters(); observer.disconnect(); } });
}, { threshold: 0.3 });
const statsBar = document.querySelector('.stats-bar');
if (statsBar) observer.observe(statsBar);
