import { tool } from '@openai/agents';
import { z } from "zod";

/**
 * Weather tool for getting current weather information
 * In production, this would integrate with a real weather API like OpenWeatherMap
 */
export const weatherTool = tool({
  name: 'get_weather',
  description: 'Get current weather information for a specific location',
  parameters: {
    type: 'object',
    properties: {
      location: {
        type: 'string',
        description: 'The city and state/country to get weather for'
      },
      unit: {
        type: 'string',
        enum: ['celsius', 'fahrenheit'],
        description: 'Temperature unit',
        default: 'celsius'
      }
    },
    required: ['location']
  },
  execute: async ({ location, unit = 'celsius' }) => {
    try {
      // Simulate weather API call - replace with real API integration
      const mockWeatherData = {
        location,
        temperature: unit === 'celsius' ? Math.floor(Math.random() * 30) + 5 : Math.floor(Math.random() * 60) + 40,
        unit,
        condition: ['Sunny', 'Partly cloudy', 'Cloudy', 'Rainy', 'Thunderstorm'][Math.floor(Math.random() * 5)],
        humidity: Math.floor(Math.random() * 40) + 40,
        windSpeed: Math.floor(Math.random() * 20) + 5
      };
      
      return `Current weather in ${location}: ${mockWeatherData.temperature}°${unit === 'celsius' ? 'C' : 'F'}, ${mockWeatherData.condition}, Humidity: ${mockWeatherData.humidity}%, Wind: ${mockWeatherData.windSpeed} km/h`;
    } catch (error) {
      return `Error fetching weather data for ${location}: ${error.message}`;
    }
  }
});

/**
 * Weather service class for more complex weather operations
 */
export class WeatherService {
  constructor(apiKey = null) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.openweathermap.org/data/2.5';
  }

  /**
   * Get weather data from real API (requires API key)
   */
  async getRealWeatherData(location, unit = 'celsius') {
    if (!this.apiKey) {
      throw new Error('Weather API key not configured');
    }

    try {
      const units = unit === 'celsius' ? 'metric' : 'imperial';
      const response = await fetch(
        `${this.baseUrl}/weather?q=${encodeURIComponent(location)}&appid=${this.apiKey}&units=${units}`
      );
      
      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        location: data.name,
        temperature: Math.round(data.main.temp),
        unit,
        condition: data.weather[0].description,
        humidity: data.main.humidity,
        windSpeed: data.wind.speed
      };
    } catch (error) {
      throw new Error(`Failed to fetch weather data: ${error.message}`);
    }
  }

  /**
   * Format weather data for display
   */
  formatWeatherData(weatherData) {
    const { location, temperature, unit, condition, humidity, windSpeed } = weatherData;
    const tempUnit = unit === 'celsius' ? 'C' : 'F';
    
    return `Weather in ${location}: ${temperature}°${tempUnit}, ${condition}, Humidity: ${humidity}%, Wind: ${windSpeed} km/h`;
  }
}

export const getWeather = tool({
  name: 'get_weather',
  description: 'Return the weather for a given city.',
  parameters: z.object({ city: z.string() }),
  async execute({ city }) {
    // In a real application, you would call a weather API here.
    return `The weather in ${city} is sunny and 75°F.`;
  },
});