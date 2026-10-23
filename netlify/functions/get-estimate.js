// netlify/functions/get-estimate.js
//
// Pobiera kosztorys po jego UUID. Zwraca 404, jeśli nie istnieje.
//
// KLUCZOWA DECYZJA ARCHITEKTONICZNA: celowo NIE wymagamy tu sessionId.
// Link z samym ?id=... ma działać jak "link do udostępnionego dokumentu"
// (podobnie jak Google Docs "każdy, kto ma link") — każdy, kto go zna,
// może otworzyć kosztorys w trybie odczytu. Ograniczenie sessionId
// dotyczy WYŁĄCZNIE zapisu (patrz save-estimate.js), nie odczytu.
// To świadomy kompromis: bez kont użytkowników to jedyny sensowny
// sposób na "podziel się kosztorysem z wykonawcą przez link".
//
// BEZPIECZEŃSTWO: session_id właściciela NIGDY nie wychodzi z serwera —
// to on uprawnia do zapisu. Klient przysyła własny sessionId w nagłówku
// X-Session-Id (nie w URL, żeby nie lądował w logach i historii),
// a my odpowiadamy tylko isOwner: true/false.

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Metoda niedozwolona, użyj GET.' })
    };
  }

  const id = event.queryStringParameters && event.queryStringParameters.id;
  const headers = event.headers || {};
  const clientSessionId = headers['x-session-id'] || headers['X-Session-Id'] || null;
  if (!id) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Brak parametru id w zapytaniu.' })
    };
  }

  try {
    const { data, error } = await supabase
      .from('cost_estimates')
      .select('id, project_name, kosztorys_zatwierdzony, line_items, dokumentacja_ogolna, notatki_spotkan, protokoly, updated_at, session_id')
      .eq('id', id)
      .single();

    if (error || !data) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Nie znaleziono kosztorysu o podanym id.' })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        id: data.id,
        projectName: data.project_name,
        kosztorysZatwierdzony: data.kosztorys_zatwierdzony,
        lineItems: data.line_items,
        dokumentacjaOgolna: data.dokumentacja_ogolna,
        notatkiSpotkan: data.notatki_spotkan,
        protokoly: data.protokoly,
        updatedAt: data.updated_at,
        // Tylko informacja, czy otwierający jest właścicielem (tryb edycji)
        // czy otwiera cudzy kosztorys z linku (tryb tylko-do-odczytu).
        isOwner: !!clientSessionId && clientSessionId === data.session_id
      })
    };
  } catch (err) {
    console.error('Błąd odczytu z Supabase:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Błąd odczytu z bazy danych.' })
    };
  }
};
