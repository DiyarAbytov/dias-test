(function () {
  'use strict';

  // ===== Утилиты для работы с localStorage =====
  var Storage = {
    get: function(key) {
      var data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    },
    set: function(key, data) {
      localStorage.setItem(key, JSON.stringify(data));
    },
    add: function(key, item) {
      var data = this.get(key);
      item.id = Date.now().toString();
      data.push(item);
      this.set(key, data);
      return item;
    },
    update: function(key, id, updates) {
      var data = this.get(key);
      var index = data.findIndex(function(item) { return item.id === id; });
      if (index !== -1) {
        Object.assign(data[index], updates);
        this.set(key, data);
        return data[index];
      }
      return null;
    },
    delete: function(key, id) {
      var data = this.get(key);
      data = data.filter(function(item) { return item.id !== id; });
      this.set(key, data);
    }
  };

  // ===== Вкладки =====
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

  // ===== Модалки =====
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
        return '<td>' + item.name + '</td>' +
               '<td>' + (item.inn || '—') + '</td>' +
               '<td>' + (item.contact || '—') + '</td>' +
               '<td>' + (item.phone || '—') + '</td>' +
               '<td>' + (item.address || '—') + '</td>' +
               '<td class="actions">' +
               '<a href="#modal-edit-client" data-id="' + item.id + '" class="btn btn-secondary btn-sm">Редактировать</a> ' +
               '<a href="#modal-delete-client" data-id="' + item.id + '" class="btn btn-danger btn-sm">Удалить</a>' +
               '</td>';
      });
    }

    // Форма обрабатывается универсальной системой

    loadClients();
  }

  // ===== Линии =====
  function initLines() {
    var page = document.querySelector('body[data-page="lines"]');
    if (!page) return;

    var tbody = document.querySelector('tbody');
    if (!tbody) return;

    function loadLines() {
      var data = Storage.get('lines');
      renderTable(tbody, data, function(item) {
        return '<td>' + item.name + '</td>' +
               '<td class="actions">' +
               '<a href="#modal-edit-line" data-id="' + item.id + '" class="btn btn-secondary btn-sm">Редактировать</a> ' +
               '<a href="#modal-delete-line" data-id="' + item.id + '" class="btn btn-danger btn-sm">Удалить</a>' +
               '</td>';
      });
    }

    // Форма обрабатывается универсальной системой

    loadLines();
  }

  // ===== Универсальная обработка форм =====
  function initUniversalForms() {
    // Используем делегирование событий для всех форм
    document.body.addEventListener('submit', function(e) {
      var form = e.target.closest('form');
      if (!form || !form.closest('.modal')) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      var modal = form.closest('.modal-overlay');
      var modalId = modal ? modal.id : '';
      var page = document.body.getAttribute('data-page');
      
      // Собираем данные формы
      var formData = collectFormData(form);
      
      if (!formData) {
        // Проверяем, какие поля не заполнены
        var emptyFields = [];
        form.querySelectorAll('input[required], select[required], textarea[required]').forEach(function(field) {
          if (!field.value || field.value.trim() === '') {
            var label = field.closest('.form-row') ? field.closest('.form-row').querySelector('label') : null;
            if (label) emptyFields.push(label.textContent.trim());
          }
        });
        if (emptyFields.length > 0) {
          alert('Заполните обязательные поля: ' + emptyFields.join(', '));
        } else {
          alert('Заполните обязательные поля');
        }
        return;
      }
      
      // Определяем ключ хранилища и действие
      var config = getFormConfig(page, modalId);
      
      if (config && config.storageKey) {
        try {
          var id = form.dataset.itemId || modal.dataset.itemId;
          
          if (config.action === 'add' && !id) {
            Storage.add(config.storageKey, formData);
          } else if (config.action === 'update' || id) {
            if (id) {
              Storage.update(config.storageKey, id, formData);
            } else {
              console.warn('ID не найден для обновления');
              return;
            }
          } else if (config.action === 'delete') {
            if (id) {
              Storage.delete(config.storageKey, id);
            }
          }
          
          // Перезагружаем данные страницы
          reloadPageData(page);
          
          // Явно обновляем таблицы через небольшую задержку
          setTimeout(function() {
            var pageEl = document.querySelector('body[data-page="' + page + '"]');
            if (pageEl) {
              // Перезагружаем данные для конкретной страницы
              if (page === 'materials') {
                if (typeof window.reloadMaterials === 'function') window.reloadMaterials();
                else initMaterials();
              } else if (page === 'users') {
                if (typeof window.reloadUsers === 'function') window.reloadUsers();
                else initUsers();
              } else if (page === 'clients') {
                if (typeof window.reloadClients === 'function') window.reloadClients();
                else initClients();
              } else if (page === 'lines') {
                if (typeof window.reloadLines === 'function') window.reloadLines();
                else initLines();
              } else {
                initUniversalDataLoading();
              }
            }
          }, 200);
          
          form.reset();
          if (modal) modal.dataset.itemId = '';
          closeModal();
        } catch (e) {
          console.error('Ошибка сохранения:', e);
          alert('Ошибка при сохранении данных: ' + e.message);
        }
      } else {
        // Если конфигурация не найдена, просто закрываем модалку
        form.reset();
        closeModal();
      }
    }, true);
  }

  function collectFormData(form) {
    var data = {};
    
    // Собираем данные из всех полей формы
    form.querySelectorAll('input, select, textarea').forEach(function(input) {
      // Пропускаем кнопки
      if (input.type === 'submit' || input.type === 'button') return;
      
      // Пропускаем скрытые поля без значения
      if (input.type === 'hidden' && !input.value) return;
      
      var key = '';
      var value = null;
      
      // Пытаемся найти label для поля
      var label = null;
      var row = input.closest('.form-row');
      if (row) {
        label = row.querySelector('label');
      }
      
      if (label) {
        key = getFieldKey(label.textContent.trim());
      } else if (input.name) {
        key = input.name;
      } else if (input.id) {
        key = input.id.replace('modal-', '').replace('-', '_');
      }
      
      if (!key) return;
      
      value = getInputValue(input);
      
      // Сохраняем значение, если оно не null
      if (value !== null) {
        // Для чекбоксов добавляем в массив
        if (input.type === 'checkbox') {
          if (!data[key]) data[key] = [];
          if (input.checked) data[key].push(input.value || 'true');
        } else {
          data[key] = value;
        }
      }
    });
    
    // Проверяем обязательные поля
    var requiredFields = form.querySelectorAll('input[required], select[required], textarea[required]');
    var allRequiredFilled = true;
    requiredFields.forEach(function(field) {
      var val = field.value;
      if (!val || (typeof val === 'string' && val.trim() === '')) {
        allRequiredFilled = false;
        field.style.borderColor = 'var(--danger)';
        setTimeout(function() {
          field.style.borderColor = '';
        }, 2000);
      }
    });
    
    // Если есть данные и все обязательные поля заполнены
    if (Object.keys(data).length > 0 && allRequiredFilled) {
      return data;
    }
    
    return null;
  }

  function getInputValue(input) {
    if (input.type === 'checkbox') return input.checked;
    if (input.type === 'radio') return input.checked ? input.value : null;
    if (input.tagName === 'SELECT') return input.value || null;
    if (input.type === 'date') return input.value || null;
    if (input.type === 'number') return input.value ? parseFloat(input.value) : null;
    return input.value || null;
  }

  function getFieldKey(labelText) {
    var map = {
      'Название': 'name',
      'ФИО': 'name',
      'Email': 'email',
      'Пароль': 'password',
      'Роль': 'role',
      'Ед.': 'unit',
      'Кол-во': 'quantity',
      'Количество': 'quantity',
      'Дата прихода': 'date',
      'Дата': 'date',
      'Сырьё': 'material',
      'Партия': 'batch',
      'Поставщик': 'supplier',
      'Комментарий': 'comment',
      'ИНН': 'inn',
      'Контакт': 'contact',
      'Телефон': 'phone',
      'Адрес доставки': 'address',
      'Адрес': 'address',
      'Рецепт': 'recipe',
      'Товар': 'product',
      'Линия': 'line',
      'Срок': 'deadline',
      'Исполнитель': 'executor',
      'Описание': 'description'
    };
    return map[labelText] || labelText.toLowerCase().replace(/\s+/g, '_');
  }

  function getFormConfig(page, modalId) {
    var configs = {
      'materials': {
        'modal-add-raw': { storageKey: 'rawMaterials', action: 'add' },
        'modal-edit-raw': { storageKey: 'rawMaterials', action: 'update' },
        'modal-incoming': { storageKey: 'incoming', action: 'add' }
      },
      'chemistry': {
        'modal-create-task-chem': { storageKey: 'chemistryTasks', action: 'add' },
        'modal-create-chem': { storageKey: 'chemistryCatalog', action: 'add' },
        'modal-produce-chem': { storageKey: 'chemistryBatches', action: 'add' },
        'modal-confirm-chem-1': { storageKey: 'chemistryTasks', action: 'update' }
      },
      'recipes': {
        'modal-create-recipe': { storageKey: 'recipes', action: 'add' },
        'modal-confirm-recipe-2': { storageKey: 'recipes', action: 'update' }
      },
      'orders': {
        'modal-create-order': { storageKey: 'orders', action: 'add' },
        'modal-confirm-order-2': { storageKey: 'orders', action: 'update' }
      },
      'production': {
        'modal-produce': { storageKey: 'productionBatches', action: 'add' },
        'modal-confirm-production': { storageKey: 'productionBatches', action: 'update' }
      },
      'otk': {
        'modal-check-otk': { storageKey: 'otkChecks', action: 'add' }
      },
      'warehouse': {
        'modal-accept-gp': { storageKey: 'warehouseBatches', action: 'add' }
      },
      'sales': {
        'modal-create-sale': { storageKey: 'sales', action: 'add' },
        'modal-reserve': { storageKey: 'sales', action: 'update' },
        'modal-transfer-shipment': { storageKey: 'sales', action: 'update' }
      },
      'shipment': {
        'modal-ship': { storageKey: 'shipments', action: 'add' }
      },
      'clients': {
        'modal-create-client': { storageKey: 'clients', action: 'add' },
        'modal-edit-client': { storageKey: 'clients', action: 'update' }
      },
      'lines': {
        'modal-create-line': { storageKey: 'lines', action: 'add' },
        'modal-edit-line': { storageKey: 'lines', action: 'update' }
      },
      'users': {
        'modal-create-user': { storageKey: 'users', action: 'add' },
        'modal-edit-user': { storageKey: 'users', action: 'update' },
        'modal-create-role': { storageKey: 'roles', action: 'add' }
      },
      'shifts': {
        'modal-open-shift': { storageKey: 'shifts', action: 'add' }
      }
    };
    return configs[page] && configs[page][modalId] ? configs[page][modalId] : null;
  }

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
        'modal-edit-user': 'users'
      },
      'clients': {
        'modal-edit-client': 'clients'
      },
      'lines': {
        'modal-edit-line': 'lines'
      }
    };
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
    var chemistry = Storage.get('chemistryCatalog');
    document.querySelectorAll('.modal select').forEach(function(select) {
      var label = select.closest('.form-row') ? select.closest('.form-row').querySelector('label') : null;
      if (label && (label.textContent.includes('Хим. элемент') || label.textContent.includes('элемент'))) {
        var currentValue = select.value;
        select.innerHTML = '<option value="">—</option>';
        chemistry.forEach(function(c) {
          var option = document.createElement('option');
          option.value = c.name;
          option.textContent = c.name;
          if (c.name === currentValue) option.selected = true;
          select.appendChild(option);
        });
      }
    });
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
        var data = Storage.get(storageKey);
        if (data.length > 0) {
          // Если данные есть, но таблица пустая, загружаем их
          if (tbody.children.length === 0 || tbody.textContent.trim() === '') {
            renderTableFromStorage(tbody, storageKey, headers);
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
    if (headerTexts.includes('Задание') || headerTexts.includes('Хим. элемент')) return 'chemistryTasks';
    if (headerTexts.includes('Статус') && headerTexts.includes('Продукт') && headerTexts.includes('План')) return 'orders';
    if (headerTexts.includes('Статус ОТК') || headerTexts.includes('Выпущено')) return 'productionBatches';
    if (headerTexts.includes('Принято') && headerTexts.includes('Брак')) return 'otkChecks';
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
        } else {
          var value = getTableValue(item, text, index);
          row += '<td>' + value + '</td>';
        }
      });
      return row;
    });
  }

  function getTableValue(item, headerText, index) {
    var key = getFieldKey(headerText);
    if (item[key] !== undefined) {
      return item[key] || '—';
    }
    // Пытаемся найти по индексу
    var keys = Object.keys(item);
    if (keys[index]) {
      return item[keys[index]] || '—';
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
      else {
        // Для остальных страниц используем универсальную загрузку
        initUniversalDataLoading();
        updateAllSelects();
      }
    }, 150);
  }

  // ===== Основная инициализация =====
  document.addEventListener('DOMContentLoaded', function () {
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

    // Закрытие по кнопкам "Отмена" и "×" - используем делегирование
    document.body.addEventListener('click', function(e) {
      var closeBtn = e.target.closest('.modal-close');
      if (closeBtn) {
        e.preventDefault();
        e.stopPropagation();
        closeModal();
        return;
      }
      
      var cancelBtn = e.target.closest('.btn-secondary');
      if (cancelBtn && cancelBtn.getAttribute('href') === '#' && cancelBtn.closest('.modal')) {
        e.preventDefault();
        e.stopPropagation();
        closeModal();
        return;
      }
    });

    // Универсальная обработка форм
    initUniversalForms();
    
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
    
    // Обновление select'ов при открытии модалок
    var lastHash = '';
    var hashCheckInterval = setInterval(function() {
      var currentHash = document.location.hash;
      if (currentHash !== lastHash && currentHash.includes('modal')) {
        lastHash = currentHash;
        var modalId = currentHash.slice(1);
        setTimeout(function() {
          updateAllSelects();
          fillSelectsFromStorage(modalId);
        }, 150);
      }
    }, 200);
    
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
      if (page === 'lines' || page === 'orders') {
        if (typeof updateLineSelects === 'function') {
          updateLineSelects();
        }
      }
      if (page === 'recipes' || page === 'orders') {
        if (typeof updateRecipeSelects === 'function') {
          updateRecipeSelects();
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
          updateAllSelects();
          fillSelectsFromStorage(hash);
        }, 200);
      }
    });
    
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
      
      // Заполняем select рецептов
      var recipes = Storage.get('recipes');
      modal.querySelectorAll('select').forEach(function(select) {
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
    }

    // Инициализация разделов
    initMaterials();
    initUsers();
    initClients();
    initLines();
    
    // Универсальная загрузка данных для всех страниц
    initUniversalDataLoading();

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
})();
