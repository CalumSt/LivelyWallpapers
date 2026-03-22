// ═══════════════════════════════════════════════════════════════════════════
// GRADIENTS — WebGL wallpaper engine
// Shader source lives in index.html as <script type="x-shader/x-fragment">.
// ═══════════════════════════════════════════════════════════════════════════

const modeNames = [
    "Accretion",
    "Aurora",
    "Chromatic Pulse",
    "Fluid",
    "Gradient Mesh",
    "Caustic Shore",
    "Golden Hour Sky"
];

// ── SVG icons ─────────────────────────────────────────────────────────────────
const SVG_SUN = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="4.5" stroke="white" stroke-width="1.1"/>
    <line x1="12" y1="2"   x2="12" y2="5"   stroke="white" stroke-width="1.1" stroke-linecap="round"/>
    <line x1="12" y1="19"  x2="12" y2="22"  stroke="white" stroke-width="1.1" stroke-linecap="round"/>
    <line x1="2"  y1="12"  x2="5"  y2="12"  stroke="white" stroke-width="1.1" stroke-linecap="round"/>
    <line x1="19" y1="12"  x2="22" y2="12"  stroke="white" stroke-width="1.1" stroke-linecap="round"/>
    <line x1="4.93"  y1="4.93"  x2="7.05"  y2="7.05"  stroke="white" stroke-width="1.1" stroke-linecap="round"/>
    <line x1="16.95" y1="16.95" x2="19.07" y2="19.07" stroke="white" stroke-width="1.1" stroke-linecap="round"/>
    <line x1="4.93"  y1="19.07" x2="7.05"  y2="16.95" stroke="white" stroke-width="1.1" stroke-linecap="round"/>
    <line x1="16.95" y1="7.05"  x2="19.07" y2="4.93"  stroke="white" stroke-width="1.1" stroke-linecap="round"/>
</svg>`;

const SVG_MOON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"
          stroke="white" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

// ── Colour helpers ────────────────────────────────────────────────────────────
function hex(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

// ── Vibe definitions ──────────────────────────────────────────────────────────
const vibes = [
    // ── Dark ──────────────────────────────────────────────────────────────────
    { name: "Interstellar",  a: hex("#000005"), b: hex("#ffc187"), c: hex("#00B4CC"), grain: 0.09, mode: 0, dark: true  },
    { name: "Nordic Night",  a: hex("#010A12"), b: hex("#00E87A"), c: hex("#C040FF"), grain: 0.09, mode: 1, dark: true  },
    { name: "MBV",           a: hex("#0d0010"), b: hex("#d91661"), c: hex("#fad1d6"), grain: 0.18, mode: 3, dark: true  },
    { name: "Abyssal",       a: hex("#00050a"), b: hex("#00857a"), c: hex("#0ad1b8"), grain: 0.11, mode: 3, dark: true  },
    { name: "Desert Wind",   a: hex("#0f0603"), b: hex("#C1440E"), c: hex("#E8C97A"), grain: 0.14, mode: 0, dark: true  },
    { name: "Cloud Chamber", a: hex("#03050D"), b: hex("#2A4A6B"), c: hex("#B8D8E8"), grain: 0.22, mode: 3, dark: true  },
    { name: "Permafrost",    a: hex("#060A10"), b: hex("#2D6A9F"), c: hex("#E8F4FF"), grain: 0.09, mode: 2, dark: true  },
    // ── Light ─────────────────────────────────────────────────────────────────
    { name: "Golden Hour",   a: hex("#FFD166"), b: hex("#FFB085"), c: hex("#FF6B9D"), grain: 0.11, mode: 6, dark: false },
    { name: "Cloud Nine",    a: hex("#809ec7"), b: hex("#f2f7ff"), c: hex("#adc2f5"), grain: 0.05, mode: 3, dark: false },
    { name: "Silk",          a: hex("#C8A882"), b: hex("#F5ECD7"), c: hex("#E8B4B8"), grain: 0.07, mode: 4, dark: false },
    { name: "Seaside",       a: hex("#04303D"), b: hex("#C89B4A"), c: hex("#E8F5F5"), grain: 0.10, mode: 5, dark: false },
    { name: "Dusk",          a: hex("#1A0533"), b: hex("#C2548A"), c: hex("#B8A9D9"), grain: 0.09, mode: 4, dark: false },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function randFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function vibeIdx(v)    { return vibes.indexOf(v); }
function lerp(a, b, t) { return a + (b - a) * t; }
function smoothstep(x) { return x * x * (3 - 2 * x); }
function pad2(n)        { return String(n).padStart(2, '0'); }

// ── State ─────────────────────────────────────────────────────────────────────
let currentIdx = Math.floor(Math.random() * vibes.length);
let state = {
    a:     [...vibes[currentIdx].a],
    b:     [...vibes[currentIdx].b],
    c:     [...vibes[currentIdx].c],
    modeA: vibes[currentIdx].mode,
    modeB: vibes[currentIdx].mode,
    frac:  1.0
};

// ── Mouse / gyro parallax ─────────────────────────────────────────────────────
let rawMouse    = [0, 0];
let smoothMouse = [0, 0];

window.addEventListener('mousemove', e => {
    rawMouse[0] =  (e.clientX / window.innerWidth  - 0.5);
    rawMouse[1] = -(e.clientY / window.innerHeight - 0.5);
});
if (window.DeviceOrientationEvent) {
    window.addEventListener('deviceorientation', e => {
        if (e.gamma != null && e.beta != null) {
            rawMouse[0] = Math.max(-0.5, Math.min(0.5,  e.gamma / 45));
            rawMouse[1] = Math.max(-0.5, Math.min(0.5, (e.beta - 45) / 45));
        }
    });
}

// ── WebGL setup ───────────────────────────────────────────────────────────────
const canvas = document.getElementById('canvas');
const gl     = canvas.getContext('webgl');
const fsrc   = document.getElementById('fragmentShader').text;
const vsrc   = `attribute vec2 position; void main(){ gl_Position = vec4(position, 0, 1); }`;

function mkShader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
}

const prog = gl.createProgram();
gl.attachShader(prog, mkShader(gl.VERTEX_SHADER,   vsrc));
gl.attachShader(prog, mkShader(gl.FRAGMENT_SHADER, fsrc));
gl.linkProgram(prog);
gl.useProgram(prog);

const buf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buf);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
const posLoc = gl.getAttribLocation(prog, 'position');
gl.enableVertexAttribArray(posLoc);
gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

const U = {
    time:     gl.getUniformLocation(prog, 'u_time'),
    res:      gl.getUniformLocation(prog, 'u_resolution'),
    colA:     gl.getUniformLocation(prog, 'u_colA'),
    colB:     gl.getUniformLocation(prog, 'u_colB'),
    colC:     gl.getUniformLocation(prog, 'u_colC'),
    grain:    gl.getUniformLocation(prog, 'u_grain'),
    modeA:    gl.getUniformLocation(prog, 'u_modeA'),
    modeB:    gl.getUniformLocation(prog, 'u_modeB'),
    modeFrac: gl.getUniformLocation(prog, 'u_modeFrac'),
    mouse:    gl.getUniformLocation(prog, 'u_mouse'),
};

// ── Resize ────────────────────────────────────────────────────────────────────
let lastW = 0, lastH = 0;
function resizeIfNeeded() {
    const w = window.innerWidth, h = window.innerHeight;
    if (w !== lastW || h !== lastH) {
        canvas.width = w; canvas.height = h;
        gl.viewport(0, 0, w, h);
        lastW = w; lastH = h;
    }
}
window.addEventListener('resize', resizeIfNeeded);
resizeIfNeeded();

// ── Auto-rotation ─────────────────────────────────────────────────────────────
const TARGET_FPS = 30;
const FRAME_MS   = 1000 / TARGET_FPS;
let   lastFrame  = 0;

const AUTO_MS = 30 * 60 * 1000;
let   nextChangeAt = Date.now() + AUTO_MS;

function autoRotate() {
    const isDark = vibes[currentIdx].dark;
    const pool   = vibes.filter((v, i) => v.dark === isDark && i !== currentIdx);
    if (pool.length === 0) return;
    setVibe(vibeIdx(randFrom(pool)));
}

function updateCountdown() {
    const now  = new Date();
    const date = `${pad2(now.getDate())}-${pad2(now.getMonth()+1)}-${now.getFullYear()}`;
    const time = `${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;
    const rem  = Math.max(0, nextChangeAt - Date.now());
    document.getElementById('countdown').innerText =
        `${date}  ${time}  ·  next wallpaper in ${pad2(Math.floor(rem/60000))}:${pad2(Math.floor((rem%60000)/1000))}`;
}

setInterval(() => {
    if (Date.now() >= nextChangeAt) {
        autoRotate();
        nextChangeAt = Date.now() + AUTO_MS;
    }
    updateCountdown();
}, 1000);

// ── Vibe switching ────────────────────────────────────────────────────────────
function updateThemeIcon() {
    document.getElementById('themeBtn').innerHTML =
        vibes[currentIdx].dark ? SVG_MOON : SVG_SUN;
}

function setVibe(idx) {
    currentIdx = idx;
    const v = vibes[idx];
    state.modeA = state.modeB;
    state.modeB = v.mode;
    state.frac  = 0.0;
    document.getElementById('vibeName').innerText  = v.name;
    document.getElementById('modeLabel').innerText = modeNames[v.mode];
    updateThemeIcon();
}

function changeVibe(dir) {
    setVibe((currentIdx + dir + vibes.length) % vibes.length);
    nextChangeAt = Date.now() + AUTO_MS;
}

function switchTheme() {
    const wantDark = !vibes[currentIdx].dark;
    const pool = vibes.filter(v => v.dark === wantDark);
    if (pool.length === 0) return;
    setVibe(vibeIdx(randFrom(pool)));
    nextChangeAt = Date.now() + AUTO_MS;
}

window.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp')           changeVibe(-1);
    if (e.key === 'ArrowDown')         changeVibe(1);
    if (e.key === ' ')                 switchTheme();
    if (e.key === 'm' || e.key === 'M') toggleMonitor();
});

// ── Init UI ───────────────────────────────────────────────────────────────────
document.getElementById('vibeName').innerText  = vibes[currentIdx].name;
document.getElementById('modeLabel').innerText = modeNames[vibes[currentIdx].mode];
updateThemeIcon();
updateCountdown();

// ── Render loop ───────────────────────────────────────────────────────────────
function render(now) {
    requestAnimationFrame(render);
    if (now - lastFrame < FRAME_MS) return;
    lastFrame = now - ((now - lastFrame) % FRAME_MS);

    resizeIfNeeded();

    // Smooth mouse
    const inertia = 0.06;
    smoothMouse[0] = lerp(smoothMouse[0], rawMouse[0], inertia);
    smoothMouse[1] = lerp(smoothMouse[1], rawMouse[1], inertia);

    // Colour lerp
    const v = vibes[currentIdx], s = 0.032;
    for (let i = 0; i < 3; i++) {
        state.a[i] = lerp(state.a[i], v.a[i], s);
        state.b[i] = lerp(state.b[i], v.b[i], s);
        state.c[i] = lerp(state.c[i], v.c[i], s);
    }

    // Mode crossfade
    if (state.frac < 1.0) {
        state.frac = Math.min(1.0, state.frac + 0.018);
        if (state.frac >= 1.0) state.modeA = state.modeB;
    }

    // Upload uniforms
    gl.uniform1f(U.time,     now * 0.001);
    gl.uniform2f(U.res,      canvas.width, canvas.height);
    gl.uniform3fv(U.colA,    state.a);
    gl.uniform3fv(U.colB,    state.b);
    gl.uniform3fv(U.colC,    state.c);
    gl.uniform1f(U.grain,    v.grain);
    gl.uniform1f(U.modeA,    state.modeA);
    gl.uniform1f(U.modeB,    state.modeB);
    gl.uniform1f(U.modeFrac, smoothstep(state.frac));
    gl.uniform2f(U.mouse,    smoothMouse[0], smoothMouse[1]);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

requestAnimationFrame(render);