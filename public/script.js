let tasks = [];
let draggedElement = null;
let draggedIndex = null;

const API = {
    async login(username, password) {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        return response.json();
    },

    async logout() {
        const response = await fetch('/api/logout', { method: 'POST' });
        return response.json();
    },

    async checkAuth() {
        const response = await fetch('/api/auth-status');
        return response.json();
    },

    async loadTasks() {
        const response = await fetch('/api/tasks');
        return response.json();
    },

    async saveTasks(tasks) {
        const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tasks)
        });
        return response.json();
    }
};

function showMessage(text, isError = false) {
    const message = document.getElementById('message');
    message.textContent = text;
    message.className = `message show ${isError ? 'error' : ''}`;
    setTimeout(() => {
        message.classList.remove('show');
    }, 3000);
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function createTaskElement(task, index) {
    const div = document.createElement('div');
    div.className = `task-item ${task.type === 'header' ? 'task-header' : ''}`;
    div.draggable = true;
    div.dataset.index = index;
    
    if (task.type === 'header') {
        div.innerHTML = `
            <input type="text" class="task-text" value="${task.text}" placeholder="Header text">
            <div class="task-actions">
                <button class="delete-btn" onclick="deleteTask(${index})">×</button>
            </div>
        `;
    } else {
        div.innerHTML = `
            <div class="task-checkbox ${task.done ? 'completed' : ''}">
                <input type="checkbox" ${task.done ? 'checked' : ''} onchange="toggleTask(${index})">
                <input type="text" class="task-text" value="${task.text}" placeholder="Task description">
            </div>
            <div class="task-actions">
                <button class="delete-btn" onclick="deleteTask(${index})">×</button>
            </div>
        `;
    }

    const textInput = div.querySelector('.task-text');
    textInput.addEventListener('blur', () => updateTaskText(index, textInput.value));
    textInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            textInput.blur();
        }
    });

    div.addEventListener('dragstart', (e) => {
        draggedElement = div;
        draggedIndex = index;
        div.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    });

    div.addEventListener('dragend', () => {
        div.classList.remove('dragging');
        draggedElement = null;
        draggedIndex = null;
    });

    div.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    });

    div.addEventListener('drop', (e) => {
        e.preventDefault();
        if (draggedIndex !== null && draggedIndex !== index) {
            moveTask(draggedIndex, index);
        }
    });

    return div;
}

function renderTasks() {
    const container = document.getElementById('tasks-container');
    container.innerHTML = '';
    
    tasks.forEach((task, index) => {
        container.appendChild(createTaskElement(task, index));
    });
}

function addHeader() {
    const newTask = {
        id: generateId(),
        type: 'header',
        text: 'New Header',
        done: false
    };
    tasks.push(newTask);
    renderTasks();
}

function addItem() {
    const newTask = {
        id: generateId(),
        type: 'item',
        text: 'New task',
        done: false
    };
    tasks.push(newTask);
    renderTasks();
}

function deleteTask(index) {
    tasks.splice(index, 1);
    renderTasks();
}

function toggleTask(index) {
    tasks[index].done = !tasks[index].done;
    renderTasks();
}

function updateTaskText(index, newText) {
    tasks[index].text = newText;
}

function moveTask(fromIndex, toIndex) {
    const task = tasks.splice(fromIndex, 1)[0];
    tasks.splice(toIndex, 0, task);
    renderTasks();
}

async function saveTasks() {
    try {
        await API.saveTasks(tasks);
        showMessage('Tasks saved successfully!');
    } catch (error) {
        showMessage('Failed to save tasks', true);
    }
}

async function loadTasks() {
    try {
        tasks = await API.loadTasks();
        renderTasks();
    } catch (error) {
        showMessage('Failed to load tasks', true);
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');

    try {
        const result = await API.login(username, password);
        if (result.success) {
            document.getElementById('login-container').style.display = 'none';
            document.getElementById('app-container').style.display = 'block';
            await loadTasks();
        } else {
            errorDiv.textContent = 'Invalid credentials';
        }
    } catch (error) {
        errorDiv.textContent = 'Login failed';
    }
}

async function handleLogout() {
    try {
        await API.logout();
        document.getElementById('login-container').style.display = 'block';
        document.getElementById('app-container').style.display = 'none';
        tasks = [];
    } catch (error) {
        showMessage('Logout failed', true);
    }
}

async function checkAuthStatus() {
    try {
        const result = await API.checkAuth();
        if (result.authenticated) {
            document.getElementById('login-container').style.display = 'none';
            document.getElementById('app-container').style.display = 'block';
            await loadTasks();
        }
    } catch (error) {
        console.error('Auth check failed:', error);
    }
}

document.getElementById('login-form').addEventListener('submit', handleLogin);
document.getElementById('logout-btn').addEventListener('click', handleLogout);
document.getElementById('save-btn').addEventListener('click', saveTasks);
document.getElementById('add-header-btn').addEventListener('click', addHeader);
document.getElementById('add-item-btn').addEventListener('click', addItem);

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveTasks();
    }
});

checkAuthStatus();