/**
 * Компоненты UI: модалки, таблицы, вкладки
 */
(function() {
  'use strict';

  // ===== Вкладки =====
  window.initTabs = function() {
    var tabsWrap = document.querySelector('.tabs');
    if (!tabsWrap) return;

    var firstLink = tabsWrap.querySelector('a[href^="#"]');
    var firstHash = firstLink ? firstLink.getAttribute('href').replace('#', '') : '';
    var panelIds = [];
    tabsWrap.querySelectorAll('a[href^="#"]').forEach(function (a) {
      var id = a.getAttribute('href').slice(1);
      if (id && document.getElementById(id)) panelIds.push(id);
    });

    var currentHash = (document.location.hash || '').slice(1);
    var hasValidTab = panelIds.indexOf(currentHash) !== -1;

    if (!hasValidTab && firstHash) {
      document.location.hash = firstHash;
    }

    function updateTabActive() {
      var id = (document.location.hash || '').slice(1);
      if (!id || panelIds.indexOf(id) === -1) {
        id = firstHash;
      }
      tabsWrap.querySelectorAll('a[href^="#"]').forEach(function (a) {
        var href = a.getAttribute('href').slice(1);
        a.classList.toggle('active', href === id);
      });
      document.querySelectorAll('.tab-panel').forEach(function (panel) {
        if (panel.id && panelIds.indexOf(panel.id) !== -1) {
          panel.style.display = panel.id === id ? 'block' : 'none';
        }
      });
    }
    updateTabActive();
    window.addEventListener('hashchange', updateTabActive);
  };

  // ===== Модалки =====
  var hashBeforeModal = '';

  window.isModalId = function(id) {
    if (!id) return false;
    var el = document.getElementById(id);
    return el && el.classList && el.classList.contains('modal-overlay');
  };

  window.getFirstTabHash = function() {
    var tabsWrap = document.querySelector('.tabs');
    if (!tabsWrap) return '';
    var first = tabsWrap.querySelector('a[href^="#"]');
    return first ? first.getAttribute('href') : '';
  };

  /**
   * Закрыть модальное окно и очистить формы создания
   * @param {string} goToTab - Хеш для перехода после закрытия
   */
  window.closeModal = function(goToTab) {
    // Очищаем все модалки создания при закрытии
    var createModals = [
      'modal-create-task-chem', 
      'modal-create-recipe', 
      'modal-create-chem', 
      'modal-open-shift',
      'modal-produce'
    ];
    
    createModals.forEach(function(modalId) {
      var modal = document.getElementById(modalId);
      if (modal) {
        var form = modal.querySelector('form');
        if (form) {
          form.reset();
          
          // Очищаем все tbody в форме
          form.querySelectorAll('tbody').forEach(function(tbody) {
            tbody.innerHTML = '';
          });
          
          // Специфичная очистка для разных модалок
          if (modalId === 'modal-create-task-chem') {
            var elementsList = modal.querySelector('#chem-elements-list');
            if (elementsList) elementsList.innerHTML = '';
          }
          
          if (modalId === 'modal-create-recipe') {
            var compositionRow = Array.from(form.querySelectorAll('.form-row')).find(function(row) {
              var label = row.querySelector('label');
              return label && label.textContent.trim() === 'Состав';
            });
            if (compositionRow) {
              var tbody = compositionRow.querySelector('tbody');
              if (tbody) tbody.innerHTML = '';
              var recipeComponentSelect = compositionRow.querySelector('#recipe-component-select');
              if (recipeComponentSelect) {
                recipeComponentSelect.value = '';
                recipeComponentSelect.selectedIndex = 0;
              }
            }
          }
          
          if (modalId === 'modal-create-chem') {
            var compositionRow = Array.from(form.querySelectorAll('.form-row')).find(function(row) {
              var label = row.querySelector('label');
              return label && label.textContent.trim() === 'Состав';
            });
            if (compositionRow) {
              var tbody = compositionRow.querySelector('tbody');
              if (tbody) tbody.innerHTML = '';
            }
          }
          
          if (modalId === 'modal-open-shift') {
            var lineSelect = form.querySelector('select');
            if (lineSelect) {
              lineSelect.value = '';
              lineSelect.selectedIndex = 0;
            }
          }
          
          if (modalId === 'modal-produce') {
            var orderSelect = form.querySelector('#order-select');
            if (orderSelect) {
              orderSelect.value = '';
              orderSelect.selectedIndex = 0;
            }
            var writeoffList = form.querySelector('#writeoff-list');
            if (writeoffList) {
              writeoffList.innerHTML = '';
            }
          }
        }
        modal.dataset.itemId = '';
      }
    });
    
    var target = goToTab || hashBeforeModal || window.getFirstTabHash();
    if (target && target.charAt(0) === '#') target = target.slice(1);
    document.location.hash = target || '';
  };

  // Отслеживание хеша перед открытием модалки
  window.addEventListener('hashchange', function (e) {
    var newHash = (document.location.hash || '').slice(1);
    if (window.isModalId(newHash) && e.oldURL) {
      var match = e.oldURL.match(/#([^#]*)$/);
      hashBeforeModal = match ? match[1] : '';
    }
    if (!window.isModalId(newHash)) hashBeforeModal = '';
  });

  // Закрытие модалок по клику на overlay или кнопку закрытия
  document.body.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-overlay') || e.target.classList.contains('modal-close')) {
      e.preventDefault();
      window.closeModal();
    }
  });

  // ===== Таблицы =====
  /**
   * Рендеринг таблицы из данных
   * @param {HTMLElement} tbody - Элемент tbody
   * @param {Array} data - Массив данных
   * @param {Function} rowTemplate - Функция для создания строки
   */
  window.renderTable = function(tbody, data, rowTemplate) {
    if (!tbody) return;
    tbody.innerHTML = '';
    if (data.length === 0) {
      var tr = document.createElement('tr');
      var colCount = tbody.closest('table') ? tbody.closest('table').querySelectorAll('thead th').length : 1;
      tr.innerHTML = '<td colspan="' + colCount + '" style="text-align: center; color: var(--text-muted); padding: 2rem;">Нет данных</td>';
      tbody.appendChild(tr);
      return;
    }
    data.forEach(function(item) {
      var tr = document.createElement('tr');
      tr.innerHTML = rowTemplate(item);
      tbody.appendChild(tr);
    });
  };
})();
