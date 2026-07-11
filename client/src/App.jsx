import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import './index.css';

const THEME_STORAGE_KEY = 'plt_theme';

const CATEGORIES = [
    { name: 'Academics', icon: 'ri-book-read-line', bgClass: 'bg-academics' },
    { name: 'Career', icon: 'ri-briefcase-4-line', bgClass: 'bg-career' },
    { name: 'Personal Life', icon: 'ri-user-smile-line', bgClass: 'bg-personal' },
    { name: 'Family', icon: 'ri-home-heart-line', bgClass: 'bg-family' },
    { name: 'Finance', icon: 'ri-wallet-3-line', bgClass: 'bg-finance' },
    { name: 'Health', icon: 'ri-heart-pulse-line', bgClass: 'bg-health' },
    { name: 'Refresh', icon: 'ri-cup-line', bgClass: 'bg-refresh' }
];

export default function App() {
    const [tasks, setTasks] = useState([]);
    const [theme, setTheme] = useState(localStorage.getItem(THEME_STORAGE_KEY) || 'light');
    const [isUnlocked, setIsUnlocked] = useState(() => sessionStorage.getItem('app_unlocked') === 'true');
    const [pin, setPin] = useState('');
    const [pinError, setPinError] = useState(false);
    const [currentCategory, setCurrentCategory] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [toasts, setToasts] = useState([]);

    // Form states
    const [formCategory, setFormCategory] = useState('');
    const [formDesc, setFormDesc] = useState('');
    const [formEndDate, setFormEndDate] = useState('');

    useEffect(() => {
        document.body.className = theme === 'dark' ? 'dark-mode' : 'light-mode';
    }, [theme]);

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        try {
            const res = await fetch('/api/tasks');
            if (res.ok) {
                const data = await res.json();
                setTasks(data);
            } else {
                const errData = await res.json().catch(() => ({}));
                showToast(`Failed to load tasks: ${errData.details || res.status}`, 'danger');
            }
        } catch (error) {
            showToast('Network error while loading tasks', 'danger');
            console.error("Failed to fetch tasks:", error);
        }
    };

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    };

    const showToast = (message, type = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();
        if (!formCategory || !formDesc.trim()) return;

        const newTask = {
            id: 't_' + Date.now() + Math.random().toString(36).substr(2, 9),
            category: formCategory,
            description: formDesc.trim(),
            createdAt: Date.now(),
            endDate: formEndDate || null,
            completed: false
        };

        try {
            const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTask)
            });

            if (res.ok) {
                setTasks(prev => [...prev, newTask]);
                closeModal();
                showToast('Task Created successfully', 'success');
            } else {
                const errData = await res.json().catch(() => ({}));
                showToast(`Failed: ${errData.details || 'Unknown error'}`, 'danger');
            }
        } catch (error) {
            showToast('Network error', 'danger');
        }
    };

    const toggleTaskCompletion = async (taskId) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const updatedStatus = !task.completed;

        try {
            const res = await fetch(`/api/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed: updatedStatus })
            });

            if (res.ok) {
                setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: updatedStatus } : t));
                if (updatedStatus) {
                    triggerConfetti();
                    showToast('Task Completed!', 'success');
                }
            } else {
                const errData = await res.json().catch(() => ({}));
                showToast(`Failed: ${errData.details || 'Unknown error'}`, 'danger');
            }
        } catch (error) {
            showToast('Network error', 'danger');
        }
    };

    const deleteTask = async (taskId) => {
        try {
            const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
            if (res.ok) {
                setTasks(prev => prev.filter(t => t.id !== taskId));
                showToast('Task Deleted', 'danger');
            } else {
                const errData = await res.json().catch(() => ({}));
                showToast(`Failed: ${errData.details || 'Unknown error'}`, 'danger');
            }
        } catch (error) {
            showToast('Network error', 'danger');
        }
    };

    const triggerConfetti = () => {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#6366f1', '#10b981', '#f59e0b', '#ef4444'],
            zIndex: 3000
        });
    };

    const openModal = () => {
        setFormCategory(currentCategory || '');
        setFormDesc('');
        setFormEndDate('');
        setIsModalOpen(true);
    };

    const closeModal = () => setIsModalOpen(false);

    const handleUnlock = (e) => {
        e.preventDefault();
        if (pin === '6130') {
            setIsUnlocked(true);
            sessionStorage.setItem('app_unlocked', 'true');
        } else {
            setPinError(true);
            setTimeout(() => setPinError(false), 500);
            setPin('');
        }
    };

    if (!isUnlocked) {
        return (
            <div className="lock-screen">
                <div className="lock-container glass">
                    <i className="ri-lock-password-line lock-icon"></i>
                    <h2>App Locked</h2>
                    <p>Enter your 4-digit PIN to access</p>
                    <form onSubmit={handleUnlock} className="pin-input-container">
                        <input 
                            type="password" 
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            className={`pin-input ${pinError ? 'error' : ''}`}
                            placeholder="••••"
                            maxLength="4"
                            autoFocus
                        />
                        <div className="pin-error-text">
                            {pinError ? "Incorrect PIN" : ""}
                        </div>
                        <button type="submit" className="unlock-btn">Unlock</button>
                    </form>
                </div>
            </div>
        );
    }

    // Dashboard calculations
    const total = tasks.length;
    const completedCount = tasks.filter(t => t.completed).length;
    const pendingCount = total - completedCount;
    const percent = total === 0 ? 0 : Math.round((completedCount / total) * 100);
    const radius = 24;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percent / 100) * circumference;

    // Filtered tasks
    let filteredTasks = tasks;
    if (currentCategory) {
        filteredTasks = filteredTasks.filter(t => t.category === currentCategory);
    }
    if (searchQuery) {
        filteredTasks = filteredTasks.filter(t => t.description.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    if (filter === 'active') {
        filteredTasks = filteredTasks.filter(t => !t.completed);
    } else if (filter === 'completed') {
        filteredTasks = filteredTasks.filter(t => t.completed);
    }
    filteredTasks.sort((a, b) => b.createdAt - a.createdAt);

    return (
        <>
            <div id="toast-container">
                {toasts.map(toast => (
                    <div key={toast.id} className={`toast ${toast.type} show`}>
                        <i className={`${toast.type === 'success' ? 'ri-checkbox-circle-fill' : 'ri-delete-bin-fill'} toast-icon`}></i>
                        <span>{toast.message}</span>
                    </div>
                ))}
            </div>

            <header className="app-header">
                <div className="header-left">
                    <h1>{new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 18 ? 'Good Afternoon' : 'Good Evening'}</h1>
                    <p>{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div className="header-right">
                    <button id="theme-toggle" onClick={toggleTheme} aria-label="Toggle Theme">
                        <i className={theme === 'dark' ? 'ri-sun-line' : 'ri-moon-line'}></i>
                    </button>
                </div>
            </header>

            <main className="container">
                <section className="dashboard">
                    <div className="dashboard-card glass">
                        <div className="dash-icon" style={{ background: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)' }}>
                            <i className="ri-list-check"></i>
                        </div>
                        <div className="dash-info">
                            <p>Total Tasks</p>
                            <h2>{total}</h2>
                        </div>
                    </div>
                    <div className="dashboard-card glass">
                        <div className="dash-icon" style={{ background: 'rgba(var(--success-rgb), 0.1)', color: 'var(--success)' }}>
                            <i className="ri-checkbox-circle-line"></i>
                        </div>
                        <div className="dash-info">
                            <p>Completed</p>
                            <h2>{completedCount}</h2>
                        </div>
                    </div>
                    <div className="dashboard-card glass">
                        <div className="dash-icon" style={{ background: 'rgba(var(--warning-rgb), 0.1)', color: 'var(--warning)' }}>
                            <i className="ri-time-line"></i>
                        </div>
                        <div className="dash-info">
                            <p>Pending</p>
                            <h2>{pendingCount}</h2>
                        </div>
                    </div>
                    <div className="dashboard-card glass">
                        <div className="dash-progress">
                            <svg className="progress-ring" width="60" height="60">
                                <circle className="progress-ring__circle-bg" stroke="rgba(var(--text-rgb), 0.1)" strokeWidth="4" fill="transparent" r={radius} cx="30" cy="30" />
                                <circle className="progress-ring__circle" stroke="var(--primary)" strokeWidth="4" fill="transparent" r={radius} cx="30" cy="30"
                                    style={{ strokeDasharray: `${circumference} ${circumference}`, strokeDashoffset }}
                                />
                            </svg>
                            <div className="progress-text">
                                <span>{percent}</span>%
                            </div>
                        </div>
                        <div className="dash-info">
                            <p>Progress</p>
                        </div>
                    </div>
                </section>

                <section className="controls glass">
                    <div className="search-box">
                        <i className="ri-search-line"></i>
                        <input type="text" placeholder="Search tasks..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    </div>
                    <div className="filter-box">
                        <select value={filter} onChange={e => setFilter(e.target.value)}>
                            <option value="all">All Tasks</option>
                            <option value="active">Active</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>
                </section>

                <div id="main-view">
                    {!currentCategory ? (
                        <section className="view active">
                            <h2 className="section-title">Categories</h2>
                            <div className="categories-grid">
                                {CATEGORIES.map(cat => (
                                    <div key={cat.name} className={`category-card ${cat.bgClass}`} onClick={() => setCurrentCategory(cat.name)} role="button" tabIndex="0">
                                        <div className="category-icon">
                                            <i className={cat.icon}></i>
                                        </div>
                                        <div>
                                            <h3 className="category-name">{cat.name}</h3>
                                            <span className="category-count">{tasks.filter(t => t.category === cat.name).length} tasks</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    ) : (
                        <section className="view active">
                            <div className="tasks-header">
                                <button className="btn-back" onClick={() => setCurrentCategory(null)}>
                                    <i className="ri-arrow-left-line"></i> Back
                                </button>
                                <h2 className="section-title">{currentCategory}</h2>
                            </div>

                            <div className="tasks-list">
                                {filteredTasks.length === 0 ? (
                                    <div className="empty-state">
                                        <div className="empty-illustration">
                                            <i className="ri-leaf-line"></i>
                                        </div>
                                        <h3>No tasks yet</h3>
                                        <p>Click the + button to add your first task.</p>
                                    </div>
                                ) : (
                                    filteredTasks.map(task => (
                                        <div key={task.id} className={`task-card ${task.completed ? 'completed' : ''}`}>
                                            <div className={`task-checkbox ${task.completed ? 'checked' : ''}`} onClick={() => toggleTaskCompletion(task.id)} role="button" tabIndex="0"></div>
                                            <div className="task-content">
                                                <h4 className="task-desc">{task.description}</h4>
                                                <div className="task-meta">
                                                    {!currentCategory && <span><i className="ri-price-tag-3-line"></i> {task.category}</span>}
                                                    <span><i className="ri-time-line"></i> Added: {new Date(task.createdAt).toLocaleDateString()}</span>
                                                    {task.endDate && <span><i className="ri-calendar-event-line"></i> Due: {new Date(task.endDate).toLocaleDateString()}</span>}
                                                    {task.completed && <span className="task-badge"><i className="ri-check-line"></i> Completed</span>}
                                                </div>
                                            </div>
                                            <div className="task-actions">
                                                <button className="btn-icon btn-delete" onClick={() => deleteTask(task.id)}>
                                                    <i className="ri-delete-bin-line"></i>
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>
                    )}
                </div>
            </main>

            <button className="fab" onClick={openModal} aria-label="Add Task">
                <i className="ri-add-line"></i>
            </button>

            <div className={`modal-overlay ${isModalOpen ? 'active' : ''}`} onClick={(e) => e.target.classList.contains('modal-overlay') && closeModal()}>
                <div className="modal glass">
                    <div className="modal-header">
                        <h2>New Task</h2>
                        <button className="btn-close" onClick={closeModal}><i className="ri-close-line"></i></button>
                    </div>
                    <form onSubmit={handleCreateTask}>
                        <div className="form-group">
                            <label>Category</label>
                            <select value={formCategory} onChange={e => setFormCategory(e.target.value)} required>
                                <option value="" disabled>Select a category</option>
                                {CATEGORIES.map(cat => <option key={cat.name} value={cat.name}>{cat.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Description</label>
                            <input type="text" value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="What needs to be done?" required />
                        </div>
                        <div className="form-group">
                            <label>End Date (Optional)</label>
                            <input type="date" value={formEndDate} onChange={e => setFormEndDate(e.target.value)} />
                        </div>
                        <div className="modal-actions">
                            <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                            <button type="submit" className="btn btn-primary">Create Task</button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
