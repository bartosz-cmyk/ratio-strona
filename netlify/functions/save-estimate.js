// netlify/functions/save-estimate.js
//
// Tworzy nowy kosztorys albo aktualizuje istniejący (na podstawie `id`).
//
// KLUCZOWA DECYZJA ARCHITEKTONICZNA: świadomie NIE wymuszamy sztywnej
// walidacji struktury lineItems. Użytkownik ma prawo zapisać nawet
// niekompletny wpis (sama nazwa pozycji i kwota, bez zakresu czy dat) —
// zgodnie z założeniem "baza ma przyjmować nawet najprostsze wpisy".
// Jedyna twarda walidacja to: payload musi być poprawnym JSON-em,
// a lineItems (jeśli w ogóle podane) musi być tablicą — inaczej po
// prostu podstawiamy pustą tablicę zamiast odrzucać cały zapis.

const { createClient } = require('@supabase/supabase-js');

// Klucz service_role — omija RLS, dlatego NIGDY nie może trafić do
// frontendu. Ustawiany w Netlify: Site settings → Environment variables.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Prosty szacunek "zaangażowania" w kosztorys — pod przyszłe
// odfiltrowanie pustych przeklikań od realnych, rozbudowanych
// kosztorysów rynkowych. Liczony PO STRONIE SERWERA, żeby klient nie
// mógł go sztucznie zawyżyć wysyłając spreparowany payload.
function computeEngagementScore(lineItems) {
  if (!Array.isArray(lineItems)) return 0;
  let score = 0;
  lineItems.forEach(item => {
    score += 2; // sama obecność pozycji kosztorysu
    if (Array.isArray(item.offers)) {
      score += item.offers.length * 3; // realna oferta to mocniejszy sygnał niż sama pozycja
    }
    if (Array.isArray(item.scopeItems)) {
      score += item.scopeItems.length; // rozbicie zakresu prac
    }
  });
  return score;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Metoda niedozwolona, użyj POST.' })
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Nieprawidłowy JSON w treści żądania.' })
    };
  }

  const {
    id, sessionId, projectName, kosztorysZatwierdzony, lineItems,
    dokumentacjaOgolna, notatkiSpotkan, protokoly
  } = payload;

  // Jedyna twarda walidacja: sessionId jest wymagany. Identyfikuje
  // przeglądarkę i chroni przed przypadkowym nadpisaniem cudzego wpisu
  // przy aktualizacji (patrz warunek w update() poniżej).
  if (!sessionId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Brak sessionId — nie wiadomo, czyja to zmiana.' })
    };
  }

  const safeLineItems = Array.isArray(lineItems) ? lineItems : [];
  const engagementScore = computeEngagementScore(safeLineItems);

  // Te trzy pola doszły razem z zakładkami "Przebieg budowy" i
  // "Dokumentacja powykonawcza" — tak samo jak lineItems, świadomie NIE
  // wymuszamy tu żadnej walidacji ich wewnętrznej struktury, tylko że
  // (jeśli w ogóle podane) muszą być tablicą.
  const safeDokumentacjaOgolna = Array.isArray(dokumentacjaOgolna) ? dokumentacjaOgolna : [];
  const safeNotatkiSpotkan = Array.isArray(notatkiSpotkan) ? notatkiSpotkan : [];
  const safeProtokoly = Array.isArray(protokoly) ? protokoly : [];

  const row = {
    session_id: sessionId,
    project_name: projectName ?? null,
    kosztorys_zatwierdzony: !!kosztorysZatwierdzony,
    line_items: safeLineItems,
    dokumentacja_ogolna: safeDokumentacjaOgolna,
    notatki_spotkan: safeNotatkiSpotkan,
    protokoly: safeProtokoly,
    engagement_score: engagementScore
  };

  try {
    if (id) {
      // AKTUALIZACJA istniejącego kosztorysu.
      // Warunek .eq('session_id', sessionId) to dodatkowa (nie
      // kryptograficzna, ale wystarczająca na tym etapie bez kont
      // użytkowników) warstwa ochrony — bez znajomości ORYGINALNEGO
      // sessionId nie da się nadpisać cudzego wpisu, nawet znając samo id.
      const { data, error } = await supabase
        .from('cost_estimates')
        .update(row)
        .eq('id', id)
        .eq('session_id', sessionId)
        .select('id, updated_at')
        .single();

      if (error) throw error;
      if (!data) {
        return {
          statusCode: 403,
          body: JSON.stringify({ error: 'Brak dostępu do tego kosztorysu z tej sesji przeglądarki.' })
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ id: data.id, updatedAt: data.updated_at })
      };
    } else {
      // NOWY kosztorys — id nadaje baza (gen_random_uuid() w schemacie).
      const { data, error } = await supabase
        .from('cost_estimates')
        .insert(row)
        .select('id, updated_at')
        .single();

      if (error) throw error;

      return {
        statusCode: 201,
        body: JSON.stringify({ id: data.id, updatedAt: data.updated_at })
      };
    }
  } catch (err) {
    console.error('Błąd zapisu do Supabase:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Błąd zapisu do bazy danych. Spróbuj ponownie.' })
    };
  }
};
