/**
 * Главный файл приложения
 * Использует модули: storage.js, utils.js, components.js, forms.js
 */
(function () {
  'use strict';

  // Проверяем, что модули загружены
  if (typeof window.Storage === 'undefined') {
    console.error('Модуль storage.js не загружен!');
    return;
  }
  if (typeof window.getFieldKey === 'undefined') {
    console.error('Модуль utils.js не загружен!');
    return;
  }
  if (typeof window.initTabs === 'undefined') {
    console.error('Модуль components.js не загружен!');
    return;
  }
  if (typeof window.initUniversalForms === 'undefined') {
    console.error('Модуль forms.js не загружен!');
    return;
  }

  // Используем модули
  var Storage = window.Storage;

  // Используем функции из модулей
  var initTabs = window.initTabs;
  var isModalId = window.isModalId;
  var getFirstTabHash = window.getFirstTabHash;
  var closeModal = window.closeModal;
  var renderTable = window.renderTable;
  var getInputValue = window.getInputValue;
  var getFieldKey = window.getFieldKey;
  var getStorageKeyByTable = window.getStorageKeyByTable;
  var getFormConfig = window.getFormConfig;
  var collectFormData = window.collectFormData;
  var collectChemistryTaskData = window.collectChemistryTaskData;

  // ===== Рендеринг таблиц =====
  function renderTable(tbody, data, rowTemplate) {
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
  }

  // Глобальные функции загрузки данных для доступа из других мест
  window.reloadMaterials = function() {
    var page = document.querySelector('body[data-page="materials"]');
    if (!page) return;
    initMaterials();
  };
  
  window.reloadUsers = function() {
    var page = document.querySelector('body[data-page="users"]');
    if (!page) return;
    initUsers();
  };
  
  window.reloadClients = function() {
    var page = document.querySelector('body[data-page="clients"]');
    if (!page) return;
    initClients();
  };
  
  window.reloadLines = function() {
    var page = document.querySelector('body[data-page="lines"]');
    if (!page) return;
    initLines();
  };

  // ===== Материалы (Склад сырья) =====
  function initMaterials() {
    var page = document.querySelector('body[data-page="materials"]');
    if (!page) return;

    var rawTbody = document.querySelector('#tab-raw tbody') || document.querySelector('.tab-panel#tab-raw tbody');
    var incomingTbody = document.querySelector('#tab-incoming tbody') || document.querySelector('.tab-panel#tab-incoming tbody');
    var balancesTbody = document.querySelector('#tab-balances tbody') || document.querySelector('.tab-panel#tab-balances tbody');

    function loadRawMaterials() {
      var data = Storage.get('rawMaterials');
      if (rawTbody) {
        renderTable(rawTbody, data, function(item) {
          return '<td>' + (item.name || '') + '</td>' +
                 '<td>' + (item.unit || '') + '</td>' +
                 '<td class="actions">' +
                 '<a href="#modal-edit-raw" data-id="' + item.id + '" class="btn btn-secondary btn-sm">Редактировать</a> ' +
                 '<a href="#modal-delete-raw" data-id="' + item.id + '" class="btn btn-danger btn-sm">Удалить</a>' +
                 '</td>';
        });
      }
    }

    function loadIncoming() {
      var data = Storage.get('incoming');
      if (incomingTbody) {
        renderTable(incomingTbody, data, function(item) {
          return '<td>' + (item.date || '—') + '</td>' +
                 '<td>' + (item.material || '—') + '</td>' +
                 '<td>' + (item.quantity || 0) + ' ' + (item.unit || 'кг') + '</td>' +
                 '<td>' + (item.batch || '—') + '</td>' +
                 '<td>' + (item.supplier || '—') + '</td>' +
                 '<td>' + (item.comment || '—') + '</td>';
        });
      }
    }

    function loadBalances() {
      var data = Storage.get('incoming');
      if (balancesTbody) {
        var balances = {};
        data.forEach(function(item) {
          var key = item.material;
          if (!key) return;
          if (!balances[key]) {
            balances[key] = { material: key, total: 0, batches: [] };
          }
          var qty = parseFloat(item.quantity) || 0;
          balances[key].total += qty;
          balances[key].batches.push({
            batch: item.batch || '—',
            quantity: qty,
            date: item.date,
            supplier: item.supplier || '—'
          });
        });
        var balancesArray = Object.keys(balances).map(function(key) {
          var b = balances[key];
          return {
            material: key,
            total: b.total,
            batches: b.batches
          };
        });
        renderTable(balancesTbody, balancesArray, function(item) {
          var batchRow = item.batches[0] || {};
          return '<td>' + item.material + '</td>' +
                 '<td>' + item.total.toFixed(2) + ' кг</td>' +
                 '<td>' + (batchRow.batch || '—') + '</td>' +
                 '<td>' + (batchRow.quantity || 0) + ' кг</td>' +
                 '<td>' + (batchRow.date || '—') + '</td>' +
                 '<td>' + (batchRow.supplier || '—') + '</td>';
        });
      }
    }

    // Формы обрабатываются универсальной системой
    // Но нужно обновлять select'ы при изменении данных
    var updateInterval = setInterval(function() {
      updateMaterialSelects();
    }, 500);
    
    // Останавливаем обновление после загрузки
    setTimeout(function() {
      clearInterval(updateInterval);
    }, 2000);

    // Заполнение select сырья
    function updateMaterialSelects() {
      updateMaterialSelectsForModals();
    }
    
    function updateMaterialSelectsForModals() {
      var materials = Storage.get('rawMaterials');
      document.querySelectorAll('.modal select').forEach(function(select) {
        var label = select.closest('.form-row') ? select.closest('.form-row').querySelector('label') : null;
        if (label && label.textContent.trim() === 'Сырьё') {
          var currentValue = select.value;
          select.innerHTML = '<option value="">—</option>';
          materials.forEach(function(m) {
            var option = document.createElement('option');
            option.value = m.name;
            option.textContent = m.name;
            if (m.name === currentValue) option.selected = true;
            select.appendChild(option);
          });
        }
      });
    }
    
    // Обновление данных при изменении localStorage из других вкладок
    window.addEventListener('storage', function() {
      loadRawMaterials();
      loadIncoming();
      loadBalances();
      updateMaterialSelectsForModals();
    });
    
    // Обновление select'ов при открытии модалки прихода
    var incomingModal = document.querySelector('#modal-incoming');
    if (incomingModal) {
      var observer = new MutationObserver(function() {
        if (document.location.hash === '#modal-incoming') {
          updateMaterialSelectsForModals();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }

    loadRawMaterials();
    loadIncoming();
    loadBalances();
    updateMaterialSelects();
  }

  // ===== Пользователи =====
  function initUsers() {
    var page = document.querySelector('body[data-page="users"]');
    if (!page) return;

    var usersTbody = document.querySelector('#tab-users tbody');
    var rolesTbody = document.querySelector('#tab-roles tbody');

    function loadUsers() {
      var data = Storage.get('users');
      if (usersTbody) {
        renderTable(usersTbody, data, function(item) {
          return '<td>' + item.name + '</td>' +
                 '<td>' + item.email + '</td>' +
                 '<td>' + item.role + '</td>' +
                 '<td class="actions">' +
                 '<a href="#modal-access-' + item.id + '" class="btn btn-secondary btn-sm">Доступы</a> ' +
                 '<a href="#modal-edit-user" data-id="' + item.id + '" class="btn btn-secondary btn-sm">Редактировать</a> ' +
                 '<a href="#modal-delete-user" data-id="' + item.id + '" class="btn btn-danger btn-sm">Удалить</a>' +
                 '</td>';
        });
      }
    }

    function loadRoles() {
      var data = Storage.get('roles');
      if (rolesTbody) {
        renderTable(rolesTbody, data, function(item) {
          var userCount = Storage.get('users').filter(function(u) { return u.role === item.name; }).length;
          return '<td><strong>' + item.name + '</strong></td>' +
                 '<td>' + (item.description || '') + '</td>' +
                 '<td>' + userCount + '</td>' +
                 '<td class="actions">' +
                 '<a href="#modal-edit-role-' + item.id + '" class="btn btn-secondary btn-sm">Редактировать</a> ' +
                 '<a href="#modal-delete-role" data-id="' + item.id + '" class="btn btn-danger btn-sm">Удалить</a>' +
                 '</td>';
        });
      }
    }

    // Формы обрабатываются универсальной системой
    // Но нужно обновлять select ролей
    function updateRoleSelectsForModals() {
      var roles = Storage.get('roles');
      document.querySelectorAll('.modal select').forEach(function(select) {
        var label = select.closest('.form-row') ? select.closest('.form-row').querySelector('label') : null;
        if (label && label.textContent.trim() === 'Роль') {
          var currentValue = select.value;
          select.innerHTML = '';
          roles.forEach(function(r) {
            var option = document.createElement('option');
            option.value = r.name;
            option.textContent = r.name;
            if (r.name === currentValue) option.selected = true;
            select.appendChild(option);
          });
        }
      });
    }
    
    updateRoleSelectsForModals();

    // Инициализация существующих данных пользователей
    if (Storage.get('users').length === 0) {
      Storage.set('users', [
        { id: '1', name: 'Иванов Иван Иванович', email: 'ivanov@example.com', role: 'Администратор' },
        { id: '2', name: 'Петрова Анна', email: 'petrova@example.com', role: 'Начальник смены' }
      ]);
    }
    if (Storage.get('roles').length === 0) {
      Storage.set('roles', [
        { id: '1', name: 'Администратор', description: 'Полный доступ ко всем разделам системы' },
        { id: '2', name: 'Начальник смены', description: 'Управление сменами, просмотр производства и заказов' },
        { id: '3', name: 'Химик', description: 'Работа с химическими элементами, план заданий' },
        { id: '4', name: 'Технолог', description: 'Создание и редактирование рецептов' },
        { id: '5', name: 'Оператор', description: 'Выпуск продукции на линии' },
        { id: '6', name: 'Инспектор ОТК', description: 'Проверка качества продукции' }
      ]);
    }

    loadUsers();
    loadRoles();
  }

  // ===== Клиенты =====
  function initClients() {
    var page = document.querySelector('body[data-page="clients"]');
    if (!page) return;

    var tbody = document.querySelector('tbody');
    if (!tbody) return;

    function loadClients() {
      var data = Storage.get('clients');
      renderTable(tbody, data, function(item) {
        var fio = item.fio || item.contact || '—';
        var company = item.company || item.name || '—';
        var displayName = (item.fio || item.contact || item.name || 'Клиент');
        var safeName = displayName.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        return '<td>' + (fio !== '—' ? fio : (item.name || '—')) + '</td>' +
               '<td>' + (item.phone || '—') + '</td>' +
               '<td>' + (company !== '—' ? company : (item.name || '—')) + '</td>' +
               '<td>' + (item.inn || '—') + '</td>' +
               '<td>' + (item.address || '—') + '</td>' +
               '<td class="actions">' +
               '<a href="#modal-client-history" class="btn btn-secondary btn-sm btn-client-history" data-client-name="' + safeName + '" data-client-id="' + (item.id || '') + '">История</a> ' +
               '<a href="#modal-edit-client" data-id="' + item.id + '" class="btn btn-secondary btn-sm">Редактировать</a> ' +
               '<a href="#modal-delete-client" data-id="' + item.id + '" class="btn btn-danger btn-sm">Удалить</a>' +
               '</td>';
      });
    }

    // При клике на «История» подставляем имя клиента в заголовок модалки
    page.addEventListener('click', function(e) {
      var btn = e.target && e.target.closest('.btn-client-history');
      if (!btn) return;
      var name = btn.getAttribute('data-client-name') || 'Клиент';
      var modal = document.getElementById('modal-client-history');
      if (modal) {
        var h3 = modal.querySelector('h3');
        if (h3) h3.textContent = 'История клиента: ' + (name.replace(/&quot;/g, '"').replace(/&#39;/g, "'"));
      }
    });

    loadClients();
  }

  // ===== Линии =====
  var LINE_HISTORY_KEY = 'lineHistory';

  function getLineStatus(lineId, history) {
    var last = history.filter(function(h) { return h.lineId === lineId; }).sort(function(a, b) {
      var da = (a.date || '') + ' ' + (a.time || '');
      var db = (b.date || '') + ' ' + (b.time || '');
      return db.localeCompare(da);
    })[0];
    return last ? last.action : 'Закрыта';
  }

  function getLastOpenClose(lineId, history, action) {
    var ev = history.filter(function(h) { return h.lineId === lineId && h.action === action; }).sort(function(a, b) {
      var da = (a.date || '') + ' ' + (a.time || '');
      var db = (b.date || '') + ' ' + (b.time || '');
      return db.localeCompare(da);
    })[0];
    return ev ? (ev.date || '') + ' ' + (ev.time || '') : '—';
  }

  function initLines() {
    var page = document.querySelector('body[data-page="lines"]');
    if (!page) return;

    var tbody = document.querySelector('#tab-lines-list tbody');
    var openTbody = document.getElementById('lines-open-tbody');
    var historyTbody = document.getElementById('lines-history-tbody');

    function loadLines() {
      var data = Storage.get('lines');
      if (tbody) {
        renderTable(tbody, data, function(item) {
          return '<td>' + (item.name || '') + '</td>' +
                 '<td class="actions">' +
                 '<a href="#modal-edit-line" data-id="' + item.id + '" class="btn btn-secondary btn-sm">Редактировать</a> ' +
                 '<a href="#modal-delete-line" data-id="' + item.id + '" class="btn btn-danger btn-sm">Удалить</a>' +
                 '</td>';
        });
      }
    }

    function loadLinesOpen() {
      if (!openTbody) return;
      var lines = Storage.get('lines');
      var history = Storage.get(LINE_HISTORY_KEY);
      openTbody.innerHTML = '';
      lines.forEach(function(line) {
        var status = getLineStatus(line.id, history);
        var lastOpen = getLastOpenClose(line.id, history, 'Открыта');
        var lastClose = getLastOpenClose(line.id, history, 'Закрыта');
        var statusClass = status === 'Открыта' ? 'badge-success' : 'badge-default';
        var openBtn = status === 'Закрыта' ? '<button type="button" class="btn btn-success btn-sm btn-open-line" data-line-id="' + line.id + '" data-line-name="' + (line.name || '').replace(/"/g, '&quot;') + '">Открыть</button>' : '';
        var closeBtn = status === 'Открыта' ? '<button type="button" class="btn btn-secondary btn-sm btn-close-line" data-line-id="' + line.id + '" data-line-name="' + (line.name || '').replace(/"/g, '&quot;') + '">Закрыть</button>' : '';
        var tr = document.createElement('tr');
        tr.innerHTML = '<td>' + (line.name || '') + '</td>' +
          '<td><span class="badge ' + statusClass + '">' + status + '</span></td>' +
          '<td>' + lastOpen + '</td>' +
          '<td>' + lastClose + '</td>' +
          '<td class="actions">' + openBtn + ' ' + closeBtn + '</td>';
        openTbody.appendChild(tr);
      });
      if (lines.length === 0) {
        var empty = document.createElement('tr');
        empty.innerHTML = '<td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">Нет линий. Создайте линию во вкладке «Линия».</td>';
        openTbody.appendChild(empty);
      }
    }

    function loadLinesHistory() {
      if (!historyTbody) return;
      var history = Storage.get(LINE_HISTORY_KEY);
      history = history.slice().sort(function(a, b) {
        var da = (a.date || '') + ' ' + (a.time || '');
        var db = (b.date || '') + ' ' + (b.time || '');
        return db.localeCompare(da);
      });
      renderTable(historyTbody, history, function(item) {
        var actionClass = item.action === 'Открыта' ? 'badge-success' : 'badge-default';
        return '<td>' + (item.date || '') + ' ' + (item.time || '') + '</td>' +
               '<td>' + (item.lineName || '—') + '</td>' +
               '<td><span class="badge ' + actionClass + '">' + (item.action || '') + '</span></td>';
      });
    }

    loadLines();
    loadLinesOpen();
    loadLinesHistory();

    window.refreshLinesOpenAndHistory = function() {
      loadLinesOpen();
      loadLinesHistory();
    };
  }

  // ===== Химия: задания =====
  function initChemistryTasks() {
    var page = document.querySelector('body[data-page="chemistry"]');
    if (!page) return;

    var tbody = document.querySelector('#tab-chem-plan tbody');
    if (!tbody) return;

    function loadChemistryTasks() {
      var data = Storage.get('chemistryTasks');
      renderTable(tbody, data, function(item) {
        var elementsText = '—';
        if (item.elements && item.elements.length > 0) {
          elementsText = item.elements.map(function(e) {
            return e.element + ' — ' + e.quantity + ' ' + e.unit;
          }).join('<br>');
        }
        
        var status = item.status || 'Создан';
        var statusClass = status === 'Выполнено' ? 'badge-success' : status === 'В работе' ? 'badge-warning' : 'badge-default';
        
        return '<td>' + (item.name || item.description || '—') + '</td>' +
               '<td>' + elementsText + '</td>' +
               '<td>' + (item.deadline || '—') + '</td>' +
               '<td><span class="badge ' + statusClass + '">' + status + '</span></td>' +
               '<td class="actions">' +
               '<a href="#modal-confirm-chem-' + item.id + '" class="btn btn-success btn-sm">Подтвердить</a> ' +
               '<a href="#modal-delete-chem" data-id="' + item.id + '" class="btn btn-danger btn-sm">Удалить</a>' +
               '</td>';
      });
    }

    loadChemistryTasks();
  }

  // Используем функции из модулей (уже определены выше)
  var initUniversalForms = window.initUniversalForms;
  var collectFormData = window.collectFormData;
  var collectChemistryTaskData = window.collectChemistryTaskData;

  function getDeleteStorageKey(page, modalId) {
    var keyMap = {
      'materials': {
        'modal-delete-raw': 'rawMaterials'
      },
      'users': {
        'modal-delete-user': 'users',
        'modal-delete-role': 'roles'
      },
      'clients': {
        'modal-delete-client': 'clients'
      },
      'lines': {
        'modal-delete-line': 'lines'
      },
      'chemistry': {
        'modal-delete-chem': 'chemistryCatalog'
      },
      'recipes': {
        'modal-delete-recipe': 'recipes'
      }
    };
    return keyMap[page] && keyMap[page][modalId] ? keyMap[page][modalId] : null;
  }

  function getEditStorageKey(page, modalId) {
    var keyMap = {
      'materials': {
        'modal-edit-raw': 'rawMaterials'
      },
      'users': {
        'modal-edit-user': 'users',
        'modal-edit-role-admin': 'roles',
        'modal-edit-role-shift': 'roles',
        'modal-edit-role-chem': 'roles',
        'modal-edit-role-tech': 'roles',
        'modal-edit-role-operator': 'roles',
        'modal-edit-role-otk': 'roles'
      },
      'clients': {
        'modal-edit-client': 'clients'
      },
      'lines': {
        'modal-edit-line': 'lines'
      }
    };
    if (page === 'users' && modalId && modalId.indexOf('modal-edit-role-') === 0) {
      return 'roles';
    }
    return keyMap[page] && keyMap[page][modalId] ? keyMap[page][modalId] : null;
  }

  function fillForm(form, data) {
    if (!form || !data) return;
    form.querySelectorAll('input, select, textarea').forEach(function(input) {
      if (input.type === 'submit' || input.type === 'button') return;
      var label = input.closest('.form-row') ? input.closest('.form-row').querySelector('label') : null;
      if (label) {
        var key = getFieldKey(label.textContent.trim());
        if (data[key] !== undefined) {
          if (input.type === 'checkbox') {
            input.checked = data[key] === true || (Array.isArray(data[key]) && data[key].includes(input.value));
          } else if (input.tagName === 'SELECT') {
            input.value = data[key] || '';
          } else {
            input.value = data[key] || '';
          }
        }
      }
    });
  }

  function updateClientSelects() {
    var clients = Storage.get('clients');
    document.querySelectorAll('.modal select').forEach(function(select) {
      var label = select.closest('.form-row') ? select.closest('.form-row').querySelector('label') : null;
      if (label && (label.textContent.trim() === 'Клиент' || label.textContent.includes('Клиент'))) {
        var currentValue = select.value;
        select.innerHTML = '<option value="">—</option>';
        clients.forEach(function(c) {
          var option = document.createElement('option');
          option.value = c.name;
          option.textContent = c.name;
          if (c.name === currentValue) option.selected = true;
          select.appendChild(option);
        });
      }
    });
  }

  function updateLineSelects() {
    var lines = Storage.get('lines');
    document.querySelectorAll('.modal select').forEach(function(select) {
      var label = select.closest('.form-row') ? select.closest('.form-row').querySelector('label') : null;
      if (label && (label.textContent.trim() === 'Линия' || label.textContent.includes('Линия'))) {
        var currentValue = select.value;
        select.innerHTML = '<option value="">—</option>';
        lines.forEach(function(l) {
          var option = document.createElement('option');
          option.value = l.name;
          option.textContent = l.name;
          if (l.name === currentValue) option.selected = true;
          select.appendChild(option);
        });
      }
    });
  }

  function updateRecipeSelects() {
    var recipes = Storage.get('recipes');
    document.querySelectorAll('.modal select').forEach(function(select) {
      var label = select.closest('.form-row') ? select.closest('.form-row').querySelector('label') : null;
      if (label && (label.textContent.trim() === 'Рецепт' || label.textContent.includes('Рецепт'))) {
        var currentValue = select.value;
        select.innerHTML = '<option value="">—</option>';
        recipes.forEach(function(r) {
          var option = document.createElement('option');
          var text = (r.recipe || r.name) + ' — ' + (r.product || '');
          option.value = r.recipe || r.name;
          option.textContent = text;
          if ((r.recipe || r.name) === currentValue) option.selected = true;
          select.appendChild(option);
        });
      }
    });
  }

  function updateChemistrySelects() {
    // Эта функция больше не заполняет select'ы напрямую
    // Заполнение происходит только в fillSelectsFromStorage для modal-create-task-chem
    // Оставляем пустой, чтобы избежать дублирования заполнения
  }

  // Универсальная загрузка данных для всех страниц
  function initUniversalDataLoading() {
    var page = document.body.getAttribute('data-page');
    if (!page) return;
    
    // Находим все tbody на странице и загружаем данные
    document.querySelectorAll('tbody').forEach(function(tbody) {
      var table = tbody.closest('table');
      if (!table) return;
      
      // Определяем ключ хранилища по заголовкам таблицы
      var headers = table.querySelectorAll('thead th');
      if (headers.length === 0) return;
      
      var storageKey = getStorageKeyByTable(page, headers);
      if (storageKey) {
        var data = storageKey === 'productionBatchesPending' ? Storage.get('productionBatches') : Storage.get(storageKey);
        if (storageKey === 'productionBatchesPending') {
          data = (data || []).filter(function(b) { return (b.otkStatus || '') === 'Ожидает ОТК'; });
        }
        if (data.length > 0) {
          if (tbody.children.length === 0 || tbody.textContent.trim() === '') {
            if (storageKey === 'productionBatchesPending') {
              renderTable(tbody, data, function(item) {
                return '<td>' + (item.otkStatus || 'Ожидает') + '</td>' +
                  '<td>' + (item.product || '—') + '</td>' +
                  '<td>' + (item.quantity || '—') + '</td>' +
                  '<td>' + (item.operator || '—') + '</td>' +
                  '<td>' + (item.date || '—') + '</td>' +
                  '<td class="actions">' +
                  '<a href="#modal-check-otk" class="btn btn-success btn-sm" data-batch-id="' + (item.id || '') + '" data-order-id="' + (item.orderId || '') + '">Проверить</a>' +
                  '</td>';
              });
            } else {
              renderTableFromStorage(tbody, storageKey, headers);
            }
          }
        }
      }
    });
  }

  function getStorageKeyByTable(page, headers) {
    var headerTexts = Array.from(headers).map(function(h) { return h.textContent.trim(); }).join('|');
    
    // Определяем по содержимому заголовков
    if (headerTexts.includes('Название') && headerTexts.includes('Ед.')) {
      if (page === 'materials') return 'rawMaterials';
      if (page === 'chemistry') return 'chemistryCatalog';
    }
    if (headerTexts.includes('ФИО') || headerTexts.includes('Email')) return 'users';
    if (headerTexts.includes('Роль') && headerTexts.includes('Описание')) return 'roles';
    if (headerTexts.includes('ИНН') || headerTexts.includes('Контакт')) return 'clients';
    if (headerTexts.includes('Линия') && headers.length === 2) return 'lines';
    if (headerTexts.includes('Рецепт') && headerTexts.includes('Товар')) return 'recipes';
    if (headerTexts.includes('Задание') || (headerTexts.includes('Хим') && headerTexts.includes('элемент'))) return 'chemistryTasks';
    if (headerTexts.includes('Статус') && headerTexts.includes('Продукт') && headerTexts.includes('Рецепт')) return 'orders';
    if (headerTexts.includes('Статус ОТК') || headerTexts.includes('Выпущено')) return 'productionBatches';
    if (headerTexts.includes('Принято') && headerTexts.includes('Брак')) return 'otkChecks';
    // ОТК: таблица "Ожидают проверки" (Статус, Продукт, Кол-во, Оператор, Дата, Действия)
    if (page === 'otk' && headerTexts.includes('Кол-во') && headerTexts.includes('Оператор') && headerTexts.includes('Действия') && !headerTexts.includes('Принято')) return 'productionBatchesPending';
    if (headerTexts.includes('Партия ГП') || headerTexts.includes('Статус') && headerTexts.includes('Партия')) return 'warehouseBatches';
    if (headerTexts.includes('Заказ клиента') || headerTexts.includes('Клиент') && headerTexts.includes('Кол-во')) return 'sales';
    if (headerTexts.includes('Накладная') || headerTexts.includes('Отгружено')) return 'shipments';
    if (headerTexts.includes('Дата смены') || headerTexts.includes('Начальник смены')) return 'shifts';
    
    return null;
  }

  function renderTableFromStorage(tbody, storageKey, headers) {
    var data = Storage.get(storageKey);
    if (data.length === 0) return;
    
    renderTable(tbody, data, function(item) {
      var row = '';
      headers.forEach(function(header, index) {
        var text = header.textContent.trim();
        if (text.includes('Действия') || text === '') {
          row += '<td class="actions">';
          row += '<a href="#modal-edit-' + storageKey + '" data-id="' + item.id + '" class="btn btn-secondary btn-sm">Редактировать</a> ';
          row += '<a href="#modal-delete-' + storageKey + '" data-id="' + item.id + '" class="btn btn-danger btn-sm">Удалить</a>';
          row += '</td>';
        } else if (text.includes('Хим. элементы') && item.elements) {
          // Специальная обработка для колонки с несколькими элементами
          var elementsText = item.elements.map(function(e) {
            return e.element + ' — ' + e.quantity + ' ' + e.unit;
          }).join('<br>');
          row += '<td>' + elementsText + '</td>';
        } else {
          var value = getTableValue(item, text, index);
          row += '<td>' + value + '</td>';
        }
      });
      return row;
    });
  }

  // Маппинг заголовков таблиц на ключи данных (для Заказы, Производство, ОТК)
  var headerToKey = {
    'Статус': 'status',
    'Продукт': 'product',
    'Рецепт': 'recipe',
    'Линия': 'line',
    'Кто': 'operator',
    'Дата': 'date',
    'Выпущено': 'quantity',
    'Статус ОТК': 'otkStatus',
    'Оператор': 'operator',
    'Кол-во': 'quantity',
    'Принято': 'accepted',
    'Брак': 'rejected',
    'Причина брака': 'rejectReason',
    'Инспектор': 'inspector',
    'Проверено': 'checkedDate',
    'Комментарий': 'comment'
  };

  function getTableValue(item, headerText, index) {
    var key = headerToKey[headerText] || getFieldKey(headerText);
    var value = item[key];
    if (value !== undefined && value !== null && typeof value === 'object') {
      value = value.name || value.status || value.value || '—';
    }
    if (headerText === 'Статус' && value) {
      var status = String(value);
      var badgeClass = 'badge-default';
      if (status === 'В работе') badgeClass = 'badge-warning';
      else if (status === 'Принято') badgeClass = 'badge-success';
      else if (status === 'Принято с браком') badgeClass = 'badge-danger';
      else if (status === 'Открыта') badgeClass = 'badge-success';
      else if (status === 'Закрыта') badgeClass = 'badge-default';
      return '<span class="badge ' + badgeClass + '">' + status + '</span>';
    }
    if (value !== undefined && value !== null) {
      return String(value);
    }
    var keys = Object.keys(item);
    if (keys[index]) {
      var v = item[keys[index]];
      if (v !== undefined && v !== null && typeof v === 'object') v = v.name || v.status || '—';
      return v !== undefined && v !== null ? String(v) : '—';
    }
    return '—';
  }

  function reloadPageData(page) {
    // Используем глобальные функции для перезагрузки
    setTimeout(function() {
      if (page === 'materials') {
        if (typeof window.reloadMaterials === 'function') {
          window.reloadMaterials();
        } else {
          initMaterials();
        }
        setTimeout(function() {
          if (typeof updateMaterialSelectsForModals === 'function') {
            updateMaterialSelectsForModals();
          }
        }, 300);
      }
      else if (page === 'users') {
        if (typeof window.reloadUsers === 'function') {
          window.reloadUsers();
        } else {
          initUsers();
        }
        setTimeout(function() {
          if (typeof updateRoleSelectsForModals === 'function') {
            updateRoleSelectsForModals();
          }
        }, 300);
      }
      else if (page === 'clients') {
        if (typeof window.reloadClients === 'function') {
          window.reloadClients();
        } else {
          initClients();
        }
        updateClientSelects();
      }
      else if (page === 'lines') {
        if (typeof window.reloadLines === 'function') {
          window.reloadLines();
        } else {
          initLines();
        }
        updateLineSelects();
      }
      else if (page === 'chemistry') {
        initChemistryTasks();
        updateAllSelects();
      }
      else {
        // Для остальных страниц используем универсальную загрузку
        initUniversalDataLoading();
        updateAllSelects();
      }
    }, 150);
  }

  // ===== Основная инициализация =====
  document.addEventListener('DOMContentLoaded', function () {
    initLinkedData();
    initTabs();

    // Закрытие модалки по клику на overlay
    document.querySelectorAll('.modal-overlay').forEach(function (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) {
          e.preventDefault();
          closeModal();
        }
      });
    });

    // Открытие/закрытие линии (вкладка Открытие)
    document.body.addEventListener('click', function(e) {
      var openBtn = e.target.closest('.btn-open-line');
      var closeBtn = e.target.closest('.btn-close-line');
      if (openBtn && document.body.getAttribute('data-page') === 'lines') {
        e.preventDefault();
        var lineId = openBtn.dataset.lineId;
        var lineName = openBtn.dataset.lineName || '';
        var now = new Date();
        Storage.add(LINE_HISTORY_KEY, { lineId: lineId, lineName: lineName, action: 'Открыта', date: now.toISOString().split('T')[0], time: now.toTimeString().slice(0, 5) });
        if (window.refreshLinesOpenAndHistory) window.refreshLinesOpenAndHistory();
        return;
      }
      if (closeBtn && document.body.getAttribute('data-page') === 'lines') {
        e.preventDefault();
        var lineId = closeBtn.dataset.lineId;
        var lineName = closeBtn.dataset.lineName || '';
        var now = new Date();
        Storage.add(LINE_HISTORY_KEY, { lineId: lineId, lineName: lineName, action: 'Закрыта', date: now.toISOString().split('T')[0], time: now.toTimeString().slice(0, 5) });
        if (window.refreshLinesOpenAndHistory) window.refreshLinesOpenAndHistory();
        return;
      }
    });

    // Закрытие по кнопкам "Отмена" и "×" - используем делегирование
    document.body.addEventListener('click', function(e) {
      // Обработка кнопки закрытия
      if (e.target.classList.contains('modal-close') || e.target.closest('.modal-close')) {
        e.preventDefault();
        e.stopPropagation();
        closeModal();
        return false;
      }
      
      // Обработка кнопки "Отмена"
      var cancelBtn = e.target.closest('.btn-secondary');
      if (cancelBtn && cancelBtn.getAttribute('href') === '#' && cancelBtn.closest('.modal')) {
        e.preventDefault();
        e.stopPropagation();
        closeModal();
        return false;
      }
    }, true);

    // Универсальная обработка форм
    initUniversalForms();
    
    // При открытии модалки ОТК "Проверить" сохраняем batchId и orderId для обновления статуса заказа
    document.body.addEventListener('click', function(e) {
      var otkLink = e.target.closest('a[href="#modal-check-otk"]');
      if (otkLink && otkLink.dataset.batchId) {
        var modal = document.getElementById('modal-check-otk');
        if (modal) {
          modal.dataset.batchId = otkLink.dataset.batchId || '';
          modal.dataset.orderId = otkLink.dataset.orderId || '';
        }
      }
    }, true);

    // Делегирование событий для кнопок удаления
    document.body.addEventListener('click', function(e) {
      var deleteBtn = e.target.closest('a[href*="delete"]');
      if (deleteBtn && deleteBtn.dataset.id) {
        e.preventDefault();
        e.stopPropagation();
        var id = deleteBtn.dataset.id;
        var page = document.body.getAttribute('data-page');
        var modalId = deleteBtn.getAttribute('href').replace('#', '');
        var modal = document.getElementById(modalId);
        
        // Открываем модалку подтверждения
        if (modal) {
          document.location.hash = '#' + modalId;
          modal.dataset.itemId = id;
        }
      }
      
      // Обработка кнопки удаления в модалке подтверждения
      var confirmDeleteBtn = e.target.closest('.modal-overlay .btn-danger');
      if (confirmDeleteBtn && confirmDeleteBtn.textContent.includes('Удалить') && !confirmDeleteBtn.closest('form')) {
        e.preventDefault();
        e.stopPropagation();
        var modal = confirmDeleteBtn.closest('.modal-overlay');
        var id = modal.dataset.itemId;
        var page = document.body.getAttribute('data-page');
        var modalId = modal.id;
        
        if (id) {
          var storageKey = getDeleteStorageKey(page, modalId);
          if (storageKey && confirm('Удалить запись?')) {
            Storage.delete(storageKey, id);
            reloadPageData(page);
            modal.dataset.itemId = '';
            closeModal();
          }
        }
      }
    });
    
    // Делегирование событий для кнопок редактирования
    document.body.addEventListener('click', function(e) {
      var editBtn = e.target.closest('a[href*="edit"]');
      if (editBtn && editBtn.dataset.id) {
        e.preventDefault();
        e.stopPropagation();
        var id = editBtn.dataset.id;
        var page = document.body.getAttribute('data-page');
        var modalId = editBtn.getAttribute('href').replace('#', '');
        var modal = document.getElementById(modalId);
        
        if (modal) {
          document.location.hash = '#' + modalId;
          modal.dataset.itemId = id;
          
          // Загружаем данные в форму
          var storageKey = getEditStorageKey(page, modalId);
          if (storageKey) {
            var data = Storage.get(storageKey);
            var item = data.find(function(i) { return i.id === id; });
            if (item) {
              fillForm(modal.querySelector('form'), item);
            }
          }
        }
      }
    });
    
    // Обновление select'ов при открытии модалок через hashchange
    var lastHash = document.location.hash;
    window.addEventListener('hashchange', function() {
      var currentHash = document.location.hash;
      if (currentHash !== lastHash && currentHash.includes('modal')) {
        lastHash = currentHash;
        var modalId = currentHash.slice(1);
        setTimeout(function() {
          updateAllSelects();
          fillSelectsFromStorage(modalId);
        }, 100);
      }
    });
    
    function updateAllSelects() {
      var page = document.body.getAttribute('data-page');
      if (page === 'materials') {
        if (typeof updateMaterialSelectsForModals === 'function') {
          updateMaterialSelectsForModals();
        }
      }
      if (page === 'users') {
        if (typeof updateRoleSelectsForModals === 'function') {
          updateRoleSelectsForModals();
        }
      }
      if (page === 'clients' || page === 'sales') {
        if (typeof updateClientSelects === 'function') {
          updateClientSelects();
        }
      }
      if (page === 'lines' || page === 'orders' || page === 'shifts') {
        if (typeof updateLineSelects === 'function') {
          updateLineSelects();
        }
      }
      if (page === 'recipes' || page === 'orders') {
        if (typeof updateRecipeSelects === 'function') {
          updateRecipeSelects();
        }
      }
      if (page === 'production') {
        // Обновляем select заказов для модалки выпуска
        var orderSelect = document.querySelector('#order-select');
        if (orderSelect) {
          var orders = Storage.get('orders');
          var currentValue = orderSelect.value;
          orderSelect.innerHTML = '<option value="">— Выберите —</option>';
          
          // Показываем все заказы кроме "СОЗДАН"
          if (orders && orders.length > 0) {
            orders.forEach(function(order) {
              var status = (order.status || '').toString().toLowerCase();
              // Показываем заказы со статусом "ГОТОВО" или "В РАБОТЕ" или без фильтрации (для тестирования)
              if (!status.includes('создан') && status !== 'создан') {
                var orderText = '';
                if (order.product) {
                  orderText = order.product;
                } else if (order.recipe) {
                  orderText = order.recipe;
                } else if (order.name) {
                  orderText = order.name;
                }
                
                if (order.line) {
                  orderText += ' (' + order.line;
                  if (order.quantity) {
                    orderText += ', ' + order.quantity + ' шт';
                  }
                  orderText += ')';
                }
                
                // Добавляем индикатор статуса
                if (status.includes('готово')) {
                  orderText += ' ✓';
                }
                
                var option = document.createElement('option');
                option.value = order.id || order.name || order.product || order.recipe;
                option.textContent = orderText;
                if ((order.id || order.name || order.product || order.recipe) === currentValue) option.selected = true;
                orderSelect.appendChild(option);
              }
            });
          }
        }
      }
      if (page === 'chemistry') {
        if (typeof updateChemistrySelects === 'function') {
          updateChemistrySelects();
        }
      }
    }
    
    // Делаем функцию доступной глобально
    window.updateAllSelects = updateAllSelects;
    
    // Также обновляем при открытии модалок через hashchange
    window.addEventListener('hashchange', function() {
      var hash = document.location.hash.slice(1);
      if (hash && hash.includes('modal')) {
        setTimeout(function() {
          // Очищаем форму и таблицу элементов при открытии модалок для создания
          var modal = document.getElementById(hash);
          if (modal) {
            // Очищаем модалку для добавления задания химии
            if (hash === 'modal-create-task-chem') {
              // Очищаем таблицу элементов
              var elementsList = modal.querySelector('#chem-elements-list');
              if (elementsList) {
                elementsList.innerHTML = '';
              }
              
              // Очищаем поля формы
              var form = modal.querySelector('form');
              if (form) {
                form.reset();
                
                // Очищаем select элемента
                var chemElementSelect = modal.querySelector('#chem-element-select');
                if (chemElementSelect) {
                  chemElementSelect.value = '';
                  chemElementSelect.selectedIndex = 0;
                }
                
                // Очищаем input количества
                var quantityInput = modal.querySelector('#chem-quantity-input');
                if (quantityInput) {
                  quantityInput.value = '';
                }
                
                // Сбрасываем select единиц к значению по умолчанию
                var unitSelect = modal.querySelector('#chem-unit-select');
                if (unitSelect) {
                  unitSelect.value = 'кг';
                }
              }
              
              // Очищаем dataset.itemId для нового добавления
              modal.dataset.itemId = '';
            }
            
            // Очищаем модалку для создания рецепта
            if (hash === 'modal-create-recipe') {
              var form = modal.querySelector('form');
              if (form) {
                form.reset();
                
                // Ищем секцию Состав
                var compositionRow = Array.from(form.querySelectorAll('.form-row')).find(function(row) {
                  var label = row.querySelector('label');
                  return label && label.textContent.trim() === 'Состав';
                });
                
                if (compositionRow) {
                  // Очищаем таблицу состава
                  var compositionTbody = compositionRow.querySelector('tbody');
                  if (compositionTbody) {
                    compositionTbody.innerHTML = '';
                  }
                  
                  // Очищаем select компонента
                  var recipeComponentSelect = compositionRow.querySelector('#recipe-component-select');
                  if (recipeComponentSelect) {
                    recipeComponentSelect.value = '';
                    recipeComponentSelect.selectedIndex = 0;
                  }
                  
                  // Очищаем input количества в составе
                  var compositionQuantityInput = compositionRow.querySelector('input[type="number"]');
                  if (compositionQuantityInput) {
                    compositionQuantityInput.value = '';
                  }
                  
                  // Сбрасываем первый select (тип: Сырьё/Хим. элемент) к первому значению
                  var typeSelect = compositionRow.querySelector('select[title="Откуда берём"]');
                  if (typeSelect) {
                    typeSelect.selectedIndex = 0;
                  }
                }
              }
              
              // Очищаем dataset.itemId для нового добавления
              modal.dataset.itemId = '';
            }
            
            // Очищаем модалку для создания химического элемента (в справочнике)
            if (hash === 'modal-create-chem') {
              var form = modal.querySelector('form');
              if (form) {
                form.reset();
                
                // Ищем секцию Состав
                var compositionRow = Array.from(form.querySelectorAll('.form-row')).find(function(row) {
                  var label = row.querySelector('label');
                  return label && label.textContent.trim() === 'Состав';
                });
                
                if (compositionRow) {
                  // Очищаем таблицу состава
                  var compositionTbody = compositionRow.querySelector('tbody');
                  if (compositionTbody) {
                    compositionTbody.innerHTML = '';
                  }
                  
                  // Очищаем select состава
                  var compositionSelect = compositionRow.querySelector('select:not([title])');
                  if (compositionSelect) {
                    compositionSelect.value = '';
                    compositionSelect.selectedIndex = 0;
                  }
                  
                  // Очищаем input количества в составе
                  var compositionQuantityInput = compositionRow.querySelector('input[type="number"]');
                  if (compositionQuantityInput) {
                    compositionQuantityInput.value = '';
                  }
                }
              }
              
              // Очищаем dataset.itemId для нового добавления
              modal.dataset.itemId = '';
            }
            
            // Очищаем модалку для открытия смены
            if (hash === 'modal-open-shift') {
              var form = modal.querySelector('form');
              if (form) {
                form.reset();
                
                // Очищаем select линий
                var lineSelect = form.querySelector('select');
                if (lineSelect) {
                  lineSelect.value = '';
                  lineSelect.selectedIndex = 0;
                }
              }
              modal.dataset.itemId = '';
            }
            
            // Очищаем модалку для выпуска
            if (hash === 'modal-produce') {
              var form = modal.querySelector('form');
              if (form) {
                form.reset();
                
                // Очищаем select заказов (но не удаляем опции, они заполнятся через fillSelectsFromStorage)
                var orderSelect = form.querySelector('#order-select');
                if (orderSelect) {
                  orderSelect.value = '';
                  orderSelect.selectedIndex = 0;
                }
                
                // Очищаем таблицу списания
                var writeoffList = form.querySelector('#writeoff-list');
                if (writeoffList) {
                  writeoffList.innerHTML = '';
                }
              }
              modal.dataset.itemId = '';
            }
            
            // Очищаем другие модалки создания (общая очистка)
            if (hash.startsWith('modal-create-') && hash !== 'modal-create-task-chem' && hash !== 'modal-create-recipe' && hash !== 'modal-create-chem') {
              var form = modal.querySelector('form');
              if (form) {
                form.reset();
                
                // Очищаем все tbody в форме
                form.querySelectorAll('tbody').forEach(function(tbody) {
                  tbody.innerHTML = '';
                });
              }
              modal.dataset.itemId = '';
            }
          }
          
          updateAllSelects();
          fillSelectsFromStorage(hash);
          initCompositionHandlers(hash);
        }, 200);
      }
    });
    
    // Инициализация обработчиков для составов (химия, рецепты)
    function initCompositionHandlers(modalId) {
      var modal = document.getElementById(modalId);
      if (!modal) return;
      
      // Обработчик для задания химии (несколько элементов)
      var addChemElementBtn = modal.querySelector('#add-chem-element-btn');
      if (addChemElementBtn && !addChemElementBtn.dataset.handler) {
        addChemElementBtn.dataset.handler = 'true';
        addChemElementBtn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          
          var select = modal.querySelector('#chem-element-select');
          var quantityInput = modal.querySelector('#chem-quantity-input');
          var unitSelect = modal.querySelector('#chem-unit-select');
          var tbody = modal.querySelector('#chem-elements-list');
          
          if (!select || !quantityInput || !unitSelect || !tbody) return;
          
          var elementName = select.value;
          var quantity = quantityInput.value;
          var unit = unitSelect.value;
          
          if (!elementName || !quantity || parseFloat(quantity) <= 0) {
            alert('Выберите химический элемент и укажите количество');
            return;
          }
          
          // Проверяем, не добавлен ли уже этот элемент
          var existing = Array.from(tbody.querySelectorAll('tr')).find(function(tr) {
            return tr.querySelector('td').textContent.trim() === elementName;
          });
          
          if (existing) {
            alert('Этот элемент уже добавлен');
            return;
          }
          
          // Добавляем строку в таблицу
          var tr = document.createElement('tr');
          tr.innerHTML = '<td>' + elementName + '</td>' +
                        '<td>' + quantity + '</td>' +
                        '<td>' + unit + '</td>' +
                        '<td><button type="button" class="btn btn-danger btn-sm">Удалить</button></td>';
          tbody.appendChild(tr);
          
          // Обработка кнопки удаления в строке
          tr.querySelector('button').addEventListener('click', function() {
            tr.remove();
          });
          
          // Очищаем поля после добавления элемента в таблицу
          // Важно сбросить select к пустому значению, чтобы можно было добавить следующий элемент
          quantityInput.value = '';
          unitSelect.value = 'кг';
          
          // Сбрасываем select элемента к первому option (— Выберите —)
          // Используем setTimeout чтобы убедиться, что очистка происходит после всех событий
          setTimeout(function() {
            if (select && select.options.length > 0) {
              select.selectedIndex = 0; // Выбираем первый option (— Выберите —)
              select.value = ''; // Убеждаемся, что значение пустое
            }
          }, 0);
        });
      }
      
      // Находим все остальные кнопки "Добавить" в составе
      modal.querySelectorAll('button[type="button"]').forEach(function(btn) {
        if (btn.textContent.includes('Добавить') && !btn.dataset.compositionHandler && btn.id !== 'add-chem-element-btn') {
          btn.dataset.compositionHandler = 'true';
          btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            var formRow = btn.closest('.form-row');
            if (!formRow) return;
            
            var tbody = formRow.querySelector('tbody');
            if (!tbody) return;
            
            // Для химических элементов - простой select
            var simpleSelect = formRow.querySelector('select:not([title])');
            var quantityInput = formRow.querySelector('input[type="number"]');
            
            if (simpleSelect && quantityInput) {
              var materialName = simpleSelect.value;
              var quantity = quantityInput.value;
              
              if (!materialName || !quantity || parseFloat(quantity) <= 0) {
                alert('Выберите сырьё и укажите количество');
                return;
              }
              
              // Находим единицу измерения для выбранного сырья
              var rawMaterials = Storage.get('rawMaterials');
              var material = rawMaterials.find(function(m) { return m.name === materialName; });
              var unit = material ? material.unit : 'кг';
              
              // Добавляем строку в таблицу
              var tr = document.createElement('tr');
              tr.innerHTML = '<td>' + materialName + '</td>' +
                            '<td>' + quantity + '</td>' +
                            '<td>' + unit + '</td>' +
                            '<td><button type="button" class="btn btn-danger btn-sm">Удалить</button></td>';
              tbody.appendChild(tr);
              
              // Обработка кнопки удаления в строке
              tr.querySelector('button').addEventListener('click', function() {
                tr.remove();
              });
              
              // Очищаем поля
              simpleSelect.value = '';
              quantityInput.value = '';
              return;
            }
            
            // Для рецептов - два select'а
            var recipeComponentSelect = formRow.querySelector('#recipe-component-select');
            if (recipeComponentSelect && quantityInput) {
              var componentValue = recipeComponentSelect.value;
              var quantity = quantityInput.value;
              
              if (!componentValue || !quantity || parseFloat(quantity) <= 0) {
                alert('Выберите компонент и укажите количество');
                return;
              }
              
              var parts = componentValue.split(':');
              var type = parts[0];
              var name = parts[1];
              var typeLabel = type === 'raw' ? 'Сырьё' : 'Хим. элемент';
              
              // Добавляем строку в таблицу
              var tr = document.createElement('tr');
              tr.innerHTML = '<td>' + typeLabel + '</td>' +
                            '<td>' + name + '</td>' +
                            '<td>' + quantity + '</td>' +
                            '<td><button type="button" class="btn btn-danger btn-sm">Удалить</button></td>';
              tbody.appendChild(tr);
              
              // Обработка кнопки удаления в строке
              tr.querySelector('button').addEventListener('click', function() {
                tr.remove();
              });
              
              // Очищаем поля
              recipeComponentSelect.value = '';
              quantityInput.value = '';
            }
          });
        }
      });
      
      // Обработка изменения типа источника для рецептов
      var sourceSelect = modal.querySelector('select[title="Откуда берём"]');
      if (sourceSelect && !sourceSelect.dataset.handler) {
        sourceSelect.dataset.handler = 'true';
        sourceSelect.addEventListener('change', function() {
          var recipeComponentSelect = modal.querySelector('#recipe-component-select');
          if (!recipeComponentSelect) return;
          
          var rawGroup = recipeComponentSelect.querySelector('optgroup[label*="Сырьё"]');
          var chemGroup = recipeComponentSelect.querySelector('optgroup[label*="Хим"]');
          
          // Показываем/скрываем группы в зависимости от выбора
          if (this.value.includes('Сырьё')) {
            if (rawGroup) rawGroup.style.display = '';
            if (chemGroup) chemGroup.style.display = 'none';
          } else if (this.value.includes('Хим')) {
            if (rawGroup) rawGroup.style.display = 'none';
            if (chemGroup) chemGroup.style.display = '';
          } else {
            if (rawGroup) rawGroup.style.display = '';
            if (chemGroup) chemGroup.style.display = '';
          }
        });
      }
    }
    
    function fillSelectsFromStorage(modalId) {
      var modal = document.getElementById(modalId);
      if (!modal) return;
      
      var page = document.body.getAttribute('data-page');
      
      // Заполняем select сырья
      if (page === 'materials') {
        var materials = Storage.get('rawMaterials');
        modal.querySelectorAll('select').forEach(function(select) {
          var label = select.closest('.form-row') ? select.closest('.form-row').querySelector('label') : null;
          if (label && label.textContent.trim() === 'Сырьё') {
            var currentValue = select.value;
            select.innerHTML = '<option value="">—</option>';
            materials.forEach(function(m) {
              var option = document.createElement('option');
              option.value = m.name;
              option.textContent = m.name;
              if (m.name === currentValue) option.selected = true;
              select.appendChild(option);
            });
          }
        });
      }
      
      // Заполняем select ролей
      if (page === 'users') {
        var roles = Storage.get('roles');
        modal.querySelectorAll('select').forEach(function(select) {
          var label = select.closest('.form-row') ? select.closest('.form-row').querySelector('label') : null;
          if (label && label.textContent.trim() === 'Роль' && select.options.length <= 10) {
            select.innerHTML = '';
            roles.forEach(function(r) {
              var option = document.createElement('option');
              option.value = r.name;
              option.textContent = r.name;
              select.appendChild(option);
            });
          }
        });
      }
      
      // Заполняем select клиентов
      var clients = Storage.get('clients');
      modal.querySelectorAll('select').forEach(function(select) {
        var label = select.closest('.form-row') ? select.closest('.form-row').querySelector('label') : null;
        if (label && (label.textContent.includes('Клиент'))) {
          var currentValue = select.value;
          select.innerHTML = '<option value="">—</option>';
          clients.forEach(function(c) {
            var option = document.createElement('option');
            option.value = c.name;
            option.textContent = c.name;
            if (c.name === currentValue) option.selected = true;
            select.appendChild(option);
          });
        }
      });
      
      // Заполняем select линий
      var lines = Storage.get('lines');
      modal.querySelectorAll('select').forEach(function(select) {
        var label = select.closest('.form-row') ? select.closest('.form-row').querySelector('label') : null;
        if (label && (label.textContent.includes('Линия'))) {
          var currentValue = select.value;
          select.innerHTML = '<option value="">—</option>';
          lines.forEach(function(l) {
            var option = document.createElement('option');
            option.value = l.name;
            option.textContent = l.name;
            if (l.name === currentValue) option.selected = true;
            select.appendChild(option);
          });
        }
      });
      
      // Заполняем select заказов (для модалки выпуска)
      if (modalId === 'modal-produce') {
        var orderSelect = modal.querySelector('#order-select');
        if (orderSelect) {
          var orders = Storage.get('orders');
          var currentValue = orderSelect.value;
          orderSelect.innerHTML = '<option value="">— Выберите —</option>';
          
          // Показываем заказы со статусом "Создан" (их выпускаем в производство)
          if (orders && orders.length > 0) {
            orders.forEach(function(order) {
              var status = (order.status || 'Создан').toString();
              if (status === 'Создан') {
                var orderText = '';
                if (order.product) {
                  orderText = order.product;
                } else if (order.recipe) {
                  orderText = order.recipe;
                } else if (order.name) {
                  orderText = order.name;
                }
                if (order.line) {
                  orderText += ' (' + order.line;
                  if (order.quantity) {
                    orderText += ', ' + order.quantity + ' шт';
                  }
                  orderText += ')';
                }
                var option = document.createElement('option');
                option.value = order.id || order.name || order.product || order.recipe;
                option.textContent = orderText;
                option.dataset.orderId = order.id;
                option.dataset.orderRecipe = order.recipe || order.name || order.product;
                if ((order.id || order.name || order.product || order.recipe) === currentValue) option.selected = true;
                orderSelect.appendChild(option);
              }
            });
            
            // Добавляем обработчик изменения заказа для заполнения таблицы списания
            if (!orderSelect.dataset.handler) {
              orderSelect.dataset.handler = 'true';
              orderSelect.addEventListener('change', function() {
                var selectedOption = this.options[this.selectedIndex];
                var orderId = selectedOption ? selectedOption.dataset.orderId : null;
                var recipeName = selectedOption ? selectedOption.dataset.orderRecipe : null;
                
                var writeoffList = modal.querySelector('#writeoff-list');
                var quantityInput = modal.querySelector('#quantity-input');
                var btnProduce = modal.querySelector('#btn-produce');
                
                if (!writeoffList) return;
                
                // Очищаем таблицу
                writeoffList.innerHTML = '';
                
                if (!orderId || !recipeName) {
                  if (btnProduce) btnProduce.disabled = true;
                  return;
                }
                
                // Находим рецепт
                var recipes = Storage.get('recipes');
                var recipe = recipes.find(function(r) {
                  return (r.recipe || r.name) === recipeName;
                });
                
                if (!recipe) {
                  if (btnProduce) btnProduce.disabled = true;
                  return;
                }
                
                // Получаем состав рецепта из поля composition или из таблицы в форме
                var composition = recipe.composition || [];
                
                // Если состав пустой, пытаемся найти его в других полях
                if (!composition || composition.length === 0) {
                  // Проверяем, есть ли данные в других форматах
                  if (recipe.components && recipe.components.length > 0) {
                    composition = recipe.components;
                  }
                }
                
                if (!composition || composition.length === 0) {
                  if (btnProduce) btnProduce.disabled = true;
                  return;
                }
                
                var quantity = parseFloat(quantityInput ? quantityInput.value : 1) || 1;
                
                // Заполняем таблицу списания компонентами из рецепта
                composition.forEach(function(comp) {
                  var tr = document.createElement('tr');
                  // Определяем название компонента
                  var componentName = '';
                  if (comp.name) {
                    componentName = comp.name;
                  } else if (comp.component) {
                    componentName = comp.component;
                  } else if (comp.element) {
                    componentName = comp.element;
                  } else if (typeof comp === 'string') {
                    // Если comp - строка вида "raw:Название" или "chem:Название"
                    var parts = comp.split(':');
                    componentName = parts.length > 1 ? parts[1] : comp;
                  }
                  
                  // Определяем количество и единицу измерения
                  var compQty = parseFloat(comp.quantity) || 0;
                  var unit = comp.unit || 'кг';
                  
                  // Определяем источник (сырьё или хим. элемент)
                  var source = 'Склад сырья';
                  var compType = comp.type || '';
                  if (typeof comp === 'string' && comp.startsWith('chem:')) {
                    source = 'Склад хим. элементов';
                  } else if (compType && (compType.includes('chem') || compType === 'chem')) {
                    source = 'Склад хим. элементов';
                  } else if (typeof comp === 'string' && comp.startsWith('raw:')) {
                    source = 'Склад сырья';
                  }
                  
                  var requiredQty = compQty * quantity;
                  
                  tr.innerHTML = '<td style="padding: 0.5rem; font-size: 11px;"><strong>' + componentName + '</strong></td>' +
                                '<td style="padding: 0.5rem; font-size: 11px;">' + requiredQty + ' ' + unit + '</td>' +
                                '<td style="padding: 0.5rem; font-size: 11px;"><span style="color: var(--accent);">' + source + '</span></td>' +
                                '<td style="padding: 0.5rem; font-size: 11px;"><select style="width: 100%; font-size: 11px; padding: 0.25rem; box-sizing: border-box;"><option>—</option></select></td>' +
                                '<td style="padding: 0.5rem; font-size: 11px;">—</td>' +
                                '<td style="padding: 0.5rem; font-size: 11px;"><span style="color: var(--success);">✓</span></td>';
                  
                  writeoffList.appendChild(tr);
                });
                
                // Активируем кнопку выпуска
                if (btnProduce && writeoffList.children.length > 0) {
                  btnProduce.disabled = false;
                }
              });
              
              // Добавляем обработчик изменения количества для пересчёта
              if (quantityInput && !quantityInput.dataset.handler) {
                quantityInput.dataset.handler = 'true';
                quantityInput.addEventListener('input', function() {
                  // Пересчитываем таблицу списания при изменении количества
                  var orderSelect = modal.querySelector('#order-select');
                  if (orderSelect && orderSelect.value) {
                    // Триггерим событие change для пересчёта
                    orderSelect.dispatchEvent(new Event('change'));
                  }
                });
              }
            }
          }
        }
      }
      
      // Заполняем select рецептов
      var recipes = Storage.get('recipes');
      modal.querySelectorAll('select').forEach(function(select) {
        if (select.id === 'order-select') return; // Пропускаем select заказов, он уже заполнен
        var label = select.closest('.form-row') ? select.closest('.form-row').querySelector('label') : null;
        if (label && (label.textContent.includes('Рецепт'))) {
          var currentValue = select.value;
          select.innerHTML = '<option value="">—</option>';
          recipes.forEach(function(r) {
            var option = document.createElement('option');
            var text = (r.recipe || r.name) + ' — ' + (r.product || '');
            option.value = r.recipe || r.name;
            option.textContent = text;
            if ((r.recipe || r.name) === currentValue) option.selected = true;
            select.appendChild(option);
          });
        }
      });
      
      // Заполняем select "Состав" для химических элементов (в справочнике modal-create-chem)
      if (modalId === 'modal-create-chem') {
        var rawMaterials = Storage.get('rawMaterials');
        modal.querySelectorAll('.form-row').forEach(function(formRow) {
          var label = formRow.querySelector('label');
          if (label && label.textContent.trim() === 'Состав') {
            var compositionSelect = formRow.querySelector('select');
            if (compositionSelect && compositionSelect.options.length <= 1) {
              compositionSelect.innerHTML = '<option value="">— Выберите —</option>';
              rawMaterials.forEach(function(m) {
                var option = document.createElement('option');
                option.value = m.name;
                option.textContent = m.name + ' (' + m.unit + ')';
                compositionSelect.appendChild(option);
              });
            }
          }
        });
      }
      
      // Заполняем select для рецептов
      if (modalId === 'modal-create-recipe') {
        var rawMaterials = Storage.get('rawMaterials');
        modal.querySelectorAll('.form-row').forEach(function(formRow) {
          var label = formRow.querySelector('label');
          if (label && label.textContent.trim() === 'Состав') {
            var recipeComponentSelect = formRow.querySelector('#recipe-component-select');
            if (recipeComponentSelect) {
              var rawGroup = recipeComponentSelect.querySelector('optgroup[label*="Сырьё"]');
              var chemGroup = recipeComponentSelect.querySelector('optgroup[label*="Хим"]');
              
              if (rawGroup && rawGroup.children.length <= 1) {
                rawGroup.innerHTML = '';
                rawMaterials.forEach(function(m) {
                  var option = document.createElement('option');
                  option.value = 'raw:' + m.name;
                  option.textContent = m.name + ' (' + m.unit + ')';
                  rawGroup.appendChild(option);
                });
              }
              
              var chemistryCatalog = Storage.get('chemistryCatalog');
              if (chemGroup && chemGroup.children.length <= 1) {
                chemGroup.innerHTML = '';
                chemistryCatalog.forEach(function(c) {
                  var option = document.createElement('option');
                  option.value = 'chem:' + c.name;
                  option.textContent = c.name + ' (' + (c.unit || 'кг') + ')';
                  chemGroup.appendChild(option);
                });
              }
            }
          }
        });
      }
      
      // Заполняем ТОЛЬКО select химических элементов для задания (в модалке modal-create-task-chem)
      // Это единственный select для выбора элементов при добавлении в таблицу
      if (modalId === 'modal-create-task-chem') {
        var chemElementSelect = modal.querySelector('#chem-element-select');
        if (chemElementSelect) {
          var chemistryCatalog = Storage.get('chemistryCatalog');
          // Сохраняем текущее значение только если оно не пустое и не "— Выберите —"
          var currentValue = chemElementSelect.value && chemElementSelect.value !== '' ? chemElementSelect.value : '';
          chemElementSelect.innerHTML = '<option value="">— Выберите —</option>';
          chemistryCatalog.forEach(function(c) {
            var option = document.createElement('option');
            option.value = c.name;
            option.textContent = c.name + ' (' + (c.unit || 'кг') + ')';
            if (currentValue && c.name === currentValue) option.selected = true;
            chemElementSelect.appendChild(option);
          });
          // Если значение было пустым, убеждаемся что select остаётся пустым
          if (!currentValue) {
            chemElementSelect.value = '';
            chemElementSelect.selectedIndex = 0;
          }
        }
      }
    }

    // Инициализация разделов
    initMaterials();
    initUsers();
    initClients();
    initLines();
    initChemistryTasks();
    
    // Универсальная загрузка данных для всех страниц
    initUniversalDataLoading();
    
    // Инициализация обработчиков составов при загрузке
    setTimeout(function() {
      var hash = document.location.hash.slice(1);
      if (hash && hash.includes('modal')) {
        initCompositionHandlers(hash);
      }
    }, 300);
    
    // Инициализация обработчиков при открытии модалок через hashchange
    window.addEventListener('hashchange', function() {
      var hash = document.location.hash.slice(1);
      if (hash && hash.includes('modal')) {
        setTimeout(function() {
          initCompositionHandlers(hash);
        }, 200);
      }
    });
    
    initTestData();

    // Валидация ОТК
    var otkAccepted = document.getElementById('otk-accepted');
    var otkRejected = document.getElementById('otk-rejected');
    var otkTotal = document.getElementById('otk-total');
    var otkWarning = document.getElementById('otk-warning');
    var otkForm = otkAccepted ? otkAccepted.closest('form') : null;
    var producedQty = 50;

    if (otkAccepted && otkRejected && otkTotal && otkWarning) {
      function updateOtkTotal() {
        var accepted = parseInt(otkAccepted.value) || 0;
        var rejected = parseInt(otkRejected.value) || 0;
        var total = accepted + rejected;
        otkTotal.textContent = total + ' шт';
        
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
  
  // ===== Инициализация тестовых данных =====
  function initTestData() {
    var page = document.body.getAttribute('data-page');
    if (page !== 'materials') return;
    
    // Проверяем, есть ли уже данные
    var rawMaterials = Storage.get('rawMaterials');
    var incoming = Storage.get('incoming');
    
    // Добавляем тестовые материалы, если их нет
    if (rawMaterials.length === 0) {
      Storage.set('rawMaterials', [
        { id: Date.now().toString(), name: 'Мука пшеничная', unit: 'кг' },
        { id: (Date.now() + 1).toString(), name: 'Сахар', unit: 'кг' },
        { id: (Date.now() + 2).toString(), name: 'Масло подсолнечное', unit: 'л' }
      ]);
    }
    
    // Добавляем тестовые приходы, если их нет
    if (incoming.length === 0) {
      var today = new Date().toISOString().split('T')[0];
      var yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      
      Storage.set('incoming', [
        {
          id: Date.now().toString(),
          date: yesterday,
          material: 'Мука пшеничная',
          quantity: 100,
          unit: 'кг',
          batch: 'LOT-2024-001',
          supplier: 'ООО "Хлебопродукт"',
          comment: 'Первая партия'
        },
        {
          id: (Date.now() + 1).toString(),
          date: today,
          material: 'Сахар',
          quantity: 50,
          unit: 'кг',
          batch: 'LOT-2024-002',
          supplier: 'ООО "Сладкий мир"',
          comment: ''
        },
        {
          id: (Date.now() + 2).toString(),
          date: today,
          material: 'Масло подсолнечное',
          quantity: 20,
          unit: 'л',
          batch: 'LOT-2024-003',
          supplier: 'ООО "Масло и Ко"',
          comment: 'Рафинированное'
        }
      ]);
    }
    
    // Перезагружаем данные с небольшой задержкой
    setTimeout(function() {
      if (typeof window.reloadMaterials === 'function') {
        window.reloadMaterials();
      } else {
        initMaterials();
      }
    }, 100);
  }

  // ===== Полное заполнение базы при первом запуске =====
  var SEED_FLAG = 'dias_db_seeded';

  function seedAllData() {
    var orders = Storage.get('orders');
    var users = Storage.get('users');
    var clients = Storage.get('clients');
    // Заполняем, если что-то из основного пусто
    if (orders.length > 0 && users.length > 0 && clients.length > 0) return;
    var d = new Date().toISOString().split('T')[0];

    Storage.set('users', [
      { id: 'u1', name: 'Иванов Иван Иванович', email: 'ivanov@example.com', role: 'Администратор' },
      { id: 'u2', name: 'Петрова Анна', email: 'petrova@example.com', role: 'Начальник смены' }
    ]);
    Storage.set('roles', [
      { id: 'r1', name: 'Администратор', description: 'Полный доступ' },
      { id: 'r2', name: 'Начальник смены', description: 'Управление сменами' },
      { id: 'r3', name: 'Оператор', description: 'Выпуск продукции' }
    ]);
    Storage.set('rawMaterials', [
      { id: 'm1', name: 'Полиэтилен ПВД', unit: 'кг' },
      { id: 'm2', name: 'Полиэтилен ПНД', unit: 'кг' },
      { id: 'm3', name: 'Сахар', unit: 'кг' }
    ]);
    Storage.set('incoming', [
      { id: 'in1', date: d, material: 'Полиэтилен ПВД', quantity: 500, unit: 'кг', batch: 'LOT-001', supplier: 'ООО Поставщик', comment: '' },
      { id: 'in2', date: d, material: 'Полиэтилен ПНД', quantity: 300, unit: 'кг', batch: 'LOT-002', supplier: 'ООО Поставщик', comment: '' }
    ]);
    Storage.set('lines', [
      { id: 'line1', name: 'Первая линия' },
      { id: 'line2', name: 'Линия экструзии №2' }
    ]);
    Storage.set('clients', [
      { id: 'c1', name: 'ООО Рога и копыта', inn: '7700123456', contact: 'Иванов', phone: '+7 495 111-22-33', address: 'Москва' },
      { id: 'c2', name: 'ИП Петров', inn: '7700987654', contact: 'Петров', phone: '+7 495 444-55-66', address: 'Москва' }
    ]);
    Storage.set('recipes', [
      { id: 'rec1', recipe: 'Рецепт счастье', product: 'Плёнка ПВД 50 мкм', composition: [{ type: 'raw', name: 'Полиэтилен ПВД', quantity: 10, unit: 'кг' }] },
      { id: 'rec2', recipe: 'Плёнка ПВХ', product: 'Плёнка 30 мкм', composition: [{ type: 'raw', name: 'Полиэтилен ПНД', quantity: 8, unit: 'кг' }] }
    ]);
    Storage.set('orders', [
      { id: 'ord1', status: 'Принято', product: 'Плёнка ПВД 50 мкм', recipe: 'Рецепт счастье', line: 'Первая линия', quantity: 20, operator: 'Иванов И.И.', date: d },
      { id: 'ord2', status: 'В работе', product: 'Плёнка 30 мкм', recipe: 'Плёнка ПВХ', line: 'Линия экструзии №2', quantity: 15, operator: 'Петрова А.', date: d },
      { id: 'ord3', status: 'Создан', product: 'Плёнка ПВД 50 мкм', recipe: 'Рецепт счастье', line: 'Первая линия', quantity: 10, operator: '', date: d }
    ]);
    Storage.set('productionBatches', [
      { id: 'batch1', orderId: 'ord1', otkStatus: 'Принято', product: 'Плёнка ПВД 50 мкм', line: 'Первая линия', quantity: 20, operator: 'Иванов И.И.', date: d },
      { id: 'batch2', orderId: 'ord2', otkStatus: 'Ожидает ОТК', product: 'Плёнка 30 мкм', line: 'Линия экструзии №2', quantity: 15, operator: 'Петрова А.', date: d }
    ]);
    Storage.set('otkChecks', [
      { id: 'otk1', batchId: 'batch1', orderId: 'ord1', status: 'Принято', product: 'Плёнка ПВД 50 мкм', quantity: 20, accepted: 20, rejected: 0, rejectReason: '', inspector: 'Сидорова О.Т.', checkedDate: d, comment: 'Партия принята' },
      { id: 'otk2', batchId: 'batch2', orderId: 'ord2', status: 'Ожидает', product: 'Плёнка 30 мкм', quantity: 15, accepted: 0, rejected: 0, rejectReason: '', inspector: '', checkedDate: '', comment: '' }
    ]);
    Storage.set('chemistryCatalog', [
      { id: 'chem1', name: 'Добавка А', unit: 'кг' },
      { id: 'chem2', name: 'Стабилизатор', unit: 'кг' }
    ]);
    Storage.set('chemistryTasks', [
      { id: 'ct1', name: 'Приготовление партии А', status: 'Выполнено', deadline: d, elements: [{ element: 'Добавка А', quantity: 5, unit: 'кг' }] }
    ]);
    Storage.set('shifts', [
      { id: 's1', line: 'Первая линия', date: d, status: 'Открыта' }
    ]);
    Storage.set('warehouseBatches', [
      { id: 'w1', product: 'Плёнка ПВД 50 мкм', quantity: 20, status: 'На складе', date: d }
    ]);
    Storage.set('sales', [
      { id: 'sale1', client: 'ООО Рога и копыта', product: 'Плёнка ПВД 50 мкм', quantity: 10, status: 'Оформлен', date: d }
    ]);
    Storage.set('shipments', [
      { id: 'sh1', client: 'ООО Рога и копыта', product: 'Плёнка ПВД 50 мкм', quantity: 10, date: d, status: 'Отгружено' }
    ]);

    localStorage.setItem(SEED_FLAG, '1');
  }

  function initLinkedData() {
    seedAllData();
  }
})();
