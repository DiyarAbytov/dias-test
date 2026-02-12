(function () {
  'use strict';

  // ——— Вкладки: при загрузке без hash показываем первую вкладку ———
  function initTabs() {
    var tabsWrap = document.querySelector('.tabs');
    if (!tabsWrap) return;

    var firstLink = tabsWrap.querySelector('a[href^="#"]');
    var firstHash = firstLink ? firstLink.getAttribute('href') : '';
    var panelIds = [];
    tabsWrap.querySelectorAll('a[href^="#"]').forEach(function (a) {
      var id = a.getAttribute('href').slice(1);
      if (id && document.getElementById(id)) panelIds.push(id);
    });

    var currentHash = document.location.hash || '';
    var hashId = currentHash.slice(1);
    var hasValidTab = panelIds.indexOf(hashId) !== -1;

    if (!hasValidTab && firstHash) {
      document.location.hash = firstHash;
      return;
    }

    // Обновляем класс .active у ссылок вкладок при смене hash
    function updateTabActive() {
      var id = (document.location.hash || '').slice(1);
      tabsWrap.querySelectorAll('a[href^="#"]').forEach(function (a) {
        var href = a.getAttribute('href').slice(1);
        a.classList.toggle('active', href === id && panelIds.indexOf(href) !== -1);
      });
    }
    updateTabActive();
    window.addEventListener('hashchange', updateTabActive);
  }

  // ——— Модалки: закрытие по клику и возврат к вкладке; формы не перезагружают страницу ———
  var hashBeforeModal = '';

  function isModalId(id) {
    if (!id) return false;
    var el = document.getElementById(id);
    return el && el.classList && el.classList.contains('modal-overlay');
  }

  function getFirstTabHash() {
    var tabsWrap = document.querySelector('.tabs');
    if (!tabsWrap) return '';
    var first = tabsWrap.querySelector('a[href^="#"]');
    return first ? first.getAttribute('href') : '';
  }

  function closeModal(goToTab) {
    var target = goToTab || hashBeforeModal || getFirstTabHash();
    if (target && target.charAt(0) === '#') target = target.slice(1);
    document.location.hash = target || '';
  }

  window.addEventListener('hashchange', function (e) {
    var newHash = (document.location.hash || '').slice(1);
    if (isModalId(newHash) && e.oldURL) {
      var match = e.oldURL.match(/#([^#]*)$/);
      hashBeforeModal = match ? match[1] : '';
    }
    if (!isModalId(newHash)) hashBeforeModal = '';
  });

  document.addEventListener('DOMContentLoaded', function () {
    initTabs();

    // Закрытие модалки по клику на overlay (не по контенту)
    document.querySelectorAll('.modal-overlay').forEach(function (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) {
          e.preventDefault();
          closeModal();
        }
      });
    });

    // Закрытие по кнопкам "Отмена" и "×" (href="#")
    document.querySelectorAll('.modal-close, .modal .btn-secondary').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        if (this.getAttribute('href') === '#') {
          e.preventDefault();
          closeModal();
        }
      });
    });

    // Формы в модалках: не отправлять, закрыть модалку (демо)
    document.querySelectorAll('.modal form').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        closeModal();
      });
    });

    // Кнопки "Удалить" в модалках подтверждения — тоже только закрыть
    document.querySelectorAll('.modal-overlay .btn-danger').forEach(function (btn) {
      var modal = btn.closest('.modal-overlay');
      if (modal && modal.querySelector('form') === null) {
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          closeModal();
        });
      }
    });

    // Валидация ОТК: сумма принято + брак должна равняться произведённому
    var otkAccepted = document.getElementById('otk-accepted');
    var otkRejected = document.getElementById('otk-rejected');
    var otkTotal = document.getElementById('otk-total');
    var otkWarning = document.getElementById('otk-warning');
    var otkForm = otkAccepted ? otkAccepted.closest('form') : null;
    var producedQty = 50; // Количество произведённого (можно брать из данных)

    if (otkAccepted && otkRejected && otkTotal && otkWarning) {
      function updateOtkTotal() {
        var accepted = parseInt(otkAccepted.value) || 0;
        var rejected = parseInt(otkRejected.value) || 0;
        var total = accepted + rejected;
        otkTotal.textContent = total + ' шт (должно быть ' + producedQty + ' шт)';
        
        if (total !== producedQty) {
          otkWarning.style.display = 'block';
          otkTotal.style.color = 'var(--danger)';
          if (otkForm) {
            var submitBtns = otkForm.querySelectorAll('button[type="submit"]');
            submitBtns.forEach(function(btn) {
              btn.disabled = true;
              btn.style.opacity = '0.5';
            });
          }
        } else {
          otkWarning.style.display = 'none';
          otkTotal.style.color = 'var(--success)';
          if (otkForm) {
            var submitBtns = otkForm.querySelectorAll('button[type="submit"]');
            submitBtns.forEach(function(btn) {
              btn.disabled = false;
              btn.style.opacity = '1';
            });
          }
        }
      }
      otkAccepted.addEventListener('input', updateOtkTotal);
      otkRejected.addEventListener('input', updateOtkTotal);
      updateOtkTotal();
    }
  });
})();
