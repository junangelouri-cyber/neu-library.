const ACCOUNTS = { admins: ['librarian@neu.edu.ph', 'jcesperanza@neu.edu.ph'] };
const STORAGE = { blockedUsers: 'blockedUsers', adminAccounts: 'adminAccounts' };

let mockData = [
  { name: 'Anna Cruz', email:'anna.cruz@neu.edu.ph', reason:'Study', program:'Computer Science', college:'CICS', timeIn: new Date(Date.now()-30*60000), blocked:false },
  { name: 'Luis Tan', email:'luis.tan@neu.edu.ph', reason:'Borrowing', program:'Business Administration', college:'CBA', timeIn: new Date(Date.now()-3*3600000), blocked:false },
  { name: 'Maya Lim', email:'maya.lim@neu.edu.ph', reason:'Research', program:'Engineering', college:'COE', timeIn: new Date(Date.now()-2*86400000), blocked:false }
];

let currentUserEmail = null;

function saveMockData(){
  const serializable = mockData.map(v=>({
    ...v,
    timeIn: new Date(v.timeIn).toISOString()
  }));
  localStorage.setItem('mockData', JSON.stringify(serializable));
}

function loadMockData(){
  const raw = localStorage.getItem('mockData');
  if(!raw) return;
  try {
    const parsed = JSON.parse(raw);
    if(Array.isArray(parsed)){
      mockData = parsed.map(v => ({
        ...v,
        timeIn: new Date(v.timeIn)
      }));
    }
  } catch(e){ console.warn('Invalid mockData in localStorage', e); }
}

loadMockData();

const loginModal = document.getElementById('loginModal');
const appLayout = document.getElementById('appLayout');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const emailInput = document.getElementById('emailInput');
const emailError = document.getElementById('emailError');
const userSection = document.getElementById('user-section');
const adminSection = document.getElementById('admin-section');
const fullScreenMessage = document.getElementById('fullScreenMessage');
const visitorsTab = document.getElementById('visitorsTab');
const dashboardTab = document.getElementById('dashboardTab');
const visitorForm = document.getElementById('visitorForm');
const successBanner = document.getElementById('successBanner');
const statToday = document.getElementById('statToday');
const statWeek = document.getElementById('statWeek');
const statMonth = document.getElementById('statMonth');
const statActiveCollege = document.getElementById('statActiveCollege');
const statBlocked = document.getElementById('statBlocked');
const periodButtons = document.querySelectorAll('.periodBtn');
let selectedPeriod = 'day';
const visitorTable = document.getElementById('visitorTable');
const searchInput = document.getElementById('searchInput');
const programFilter = document.getElementById('programFilter');
const roleFilter = document.getElementById('roleFilter');
const visitorTypeEl = document.getElementById('visitorType');
const studentIdEl = document.getElementById('studentId');
const educationalSection = document.getElementById('educationalSection');
const programSection = document.getElementById('programSection');
const reasonSection = document.getElementById('reasonSection');
const addAdminBtn = document.getElementById('addAdminBtn');
const newAdminEmailInput = document.getElementById('newAdminEmail');
const adminAccountMessage = document.getElementById('adminAccountMessage');

const topCollegesContainer = document.getElementById('topColleges');
const visitReasonsContainer = document.getElementById('visitReasons');
const visitorModal = document.getElementById('visitorModal');
const closeVisitorModal = document.getElementById('closeVisitorModal');
const visitorProfileCard = document.getElementById('visitorProfileCard');
const visitorVisitHistory = document.getElementById('visitorVisitHistory');
const myHistoryContainer = document.getElementById('myHistoryContainer');
const myHistoryCount = document.getElementById('myHistoryCount');

function isValidEmail(email){return /^\S+@neu\.edu\.ph$/i.test(email);}

const sidebarBtns = document.querySelectorAll('.sidebarBtn');
const sections = ['visitorEntrySection', 'myHistorySection', 'dashboardSection', 'visitorLogsSection', 'adminSettingsSection'];
let currentRole = 'student'; // default until login

function showPage(pageId){
  if(currentRole === 'student' && !['visitorEntrySection', 'myHistorySection'].includes(pageId)){
    pageId = 'visitorEntrySection';
  }
  if(currentRole === 'admin' && pageId === 'visitorEntrySection'){
    pageId = 'dashboardSection';
  }

  sections.forEach(id => {
    const el = document.getElementById(id);
    if(!el) return;
    el.classList.toggle('hidden', id !== pageId);
  });

  if(pageId === 'visitorEntrySection' && currentRole === 'student'){
    renderMyHistory();
  }


  sidebarBtns.forEach(btn => {
    const active = btn.dataset.page === pageId;
    btn.classList.toggle('bg-emerald-700', active);
    btn.classList.toggle('text-white', active);
    btn.classList.toggle('font-semibold', active);
    btn.classList.toggle('bg-emerald-600', !active);
  });
}

function updateSidebar(role){
  const isAdmin = role === 'admin';
  currentRole = isAdmin ? 'admin' : 'student';
  const visitorEntryBtn = document.querySelector('[data-page="visitorEntrySection"]');
  const myHistoryBtn = document.querySelector('[data-page="myHistorySection"]');
  const dashboardBtn = document.querySelector('[data-page="dashboardSection"]');
  const logsBtn = document.querySelector('[data-page="visitorLogsSection"]');
  const settingsBtn = document.querySelector('[data-page="adminSettingsSection"]');

  if(visitorEntryBtn) visitorEntryBtn.style.display = isAdmin ? 'none' : 'block';
  if(myHistoryBtn) myHistoryBtn.style.display = isAdmin ? 'none' : 'block';
  if(dashboardBtn) dashboardBtn.style.display = isAdmin ? 'block' : 'none';
  if(logsBtn) logsBtn.style.display = isAdmin ? 'block' : 'none';
  if(settingsBtn) settingsBtn.style.display = isAdmin ? 'block' : 'none';

  const target = isAdmin ? 'dashboardSection' : 'visitorEntrySection';
  showPage(target);
}

sidebarBtns.forEach(btn => btn.addEventListener('click', ()=> showPage(btn.dataset.page)));

function getStoredAdminAccounts(){
  const raw = localStorage.getItem(STORAGE.adminAccounts);
  let saved = raw ? JSON.parse(raw) : [];
  if(!Array.isArray(saved)) saved = [];
  const merged = Array.from(new Set([...ACCOUNTS.admins.map(e=>e.toLowerCase()), ...saved.map(e=>e.toLowerCase())]));
  return merged;
}

function saveAdminAccounts(list){
  const normalized = Array.from(new Set(list.map(e=>e.toLowerCase())));
  localStorage.setItem(STORAGE.adminAccounts, JSON.stringify(normalized));
  renderAdminAccounts();
}

function renderAdminAccounts(){
  const adminListEl = document.getElementById('adminList');
  const accounts = getStoredAdminAccounts();
  adminListEl.innerHTML = accounts.map(email => `<li>${email}</li>`).join('');
}

function getBlockedUsers(){
  const raw = localStorage.getItem(STORAGE.blockedUsers);
  let list = raw ? JSON.parse(raw) : [];
  if(!Array.isArray(list)) list = [];
  return list.map(e=>e.toLowerCase());
}

function isAdminEmail(email){
  if(!email) return false;
  const admins = getStoredAdminAccounts();
  return admins.includes(email.toLowerCase());
}

function saveBlockedUsers(arr){
  const normalized = Array.from(new Set(arr.map(e=>e.toLowerCase())));
  localStorage.setItem(STORAGE.blockedUsers, JSON.stringify(normalized));
}

function syncBlockedState(){
  const blockedUsers = getBlockedUsers();
  mockData.forEach(v=>{
    v.blocked = blockedUsers.includes(v.email.toLowerCase());
  });
}

function toggleBlockUser(email){
  const lowerEmail = email.toLowerCase();
  const blocked = getBlockedUsers();
  if(blocked.includes(lowerEmail)){
    const updated = blocked.filter(e => e !== lowerEmail);
    saveBlockedUsers(updated);
    return false;
  } else {
    const updated = [...blocked, lowerEmail];
    saveBlockedUsers(updated);
    return true;
  }
}

function getPeriodStart(period){
  const now = Date.now();
  if(period === 'week'){ return new Date(now - 7 * 24 * 60 * 60 * 1000); }
  if(period === 'month'){ return new Date(now - 30 * 24 * 60 * 60 * 1000); }
  // Day defined as last 24 hours from current moment
  return new Date(now - 24 * 60 * 60 * 1000);
}

function getFilteredData(period){
  const start = getPeriodStart(period);
  return mockData.filter(v => new Date(v.timeIn) >= start);
}

function getPeakHour(data){
  const hourCounts = {};
  data.forEach(v => {
    const hour = new Date(v.timeIn).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });
  if(!Object.keys(hourCounts).length) return '-';
  const peakHour = Object.entries(hourCounts).sort((a,b)=> b[1]-a[1])[0][0];
  const start = String(peakHour).padStart(2,'0') + ':00';
  const end = String((Number(peakHour)+1)%24).padStart(2,'0') + ':00';
  return `${start} - ${end}`;
}

function getActiveCollege(period){
  const filtered = getFilteredData(period);
  if(!filtered.length) return '-';
  const count = {};
  filtered.forEach(v => { const college = v.college || 'Unknown'; count[college] = (count[college] || 0) + 1; });
  return Object.entries(count).sort((a,b)=> b[1]-a[1])[0][0];
}

function reasonBadge(reason){
  const colors = {
    'Study':'bg-emerald-100 text-emerald-800',
    'Research':'bg-blue-100 text-blue-800',
    'Borrowing':'bg-amber-100 text-amber-800',
    'Computer Use':'bg-indigo-100 text-indigo-800',
    'Other':'bg-gray-100 text-gray-800'
  };
  const classes = colors[reason] || colors['Other'];
  return `<span class="text-xs font-semibold px-2 py-1 rounded-full ${classes}">${reason}</span>`;
}

function openVisitorModal(email){
  const visitor = mockData.find(v => v.email.toLowerCase() === email.toLowerCase());
  if(!visitor){ return; }
  const visitCount = mockData.filter(v => v.email.toLowerCase() === email.toLowerCase()).length;
  const initials = visitor.name.split(' ').map(p=>p[0]).join('').toUpperCase().slice(0,2);
  visitorProfileCard.innerHTML = `
    <div class="flex items-center gap-3">
      <div class="h-14 w-14 rounded-full bg-green-200 flex items-center justify-center text-lg font-bold text-green-700">${initials}</div>
      <div>
        <h4 class="text-lg font-semibold">${visitor.name}</h4>
        <p class="text-sm text-gray-500">${visitor.email}</p>
      </div>
    </div>
    <div class="space-y-1 text-sm">
      <div><span class="font-semibold">Student ID:</span> ${visitor.studentId || 'N/A'}</div>
      <div><span class="font-semibold">Level:</span> ${visitor.educationalLevel || 'N/A'}</div>
      <div><span class="font-semibold">College/Program:</span> ${visitor.department || visitor.program || 'N/A'}</div>
      <div><span class="font-semibold">Purpose:</span> ${visitor.reason}</div>
      <div><span class="font-semibold">Time In:</span> ${new Date(visitor.timeIn).toLocaleString()}</div>
    </div>
  `;
  visitorVisitHistory.textContent = `Total visits with this email: ${visitCount}`;
  visitorModal.classList.remove('hidden');
}

// Legacy alias for consistency
const viewVisitorDetails = openVisitorModal;

function renderMyHistory(){
  if(!currentUserEmail){
    myHistoryContainer.innerHTML = '<p class="text-gray-500">No user logged in.</p>';
    myHistoryCount.textContent = 'You have visited the library 0 times.';
    return;
  }

  const emailLower = currentUserEmail.toLowerCase();
  const history = mockData.filter(v => v.email.toLowerCase() === emailLower).sort((a,b)=> new Date(b.timeIn)-new Date(a.timeIn));
  myHistoryCount.textContent = `You have visited the library ${history.length} time${history.length===1?'':'s'}.`;

  if(!history.length){
    myHistoryContainer.innerHTML = '<p class="text-gray-500">No visits yet.</p>';
    return;
  }

  myHistoryContainer.innerHTML = '';
  history.forEach(entry => {
    const card = document.createElement('div');
    const dt = new Date(entry.timeIn);
    card.className = 'p-4 rounded-xl shadow-md bg-white border border-gray-100';
    card.innerHTML = `
      <div class="flex justify-between items-center mb-2">
        <p class="font-semibold text-slate-700">${dt.toLocaleDateString()}</p>
        <span class="text-green-700 font-bold">✔</span>
      </div>
      <div class="space-y-1 text-sm text-gray-700">
        <div><span class="font-semibold">Time-In:</span> ${dt.toLocaleTimeString()}</div>
        <div><span class="font-semibold">Student ID:</span> ${entry.studentId || 'N/A'}</div>
        <div><span class="font-semibold">Level:</span> ${entry.educationalLevel || 'N/A'}</div>
        <div><span class="font-semibold">Department:</span> ${entry.department || entry.program || 'N/A'}</div>
        <div><span class="font-semibold">Purpose:</span> ${entry.reason}</div>
      </div>
    `;
    myHistoryContainer.appendChild(card);
  });
}

function updateStatCards(){
  const now = Date.now();
  const dayStart = now - 24 * 60 * 60 * 1000;
  const weekStart = now - 7 * 24 * 60 * 60 * 1000;
  const monthStart = now - 30 * 24 * 60 * 60 * 1000;

  const d = mockData.filter(v=> new Date(v.timeIn).getTime() >= dayStart).length;
  const w = mockData.filter(v=> new Date(v.timeIn).getTime() >= weekStart).length;
  const m = mockData.filter(v=> new Date(v.timeIn).getTime() >= monthStart).length;
  const blocked = getBlockedUsers().length;
  const undergrad = mockData.filter(v => (v.educationalLevel || 'Undergraduate') === 'Undergraduate').length;
  const graduate = mockData.filter(v => (v.educationalLevel || 'Undergraduate') === 'Graduate').length;

  statToday.textContent = d;
  statWeek.textContent = w;
  statMonth.textContent = m;
  statActiveCollege.textContent = getActiveCollege(selectedPeriod);
  statBlocked.textContent = blocked;
  statUndergrad.textContent = undergrad;
  statGraduate.textContent = graduate;
}

function renderTopColleges(){
  const filtered = getFilteredData(selectedPeriod);
  topCollegesContainer.innerHTML = '';
  if(!filtered.length){
    topCollegesContainer.textContent = 'No data for this period';
    return;
  }

  const counts = filtered.reduce((acc, v) => {
    const c = v.college || 'Unknown'; acc[c] = (acc[c] || 0) + 1; return acc;
  }, {});
  const total = filtered.length;
  const sorted = Object.entries(counts).sort((a,b)=> b[1]-a[1]);

  sorted.forEach(([college, qty], idx) => {
    const pct = Math.round((qty / total) * 100);
    const row = document.createElement('div');
    row.innerHTML = `<div class="flex justify-between text-sm"><span>${idx+1}. ${college}</span><span>${qty} (${pct}%)</span></div>` +
      `<div class="h-2 rounded bg-emerald-100"><div class="h-2 rounded bg-emerald-600" style="width:${pct}%"></div></div>`;
    topCollegesContainer.appendChild(row);
  });
}

function renderVisitReasons(){
  const filtered = getFilteredData(selectedPeriod);
  visitReasonsContainer.innerHTML = '';
  if(!filtered.length){
    visitReasonsContainer.textContent = 'No data for this period';
    return;
  }

  const reasons = ['Study','Research','Borrowing','Computer Use','Other'];
  const counts = reasons.map(r => ({ reason: r, count: filtered.filter(v => v.reason === r).length }));
  const total = filtered.length;

  counts.forEach(({reason, count}) => {
    const pct = total ? Math.round((count / total) * 100) : 0;
    const row = document.createElement('div');
    row.innerHTML = `<div class="flex justify-between text-sm"><span>${reason}</span><span>${count} (${pct}%)</span></div>` +
      `<div class="h-2 rounded bg-blue-100"><div class="h-2 rounded bg-blue-600" style="width:${pct}%"></div></div>`;
    visitReasonsContainer.appendChild(row);
  });
}

function renderCourseDistribution(){
  const filtered = getFilteredData(selectedPeriod);
  const courseContainer = document.getElementById('courseDistribution');
  courseContainer.innerHTML = '';
  if(!filtered.length){
    courseContainer.textContent = 'No data for this period';
    return;
  }

  const counts = {};
  filtered.forEach(v => {
    const program = v.program || 'Unknown';
    counts[program] = (counts[program] || 0) + 1;
  });

  const total = filtered.length;
  const sorted = Object.entries(counts).sort((a,b)=> b[1]-a[1]);

  sorted.forEach(([program, qty])=>{
    const pct = Math.round((qty / total) * 100);
    const row = document.createElement('div');
    row.innerHTML = `<div class="flex justify-between text-sm"><span>${program}</span><span>${qty} (${pct}%)</span></div>` +
      `<div class="h-2 rounded bg-gray-100"><div class="h-2 rounded bg-emerald-600" style="width:${pct}%"></div></div>`;
    courseContainer.appendChild(row);
  });
}

function updateProgramFilter(){
  const programs = Array.from(new Set(mockData.map(v=>v.program || '').filter(Boolean)));
  const select = document.getElementById('programFilter');
  const current = select.value;
  select.innerHTML = '<option value="">All Programs</option>' + programs.map(p=>`<option>${p}</option>`).join('');
  if(programs.includes(current)) select.value = current; else select.value = '';
}

function updateAllStats(){
  updateStatCards();
  renderTopColleges();
  renderVisitReasons();
  renderCourseDistribution();
  updateProgramFilter();
  document.getElementById('peakHour').textContent = getPeakHour(getFilteredData(selectedPeriod));
  renderTable();
  renderMyHistory();
}

const toast = document.getElementById('toast');
function showToast(message){
  toast.textContent = message;
  toast.classList.remove('hidden');
  setTimeout(()=>toast.classList.add('hidden'),2400);
}

function renderTable(){
  const q = searchInput.value.trim().toLowerCase();
  const p = programFilter.value;
  const role = roleFilter ? roleFilter.value : 'all';
  const rows = mockData.filter(v=> {
    const text = [v.name, v.studentId, v.email, v.college, v.program, v.reason, new Date(v.timeIn).toLocaleString()].join(' ').toLowerCase();
    const matchesText = !q || text.includes(q);
    const matchesProgram = !p || v.program === p;
    const matchesRole = role === 'all' || (role === 'admin' && isAdminEmail(v.email)) || (role === 'user' && !isAdminEmail(v.email));
    return matchesText && matchesProgram && matchesRole;
  });

  visitorTable.innerHTML = '';
  if(!rows.length){
    visitorTable.innerHTML = '<tr><td colspan="8" class="p-2 text-gray-500">No visitors found.</td></tr>';
    return;
  }

  rows.sort((a,b)=> new Date(b.timeIn)-new Date(a.timeIn)).forEach((v,i)=>{
    const tr=document.createElement('tr');
    tr.className = `hover:bg-gray-50 cursor-pointer ${v.blocked ? 'bg-red-100' : ''}`;
    tr.innerHTML = `
      <td class="p-2"><span class="font-semibold text-emerald-700">${v.name}</span></td>
      <td class="p-2 text-sm text-gray-600">${v.studentId || 'N/A'}</td>
      <td class="p-2 text-sm text-gray-600">${v.email}</td>
      <td class="p-2">${v.educationalLevel || 'Undergraduate'}</td>
      <td class="p-2">${v.department || v.program || 'Unknown'}</td>
      <td class="p-2">${reasonBadge(v.reason)}</td>
      <td class="p-2">${new Date(v.timeIn).toLocaleString()}</td>
      <td class="p-2"><button data-index="${i}" class="btn-block text-red-600 hover:text-red-800">${v.blocked ? 'Unblock' : 'Block'}</button></td>
    `;
    tr.addEventListener('click', () => openVisitorModal(v.email));
    visitorTable.appendChild(tr);
  });

  visitorTable.querySelectorAll('button[data-index]').forEach(btn=>{
    btn.addEventListener('click',(event)=>{
      event.stopPropagation();
      const i=parseInt(btn.dataset.index,10);
      const user = rows[i];
      const blocked = toggleBlockUser(user.email);
      user.blocked = blocked;
      updateAllStats();
    });
  });
}

function logoutToLogin(){
  appLayout.classList.add('hidden');
  loginModal.classList.remove('hidden');
  emailInput.value = '';
  currentUserEmail = null;
  // reset sections and sidebar
  setSidebarForRole(true);
  updateSidebar('student');
  showPage('visitorEntrySection');
  visitorModal.classList.add('hidden');
}

loginBtn.addEventListener('click',()=>{
  const email=emailInput.value.trim();
  if(!isValidEmail(email)){
    emailError.textContent='Please use a NEU institutional email ending @neu.edu.ph.'; emailError.classList.remove('hidden'); return;
  }
  const blockedUserList = getBlockedUsers();
  if(blockedUserList.includes(email.toLowerCase())){
    emailError.textContent='Your account is restricted.'; emailError.classList.remove('hidden'); return;
  }
  emailError.classList.add('hidden');
  loginModal.classList.add('hidden'); appLayout.classList.remove('hidden');
  const emailNormalized = email.toLowerCase();
  currentUserEmail = emailNormalized;
  const adminAccounts = getStoredAdminAccounts();
  const isAdmin = adminAccounts.includes(emailNormalized);
  updateSidebar(isAdmin ? 'admin' : 'student');
  updateAllStats();
});

logoutBtn.addEventListener('click',()=>{ logoutToLogin(); });

closeVisitorModal.addEventListener('click', ()=>{
  visitorModal.classList.add('hidden');
});
visitorModal.addEventListener('click', (e) => {
  if(e.target === visitorModal){
    visitorModal.classList.add('hidden');
  }
});

// old tab buttons are superseded by sidebar pages
// visitorsTab.addEventListener('click',()=>setActiveTab('user'));
// dashboardTab.addEventListener('click',()=>setActiveTab('admin'));

addAdminBtn.addEventListener('click', ()=>{
  const newEmail = newAdminEmailInput.value.trim().toLowerCase();
  if(!isValidEmail(newEmail)){
    adminAccountMessage.textContent = 'Enter a valid neu.edu.ph email.';
    adminAccountMessage.classList.remove('hidden');
    adminAccountMessage.classList.remove('text-green-600');
    adminAccountMessage.classList.add('text-red-600');
    return;
  }
  const accounts = getStoredAdminAccounts();
  if(accounts.includes(newEmail)){
    adminAccountMessage.textContent = 'This admin account already exists.';
    adminAccountMessage.classList.remove('hidden');
    adminAccountMessage.classList.remove('text-green-600');
    adminAccountMessage.classList.add('text-red-600');
    return;
  }
  saveAdminAccounts([...accounts, newEmail]);
  adminAccountMessage.textContent = 'Admin account added.';
  adminAccountMessage.classList.remove('hidden');
  adminAccountMessage.classList.remove('text-red-600');
  adminAccountMessage.classList.add('text-green-600');
  newAdminEmailInput.value = '';
});

periodButtons.forEach(btn=> btn.addEventListener('click', ()=>{
  selectedPeriod = btn.dataset.period;
  periodButtons.forEach(b=> b.classList.remove('bg-emerald-700','text-white'));
  periodButtons.forEach(b=> b.classList.add('bg-emerald-200','text-emerald-700'));
  btn.classList.remove('bg-emerald-200','text-emerald-700');
  btn.classList.add('bg-emerald-700','text-white');
  updateAllStats();
}));

const educationalLevelEl = document.getElementById('educationalLevel');
const undergradCollegeEl = document.getElementById('undergradCollege');
const gradProgramEl = document.getElementById('gradProgram');
const otherLevelInputEl = document.getElementById('otherLevelInput');

function updateVisitorTypeFields(){
  const role = visitorTypeEl.value;

  if(role === 'employee'){
    educationalSection.classList.add('hidden');
    programSection.classList.add('hidden');
    reasonSection.classList.add('hidden');
    studentIdEl.classList.add('hidden');

    educationalLevelEl.required = false;
    undergradCollegeEl.required = false;
    gradProgramEl.required = false;
    document.getElementById('visitReason').required = false;
    studentIdEl.required = false;

    educationalLevelEl.value = '';
    undergradCollegeEl.value = '';
    gradProgramEl.value = '';
    studentIdEl.value = '';
    otherLevelInputEl.value = '';
    otherLevelInputEl.classList.add('hidden');
    otherLevelInputEl.required = false;
  } else {
    studentIdEl.classList.remove('hidden');
    studentIdEl.required = true;
    educationalSection.classList.remove('hidden');
    programSection.classList.remove('hidden');
    reasonSection.classList.remove('hidden');

    document.getElementById('visitReason').required = true;
    educationalLevelEl.required = true;

    updateLevelFields();
  }
}

function updateLevelFields(){
  const level = educationalLevelEl.value;

  if(level === 'Undergraduate'){
    undergradCollegeEl.classList.remove('hidden');
    undergradCollegeEl.required = true;
    gradProgramEl.classList.add('hidden');
    gradProgramEl.required = false;
    gradProgramEl.value = '';
  } else if(level === 'Graduate'){
    gradProgramEl.classList.remove('hidden');
    gradProgramEl.required = true;
    undergradCollegeEl.classList.add('hidden');
    undergradCollegeEl.required = false;
    undergradCollegeEl.value = '';
  } else {
    undergradCollegeEl.classList.add('hidden');
    gradProgramEl.classList.add('hidden');
    undergradCollegeEl.required = false;
    gradProgramEl.required = false;
    undergradCollegeEl.value = '';
    gradProgramEl.value = '';
  }

  otherLevelInputEl.classList.add('hidden');
  otherLevelInputEl.required = false;
  otherLevelInputEl.value = '';
  checkOthersSelection();
}

function checkOthersSelection(){
  const activeSelection = (educationalLevelEl.value === 'Undergraduate') ? undergradCollegeEl.value : gradProgramEl.value;
  if(activeSelection === 'Others (Please specify)'){
    otherLevelInputEl.classList.remove('hidden');
    otherLevelInputEl.required = true;
    otherLevelInputEl.focus();
  } else {
    otherLevelInputEl.classList.add('hidden');
    otherLevelInputEl.required = false;
    otherLevelInputEl.value = '';
  }
}

visitorTypeEl.addEventListener('change', updateVisitorTypeFields);
educationalLevelEl.addEventListener('change', updateLevelFields);
undergradCollegeEl.addEventListener('change', checkOthersSelection);
gradProgramEl.addEventListener('change', checkOthersSelection);

// initialize on load
updateVisitorTypeFields();
updateLevelFields();

visitorForm.addEventListener('submit', e=>{
  e.preventDefault();
  const n = document.getElementById('visitorName').value.trim();
  const studentId = studentIdEl.value.trim();
  const type = visitorTypeEl.value;
  if(!currentUserEmail){
    alert('Please login first.');
    return;
  }
  const email = currentUserEmail;
  const selectedReason = document.getElementById('visitReason').value;
  const level = document.getElementById('educationalLevel').value;
  const undergrad = document.getElementById('undergradCollege').value;
  const grad = document.getElementById('gradProgram').value;
  const otherLevel = document.getElementById('otherLevelInput').value.trim();

  let reason = selectedReason;
  let department = '';
  let finalLevel = level;

  if(type === 'employee'){
    reason = 'Employee Login';
    department = 'Employee';
    finalLevel = 'Employee';
  } else {
    department = level === 'Undergraduate' ? (undergrad === 'Others (Please specify)' ? otherLevel : undergrad) : (grad === 'Others (Please specify)' ? otherLevel : grad);
  }

  const idPattern = /^\d{2}-\d{5}-\d{3}$/;
  if(type === 'student' && (!studentId || !idPattern.test(studentId))){
    alert('Student ID must be in format ##-#####-###');
    return;
  }

  if(!n || !email || !reason || !department){
    alert('Complete all fields');
    return;
  }

  if(type === 'student' && (!level || !department || !selectedReason)){
    alert('Complete student fields');
    return;
  }

  mockData.unshift({
    name: n,
    email: email,
    studentId: studentId,
    role: type,
    reason: reason,
    program: department,
    department: department,
    educationalLevel: finalLevel,
    timeIn: new Date(),
    blocked: false
  });
  saveMockData();
  visitorForm.reset();
  otherLevelInputEl.classList.add('hidden');
  otherLevelInputEl.value = '';
  updateLevelFields();
  showToast('Welcome to NEU Library!');
  fullScreenMessage.classList.remove('hidden');
  setTimeout(()=>{ fullScreenMessage.classList.add('hidden'); logoutToLogin(); }, 3000);
  updateAllStats();
});

[searchInput,programFilter,roleFilter].forEach(el=>el.addEventListener('input', renderTable));

syncBlockedState();
renderAdminAccounts();
updateSidebar('student');
updateAllStats();
// Google button placeholder message
