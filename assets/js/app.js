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
    
    // Date Header
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
        const knownHeaders = [
            "DAGENS VEGETARISKA (SERVERAS ÄVEN PÅ GSK)",
            "DAGENS RÄTT (SERVERAS ÄVEN PÅ GSK)",
        ];
        
        const upperLine = line.toLocaleUpperCase('sv-SE');
        const isHeader = (line === upperLine && line.length > 3) || knownHeaders.some(h => upperLine.includes(h));
        
        if (isHeader) {
            html += `<div class="menu-section">${escapeHtml(line)}</div>`;
        } else {
            html += `<div class="menu-item"><div class="sv">${escapeHtml(line)}</div></div>`;
        }
    }
    html += '</div>';
    contentEl.innerHTML = html;
}

/* --- LOGIC: NEWS RENDERER (NEW) --- */
function renderNews(newsItems) {
    const newsList = document.getElementById('news-list');
    
    // Clear previous content
    newsList.innerHTML = '';

    if (!newsItems || newsItems.length === 0) {
        newsList.innerHTML = '<p class="muted">No news updates at this time.</p>';
        return;
    }

    // Create HTML for each news item
    newsItems.forEach(item => {
        const newsItem = document.createElement('div');
        newsItem.className = 'news-item-card'; // You might need to add styling for this class in CSS
        
        // Inline styles for quick layout, move to CSS later if preferred
        newsItem.style.marginBottom = '1.5rem';
        newsItem.style.borderBottom = '1px solid #ccc';
        newsItem.style.paddingBottom = '1rem';

        newsItem.innerHTML = `
            <h3 style="margin-bottom: 0.5rem; color: #003366;">${escapeHtml(item.Title)}</h3>
            <small style="color: #666; display:block; margin-bottom: 0.5rem;">${escapeHtml(item.Created)}</small>
            <p>${escapeHtml(item.Body)}</p>
        `;
        newsList.appendChild(newsItem);
    });
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

    // 4. Load Data based on type
    if (type === 'menu') {
        const item = await loadMenuData(config.compassRssPath);
        renderMenu(item);
    } 
    else if (type === 'news') {
        const items = await loadNewsData();
        renderNews(items);
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

window.JumpToSlide = showSlide;
