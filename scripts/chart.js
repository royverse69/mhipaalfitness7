// scripts/chart.js

// Function to destroy existing chart instance
export function destroyChart(chartInstance) {
    if (chartInstance) {
        chartInstance.destroy();
    }
}

// Global default options for all Chart.js charts
// Use dynamic colors based on dark mode class on body
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.font.size = 12;
// This will be updated dynamically based on dark mode state in app.js on render
Chart.defaults.color = '#333'; // Default for light mode

// Function to get current chart colors based on theme
function getThemeColors() {
    const isDarkMode = document.body.classList.contains('dark-mode');
    return {
        // Colors should match those defined directly in main.css for .dark-mode class
        primary: isDarkMode ? '#63b3ed' : '#3B82F6', // blue-600 vs blue-500
        danger: isDarkMode ? '#EF4444' : '#DC2626', // red-500 vs red-600
        neutralBg: isDarkMode ? '#2d3748' : '#e2e8f0', // Darker card bg vs light gray
        textColor: isDarkMode ? '#e2e8f0' : '#333',
        gridColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        // Specific macro colors for charts
        orange: isDarkMode ? '#EA580C' : '#F97316',
        green: isDarkMode ? '#16A34A' : '#22C55E',
        purple: isDarkMode ? '#9333EA' : '#A855F7',
    };
}

// Update Calories Chart (Dashboard)
export function updateCaloriesChart(canvasId, consumed, burned, goal, existingChart) {
    destroyChart(existingChart);

    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return null;

    const themeColors = getThemeColors();
    // Net consumed calories (actual consumed minus burned)
    const netConsumed = Math.max(0, consumed - burned);
    const remaining = Math.max(0, goal - netConsumed);

    // Color for consumed portion: red if over goal, else blue
    const consumedColor = netConsumed > goal ? themeColors.danger : themeColors.primary;

    return new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Consumed', 'Remaining'],
            datasets: [{
                data: [netConsumed, remaining], // Only show consumed and remaining to reach goal
                backgroundColor: [consumedColor, themeColors.neutralBg],
                hoverBackgroundColor: [consumedColor, themeColors.neutralBg], // Keep same for consistency
                borderColor: getComputedStyle(document.body).backgroundColor, // Match body background
                borderWidth: 5,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '80%',
            plugins: {
                legend: {
                    display: false,
                },
                tooltip: {
                    enabled: true,
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.value !== null) {
                                label += context.parsed.value + ' kcal';
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

// Update Macros Charts (Dashboard)
export function updateMacrosCharts(proteinCanvasId, proteinPercentage, carbsCanvasId, carbsPercentage, fatsCanvasId, fatsPercentage, existingProteinChart, existingCarbsChart, existingFatsChart) {
    destroyChart(existingProteinChart);
    destroyChart(existingCarbsChart);
    destroyChart(existingFatsChart);

    const themeColors = getThemeColors();

    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                enabled: true,
                callbacks: {
                    label: function(context) {
                        let label = context.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.value !== null) {
                            label += context.parsed.value.toFixed(0) + '%';
                        }
                        return label;
                    }
                }
            }
        }
    };

    const createMacroChart = (canvasId, percentage, color) => {
        const ctx = document.getElementById(canvasId)?.getContext('2d');
        if (!ctx) return null;

        // Cap percentage at 100% for the filled portion, remaining can be negative if over goal
        const filledPercentage = Math.min(100, percentage);
        const remainingPercentage = Math.max(0, 100 - percentage); // Ensure remaining is not negative for display purposes

        // If over 100%, show red for the consumed part
        const actualColor = percentage > 100 ? themeColors.danger : color;


        return new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Consumed', 'Remaining'],
                datasets: [{
                    data: [filledPercentage, remainingPercentage],
                    backgroundColor: [actualColor, themeColors.neutralBg], // specific color, neutral background
                    hoverBackgroundColor: [actualColor, themeColors.neutralBg],
                    borderColor: getComputedStyle(document.body).backgroundColor,
                    borderWidth: 3,
                }]
            },
            options: commonOptions
        });
    };

    const newProteinChart = createMacroChart(proteinCanvasId, proteinPercentage, themeColors.orange);
    const newCarbsChart = createMacroChart(carbsCanvasId, carbsPercentage, themeColors.green);
    const newFatsChart = createMacroChart(fatsCanvasId, fatsPercentage, themeColors.purple);

    return [newProteinChart, newCarbsChart, newFatsChart];
}

// Update Steps Chart (Dashboard)
export function updateStepsChart(canvasId, walked, goal, existingChart) {
    destroyChart(existingChart);

    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return null;

    const themeColors = getThemeColors();
    const remaining = Math.max(0, goal - walked); // Ensure remaining is not negative

    return new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Walked', 'Remaining'],
            datasets: [{
                data: [walked, remaining],
                backgroundColor: [themeColors.green, themeColors.neutralBg], // Green, neutral background
                hoverBackgroundColor: [themeColors.green, themeColors.neutralBg],
                borderColor: getComputedStyle(document.body).backgroundColor,
                borderWidth: 5,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '80%',
            plugins: {
                legend: {
                    display: false,
                },
                tooltip: {
                    enabled: true,
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.value !== null) {
                                label += context.parsed.value.toLocaleString() + ' steps';
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

// Create or Update Weight Chart (Dashboard & Fitness Page)
export function createOrUpdateWeightChart(canvasId, weightHistory, goalWeight, existingChart, unit) {
    destroyChart(existingChart);

    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return null;

    const themeColors = getThemeColors();

    const labels = weightHistory.map(entry => {
        const date = new Date(entry.date);
        return `${date.getMonth() + 1}/${date.getDate()}`; // M/D format
    });
    const data = weightHistory.map(entry => entry.weight);

    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `Weight (${unit})`,
                data: data,
                borderColor: themeColors.purple, // Using purple for consistency
                backgroundColor: 'rgba(168, 85, 247, 0.2)', // Light purple fill
                tension: 0.3,
                fill: false, // Changed to false to match reference if it's a simple line
                pointRadius: 5,
                pointHoverRadius: 7,
                pointBackgroundColor: themeColors.purple,
                pointBorderColor: themeColors.cardBg, // Matches background of card
                pointBorderWidth: 2,
            }, {
                label: `Goal (${unit})`,
                data: Array(labels.length).fill(goalWeight),
                borderColor: themeColors.green, // Green for goal line
                borderDash: [5, 5],
                fill: false,
                pointRadius: 0,
                hoverBorderColor: 'transparent',
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: themeColors.textColor, // Ensure legend labels are visible
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            label += context.parsed.y + ` ${unit}`;
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: themeColors.textColor, // X-axis labels
                    }
                },
                y: {
                    beginAtZero: false,
                    grid: {
                        color: themeColors.gridColor // Grid lines
                    },
                    ticks: {
                        color: themeColors.textColor, // Y-axis labels
                    }
                }
            }
        }
    });
}

// Update Meal Calories Chart (Nutrition Analysis)
export function updateMealCaloriesChart(canvasId, data, labels, colors, existingChart) {
    destroyChart(existingChart);

    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return null;

    const themeColors = getThemeColors();

    return new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderColor: themeColors.cardBg, // Match card background for separation
                borderWidth: 5,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '80%',
            plugins: {
                legend: {
                    display: false, // Hidden as breakdown is displayed separately
                },
                tooltip: {
                    enabled: true,
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.value !== null) {
                                label += context.parsed.value + ' kcal';
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

// Update Nutrition Macros Chart (Nutrition Analysis)
export function updateNutritionMacrosChart(canvasId, proteinConsumed, proteinGoal, carbsConsumed, carbsGoal, fatsConsumed, fatsGoal, existingChart) {
    destroyChart(existingChart);

    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return null;

    const themeColors = getThemeColors();

    const data = [
        proteinConsumed,
        carbsConsumed,
        fatsConsumed,
        Math.max(0, proteinGoal - proteinConsumed), // Remaining protein
        Math.max(0, carbsGoal - carbsConsumed), // Remaining carbs
        Math.max(0, fatsGoal - fatsConsumed), // Remaining fats
    ];

    return new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Protein Consumed', 'Carbs Consumed', 'Fats Consumed', 'Protein Remaining', 'Carbs Remaining', 'Fats Remaining'],
            datasets: [{
                data: data,
                backgroundColor: [
                    themeColors.orange, // Protein Consumed (Orange)
                    themeColors.green, // Carbs Consumed (Green)
                    themeColors.purple, // Fats Consumed (Purple)
                    'rgba(249, 115, 22, 0.3)', // Protein Remaining (Light Orange) - use fixed rgba for consistency
                    'rgba(34, 197, 94, 0.3)', // Carbs Remaining (Light Green)
                    'rgba(168, 85, 247, 0.3)' // Fats Remaining (Light Purple)
                ],
                borderColor: themeColors.cardBg, // Match card background
                borderWidth: 5,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    display: false,
                },
                tooltip: {
                    enabled: true,
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.value !== null) {
                                label += context.parsed.value.toFixed(1) + 'g';
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}
