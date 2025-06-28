// Import createClient z wersji ESM
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Inicjalizacja klienta
const supabaseUrl = 'https://xtowjourhfikxzssjdvd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0b3dqb3VyaGZpa3h6c3NqZHZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1NTU1NTgsImV4cCI6MjA2NTEzMTU1OH0.j76EJctT6cAXav5JV0100cJI8gLb58sKU7Uqv7n_SiU';
const supabase = createClient(supabaseUrl, supabaseKey);

// Zmienna do przechowywania zaplanowanych godzin
let scheduledCigaretteTimes = [];

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
const dailyProgressEl = document.getElementById('daily-progress');
const progressTextEl = document.getElementById('progress-text');
const todayCountBadge = document.getElementById('today-count-badge');
const totalCostEl = document.getElementById('total-cost');
const dailyAverageEl = document.getElementById('daily-average');
const potentialSavingsEl = document.getElementById('potential-savings');
const bestDayEl = document.getElementById('best-day');
const worstDayEl = document.getElementById('worst-day');
const averagePerDayEl = document.getElementById('average-per-day');

// Obsługa zakładek
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const tabId = btn.dataset.tab;
    
    // Zmień aktywną zakładkę
    tabBtns.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    
    btn.classList.add('active');
    document.getElementById(`${tabId}-tab`).classList.add('active');
    
    // Załaduj dane dla zakładki jeśli jest to Statystyki, Zdrowie lub Historia
    if (tabId === 'stats') updateStatsTab();
    if (tabId === 'health') updateHealthTab();
    if (tabId === 'history') {
      updateUI();  // Ładuje podsumowanie
      generateFullHistoryChart();  // Ładuje wykres
    }
  });
});

// Aktualizuj zakładkę Statystyki
async function updateStatsTab() {
  const allEntries = await getAllEntries();
  const pricePerPack = 22.50; // 22.50 zł za paczkę
  const cigsPerPack = 20; // 20 papierosów w paczce
  
  // Oblicz dokładne statystyki czasowe
  if (allEntries.length === 0) {
    monthlyCostEl.textContent = "Brak danych";
    return;
  }

  // Znajdź najstarszy i najnowszy wpis
  const firstEntry = allEntries[allEntries.length - 1];
  const lastEntry = allEntries[0];
  const firstDate = new Date(firstEntry.created_at);
  const lastDate = new Date(lastEntry.created_at);

  // Oblicz liczbę dni
  const daysTracked = Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24)) + 1;
  
  // Oblicz statystyki finansowe
  const totalCigs = allEntries.length;
  const totalPacks = totalCigs / cigsPerPack;
  const totalCost = totalPacks * pricePerPack;
  const dailyAverageCost = totalCost / daysTracked;
  const monthlyAverageCost = dailyAverageCost * 30.44; // Średnia długość miesiąca

  // Statystyki dzienne
  const groupedByDate = groupByDate(allEntries);
  const dailyCounts = Object.values(groupedByDate).map(day => day.count);
  const bestDay = Math.max(...dailyCounts);
  const worstDay = Math.min(...dailyCounts);
  const averagePerDay = (dailyCounts.reduce((a, b) => a + b, 0) / dailyCounts.length).toFixed(1);

  // Oblicz najdłuższą przerwę
  const longestBreak = calculateLongestBreak(allEntries);
  const longestBreakText = longestBreak 
    ? formatTimeDuration(longestBreak) 
    : "Brak danych";

  // Aktualizuj UI
  monthlyCostEl.textContent = `Średnio miesięcznie: ${monthlyAverageCost.toFixed(2)} zł`;
  totalCostEl.textContent = `Łącznie wydane: ${totalCost.toFixed(2)} zł (${totalCigs} sztuk)`;
  dailyAverageEl.textContent = `Średnio dziennie: ${dailyAverageCost.toFixed(2)} zł`;
  potentialSavingsEl.textContent = `Gdybyś palił o 25% mniej, zaoszczędziłbyś ${(totalCost * 0.25).toFixed(2)} zł`;
  
  bestDayEl.textContent = `Najwięcej dziennie: ${bestDay} papierosów`;
  worstDayEl.textContent = `Najmniej dziennie: ${worstDay} papierosów`;
  averagePerDayEl.textContent = `Średnia dzienna: ${averagePerDay} papierosów`;
  document.getElementById('longest-break').innerHTML = 
    `Najdłuższa przerwa: ${longestBreakText}`;
  document.getElementById('days-tracked').innerHTML = 
    `Liczba dni śledzenia: ${daysTracked-1}`;
}

// Aktualizuj zakładkę Zdrowie
async function updateHealthTab() {
  const lastEntry = (await getLastEntries(1))[0];
  
  if (lastEntry) {
    const lastTime = new Date(lastEntry.created_at);
    const now = new Date();
    const hoursSinceLast = Math.floor((now - lastTime) / (1000 * 60 * 60));

    updateHealthTimeline(hoursSinceLast);
    
    // Aktualizuj pasek postępu czasu
    const timeProgress = document.getElementById('time-progress');
    const timeProgressPercent = Math.min(hoursSinceLast / 48 * 100, 100); // 48h = 100%
    timeProgress.style.width = `${timeProgressPercent}%`;
    document.getElementById('time-since-last-text').textContent = 
      `${hoursSinceLast} godzin bez papierosa`;
    
    // Oblicz oszczędności zdrowotne (przykład: 5 zł za każdy dzień bez papierosa)
    const daysWithout = (hoursSinceLast / 24).toFixed(1);
    const healthSavings = daysWithout * 5; // 5 zł dziennie oszczędności
    const savingsProgress = document.getElementById('health-savings-progress');
    const savingsPercent = Math.min(daysWithout / 30 * 100, 100); // 30 dni = 100%
    savingsProgress.style.width = `${savingsPercent}%`;
    document.getElementById('health-savings-text').textContent = 
      `Zaoszczędzono: ${healthSavings.toFixed(2)} zł (${daysWithout} dni)`;
    
    // Aktualizuj osiągnięcia
    updateAchievements(hoursSinceLast);
  } else {
    document.getElementById('time-since-last-text').textContent = "Brak danych";
  }
}

function updateAchievements(hours) {
  const days = Math.floor(hours / 24);
  const achievementsEl = document.getElementById('achievements');
  achievementsEl.innerHTML = '';
  
  const achievements = [
    { threshold: 1, text: "Pierwszy dzień bez papierosa! 🎉", icon: "🥇" },
    { threshold: 3, text: "3 dni - już czujesz różnicę! 👍", icon: "🥈" },
    { threshold: 7, text: "Tydzień - świetny wynik! 💪", icon: "🏅" },
    { threshold: 30, text: "Miesiąc - jesteś mistrzem! 🏆", icon: "🌟" }
  ];
  
  achievements.forEach(achievement => {
    if (days >= achievement.threshold) {
      const div = document.createElement('div');
      div.className = 'achievement-unlocked';
      div.innerHTML = `<span>${achievement.icon}</span> ${achievement.text}`;
      achievementsEl.appendChild(div);
    }
  });
  
  // Jeśli brak osiągnięć
  if (achievementsEl.children.length === 0) {
    achievementsEl.innerHTML = '<p>Zdobywaj osiągnięcia za każdy dzień bez papierosa!</p>';
  }
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
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} dni ${hours % 24} godz`;
  } else if (hours > 0) {
    return `${hours} godz ${minutes % 60} min`;
  } else if (minutes > 0) {
    return `${minutes} min`;
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

// Wykres w zakładce historia
async function generateFullHistoryChart() {
  const allEntries = await getAllEntries();  // Pobierz wszystkie wpisy z Supabase
  
  // Grupuj wpisy po datach (dzień/miesiąc)
  const groupedByDate = {};
  allEntries.forEach(entry => {
    const date = new Date(entry.created_at).toLocaleDateString('pl-PL');  // Format: "DD.MM.YYYY"
    groupedByDate[date] = (groupedByDate[date] || 0) + 1;
  });
  
  // Przygotuj dane dla wykresu
  const dates = Object.keys(groupedByDate).sort();  // Posortowane daty
  const counts = dates.map(date => groupedByDate[date]);  // Liczba papierosów per dzień
  
  // Generuj wykres
  const ctx = document.getElementById('full-history-chart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: dates,
      datasets: [{
        label: 'Liczba papierosów',
        data: counts,
        borderColor: '#ff6b6b',
        backgroundColor: '#ff6b6b20',
        tension: 0.3,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Papierosy' }
        },
        x: {
          title: { display: true, text: 'Data' },
          ticks: {
            autoSkip: true,
            maxRotation: 45,
            minRotation: 45
          }
        }
      }
    }
  });
}

// Pobierz liczbę papierosów z wczoraj
async function getYesterdayCigarettes() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0); // Początek wczorajszego dnia

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Początek dzisiejszego dnia

    const { data, error } = await supabase
        .from('smoking_logs')
        .select('*')
        .gte('created_at', yesterday.toISOString())
        .lt('created_at', today.toISOString());

    if (error) {
        console.error('Błąd przy pobieraniu wczorajszych danych:', error);
        return 0; // Domyślnie 0, jeśli błąd
    }

    return data.length;
}

// Oblicza najdłuższą przerwe bez papierosa
function calculateLongestBreak(entries) {
  if (entries.length < 2) return null;
  
  const sortedEntries = [...entries].sort((a, b) => 
    new Date(a.created_at) - new Date(b.created_at)
  );

  let longestBreak = 0;
  
  for (let i = 1; i < sortedEntries.length; i++) {
    const prevTime = new Date(sortedEntries[i-1].created_at);
    const currTime = new Date(sortedEntries[i].created_at);
    const breakDuration = currTime - prevTime;
    
    if (breakDuration > longestBreak) {
      longestBreak = breakDuration;
    }
  }
  
  return longestBreak;
}

// Dane regeneracji organizmu
const RECOVERY_TIMELINE = [
  { hours: 1, title: "20 minut", description: "Ciśnienie krwi i tętno wracają do normy" },
  { hours: 2, title: "2 godziny", description: "Poprawia się krążenie krwi" },
  { hours: 8, title: "8 godzin", description: "Poziom tlenu w krwi wraca do normy" },
  { hours: 24, title: "24 godziny", description: "Tlenek węgla zostaje usunięty z organizmu" },
  { 
    hours: 48, 
    title: "48 godzin", 
    description: "Nikotyna opuszcza organizm, zmysły smaku i węchu się poprawiają", 
    details: "Po 2 dniach organizm całkowicie metabolizuje nikotynę. Możesz odczuwać nerwowość - to normalny etap detoksu." 
  },
  { hours: 72, title: "72 godziny", description: "Oddychanie staje się łatwiejsze, oskrzela się rozluźniają" },
  { hours: 168, title: "1 tydzień", description: "Ryzyko zawału zaczyna spadać" },
  { hours: 720, title: "1 miesiąc", description: "Pojemność płuc zwiększa się o 30%" },
  { hours: 2160, title: "3 miesiące", description: "Znaczna poprawa krążenia i wydolności" },
  { hours: 8760, title: "1 rok", description: "Ryzyko chorób serca zmniejszone o połowę" }
];

function updateHealthTimeline(hoursWithoutSmoking) {
  const timelineEl = document.getElementById('health-timeline');
  const progressBar = document.getElementById('health-progress-bar');
  
  const maxHours = 8760; // 1 rok
  const progressPercent = Math.min((hoursWithoutSmoking / maxHours) * 100, 100);
  
  progressBar.style.width = `${progressPercent}%`;
  document.getElementById('current-status').textContent = 
    `${hoursWithoutSmoking} godzin bez papierosa (${progressPercent.toFixed(1)}% celu rocznego)`;
  
  timelineEl.innerHTML = RECOVERY_TIMELINE.map(item => {
    const isUnlocked = hoursWithoutSmoking >= item.hours;
    const hoursLeft = item.hours - hoursWithoutSmoking;
    
    return `
      <div class="timeline-item ${isUnlocked ? 'unlocked' : ''}">
        <h4>${item.hours} godzin</h4>
        <p>${item.description}</p>
        ${isUnlocked 
          ? '<span class="unlocked-badge">✅ Osiągnięte</span>' 
          : hoursLeft > 0 
            ? `<span class="time-left">(${hoursLeft}h do osiągnięcia)</span>`
            : ''}
      </div>
    `;
  }).join('');
}

// informacja o liczbie spalonych papierosów w dniu poprzednim o tej samej godzinie
async function getYesterdaySameHourCount() {
    const now = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Ustawiamy godzinę na tę samą co teraz
    yesterday.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    
    const startOfYesterday = new Date(yesterday);
    startOfYesterday.setHours(0, 0, 0, 0);
    
    const { data, error } = await supabase
        .from('smoking_logs')
        .select('*')
        .gte('created_at', startOfYesterday.toISOString())
        .lte('created_at', yesterday.toISOString());
    
    if (error) {
        console.error('Błąd przy pobieraniu wczorajszych danych:', error);
        return 0;
    }
    
    return data.length;
}

// informacje o najwcześniejszym możliwym czasie zapalenia następnego papierosa, aby utrzymać cel (o 1 mniej niż wczoraj)
function calculateNextAllowedTime(todayCigs, yesterdayCount) {
    const dailyGoal = Math.max(1, Math.min(yesterdayCount - 1, 20));
    const remainingCigs = dailyGoal - todayCigs.length;
    
    if (remainingCigs <= 0) {
        scheduledCigaretteTimes = []; // Wyczyść harmonogram jeśli cel osiągnięty
        return null;
    }
    
    const now = new Date();
    const endOfDay = new Date();
    endOfDay.setHours(22, 0, 0, 0); // Koniec dnia o 22:00
    
    // Jeśli jest już po 22:00 lub brak zaplanowanych godzin
    if (now >= endOfDay || scheduledCigaretteTimes.length === 0) {
        scheduledCigaretteTimes = [];
        return null;
    }
    
    // Znajdź następną godzinę (pierwszą późniejszą niż teraz)
    const nextTime = scheduledCigaretteTimes.find(time => time > now);
    return nextTime || null;
}

function generateDailySchedule(todayCigs, yesterdayCount) {
    const dailyGoal = Math.max(1, Math.min(yesterdayCount - 1, 20));
    const remainingCigs = dailyGoal - todayCigs.length;
    
    const now = new Date();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(22, 0, 0, 0);
    
    // Wygeneruj harmonogram tylko jeśli:
    // - to początek dnia (nie ma jeszcze zapisanych papierosów)
    // - lub zmieniła się liczba pozostałych papierosów
    if (todayCigs.length === 0 || scheduledCigaretteTimes.length !== remainingCigs) {
        scheduledCigaretteTimes = [];
        
        if (remainingCigs > 0 && now < endOfDay) {
            const totalMinutes = (endOfDay - now) / (1000 * 60);
            const interval = totalMinutes / remainingCigs;
            
            let currentTime = new Date(now);
            for (let i = 0; i < remainingCigs; i++) {
                currentTime = new Date(currentTime.getTime() + interval * 60000);
                scheduledCigaretteTimes.push(new Date(currentTime));
            }
        }
    }
}

function formatTimeRemaining(targetTime) {
    const now = new Date();
    const diffMs = targetTime - now;
    
    if (diffMs <= 0) return "Teraz";
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const remainingMinutes = diffMinutes % 60;
    
    if (diffHours > 0) {
        return `za ${diffHours}h ${remainingMinutes}min`;
    } else {
        return `za ${diffMinutes}min`;
    }
}

// Aktualizuj UI
async function updateUI() {
    const todayCigs = await getTodayCigarettes();
    const allEntries = await getAllEntries();
    const yesterdayCount = await getYesterdayCigarettes();
    const yesterdaySameHourCount = await getYesterdaySameHourCount();

    // Wygeneruj harmonogram na dzień
    generateDailySchedule(todayCigs, yesterdayCount);

    // Aktualizuj licznik dzisiejszych papierosów
    todayCountEl.textContent = todayCigs.length;
    todayCountBadge.textContent = todayCigs.length;
  
    // Dzisiejszy cel: wczoraj -1 (minimum 1, maksimum np. 20)
    const dailyGoal = Math.max(1, Math.min(yesterdayCount - 1, 20));
    const progressPercent = Math.min((todayCigs.length / dailyGoal) * 100, 100);
    dailyProgressEl.style.width = `${progressPercent}%`;

    // Dodajmy informację o porównaniu z wczoraj
    let comparisonText = "";
    if (yesterdaySameHourCount > 0) {
        if (todayCigs.length < yesterdaySameHourCount) {
            comparisonText = `(o ${yesterdaySameHourCount - todayCigs.length} mniej niż wczoraj o tej porze - dobra robota!)`;
        } else if (todayCigs.length > yesterdaySameHourCount) {
            comparisonText = `(o ${todayCigs.length - yesterdaySameHourCount} więcej niż wczoraj o tej porze - zwolnij!)`;
        } else {
            comparisonText = `(tyle samo co wczoraj o tej porze)`; 
        }
    }
    
    let nextCigInfo = "";
    const nextAllowedTime = calculateNextAllowedTime(todayCigs, yesterdayCount);

    if (nextAllowedTime) {
      const hours = nextAllowedTime.getHours().toString().padStart(2, '0');
      const minutes = nextAllowedTime.getMinutes().toString().padStart(2, '0');
      const timeRemaining = formatTimeRemaining(nextAllowedTime);
      nextCigInfo = `<br><small>Następny papieros: ${hours}:${minutes} (${timeRemaining})</small>`;
    } else {
      const now = new Date();
      const endOfDay = new Date();
      endOfDay.setHours(22, 0, 0, 0);
    
    if (now >= endOfDay && todayCigs.length < dailyGoal) {
        nextCigInfo = `<br><small>Na dziś już koniec! Cel osiągnięty.</small>`;
    } else if (todayCigs.length >= dailyGoal) {
        nextCigInfo = `<br><small>Dzisiejszy cel osiągnięty!</small>`;
    }
    }

    progressTextEl.innerHTML = `${todayCigs.length}/${dailyGoal} papierosów<br><small>${comparisonText}</small>${nextCigInfo}`;

    // Zmień kolor paska jeśli cel przekroczony
    if (todayCigs.length >= dailyGoal) {
        dailyProgressEl.style.background = 'linear-gradient(90deg, #dc3545, #c82333)';
    }
  
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

  // Odświeżaj czas co minutę
  setInterval(async () => {
    if (document.getElementById('today-tab').classList.contains('active')) {
      const progressText = document.getElementById('progress-text');
      if (progressText.innerHTML.includes('Następny papieros')) {
        await updateUI();
      }
    }
  }, 60000); // 60 sekund
});
