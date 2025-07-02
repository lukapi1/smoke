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
    const hoursSinceLast = (now - lastTime) / (1000 * 60 * 60); // dokładna liczba godzin (np. 0.47)

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
let fullHistoryChart = null; // Przechowuj referencję do wykresu

async function generateFullHistoryChart() {
  const allEntries = await getAllEntries();
  
  // Grupowanie danych - używaj tej samej funkcji co w podsumowaniu
  const groupedByDate = groupByDate(allEntries);
  
  // Sortowanie dat
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
    const dateA = new Date(a.split('.').reverse().join('-'));
    const dateB = new Date(b.split('.').reverse().join('-'));
    return dateA - dateB;
  });
  
  const counts = sortedDates.map(date => groupedByDate[date].count);
  
  // Formatowanie dat do wyświetlenia (np. "01.01")
  const formattedDates = sortedDates.map(date => {
    const [day, month] = date.split('.');
    return `${day}.${month}`;
  });

  const ctx = document.getElementById('full-history-chart').getContext('2d');
  
  // Zniszcz poprzedni wykres, jeśli istnieje
  if (fullHistoryChart) fullHistoryChart.destroy();

  // Jeśli brak danych, wyświetl komunikat
  if (sortedDates.length === 0) {
    ctx.fillStyle = '#aaa';
    ctx.textAlign = 'center';
    ctx.fillText('Brak danych do wyświetlenia', ctx.canvas.width / 2, ctx.canvas.height / 2);
    return;
  }

  // Konfiguracja wykresu
  fullHistoryChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: formattedDates,
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
            maxRotation: 90,
            minRotation: 45,
            padding: 10,
            maxTicksLimit: Infinity
          },
          grid: {
            display: false
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            title: function(context) {
              // Pełna data w tooltipie
              return sortedDates[context[0].dataIndex];
            }
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

async function getNextYesterdayCigaretteTime() {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Pobierz wszystkie wpisy z wczoraj
    const startOfYesterday = new Date(yesterday);
    startOfYesterday.setHours(0, 0, 0, 0);
    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);
    
    const { data, error } = await supabase
        .from('smoking_logs')
        .select('*')
        .gte('created_at', startOfYesterday.toISOString())
        .lte('created_at', endOfYesterday.toISOString())
        .order('created_at', { ascending: true });
    
    if (error || !data || data.length === 0) return null;
    
    // Znajdź pierwszy wczorajszy papieros, którego czas JESZCZE NIE MINĄŁ dzisiaj
    const nowHours = now.getHours();
    const nowMinutes = now.getMinutes();
    
    for (const entry of data) {
        const entryTime = new Date(entry.created_at);
        const entryHours = entryTime.getHours();
        const entryMinutes = entryTime.getMinutes();
        
        // Czy to przyszła godzina (np. teraz 08:53, a wczorajszy papieros o 09:00)?
        if (entryHours > nowHours || (entryHours === nowHours && entryMinutes > nowMinutes)) {
            return entry; // Znaleziono odpowiedni moment
        }
    }
    
    return null; // Nie ma już dziś więcej godzin do pominięcia
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
// Dane regeneracji organizmu (skrócone do 1 roku)
const RECOVERY_TIMELINE = [
  { 
    hours: 0.33, 
    title: "20 minut", 
    description: "Ciśnienie krwi i tętno wracają do normy" 
  },
  { 
    hours: 2, 
    title: "2 godziny", 
    description: "Poprawia się krążenie krwi" 
  },
  { 
    hours: 8, 
    title: "8 godzin", 
    description: "Poziom tlenu we krwi wraca do normy" 
  },
  { 
    hours: 24, 
    title: "1 dzień", 
    description: "Tlenek węgla zostaje usunięty z organizmu" 
  },
  { 
    hours: 48, 
    title: "2 dni", 
    description: "Nikotyna opuszcza organizm, zmysły smaku i węchu się poprawiają",
    details: "Po 2 dniach organizm całkowicie metabolizuje nikotynę. Możesz odczuwać nerwowość - to normalny etap detoksu." 
  },
  { 
    hours: 72, 
    title: "3 dni", 
    description: "Oddychanie staje się łatwiejsze, oskrzela się rozluźniają" 
  },
  { 
    hours: 168, 
    title: "1 tydzień", 
    description: "Ryzyko zawału zaczyna spadać" 
  },
  { 
    hours: 720, 
    title: "1 miesiąc", 
    description: "Pojemność płuc zwiększa się o 30%" 
  },
  { 
    hours: 2160, 
    title: "3 miesiące", 
    description: "Znaczna poprawa krążenia i wydolności" 
  },
  { 
    hours: 4320, 
    title: "6 miesięcy", 
    description: "Kaszel palacza i duszności zmniejszają się" 
  },
  { 
    hours: 8760, 
    title: "1 rok", 
    description: "Ryzyko chorób serca zmniejszone o połowę" 
  }
];

function updateHealthTimeline(hoursWithoutSmoking) {
  const timelineEl = document.getElementById('health-timeline');
  const progressBar = document.getElementById('health-progress-bar');
  
  // Ustawiamy maksymalny czas na 1 rok (8760 godzin)
  const maxHours = 8760; 
  const progressPercent = Math.min((hoursWithoutSmoking / maxHours) * 100, 100);
  
  progressBar.style.width = `${progressPercent}%`;
  
  // Formatowanie wyświetlanego czasu
  let timeDisplay;
  if (hoursWithoutSmoking < 1) {
    const minutes = Math.floor(hoursWithoutSmoking * 60);
    timeDisplay = `${minutes} minut bez papierosa`;
  } else if (hoursWithoutSmoking >= 8760) {
    const years = Math.floor(hoursWithoutSmoking / 8760);
    const remainingHours = hoursWithoutSmoking % 8760;
    const months = Math.floor(remainingHours / 720);
    timeDisplay = `${years} lat${years > 1 ? 'a' : ''}${months > 0 ? ` i ${months} miesięcy` : ''} bez papierosa`;
  } else if (hoursWithoutSmoking >= 720) {
    const months = Math.floor(hoursWithoutSmoking / 720);
    const remainingHours = hoursWithoutSmoking % 720;
    const days = Math.floor(remainingHours / 24);
    timeDisplay = `${months} miesięcy${days > 0 ? ` i ${days} dni` : ''} bez papierosa`;
  } else if (hoursWithoutSmoking >= 24) {
    const days = Math.floor(hoursWithoutSmoking / 24);
    const remainingHours = hoursWithoutSmoking % 24;
    timeDisplay = `${days} dni${remainingHours > 0 ? ` i ${remainingHours} godzin` : ''} bez papierosa`;
  } else {
    timeDisplay = `${hoursWithoutSmoking.toFixed(0)} godzin bez papierosa`;
  }
  
  document.getElementById('current-status').textContent = timeDisplay;
  
  // Generowanie osi czasu
  timelineEl.innerHTML = RECOVERY_TIMELINE.map(item => {
    const isUnlocked = hoursWithoutSmoking >= item.hours;
 
    // Formatowanie czasu do osiągnięcia
    let timeLeftText = '';

    if (!isUnlocked) {
      const hoursLeft = item.hours - hoursWithoutSmoking;
    
      if (hoursLeft > 0) {
        if (hoursLeft < 1) {
    const minutesLeft = Math.ceil(hoursLeft * 60);
    timeLeftText = `(${minutesLeft} minut do osiągnięcia)`;
  } else if (hoursLeft >= 8760) {
    const yearsLeft = Math.floor(hoursLeft / 8760);
    timeLeftText = `(${yearsLeft} lat${yearsLeft > 1 ? 'a' : ''} do osiągnięcia)`;
  } else if (hoursLeft >= 720) {
    const monthsLeft = Math.floor(hoursLeft / 720);
    timeLeftText = `(${monthsLeft} miesięcy do osiągnięcia)`;
  } else if (hoursLeft >= 24) {
    const daysLeft = Math.floor(hoursLeft / 24);
    timeLeftText = `(${daysLeft} dni do osiągnięcia)`;
  } else {
    timeLeftText = `(${Math.ceil(hoursLeft)} godzin do osiągnięcia)`;
  }
      }
    }
    return `
      <div class="timeline-item ${isUnlocked ? 'unlocked' : ''}">
        <h4>${item.title}</h4>
        <p>${item.description}</p>
        ${isUnlocked 
          ? '<span class="unlocked-badge">✅ Osiągnięte</span>' 
          : timeLeftText ? `<span class="time-left">${timeLeftText}</span>` : ''}
        ${item.details && isUnlocked ? `<div class="timeline-details">${item.details}</div>` : ''}
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

    const nextYesterdayCig = await getNextYesterdayCigaretteTime();
    if (nextYesterdayCig) {
      const yesterdayTime = new Date(nextYesterdayCig.created_at);
      const hours = yesterdayTime.getHours().toString().padStart(2, '0');
      const minutes = yesterdayTime.getMinutes().toString().padStart(2, '0');
    
      // Sprawdź, czy dzisiaj już nie zapaliłeś o podobnej godzinie
      const todayCigs = await getTodayCigarettes();
      const hasSmokedSimilarTimeToday = todayCigs.some(entry => {
        const entryTime = new Date(entry.created_at);
        return entryTime.getHours() === yesterdayTime.getHours() && 
               Math.abs(entryTime.getMinutes() - yesterdayTime.getMinutes()) <= 1;
      });
    
      if (!hasSmokedSimilarTimeToday) {
        nextCigInfo += `<br><small class="warning">Wczoraj o ${hours}:${minutes} zapaliłeś papierosa - pomiń go dziś, aby poprawić wynik!</small>`;
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
