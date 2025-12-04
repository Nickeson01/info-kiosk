
/* data-loader.js - Handles fetching XML/JSON data */

// Helper: Fetch Text
async function fetchText(url) {
    const res = await fetch(url + '?v=' + Date.now()); // bust cache
    if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
    return await res.text();
}

// Helper: Parse Compass RSS
function parseCompassRss(xmlText) {
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, "text/xml");
    const items = Array.from(xml.querySelectorAll("item"));
    
    return items.map(it => ({
        title: it.querySelector("title")?.textContent?.trim() || "",
        description: it.querySelector("description")?.textContent || "",
        pubDate: it.querySelector("pubDate")?.textContent || ""
    }));
}

// Helper: Pick today's menu from the list
function getTodaysMenu(items) {
    const today = new Date();
    const ymd = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const todayStr = ymd(today);
    
    // 1. Try matching exact date
    const byDate = items.find(it => {
        const d = new Date(it.pubDate);
        return !isNaN(d) && ymd(d) === todayStr;
    });
    if (byDate) return byDate;

    // 2. Fallback: Match day name in Swedish (e.g., "måndag")
    const dayName = new Intl.DateTimeFormat("sv-SE", { weekday: "long" }).format(today).toLowerCase();
    return items.find(it => 
        (it.title || "").toLowerCase().includes(dayName) || 
        (it.description || "").toLowerCase().includes(dayName)
    ) || null;
}

// --- EXPORTED FUNCTIONS ---

export async function loadMenuData(rssUrl) {
    try {
        const xmlText = await fetchText(rssUrl);
        const allItems = parseCompassRss(xmlText);
        const todayItem = getTodaysMenu(allItems);
        return todayItem; // Returns the single item object or null
    } catch (e) {
        console.error("Menu load error:", e);
        return null;
    }
}

export async function loadNewsData() {
    // Placeholder: We will connect this to company_news.json later
    // For now, returning an empty array so code doesn't break
    return []; 
}
