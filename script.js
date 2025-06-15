// Import createClient z wersji ESM
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Inicjalizacja klienta
const supabaseUrl = 'https://xtowjourhfikxzssjdvd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0b3dqb3VyaGZpa3h6c3NqZHZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1NTU1NTgsImV4cCI6MjA2NTEzMTU1OH0.j76EJctT6cAXav5JV0100cJI8gLb58sKU7Uqv7n_SiU';
const supabase = createClient(supabaseUrl, supabaseKey);

// Test połączenia z bazą
async function testConnection() {
    try {
        const { data, error } = await supabase
            .from('smoking_logs')
            .select('*')
            .limit(1);

        if (error) throw error;
        console.log('Połączenie z Supabase działa poprawnie');
        return true;
    } catch (error) {
        console.error('Błąd połączenia z Supabase:', error);
        alert('Błąd połączenia z bazą danych. Sprawdź konsolę dla szczegółów.');
        return false;
    }
}

// Elementy DOM
const burnBtn = document.getElementById('burn-btn');
const todayCountEl = document.getElementById('today-count');
const lastTimeEl = document.getElementById('last-time');
const historyList = document.getElementById('history-list');
const summaryList = document.getElementById('summary-list');

// Formatowanie daty
function formatDate(date) {
    const d = new Date(date);
    return d.toLocaleString('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Pobierz dzisiejsze papierosy
async function getTodayCigarettes() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
        .from('smoking_logs')
        .select('*')
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Błąd przy pobieraniu danych:', error);
        return [];
    }

    return data;
}

// Pobierz ostatnie wpisy (możesz dostosować limit)
async function getLastEntries(limit = 20) {
    const { data, error } = await supabase
        .from('smoking_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Błąd przy pobieraniu danych:', error);
        return [];
    }

    return data;
}

// Pobierz wszystkie wpisy
async function getAllEntries() {
    const { data, error } = await supabase
        .from('smoking_logs')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Błąd przy pobieraniu wszystkich danych:', error);
        return [];
    }

    return data;
}

// Grupowanie wpisów po dacie
function groupByDate(entries) {
    const grouped = {};

    entries.forEach(entry => {
        const dateStr = new Date(entry.created_at).toLocaleDateString('pl-PL');
        if (!grouped[dateStr]) {
            grouped[dateStr] = 0;
        }
        grouped[dateStr]++;
    });

    return grouped;
}

// Dodaj nowy wpis
async function addCigarette() {
    burnBtn.disabled = true;
    burnBtn.textContent = 'Zapisywanie...';

    const { data, error } = await supabase
        .from('smoking_logs')
        .insert([{ created_at: new Date().toISOString() }])
        .select();

    if (error) {
        console.error('Błąd przy dodawaniu papierosa:', error);
        alert('Wystąpił błąd podczas zapisywania');
        burnBtn.textContent = 'Spaliłem papierosa';
        burnBtn.disabled = false;
        return null;
    }

    return data && data.length > 0 ? data[0] : null;
}

// Usuń wpis
async function deleteEntry(id) {
    const { error } = await supabase
        .from('smoking_logs')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Błąd przy usuwaniu wpisu:', error);
        alert('Nie udało się usunąć wpisu');
    }
}

// Aktualizuj UI
async function updateUI() {
    const todayCigs = await getTodayCigarettes();
    const allEntries = await getAllEntries();

    todayCountEl.textContent = todayCigs.length;

    if (todayCigs.length > 0) {
        lastTimeEl.textContent = formatDate(todayCigs[0].created_at);
        // Dodajemy informację o czasie od ostatniego papierosa
        const timeSinceLast = getTimeSinceLastCigarette(todayCigs[0].created_at);
        const timeInfoEl = document.createElement('div');
        timeInfoEl.textContent = `ostatni spalony: ${timeSinceLast}`;
        timeInfoEl.style.fontSize = '14px';
        timeInfoEl.style.color = '#aaa';
        timeInfoEl.style.marginTop = '5px';
        
        // Usuń poprzedni element jeśli istnieje
        const existingTimeInfo = document.getElementById('time-since-last');
        if (existingTimeInfo) existingTimeInfo.remove();
        
        timeInfoEl.id = 'time-since-last';
        lastTimeEl.parentNode.appendChild(timeInfoEl);
    } else {
        lastTimeEl.textContent = '-';
        const existingTimeInfo = document.getElementById('time-since-last');
        if (existingTimeInfo) existingTimeInfo.remove();
    }

    // Lista wpisów z bieżącego dnia
    historyList.innerHTML = '';
    todayCigs.forEach(entry => {
        const li = document.createElement('li');

        const dateSpan = document.createElement('span');
        dateSpan.textContent = formatDate(entry.created_at);

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '❌';
        deleteBtn.style.background = 'none';
        deleteBtn.style.color = 'red';
        deleteBtn.style.border = 'none';
        deleteBtn.style.cursor = 'pointer';
        deleteBtn.title = 'Usuń wpis';

        deleteBtn.onclick = async () => {
            const confirmed = confirm('Czy na pewno chcesz usunąć ten wpis?');
            if (confirmed) {
                await deleteEntry(entry.id);
                await updateUI();
            }
        };

        li.appendChild(dateSpan);
        li.appendChild(deleteBtn);
        historyList.appendChild(li);
    });

    // Sumy dzienne
    const grouped = groupByDate(allEntries);
    summaryList.innerHTML = '';

    for (const [date, count] of Object.entries(grouped)) {
        const li = document.createElement('li');
        li.textContent = `${date} — ${count} papieros(y)`;
        summaryList.appendChild(li);
    }
}

// Funkcja obliczająca czas, który minął od ostatniego papierosa
function getTimeSinceLastCigarette(lastDate) {
    if (!lastDate) return '-';
    
    const now = new Date();
    const last = new Date(lastDate);
    const diffInSeconds = Math.floor((now - last) / 1000);
    
    if (diffInSeconds < 60) {
        return `${diffInSeconds} sekund temu`;
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} minut temu`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        const minutes = Math.floor((diffInSeconds % 3600) / 60);
        return `${hours} godzin i ${minutes} minut temu`;
    } else {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} dni temu`;
    }
}

// Inicjalizacja
document.addEventListener('DOMContentLoaded', async () => {
    const connectionOk = await testConnection();
    if (!connectionOk) return;

    burnBtn.addEventListener('click', async () => {
        await addCigarette();
        await updateUI();
    });

    await updateUI();
});
