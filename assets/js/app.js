import { loadMenuData, loadNewsData } from './data-loader.js';

/* --- STATE & CONFIG --- */
let config = { defaultDuration: 15, lunchTime: "" };
let slideIndex = 0;
let nextTimer = null;

/* --- DOM ELEMENTS --- */
const slides = Array.from(document.querySelectorAll('.slide'));
const progressBar = document.getElementById('progressbar');
const statusPill = document.getElementById('status-pill');
const clockEl = document.getElementById('clock');

/* --- INITIALIZATION --- */
async function init() {
    // 1. Load Config
    try {
        const res = await fetch('content_config.json');
        const json = await res.json();
        config = { ...config, ...json };
    } catch (e) { console.warn("Using default config"); }

    // 2. Start Clock
    setInterval(updateClock, 1000);
    updateClock();

    // 3. Setup Fullscreen Button
    document.getElementById('fs-toggle').addEventListener('click', () => {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen();
        else document.exitFullscreen();
    });

    // 4. Start Slideshow
    showSlide(0);

    // 5. Setup Midnight Reload
    if (config.reloadPageAtMidnight) setupMidnightReload();
}

/* --- LOGIC: MENU RENDERER --- */
function renderMenu(menuItem) {
    const contentEl = document.getElementById('menu-content');
    const dateContainer = document.getElementById('menu-date-container');
    
    // Date Header (Using en-GB for nice English formatting)
    const now = new Date();
    const dateStr = new Intl.DateTimeFormat("en-GB", { weekday:"long", day:"numeric", month:"long" }).format(now);
    dateContainer.innerHTML = `
        <div class="menu-date-text">${capitalize(dateStr)}</div>
        ${config.lunchTime ? `<div class="menu-time">${config.lunchTime}</div>` : ''}
    `;

    if (!menuItem) {
        contentEl.innerHTML = `<p class="muted">No menu available today.</p>`;
        return;
    }

    // Process Description
    const tmp = document.createElement('div');
    tmp.innerHTML = menuItem.description.replace(/<br\s*\/?>/gi, '\n');
    const lines = (tmp.textContent || "").split('\n').map(s => s.trim()).filter(Boolean);

    // Group Lines
    let html = '<div class="menu-wrap">';
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Heuristic: Uppercase lines are usually Headers (e.g. "DAGENS RÄTT")
        const isHeader = (line === line.toUpperCase() && line.length > 3); 
        
        if (isHeader) {
            html += `<div class="menu-section">${escapeHtml(line)}</div>`;
        } else {
            // Note: The dish names themselves will likely remain in Swedish 
            // because they come directly from the Compass RSS feed.
            html += `<div class="menu-item"><div class="sv">${escapeHtml(line)}</div></div>`;
        }
    }
    html += '</div>';
    contentEl.innerHTML = html;
}

/* --- LOGIC: SLIDESHOW --- */
async function showSlide(index) {
    // 1. Cleanup previous
    slides.forEach(s => s.classList.remove('active'));
    
    // 2. Activate new
    const slide = slides[index];
    slide.classList.add('active');
    
    // 3. Update Status Text (English)
    const type = slide.dataset.type;
    const typeMap = { image: 'Info', news: 'News', menu: 'Menu' };
    statusPill.textContent = typeMap[type] || 'Showing';

    // 4. Load Data
    if (type === 'menu') {
        const item = await loadMenuData(config.compassRssPath);
        renderMenu(item);
    }

    // 5. Timer & Progress Bar
    const duration = parseInt(slide.dataset.duration) || config.defaultDuration;
    
    progressBar.style.transition = 'none';
    progressBar.style.width = '0%';
    void progressBar.offsetWidth; // Trigger reflow
    progressBar.style.transition = `width ${duration}s linear`;
    progressBar.style.width = '100%';

    // Queue Next
    clearTimeout(nextTimer);
    nextTimer = setTimeout(() => {
        slideIndex = (slideIndex + 1) % slides.length;
        showSlide(slideIndex);
    }, duration * 1000);
}

/* --- UTILS --- */
function updateClock() {
    const now = new Date();
    // Use en-GB to keep 24h format (14:00) but English text (Thu, 4 Dec)
    clockEl.textContent = now.toLocaleString('en-GB', { 
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
}
function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
function escapeHtml(s) { return (s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function setupMidnightReload() {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
    setTimeout(() => location.reload(), midnight - now);
}

init();

window.kioskJumpTo = showSlide;
