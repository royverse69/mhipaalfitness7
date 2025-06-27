// scripts/app.js

import {
    updateCaloriesChart,
    updateMacrosCharts,
    updateStepsChart,
    updateWeightChart,
    updateMealCaloriesChart,
    updateNutritionMacrosChart,
    destroyChart,
    createOrUpdateWeightChart
} from './chart.js';
import {
    fetchNutritionData
} from './api.js';
import {
    calculateBMI,
    getBMICategory,
    calculateMacrosFromCalories
} from './nutrition.js';

// --- Global State Variables ---
let currentCaloriesChart = null;
let currentProteinChart = null;
let currentCarbsChart = null;
let currentFatsChart = null;
let currentStepsChart = null;
let currentWeightChart = null;
let currentMealCaloriesChart = null;
let currentNutritionMacrosChart = null;
let currentDailyWeightChart = null; // Chart for Exercise & Weight Tracking page

let appState = {
    darkMode: localStorage.getItem('darkMode') === 'true',
    // Dashboard Data
    calories: {
        consumed: 0, // Initialize to 0 for fresh start
        burned: 0,
        goal: 1800
    },
    macros: {
        protein: {
            consumed: 0,
            goal: 150 // Default goal, will be updated by settings
        },
        carbs: {
            consumed: 0,
            goal: 250 // Default goal
        },
        fats: {
            consumed: 0,
            goal: 60 // Default goal
        }
    },
    water: {
        consumed: 0, // Start at 0 glasses
        goal: 8 // Goal in glasses now, original was 64oz
    },
    steps: {
        walked: 0,
        goal: 10000
    },
    exercise: {
        time: 0,
        calories: 0, // Total calories burned from logged exercises
        entries: [] // Stores logged workouts
    },
    weight: {
        current: 70, // kg
        history: [], // {date: 'YYYY-MM-DD', weight: value}
        goal: 65, // kg
        height: 170 // cm (assuming for BMI calculation)
    },
    // Meal Logging Data
    meals: {
        Breakfast: [],
        Lunch: [],
        Dinner: [],
        Snacks: []
    },
    currentMealCategory: 'Breakfast', // Tracks which meal category is active for adding food
    // User Settings
    settings: {
        calorieLimit: 2000,
        macroRatioType: 'gram', // 'gram' or 'percent'
        macroGoals: { // Based on gram initially
            protein: 150,
            carbs: 250,
            fats: 60
        },
        stepTarget: 10000,
        waterTarget: 64, // oz (retained original unit for water target)
        unitWeight: 'kg', // 'kg' or 'lbs'
        unitEnergy: 'kcal', // 'kcal' or 'kj'
        reminders: {
            meals: true,
            water: false
        }
    }
};

const today = new Date().toLocaleDateString('en-CA');

// --- Data Management ---
function loadState() {
    const savedState = localStorage.getItem('fitTrackAppState');
    if (savedState) {
        try {
            appState = JSON.parse(savedState);
            // Ensure compatibility with old data structures if necessary, or set defaults
            appState.settings = { ...appState.settings,
                ...{
                    calorieLimit: 2000,
                    macroRatioType: 'gram',
                    macroGoals: { protein: 150, carbs: 250, fats: 60 },
                    stepTarget: 10000,
                    waterTarget: 64,
                    unitWeight: 'kg',
                    unitEnergy: 'kcal',
                    reminders: { meals: true, water: false }
                },
                ...appState.settings
            };

            // Ensure dailyLogs exists for today
            if (!appState.dailyLogs) {
                appState.dailyLogs = {};
            }
            if (!appState.dailyLogs[today]) {
                appState.dailyLogs[today] = { meals: [], exercise: 0, water: 0 };
            }
            // Ensure meals object is properly structured
            if (!appState.meals) {
                appState.meals = { Breakfast: [], Lunch: [], Dinner: [], Snacks: [] };
            }

            // Migration for water to glasses if necessary (from oz to glasses)
            if (appState.water.consumed > 8 && appState.water.goal === 8) { // If old 'oz' value is in 'consumed' but goal is 'glasses'
                appState.water.consumed = Math.round(appState.water.consumed / 8); // Convert oz to 8oz glasses
                appState.water.goal = 8; // Explicitly set goal to 8 glasses
            } else if (appState.water.goal === 64) { // If original oz goal is still there, keep it
                 appState.water.goal = 64; // Retain oz for water goal
            }


        } catch (e) {
            console.error("Error loading state from localStorage, resetting.", e);
            appState = getInitialAppState(); // Reset to default
        }
    } else {
        appState = getInitialAppState(); // No saved state, use initial
    }

    // Initialize darkMode from localStorage preference
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    if (darkModeToggle) {
        darkModeToggle.checked = appState.darkMode;
        document.body.classList.toggle('dark-mode', appState.darkMode);
    }
}

function getInitialAppState() {
    return {
        darkMode: false,
        calories: { consumed: 0, burned: 0, goal: 1800 },
        macros: { protein: { consumed: 0, goal: 150 }, carbs: { consumed: 0, goal: 250 }, fats: { consumed: 0, goal: 60 } },
        water: { consumed: 0, goal: 64 }, // Default to 64oz as per original prompt
        steps: { walked: 0, goal: 10000 },
        exercise: { time: 0, calories: 0, entries: [] },
        weight: { current: 70, history: [], goal: 65, height: 170 },
        meals: { Breakfast: [], Lunch: [], Dinner: [], Snacks: [] },
        currentMealCategory: 'Breakfast',
        settings: {
            calorieLimit: 2000,
            macroRatioType: 'gram',
            macroGoals: { protein: 150, carbs: 250, fats: 60 },
            stepTarget: 10000,
            waterTarget: 64, // oz
            unitWeight: 'kg',
            unitEnergy: 'kcal',
            reminders: { meals: true, water: false }
        }
    };
}


function saveState() {
    localStorage.setItem('fitTrackAppState', JSON.stringify(appState));
}

// --- UI Utility Functions ---

// Display generic message box (toast notification style)
function showToast(message, type = 'info', duration = 3000) {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        console.warn("Toast container not found.");
        return;
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type} flex items-center p-3 rounded-md shadow-lg transition-all transform translate-y-5 opacity-0`;

    let iconHtml = '';
    switch (type) {
        case 'success':
            iconHtml = '<i class="fas fa-check-circle text-green-500 mr-2"></i>';
            break;
        case 'error':
            iconHtml = '<i class="fas fa-times-circle text-red-500 mr-2"></i>';
            break;
        case 'info':
        default:
            iconHtml = '<i class="fas fa-info-circle text-blue-500 mr-2"></i>';
            break;
    }

    toast.innerHTML = `${iconHtml}<p class="text-sm font-medium">${message}</p>`;
    toastContainer.appendChild(toast);

    // Trigger transition
    setTimeout(() => {
        toast.classList.add('show', 'opacity-100', 'translate-y-0');
    }, 100);

    setTimeout(() => {
        toast.classList.remove('show', 'opacity-100', 'translate-y-0');
        toast.classList.add('opacity-0', 'translate-y-5');
        toast.addEventListener('transitionend', () => toast.remove());
    }, duration);
}


// Show a specific page and hide others
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.add('hidden');
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.remove('hidden');
    document.getElementById(pageId).classList.add('active');

    // Update active state for bottom navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        if (item.dataset.page === pageId) {
            item.classList.add('text-blue-600');
            item.classList.remove('text-gray-500');
        } else {
            item.classList.remove('text-blue-600');
            item.classList.add('text-gray-500');
        }
    });

    // Re-render charts and update UI when page is shown
    renderDashboard();
    renderMealLogging();
    renderNutritionAnalysis();
    renderExerciseWeightTracking();
    renderUserSettings();
}

// Show modal
function showModal(modalId) {
    document.getElementById('modal-backdrop').classList.remove('hidden');
    document.getElementById(modalId).classList.remove('hidden');
}

// Hide modal
function hideModal(modalId) {
    document.getElementById('modal-backdrop').classList.add('hidden');
    document.getElementById(modalId).classList.add('hidden');
    document.getElementById('food-autocomplete-list')?.classList.add('hidden'); // Hide autocomplete if open
    document.getElementById('food-search-input').value = ''; // Clear search on modal close
    document.getElementById('search-results').innerHTML = ''; // Clear results on modal close
}

// --- Render Functions ---

function renderDashboard() {
    const {
        calories,
        macros,
        water,
        steps,
        exercise,
        weight
    } = appState;
    const {
        calorieLimit,
        stepTarget,
        waterTarget,
        unitWeight
    } = appState.settings;

    // Calories Chart
    document.getElementById('calories-consumed-display').textContent = calories.consumed;
    document.getElementById('calories-consumed-val').textContent = calories.consumed;
    document.getElementById('calories-burned-val').textContent = calories.burned;
    document.getElementById('calories-goal-val').textContent = calorieLimit;
    currentCaloriesChart = updateCaloriesChart('caloriesChart', calories.consumed, calories.burned, calorieLimit, currentCaloriesChart);

    // Macros Charts (only if macros are visible)
    if (!document.getElementById('macros-chart-container').classList.contains('hidden')) {
        // Calculate goal in grams based on calorie limit and percentages from settings
        const { protein, carbs, fats } = calculateMacrosFromCalories(
            appState.settings.calorieLimit,
            appState.settings.macroGoals.protein,
            appState.settings.macroGoals.carbs,
            appState.settings.macroGoals.fats,
            appState.settings.macroRatioType === 'percent' // Pass true if settings are in percent
        );

        appState.macros.protein.goal = protein;
        appState.macros.carbs.goal = carbs;
        appState.macros.fats.goal = fats;


        document.getElementById('protein-consumed-display').textContent = `${macros.protein.consumed.toFixed(0)}g`;
        document.getElementById('carbs-consumed-display').textContent = `${macros.carbs.consumed.toFixed(0)}g`;
        document.getElementById('fats-consumed-display').textContent = `${macros.fats.consumed.toFixed(0)}g`;

        document.getElementById('protein-goal-display').textContent = `${macros.protein.consumed.toFixed(0)}g / ${macros.protein.goal.toFixed(0)}g`;
        document.getElementById('carbs-goal-display').textContent = `${macros.carbs.consumed.toFixed(0)}g / ${macros.carbs.goal.toFixed(0)}g`;
        document.getElementById('fats-goal-display').textContent = `${macros.fats.consumed.toFixed(0)}g / ${macros.fats.goal.toFixed(0)}g`;

        const proteinPercentage = (macros.protein.goal > 0) ? (macros.protein.consumed / macros.protein.goal) * 100 : 0;
        const carbsPercentage = (macros.carbs.goal > 0) ? (macros.carbs.consumed / macros.carbs.goal) * 100 : 0;
        const fatsPercentage = (macros.fats.goal > 0) ? (macros.fats.consumed / macros.fats.goal) * 100 : 0;

        [currentProteinChart, currentCarbsChart, currentFatsChart] = updateMacrosCharts(
            'proteinChart', proteinPercentage,
            'carbsChart', carbsPercentage,
            'fatsChart', fatsPercentage,
            currentProteinChart, currentCarbsChart, currentFatsChart
        );
    } else {
        // Destroy macro charts if hidden to save resources
        destroyChart(currentProteinChart);
        destroyChart(currentCarbsChart);
        destroyChart(currentFatsChart);
        currentProteinChart = null;
        currentCarbsChart = null;
        currentFatsChart = null;
    }

    // Water Intake
    const waterPercentage = (water.consumed / waterTarget) * 100;
    document.getElementById('water-fill').style.width = `${Math.min(100, waterPercentage)}%`;
    document.getElementById('water-display').textContent = `${water.consumed} oz / ${waterTarget} oz`;

    // Steps Walked
    document.getElementById('steps-display').textContent = steps.walked.toLocaleString();
    document.getElementById('steps-goal-display').textContent = `Goal: ${stepTarget.toLocaleString()} steps`;
    currentStepsChart = updateStepsChart('stepsChart', steps.walked, stepTarget, currentStepsChart);

    // Exercise Summary
    document.getElementById('exercise-time-display').textContent = `${exercise.time} minutes`;
    document.getElementById('exercise-calories-display').textContent = `${exercise.calories} Cals`;

    // Weight Tracking
    const bmi = calculateBMI(weight.current, weight.height);
    const bmiCategory = getBMICategory(bmi);
    document.getElementById('current-weight-val').textContent = weight.current;
    document.getElementById('bmi-display').textContent = `Current: ${weight.current} ${unitWeight}`;
    document.getElementById('bmi-status').textContent = `You have a ${bmiCategory.toLowerCase()} BMI`;

    // Weight Chart (Dashboard)
    currentWeightChart = createOrUpdateWeightChart('weightChart', weight.history, weight.goal, currentWeightChart, unitWeight);
    saveState();
}

function renderMealLogging() {
    const {
        meals
    } = appState;
    const mealEntriesContainer = document.getElementById('meal-entries');
    mealEntriesContainer.innerHTML = ''; // Clear previous entries

    // Loop through each meal category and display entries
    for (const category in meals) {
        if (meals[category].length > 0) {
            const categoryHeader = document.createElement('h3');
            categoryHeader.className = 'text-xl font-semibold mt-6 mb-3 text-gray-800 dark-mode:text-gray-200';
            categoryHeader.textContent = category;
            mealEntriesContainer.appendChild(categoryHeader);

            // Calculate total calories and macros for the current meal category
            let totalCategoryCalories = 0;
            let totalCategoryProtein = 0;
            let totalCategoryCarbs = 0;
            let totalCategoryFats = 0;

            meals[category].forEach((food, index) => {
                totalCategoryCalories += food.calories;
                totalCategoryProtein += food.protein_g;
                totalCategoryCarbs += food.carbohydrates_g;
                totalCategoryFats += food.fat_g;

                const foodItem = document.createElement('div');
                foodItem.className = 'bg-gray-50 dark-mode:bg-gray-700 rounded-lg p-4 mb-2 flex justify-between items-center shadow-sm';
                foodItem.innerHTML = `
                    <div>
                        <p class="font-medium text-gray-900 dark-mode:text-gray-100">${food.food_name} <span class="text-xs text-gray-500 dark-mode:text-gray-400">(${food.serving_qty} ${food.serving_unit})</span></p>
                        <p class="text-sm text-gray-600 dark-mode:text-gray-300">${food.calories.toFixed(0)} kcal | P: ${food.protein_g.toFixed(1)}g | C: ${food.carbohydrates_g.toFixed(1)}g | F: ${food.fat_g.toFixed(1)}g</p>
                    </div>
                    <button class="remove-food-btn text-red-500 hover:text-red-700 p-2" data-category="${category}" data-index="${index}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                `;
                mealEntriesContainer.appendChild(foodItem);
            });

            const categorySummary = document.createElement('div');
            categorySummary.className = 'bg-blue-100 dark-mode:bg-blue-800 rounded-lg p-4 mb-4 text-blue-800 dark-mode:text-blue-100 font-semibold';
            categorySummary.innerHTML = `
                <p>Total ${category}: ${totalCategoryCalories.toFixed(0)} kcal</p>
                <p class="text-sm">Macros: P ${totalCategoryProtein.toFixed(1)}g | C ${totalCategoryCarbs.toFixed(1)}g | F ${totalCategoryFats.toFixed(1)}g</p>
            `;
            mealEntriesContainer.appendChild(categorySummary);
        }
    }
    saveState();
}

function renderNutritionAnalysis() {
    const {
        meals,
        settings
    } = appState;
    const {
        calorieLimit,
        macroGoals
    } = settings;

    let totalConsumedCalories = 0;
    let totalConsumedProtein = 0;
    let totalConsumedCarbs = 0;
    let totalConsumedFats = 0;

    const mealCalorieData = [];
    const mealCalorieLabels = [];
    const mealCalorieColors = [];
    const predefinedColors = ['#f97316', '#22c55e', '#a855f7', '#06b6d4']; // orange, green, purple, cyan

    let colorIndex = 0;

    for (const category in meals) {
        let categoryCalories = 0;
        meals[category].forEach(food => {
            categoryCalories += food.calories;
            totalConsumedCalories += food.calories;
            totalConsumedProtein += food.protein_g;
            totalConsumedCarbs += food.carbohydrates_g;
            totalConsumedFats += food.fat_g;
        });
        if (categoryCalories > 0) {
            mealCalorieData.push(categoryCalories);
            mealCalorieLabels.push(category);
            mealCalorieColors.push(predefinedColors[colorIndex % predefinedColors.length]);
            colorIndex++;
        }
    }

    // Calories Analysis Tab
    const remainingCalories = calorieLimit - totalConsumedCalories + appState.calories.burned;
    const caloriesPercentage = (calorieLimit > 0) ? (totalConsumedCalories / calorieLimit) * 100 : 0;
    document.getElementById('total-calories-percent').textContent = `${caloriesPercentage.toFixed(0)}%`;
    currentMealCaloriesChart = updateMealCaloriesChart('mealCaloriesChart', mealCalorieData, mealCalorieLabels, mealCalorieColors, currentMealCaloriesChart);

    const mealCalorieBreakdownContainer = document.getElementById('meal-calorie-breakdown');
    if (mealCalorieBreakdownContainer) {
        mealCalorieBreakdownContainer.innerHTML = ''; // Clear previous
        mealCalorieLabels.forEach((label, index) => {
            const percentage = (totalConsumedCalories > 0) ? (mealCalorieData[index] / totalConsumedCalories) * 100 : 0;
            const item = document.createElement('div');
            item.className = 'flex items-center';
            item.innerHTML = `
                <div class="w-3 h-3 rounded-full mr-2" style="background-color: ${mealCalorieColors[index]};"></div>
                <span>${label} <span class="text-gray-600 dark-mode:text-gray-300">(${percentage.toFixed(0)}%, ${mealCalorieData[index].toFixed(0)} cal)</span></span>
            `;
            mealCalorieBreakdownContainer.appendChild(item);
        });
    }


    document.getElementById('analysis-total-calories').textContent = calorieLimit.toFixed(0);
    document.getElementById('analysis-consumed-calories').textContent = totalConsumedCalories.toFixed(0);
    document.getElementById('analysis-burned-calories').textContent = appState.calories.burned.toFixed(0);


    // Macros Analysis Tab
    // Use the potentially updated macroGoals from current settings
    const currentProteinGoal = appState.settings.macroGoals.protein;
    const currentCarbsGoal = appState.settings.macroGoals.carbs;
    const currentFatsGoal = appState.settings.macroGoals.fats;

    const proteinRemaining = Math.max(0, currentProteinGoal - totalConsumedProtein);
    const carbsRemaining = Math.max(0, currentCarbsGoal - totalConsumedCarbs);
    const fatsRemaining = Math.max(0, currentFatsGoal - totalConsumedFats);

    const proteinPercentage = (currentProteinGoal > 0) ? (totalConsumedProtein / currentProteinGoal) * 100 : 0;
    const carbsPercentage = (currentCarbsGoal > 0) ? (totalConsumedCarbs / currentCarbsGoal) * 100 : 0;
    const fatsPercentage = (currentFatsGoal > 0) ? (totalConsumedFats / currentFatsGoal) * 100 : 0;


    document.getElementById('analysis-protein-val').textContent = `${totalConsumedProtein.toFixed(0)}g / ${currentProteinGoal.toFixed(0)}g`;
    document.getElementById('analysis-carbs-val').textContent = `${totalConsumedCarbs.toFixed(0)}g / ${currentCarbsGoal.toFixed(0)}g`;
    document.getElementById('analysis-fats-val').textContent = `${totalConsumedFats.toFixed(0)}g / ${currentFatsGoal.toFixed(0)}g`;

    document.getElementById('analysis-protein-bar').style.width = `${Math.min(100, proteinPercentage)}%`;
    document.getElementById('analysis-carbs-bar').style.width = `${Math.min(100, carbsPercentage)}%`;
    document.getElementById('analysis-fats-bar').style.width = `${Math.min(100, fatsPercentage)}%`;

    // Update the macro donut chart on the Nutrition Analysis page
    currentNutritionMacrosChart = updateNutritionMacrosChart('nutritionMacrosChart',
        totalConsumedProtein, currentProteinGoal,
        totalConsumedCarbs, currentCarbsGoal,
        totalConsumedFats, currentFatsGoal,
        currentNutritionMacrosChart
    );
    saveState();
}

function renderExerciseWeightTracking() {
    const {
        weight
    } = appState;
    const {
        unitWeight
    } = appState.settings;

    // Weight chart for this section
    currentDailyWeightChart = createOrUpdateWeightChart('dailyWeightChart', weight.history, weight.goal, currentDailyWeightChart, unitWeight);

    const bmi = calculateBMI(weight.current, weight.height);
    const bmiCategory = getBMICategory(bmi);
    const bmiValueElement = document.getElementById('bmi-value');
    const bmiRiskElement = document.getElementById('bmi-risk');

    if (bmiValueElement) bmiValueElement.textContent = bmi.toFixed(1);
    if (bmiRiskElement) bmiRiskElement.textContent = bmiCategory;


    // Apply color based on BMI category
    if (bmiRiskElement) {
        bmiRiskElement.classList.remove('text-green-600', 'text-orange-500', 'text-red-600');
        if (bmiCategory.includes('Healthy')) {
            bmiRiskElement.classList.add('text-green-600');
        } else if (bmiCategory.includes('Underweight') || bmiCategory.includes('Overweight')) {
            bmiRiskElement.classList.add('text-orange-500');
        } else if (bmiCategory.includes('Obese')) {
            bmiRiskElement.classList.add('text-red-600');
        }
    }

    saveState();
}

function renderUserSettings() {
    const {
        settings
    } = appState;

    // Set daily goals inputs
    document.getElementById('calorie-limit-input').value = settings.calorieLimit;
    document.getElementById('step-target-input').value = settings.stepTarget;
    document.getElementById('water-target-input').value = settings.waterTarget;

    // Macro Ratios display
    const macroGramBtn = document.getElementById('macro-gram-btn');
    const macroPercentBtn = document.getElementById('macro-percent-btn');
    const macroInputsGram = document.getElementById('macro-inputs-gram');
    const macroInputsPercent = document.getElementById('macro-inputs-percent');

    if (settings.macroRatioType === 'gram') {
        macroGramBtn?.classList.add('bg-blue-500', 'text-white');
        macroGramBtn?.classList.remove('bg-gray-200', 'text-gray-700');
        macroPercentBtn?.classList.remove('bg-blue-500', 'text-white');
        macroPercentBtn?.classList.add('bg-gray-200', 'text-gray-700');
        macroInputsGram?.classList.remove('hidden');
        macroInputsPercent?.classList.add('hidden');

        document.getElementById('protein-goal-gram').value = settings.macroGoals.protein;
        document.getElementById('carbs-goal-gram').value = settings.macroGoals.carbs;
        document.getElementById('fats-goal-gram').value = settings.macroGoals.fats;
    } else {
        macroPercentBtn?.classList.add('bg-blue-500', 'text-white');
        macroPercentBtn?.classList.remove('bg-gray-200', 'text-gray-700');
        macroGramBtn?.classList.remove('bg-blue-500', 'text-white');
        macroGramBtn?.classList.add('bg-gray-200', 'text-gray-700');
        macroInputsPercent?.classList.remove('hidden');
        macroInputsGram?.classList.add('hidden');

        // Display current ratio percentages if in percentage mode
        const currentProteinPercent = (appState.settings.macroGoals.protein / (appState.settings.macroGoals.protein + appState.settings.macroGoals.carbs + appState.settings.macroGoals.fats)) * 100 || 0;
        const currentCarbsPercent = (appState.settings.macroGoals.carbs / (appState.settings.macroGoals.protein + appState.settings.macroGoals.carbs + appState.settings.macroGoals.fats)) * 100 || 0;
        const currentFatsPercent = (appState.settings.macroGoals.fats / (appState.settings.macroGoals.protein + appState.settings.macroGoals.carbs + appState.settings.macroGoals.fats)) * 100 || 0;


        document.getElementById('protein-goal-percent').value = currentProteinPercent.toFixed(0);
        document.getElementById('carbs-goal-percent').value = currentCarbsPercent.toFixed(0);
        document.getElementById('fats-goal-percent').value = currentFatsPercent.toFixed(0);
    }

    // Unit settings
    document.getElementById('unit-weight').value = settings.unitWeight;
    document.getElementById('unit-energy').value = settings.unitEnergy;

    // Reminders
    document.getElementById('reminder-meals').checked = settings.reminders.meals;
    document.getElementById('reminder-water').checked = settings.reminders.water;
    saveState();
}


// --- Autocomplete (Food Search) ---
let autocompleteAbortController = null;
async function fetchAutocompleteSuggestions(query) {
    if (autocompleteAbortController) {
        autocompleteAbortController.abort(); // Abort previous request
    }
    autocompleteAbortController = new AbortController();
    const signal = autocompleteAbortController.signal;

    try {
        // Dummy suggestions as the Nutritionix natural/nutrients endpoint is not for autocomplete.
        // A real autocomplete would require a different API endpoint or a local dataset.
        const dummySuggestions = [
            "Apple", "Banana", "Orange", "Chicken Breast", "Salmon", "Broccoli", "Rice", "Pasta",
            "Bread", "Milk", "Yogurt", "Eggs", "Oats", "Spinach", "Carrot", "Potato", "Cheese",
            "Beef Steak", "Avocado", "Quinoa", "Lentils", "Almonds", "Olive Oil", "Water", "Roti", "Dal"
        ];

        const filtered = dummySuggestions.filter(item =>
            item.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 5); // Limit to 5 suggestions

        return filtered.map(item => ({ food_name: item, calories: 0 })); // dummy calories
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Fetch aborted for autocomplete.');
        } else {
            console.error('Autocomplete fetch error:', error);
        }
        return [];
    }
}

function setupAutocomplete() {
    const foodSearchInput = document.getElementById('food-search-input');
    const autocompleteList = document.getElementById('food-autocomplete-list');

    let debounceTimeout;

    foodSearchInput?.addEventListener('input', () => {
        const query = foodSearchInput.value.trim();
        if (query.length < 2) { // Only search if 2 or more characters
            autocompleteList.classList.add('hidden');
            return;
        }

        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(async () => {
            const suggestions = await fetchAutocompleteSuggestions(query);
            renderAutocompleteSuggestions(suggestions);
        }, 300); // Debounce for 300ms
    });

    // Handle clicking outside to hide autocomplete
    document.addEventListener('click', (e) => {
        if (foodSearchInput && !foodSearchInput.contains(e.target) && autocompleteList && !autocompleteList.contains(e.target)) {
            autocompleteList.classList.add('hidden');
        }
    });

    function renderAutocompleteSuggestions(suggestions) {
        if (!autocompleteList) return;
        autocompleteList.innerHTML = '';
        if (suggestions.length === 0) {
            autocompleteList.classList.add('hidden');
            return;
        }

        suggestions.forEach(item => {
            const div = document.createElement('div');
            div.className = 'p-2 cursor-pointer hover:bg-gray-100 dark-mode:hover:bg-gray-600';
            div.textContent = item.food_name;
            div.addEventListener('click', () => {
                foodSearchInput.value = item.food_name;
                autocompleteList.classList.add('hidden');
            });
            autocompleteList.appendChild(div);
        });
        autocompleteList.classList.remove('hidden');
    }
}


// --- Event Handlers ---

document.addEventListener('DOMContentLoaded', () => {
    loadState();
    setupAutocomplete(); // Initialize autocomplete first

    // Dark Mode Toggle
    document.getElementById('dark-mode-toggle')?.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        appState.darkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', appState.darkMode);
        const icon = document.getElementById('dark-mode-toggle')?.querySelector('i');
        if (icon) {
            if (appState.darkMode) {
                icon.classList.replace('fa-moon', 'fa-sun');
            } else {
                icon.classList.replace('fa-sun', 'fa-moon');
            }
        }
        // Re-render charts to apply theme changes
        renderDashboard();
        renderNutritionAnalysis();
        renderExerciseWeightTracking();
    });

    // Bottom Navigation
    document.querySelectorAll('.nav-item').forEach(button => {
        button.addEventListener('click', () => {
            showPage(button.dataset.page);
        });
    });

    // Modal Close Buttons
    document.querySelectorAll('.close-modal-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            // Find the parent modal and hide it
            const modal = event.target.closest('.modal-content');
            if (modal) {
                hideModal(modal.id);
            }
        });
    });

    // Modal backdrop click to close
    document.getElementById('modal-backdrop')?.addEventListener('click', (event) => {
        if (event.target === event.currentTarget) { // Only close if clicking on backdrop itself
            document.querySelectorAll('.modal-content').forEach(modal => {
                if (!modal.classList.contains('hidden')) {
                    hideModal(modal.id);
                }
            });
        }
    });

    // --- Dashboard Event Listeners ---
    document.getElementById('dashboard-calories-btn')?.addEventListener('click', () => {
        document.getElementById('calories-chart-container')?.classList.remove('hidden');
        document.getElementById('macros-chart-container')?.classList.add('hidden');
        document.getElementById('dashboard-calories-btn')?.classList.add('bg-blue-500', 'text-white');
        document.getElementById('dashboard-calories-btn')?.classList.remove('bg-gray-200', 'text-gray-700');
        document.getElementById('dashboard-macros-btn')?.classList.remove('bg-blue-500', 'text-white');
        document.getElementById('dashboard-macros-btn')?.classList.add('bg-gray-200', 'text-gray-700');
        renderDashboard(); // Re-render to update chart visibility
    });

    document.getElementById('dashboard-macros-btn')?.addEventListener('click', () => {
        document.getElementById('calories-chart-container')?.classList.add('hidden');
        document.getElementById('macros-chart-container')?.classList.remove('hidden');
        document.getElementById('dashboard-macros-btn')?.classList.add('bg-blue-500', 'text-white');
        document.getElementById('dashboard-macros-btn')?.classList.remove('bg-gray-200', 'text-gray-700');
        document.getElementById('dashboard-calories-btn')?.classList.remove('bg-blue-500', 'text-white');
        document.getElementById('dashboard-calories-btn')?.classList.add('bg-gray-200', 'text-gray-700');
        renderDashboard(); // Re-render to update chart visibility
    });

    document.getElementById('water-add')?.addEventListener('click', () => {
        appState.water.consumed += 8; // Add 8 oz (assuming 8oz per glass from original context)
        renderDashboard();
        showToast('Water intake updated!', 'info');
    });

    document.getElementById('water-remove')?.addEventListener('click', () => {
        appState.water.consumed = Math.max(0, appState.water.consumed - 8); // Remove 8 oz, min 0
        renderDashboard();
        showToast('Water intake updated!', 'info');
    });

    document.getElementById('add-steps-btn')?.addEventListener('click', () => showModal('add-steps-modal'));
    document.getElementById('save-steps-btn')?.addEventListener('click', () => {
        const stepsInput = document.getElementById('steps-input');
        const stepsToAdd = parseInt(stepsInput.value);
        if (!isNaN(stepsToAdd) && stepsToAdd > 0) {
            appState.steps.walked += stepsToAdd;
            renderDashboard();
            hideModal('add-steps-modal');
            stepsInput.value = ''; // Clear input
            showToast('Steps logged!', 'success');
        } else {
            showToast('Please enter a valid number of steps.', 'error');
        }
    });

    document.getElementById('add-exercise-btn')?.addEventListener('click', () => showModal('add-exercise-modal'));
    document.getElementById('save-exercise-btn')?.addEventListener('click', () => {
        const workoutTypeSelect = document.getElementById('modal-workout-type');
        const customWorkoutNameInput = document.getElementById('modal-custom-workout-name');
        const durationInput = document.getElementById('modal-workout-duration');
        const caloriesBurnedInput = document.getElementById('modal-workout-calories');

        const workoutType = workoutTypeSelect.value;
        const customWorkoutName = customWorkoutNameInput.value;
        const duration = parseInt(durationInput.value);
        const caloriesBurned = parseInt(caloriesBurnedInput.value);

        if (!isNaN(duration) && duration > 0 && !isNaN(caloriesBurned) && caloriesBurned > 0) {
            appState.exercise.time += duration;
            appState.calories.burned += caloriesBurned;
            appState.exercise.calories += caloriesBurned; // Update exercise summary calories

            const workoutName = workoutType === 'custom' ? customWorkoutName : workoutType.charAt(0).toUpperCase() + workoutType.slice(1);

            appState.exercise.entries.push({
                type: workoutName,
                duration: duration,
                calories: caloriesBurned,
                date: new Date().toISOString().split('T')[0]
            });
            renderDashboard();
            hideModal('add-exercise-modal');
            durationInput.value = '';
            caloriesBurnedInput.value = '';
            workoutTypeSelect.value = 'running'; // Reset to default
            document.getElementById('modal-custom-workout-name-container').style.display = 'none'; // Hide custom input
            customWorkoutNameInput.value = ''; // Clear custom input
            showToast('Exercise logged!', 'success');
        } else {
            showToast('Please enter valid duration and calories burned.', 'error');
        }
    });

    // Event listener for workout type change in modal
    document.getElementById('modal-workout-type')?.addEventListener('change', (event) => {
        if (event.target.value === 'custom') {
            document.getElementById('modal-custom-workout-name-container').style.display = 'block';
        } else {
            document.getElementById('modal-custom-workout-name-container').style.display = 'none';
        }
    });


    document.getElementById('add-weight-btn')?.addEventListener('click', () => showModal('add-weight-modal'));
    document.getElementById('save-weight-btn')?.addEventListener('click', () => {
        const weightInput = document.getElementById('modal-weight-input');
        const newWeight = parseFloat(weightInput.value);
        if (!isNaN(newWeight) && newWeight > 0) {
            appState.weight.current = newWeight;
            appState.weight.history.push({
                date: new Date().toISOString().split('T')[0],
                weight: newWeight
            });
            renderDashboard();
            renderExerciseWeightTracking(); // Also update the weight chart on fitness page
            hideModal('add-weight-modal');
            weightInput.value = '';
            showToast('Weight logged!', 'success');
        } else {
            showToast('Please enter a valid weight.', 'error');
        }
    });

    // --- Meal Logging Event Listeners ---
    document.querySelectorAll('.meal-category-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            // Remove active class from all buttons
            document.querySelectorAll('.meal-category-btn').forEach(btn => {
                btn.classList.remove('bg-blue-500', 'text-white');
                btn.classList.add('bg-gray-200', 'text-gray-700');
            });
            // Add active class to the clicked button
            event.target.classList.add('bg-blue-500', 'text-white');
            event.target.classList.remove('bg-gray-200', 'text-gray-700');
            appState.currentMealCategory = event.target.dataset.category;
            saveState();
        });
    });

    document.getElementById('food-search-btn')?.addEventListener('click', async () => {
        const query = document.getElementById('food-search-input').value.trim();
        const addLogBtnText = document.querySelector('#food-search-btn i'); // Target icon for loader
        const initialIconClass = addLogBtnText.className; // Save initial icon class

        if (query) {
            document.getElementById('search-results').innerHTML = '<p class="text-center text-gray-500">Searching...</p>';
            addLogBtnText.classList.remove(...initialIconClass.split(' ')); // Remove old icon classes
            addLogBtnText.classList.add('fas', 'fa-spinner', 'fa-spin'); // Add spinner icon

            try {
                const data = await fetchNutritionData(query);
                document.getElementById('search-results').innerHTML = ''; // Clear loading message

                if (data && data.foods && data.foods.length > 0) {
                    data.foods.forEach(food => {
                        const foodItem = document.createElement('div');
                        foodItem.className = 'bg-blue-50 dark-mode:bg-blue-900 rounded-lg p-3 mb-2 flex justify-between items-center shadow-sm';
                        foodItem.innerHTML = `
                            <div>
                                <p class="font-medium text-blue-800 dark-mode:text-blue-100">${food.food_name} <span class="text-xs text-blue-600 dark-mode:text-blue-300">(${food.serving_qty} ${food.serving_unit})</span></p>
                                <p class="text-sm text-blue-700 dark-mode:text-blue-200">${food.nf_calories.toFixed(0)} kcal | P: ${food.nf_protein.toFixed(1)}g | C: ${food.nf_total_carbohydrate.toFixed(1)}g | F: ${food.nf_total_fat.toFixed(1)}g</p>
                            </div>
                            <button class="add-food-to-meal-btn bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-md"
                                data-food='${JSON.stringify({
                                    food_name: food.food_name,
                                    serving_qty: food.serving_qty,
                                    serving_unit: food.serving_unit,
                                    calories: food.nf_calories,
                                    protein_g: food.nf_protein,
                                    carbohydrates_g: food.nf_total_carbohydrate,
                                    fat_g: food.nf_total_fat
                                })}'>
                                <i class="fas fa-plus"></i>
                            </button>
                        `;
                        document.getElementById('search-results').appendChild(foodItem);
                    });
                } else {
                    document.getElementById('search-results').innerHTML = '<p class="text-center text-gray-500">No results found. Try a different query.</p>';
                }
            } catch (error) {
                console.error('Error fetching nutrition data:', error);
                document.getElementById('search-results').innerHTML = '<p class="text-center text-red-500">Error fetching data. Please try again.</p>';
            } finally {
                // Revert to original icon
                addLogBtnText.classList.remove('fas', 'fa-spinner', 'fa-spin');
                addLogBtnText.classList.add(...initialIconClass.split(' '));
            }
        } else {
            showToast('Please enter a food item to search.', 'error');
        }
    });

    // Event delegation for adding food to meal
    document.getElementById('search-results')?.addEventListener('click', (event) => {
        const addFoodBtn = event.target.closest('.add-food-to-meal-btn');
        if (addFoodBtn) {
            const foodData = JSON.parse(addFoodBtn.dataset.food);
            const category = appState.currentMealCategory;

            if (!appState.meals[category]) {
                appState.meals[category] = [];
            }
            appState.meals[category].push(foodData);
            appState.calories.consumed += foodData.calories;
            appState.macros.protein.consumed += foodData.protein_g;
            appState.macros.carbs.consumed += foodData.carbohydrates_g;
            appState.macros.fats.consumed += foodData.fat_g;

            renderMealLogging();
            renderDashboard(); // Update dashboard with new calorie/macro counts
            renderNutritionAnalysis(); // Update nutrition analysis
            document.getElementById('food-search-input').value = ''; // Clear search
            document.getElementById('search-results').innerHTML = ''; // Clear results
            showToast(`"${foodData.food_name}" added to ${category}!`, 'success');
        }
    });

    // Event delegation for removing food from meal
    document.getElementById('meal-entries')?.addEventListener('click', (event) => {
        const removeBtn = event.target.closest('.remove-food-btn');
        if (removeBtn) {
            const category = removeBtn.dataset.category;
            const index = parseInt(removeBtn.dataset.index);

            if (appState.meals[category] && appState.meals[category][index]) {
                const removedFood = appState.meals[category].splice(index, 1)[0];
                appState.calories.consumed -= removedFood.calories;
                appState.macros.protein.consumed -= removedFood.protein_g;
                appState.macros.carbs.consumed -= removedFood.carbohydrates_g;
                appState.macros.fats.consumed -= removedFood.fat_g;
                renderMealLogging();
                renderDashboard();
                renderNutritionAnalysis();
                showToast(`"${removedFood.food_name}" removed from ${category}.`, 'info');
            }
        }
    });


    document.getElementById('add-custom-recipe-btn')?.addEventListener('click', () => showModal('add-custom-recipe-modal'));
    document.getElementById('save-custom-recipe-btn')?.addEventListener('click', () => {
        const recipeNameInput = document.getElementById('recipe-name-input');
        const caloriesInput = document.getElementById('recipe-calories-input');
        const proteinInput = document.getElementById('recipe-protein-input');
        const carbsInput = document.getElementById('recipe-carbs-input');
        const fatsInput = document.getElementById('recipe-fats-input');

        const recipeName = recipeNameInput.value.trim();
        const calories = parseFloat(caloriesInput.value);
        const protein = parseFloat(proteinInput.value);
        const carbs = parseFloat(carbsInput.value);
        const fats = parseFloat(fatsInput.value);

        if (recipeName && !isNaN(calories) && !isNaN(protein) && !isNaN(carbs) && !isNaN(fats) && calories >= 0 && protein >= 0 && carbs >= 0 && fats >= 0) {
            const customRecipe = {
                food_name: recipeName,
                serving_qty: 1,
                serving_unit: 'serving',
                calories: calories,
                protein_g: protein,
                carbohydrates_g: carbs,
                fat_g: fats
            };
            const category = appState.currentMealCategory;
            if (!appState.meals[category]) {
                appState.meals[category] = [];
            }
            appState.meals[category].push(customRecipe);

            appState.calories.consumed += customRecipe.calories;
            appState.macros.protein.consumed += customRecipe.protein_g;
            appState.macros.carbs.consumed += customRecipe.carbohydrates_g;
            appState.macros.fats.consumed += customRecipe.fat_g;

            renderMealLogging();
            renderDashboard();
            renderNutritionAnalysis();
            hideModal('add-custom-recipe-modal');
            // Clear inputs
            recipeNameInput.value = '';
            caloriesInput.value = '';
            proteinInput.value = '';
            carbsInput.value = '';
            fatsInput.value = '';
            showToast(`Custom recipe "${recipeName}" added!`, 'success');
        } else {
            showToast('Please fill all fields with valid numbers for custom recipe.', 'error');
        }
    });

    // --- Nutrition Analysis Event Listeners ---
    document.querySelectorAll('.nutrition-tab-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            // Remove active class from all tab buttons and hide all content
            document.querySelectorAll('.nutrition-tab-btn').forEach(btn => {
                btn.classList.remove('active', 'text-blue-600', 'border-b-2', 'border-blue-600');
                btn.classList.add('text-gray-600');
            });
            document.querySelectorAll('.nutrition-tab-content').forEach(content => {
                content.classList.add('hidden');
                content.classList.remove('active');
            });

            // Add active class to the clicked button and show relevant content
            event.target.classList.add('active', 'text-blue-600', 'border-b-2', 'border-blue-600');
            event.target.classList.remove('text-gray-600');
            document.getElementById(`${event.target.dataset.tab}-analysis-tab`).classList.remove('hidden');
            document.getElementById(`${event.target.dataset.tab}-analysis-tab`).classList.add('active');
            renderNutritionAnalysis(); // Re-render to ensure charts update if tab was hidden
        });
    });

    // --- Exercise & Weight Tracking Event Listeners (on this page, not modal) ---
    document.getElementById('workout-type')?.addEventListener('change', (event) => {
        if (event.target.value === 'custom') {
            document.getElementById('custom-workout-name-container').style.display = 'block';
        } else {
            document.getElementById('custom-workout-name-container').style.display = 'none';
        }
    });

    document.getElementById('log-workout-btn')?.addEventListener('click', () => {
        const workoutTypeSelect = document.getElementById('workout-type');
        const customWorkoutNameInput = document.getElementById('custom-workout-name');
        const durationInput = document.getElementById('workout-duration');
        const caloriesBurnedInput = document.getElementById('workout-calories');

        const workoutType = workoutTypeSelect.value;
        const customWorkoutName = customWorkoutNameInput.value;
        const duration = parseInt(durationInput.value);
        const caloriesBurned = parseInt(caloriesBurnedInput.value);

        if (!isNaN(duration) && duration > 0 && !isNaN(caloriesBurned) && caloriesBurned > 0) {
            appState.exercise.time += duration;
            appState.calories.burned += caloriesBurned;
            appState.exercise.calories += caloriesBurned; // Update exercise summary calories

            const workoutName = workoutType === 'custom' ? customWorkoutName : workoutType.charAt(0).toUpperCase() + workoutType.slice(1);

            appState.exercise.entries.push({
                type: workoutName,
                duration: duration,
                calories: caloriesBurned,
                date: new Date().toISOString().split('T')[0]
            });
            renderDashboard(); // Update dashboard
            renderExerciseWeightTracking(); // Update this page's charts/info
            showToast(`Workout logged!`, 'success');
            // Clear inputs
            durationInput.value = '';
            caloriesBurnedInput.value = '';
            workoutTypeSelect.value = 'running'; // Reset to default
            document.getElementById('custom-workout-name-container').style.display = 'none'; // Hide custom input
            customWorkoutNameInput.value = ''; // Clear custom input
        } else {
            showToast('Please enter valid duration and calories burned for workout.', 'error');
        }
    });

    document.getElementById('log-body-weight-btn')?.addEventListener('click', () => {
        const weightInput = document.getElementById('body-weight-input');
        const newWeight = parseFloat(weightInput.value);
        if (!isNaN(newWeight) && newWeight > 0) {
            appState.weight.current = newWeight;
            appState.weight.history.push({
                date: new Date().toISOString().split('T')[0],
                weight: newWeight
            });
            renderDashboard(); // Update dashboard
            renderExerciseWeightTracking(); // Update this page's charts/info
            showToast(`Weight updated to ${newWeight} ${appState.settings.unitWeight}.`, 'success');
            weightInput.value = ''; // Clear input
        } else {
            showToast('Please enter a valid weight.', 'error');
        }
    });

    // --- User Settings Event Listeners ---
    document.getElementById('save-goals-btn')?.addEventListener('click', () => {
        appState.settings.calorieLimit = parseInt(document.getElementById('calorie-limit-input').value) || 0;
        appState.settings.stepTarget = parseInt(document.getElementById('step-target-input').value) || 0;
        appState.settings.waterTarget = parseInt(document.getElementById('water-target-input').value) || 0;

        const proteinRatioInput = document.getElementById('protein-goal-percent');
        const carbsRatioInput = document.getElementById('carbs-goal-percent');
        const fatsRatioInput = document.getElementById('fats-goal-percent');

        if (appState.settings.macroRatioType === 'gram') {
            appState.settings.macroGoals.protein = parseInt(document.getElementById('protein-goal-gram').value) || 0;
            appState.settings.macroGoals.carbs = parseInt(document.getElementById('carbs-goal-gram').value) || 0;
            appState.settings.macroGoals.fats = parseInt(document.getElementById('fats-goal-gram').value) || 0;
        } else { // percentage
            const proteinPercent = parseInt(proteinRatioInput.value) || 0;
            const carbsPercent = parseInt(carbsRatioInput.value) || 0;
            const fatsPercent = parseInt(fatsRatioInput.value) || 0;

            const ratioError = document.getElementById('ratio-error');
            if ((proteinPercent + carbsPercent + fatsPercent) !== 100) {
                if (ratioError) ratioError.classList.remove('hidden');
                showToast('Protein, Carbs, and Fats percentages must add up to 100%.', 'error');
                return;
            }
            if (ratioError) ratioError.classList.add('hidden');

            // Convert percentages to grams based on current calorie limit
            const {
                protein,
                carbs,
                fats
            } = calculateMacrosFromCalories(appState.settings.calorieLimit, proteinPercent, carbsPercent, fatsPercent, true);

            appState.settings.macroGoals.protein = protein;
            appState.settings.macroGoals.carbs = carbs;
            appState.settings.macroGoals.fats = fats;
        }
        saveState();
        renderDashboard();
        renderNutritionAnalysis();
        showToast('Goals saved!', 'success');
    });

    document.getElementById('macro-gram-btn')?.addEventListener('click', () => {
        appState.settings.macroRatioType = 'gram';
        // Hide ratio error if changing type
        document.getElementById('ratio-error')?.classList.add('hidden');
        renderUserSettings();
    });

    document.getElementById('macro-percent-btn')?.addEventListener('click', () => {
        appState.settings.macroRatioType = 'percent';
        // Hide ratio error if changing type
        document.getElementById('ratio-error')?.classList.add('hidden');
        renderUserSettings();
    });

    document.getElementById('save-units-btn')?.addEventListener('click', () => {
        appState.settings.unitWeight = document.getElementById('unit-weight').value;
        appState.settings.unitEnergy = document.getElementById('unit-energy').value;
        saveState();
        renderDashboard(); // Re-render to update units in UI
        renderExerciseWeightTracking();
        showToast('Units saved!', 'success');
    });

    document.getElementById('save-reminders-btn')?.addEventListener('click', () => {
        appState.settings.reminders.meals = document.getElementById('reminder-meals').checked;
        appState.settings.reminders.water = document.getElementById('reminder-water').checked;
        saveState();
        showToast('Reminders saved!', 'success');
    });

    document.getElementById('reset-all-data-btn')?.addEventListener('click', (e) => {
        const resetBtn = e.target;
        if (resetBtn.dataset.confirmed === "true") {
            localStorage.removeItem('fitTrackAppState');
            location.reload(); // Reloads the page, effectively resetting all state
        } else {
            resetBtn.dataset.confirmed = "true";
            resetBtn.textContent = "Confirm Reset?";
            resetBtn.classList.remove('bg-red-500');
            resetBtn.classList.add('bg-orange-500'); // Use orange for confirmation state
            showToast('Click again to confirm data reset!', 'error', 3000);
            setTimeout(() => {
                resetBtn.dataset.confirmed = "false"; // Reset confirmation after a delay
                resetBtn.textContent = "Reset All Data (Confirm Required)";
                resetBtn.classList.remove('bg-orange-500');
                resetBtn.classList.add('bg-red-500');
            }, 5000); // Give user 5 seconds to confirm
        }
    });

    // Initial render of the dashboard and other components
    showPage('dashboard');
});
