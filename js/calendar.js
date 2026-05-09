async function loadCalendar() {
    const homeSection = document.getElementById('home');
    const container = homeSection.querySelector('div');
    container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">Cargando carreras de esta semana...</p>';

    try {
        // Usamos allorigins para evadir CORS al scrapear
        const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent('https://theracingline.app/race-calendar/')}`);
        const data = await response.json();
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(data.contents, 'text/html');
        
        // Scraping the table
        const rows = doc.querySelectorAll('table tbody tr');
        let eventsThisWeek = [];

        // Filtramos y parseamos
        rows.forEach(row => {
            const series = row.querySelector('.series')?.textContent.trim() || '';
            const eventName = row.querySelector('.event')?.textContent.trim() || '';
            const dateStr = row.querySelector('.date')?.textContent.trim() || '';

            // Verificar si la serie existe en nuestra lista (insensible a mayúsculas)
            const matchedCategory = CATEGORIES.find(c => 
                series.toLowerCase().includes(c.name.toLowerCase()) || 
                c.name.toLowerCase().includes(series.toLowerCase())
            );

            if (matchedCategory) {
                eventsThisWeek.push({
                    category: matchedCategory,
                    event: eventName,
                    date: dateStr
                });
            }
        });

        if (eventsThisWeek.length === 0) {
            container.innerHTML = '<p style="text-align: center;">No hay carreras de nuestras categorías esta semana 🏁</p>';
            return;
        }

        // Crear el carrusel
        let html = '<div class="calendar-carousel" style="display: flex; overflow-x: auto; gap: 16px; padding-bottom: 16px;">';
        
        eventsThisWeek.forEach(ev => {
            html += `
                <div style="min-width: 200px; background: rgba(255,255,255,0.05); padding: 16px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
                    <div style="font-size: 10px; color: var(--accent-primary); text-transform: uppercase; margin-bottom: 4px;">${ev.date}</div>
                    <h3 style="font-size: 16px; margin-bottom: 4px;">${ev.category.name}</h3>
                    <p style="font-size: 12px; color: var(--text-secondary);">${ev.event}</p>
                    <button onclick="openCategoryModal(CATEGORIES.find(c => c.id === '${ev.category.id}'))" style="margin-top: 12px; background: var(--surface-color); color: white; border: none; padding: 6px 12px; border-radius: 12px; font-size: 12px; cursor: pointer; width: 100%;">Dónde ver</button>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;

    } catch (error) {
        console.error("Error cargando calendario", error);
        container.innerHTML = '<p style="color: var(--accent-primary); text-align: center;">Error al cargar el calendario. Por favor intenta más tarde.</p>';
    }
}

// Agregar al final de DOMContentLoaded en app.js
document.addEventListener('DOMContentLoaded', () => {
    loadCalendar();
});
