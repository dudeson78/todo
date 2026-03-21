(() => {
  const firebaseConfig = {
    apiKey: 'AIzaSyB5RxrLoDty37mno_gCREJkVI3CSRosZmA',
    authDomain: 'todo-c7c07.firebaseapp.com',
    databaseURL: 'https://todo-c7c07-default-rtdb.firebaseio.com',
    projectId: 'todo-c7c07',
    storageBucket: 'todo-c7c07.firebasestorage.app',
    messagingSenderId: '119223033376',
    appId: '1:119223033376:web:608cf7aca5c2c2fe726645',
    measurementId: 'G-CY5VLWYK3E',
  };

  firebase.initializeApp(firebaseConfig);
  const db = firebase.database();
  const tasksRef = db.ref('tasks');

  /** @type {{ id: string; title: string; detail: string; date: string; time: number; completed?: boolean }[]} */
  let tasks = [];
  let selectedDate = null;
  /** @type {{ id: string; title: string; detail: string; date: string; time: number; completed?: boolean } | null} */
  let currentDetailTask = null;

  const todayLabelEl = document.getElementById('today-date-label');
  const todayTasksContainer = document.getElementById('today-tasks-container');
  const allTasksContainer = document.getElementById('all-tasks-container');
  const calendarContainer = document.getElementById('calendar-container');
  const calendarMonthLabel = document.getElementById('calendar-month-label');
  const prevMonthButton = document.getElementById('prev-month-button');
  const nextMonthButton = document.getElementById('next-month-button');

  const openModalButton = document.getElementById('open-modal-button');
  const modalOverlay = document.getElementById('task-modal-overlay');
  const taskForm = document.getElementById('task-form');
  const cancelModalButton = document.getElementById('cancel-modal-button');
  const titleInput = document.getElementById('task-title');
  const detailInput = document.getElementById('task-detail');
  const dateInput = document.getElementById('task-date');
  const timeInput = document.getElementById('task-time');
  const filterDateInput = document.getElementById('filter-date-input');

  const detailOverlay = document.getElementById('task-detail-overlay');
  const detailTitleEl = document.getElementById('detail-title');
  const detailDateEl = document.getElementById('detail-modal-title');
  const detailBodyEl = document.getElementById('detail-body');
  const closeDetailButton = document.getElementById('close-detail-button');
  const detailViewEl = document.getElementById('detail-view');
  const detailEditForm = document.getElementById('detail-edit-form');
  const editDetailButton = document.getElementById('edit-detail-button');
  const toggleCompleteButton = document.getElementById('toggle-complete-button');
  const editTitleInput = document.getElementById('edit-task-title');
  const editDetailInput = document.getElementById('edit-task-detail');
  const editDateInput = document.getElementById('edit-task-date');
  const editTimeInput = document.getElementById('edit-task-time');

  function getTodayDateString() {
    return new Date().toISOString().slice(0, 10);
  }

  function formatKoreanDate(dateString) {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-').map(Number);
    if (!year || !month || !day) return dateString;
    return `${year}년 ${month}월 ${day}일`;
  }

  function formatKoreanDateTime(dateString, time) {
    const datePart = formatKoreanDate(dateString);
    if (!datePart) return '';
    if (time === null || time === undefined || time === '') return datePart;
    return `${datePart} ${Number(time)}시`;
  }

  function getCurrentHour() {
    return new Date().getHours();
  }

  function shiftSelectedMonth(delta) {
    const base = selectedDate || getTodayDateString();
    const [year, month] = base.split('-').map(Number);
    if (!year || !month) return;

    const target = new Date(year, month - 1, 1);
    target.setMonth(target.getMonth() + delta);

    const nextDate = `${target.getFullYear().toString().padStart(4, '0')}-${(target.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-01`;

    selectedDate = nextDate;
    if (filterDateInput) {
      filterDateInput.value = selectedDate;
    }
    render();
  }

  function setupFirebaseListener() {
    tasksRef.on('value', (snapshot) => {
      const data = snapshot.val();
      tasks = data
        ? Object.entries(data).map(([key, val]) => ({ ...val, id: key }))
        : [];
      render();
    });
  }

  function openModal() {
    if (!modalOverlay) return;
    modalOverlay.classList.add('open');
    modalOverlay.setAttribute('aria-hidden', 'false');
    if (titleInput) {
      setTimeout(() => titleInput.focus(), 20);
    }
  }

  function closeModal() {
    if (!modalOverlay) return;
    modalOverlay.classList.remove('open');
    modalOverlay.setAttribute('aria-hidden', 'true');
  }

  function clearForm() {
    if (titleInput) titleInput.value = '';
    if (detailInput) detailInput.value = '';
    if (dateInput) dateInput.value = getTodayDateString();
    if (timeInput) timeInput.value = String(getCurrentHour());
  }

  function createTaskCard(task, isToday) {
    const card = document.createElement('article');
    card.className =
      'task-card' +
      (isToday ? ' today-highlight' : '') +
      (task.completed ? ' completed' : '');
    card.dataset.id = task.id;

    const badge = document.createElement('span');
    badge.className = 'task-badge';

    const content = document.createElement('div');
    content.className = 'task-content';

    const titleEl = document.createElement('div');
    titleEl.className = 'task-title';
    titleEl.textContent = task.title;

    const detailEl = document.createElement('div');
    detailEl.className = 'task-detail';
    detailEl.textContent = task.detail || '상세 내용 없음';

    content.appendChild(titleEl);
    content.appendChild(detailEl);

    const meta = document.createElement('div');
    meta.className = 'task-meta';

    const dateChip = document.createElement('span');
    dateChip.className = 'task-date-chip';
    dateChip.textContent = formatKoreanDateTime(task.date, task.time);

    meta.appendChild(dateChip);

    if (isToday) {
      const todayLabel = document.createElement('span');
      todayLabel.className = 'task-label-today';
      todayLabel.textContent = '오늘';
      meta.appendChild(todayLabel);
    }

    card.appendChild(badge);
    card.appendChild(content);
    card.appendChild(meta);

    return card;
  }

  function showDetailView() {
    if (detailViewEl) detailViewEl.hidden = false;
    if (detailEditForm) detailEditForm.hidden = true;
    if (editDetailButton) editDetailButton.hidden = false;
    if (toggleCompleteButton) toggleCompleteButton.hidden = false;
  }

  function showDetailEditMode() {
    if (detailViewEl) detailViewEl.hidden = true;
    if (detailEditForm) detailEditForm.hidden = false;
    if (editDetailButton) editDetailButton.hidden = true;
    if (toggleCompleteButton) toggleCompleteButton.hidden = true;
  }

  function updateToggleButtonText(task) {
    if (!toggleCompleteButton) return;
    toggleCompleteButton.textContent = task.completed ? '미완료로 만들기' : '완료하기';
  }

  function openDetailModal(task) {
    if (!detailOverlay || !detailTitleEl || !detailDateEl || !detailBodyEl) return;

    currentDetailTask = task;
    detailDateEl.textContent = formatKoreanDateTime(task.date, task.time);
    detailTitleEl.textContent = task.title;
    detailBodyEl.textContent = task.detail || '상세 내용이 없습니다.';

    showDetailView();
    updateToggleButtonText(task);

    detailOverlay.classList.add('open');
    detailOverlay.setAttribute('aria-hidden', 'false');
  }

  function closeDetailModal() {
    if (!detailOverlay) return;
    detailOverlay.classList.remove('open');
    detailOverlay.setAttribute('aria-hidden', 'true');
    currentDetailTask = null;
  }

  function handleDetailEditSubmit(event) {
    event.preventDefault();
    if (!currentDetailTask || !editTitleInput || !editDateInput) return;

    const title = editTitleInput.value.trim();
    const detail = (editDetailInput && editDetailInput.value.trim()) || '';
    const date = editDateInput.value;
    const time = editTimeInput ? Number(editTimeInput.value) : 0;

    if (!title) {
      alert('제목을 입력해주세요.');
      editTitleInput.focus();
      return;
    }

    if (editTimeInput && (isNaN(time) || time < 0 || time > 24)) {
      alert('시간은 0~24 사이로 입력해주세요.');
      editTimeInput.focus();
      return;
    }

    const task = tasks.find((t) => t.id === currentDetailTask.id);
    if (!task) return;

    tasksRef
      .child(task.id)
      .update({ title, detail, date, time })
      .then(() => {
        currentDetailTask = { ...task, title, detail, date, time };
        if (detailDateEl) detailDateEl.textContent = formatKoreanDateTime(date, time);
        if (detailTitleEl) detailTitleEl.textContent = title;
        if (detailBodyEl) detailBodyEl.textContent = detail || '상세 내용이 없습니다.';
        showDetailView();
        updateToggleButtonText(currentDetailTask);
      })
      .catch(() => {
        alert('수정에 실패했습니다. 네트워크를 확인하고 다시 시도해주세요.');
      });
  }

  function handleToggleComplete() {
    if (!currentDetailTask) return;

    const task = tasks.find((t) => t.id === currentDetailTask.id);
    if (!task) return;

    const newCompleted = !task.completed;

    tasksRef
      .child(task.id)
      .update({ completed: newCompleted })
      .then(() => {
        currentDetailTask = { ...task, completed: newCompleted };
        updateToggleButtonText(currentDetailTask);
      })
      .catch(() => {
        alert('상태 변경에 실패했습니다. 네트워크를 확인하고 다시 시도해주세요.');
      });
  }

  function render() {
    if (!todayTasksContainer || !allTasksContainer) return;

    const todayStr = getTodayDateString();
    const currentDate = selectedDate || todayStr;

    if (todayLabelEl) {
      const label = formatKoreanDate(currentDate);
      todayLabelEl.textContent = currentDate === todayStr ? `${label} (오늘)` : label;
    }

    todayTasksContainer.innerHTML = '';
    allTasksContainer.innerHTML = '';
    if (calendarContainer) calendarContainer.innerHTML = '';

    const sorted = [...tasks].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      const aTime = a.time ?? 0;
      const bTime = b.time ?? 0;
      if (aTime !== bTime) return aTime - bTime;
      return a.id.localeCompare(b.id);
    });

    // 오늘의 할 일 (선택 날짜 기준)
    const dailyTasks = sorted.filter((t) => t.date === currentDate);

    if (!dailyTasks.length) {
      const emptyToday = document.createElement('div');
      emptyToday.className = 'empty-state';
      emptyToday.innerHTML = '<span>선택한 날짜에 등록된 할 일이 없습니다.</span>';
      todayTasksContainer.appendChild(emptyToday);
    } else {
      dailyTasks.forEach((task) => {
        const isToday = task.date === todayStr;
        todayTasksContainer.appendChild(createTaskCard(task, isToday));
      });
    }

    // 달력은 월 이동과 무관하게 항상 렌더링
    allTasksContainer.hidden = true;
    if (!calendarContainer) return;
    calendarContainer.hidden = false;

    const [year, month] = currentDate.split('-').map(Number);
    if (calendarMonthLabel && year && month) {
      calendarMonthLabel.textContent = `${year}년 ${month}월`;
    }

    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0).getDate();
    const startWeekday = firstDay.getDay(); // 0(일)~6(토)

    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    weekdays.forEach((label) => {
      const cell = document.createElement('div');
      cell.className = 'calendar-header-cell';
      cell.textContent = label;
      calendarContainer.appendChild(cell);
    });

    const tasksByDate = new Map();
    for (const task of sorted) {
      const key = task.date;
      if (!tasksByDate.has(key)) tasksByDate.set(key, []);
      tasksByDate.get(key).push(task);
    }

    // 앞쪽 빈 칸
    for (let i = 0; i < startWeekday; i += 1) {
      const empty = document.createElement('div');
      empty.className = 'calendar-cell calendar-cell-empty';
      calendarContainer.appendChild(empty);
    }

    // 실제 날짜 셀
    for (let day = 1; day <= lastDay; day += 1) {
      const dateStr = `${year.toString().padStart(4, '0')}-${month
        .toString()
        .padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const dayTasks = tasksByDate.get(dateStr) || [];

      const cell = document.createElement('div');
      cell.className = 'calendar-cell';

      const header = document.createElement('div');
      header.className = 'calendar-cell-header';

      const dayNumber = document.createElement('span');
      dayNumber.className = 'calendar-day-number';
      if (dateStr === todayStr) {
        dayNumber.classList.add('today');
      }
      dayNumber.textContent = String(day);

      header.appendChild(dayNumber);
      cell.appendChild(header);

      const tasksList = document.createElement('div');
      tasksList.className = 'calendar-tasks';

      dayTasks.forEach((task) => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className =
          'calendar-task' + (task.completed ? ' completed' : '');
        const timeLabel = task.time !== null && task.time !== undefined
          ? `(${String(Number(task.time)).padStart(2, '0')}) `
          : '';
        item.textContent = `${timeLabel}${task.title}`;
        item.dataset.id = task.id;
        tasksList.appendChild(item);
      });

      cell.appendChild(tasksList);
      calendarContainer.appendChild(cell);
    }
  }

  function handleFormSubmit(event) {
    event.preventDefault();

    const form = event.target;
    const titleField = form.elements.namedItem('title');
    const detailField = form.elements.namedItem('detail');
    const dateField = form.elements.namedItem('date');
    const timeField = form.elements.namedItem('time');

    if (!titleField || !dateField) return;

    const title = titleField.value.trim();
    const detail = (detailField && detailField.value.trim()) || '';
    const date = dateField.value;
    const time = timeField ? Number(timeField.value) : 0;

    if (!title) {
      alert('제목을 입력해주세요.');
      if (titleField.focus) titleField.focus();
      return;
    }

    if (!date) {
      alert('일자를 선택해주세요.');
      if (dateField.focus) dateField.focus();
      return;
    }

    if (timeField && (isNaN(time) || time < 0 || time > 24)) {
      alert('시간은 0~24 사이로 입력해주세요.');
      if (timeField.focus) timeField.focus();
      return;
    }

    const submitButton = taskForm.querySelector('[type="submit"]');
    if (submitButton) submitButton.disabled = true;

    tasksRef
      .push({ title, detail, date, time, completed: false })
      .then(() => {
        clearForm();
        closeModal();
      })
      .catch(() => {
        alert('할 일 추가에 실패했습니다. 네트워크를 확인하고 다시 시도해주세요.');
      })
      .finally(() => {
        if (submitButton) submitButton.disabled = false;
      });
  }

  function setupEventListeners() {
    if (openModalButton) {
      openModalButton.addEventListener('click', () => {
        clearForm();
        openModal();
      });
    }

    if (cancelModalButton) {
      cancelModalButton.addEventListener('click', () => {
        closeModal();
      });
    }

    if (modalOverlay) {
      modalOverlay.addEventListener('click', (event) => {
        if (event.target === modalOverlay) {
          closeModal();
        }
      });
    }

    if (taskForm) {
      taskForm.addEventListener('submit', handleFormSubmit);
    }

    // 새 할 일 추가 모달: 날짜 입력 시 달력 표시
    if (dateInput) {
      const openDatePicker = () => {
        if (typeof dateInput.showPicker === 'function') {
          dateInput.showPicker();
        }
      };
      dateInput.addEventListener('focus', openDatePicker);
      dateInput.addEventListener('click', openDatePicker);
    }

    // 상세 편집 모달: 날짜 입력 시 달력 표시
    if (editDateInput) {
      const openEditDatePicker = () => {
        if (typeof editDateInput.showPicker === 'function') {
          editDateInput.showPicker();
        }
      };
      editDateInput.addEventListener('focus', openEditDatePicker);
      editDateInput.addEventListener('click', openEditDatePicker);
    }

    function handleTaskCardClick(event) {
      const target = event.target.closest('[data-id]');
      if (!target) return;
      const id = target.dataset.id;
      if (!id) return;
      const task = tasks.find((t) => t.id === id);
      if (!task) return;
      openDetailModal(task);
    }

    if (todayTasksContainer) {
      todayTasksContainer.addEventListener('click', handleTaskCardClick);
    }
    if (allTasksContainer) {
      allTasksContainer.addEventListener('click', handleTaskCardClick);
    }
    if (calendarContainer) {
      calendarContainer.addEventListener('click', handleTaskCardClick);
    }

    if (prevMonthButton) {
      prevMonthButton.addEventListener('click', () => {
        shiftSelectedMonth(-1);
      });
    }

    if (nextMonthButton) {
      nextMonthButton.addEventListener('click', () => {
        shiftSelectedMonth(1);
      });
    }

    if (editDetailButton && editTitleInput && editDetailInput && editDateInput) {
      editDetailButton.addEventListener('click', () => {
        if (!currentDetailTask) return;
        editTitleInput.value = currentDetailTask.title;
        if (editDetailInput) editDetailInput.value = currentDetailTask.detail || '';
        editDateInput.value = currentDetailTask.date;
        if (editTimeInput) editTimeInput.value = String(currentDetailTask.time ?? 0);
        showDetailEditMode();
        setTimeout(() => editTitleInput.focus(), 20);
      });
    }

    if (detailEditForm) {
      detailEditForm.addEventListener('submit', handleDetailEditSubmit);
    }

    if (toggleCompleteButton) {
      toggleCompleteButton.addEventListener('click', handleToggleComplete);
    }

    // 상세 모달 닫기
    if (detailOverlay) {
      detailOverlay.addEventListener('click', (event) => {
        if (event.target === detailOverlay) {
          closeDetailModal();
        }
      });
    }

    if (closeDetailButton) {
      closeDetailButton.addEventListener('click', () => {
        closeDetailModal();
      });
    }

    // 상단 날짜 pill 클릭 → 달력 열기
    if (todayLabelEl && filterDateInput) {
      todayLabelEl.addEventListener('click', () => {
        if (!filterDateInput.value) {
          filterDateInput.value = selectedDate || getTodayDateString();
        }
        if (typeof filterDateInput.showPicker === 'function') {
          filterDateInput.showPicker();
        } else {
          filterDateInput.click();
        }
      });

      filterDateInput.addEventListener('change', () => {
        if (!filterDateInput.value) return;
        selectedDate = filterDateInput.value;
        render();
      });
    }

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeModal();
        closeDetailModal();
      }
    });
  }

  function init() {
    const today = getTodayDateString();
    selectedDate = today;

    if (dateInput) {
      dateInput.value = today;
    }
    if (timeInput) {
      timeInput.value = String(getCurrentHour());
    }
    if (filterDateInput) {
      filterDateInput.value = today;
    }

    setupEventListeners();
    setupFirebaseListener();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

