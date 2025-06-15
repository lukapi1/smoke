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
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const monthlyCostEl = document.getElementById('monthly-cost');
const savingsPotentialEl = document.getElementById('savings-potential');
const healthBenefitsEl = document.getElementById('health-benefits');
const achievementsEl = document.getElementById('achievements');
const dailyProgressEl = document.getElementById('daily-progress');
const progressTextEl = document.getElementById('progress-text');
const todayCountBadge = document.getElementById('today-count-badge');

// Obsługa zakładek
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const tabId = btn.dataset.tab;
    
    // Zmień aktywną zakładkę
    tabBtns.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    
    btn.classList.add('active');
    document.getElementById(`${tabId}-tab`).classList.add('active');
    
    // Załaduj dane dla zakładki jeśli jest to Statystyki lub Zdrowie
    if (tabId === 'stats') updateStatsTab();
    if (tabId === 'health') updateHealthTab();
  });
});

// Oblicz koszty i oszczędności
async function calculateFinancialStats() {
  const allEntries = await getAllEntries();
  const pricePerPack = 20; // Załóżmy 20 zł za paczkę
  const cigsPerPack = 20;
  
  // Oblicz koszt miesięczny
  const daysInMonth = 30;
  const cigsPerDay = allEntries.length / (daysInMonth / 2); // Uproszczone założenie
  const monthlyCost = (cigsPerDay * daysInMonth / cigsPerPack) * pricePerPack;
  
  // Potencjalne oszczędności przy redukcji o 25%
  const potentialSavings = monthlyCost * 0.25;
  
  return {
    monthlyCost: monthlyCost.toFixed(2),
    potentialSavings: potentialSavings.toFixed(2)
  };
}

// Aktualizuj zakładkę Statystyki
async function updateStatsTab() {
  const stats = await calculateFinancialStats();
  monthlyCostEl.textContent = `W tym miesiącu wydałeś: ${stats.monthlyCost} zł`;
  savingsPotentialEl.textContent = `Gdybyś zmniejszył palenie o 25%, zaoszczędziłbyś ${stats.potentialSavings} zł miesięcznie!`;
  
  // Generuj wykres
  generateWeeklyChart();
}

// Generuj wykres tygodniowy
async function generateWeeklyChart() {
  const entries = await getLastEntries(50); // Ostatnie 50 wpisów
  const dailyCounts = {};
  
  entries.forEach(entry => {
    const date = new Date(entry.created_at).toLocaleDateString('pl-PL', { weekday: 'short' });
    dailyCounts[date] = (dailyCounts[date] || 0) + 1;
  });
  
  const ctx = document.getElementById('weekly-chart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(dailyCounts),
      datasets: [{
        label: 'Papierosy dziennie',
        data: Object.values(dailyCounts),
        backgroundColor: '#ff6b6b80',
        borderColor: '#ff6b6b',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: '#aaa' },
          grid: { color: '#333' }
        },
        x: {
          ticks: { color: '#aaa' },
          grid: { color: '#333' }
        }
      },
      plugins: {
        legend: { labels: { color: '#aaa' } }
      }
    }
  });
}

// Aktualizuj zakładkę Zdrowie
async function updateHealthTab() {
  const lastEntry = (await getLastEntries(1))[0];
  
  if (lastEntry) {
    const lastTime = new Date(lastEntry.created_at);
    const now = new Date();
    const hoursSinceLast = Math.floor((now - lastTime) / (1000 * 60 * 60));
    
    let benefitsText = '';
    
    if (hoursSinceLast >= 48) {
      benefitsText = '🎉 Nikotyna opuściła Twój organizm!';
    } else if (hoursSinceLast >= 12) {
      benefitsText = '👍 Tlenek węgla we krwi wrócił do normy!';
    } else if (hoursSinceLast >= 1) {
      benefitsText = '💓 Twoje ciśnienie krwi się poprawia';
    } else {
      benefitsText = '⏳ Zaczekaj godzinę, aby zobaczyć pierwsze korzyści';
    }
    
    healthBenefitsEl.innerHTML = `
      <strong>Od ostatniego papierosa:</strong> ${getTimeSinceLastCigarette(lastEntry.created_at)}<br><br>
      <strong>Korzyści:</strong> ${benefitsText}
    `;
  }
  
  // Symulacja osiągnięć
  achievementsEl.innerHTML = `
    <div class="achievement">
      <span>🥉</span> 3 dni z rzędu w limicie
    </div>
    <div class="achievement">
      <span>💪</span> Tydzień z redukcją o 20%
    </div>
  `;
}

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

// Oblicz średni czas między papierosami w danym dniu
function calculateAverageTimeBetweenCigs(entries) {
    if (entries.length < 2) return null;

    const sortedEntries = [...entries].sort((a, b) => 
        new Date(a.created_at) - new Date(b.created_at)
    );

    let totalTimeDiff = 0;
    let timeDiffs = [];
    const MAX_BREAK = 4 * 60 * 60 * 1000; // Ignoruj przerwy >4h (np. sen)

    for (let i = 1; i < sortedEntries.length; i++) {
        const prevTime = new Date(sortedEntries[i-1].created_at);
        const currTime = new Date(sortedEntries[i].created_at);
        const diff = currTime - prevTime;

        if (diff <= MAX_BREAK) { // Filtruj długie przerwy
            timeDiffs.push(diff);
            totalTimeDiff += diff;
        }
    }

    if (timeDiffs.length === 0) return null;
    const averageDiff = totalTimeDiff / timeDiffs.length;
    return averageDiff;
}

// Formatuj czas w przyjazny sposób
function formatTimeDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
        return `${hours} godz ${minutes % 60} min`;
    } else if (minutes > 0) {
        return `${minutes} min ${seconds % 60} sek`;
    } else {
        return `${seconds} sek`;
    }
}

// Grupowanie wpisów po dacie
function groupByDate(entries) {
    const grouped = {};

    entries.forEach(entry => {
        const dateStr = new Date(entry.created_at).toLocaleDateString('pl-PL');
        if (!grouped[dateStr]) {
            grouped[dateStr] = {
                count: 0,
                entries: []
            };
        }
        grouped[dateStr].count++;
        grouped[dateStr].entries.push(entry);
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

    // Aktualizuj licznik dzisiejszych papierosów
    todayCountEl.textContent = todayCigs.length;
    todayCountBadge.textContent = todayCigs.length;
  
  // Aktualizuj pasek postępu (załóżmy cel 10 papierosów dziennie)
    const dailyGoal = 10;
    const progressPercent = Math.min((todayCigs.length / dailyGoal) * 100, 100);
    dailyProgressEl.style.width = `${progressPercent}%`;
    progressTextEl.textContent = `${todayCigs.length}/${dailyGoal} papierosów`;
  
  // Zmień kolor paska jeśli cel przekroczony
    if (todayCigs.length >= dailyGoal) {
        dailyProgressEl.style.background = 'linear-gradient(90deg, #dc3545, #c82333)';
    }
  
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

    for (const [date, data] of Object.entries(grouped)) {
        const li = document.createElement('li');
        const averageTime = calculateAverageTimeBetweenCigs(data.entries);
        
        let summaryText = `${date} — ${data.count} papieros(y)`;
        
        if (averageTime !== null && data.count > 1) {
            summaryText += `, średnio co ${formatTimeDuration(averageTime)}`;
        }
        
        li.textContent = summaryText;
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
    // Aktualizuj też zakładki jeśli są aktywne
    if (document.getElementById('stats-tab').classList.contains('active')) updateStatsTab();
    if (document.getElementById('health-tab').classList.contains('active')) updateHealthTab();
  });

  await updateUI();
});
