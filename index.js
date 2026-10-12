const STORAGE_KEYS = {
  profile: 'flowplan-profile',
  tasks: 'flowplan-tasks',
};

const state = {
  profile: { name: '', age: '' },
  tasks: {},
  selectedDate: null,
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const profileForm = document.getElementById('profileForm');
const nameInput = document.getElementById('nameInput');
const ageInput = document.getElementById('ageInput');
const dateWindow = document.getElementById('dateWindow');
const taskForm = document.getElementById('taskForm');
const taskInput = document.getElementById('taskInput');
const tasksList = document.getElementById('tasksList');
const selectedDateLabel = document.getElementById('selectedDateLabel');
const completedCount = document.getElementById('completedCount');
const remainingCount = document.getElementById('remainingCount');
const todayLabel = document.getElementById('todayLabel');
const prevDayBtn = document.getElementById('prevDayBtn');
const nextDayBtn = document.getElementById('nextDayBtn');

function initialize() {
  state.profile = loadProfile();
  state.tasks = loadTasks();
  state.selectedDate = getDateKey(new Date());

  nameInput.value = state.profile.name;
  ageInput.value = state.profile.age;
  bindEvents();
  render();
}

function bindEvents() {
  profileForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const name = nameInput.value.trim();
    const age = ageInput.value.trim();

    if (!name && !age) {
      return;
    }

    state.profile = {
      name,
      age,
    };

    saveProfile(state.profile);
    renderProfileStatus();
  });

  taskForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const text = taskInput.value.trim();
    if (!text) {
      taskInput.focus();
      return;
    }

    const dateKey = state.selectedDate || getDateKey(new Date());
    const list = state.tasks[dateKey] || [];

    list.push({
      id: crypto.randomUUID ? crypto.randomUUID() : `task-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      text,
      completed: false,
      createdAt: Date.now(),
    });

    state.tasks[dateKey] = list;
    saveTasks(state.tasks);
    taskInput.value = '';
    render();
  });

  prevDayBtn.addEventListener('click', () => {
    state.selectedDate = shiftDateKey(state.selectedDate, -1);
    render();
  });

  nextDayBtn.addEventListener('click', () => {
    state.selectedDate = shiftDateKey(state.selectedDate, 1);
    render();
  });
}

function render() {
  renderProfileStatus();
  renderDateWindow();
  renderTasks();
}

function renderProfileStatus() {
  const { name, age } = state.profile;
  if (name || age) {
    nameInput.value = name;
    ageInput.value = age;
  }
}

function renderDateWindow() {
  const today = new Date();
  todayLabel.textContent = formatLongDate(today);

  const selected = parseDateKey(state.selectedDate) || new Date();
  const windowDates = getDateWindow(selected, 7, 7);

  dateWindow.innerHTML = '';

  windowDates.forEach((date) => {
    const key = getDateKey(date);
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'day-card';

    if (key === getDateKey(today)) {
      card.classList.add('today');
    }

    if (key === state.selectedDate) {
      card.classList.add('selected');
    }

    const tasksForDay = state.tasks[key] || [];
    const taskCount = tasksForDay.length;

    card.innerHTML = `
      <span class="day-name">${DAY_NAMES[date.getDay()]}</span>
      <span class="day-number">${date.getDate()}</span>
      <span class="day-count">${taskCount} task${taskCount === 1 ? '' : 's'}</span>
    `;

    card.addEventListener('click', () => {
      state.selectedDate = key;
      render();
    });

    dateWindow.appendChild(card);
  });

  selectedDateLabel.textContent = formatLongDate(parseDateKey(state.selectedDate) || new Date());
}

function renderTasks() {
  const selected = state.selectedDate || getDateKey(new Date());
  const tasksForDay = state.tasks[selected] || [];

  tasksList.innerHTML = '';

  if (!tasksForDay.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No tasks yet for this day. Add one above.';
    tasksList.appendChild(empty);
  } else {
    tasksForDay.forEach((task) => {
      const item = document.createElement('div');
      item.className = `task-item ${task.completed ? 'completed' : ''}`;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'task-checkbox';
      checkbox.checked = task.completed;
      checkbox.setAttribute('aria-label', `Mark ${task.text} as complete`);
      checkbox.addEventListener('change', () => {
        toggleTaskCompletion(selected, task.id);
      });

      const label = document.createElement('span');
      label.className = 'task-text';
      label.textContent = task.text;

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'delete-btn';
      deleteBtn.textContent = '×';
      deleteBtn.setAttribute('aria-label', `Delete ${task.text}`);
      deleteBtn.addEventListener('click', () => {
        deleteTask(selected, task.id);
      });

      item.appendChild(checkbox);
      item.appendChild(label);
      item.appendChild(deleteBtn);
      tasksList.appendChild(item);
    });
  }

  const allTasks = Object.values(state.tasks).flat();
  const completed = allTasks.filter((task) => task.completed).length;
  const remaining = allTasks.filter((task) => !task.completed).length;

  completedCount.textContent = String(completed);
  remainingCount.textContent = String(remaining);
}

function toggleTaskCompletion(dateKey, taskId) {
  const list = state.tasks[dateKey] || [];
  const updated = list.map((task) => {
    if (task.id === taskId) {
      return { ...task, completed: !task.completed };
    }
    return task;
  });

  state.tasks[dateKey] = updated;
  saveTasks(state.tasks);
  render();
}

function deleteTask(dateKey, taskId) {
  const list = (state.tasks[dateKey] || []).filter((task) => task.id !== taskId);
  if (list.length) {
    state.tasks[dateKey] = list;
  } else {
    delete state.tasks[dateKey];
  }

  saveTasks(state.tasks);
  render();
}

function loadProfile() {
  const raw = localStorage.getItem(STORAGE_KEYS.profile);
  if (!raw) {
    return { name: '', age: '' };
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      name: parsed.name || '',
      age: parsed.age || '',
    };
  } catch {
    return { name: '', age: '' };
  }
}

function saveProfile(profile) {
  localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile));
}

function loadTasks() {
  const raw = localStorage.getItem(STORAGE_KEYS.tasks);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch {
    return {};
  }

  return {};
}

function saveTasks(tasks) {
  localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(tasks));
}

function getDateWindow(centerDate, pastDays, futureDays) {
  const dates = [];
  const anchor = parseDateKey(getDateKey(centerDate));

  for (let offset = -pastDays; offset <= futureDays; offset += 1) {
    const date = new Date(anchor);
    date.setDate(anchor.getDate() + offset);
    dates.push(date);
  }

  return dates;
}

function shiftDateKey(dateKey, offset) {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + offset);
  return getDateKey(date);
}

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey) {
  const [year, month, day] = (dateKey || getDateKey(new Date())).split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatLongDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

initialize();
