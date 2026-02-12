/**
 * Обработка форм и сбор данных
 */
(function() {
  'use strict';

  /**
   * Собрать данные из формы
   * @param {HTMLElement} form - Элемент формы
   * @returns {Object|null} Данные формы или null
   */
  window.collectFormData = function(form) {
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
        key = window.getFieldKey(label.textContent.trim());
      } else if (input.name) {
        key = input.name;
      } else if (input.id) {
        key = input.id.replace('modal-', '').replace('-', '_');
      }
      
      if (!key) return;
      
      value = window.getInputValue(input);
      
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
    
    // Собираем состав рецепта из таблицы (если есть секция "Состав")
    var compositionRow = Array.from(form.querySelectorAll('.form-row')).find(function(row) {
      var label = row.querySelector('label');
      return label && label.textContent.trim() === 'Состав';
    });
    
    if (compositionRow) {
      var compositionTbody = compositionRow.querySelector('tbody');
      if (compositionTbody && compositionTbody.children.length > 0) {
        var composition = [];
        compositionTbody.querySelectorAll('tr').forEach(function(tr) {
          var cells = tr.querySelectorAll('td');
          if (cells.length >= 3) {
            var typeCell = cells[0].textContent.trim();
            var nameCell = cells[1].textContent.trim();
            var qtyCell = cells[2].textContent.trim();
            
            // Определяем тип компонента
            var type = 'raw';
            if (typeCell.includes('Хим') || typeCell.toLowerCase().includes('chem')) {
              type = 'chem';
            }
            
            // Определяем название компонента
            var componentName = nameCell;
            
            // Определяем количество
            var quantity = parseFloat(qtyCell) || 0;
            
            if (componentName && quantity > 0) {
              composition.push({
                type: type,
                name: componentName,
                quantity: quantity,
                unit: 'кг' // По умолчанию, можно улучшить
              });
            }
          }
        });
        
        if (composition.length > 0) {
          data.composition = composition;
        }
      }
    }
    
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
  };

  /**
   * Собрать данные задания по химии
   * @param {HTMLElement} form - Элемент формы
   * @returns {Object|null} Данные задания или null
   */
  window.collectChemistryTaskData = function(form) {
    var data = {};
    
    // Собираем название задания - ищем поле с label "Название задания"
    var nameRow = Array.from(form.querySelectorAll('.form-row')).find(function(row) {
      var label = row.querySelector('label');
      return label && label.textContent.trim() === 'Название задания';
    });
    
    if (nameRow) {
      var nameInput = nameRow.querySelector('input[type="text"]');
      if (nameInput && nameInput.value) {
        data.name = nameInput.value.trim();
        data.description = nameInput.value.trim();
      }
    }
    
    // Собираем дату
    var dateRow = Array.from(form.querySelectorAll('.form-row')).find(function(row) {
      var label = row.querySelector('label');
      return label && label.textContent.trim() === 'Срок';
    });
    
    if (dateRow) {
      var dateInput = dateRow.querySelector('input[type="date"]');
      if (dateInput && dateInput.value) {
        data.deadline = dateInput.value;
      }
    }
    
    // Собираем элементы из таблицы
    var elementsList = form.querySelector('#chem-elements-list');
    var elements = [];
    if (elementsList) {
      elementsList.querySelectorAll('tr').forEach(function(tr) {
        var cells = tr.querySelectorAll('td');
        if (cells.length >= 3) {
          var elementName = cells[0].textContent.trim();
          var quantity = parseFloat(cells[1].textContent.trim()) || 0;
          var unit = cells[2].textContent.trim();
          
          if (elementName && quantity > 0 && unit) {
            elements.push({
              element: elementName,
              quantity: quantity,
              unit: unit
            });
          }
        }
      });
    }
    data.elements = elements;
    
    // Устанавливаем статус по умолчанию
    data.status = 'Создан';
    
    return (data.name && data.elements.length > 0) ? data : null;
  };

  /**
   * Инициализация универсальной обработки форм
   */
  window.initUniversalForms = function() {
    // Используем делегирование событий для всех форм
    document.body.addEventListener('submit', function(e) {
      var form = e.target.closest('form');
      if (!form || !form.closest('.modal')) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      var modal = form.closest('.modal-overlay');
      var modalId = modal ? modal.id : '';
      var page = document.body.getAttribute('data-page');
      
      // Определяем ключ хранилища и действие
      var config = window.getFormConfig(page, modalId);
      
      // Специальная обработка для задания химии - собираем данные отдельно
      var formData;
      if (config && config.specialHandler === 'chemistryTask') {
        formData = window.collectChemistryTaskData(form);
        if (!formData) {
          alert('Заполните название задания');
          return false;
        }
        if (!formData.name || formData.name.trim() === '') {
          alert('Введите название задания');
          return false;
        }
        if (!formData.elements || formData.elements.length === 0) {
          alert('Добавьте хотя бы один химический элемент');
          return false;
        }
      } else {
        // Обычная обработка формы
        formData = window.collectFormData(form);
        
        if (!formData) {
          var emptyFields = [];
          form.querySelectorAll('input[required], select[required], textarea[required]').forEach(function(field) {
            if (!field.value || (typeof field.value === 'string' && field.value.trim() === '')) {
              var label = field.closest('.form-row') ? field.closest('.form-row').querySelector('label') : null;
              if (label) emptyFields.push(label.textContent.trim());
            }
          });
          if (emptyFields.length > 0) {
            alert('Заполните обязательные поля: ' + emptyFields.join(', '));
          } else {
            alert('Заполните обязательные поля');
          }
          return false;
        }
      }
      
      if (config && config.storageKey) {
        try {
          var id = form.dataset.itemId || modal.dataset.itemId;
          
          if (config.action === 'add' && !id) {
            // Заказ: по умолчанию статус "Создан"
            if (modalId === 'modal-create-order') {
              formData.status = 'Создан';
            }
            window.Storage.add(config.storageKey, formData);
            // Производство: после выпуска меняем статус заказа на "В работе"
            if (modalId === 'modal-produce') {
              var orderSelect = modal.querySelector('#order-select');
              var opt = orderSelect && orderSelect.options[orderSelect.selectedIndex];
              var orderId = opt && opt.dataset.orderId;
              if (orderId) {
                window.Storage.update('orders', orderId, { status: 'В работе' });
              }
            }
            // ОТК: при приёмке обновляем партию, заказ и добавляем на Склад ГП
            if (modalId === 'modal-check-otk') {
              var batchId = modal.dataset.batchId;
              var orderId = modal.dataset.orderId;
              var accepted = parseInt(formData.accepted || formData.Принято || 0, 10) || 0;
              var rejected = parseInt(formData.rejected || formData.Брак || 0, 10) || 0;
              var otkStatus = rejected > 0 ? 'Принято с браком' : 'Принято';
              var orderStatus = rejected > 0 ? 'Принято с браком' : 'Принято';
              if (batchId) {
                window.Storage.update('productionBatches', batchId, { otkStatus: otkStatus });
              }
              if (orderId) {
                window.Storage.update('orders', orderId, { status: orderStatus });
              }
              if (accepted > 0 && orderId) {
                var batches = window.Storage.get('productionBatches');
                var batch = batches.find(function(b) { return b.id === batchId; });
                var product = (batch && batch.product) || '';
                var d = new Date().toISOString().split('T')[0];
                window.Storage.add('warehouseBatches', {
                  product: product,
                  quantity: accepted,
                  status: 'На складе',
                  date: d,
                  orderId: orderId,
                  batchId: batchId
                });
              }
            }
          } else if (config.action === 'update' || id) {
            if (id) {
              window.Storage.update(config.storageKey, id, formData);
            } else {
              return false;
            }
          } else if (config.action === 'delete') {
            if (id) {
              window.Storage.delete(config.storageKey, id);
            }
          }
          
          // Перезагружаем данные страницы
          if (window.reloadPageData) {
            window.reloadPageData(page);
          }
          
          form.reset();
          // Очищаем таблицу элементов
          var elementsList = form.querySelector('#chem-elements-list');
          if (elementsList) elementsList.innerHTML = '';
          
          // Очищаем select единиц
          var unitSelect = form.querySelector('#chem-unit-select');
          if (unitSelect) unitSelect.value = 'кг';
          
          // Закрываем модалку
          window.closeModal();
        } catch (err) {
          console.error('Ошибка сохранения:', err);
          alert('Ошибка при сохранении данных');
        }
      }
      
      return false;
    });
  };
})();
