// ═══════════════════════════════════════════════════════════════════════════
// SYSTEM MONITOR
// Reads live data from Lively's livelySystemInformation callback.
// Falls back to a random-walk simulation when not running inside Lively.
// ═══════════════════════════════════════════════════════════════════════════

// ── Panel toggle ─────────────────────────────────────────────────────────────
let monitorOpen = false;
function toggleMonitor() {
    monitorOpen = !monitorOpen;
    document.getElementById('monitor').classList.toggle('open', monitorOpen);
    document.body.classList.toggle('monitor-open', monitorOpen);
}

// ── Sparkline history ─────────────────────────────────────────────────────────
const SPARK_LEN = 60;
const sparkData = {
    cpu: new Array(SPARK_LEN).fill(0),
    gpu: new Array(SPARK_LEN).fill(0)
};

function pushSpark(key, val) {
    sparkData[key].push(val);
    if (sparkData[key].length > SPARK_LEN) sparkData[key].shift();
}

function drawSparkline(canvasId, data, colour) {
    const cv = document.getElementById(canvasId);
    if (!cv) return;
    const W = cv.offsetWidth || 244, H = 28;
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    if (data.length < 2) return;
    ctx.beginPath();
    ctx.strokeStyle = colour;
    ctx.lineWidth = 1.2;
    ctx.lineJoin = 'round';
    data.forEach((v, i) => {
        const x = (i / (SPARK_LEN - 1)) * W;
        const y = H - (v / 100) * H;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
    ctx.fillStyle = colour.replace(')', ',0.08)').replace('rgb', 'rgba');
    ctx.fill();
}

// ── DOM helpers ───────────────────────────────────────────────────────────────
function setBar(id, pct) {
    const el = document.getElementById(id);
    if (el) el.style.width = Math.min(100, Math.max(0, pct)).toFixed(1) + '%';
}
function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.innerText = val;
}
function fmtBytes(mb) {
    if (mb >= 1024) return (mb / 1024).toFixed(1) + ' GB';
    return mb.toFixed(0) + ' MB';
}
function fmtNet(bytes) {
    const mb = (bytes * 8) / (1024 * 1024);
    if (mb < 1) return (mb * 1000).toFixed(0) + ' Kb/s';
    return mb.toFixed(2) + ' Mb/s';
}

// ── Monitor update ────────────────────────────────────────────────────────────
let peakDown = 1, peakUp = 1;

function updateMonitor(obj) {
    // CPU
    const cpu = obj.CurrentCpu ?? 0;
    setText('cpu-name', obj.NameCpu ?? 'CPU');
    setText('cpu-val', cpu.toFixed(1) + '%');
    setBar('cpu-bar', cpu);
    pushSpark('cpu', cpu);
    drawSparkline('cpu-spark', sparkData.cpu, 'rgb(0,180,204)');

    // GPU
    const gpu = obj.CurrentGpu3D ?? 0;
    setText('gpu-name', obj.NameGpu ?? 'GPU');
    setText('gpu-val', gpu.toFixed(1) + '%');
    setBar('gpu-bar', gpu);
    pushSpark('gpu', gpu);
    drawSparkline('gpu-spark', sparkData.gpu, 'rgb(192,64,255)');

    // RAM
    const total = obj.TotalRam ?? 0;
    const avail = obj.CurrentRamAvail ?? 0;
    const used  = total - avail;
    const ramPct = total > 0 ? (used / total) * 100 : 0;
    setText('ram-val',   fmtBytes(used) + ' / ' + fmtBytes(total));
    setText('ram-total', fmtBytes(total));
    setText('ram-avail', fmtBytes(avail));
    setBar('ram-bar', ramPct);

    // Network
    const down = obj.CurrentNetDown ?? 0;
    const up   = obj.CurrentNetUp   ?? 0;
    peakDown = Math.max(peakDown, down, 1);
    peakUp   = Math.max(peakUp,   up,   1);
    setText('net-name',  obj.NameNetCard ?? '');
    setText('net-down',  fmtNet(down));
    setText('net-up',    fmtNet(up));
    setBar('net-down-bar', (down / peakDown) * 100);
    setBar('net-up-bar',   (up   / peakUp)   * 100);
}

// ── Lively callback ───────────────────────────────────────────────────────────
// Must be a global named exactly livelySystemInformation.
let livelyReceived = false;
window.livelySystemInformation = function(data) {
    livelyReceived = true;
    document.getElementById('lively-notice').style.display = 'none';
    try { updateMonitor(JSON.parse(data)); } catch(e) {}
};

// ── Simulation fallback ───────────────────────────────────────────────────────
let simCpu = 15, simGpu = 8;
function simulateStats() {
    if (livelyReceived) return;
    simCpu = Math.max(2,  Math.min(98, simCpu + (Math.random() - 0.48) * 4));
    simGpu = Math.max(1,  Math.min(95, simGpu + (Math.random() - 0.49) * 3));
    updateMonitor({
        NameCpu:          'CPU (simulated)',
        CurrentCpu:       simCpu,
        NameGpu:          'GPU (simulated)',
        CurrentGpu3D:     simGpu,
        TotalRam:         32768,
        CurrentRamAvail:  32768 - 12000 + (Math.random() - 0.5) * 800,
        NameNetCard:      'Network (simulated)',
        CurrentNetDown:   Math.random() * 5 * 131072,
        CurrentNetUp:     Math.random() * 1 * 131072,
    });
    document.getElementById('lively-notice').style.display = 'block';
}
setInterval(simulateStats, 1000);

// ── Clock ─────────────────────────────────────────────────────────────────────
function updateMonClock() {
    const now    = new Date();
    const h      = String(now.getHours()).padStart(2, '0');
    const m      = String(now.getMinutes()).padStart(2, '0');
    const s      = String(now.getSeconds()).padStart(2, '0');
    const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    setText('mon-clock', `${h}:${m}:${s}`);
    setText('mon-date',  `${days[now.getDay()]}  ${now.getDate()} ${months[now.getMonth()]}  ${now.getFullYear()}`);
}
setInterval(updateMonClock, 1000);
updateMonClock();m