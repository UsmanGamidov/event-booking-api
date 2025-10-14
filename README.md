# Event Booking API

REST API для бронирования мест на мероприятия.  
Один пользователь не может забронировать одно и то же событие дважды.  
Реализовано на Node.js (Express) и SQLite.

---

## Установка и запуск

git clone https://github.com/<твой_ник>/event-booking-api.git  
cd event-booking-api  
npm install  
npm start  

Сервер запускается на  
http://localhost:8080

---

## Функциональность

### POST /api/bookings/reserve  
Создание брони.  

Тело запроса:  
{
  "event_id": 1,
  "user_id": "user123"
}

Ответы:  
201 — бронь создана  
404 — событие не найдено  
409 — пользователь уже бронировал или мест нет  
422 — ошибка валидации данных  

---

### GET /api/events  
Список событий с количеством свободных мест.  

Пример ответа:  
{
  "ok": true,
  "data": [
    { "id": 1, "name": "Test Event", "total_seats": 2, "seats_left": 1 }
  ]
}

---

## Структура базы данных

Таблица events:  
- id INTEGER PRIMARY KEY  
- name TEXT NOT NULL  
- total_seats INTEGER NOT NULL  

Таблица bookings:  
- id INTEGER PRIMARY KEY  
- event_id INTEGER NOT NULL  
- user_id TEXT NOT NULL  
- created_at TEXT NOT NULL  
- FOREIGN KEY(event_id) REFERENCES events(id)  

Ограничения:  
UNIQUE(event_id, user_id) — предотвращает повторное бронирование одного события тем же пользователем.

---

## Используемые технологии  
Node.js, Express, SQLite (better-sqlite3), Zod.  

## Лицензия  
MIT License
