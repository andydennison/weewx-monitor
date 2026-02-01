/**
 * Home Temperature Monitor - Main Application
 * PWA for monitoring WeeWX temperature sensors
 */

// Application State
const App = {
    state: {
        sensors: [],
        thresholds: [],
        currentView: 'dashboard',
        lastUpdate: null,
        refreshInterval: null,
        notificationsEnabled: false,
        deferredInstallPrompt: null
    },

    // DOM Elements
    elements: {},

    // Initialize the application
    async init() {
        console.log('[App] Initializing...');

        // Cache DOM elements
        this.cacheElements();

        // Register service worker
        await this.registerServiceWorker();

        // Set up event listeners
        this.setupEventListeners();

        // Load initial data
        await this.loadSensorData();

        // Start auto-refresh
        this.startAutoRefresh();

        // Check notification permission
        this.checkNotificationPermission();

        // Handle install prompt
        this.handleInstallPrompt();

        // Hide loading overlay
        this.hideLoading();

        console.log('[App] Initialization complete');
    },

    // Cache frequently accessed DOM elements
    cacheElements() {
        this.elements = {
            homeName: document.getElementById('home-name'),
            lastUpdate: document.getElementById('last-update'),
            sensorCards: document.getElementById('sensor-cards'),
            alertBanner: document.getElementById('alert-banner'),
            alertMessage: document.getElementById('alert-message'),
            upstairsAvg: document.getElementById('upstairs-avg'),
            downstairsAvg: document.getElementById('downstairs-avg'),
            differentialValue: document.getElementById('differential-value'),
            refreshBtn: document.getElementById('refresh-btn'),
            notificationsBtn: document.getElementById('notifications-btn'),
            viewHistoryBtn: document.getElementById('view-history-btn'),
            navBtns: document.querySelectorAll('.nav-btn'),
            views: document.querySelectorAll('.view'),
            rangeBtns: document.querySelectorAll('.range-btn'),
            thresholdSettings: document.getElementById('threshold-settings'),
            statsGrid: document.getElementById('stats-grid'),
            notificationsToggle: document.getElementById('notifications-toggle'),
            checkInterval: document.getElementById('check-interval'),
            cooldownInterval: document.getElementById('cooldown-interval'),
            installBtn: document.getElementById('install-btn'),
            loadingOverlay: document.getElementById('loading-overlay'),
            toast: document.getElementById('toast')
        };
    },

    // Register service worker
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('sw.js');
                console.log('[App] Service worker registered:', registration.scope);

                // Check for updates
                registration.addEventListener('updatefound', () => {
                    console.log('[App] Service worker update found');
                });
            } catch (error) {
                console.error('[App] Service worker registration failed:', error);
            }
        }
    },

    // Set up event listeners
    setupEventListeners() {
        // Refresh button
        this.elements.refreshBtn.addEventListener('click', () => {
            this.loadSensorData();
        });

        // Notifications button
        this.elements.notificationsBtn.addEventListener('click', () => {
            this.requestNotificationPermission();
        });

        // View history button
        this.elements.viewHistoryBtn.addEventListener('click', () => {
            this.switchView('history');
        });

        // Navigation buttons
        this.elements.navBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.dataset.view;
                this.switchView(view);
            });
        });

        // Time range buttons
        this.elements.rangeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.elements.rangeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                Charts.loadHistoryChart(btn.dataset.range);
            });
        });

        // Notifications toggle
        this.elements.notificationsToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                this.requestNotificationPermission();
            } else {
                this.unsubscribeFromNotifications();
            }
        });

        // Settings changes
        this.elements.checkInterval.addEventListener('change', () => this.saveNotificationSettings());
        this.elements.cooldownInterval.addEventListener('change', () => this.saveNotificationSettings());

        // Install button
        this.elements.installBtn.addEventListener('click', () => {
            this.installApp();
        });

        // Handle visibility change for refresh
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.loadSensorData();
            }
        });

        // Handle hash changes
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.slice(1);
            if (hash && ['dashboard', 'history', 'settings'].includes(hash)) {
                this.switchView(hash);
            }
        });
    },

    // Switch between views
    switchView(viewName) {
        this.state.currentView = viewName;

        // Update navigation
        this.elements.navBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewName);
        });

        // Update views
        this.elements.views.forEach(view => {
            view.classList.toggle('active', view.id === `${viewName}-view`);
        });

        // Load view-specific data
        if (viewName === 'history') {
            const activeRange = document.querySelector('.range-btn.active');
            Charts.loadHistoryChart(activeRange?.dataset.range || '24h');
        } else if (viewName === 'settings') {
            this.loadThresholdSettings();
        }

        // Update URL hash
        window.location.hash = viewName;
    },

    // Load sensor data from API
    async loadSensorData() {
        try {
            this.elements.refreshBtn.classList.add('spinning');

            const response = await fetch('../api/sensors.php');
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to load sensor data');
            }

            this.state.sensors = data.sensors;
            this.state.lastUpdate = new Date();

            // Update UI
            this.elements.homeName.textContent = data.home_name || 'Home Temperature';
            this.updateSensorCards(data.sensors);
            this.updateDifferential(data.differential);
            this.updateAlerts(data.alerts);
            this.updateLastUpdate();

            // Update quick chart
            Charts.loadQuickChart();

        } catch (error) {
            console.error('[App] Error loading sensor data:', error);
            this.showToast('Failed to load data', 'error');
        } finally {
            this.elements.refreshBtn.classList.remove('spinning');
        }
    },

    // Update sensor cards
    updateSensorCards(sensors) {
        const html = sensors.map(sensor => this.createSensorCard(sensor)).join('');
        this.elements.sensorCards.innerHTML = html;
    },

    // Create a sensor card HTML
    createSensorCard(sensor) {
        const alertClass = sensor.alert === 'cold' ? 'alert-cold' : sensor.alert === 'hot' ? 'alert-hot' : '';
        const icon = this.getSensorIcon(sensor.icon);

        return `
            <div class="sensor-card ${alertClass}" data-sensor-id="${sensor.id}">
                <div class="sensor-header">
                    <div>
                        <div class="sensor-name">${sensor.name}</div>
                        <div class="sensor-location">${sensor.location}</div>
                    </div>
                    <div class="sensor-icon">
                        ${icon}
                    </div>
                </div>
                <div class="sensor-temp">
                    ${sensor.temperature}<span class="unit">°F</span>
                </div>
                ${sensor.humidity !== null ? `
                    <div class="sensor-humidity">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"/>
                        </svg>
                        ${sensor.humidity}%
                    </div>
                ` : ''}
                <div class="sensor-time">${this.formatTimestamp(sensor.timestamp)}</div>
            </div>
        `;
    },

    // Get sensor icon SVG
    getSensorIcon(iconType) {
        const icons = {
            kitchen: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"/>
                <path d="M7 2v20"/>
                <path d="M21 15V2v0a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>
            </svg>`,
            bed: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M2 4v16"/>
                <path d="M2 8h18a2 2 0 012 2v10"/>
                <path d="M2 17h20"/>
                <path d="M6 8v9"/>
            </svg>`,
            thermometer: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z"/>
            </svg>`
        };
        return icons[iconType] || icons.thermometer;
    },

    // Update floor differential display
    updateDifferential(differential) {
        if (!differential) return;

        this.elements.upstairsAvg.textContent = `${differential.upstairs_avg}°F`;
        this.elements.downstairsAvg.textContent = `${differential.downstairs_avg}°F`;

        const diff = differential.difference;
        const diffElement = this.elements.differentialValue;
        diffElement.textContent = `${diff > 0 ? '+' : ''}${diff}°F`;
        diffElement.classList.remove('positive', 'negative');
        diffElement.classList.add(diff > 0 ? 'positive' : diff < 0 ? 'negative' : '');
    },

    // Update alerts display
    updateAlerts(alerts) {
        if (alerts && alerts.length > 0) {
            this.elements.alertMessage.textContent = alerts.map(a => a.message).join(' | ');
            this.elements.alertBanner.classList.remove('hidden');
        } else {
            this.elements.alertBanner.classList.add('hidden');
        }
    },

    // Update last update time
    updateLastUpdate() {
        if (this.state.lastUpdate) {
            const formatted = this.formatTime(this.state.lastUpdate.toISOString());
            this.elements.lastUpdate.textContent = `Last updated: ${formatted}`;
        }
    },

    // Format time for display (from date string)
    formatTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    },

    // Format time from Unix timestamp (seconds)
    formatTimestamp(timestamp) {
        // Convert Unix timestamp (seconds) to JavaScript Date (milliseconds)
        const date = new Date(timestamp * 1000);
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    },

    // Start auto-refresh interval
    startAutoRefresh() {
        // Refresh every 60 seconds
        this.state.refreshInterval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                this.loadSensorData();
            }
        }, 60000);
    },

    // Load threshold settings
    async loadThresholdSettings() {
        try {
            const response = await fetch('../api/thresholds.php');
            const data = await response.json();

            if (!data.success) throw new Error(data.error);

            this.state.thresholds = data.sensors;
            this.renderThresholdSettings(data.sensors);

            // Update notification settings
            const ns = data.notification_settings;
            this.elements.checkInterval.value = ns.check_interval_minutes;
            this.elements.cooldownInterval.value = ns.cooldown_minutes;

        } catch (error) {
            console.error('[App] Error loading thresholds:', error);
        }
    },

    // Render threshold settings
    renderThresholdSettings(sensors) {
        const html = sensors.map(sensor => `
            <div class="threshold-card" data-sensor-id="${sensor.id}">
                <h3>${sensor.name}</h3>
                <div class="location">${sensor.location}</div>
                <div class="threshold-row">
                    <div class="threshold-input">
                        <label>Min Temp (°F)</label>
                        <input type="number" class="temp-min" value="${sensor.thresholds.temp_min}"
                               min="32" max="100" step="1">
                    </div>
                    <div class="threshold-input">
                        <label>Max Temp (°F)</label>
                        <input type="number" class="temp-max" value="${sensor.thresholds.temp_max}"
                               min="32" max="100" step="1">
                    </div>
                </div>
                <button class="text-btn save-threshold-btn">Save Thresholds</button>
            </div>
        `).join('');

        this.elements.thresholdSettings.innerHTML = html;

        // Add event listeners for save buttons
        document.querySelectorAll('.save-threshold-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = e.target.closest('.threshold-card');
                this.saveThreshold(card);
            });
        });
    },

    // Save threshold for a sensor
    async saveThreshold(card) {
        const sensorId = card.dataset.sensorId;
        const tempMin = parseFloat(card.querySelector('.temp-min').value);
        const tempMax = parseFloat(card.querySelector('.temp-max').value);

        if (tempMin >= tempMax) {
            this.showToast('Min temp must be less than max temp', 'error');
            return;
        }

        try {
            const response = await fetch('../api/thresholds.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sensor_id: sensorId,
                    thresholds: {
                        temp_min: tempMin,
                        temp_max: tempMax
                    }
                })
            });

            const data = await response.json();

            if (data.success) {
                this.showToast('Thresholds saved', 'success');
                // Refresh sensor data to update alerts
                this.loadSensorData();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('[App] Error saving threshold:', error);
            this.showToast('Failed to save thresholds', 'error');
        }
    },

    // Save notification settings
    async saveNotificationSettings() {
        try {
            const response = await fetch('../api/thresholds.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    notification_settings: {
                        check_interval_minutes: parseInt(this.elements.checkInterval.value),
                        cooldown_minutes: parseInt(this.elements.cooldownInterval.value)
                    }
                })
            });

            const data = await response.json();

            if (data.success) {
                this.showToast('Settings saved', 'success');
            }
        } catch (error) {
            console.error('[App] Error saving notification settings:', error);
        }
    },

    // Check notification permission
    checkNotificationPermission() {
        if ('Notification' in window) {
            this.state.notificationsEnabled = Notification.permission === 'granted';
            this.elements.notificationsToggle.checked = this.state.notificationsEnabled;
            this.elements.notificationsBtn.classList.toggle('active', this.state.notificationsEnabled);
        }
    },

    // Request notification permission
    async requestNotificationPermission() {
        if (!('Notification' in window)) {
            this.showToast('Notifications not supported', 'error');
            return;
        }

        try {
            const permission = await Notification.requestPermission();

            if (permission === 'granted') {
                this.state.notificationsEnabled = true;
                this.elements.notificationsToggle.checked = true;
                this.elements.notificationsBtn.classList.add('active');
                this.showToast('Notifications enabled', 'success');

                // Subscribe to push notifications
                await this.subscribeToPushNotifications();

                // Start background temperature checking
                this.startBackgroundCheck();
            } else {
                this.elements.notificationsToggle.checked = false;
                this.showToast('Notification permission denied', 'error');
            }
        } catch (error) {
            console.error('[App] Error requesting notification permission:', error);
            this.elements.notificationsToggle.checked = false;
        }
    },

    // Subscribe to push notifications
    async subscribeToPushNotifications() {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.log('[App] Push notifications not supported');
            return;
        }

        try {
            const registration = await navigator.serviceWorker.ready;

            // For simplicity, we'll use the simpler local notification approach
            // Full push notifications would require VAPID keys and a push service

            // Save subscription to server
            await fetch('../api/subscribe.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subscription: {
                        endpoint: 'local-' + Date.now(),
                        keys: {}
                    }
                })
            });

            console.log('[App] Subscribed to notifications');
        } catch (error) {
            console.error('[App] Error subscribing to push:', error);
        }
    },

    // Unsubscribe from notifications
    async unsubscribeFromNotifications() {
        this.state.notificationsEnabled = false;
        this.elements.notificationsBtn.classList.remove('active');
        this.showToast('Notifications disabled', 'success');
    },

    // Start background temperature checking
    startBackgroundCheck() {
        // Check temperatures every minute and show notification if needed
        setInterval(async () => {
            if (!this.state.notificationsEnabled) return;

            try {
                const response = await fetch('../api/sensors.php');
                const data = await response.json();

                if (data.alerts && data.alerts.length > 0) {
                    data.alerts.forEach(alert => {
                        this.showLocalNotification(alert);
                    });
                }
            } catch (error) {
                console.error('[App] Error in background check:', error);
            }
        }, 60000);
    },

    // Show local notification
    showLocalNotification(alert) {
        if (!this.state.notificationsEnabled || Notification.permission !== 'granted') return;

        // Check cooldown (use localStorage to track last notification time per sensor)
        const cooldownKey = `notification-cooldown-${alert.sensor_id}`;
        const lastNotified = localStorage.getItem(cooldownKey);
        const cooldownMs = parseInt(this.elements.cooldownInterval.value) * 60 * 1000;

        if (lastNotified && Date.now() - parseInt(lastNotified) < cooldownMs) {
            return; // Still in cooldown period
        }

        new Notification('Temperature Alert', {
            body: alert.message,
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-72.png',
            tag: `alert-${alert.sensor_id}`,
            requireInteraction: true,
            vibrate: [200, 100, 200]
        });

        localStorage.setItem(cooldownKey, Date.now().toString());
    },

    // Handle PWA install prompt
    handleInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.state.deferredInstallPrompt = e;
            this.elements.installBtn.classList.remove('hidden');
        });

        window.addEventListener('appinstalled', () => {
            this.elements.installBtn.classList.add('hidden');
            this.showToast('App installed successfully!', 'success');
        });
    },

    // Install the app
    async installApp() {
        if (!this.state.deferredInstallPrompt) return;

        this.state.deferredInstallPrompt.prompt();
        const { outcome } = await this.state.deferredInstallPrompt.userChoice;

        if (outcome === 'accepted') {
            console.log('[App] User accepted install prompt');
        }

        this.state.deferredInstallPrompt = null;
    },

    // Show toast notification
    showToast(message, type = 'info') {
        const toast = this.elements.toast;
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.remove('hidden');

        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    },

    // Hide loading overlay
    hideLoading() {
        this.elements.loadingOverlay.classList.add('hidden');
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Export for use in other modules
window.App = App;
