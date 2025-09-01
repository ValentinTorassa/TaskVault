let tasks = [];
let draggedElement = null;
let draggedIndex = null;
let showUncheckedOnly = true;
let isSaving = false;
let hasUnsavedChanges = false;

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
        if (!response.ok) throw new Error('Failed to load tasks');
        return response.json();
    },

    async saveTasks(tasks) {
        const response = await fetch('/api/csrf-token');
        if (!response.ok) throw new Error('Failed to get CSRF token');
        const { csrfToken } = await response.json();

        const saveResponse = await fetch('/api/tasks', {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            },
            body: JSON.stringify({ items: tasks })
        });
        if (!saveResponse.ok) throw new Error('Failed to save tasks');
        return saveResponse.json();
    }
};

const Utils = {
    formatRelativeTime(isoString) {
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now - date;
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffSecs < 60) return 'now';
        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}h`;
        if (diffDays < 7) return `${diffDays}d`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)}w`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo`;
        return `${Math.floor(diffDays / 365)}y`;
    },

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

};

const UI = {
    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        const container = document.getElementById('toast-container');
        container.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 10);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => container.removeChild(toast), 300);
        }, 3000);
    },


    updateOutline() {
        const outlineContent = document.getElementById('outline-content');
        const headers = tasks.filter(task => task.type === 'header');
        
        if (headers.length === 0) {
            outlineContent.innerHTML = '<div class="outline-item empty">No headers found</div>';
            return;
        }
        
        outlineContent.innerHTML = headers.map((header, index) => {
            const actualIndex = tasks.findIndex(t => t.id === header.id);
            return `
                <div class="outline-item" data-task-id="${header.id}" onclick="scrollToHeader('${header.id}')">
                    ${header.text || 'Untitled Header'}
                </div>
            `;
        }).join('');
        
        this.updateActiveOutlineItem();
    },

    updateActiveOutlineItem() {
        const headers = document.querySelectorAll('.task-header');
        const outlineItems = document.querySelectorAll('.outline-item:not(.empty)');
        
        let activeHeader = null;
        const scrollTop = document.querySelector('.content-area').scrollTop + 120;
        
        headers.forEach(header => {
            if (header.offsetTop <= scrollTop) {
                activeHeader = header;
            }
        });
        
        outlineItems.forEach(item => item.classList.remove('active'));
        
        if (activeHeader) {
            const taskId = activeHeader.dataset.taskId;
            const activeOutlineItem = document.querySelector(`[data-task-id="${taskId}"]`);
            if (activeOutlineItem) activeOutlineItem.classList.add('active');
        }
    }
};


function createTaskElement(task, originalIndex) {
    const div = document.createElement('div');
    div.className = `task-item ${task.type === 'header' ? 'task-header' : ''}`;
    div.draggable = true;
    div.dataset.index = originalIndex;
    div.dataset.taskId = task.id;
    
    // Create timestamp info
    let timestampText = '';
    let timestampTooltip = '';
    
    if (task.type === 'header') {
        if (task.createdAt) {
            timestampText = `Created · ${Utils.formatRelativeTime(task.createdAt)}`;
            timestampTooltip = `Created: ${new Date(task.createdAt).toLocaleString()}`;
        }
    } else {
        if (task.completedAt) {
            timestampText = `Done · ${Utils.formatRelativeTime(task.completedAt)}`;
            timestampTooltip = `Completed: ${new Date(task.completedAt).toLocaleString()}`;
            if (task.createdAt) {
                timestampTooltip += `\nCreated: ${new Date(task.createdAt).toLocaleString()}`;
            }
        } else if (task.createdAt) {
            timestampText = `Created · ${Utils.formatRelativeTime(task.createdAt)}`;
            timestampTooltip = `Created: ${new Date(task.createdAt).toLocaleString()}`;
        }
    }
    
    if (task.type === 'header') {
        div.innerHTML = `
            <div class="drag-handle">⋮⋮</div>
            <input type="text" class="task-text" value="${task.text || ''}" placeholder="Header text">
            ${timestampText ? `<div class="ts" title="${timestampTooltip}">${timestampText}</div>` : ''}
            <div class="task-actions">
                <button class="delete-btn" data-action="delete" title="Delete header">×</button>
            </div>
        `;
    } else {
        div.innerHTML = `
            <div class="drag-handle">⋮⋮</div>
            <div class="task-checkbox ${task.done ? 'completed' : ''}">
                <input type="checkbox" ${task.done ? 'checked' : ''} data-action="toggle">
                <input type="text" class="task-text" value="${task.text || ''}" placeholder="Task description">
            </div>
            ${timestampText ? `<div class="ts" title="${timestampTooltip}">${timestampText}</div>` : ''}
            <div class="task-actions">
                <button class="delete-btn" data-action="delete" title="Delete task">×</button>
            </div>
        `;
    }

    const textInput = div.querySelector('.task-text');
    textInput.addEventListener('input', () => {
        updateTaskText(originalIndex, textInput.value);
    });
    
    textInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addItemAfter(originalIndex);
        }
    });

    setupDragAndDrop(div, originalIndex);
    
    return div;
}

function setupDragAndDrop(element, index) {
    const dragHandle = element.querySelector('.drag-handle');
    
    // Make the drag handle the only draggable area
    element.draggable = false;
    dragHandle.draggable = true;
    
    dragHandle.addEventListener('dragstart', (e) => {
        draggedElement = element;
        draggedIndex = index;
        element.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', element.outerHTML);
        
        // Add visual feedback - fade original element
        setTimeout(() => {
            element.style.opacity = '0.3';
        }, 0);
    });

    dragHandle.addEventListener('dragend', (e) => {
        element.classList.remove('dragging');
        element.style.opacity = '1';
        draggedElement = null;
        draggedIndex = null;
        
        // Remove drop indicators from all elements
        document.querySelectorAll('.task-item').forEach(item => {
            item.classList.remove('drop-above', 'drop-below');
        });
    });

    element.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        if (draggedElement && draggedElement !== element) {
            const rect = element.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            
            // Remove previous indicators
            element.classList.remove('drop-above', 'drop-below');
            
            // Add indicator based on mouse position
            if (e.clientY < midY) {
                element.classList.add('drop-above');
            } else {
                element.classList.add('drop-below');
            }
        }
    });

    element.addEventListener('dragleave', (e) => {
        // Only remove indicators if we're actually leaving the element
        if (!element.contains(e.relatedTarget)) {
            element.classList.remove('drop-above', 'drop-below');
        }
    });

    element.addEventListener('drop', (e) => {
        e.preventDefault();
        element.classList.remove('drop-above', 'drop-below');
        
        if (draggedIndex !== null && draggedIndex !== index) {
            const rect = element.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            
            let targetIndex = index;
            if (e.clientY > midY) {
                targetIndex = index + 1;
            }
            
            // Adjust target index if we're moving from before to after
            if (draggedIndex < targetIndex) {
                targetIndex--;
            }
            
            moveTask(draggedIndex, targetIndex);
        }
    });
}

function getFilteredTasks() {
    if (!showUncheckedOnly) return tasks;
    
    return tasks.filter(task => {
        if (task.type === 'header') return true;
        return !task.done;
    });
}

function renderTasks() {
    const container = document.getElementById('tasks-container');
    container.innerHTML = '';
    
    const filteredTasks = getFilteredTasks();
    const originalIndices = new Map();
    
    filteredTasks.forEach((task) => {
        const originalIndex = tasks.findIndex(t => t.id === task.id);
        originalIndices.set(task, originalIndex);
        container.appendChild(createTaskElement(task, originalIndex));
    });
    
    UI.updateOutline();
    updateFilterButton();
}

function addHeader() {
    const newTask = {
        id: Utils.generateId(),
        type: 'header',
        text: 'New Header',
        createdAt: new Date().toISOString()
    };
    tasks.push(newTask);
    markAsChanged();
    renderTasks();
    
    setTimeout(() => {
        const headerInput = document.querySelector('.task-item:last-child .task-text');
        if (headerInput) {
            headerInput.focus();
            headerInput.select();
        }
    }, 100);
}

function addItem() {
    const newTask = {
        id: Utils.generateId(),
        type: 'item',
        text: '',
        done: false,
        createdAt: new Date().toISOString()
    };
    tasks.push(newTask);
    markAsChanged();
    renderTasks();
    
    setTimeout(() => {
        const taskInput = document.querySelector('.task-item:last-child .task-text');
        if (taskInput) {
            taskInput.focus();
        }
    }, 100);
}

function addItemAfter(index) {
    const newTask = {
        id: Utils.generateId(),
        type: 'item',
        text: '',
        done: false,
        createdAt: new Date().toISOString()
    };
    tasks.splice(index + 1, 0, newTask);
    markAsChanged();
    renderTasks();
    
    setTimeout(() => {
        const newTaskElement = document.querySelector(`[data-index="${index + 1}"] .task-text`);
        if (newTaskElement) {
            newTaskElement.focus();
        }
    }, 100);
}

function deleteTask(index) {
    const task = tasks[index];
    
    if (task.type === 'header') {
        let hasItemsBelow = false;
        for (let i = index + 1; i < tasks.length; i++) {
            if (tasks[i].type === 'header') break;
            if (tasks[i].type === 'item') {
                hasItemsBelow = true;
                break;
            }
        }
        
        if (hasItemsBelow) {
            if (!confirm('This header has items below it. Are you sure you want to delete it?')) {
                return;
            }
        }
    }
    
    tasks.splice(index, 1);
    markAsChanged();
    renderTasks();
}

function toggleTask(index) {
    tasks[index].done = !tasks[index].done;
    
    if (tasks[index].done) {
        tasks[index].completedAt = new Date().toISOString();
    } else {
        delete tasks[index].completedAt;
    }
    
    markAsChanged();
    renderTasks();
}

function updateTaskText(index, newText) {
    tasks[index].text = newText;
    markAsChanged();
    UI.updateOutline();
}

function moveTask(fromIndex, toIndex) {
    const task = tasks.splice(fromIndex, 1)[0];
    tasks.splice(toIndex, 0, task);
    markAsChanged();
    renderTasks();
}

function scrollToHeader(taskId) {
    const headerElement = document.querySelector(`[data-task-id="${taskId}"]`);
    if (headerElement) {
        headerElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function toggleFilter() {
    showUncheckedOnly = !showUncheckedOnly;
    renderTasks();
}

function updateFilterButton() {
    const filterBtn = document.getElementById('filter-btn');
    if (showUncheckedOnly) {
        filterBtn.textContent = 'Show All';
        filterBtn.classList.remove('btn-outline');
        filterBtn.classList.add('btn-primary');
    } else {
        filterBtn.textContent = 'Show Unchecked';
        filterBtn.classList.remove('btn-primary');
        filterBtn.classList.add('btn-outline');
    }
}

async function loadTasks() {
    try {
        const result = await API.loadTasks();
        tasks = result.items || [];
        renderTasks();
        hasUnsavedChanges = false;
    } catch (error) {
        console.error('Load error:', error);
        tasks = [];
        renderTasks();
        UI.showToast('Failed to load tasks', 'error');
    }
}

async function saveTasks() {
    if (isSaving || !hasUnsavedChanges) return;
    
    try {
        isSaving = true;
        updateSaveStatus('saving');
        await API.saveTasks(tasks);
        hasUnsavedChanges = false;
        updateSaveStatus('saved');
    } catch (error) {
        console.error('Save error:', error);
        updateSaveStatus('error');
    } finally {
        isSaving = false;
    }
}

function updateSaveStatus(status) {
    const saveStatusEl = document.getElementById('save-status');
    if (!saveStatusEl) return;
    
    saveStatusEl.className = `save-status ${status}`;
    
    switch (status) {
        case 'saving':
            saveStatusEl.textContent = 'Saving...';
            break;
        case 'saved':
            saveStatusEl.textContent = 'Saved';
            break;
        case 'error':
            saveStatusEl.textContent = 'Error';
            break;
        case 'unsaved':
            saveStatusEl.textContent = 'Unsaved';
            break;
        default:
            saveStatusEl.textContent = 'Saved';
    }
}

const debouncedSave = Utils.debounce(saveTasks, 1000);

function markAsChanged() {
    hasUnsavedChanges = true;
    updateSaveStatus('unsaved');
    debouncedSave();
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
            errorDiv.textContent = result.error || 'Invalid credentials';
        }
    } catch (error) {
        errorDiv.textContent = 'Login failed';
        console.error('Login error:', error);
    }
}

async function handleLogout() {
    try {
        await API.logout();
        document.getElementById('login-container').style.display = 'block';
        document.getElementById('app-container').style.display = 'none';
        tasks = [];
        localChanges = false;
        localStorage.removeItem('taskvault-tasks');
        localStorage.removeItem('taskvault-timestamp');
    } catch (error) {
        UI.showToast('Logout failed', 'error');
        console.error('Logout error:', error);
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

function setupEventListeners() {
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    document.getElementById('filter-btn').addEventListener('click', toggleFilter);
    document.getElementById('add-header-btn').addEventListener('click', addHeader);
    document.getElementById('add-item-btn').addEventListener('click', addItem);
    
    const outlineToggle = document.getElementById('outline-toggle');
    const outlineSidebar = document.getElementById('outline-sidebar');
    const outlineClose = document.getElementById('outline-close');
    
    outlineToggle.addEventListener('click', () => {
        outlineSidebar.classList.toggle('open');
    });
    
    outlineClose.addEventListener('click', () => {
        outlineSidebar.classList.remove('open');
    });
    
    const contentArea = document.querySelector('.content-area');
    contentArea.addEventListener('scroll', Utils.debounce(() => {
        UI.updateActiveOutlineItem();
    }, 100));
    
    // Event delegation for task actions
    const tasksContainer = document.getElementById('tasks-container');
    tasksContainer.addEventListener('click', (e) => {
        const taskItem = e.target.closest('.task-item');
        if (!taskItem) return;
        
        const taskIndex = parseInt(taskItem.dataset.index);
        
        if (e.target.dataset.action === 'delete') {
            e.preventDefault();
            deleteTask(taskIndex);
        }
    });
    
    tasksContainer.addEventListener('change', (e) => {
        const taskItem = e.target.closest('.task-item');
        if (!taskItem) return;
        
        const taskIndex = parseInt(taskItem.dataset.index);
        
        if (e.target.dataset.action === 'toggle') {
            toggleTask(taskIndex);
        }
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT') return;
        
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'H') {
            e.preventDefault();
            addHeader();
        }
        
        if (e.key === 'Escape') {
            outlineSidebar.classList.remove('open');
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    checkAuthStatus();
});