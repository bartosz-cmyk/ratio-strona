// assets/js/cloud-sync.js
//
// Zastępuje mechanizm localStorage.setItem/getItem asynchroniczną
// komunikacją z Netlify Functions (Supabase w tle).
//
// KLUCZOWA DECYZJA ARCHITEKTONICZNA: ten plik definiuje globalne
// funkcje saveState() i loadState() o TYCH SAMYCH NAZWACH, jakich
// istniejący kod aplikacji już używa (addLineItem, updateItemField,
// approveKosztorys, itd. — wszystkie wołają saveState() po każdej
// zmianie). Dzięki temu wystarczy dołączyć ten plik PRZED głównym
// skryptem aplikacji i USUNĄĆ z niego stare definicje saveState()/
// loadState() oparte na localStorage — reszta kodu (dziesiątki miejsc
// wołających te funkcje) nie wymaga żadnych zmian.

// ---------- identyfikator sesji (anonimowej przeglądarki) ----------
// Persystentny, NIEZALEŻNY od konkretnego projektu — jedna przeglądarka
// = jeden sessionId, używany do wielu kosztorysów w czasie. To NIE jest
// to samo co id projektu w URL.
function getOrCreateSessionId() {
  const KEY = 'ratio-mvp-session-id';
  let sid = localStorage.getItem(KEY);
  if (!sid) {
    sid = crypto.randomUUID();
    localStorage.setItem(KEY, sid);
  }
  return sid;
}
const SESSION_ID = getOrCreateSessionId();

// ---------- identyfikator PROJEKTU (kosztorysu) z URL ----------
// UUID konkretnego kosztorysu, czytany z ?id=... w adresie strony.
// Brak parametru = nowy, jeszcze niezapisany kosztorys.
function getProjectIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

// Po pierwszym udanym zapisie NOWEGO kosztorysu wpisujemy jego świeżo
// nadane id z powrotem do URL (bez przeładowania strony), żeby dało
// się skopiować/wysłać link do TEGO konkretnego kosztorysu.
function setProjectIdInUrl(id) {
  const url = new URL(window.location.href);
  url.searchParams.set('id', id);
  window.history.replaceState({}, '', url.toString());
}

let currentProjectId = getProjectIdFromUrl();

// ---------- debounce ----------
// Zapis do chmury dopiero 1200ms po ostatniej zmianie — bez tego
// każde naciśnięcie klawisza w polu tekstowym wywoływałoby osobne
// zapytanie do bazy.
function debounce(fn, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

// ---------- wskaźnik stanu zapisu (UI) ----------
// Zakłada istnienie w HTML elementu <span id="save-indicator"></span>
// (już jest w istniejącym pliku aplikacji). Style — patrz sekcja CSS
// w dokumencie towarzyszącym (architektura-migracja-supabase.md).
function setSaveIndicator(status) {
  const el = document.getElementById('save-indicator');
  if (!el) return;
  el.classList.remove('save-ok', 'save-pending', 'save-error', 'save-offline');
  if (status === 'saving') {
    el.textContent = 'Zapisywanie…';
    el.classList.add('save-pending');
  } else if (status === 'saved') {
    el.textContent = '✓ Zapisano w chmurze';
    el.classList.add('save-ok');
  } else if (status === 'offline') {
    el.textContent = '⚠ Offline — zmiany zapisane lokalnie, wyślemy po powrocie sieci';
    el.classList.add('save-offline');
  } else if (status === 'error') {
    el.textContent = '✗ Błąd zapisu — spróbuj ponownie';
    el.classList.add('save-error');
  }
}

// ---------- obsługa offline: bufor ostatniego stanu ----------
// Jeśli zapis nie powiedzie się z powodu braku sieci, trzymamy OSTATNI
// stan lokalnie (localStorage jako bufor AWARYJNY, nie jako docelowe
// miejsce przechowywania) i próbujemy ponownie, gdy przeglądarka
// zgłosi powrót online.
const OFFLINE_BUFFER_KEY = 'ratio-mvp-offline-buffer';

function bufferStateOffline(stateSnapshot) {
  try {
    localStorage.setItem(OFFLINE_BUFFER_KEY, JSON.stringify(stateSnapshot));
  } catch (e) {
    // Najczęstsza przyczyna: QuotaExceededError — zbyt dużo zdjęć w
    // notatkach/dokumentacji, żeby zmieścić się w limicie localStorage
    // przeglądarki. To tylko bufor awaryjny na wypadek braku sieci, więc
    // brak miejsca na niego nie jest tak krytyczny jak dawniej (kiedy
    // localStorage był JEDYNYM miejscem przechowywania danych) — ale
    // ostrzegamy użytkownika, bo w tym jednym przypadku zmiany naprawdę
    // mogą się nie zapisać, dopóki sieć nie wróci.
    console.error('Nie udało się zbuforować stanu offline:', e);
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      alert('Przekroczono limit pamięci przeglądarki (prawdopodobnie zbyt dużo zdjęć) i nie udało się zbuforować zmian offline. Połącz się z internetem jak najszybciej, żeby zapisać dane w chmurze.');
    }
  }
}

function readOfflineBuffer() {
  try {
    const raw = localStorage.getItem(OFFLINE_BUFFER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function clearOfflineBuffer() {
  localStorage.removeItem(OFFLINE_BUFFER_KEY);
}

window.addEventListener('online', () => {
  const buffered = readOfflineBuffer();
  if (buffered) {
    setSaveIndicator('saving');
    performSave(buffered).then(() => clearOfflineBuffer());
  }
});

window.addEventListener('offline', () => {
  setSaveIndicator('offline');
});

// ---------- właściwy zapis (wywoływany po odczekaniu debounce) ----------
async function performSave(stateSnapshot) {
  if (!navigator.onLine) {
    bufferStateOffline(stateSnapshot);
    setSaveIndicator('offline');
    return;
  }

  setSaveIndicator('saving');
  try {
    const res = await fetch('/.netlify/functions/save-estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: currentProjectId,
        sessionId: SESSION_ID,
        projectName: stateSnapshot.projectName,
        kosztorysZatwierdzony: stateSnapshot.kosztorysZatwierdzony,
        lineItems: stateSnapshot.lineItems,
        // Trzy dodatkowe gałęzie stanu doszły w nowszej wersji aplikacji
        // (zakładki "Przebieg budowy" i "Dokumentacja powykonawcza") —
        // bez nich zdjęcia z notatek ze spotkań, protokoły odbioru i
        // ogólna dokumentacja NIE trafiałyby do chmury.
        dokumentacjaOgolna: stateSnapshot.dokumentacjaOgolna,
        notatkiSpotkan: stateSnapshot.notatkiSpotkan,
        protokoly: stateSnapshot.protokoly
      })
    });

    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();

    // Pierwszy zapis nowego kosztorysu — dopisujemy nadane id do URL,
    // żeby kolejne zapisy trafiały jako UPDATE, nie kolejny INSERT.
    if (!currentProjectId && data.id) {
      currentProjectId = data.id;
      setProjectIdInUrl(data.id);
    }

    setSaveIndicator('saved');
  } catch (err) {
    console.error('Zapis do chmury nie powiódł się, buforuję lokalnie:', err);
    bufferStateOffline(stateSnapshot);
    setSaveIndicator('error');
  }
}

const debouncedSave = debounce(performSave, 1200);

// ============================================================
// DROP-IN zamienniki saveState() / loadState()
// `state` to globalny obiekt aplikacji zdefiniowany w
// mvp-pokrycie-ofertami.html — ten plik musi być dołączony PRZED
// głównym skryptem aplikacji, a stare definicje saveState()/loadState()
// oparte na localStorage muszą zostać z niego usunięte.
// ============================================================

async function saveState() {
  // Snapshot na wypadek, gdyby `state` zmienił się jeszcze raz przed
  // upływem czasu debounce — debounce i tak odrzuci poprzednie,
  // niedoszłe wywołania, więc do bazy zawsze trafi najświeższa wersja.
  const snapshot = JSON.parse(JSON.stringify(state));
  debouncedSave(snapshot);
}

async function loadState() {
  if (!currentProjectId) {
    // Nowy kosztorys — nic do wczytania, `state` ma już domyślne
    // wartości zdefiniowane w kodzie aplikacji.
    render();
    return;
  }

  try {
    const res = await fetch(`/.netlify/functions/get-estimate?id=${encodeURIComponent(currentProjectId)}`);

    if (res.status === 404) {
      console.warn('Kosztorys o podanym id nie istnieje — zaczynam od pustego stanu.');
      render();
      return;
    }
    if (!res.ok) throw new Error('HTTP ' + res.status);

    const data = await res.json();
    state.projectName = data.projectName || '';
    state.kosztorysZatwierdzony = !!data.kosztorysZatwierdzony;
    state.lineItems = Array.isArray(data.lineItems) ? data.lineItems : [];
    state.dokumentacjaOgolna = Array.isArray(data.dokumentacjaOgolna) ? data.dokumentacjaOgolna : [];
    state.notatkiSpotkan = Array.isArray(data.notatkiSpotkan) ? data.notatkiSpotkan : [];
    state.protokoly = Array.isArray(data.protokoly) ? data.protokoly : [];

    // Normalizacja — kosztorysy zapisane przed dodaniem "Protokołów
    // odbioru" / "Dokumentacji powykonawczej" mogą nie mieć jeszcze tych
    // pól na pozycjach, a świeżo utworzony wiersz w bazie ma pustą tablicę
    // dokumentacjaOgolna zamiast domyślnych 8 pozycji.
    state.lineItems.forEach(item => {
      if (!item.dokumenty) item.dokumenty = [];
      if (!item.zdjecia) item.zdjecia = [];
    });
    if (state.dokumentacjaOgolna.length === 0 && typeof defaultDokumentacjaOgolna === 'function') {
      state.dokumentacjaOgolna = defaultDokumentacjaOgolna();
    }

    const nameInput = document.getElementById('project-name');
    if (nameInput) nameInput.value = state.projectName;

    // Jeśli otwierający NIE jest twórcą tego kosztorysu (inny sessionId),
    // w przyszłości można by tu przełączyć UI w tryb tylko-do-odczytu.
    // Na razie aplikacja nie ma takiego trybu, więc tylko informacyjny log.
    if (data.sessionId && data.sessionId !== SESSION_ID) {
      console.info('Ten kosztorys został utworzony w innej przeglądarce/sesji — otwierasz z linku.');
    }

    render();
  } catch (err) {
    console.error('Nie udało się wczytać kosztorysu z chmury:', err);
    // Awaryjnie: spróbuj lokalnego bufora offline, jeśli akurat istnieje.
    const buffered = readOfflineBuffer();
    if (buffered) {
      Object.assign(state, buffered);
      render();
    }
  }
}
