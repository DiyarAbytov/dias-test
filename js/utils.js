/**
 * Утилиты для работы с формами и данными
 */
(function() {
  'use strict';

  window.getInputValue = function(input) {
    if (input.type === 'checkbox') return input.checked;
    if (input.type === 'radio') return input.checked ? input.value : null;
    if (input.tagName === 'SELECT') return input.value || null;
    if (input.type === 'date') return input.value || null;
    if (input.type === 'number') return input.value ? parseFloat(input.value) : null;
    return input.value || null;
  };

  window.getFieldKey = function(labelText) {
    var map = {
      'Название': 'name', 'ФИО': 'name', 'Email': 'email', 'Пароль': 'password', 'Роль': 'role',
      'Ед.': 'unit', 'Кол-во': 'quantity', 'Количество': 'quantity', 'Дата прихода': 'date', 'Дата': 'date',
      'Сырьё': 'material', 'Партия': 'batch', 'Поставщик': 'supplier', 'Комментарий': 'comment',
      'ИНН': 'inn', 'Контакт': 'contact', 'Телефон': 'phone', 'Адрес доставки': 'address', 'Адрес': 'address',
      'Рецепт': 'recipe', 'Товар': 'product', 'Линия': 'line', 'Срок': 'deadline', 'Исполнитель': 'executor', 'Описание': 'description',
      'Принято': 'accepted', 'Брак': 'rejected', 'Причина брака': 'rejectReason', 'Инспектор': 'inspector', 'Проверено': 'checkedDate'
    };
    return map[labelText] || labelText.toLowerCase().replace(/\s+/g, '_');
  };

  window.getStorageKeyByTable = function(page, headers) {
    var headerTexts = Array.from(headers).map(function(h) { return h.textContent.trim(); }).join('|');
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
    if (headerTexts.includes('Партия ГП') || (headerTexts.includes('Статус') && headerTexts.includes('Партия'))) return 'warehouseBatches';
    if (headerTexts.includes('Заказ клиента') || (headerTexts.includes('Клиент') && headerTexts.includes('Кол-во'))) return 'sales';
    if (headerTexts.includes('Накладная') || headerTexts.includes('Отгружено')) return 'shipments';
    if (headerTexts.includes('Дата смены') || headerTexts.includes('Начальник смены')) return 'shifts';
    return null;
  };

  window.getFormConfig = function(page, modalId) {
    var configs = {
      'materials': { 'modal-add-raw': { storageKey: 'rawMaterials', action: 'add' }, 'modal-edit-raw': { storageKey: 'rawMaterials', action: 'update' }, 'modal-incoming': { storageKey: 'incoming', action: 'add' } },
      'chemistry': { 'modal-create-task-chem': { storageKey: 'chemistryTasks', action: 'add', specialHandler: 'chemistryTask' }, 'modal-create-chem': { storageKey: 'chemistryCatalog', action: 'add' }, 'modal-produce-chem': { storageKey: 'chemistryBatches', action: 'add' }, 'modal-confirm-chem-1': { storageKey: 'chemistryTasks', action: 'update' } },
      'recipes': { 'modal-create-recipe': { storageKey: 'recipes', action: 'add' }, 'modal-confirm-recipe-2': { storageKey: 'recipes', action: 'update' } },
      'orders': { 'modal-create-order': { storageKey: 'orders', action: 'add' }, 'modal-confirm-order-2': { storageKey: 'orders', action: 'update' } },
      'production': { 'modal-produce': { storageKey: 'productionBatches', action: 'add' }, 'modal-confirm-production': { storageKey: 'productionBatches', action: 'update' } },
      'otk': { 'modal-check-otk': { storageKey: 'otkChecks', action: 'add' }, 'modal-confirm-otk': { storageKey: 'otkChecks', action: 'update' } },
      'warehouse': { 'modal-add-warehouse': { storageKey: 'warehouseBatches', action: 'add' } },
      'sales': { 'modal-create-sale': { storageKey: 'sales', action: 'add' } },
      'shipment': { 'modal-create-shipment': { storageKey: 'shipments', action: 'add' } },
      'users': { 'modal-create-user': { storageKey: 'users', action: 'add' }, 'modal-edit-user': { storageKey: 'users', action: 'update' }, 'modal-create-role': { storageKey: 'roles', action: 'add' }, 'modal-edit-role': { storageKey: 'roles', action: 'update' }, 'modal-edit-role-admin': { storageKey: 'roles', action: 'update' }, 'modal-edit-role-shift': { storageKey: 'roles', action: 'update' }, 'modal-edit-role-chem': { storageKey: 'roles', action: 'update' }, 'modal-edit-role-tech': { storageKey: 'roles', action: 'update' }, 'modal-edit-role-operator': { storageKey: 'roles', action: 'update' }, 'modal-edit-role-otk': { storageKey: 'roles', action: 'update' } },
      'clients': { 'modal-add-client': { storageKey: 'clients', action: 'add' }, 'modal-edit-client': { storageKey: 'clients', action: 'update' } },
      'lines': { 'modal-create-line': { storageKey: 'lines', action: 'add' }, 'modal-edit-line': { storageKey: 'lines', action: 'update' } },
      'shifts': { 'modal-open-shift': { storageKey: 'shifts', action: 'add' } }
    };
    var cfg = configs[page] && configs[page][modalId] ? configs[page][modalId] : null;
    if (!cfg && page === 'users' && modalId && modalId.indexOf('modal-edit-role-') === 0) {
      cfg = { storageKey: 'roles', action: 'update' };
    }
    return cfg;
  };
})();
