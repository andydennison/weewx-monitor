/**
 * Home Temperature Monitor - Chart Module
 * Handles all Chart.js chart creation and updates
 */

const Charts = {
    // Chart instances
    quickChart: null,
    historyChart: null,

    // Color palette for sensors
    colors: {
        kitchen: {
            line: '#4ade80',
            fill: 'rgba(74, 222, 128, 0.1)'
        },
        bedroom2: {
            line: '#60a5fa',
            fill: 'rgba(96, 165, 250, 0.1)'
        },
        edwins_room: {
            line: '#f472b6',
            fill: 'rgba(244, 114, 182, 0.1)'
        }
    },

    // Default color for unknown sensors
    defaultColor: {
        line: '#a78bfa',
        fill: 'rgba(167, 139, 250, 0.1)'
    },

    // Common chart options
    getCommonOptions(showLegend = true) {
        return {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: showLegend,
                    position: 'top',
                    labels: {
                        color: '#a0a0b8',
                        usePointStyle: true,
                        padding: 15,
                        font: {
                            size: 11
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(37, 37, 66, 0.95)',
                    titleColor: '#ffffff',
                    bodyColor: '#a0a0b8',
                    borderColor: '#4a90d9',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: true,
                    callbacks: {
                        label: function (context) {
                            return `${context.dataset.label}: ${context.parsed.y}°F`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        displayFormats: {
                            hour: 'h:mm a',
                            day: 'MMM d'
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#6b6b80',
                        maxTicksLimit: 6,
                        font: {
                            size: 10
                        }
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#6b6b80',
                        callback: function (value) {
                            return value + '°F';
                        },
                        font: {
                            size: 10
                        }
                    }
                }
            }
        };
    },

    // Get color for a sensor
    getSensorColor(sensorId) {
        return this.colors[sensorId] || this.defaultColor;
    },

    // Load quick chart (6-hour overview on dashboard)
    async loadQuickChart() {
        try {
            const response = await fetch('/api/history.php?range=6h');
            const data = await response.json();

            if (!data.success) throw new Error(data.error);

            const ctx = document.getElementById('quick-chart');
            if (!ctx) return;

            // Prepare datasets
            const datasets = data.sensors.map(sensor => {
                const color = this.getSensorColor(sensor.id);
                return {
                    label: sensor.name,
                    data: sensor.data.map(point => ({
                        x: new Date(point.timestamp * 1000),
                        y: point.temperature
                    })),
                    borderColor: color.line,
                    backgroundColor: color.fill,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    borderWidth: 2
                };
            });

            // Destroy existing chart if it exists
            if (this.quickChart) {
                this.quickChart.destroy();
            }

            // Create new chart
            this.quickChart = new Chart(ctx, {
                type: 'line',
                data: { datasets },
                options: {
                    ...this.getCommonOptions(true),
                    plugins: {
                        ...this.getCommonOptions(true).plugins,
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                color: '#a0a0b8',
                                usePointStyle: true,
                                padding: 10,
                                boxWidth: 8,
                                font: {
                                    size: 10
                                }
                            }
                        }
                    }
                }
            });

        } catch (error) {
            console.error('[Charts] Error loading quick chart:', error);
        }
    },

    // Load history chart with specified range
    async loadHistoryChart(range = '24h') {
        try {
            const response = await fetch(`/api/history.php?range=${range}`);
            const data = await response.json();

            if (!data.success) throw new Error(data.error);

            const ctx = document.getElementById('history-chart');
            if (!ctx) return;

            // Prepare datasets
            const datasets = data.sensors.map(sensor => {
                const color = this.getSensorColor(sensor.id);
                return {
                    label: sensor.name,
                    data: sensor.data.map(point => ({
                        x: new Date(point.timestamp * 1000),
                        y: point.temperature
                    })),
                    borderColor: color.line,
                    backgroundColor: color.fill,
                    fill: true,
                    tension: 0.3,
                    pointRadius: range === '30d' ? 0 : 1,
                    pointHoverRadius: 5,
                    borderWidth: 2
                };
            });

            // Add threshold lines if we have sensor data
            if (data.sensors.length > 0) {
                const thresholds = data.sensors[0].thresholds;
                const timeRange = data.sensors[0].data;

                if (timeRange.length > 0) {
                    const startTime = new Date(timeRange[0].timestamp * 1000);
                    const endTime = new Date(timeRange[timeRange.length - 1].timestamp * 1000);

                    // Min threshold line
                    datasets.push({
                        label: 'Min Threshold',
                        data: [
                            { x: startTime, y: thresholds.temp_min },
                            { x: endTime, y: thresholds.temp_min }
                        ],
                        borderColor: 'rgba(56, 189, 248, 0.5)',
                        borderWidth: 1,
                        borderDash: [5, 5],
                        pointRadius: 0,
                        fill: false
                    });

                    // Max threshold line
                    datasets.push({
                        label: 'Max Threshold',
                        data: [
                            { x: startTime, y: thresholds.temp_max },
                            { x: endTime, y: thresholds.temp_max }
                        ],
                        borderColor: 'rgba(251, 146, 60, 0.5)',
                        borderWidth: 1,
                        borderDash: [5, 5],
                        pointRadius: 0,
                        fill: false
                    });
                }
            }

            // Destroy existing chart if it exists
            if (this.historyChart) {
                this.historyChart.destroy();
            }

            // Configure time unit based on range
            const timeUnit = range === '30d' ? 'day' : range === '7d' ? 'day' : 'hour';

            // Create new chart
            this.historyChart = new Chart(ctx, {
                type: 'line',
                data: { datasets },
                options: {
                    ...this.getCommonOptions(true),
                    scales: {
                        ...this.getCommonOptions(true).scales,
                        x: {
                            ...this.getCommonOptions(true).scales.x,
                            time: {
                                unit: timeUnit,
                                displayFormats: {
                                    hour: 'h:mm a',
                                    day: 'MMM d'
                                }
                            }
                        }
                    }
                }
            });

            // Update stats grid
            this.updateStatsGrid(data.sensors);

        } catch (error) {
            console.error('[Charts] Error loading history chart:', error);
        }
    },

    // Update statistics grid
    updateStatsGrid(sensors) {
        const statsGrid = document.getElementById('stats-grid');
        if (!statsGrid) return;

        const html = sensors.map(sensor => {
            if (!sensor.stats) return '';

            const color = this.getSensorColor(sensor.id);

            return `
                <div class="stat-card">
                    <h4 style="color: ${color.line}">${sensor.name}</h4>
                    <div class="stat-row">
                        <div>
                            <div class="stat-value">${sensor.stats.min}°</div>
                            <div class="stat-label">Min</div>
                        </div>
                        <div>
                            <div class="stat-value">${sensor.stats.max}°</div>
                            <div class="stat-label">Max</div>
                        </div>
                        <div>
                            <div class="stat-value">${sensor.stats.avg}°</div>
                            <div class="stat-label">Avg</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        statsGrid.innerHTML = html;
    }
};

// Export for use in other modules
window.Charts = Charts;
