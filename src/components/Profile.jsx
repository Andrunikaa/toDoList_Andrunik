import { Supabase } from "../supabase";
import { useState, useEffect } from "react";
import "../Profile.css";

export default function Profile({ session }) {
  // Состояние для редактирования задачи
  const [editingTask, setEditingTask] = useState(null);

  // Состояние формы для создания
  const [form, setForm] = useState({
    subject: "",
    title: "",
    due_date: "",
    priority: "Низкий",
    notes: "",
  });

  // Состояние для хранения списка задач пользователя
  const [tasks, setTasks] = useState([]);

  // Состояние загрузки
  const [loading, setLoading] = useState(false);

  // Состояние для мобильного адаптива
  const [mobileView, setMobileView] = useState("tasks");

  // Активный фильтр по датам ("all", "today", "week", "completed")
  const [activeDateFilter, setActiveDateFilter] = useState("all");

  // Состояния для поиска задач
  const [searchTitle, setSearchTitle] = useState("");
  const [searchSubject, setSearchSubject] = useState("");

  // Подсчет выполненных задач
  const completedTasksCount = tasks.filter((task) => task.done === true).length;

  // Получение сегодняшней даты в формате YYYY-MM-DD
  const today = new Date().toISOString().split("T")[0];

  // Подсчет просроченных задач
  const overdueTasksCount = tasks.filter(
    (task) => !task.done && task.due_date && task.due_date < today
  ).length;

  // Получение предстоящих задач, отсортированных по дате
  const upcomingTasks = tasks
    .filter((task) => !task.done && task.due_date && task.due_date >= today)
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

  // Ближайший срок из предстоящих задач
  const nearestDueDate =
    upcomingTasks.length > 0 ? upcomingTasks[0].due_date : null;

  // Функция для получения задач на сегодня
  const getTodayTasks = (tasks) => {
    const today = new Date().toISOString().split("T")[0];
    return tasks.filter((task) => task.due_date === today);
  };

  // Функция для получения задач на текущую неделю
  const getWeekTasks = (tasks) => {
    const today = new Date();
    // Начало недели (понедельник)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // Конец недели (воскресенье)
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (6 - today.getDay()));
    endOfWeek.setHours(23, 59, 59, 999);

    return tasks.filter((task) => {
      if (!task.due_date) return false;
      const taskDate = new Date(task.due_date);
      return taskDate >= startOfWeek && taskDate <= endOfWeek;
    });
  };

  // Функция для получения выполненных задач
  const getCompletedTasks = (tasks) => {
    return tasks.filter((task) => task.done === true);
  };

  // Функция для получения всех задач
  const getAllTasks = (tasks) => {
    return tasks;
  };

  // Основная функция фильтрации задач по выбранному фильтру
  const getFilteredTasks = (tasks) => {
    switch (activeDateFilter) {
      case "today":
        return getTodayTasks(tasks);
      case "week":
        return getWeekTasks(tasks);
      case "completed":
        return getCompletedTasks(tasks);
      case "all":
      default:
        return getAllTasks(tasks);
    }
  };

  // Окончательный отсортированный список задач с применением поиска
  const sortedTasks = [...tasks]
    // Фильтрация по названию и предмету
    .filter((task) => {
      const matchesSubject =
        searchSubject === "" ||
        task.subject.toLowerCase().includes(searchSubject.toLowerCase());

      const matchesTitle =
        searchTitle === "" ||
        task.title.toLowerCase().includes(searchTitle.toLowerCase());
      return matchesSubject && matchesTitle;
    })
    .filter((task) => {
      const filteredTasks = getFilteredTasks([task]);
      return filteredTasks.length > 0;
    })

    .sort((a, b) => {
      // Высокий приоритет идет первым
      if (a.priority === "Высокий" && b.priority !== "Высокий") return -1;
      if (a.priority !== "Высокий" && b.priority === "Высокий") return 1;

      // Сортировка по дате (ближайшие сроки первыми)
      if (a.due_date && b.due_date) {
        return new Date(a.due_date) - new Date(b.due_date);
      }
      if (a.due_date && !b.due_date) return -1;
      if (!a.due_date && b.due_date) return 1;

      return 0;
    });

  // Пордгрузка задач с бд при изменении сессии
  useEffect(() => {
    if (session?.user?.id) {
      loadUserTasks();
    }
  }, [session]);

  // Загрузка задач пользователя из Supabase
  async function loadUserTasks() {
    setLoading(true);
    const { data, error } = await Supabase.from("tasks")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Ошибка загрузки задач:", error);
    } else {
      setTasks(data || []);
    }
    setLoading(false);
  }

  // Сброс формы к исходному состоянию
  function resetForm() {
    setForm({
      subject: "",
      title: "",
      due_date: "",
      priority: "Низкий",
      notes: "",
    });
    setEditingTask(null);
  }

  // Начало редактирования задачи - заполнение формы данными задачи
  function startEdit(task) {
    setForm({
      subject: task.subject || "",
      title: task.title || "",
      due_date: task.due_date || "",
      priority: task.priority || "Низкий",
      notes: task.notes || "",
    });
    setEditingTask(task.id);
    setMobileView("form"); // На мобильных переключаем на форму
  }

  // Отмена редактирования
  function cancelEdit() {
    resetForm();
    setMobileView("tasks");
  }
  async function handleSave(e) {
    e.preventDefault();

    // Сбор данных перед отправкой в бд
    const payload = {
      subject: form.subject,
      title: form.title,
      due_date: form.due_date,
      priority: form.priority,
      notes: form.notes,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editingTask) {
        // Обновление существующей задачи
        const { error } = await Supabase.from("tasks")
          .update(payload)
          .eq("id", editingTask)
          .eq("user_id", session.user.id);

        if (error) throw error;
      } else {
        // Создание новой задачи
        const { error } = await Supabase.from("tasks").insert([
          {
            ...payload,
            user_id: session.user.id,
            done: false,
            created_at: new Date().toISOString(),
          },
        ]);

        if (error) throw error;
      }

      resetForm();
      await loadUserTasks();
      setMobileView("tasks");
    } catch (error) {
      alert(`Ошибка: ${error.message}`);
    }
  }

  // Удаление задачи
  async function deleteTask(taskId) {
    if (!confirm("Удалить задачу?")) return;

    const { error } = await Supabase.from("tasks")
      .delete()
      .eq("id", taskId)
      .eq("user_id", session.user.id);

    if (error) {
      console.error("Ошибка удаления:", error);
    } else {
      await loadUserTasks();
    }
  }

  // Переключение статуса выполнения задачи
  async function toggleTaskStatus(taskId, currentStatus) {
    const { error } = await Supabase.from("tasks")
      .update({
        done: !currentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId)
      .eq("user_id", session.user.id);

    if (error) {
      console.error("Ошибка обновления статуса:", error);
    } else {
      await loadUserTasks();
    }
  }

  //Считывание изменений формы
  function inputCollector(key, value) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  // Выход из профиля
  async function handleSignOut() {
    const { error } = await Supabase.auth.signOut();
    if (error) {
      console.error(error);
    }
  }

  // Форматирование даты в русский формат (DD.MM.YYYY)
  function formatDate(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  // Обработчик изменения фильтра по датам
  const handleDateFilter = (filterType) => {
    setActiveDateFilter(filterType);
  };

  return (
    <div className="profile-container">
      <header className="profile-header">
        <h1 className="profile-title">Планировщик заданий</h1>
        <div className="profile-user">
          <span className="profile-email">{session.user.email}</span>
          <button onClick={handleSignOut} className="btn-signout">
            Выход
          </button>
        </div>
      </header>

      <div
        className={`profile-content ${
          mobileView === "form" ? "mobile-view-form" : "mobile-view-tasks"
        }`}
      >
        <div className="mobile-view-selector">
          <select
            value={mobileView}
            onChange={(e) => setMobileView(e.target.value)}
            className="mobile-view-select"
          >
            <option value="tasks">Список задач</option>
            <option value="form">Добавить задачу</option>
          </select>
        </div>

        <div className="profile-sidebar">
          <div className="stats">
            <span className="stat">
              <p className="stat_p">
                Всего: <br></br> {tasks.length}
              </p>
            </span>
            <span className="stat">
              <p className="stat_p">
                Готово: <br />
                {completedTasksCount}
              </p>
            </span>
            <span className="stat">
              <p className="stat_p">
                Просрочено: <br></br> {overdueTasksCount}
              </p>
            </span>
            <span className="stat">
              <p className="stat_p">
                Ближайший срок: <br></br> {nearestDueDate || "-"}
              </p>
            </span>
          </div>

          <form onSubmit={handleSave} className="task-form">
            <h2 className="form-title">
              {editingTask ? "Редактировать задачу" : "Добавить задачу"}
            </h2>

            <div className="form-group">
              <label className="form-label">Предмет</label>
              <input
                value={form.subject}
                onChange={(e) => inputCollector("subject", e.target.value)}
                type="text"
                placeholder="Предмет"
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Название</label>
              <input
                value={form.title}
                onChange={(e) => inputCollector("title", e.target.value)}
                type="text"
                placeholder="Название"
                className="form-input"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Срок</label>
                <input
                  value={form.due_date}
                  onChange={(e) => inputCollector("due_date", e.target.value)}
                  type="date"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Приоритет</label>
                <select
                  value={form.priority}
                  onChange={(e) => inputCollector("priority", e.target.value)}
                  className="form-select"
                >
                  <option value="Низкий">Низкий</option>
                  <option value="Высокий">Высокий</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Заметки</label>
              <textarea
                value={form.notes}
                onChange={(e) => inputCollector("notes", e.target.value)}
                placeholder="Заметки"
                className="form-textarea"
                rows="3"
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary">
                {editingTask ? "Сохранить" : "Добавить"}
              </button>
              {editingTask && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="btn-secondary"
                >
                  Отмена
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="profile-main">
          <div className="tasks-header">
            <h2 className="tasks-title">Мои задачи ({tasks.length})</h2>
          </div>

          <div className="input-container">
            <div className="dates">
              <button
                className={`dates-button ${
                  activeDateFilter === "all" ? "dates-button-active" : ""
                }`}
                onClick={() => handleDateFilter("all")}
              >
                Все
              </button>
              <button
                className={`dates-button ${
                  activeDateFilter === "today" ? "dates-button-active" : ""
                }`}
                onClick={() => handleDateFilter("today")}
              >
                Сегодня
              </button>
              <button
                className={`dates-button ${
                  activeDateFilter === "week" ? "dates-button-active" : ""
                }`}
                onClick={() => handleDateFilter("week")}
              >
                Неделя
              </button>
              <button
                className={`dates-button ${
                  activeDateFilter === "completed" ? "dates-button-active" : ""
                }`}
                onClick={() => handleDateFilter("completed")}
              >
                Выполнено
              </button>
            </div>

            <input
              value={searchTitle}
              onChange={(e) => {
                setSearchTitle(e.target.value);
              }}
              placeholder="Поиск по названю"
              type="text"
              className="search-input"
            />
            <input
              value={searchSubject}
              onChange={(e) => {
                setSearchSubject(e.target.value);
              }}
              placeholder="Поиск по предмету"
              type="text"
              className="search-input"
            />
          </div>

          {loading && <p className="tasks-message">Загрузка...</p>}

          {!loading && sortedTasks.length === 0 && (
            <p className="tasks-message">
              {activeDateFilter === "all" && "Задач пока нет"}
              {activeDateFilter === "today" && "Нет задач на сегодня"}
              {activeDateFilter === "week" && "Нет задач на этой неделе"}
              {activeDateFilter === "completed" && "Нет выполненных задач"}
            </p>
          )}

          <div className="tasks-list">
            {!loading &&
              sortedTasks.map((task) => (
                <div
                  key={task.id}
                  className={`task-card ${task.done ? "task-completed" : ""}`}
                >
                  <div className="task-main-content">
                    <div className="task-checkbox-wrapper">
                      <input
                        type="checkbox"
                        checked={task.done}
                        onChange={() => toggleTaskStatus(task.id, task.done)}
                        className="task-checkbox"
                        id={`task-${task.id}`}
                      />
                      <label
                        htmlFor={`task-${task.id}`}
                        className="checkbox-label"
                      >
                        <div className="custom-checkbox">
                          {task.done && <div className="checkmark">✓</div>}
                        </div>
                      </label>
                    </div>

                    <div className="task-content">
                      <div className="task-header">
                        <h3 className="task-title">{task.title}</h3>
                        <div className="task-meta">
                          {task.due_date && (
                            <span className="task-date">
                              Срок: {formatDate(task.due_date)}
                            </span>
                          )}
                          <span
                            className={`task-priority ${task.priority.toLowerCase()}`}
                          >
                            • {task.priority.toLowerCase()}
                          </span>
                        </div>
                      </div>

                      <div className="task-body">
                        <p className="task-subject">{task.subject}</p>
                        {task.notes && (
                          <p className="task-notes">{task.notes}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="task-actions">
                    <button
                      onClick={() => startEdit(task)}
                      className="btn-edit"
                    >
                      Изм.
                    </button>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="btn-delete"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
