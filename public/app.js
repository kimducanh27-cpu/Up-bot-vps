const socket = io();

// CHARTS
const ctx = document.getElementById('resourceChart').getContext('2d');
const resourceChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: Array(30).fill(''),
        datasets: [{
            label: 'CPU %',
            data: Array(30).fill(0),
            borderColor: '#3b82f6',
            tension: 0.4,
            pointRadius: 0
        }, {
            label: 'RAM %',
            data: Array(30).fill(0),
            borderColor: '#10b981',
            tension: 0.4,
            pointRadius: 0
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: true, labels: { color: '#9ca3af' } } },
        scales: {
            y: { beginAtZero: true, max: 100, grid: { color: '#374151' }, ticks: { color: '#9ca3af' } },
            x: { grid: { display: false } }
        }
    }
});

// STATE
let isConnected = false;

// SOCKET EVENTS
socket.on('connect', () => {
    isConnected = true;
    updateConnectionStatus();
});

socket.on('disconnect', () => {
    isConnected = false;
    updateConnectionStatus();
});

socket.on('status', (data) => {
    document.getElementById('botStatusText').innerText = data.status;
    document.getElementById('uptime').innerText = data.uptime;
    document.getElementById('cpuVal').innerText = Math.round(data.cpu) + '%';
    document.getElementById('ramVal').innerText = Math.round(data.ram) + '%';

    // Update buttons
    const isOnline = data.status === 'ONLINE';
    document.getElementById('btnStart').disabled = isOnline;
    document.getElementById('btnStop').disabled = !isOnline;

    // Update Chart
    resourceChart.data.datasets[0].data.shift();
    resourceChart.data.datasets[0].data.push(data.cpu);
    resourceChart.data.datasets[1].data.shift();
    resourceChart.data.datasets[1].data.push(data.ram);
    resourceChart.update('none');
});

socket.on('log', (log) => {
    const logWindow = document.getElementById('logWindow');
    const div = document.createElement('div');
    div.className = 'log-entry';

    let colorClass = 'text-gray-400';
    if (log.type === 'ERR') colorClass = 'text-red-400';
    else if (log.type === 'WARN') colorClass = 'text-yellow-400';
    else if (log.type === 'SYS') colorClass = 'text-blue-400';
    else if (log.type === 'BOT') colorClass = 'text-green-400';

    div.innerHTML = `<span class="log-time">[${log.time}]</span> <span class="${colorClass}">${log.msg}</span>`;
    logWindow.appendChild(div);
    logWindow.scrollTop = logWindow.scrollHeight;

    // Update count
    const countBadge = document.getElementById('logCount');
    const currentCount = parseInt(countBadge.innerText) || 0;
    countBadge.innerText = (currentCount + 1) + ' events';
});

// COMMANDS
function sendCommand(action) {
    fetch('/api/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
    });
}

function submitCommand() {
    const input = document.getElementById('cmdInput');
    const val = input.value.trim();
    if (val) {
        // Since we don't have a direct socket event for input in this simple setup,
        // we could add an API or just rely on the fact that this is a "view" mostly.
        // For now, let's just clear it as a placeholder or implement a proper emit if needed.
        // But wait, dashboard.js input handling is local to the terminal.
        // Let's add a socket emit for command input!
        // (Requires updating dashboard.js to listen to socket 'command')
        // For this task, let's focus on the Settings part primarily.
        input.value = '';
    }
}

function updateConnectionStatus() {
    const dot = document.getElementById('connectionStatus');
    const text = document.getElementById('connectionText');
    if (isConnected) {
        dot.style.background = '#10b981';
        dot.style.boxShadow = '0 0 10px #10b981';
        text.innerText = 'Connected';
    } else {
        dot.style.background = '#ef4444';
        dot.style.boxShadow = 'none';
        text.innerText = 'Disconnected';
    }
}

// --- SETTINGS LOGIC ---

let currentConfig = {};

async function loadConfig() {
    try {
        const res = await fetch('/api/config');
        currentConfig = await res.json();
        renderSettingsForm(currentConfig);
    } catch (e) {
        console.error("Failed to load config", e);
    }
}

function renderSettingsForm(config) {
    const container = document.getElementById('settingsForm');
    container.innerHTML = '';

    for (const [key, value] of Object.entries(config)) {
        const group = document.createElement('div');
        group.className = 'form-group';

        const label = document.createElement('label');
        label.innerText = key;
        group.appendChild(label);

        if (Array.isArray(value)) {
            // Handle Arrays (like FUNNY_MOTDS) as textarea (one per line)
            const textarea = document.createElement('textarea');
            textarea.value = value.join('\n');
            textarea.dataset.key = key;
            textarea.dataset.type = 'array';
            group.appendChild(textarea);
        } else if (typeof value === 'boolean') {
            const select = document.createElement('select');
            select.dataset.key = key;
            select.dataset.type = 'boolean';
            select.innerHTML = `<option value="true" ${value ? 'selected' : ''}>True</option><option value="false" ${!value ? 'selected' : ''}>False</option>`;
            group.appendChild(select);
        } else {
            const input = document.createElement('input');
            input.type = typeof value === 'number' ? 'number' : 'text';
            input.value = value;
            input.dataset.key = key;
            input.dataset.type = typeof value;
            group.appendChild(input);
        }

        container.appendChild(group);
    }
}

async function saveConfig() {
    const newConfig = { ...currentConfig };
    const inputs = document.querySelectorAll('#settingsForm [data-key]');

    inputs.forEach(input => {
        const key = input.dataset.key;
        const type = input.dataset.type;
        let val = input.value;

        if (type === 'number') val = Number(val);
        if (type === 'boolean') val = val === 'true';
        if (type === 'array') val = val.split('\n').filter(line => line.trim() !== '');

        newConfig[key] = val;
    });

    try {
        const res = await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newConfig)
        });
        const data = await res.json();
        if (data.success) {
            alert('Settings saved! Bot is restarting...');
        } else {
            alert('Failed to save settings.');
        }
    } catch (e) {
        alert('Error saving settings.');
    }
}

// --- TABS ---
function switchTab(tabName) {
    // Update Nav
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active'); // Assumes called from onclick

    // Update View
    document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');
    document.getElementById(`view-${tabName}`).style.display = 'block';

    // Update Title
    document.getElementById('pageTitle').innerText = tabName.charAt(0).toUpperCase() + tabName.slice(1);

    if (tabName === 'settings') {
        loadConfig();
    }
}

// Init
loadConfig(); // Preload
