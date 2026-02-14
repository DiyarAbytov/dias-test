/**
 * Модуль для работы с localStorage
 * Предоставляет простой API для CRUD операций
 */
(function() {
  'use strict';

  window.Storage = {
    /**
     * Получить данные по ключу
     * @param {string} key - Ключ в localStorage
     * @returns {Array} Массив данных или пустой массив
     */
    get: function(key) {
      var data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    },

    /**
     * Сохранить данные по ключу
     * @param {string} key - Ключ в localStorage
     * @param {*} data - Данные для сохранения
     */
    set: function(key, data) {
      localStorage.setItem(key, JSON.stringify(data));
    },

    /**
     * Добавить новый элемент
     * @param {string} key - Ключ в localStorage
     * @param {Object} item - Элемент для добавления
     * @returns {Object} Добавленный элемент с id
     */
    add: function(key, item) {
      var data = this.get(key);
      item.id = Date.now().toString();
      data.push(item);
      this.set(key, data);
      return item;
    },

    /**
     * Обновить элемент по id
     * @param {string} key - Ключ в localStorage
     * @param {string} id - ID элемента
     * @param {Object} updates - Обновления
     * @returns {Object|null} Обновленный элемент или null
     */
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

    /**
     * Удалить элемент по id
     * @param {string} key - Ключ в localStorage
     * @param {string} id - ID элемента
     */
    delete: function(key, id) {
      var data = this.get(key);
      data = data.filter(function(item) { return item.id !== id; });
      this.set(key, data);
    },

    /**
     * Получить следующий номер заказа продажи (SO-YYYY-NNN)
     */
    getNextOrderNumber: function() {
      var y = new Date().getFullYear();
      var key = 'lastOrderNumber_' + y;
      var n = parseInt(localStorage.getItem(key), 10) || 0;
      n += 1;
      localStorage.setItem(key, String(n));
      return 'SO-' + y + '-' + String(n).padStart(3, '0');
    },

    /**
     * Получить следующий номер накладной (SH-YYYY-NNN)
     */
    getNextShipmentNumber: function() {
      var y = new Date().getFullYear();
      var key = 'lastShipmentNumber_' + y;
      var n = parseInt(localStorage.getItem(key), 10) || 0;
      n += 1;
      localStorage.setItem(key, String(n));
      return 'SH-' + y + '-' + String(n).padStart(3, '0');
    }
  };
})();
