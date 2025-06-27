// scripts/api.js

const NUTRITIONIX_APP_ID = '4fe99f34'; // Replace with your actual Nutritionix App ID
const NUTRITIONIX_APP_KEY = 'f6c0e4fbbd96e8bee5bc3a9dc8b4a274'; // Replace with your actual Nutritionix App Key
const NUTRITIONIX_API_URL = 'https://trackapi.nutritionix.com/v2/natural/nutrients';

/**
 * Fetches nutrition data from the Nutritionix API.
 * @param {string} query - The natural language food query (e.g., "2 roti 1 dal").
 * @returns {Promise<object>} A promise that resolves to the API response data.
 */
export async function fetchNutritionData(query) {
    try {
        const response = await fetch(NUTRITIONIX_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-app-id': NUTRITIONIX_APP_ID,
                'x-app-key': NUTRITIONIX_APP_KEY
            },
            body: JSON.stringify({
                query: query
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `HTTP error! Status: ${response.status}.`;
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.message || errorMessage;
            } catch (e) {
                // Not a JSON error, use plain text
                errorMessage = `${errorMessage} Details: ${errorText.substring(0, 100)}...`;
            }
            throw new Error(errorMessage);
        }

        const data = await response.json();
        console.log('Nutritionix API Response:', data);
        return data;
    } catch (error) {
        console.error('Error fetching nutrition data:', error);
        throw error; // Re-throw to be caught by calling function
    }
}
