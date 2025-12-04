
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

    // 5. Setup Midnight Reload (to clear memory/refresh cache)
    if (config.reloadPageAtMidnight) setupMidnightReload();
}

/* --- LOGIC: MENU RENDERER --- */
function renderMenu(menuItem) {
    const contentEl = document.getElementById('menu-content');
    const dateContainer = document.getElementById('menu-date-container');
    
    // Date Header
    const now = new Date();
    const dateStr = new Intl.DateTimeFormat("sv-SE", { weekday:"long", day:"numeric", month:"long" }).format(now);
    dateContainer.innerHTML = `
        <div class="menu-date-text">${capitalize(dateStr)}</div>
        ${config.lunchTime ? `<div class="menu-time">${config.lunchTime}</div>` : ''}
    `;

    if (!menuItem) {
        contentEl.innerHTML = `<p class="muted">Ingen meny tillgänglig idag.</p>`;
        return;
    }

    // Process Description (HTML to Lines)
    const tmp = document.createElement('div');
    tmp.innerHTML = menuItem.description.replace(/<br\s*\/?>/gi, '\n');
    const lines = (tmp.textContent || "").split('\n').map(s => s.trim()).filter(Boolean);

    // Group Lines (Headers vs Items)
    let html = '<div class="menu-wrap">';
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const isHeader = (line === line.toUpperCase() && line.length > 3); // Simple heuristic
        
        if (isHeader) {
            html += `<div class="menu-section">${escapeHtml(line)}</div>`;
        } else {
            // Check if next line is English (italic)
            let sv = line;
            let en = "";
            // Very basic check: English usually follows Swedish
            if (i + 1 < lines.length && !lines[i+1].includes("Å") && !lines[i+1].includes("Ä") && !lines[i+1].includes("Ö")) {
               // This is a guess, but Compass RSS structure varies. 
               // For now, let's just print every line as an item if it's not a header.
            }
            html += `<div class="menu-item"><div class="sv">${escapeHtml(sv)}</div></div>`;
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
    
    // 3. Update Status Text
    const type = slide.dataset.type;
    const typeMap = { image: 'Info', news: 'Nyheter', menu: 'Meny' };
    statusPill.textContent = typeMap[type] || 'Visar';

    // 4. Load Data if needed (Just-in-Time)
    if (type === 'menu') {
        const item = await loadMenuData(config.compassRssPath);
        renderMenu(item);
    }
    // if (type === 'news') ... we will add this later

    // 5. Timer & Progress Bar
    const duration = parseInt(slide.dataset.duration) || config.defaultDuration;
    
    // Reset Animation
    progressBar.style.transition = 'none';
    progressBar.style.width = '0%';
    
    // Trigger Reflow
    void progressBar.offsetWidth; 
    
    // Start Animation
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
    clockEl.textContent = now.toLocaleString('sv-SE', { 
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

// Start
init();
