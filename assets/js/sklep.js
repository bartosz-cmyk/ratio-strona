/*
 * Sklep z poradnikami RATIO — jedno miejsce na ceny i linki do kasy Ecomfly.
 *
 * Jak uruchomić sprzedaż:
 *   1. W panelu Ecomfly utwórz produkt i skopiuj jego link (np. https://www.ecomfly.shop/c/xxxxxxxx).
 *   2. Wklej go w pole `url` poniżej.
 *   3. Przyciski „Kup” na stronie poradniki.html i w wyniku ankiety same się włączą.
 * Dopóki `url` jest pusty, przycisk pokazuje „Sprzedaż wkrótce” i jest nieaktywny.
 *
 * Ceny brutto w zł (z VAT). Muszą być takie same jak w Ecomfly.
 */
window.RATIO_SKLEP = {
  tom1:   { cena: 89,  url: '' }, // Tom 1 · Budujesz sam
  tom2:   { cena: 79,  url: '' }, // Tom 2 · Koordynujesz ekipy
  tom3:   { cena: 79,  url: '' }, // Tom 3 · Wybierasz wykonawcę i pilnujesz go
  pakiet: { cena: 179, url: '' }  // Wszystkie 3 tomy
};

(function () {
  var S = window.RATIO_SKLEP;
  function zl(n) { return n.toLocaleString('pl-PL') + ' zł'; }

  function apply(root) {
    root = root || document;
    root.querySelectorAll('[data-cena]').forEach(function (el) {
      var p = S[el.getAttribute('data-cena')];
      if (p) el.textContent = zl(p.cena);
    });
    root.querySelectorAll('[data-oszczednosc]').forEach(function (el) {
      var suma = S.tom1.cena + S.tom2.cena + S.tom3.cena;
      el.textContent = zl(suma - S.pakiet.cena);
    });
    root.querySelectorAll('[data-suma]').forEach(function (el) {
      el.textContent = zl(S.tom1.cena + S.tom2.cena + S.tom3.cena);
    });
    root.querySelectorAll('[data-kup]').forEach(function (el) {
      var p = S[el.getAttribute('data-kup')];
      if (p && p.url) {
        el.setAttribute('href', p.url);
        el.removeAttribute('aria-disabled');
        el.classList.remove('is-soon');
        if (!el.hasAttribute('data-label-keep')) el.textContent = 'Kup za ' + zl(p.cena);
      } else {
        el.removeAttribute('href');
        el.setAttribute('aria-disabled', 'true');
        el.classList.add('is-soon');
        if (!el.hasAttribute('data-label-keep')) el.textContent = 'Sprzedaż wkrótce';
      }
    });
  }

  window.RATIO_SKLEP_APPLY = apply;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { apply(); });
  } else {
    apply();
  }
})();
