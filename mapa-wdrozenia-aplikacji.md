# Mapa wdrożenia — aplikacja "Pokrycie kosztorysu ofertami"

Roadmapa od obecnego prototypu (localStorage) do publicznego, płatnego produktu SaaS.
Checkboxy do odznaczania w miarę postępu. Nie trzeba robić wszystkiego naraz —
kolejność etapów ma znaczenie, ale tempo jest Twoje.

---

## Etap 0 — Tam, gdzie już jesteśmy ✅

- [x] Zdefiniowany model danych: kosztorys jako punkt odniesienia, oferty/kontroferty,
      wybór oferty, sugerowany zakres z checkboxami, harmonogram rzeczowo-finansowy
- [x] Działający prototyp lokalny (localStorage, jedna przeglądarka, jedno urządzenie)
- [x] Ustalony model biznesowy: **płatna subskrypcja miesięczna**
- [x] Ustalona grupa docelowa: **samodzielny produkt dla dowolnego inwestora/kierownika budowy**

---

## Etap 1 — Dokończenie testów prototypu (jesteś tutaj)

- [ ] Przetestuj prototyp na realnych lub zbliżonych do realnych danych
      z kilku różnych projektów
- [ ] Zbierz wszystkie uwagi do modelu (tak jak dotychczas — kontroferty,
      harmonogram, format dat itd.)
- [ ] Zdecyduj, czy model danych jest już "wystarczająco dobry", żeby przejść
      do prawdziwej wersji, czy potrzeba więcej iteracji
- [ ] Zapytaj 2-3 znajomych z branży (inwestorów/kierowników budowy), czy taki
      sposób pracy ma dla nich sens — to najtańsza forma walidacji przed
      inwestycją czasu w produkcyjną wersję

**Kryterium wyjścia z tego etapu:** model danych nie zmienia się już drastycznie
z sesji na sesję, tylko drobne poprawki kosmetyczne.

---

## Etap 2 — Prawdziwa baza danych i logowanie

- [ ] Wybór dostawcy: Supabase albo Firebase (obie mają darmowy plan startowy)
- [ ] Założenie konta i projektu u wybranego dostawcy
- [ ] Zaprojektowanie schematu bazy danych (tabele: użytkownicy, projekty,
      pozycje kosztorysu, oferty, punkty zakresu)
- [ ] Wdrożenie logowania/rejestracji (e-mail + hasło, ewentualnie logowanie
      przez Google)
- [ ] Migracja logiki z localStorage na prawdziwe zapytania do bazy danych
- [ ] Test: dwóch różnych użytkowników nie widzi nawzajem swoich danych
      (kluczowy test bezpieczeństwa na tym etapie)

---

## Etap 3 — Płatności (subskrypcja miesięczna)

- [ ] Wybór dostawcy płatności (typowo: Stripe)
- [ ] Ustalenie ceny subskrypcji
- [ ] Integracja: strona z planami, checkout, webhooki potwierdzające płatność
- [ ] Obsługa stanów konta: okres próbny (jeśli chcesz), aktywna subskrypcja,
      subskrypcja anulowana/wygasła
- [ ] Blokada dostępu do funkcji aplikacji dla kont bez aktywnej subskrypcji

---

## Etap 4 — Kontrola przed publicznym uruchomieniem

- [ ] **Jednorazowa konsultacja z kimś doświadczonym** w kwestii bezpieczeństwa
      integracji płatności i reguł dostępu do danych (patrz nasza wcześniejsza
      rozmowa — to nie blokuje budowy, tylko kontrola przed startem)
- [ ] Polityka prywatności **dla aplikacji** (osobna od tej na ratiopro.net —
      inny zakres danych: konta, dane projektów, płatności)
- [ ] Regulamin/warunki korzystania **dla aplikacji** (osobny od Regulaminu
      usług kosztorysowych — to inny produkt, inne zasady)
- [ ] Sprawdzenie zgodności z RODO w zakresie przechowywania danych projektów
      budowlanych klientów

---

## Etap 5 — Infrastruktura i wdrożenie

- [ ] Wybór hostingu aplikacji (Netlify z funkcjami serwerowymi, albo inny
      hosting dopasowany do wybranej bazy danych)
- [ ] Domena dla aplikacji — np. subdomena typu `app.ratiopro.net`, albo
      osobna domena, jeśli produkt ma być odrębną marką
- [ ] Konfiguracja Git/GitHub → automatyczny deploy (ten sam mechanizm,
      którego już się nauczyłeś przy ratiopro.net)
- [ ] Podstawowy monitoring — powiadomienie e-mail/SMS w razie awarii
      (żebyś nie dowiadywał się o problemie od zdenerwowanego klienta)

---

## Etap 6 — Promocja aplikacji na stronie ratiopro.net

To jest ten punkt, o którym pamiętasz — rozpisuję go szczegółowo, żeby nic
nie umknęło:

- [ ] **Aktualizacja sekcji zajawki na stronie głównej** — obecny tekst
      "Wkrótce udostępnimy profesjonalne, autorskie arkusze kalkulacyjne..."
      zamienić na konkretną nazwę produktu i link do rejestracji/strony produktu
- [ ] **Dedykowana podstrona produktu** na ratiopro.net — opis funkcji
      (kosztorys vs oferty, harmonogram rzeczowo-finansowy), zrzuty ekranu,
      cena subskrypcji, przycisk "Wypróbuj" / "Zarejestruj się"
- [ ] **Link w głównej nawigacji** — dodać obok "Jak pracujemy" i "Case studies"
- [ ] **Lista oczekujących (waitlist)** — jeśli chcesz zbierać zainteresowanych
      przed pełnym uruchomieniem, prosty formularz "Powiadom mnie o starcie"
      (możemy to zrobić na Netlify Forms, tak jak formularz kontaktowy)
- [ ] **Wzmianka w Case Studies** — w istniejących artykułach (np. "Wybór
      generalnego wykonawcy") można dodać naturalne odniesienie: "narzędzie
      takie jak [nazwa] pomaga to śledzić" — jako miękka promocja w kontekście
- [ ] **Wpis na "Jak pracujemy"** — jeśli aplikacja uzupełnia usługę
      kosztorysowania, warto to pokazać jako naturalny kolejny krok po
      otrzymaniu kosztorysu od Ratio

---

## Etap 7 — Uruchomienie i obserwacja

- [ ] Miękki start — ograniczona liczba pierwszych użytkowników (np. znajomi
      z branży, poprzedni klienci Ratio) zanim ogłosisz to szeroko
- [ ] Zbieranie feedbacku od pierwszych realnych użytkowników płacących
- [ ] Dopiero po potwierdzeniu, że model działa — szersza promocja i,
      jeśli zajdzie potrzeba, rozmowa o skalowaniu z doświadczonym zespołem

---

## Rzeczy odłożone na później (świadomie, nie zapomniane)

- **Cennik bazowy usług Ratio** (kosztorysy/harmonogramy) — osobny temat,
  poza tą aplikacją
- **Upload PDF/OCR ofert** — wspomniałeś o tym jako docelowej funkcji,
  ale zdecydowaliśmy się zacząć od ręcznego wpisywania w MVP
- **Baner cookies** — dopiero gdy dodasz Google Analytics na ratiopro.net
