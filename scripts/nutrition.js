// scripts/nutrition.js

/**
 * Calculates Body Mass Index (BMI).
 * @param {number} weightInKg - Weight in kilograms.
 * @param {number} heightInCm - Height in centimeters.
 * @returns {number} BMI value.
 */
export function calculateBMI(weightInKg, heightInCm) {
    if (heightInCm <= 0) return 0;
    const heightInMeters = heightInCm / 100;
    return weightInKg / (heightInMeters * heightInMeters);
}

/**
 * Determines BMI category based on BMI value.
 * @param {number} bmi - The calculated BMI value.
 * @returns {string} BMI category.
 */
export function getBMICategory(bmi) {
    if (bmi < 18.5) {
        return 'Underweight';
    } else if (bmi >= 18.5 && bmi < 24.9) {
        return 'Healthy Weight';
    } else if (bmi >= 25 && bmi < 29.9) {
        return 'Overweight';
    } else if (bmi >= 30) {
        return 'Obese';
    }
    return 'N/A';
}

/**
 * Calculates macro grams based on total calories and percentages.
 * If isPercentage is true, it converts percentages to grams based on calorieGoal.
 * Otherwise, it assumes proteinRatio, carbsRatio, fatRatio are already in grams and returns them.
 * @param {number} calorieGoal - Total daily calorie goal.
 * @param {number} proteinRatio - Protein value (percentage or grams).
 * @param {number} carbsRatio - Carbohydrate value (percentage or grams).
 * @param {number} fatsRatio - Fat value (percentage or grams).
 * @param {boolean} isPercentage - True if ratios are percentages, false if grams.
 * @returns {object} Object with protein, carbs, and fats in grams.
 */
export function calculateMacrosFromCalories(calorieGoal, proteinRatio, carbsRatio, fatsRatio, isPercentage = false) {
    const caloriesPerGramProtein = 4;
    const caloriesPerGramCarbs = 4;
    const caloriesPerGramFats = 9;

    let proteinGrams, carbsGrams, fatsGrams;

    if (isPercentage) {
        if (calorieGoal === 0) { // Avoid division by zero if goal is 0
            proteinGrams = 0;
            carbsGrams = 0;
            fatsGrams = 0;
        } else {
            proteinGrams = (calorieGoal * (proteinRatio / 100)) / caloriesPerGramProtein;
            carbsGrams = (calorieGoal * (carbsRatio / 100)) / caloriesPerGramCarbs;
            fatsGrams = (calorieGoal * (fatsRatio / 100)) / caloriesPerGramFats;
        }
    } else {
        // If not percentage, assume direct grams are provided and return them as is
        proteinGrams = proteinRatio;
        carbsGrams = carbsRatio;
        fatsGrams = fatsRatio;
    }

    return {
        protein: proteinGrams,
        carbs: carbsGrams,
        fats: fatsGrams
    };
}
