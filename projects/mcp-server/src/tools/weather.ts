interface WeatherArgs {
  location: string;
}

export async function weatherTool(args: WeatherArgs) {
  const { location } = args;
  
  try {
    // For demo purposes, we'll simulate weather data
    const weatherData = {
      location,
      temperature: Math.floor(Math.random() * 30) + 10,
      condition: ['sunny', 'cloudy', 'rainy', 'snowy'][Math.floor(Math.random() * 4)],
      humidity: Math.floor(Math.random() * 50) + 30,
      windSpeed: Math.floor(Math.random() * 20) + 5,
    };

    return {
      content: [
        {
          type: "text" as const,
          text: `Weather in ${weatherData.location}:
🌡️  Temperature: ${weatherData.temperature}°C
☁️  Condition: ${weatherData.condition}
💧 Humidity: ${weatherData.humidity}%
💨 Wind Speed: ${weatherData.windSpeed} km/h`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Failed to get weather for ${location}: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
} 