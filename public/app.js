// ==================== VARIABLES ====================
const authScreen = document.getElementById('authScreen');
const appScreen = document.getElementById('appScreen');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const authError = document.getElementById('authError');
const userDisplay = document.getElementById('userDisplay');

const form = document.getElementById('wellnessForm');
const goalsForm = document.getElementById('goalsForm');
const moodCtx = document.getElementById('moodChart')?.getContext('2d');
const correlationCtx = document.getElementById('correlationChart')?.getContext('2d');
const tableBody = document.querySelector('#logsTable tbody');
const goalProgressDiv = document.getElementById('goalProgress');
const themeToggle = document.getElementById('themeToggle');

const avgMoodEl = document.getElementById('avgMood');
const avgSleepEl = document.getElementById('avgSleep');
const totalActivityEl = document.getElementById('totalActivity');
const totalMeditationEl = document.getElementById('totalMeditation');

let currentUser = null;
let moodChartInstance = null;
let correlationChartInstance = null;
let currentGoals = {};

// Set default date
if (document.getElementById('datum')) {
    document.getElementById('datum').valueAsDate = new Date();
}

// ==================== TOAST NOTIFICATIONS ====================
function showToast(message, type = 'info', title = null) {
    const container = document.getElementById('toastContainer');
    if (!container) {
        console.log('Toast container not found');
        return;
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    const titles = {
        success: 'Uspješno!',
        error: 'Greška',
        warning: 'Upozorenje',
        info: 'Informacija'
    };
    
    toast.innerHTML = `
        <span class="toast-icon">${icons[type]}</span>
        <div class="toast-content">
            <div class="toast-title">${title || titles[type]}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.closest('.toast').remove()">&times;</button>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('hiding');
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 4000);
}

// ==================== AUTH MANAGEMENT ====================
async function checkAuth() {
    try {
        const response = await fetch('/api/auth/check', { credentials: 'include' });
        const data = await response.json();
        
        if (data.authenticated) {
            currentUser = data;
            showApp();
        } else {
            showAuth();
        }
    } catch (error) {
        console.error('Auth check error:', error);
        showAuth();
    }
}

function showAuth() {
    if (authScreen) authScreen.classList.remove('hidden');
    if (appScreen) appScreen.classList.add('hidden');
}

function showApp() {
    if (authScreen) authScreen.classList.add('hidden');
    if (appScreen) appScreen.classList.remove('hidden');
    if (userDisplay && currentUser) {
        userDisplay.textContent = `👤 ${currentUser.username}`;
    }
    loadAllData();
    loadGoals();
}

// Tab switching for auth
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const tab = btn.dataset.tab;
        if (tab === 'login') {
            if (loginForm) {
                loginForm.classList.remove('hidden');
            }
            if (registerForm) {
                registerForm.classList.add('hidden');
            }
        } else {
            if (loginForm) {
                loginForm.classList.add('hidden');
            }
            if (registerForm) {
                registerForm.classList.remove('hidden');
            }
        }
        if (authError) authError.textContent = '';
    });
});

// Login
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                currentUser = data;
                showApp();
                showToast(`Dobrodošli, ${data.username}!`, 'success');
            } else {
                showToast(data.error || 'Greška pri prijavi', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            showToast('Greška pri povezivanju sa serverom', 'error');
        }
    });
}

// Register
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('regUsername').value;
        const password = document.getElementById('regPassword').value;
        const passwordConfirm = document.getElementById('regPasswordConfirm').value;
        
        if (password !== passwordConfirm) {
            showToast('Lozinke se ne podudaraju', 'error');
            return;
        }
        
        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                currentUser = data;
                showApp();
                showToast('Registracija uspješna! Dobrodošli!', 'success');
            } else {
                showToast(data.error || 'Greška pri registraciji', 'error');
            }
        } catch (error) {
            console.error('Register error:', error);
            showToast('Greška pri povezivanju sa serverom', 'error');
        }
    });
}

// Logout
async function logout() {
    try {
        await fetch('/api/logout', {
            method: 'POST',
            credentials: 'include'
        });
        currentUser = null;
        showAuth();
        showToast('Odjavili ste se uspješno', 'info');
    } catch (error) {
        console.error('Logout error:', error);
    }
}

document.getElementById('logoutBtn')?.addEventListener('click', logout);
document.getElementById('logoutBtnSettings')?.addEventListener('click', logout);

// ==================== NAVIGATION ====================
const navButtons = document.querySelectorAll('.nav-btn');
const sections = document.querySelectorAll('.app-section');

navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        navButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const sectionId = btn.dataset.section + 'Section';
        sections.forEach(section => {
            section.classList.remove('active');
            if (section.id === sectionId) {
                section.classList.add('active');
            }
        });
        
        if (sectionId === 'dashboardSection') {
            loadAllData();
        }
    });
});

// ==================== DARK MODE ====================
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeButton(savedTheme);
}

if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeButton(newTheme);
    });
}

function updateThemeButton(theme) {
    if (themeToggle) {
        themeToggle.textContent = theme === 'dark' ? '☀️ Light' : '🌙 Dark';
    }
}

// ==================== GOALS ====================
async function loadGoals() {
    try {
        const response = await fetch('/api/goals', { credentials: 'include' });
        if (!response.ok) return;
        
        currentGoals = await response.json();
        
        const goalSleep = document.getElementById('goalSleep');
        const goalActivity = document.getElementById('goalActivity');
        const goalMeditation = document.getElementById('goalMeditation');
        
        if (goalSleep) goalSleep.value = currentGoals.cilj_sati_sna;
        if (goalActivity) goalActivity.value = currentGoals.cilj_aktivnosti_min;
        if (goalMeditation) goalMeditation.value = currentGoals.cilj_meditacije_min;
    } catch (error) {
        console.error('Error loading goals:', error);
    }
}

if (goalsForm) {
    goalsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const goals = {
            cilj_sati_sna: document.getElementById('goalSleep').value,
            cilj_aktivnosti_min: document.getElementById('goalActivity').value,
            cilj_meditacije_min: document.getElementById('goalMeditation').value
        };
        
        try {
            const response = await fetch('/api/goals', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(goals)
            });
            
            if (response.ok) {
                showToast('Ciljevi su uspješno ažurirani!', 'success');
                currentGoals = goals;
                loadAllData();
            } else {
                showToast('Greška pri spremanju ciljeva', 'error');
            }
        } catch (error) {
            console.error('Error saving goals:', error);
            showToast('Greška pri spremanju ciljeva', 'error');
        }
    });
}

// ==================== SAVE DATA ====================
if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            datum: document.getElementById('datum').value,
            aktivnost: document.getElementById('aktivnost').value,
            trajanje_min: document.getElementById('trajanje_min').value,
            sati_sna: document.getElementById('sati_sna').value,
            meditacija_min: document.getElementById('meditacija_min').value,
            raspoloženje: document.getElementById('raspoloženje').value
        };

        try {
            const response = await fetch('/api/log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                showToast('Podaci su uspješno spremljeni!', 'success');
                loadAllData();
                form.reset();
                const datumInput = document.getElementById('datum');
                if (datumInput) datumInput.valueAsDate = new Date();
            } else {
                const error = await response.json();
                showToast(error.error || 'Greška pri spremanju', 'error');
            }
        } catch (error) {
            console.error('Error saving data:', error);
            showToast('Greška pri povezivanju sa serverom', 'error');
        }
    });
}

// ==================== LOAD ALL DATA ====================
async function loadAllData() {
    try {
        const response = await fetch('/api/logs', { credentials: 'include' });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const logs = await response.json();
        console.log('Loaded logs:', logs.length);
        
        updateDashboard(logs);
        updateTable(logs);
        updateCharts(logs);
        updateGoalProgress(logs);
    } catch (error) {
        console.error('Error loading data:', error);
        showToast('Greška pri učitavanju podataka', 'error');
    }
}

// ==================== UPDATE DASHBOARD (TJEDNA STATISTIKA) ====================
function updateDashboard(logs) {
    // Filtriraj samo unose iz zadnjih 7 dana
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    
    const weeklyLogs = logs.filter(log => {
        const logDate = new Date(log.datum);
        return logDate >= oneWeekAgo;
    });
    
    if (weeklyLogs.length === 0) {
        if (avgMoodEl) avgMoodEl.textContent = '-';
        if (avgSleepEl) avgSleepEl.textContent = '-';
        if (totalActivityEl) totalActivityEl.textContent = '-';
        if (totalMeditationEl) totalMeditationEl.textContent = '-';
        return;
    }

    // Računaj prosjeke za zadnjih 7 dana
    const avgMood = (weeklyLogs.reduce((sum, log) => sum + log.raspoloženje, 0) / weeklyLogs.length).toFixed(2);
    const avgSleep = (weeklyLogs.reduce((sum, log) => sum + (log.sati_sna || 0), 0) / weeklyLogs.length).toFixed(1);
    const totalActivity = (weeklyLogs.reduce((sum, log) => sum + (log.trajanje_min || 0), 0) / 60).toFixed(1);
    const totalMeditation = (weeklyLogs.reduce((sum, log) => sum + (log.meditacija_min || 0), 0) / 60).toFixed(1);

    if (avgMoodEl) avgMoodEl.textContent = avgMood;
    if (avgSleepEl) avgSleepEl.textContent = avgSleep;
    if (totalActivityEl) totalActivityEl.textContent = totalActivity;
    if (totalMeditationEl) totalMeditationEl.textContent = totalMeditation;
}

// ==================== UPDATE TABLE ====================
function updateTable(logs) {
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    logs.slice(0, 10).forEach(log => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${log.datum}</td>
            <td>${log.aktivnost}</td>
            <td>${log.sati_sna}h</td>
            <td>${'😊'.repeat(log.raspoloženje)}</td>
            <td><button class="btn-small" onclick="deleteLog(${log.id})">🗑️</button></td>
        `;
        tableBody.appendChild(row);
    });
}

// ==================== DELETE LOG ====================
async function deleteLog(id) {
    if (!confirm('Jeste li sigurni da želite obrisati ovaj unos?')) return;
    
    try {
        const response = await fetch(`/api/log/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (response.ok) {
            showToast('Unos je obrisan', 'info');
            loadAllData();
        } else {
            showToast('Greška pri brisanju', 'error');
        }
    } catch (error) {
        console.error('Error deleting log:', error);
        showToast('Greška pri brisanju', 'error');
    }
}
window.deleteLog = deleteLog;

// ==================== EXPORT CSV ====================
async function exportData() {
    try {
        const response = await fetch('/api/export', { credentials: 'include' });
        if (!response.ok) {
            throw new Error('Export failed');
        }
        
        const logs = await response.json();
        
        if (logs.length === 0) {
            showToast('Nema podataka za izvoz', 'warning');
            return;
        }

        const headers = ['ID', 'Datum', 'Aktivnost', 'Trajanje(min)', 'San(h)', 'Meditacija(min)', 'Raspoloženje'];
        const csvContent = [
            headers.join(','),
            ...logs.map(log => 
                `${log.id},${log.datum},${log.aktivnost},${log.trajanje_min},${log.sati_sna},${log.meditacija_min},${log.raspoloženje}`
            )
        ].join('\n');

        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wellness_data_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        showToast('Podaci uspješno izveženi!', 'success');
    } catch (error) {
        console.error('Error exporting data:', error);
        showToast('Greška pri izvozu podataka', 'error');
    }
}

document.getElementById('exportBtn')?.addEventListener('click', exportData);
document.getElementById('exportBtnSettings')?.addEventListener('click', exportData);

// ==================== REPORT/PRINT ====================
document.getElementById('reportBtn')?.addEventListener('click', () => {
    // Privremeno prikaži settings sekciju i graf
    const allSections = document.querySelectorAll('.app-section');
    const settingsSection = document.getElementById('settingsSection');
    
    // Sakrij sve sekcije
    allSections.forEach(section => {
        section.style.display = 'none';
    });
    
    // Prikaži samo settings
    if (settingsSection) {
        settingsSection.style.display = 'block';
        
        // Sakrij karticu s postavkama, prikaži samo graf
        const cards = settingsSection.querySelectorAll('.card');
        if (cards[0]) cards[0].style.display = 'none';
        if (cards[1]) cards[1].style.display = 'block';
    }
    
    // Pričekaj render pa printaj
    setTimeout(() => {
        window.print();
        
        // Vrati sve na normalno nakon 2 sekunde
        setTimeout(() => {
            allSections.forEach(section => {
                section.style.display = '';
            });
            if (settingsSection) {
                settingsSection.style.display = '';
                if (cards[0]) cards[0].style.display = '';
                if (cards[1]) cards[1].style.display = '';
            }
        }, 2000);
    }, 500);
});
// ==================== GOAL PROGRESS (TJEDNI PROSJEK) ====================
function updateGoalProgress(logs) {
    // Filtriraj samo unose iz zadnjih 7 dana
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    
    const weeklyLogs = logs.filter(log => {
        const logDate = new Date(log.datum);
        return logDate >= oneWeekAgo;
    });
    
    if (!goalProgressDiv || weeklyLogs.length === 0 || !currentGoals.cilj_sati_sna) {
        if (goalProgressDiv) {
            goalProgressDiv.innerHTML = '<p style="text-align:center;color:var(--text-muted);">Unesite podatke za prikaz napretka (zadnjih 7 dana).</p>';
        }
        return;
    }

    const days = weeklyLogs.length;
    const avgSleep = weeklyLogs.reduce((sum, log) => sum + (log.sati_sna || 0), 0) / days;
    const avgActivity = weeklyLogs.reduce((sum, log) => sum + (log.trajanje_min || 0), 0) / days;
    const avgMeditation = weeklyLogs.reduce((sum, log) => sum + (log.meditacija_min || 0), 0) / days;

    const sleepPercent = Math.min(100, (avgSleep / currentGoals.cilj_sati_sna) * 100);
    const activityPercent = Math.min(100, (avgActivity / currentGoals.cilj_aktivnosti_min) * 100);
    const meditationPercent = Math.min(100, (avgMeditation / currentGoals.cilj_meditacije_min) * 100);

    goalProgressDiv.innerHTML = `
        <div class="progress-item">
            <label>😴 San (tjedni prosjek): ${avgSleep.toFixed(1)}h / ${currentGoals.cilj_sati_sna}h (${sleepPercent.toFixed(0)}%)</label>
            <div class="progress-bar">
                <div class="progress-fill ${getClassForPercent(sleepPercent)}" style="width: ${sleepPercent}%"></div>
            </div>
        </div>
        <div class="progress-item">
            <label>🏃 Aktivnost (tjedni prosjek): ${avgActivity.toFixed(0)}min / ${currentGoals.cilj_aktivnosti_min}min (${activityPercent.toFixed(0)}%)</label>
            <div class="progress-bar">
                <div class="progress-fill ${getClassForPercent(activityPercent)}" style="width: ${activityPercent}%"></div>
            </div>
        </div>
        <div class="progress-item">
            <label>🧘 Meditacija (tjedni prosjek): ${avgMeditation.toFixed(0)}min / ${currentGoals.cilj_meditacije_min}min (${meditationPercent.toFixed(0)}%)</label>
            <div class="progress-bar">
                <div class="progress-fill ${getClassForPercent(meditationPercent)}" style="width: ${meditationPercent}%"></div>
            </div>
        </div>
    `;
}

function getClassForPercent(percent) {
    if (percent >= 100) return '';
    if (percent >= 70) return 'warning';
    return 'danger';
}

// ==================== UPDATE CHARTS ====================
function updateCharts(logs) {
    if (!moodCtx || !correlationCtx) {
        console.log('Chart contexts not available');
        return;
    }
    
    if (logs.length === 0) {
        if (moodChartInstance) {
            moodChartInstance.destroy();
            moodChartInstance = null;
        }
        if (correlationChartInstance) {
            correlationChartInstance.destroy();
            correlationChartInstance = null;
        }
        return;
    }
    
    const dates = logs.map(log => log.datum).reverse();
    const moods = logs.map(log => log.raspoloženje).reverse();

    if (moodChartInstance) {
        moodChartInstance.destroy();
        moodChartInstance = null;
    }
    
    try {
        moodChartInstance = new Chart(moodCtx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Raspoloženje',
                    data: moods,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.2)',
                    tension: 0.3,
                    fill: true,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 2,
                plugins: {
                    legend: { display: true, position: 'top' }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 5,
                        ticks: { stepSize: 1 }
                    },
                    x: {
                        ticks: { maxRotation: 45, minRotation: 45 }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error creating mood chart:', error);
    }

    if (correlationChartInstance) {
        correlationChartInstance.destroy();
        correlationChartInstance = null;
    }
    
    try {
        const scatterData = logs
            .filter(log => log.sati_sna && log.raspoloženje)
            .map(log => ({ x: log.sati_sna, y: log.raspoloženje }));
        
        if (scatterData.length > 0) {
            correlationChartInstance = new Chart(correlationCtx, {
                type: 'scatter',
                data: {
                    labels: dates,
                    datasets: [{
                        label: 'San vs. Raspoloženje',
                        data: scatterData,
                        backgroundColor: '#764ba2',
                        pointRadius: 6,
                        pointHoverRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    aspectRatio: 2,
                    plugins: {
                        legend: { display: true, position: 'top' }
                    },
                    scales: {
                        x: { 
                            title: { display: true, text: 'Sati Sna' },
                            min: 0, max: 12, ticks: { stepSize: 1 }
                        },
                        y: { 
                            title: { display: true, text: 'Raspoloženje' },
                            min: 0, max: 6, ticks: { stepSize: 1 }
                        }
                    }
                }
            });
        }
    } catch (error) {
        console.error('Error creating correlation chart:', error);
    }
}

// ==================== INITIALIZATION ====================
console.log('✅ App initialized');
initTheme();
checkAuth();