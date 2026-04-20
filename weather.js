// API Configuration
const API_KEY = 'bd5e378503939ddaee76f12ad7a97608'; // Replace with your API key
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// DOM Elements
const elements = {
    cityInput: document.getElementById('cityInput'),
    searchBtn: document.getElementById('searchBtn'),
    locationBtn: document.getElementById('locationBtn'),
    cityName: document.getElementById('cityName'),
    currentDate: document.getElementById('currentDate'),
    weatherIcon: document.getElementById('weatherIcon'),
    temperature: document.getElementById('temperature'),
    weatherDescription: document.getElementById('weatherDescription'),
    tempMax: document.getElementById('tempMax'),
    tempMin: document.getElementById('tempMin'),
    feelsLike: document.getElementById('feelsLike'),
    windSpeed: document.getElementById('windSpeed'),
    humidity: document.getElementById('humidity'),
    pressure: document.getElementById('pressure'),
    visibility: document.getElementById('visibility'),
    uvIndex: document.getElementById('uvIndex'),
    hourlyForecast: document.getElementById('hourlyForecast'),
    weeklyForecast: document.getElementById('weeklyForecast'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    unitBtns: document.querySelectorAll('.unit-btn'),
    locationModal: document.getElementById('locationModal'),
    allowLocation: document.getElementById('allowLocation'),
    denyLocation: document.getElementById('denyLocation')
};

// State
let currentUnit = 'metric';
let currentWeatherData = null;
let isGettingLocation = false;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // Check if we have saved location preference
    const savedLocation = localStorage.getItem('lastLocation');
    if (savedLocation) {
        fetchWeatherData(savedLocation);
        elements.cityInput.value = savedLocation;
    } else {
        fetchWeatherData('Mumbai');
    }
    
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    elements.searchBtn.addEventListener('click', handleSearch);
    elements.cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    
    elements.locationBtn.addEventListener('click', handleLocationRequest);
    
    elements.allowLocation.addEventListener('click', () => {
        elements.locationModal.style.display = 'none';
        getCurrentLocation();
    });
    
    elements.denyLocation.addEventListener('click', () => {
        elements.locationModal.style.display = 'none';
    });
    
    elements.unitBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.unitBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentUnit = btn.dataset.unit;
            if (currentWeatherData) {
                updateWeatherDisplay(currentWeatherData);
            }
        });
    });
}

// Handle Location Request
function handleLocationRequest() {
    if (!navigator.geolocation) {
        showNotification('Geolocation is not supported by your browser', 'error');
        return;
    }
    
    elements.locationModal.style.display = 'flex';
}

// Get Current Location
function getCurrentLocation() {
    if (isGettingLocation) return;
    
    isGettingLocation = true;
    elements.locationBtn.classList.add('loading');
    showLoading();
    
    const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    };
    
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;
            
            try {
                await fetchWeatherByCoords(latitude, longitude);
                
                const cityName = await getCityNameFromCoords(latitude, longitude);
                elements.cityInput.value = cityName;
                
                localStorage.setItem('lastLocation', cityName);
                
                showNotification(`📍 Weather updated for ${cityName}`, 'success');
                
            } catch (error) {
                console.error('Error fetching weather:', error);
                showNotification('Unable to fetch weather for your location', 'error');
            } finally {
                isGettingLocation = false;
                elements.locationBtn.classList.remove('loading');
                hideLoading();
            }
        },
        (error) => {
            isGettingLocation = false;
            elements.locationBtn.classList.remove('loading');
            hideLoading();
            
            let errorMessage = 'Unable to get your location. ';
            
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage += 'Please enable location permissions in your browser settings.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage += 'Location information is unavailable.';
                    break;
                case error.TIMEOUT:
                    errorMessage += 'Location request timed out. Please try again.';
                    break;
                default:
                    errorMessage += 'An unknown error occurred.';
            }
            
            showNotification(errorMessage, 'error');
        },
        options
    );
}

// Fetch Weather by Coordinates
async function fetchWeatherByCoords(lat, lon) {
    try {
        const currentResponse = await fetch(
            `${BASE_URL}/weather?lat=${lat}&lon=${lon}&units=${currentUnit}&appid=${API_KEY}`
        );
        
        if (!currentResponse.ok) {
            throw new Error('Weather data not found');
        }
        
        const currentData = await currentResponse.json();
        
        const forecastResponse = await fetch(
            `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=${currentUnit}&appid=${API_KEY}`
        );
        const forecastData = await forecastResponse.json();
        
        const uvResponse = await fetch(
            `${BASE_URL}/uvi?lat=${lat}&lon=${lon}&appid=${API_KEY}`
        );
        const uvData = await uvResponse.json();
        
        currentWeatherData = {
            ...currentData,
            uv: uvData.value,
            forecast: forecastData
        };
        
        updateWeatherDisplay(currentWeatherData);
        
    } catch (error) {
        throw error;
    }
}

// Get City Name from Coordinates
async function getCityNameFromCoords(lat, lon) {
    try {
        const response = await fetch(
            `${BASE_URL}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
        );
        const data = await response.json();
        return `${data.name}, ${data.sys.country}`;
    } catch (error) {
        return 'Your Location';
    }
}

// Handle Search
function handleSearch() {
    const city = elements.cityInput.value.trim();
    if (city) {
        fetchWeatherData(city);
        localStorage.setItem('lastLocation', city);
    }
}

// Show/Hide Loading
function showLoading() {
    elements.loadingOverlay.style.display = 'flex';
}

function hideLoading() {
    elements.loadingOverlay.style.display = 'none';
}

// Show Notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Update DateTime
function updateDateTime() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    elements.currentDate.textContent = now.toLocaleDateString('en-US', options);
}

// Fetch Weather Data by City Name
async function fetchWeatherData(city) {
    showLoading();
    
    try {
        const currentResponse = await fetch(
            `${BASE_URL}/weather?q=${city}&units=${currentUnit}&appid=${API_KEY}`
        );
        
        if (!currentResponse.ok) {
            throw new Error('City not found');
        }
        
        const currentData = await currentResponse.json();
        
        const forecastResponse = await fetch(
            `${BASE_URL}/forecast?q=${city}&units=${currentUnit}&appid=${API_KEY}`
        );
        const forecastData = await forecastResponse.json();
        
        const { lat, lon } = currentData.coord;
        const uvResponse = await fetch(
            `${BASE_URL}/uvi?lat=${lat}&lon=${lon}&appid=${API_KEY}`
        );
        const uvData = await uvResponse.json();
        
        currentWeatherData = {
            ...currentData,
            uv: uvData.value,
            forecast: forecastData
        };
        
        updateWeatherDisplay(currentWeatherData);
        
    } catch (error) {
        showNotification('City not found. Please try again.', 'error');
        console.error('Error:', error);
    } finally {
        hideLoading();
    }
}

// Update Weather Display
function updateWeatherDisplay(data) {
    elements.cityName.textContent = `${data.name}, ${data.sys.country}`;
    elements.temperature.textContent = Math.round(data.main.temp);
    elements.weatherDescription.textContent = data.weather[0].description;
    elements.tempMax.textContent = Math.round(data.main.temp_max);
    elements.tempMin.textContent = Math.round(data.main.temp_min);
    
    updateWeatherIcon(elements.weatherIcon, data.weather[0].id, data.weather[0].icon);
    
    const unitSymbol = currentUnit === 'metric' ? 'C' : 'F';
    elements.feelsLike.textContent = `${Math.round(data.main.feels_like)}°${unitSymbol}`;
    elements.windSpeed.textContent = `${Math.round(data.wind.speed * 3.6)} km/h`;
    elements.humidity.textContent = `${data.main.humidity}%`;
    elements.pressure.textContent = `${data.main.pressure} hPa`;
    elements.visibility.textContent = `${(data.visibility / 1000).toFixed(1)} km`;
    
    const uvValue = data.uv || 0;
    const uvLevel = getUVLevel(uvValue);
    elements.uvIndex.textContent = `${uvValue} (${uvLevel})`;
    
    updateBackgroundGradient(data.weather[0].id);
    
    updateHourlyForecast(data.forecast.list);
    updateWeeklyForecast(data.forecast.list);
}

// Update Weather Icon
function updateWeatherIcon(element, weatherId, iconCode) {
    const iconMap = {
        '01d': 'wi-day-sunny',
        '01n': 'wi-night-clear',
        '02d': 'wi-day-cloudy',
        '02n': 'wi-night-alt-cloudy',
        '03d': 'wi-cloud',
        '03n': 'wi-cloud',
        '04d': 'wi-cloudy',
        '04n': 'wi-cloudy',
        '09d': 'wi-showers',
        '09n': 'wi-showers',
        '10d': 'wi-day-rain',
        '10n': 'wi-night-alt-rain',
        '11d': 'wi-thunderstorm',
        '11n': 'wi-thunderstorm',
        '13d': 'wi-snow',
        '13n': 'wi-snow',
        '50d': 'wi-fog',
        '50n': 'wi-fog'
    };
    
    element.className = `wi ${iconMap[iconCode] || 'wi-na'}`;
}

// Get UV Level Text
function getUVLevel(uv) {
    if (uv <= 2) return 'Low';
    if (uv <= 5) return 'Moderate';
    if (uv <= 7) return 'High';
    if (uv <= 10) return 'Very High';
    return 'Extreme';
}

// Update Background Gradient
function updateBackgroundGradient(weatherId) {
    const gradients = {
        thunderstorm: 'linear-gradient(135deg, #283048 0%, #859398 100%)',
        drizzle: 'linear-gradient(135deg, #3a7bd5 0%, #3a6073 100%)',
        rain: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
        snow: 'linear-gradient(135deg, #e6dada 0%, #274046 100%)',
        clear: 'linear-gradient(135deg, #f5af19 0%, #f12711 100%)',
        clouds: 'linear-gradient(135deg, #bdc3c7 0%, #2c3e50 100%)',
        default: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    };
    
    let gradient = gradients.default;
    
    if (weatherId >= 200 && weatherId < 300) gradient = gradients.thunderstorm;
    else if (weatherId >= 300 && weatherId < 400) gradient = gradients.drizzle;
    else if (weatherId >= 500 && weatherId < 600) gradient = gradients.rain;
    else if (weatherId >= 600 && weatherId < 700) gradient = gradients.snow;
    else if (weatherId === 800) gradient = gradients.clear;
    else if (weatherId > 800) gradient = gradients.clouds;
    
    document.body.style.background = gradient;
}

// Update Hourly Forecast
function updateHourlyForecast(forecastList) {
    elements.hourlyForecast.innerHTML = '';
    
    const next24Hours = forecastList.slice(0, 8);
    
    next24Hours.forEach(item => {
        const time = new Date(item.dt * 1000);
        const hourItem = document.createElement('div');
        hourItem.className = 'hourly-item';
        
        hourItem.innerHTML = `
            <div class="hourly-time">${time.getHours()}:00</div>
            <div class="hourly-icon">
                <i class="wi ${getWeatherIconClass(item.weather[0].icon)}"></i>
            </div>
            <div class="hourly-temp">${Math.round(item.main.temp)}°</div>
        `;
        
        elements.hourlyForecast.appendChild(hourItem);
    });
}

// Update Weekly Forecast
function updateWeeklyForecast(forecastList) {
    elements.weeklyForecast.innerHTML = '';
    
    const dailyData = {};
    
    forecastList.forEach(item => {
        const date = new Date(item.dt * 1000);
        const day = date.toLocaleDateString('en-US', { weekday: 'short' });
        
        if (!dailyData[day]) {
            dailyData[day] = {
                temps: [],
                icons: [],
                descriptions: []
            };
        }
        
        dailyData[day].temps.push(item.main.temp);
        dailyData[day].icons.push(item.weather[0].icon);
        dailyData[day].descriptions.push(item.weather[0].description);
    });
    
    Object.entries(dailyData).slice(0, 7).forEach(([day, data]) => {
        const maxTemp = Math.max(...data.temps);
        const minTemp = Math.min(...data.temps);
        const avgTemp = (maxTemp + minTemp) / 2;
        const mostFrequentIcon = getMostFrequent(data.icons);
        
        const weeklyItem = document.createElement('div');
        weeklyItem.className = 'weekly-item';
        
        weeklyItem.innerHTML = `
            <div class="weekly-day">${day}</div>
            <div class="weekly-icon">
                <i class="wi ${getWeatherIconClass(mostFrequentIcon)}"></i>
            </div>
            <div class="weekly-temp-range">
                <span>${Math.round(minTemp)}°</span>
                <div class="temp-bar">
                    <div class="temp-bar-fill" style="width: ${((avgTemp - minTemp) / (maxTemp - minTemp)) * 100}%"></div>
                </div>
                <span>${Math.round(maxTemp)}°</span>
            </div>
            <div class="weekly-temp">${Math.round(avgTemp)}°</div>
        `;
        
        elements.weeklyForecast.appendChild(weeklyItem);
    });
}

// Helper Functions
function getWeatherIconClass(iconCode) {
    const iconMap = {
        '01d': 'wi-day-sunny',
        '01n': 'wi-night-clear',
        '02d': 'wi-day-cloudy',
        '02n': 'wi-night-alt-cloudy',
        '03d': 'wi-cloud',
        '03n': 'wi-cloud',
        '04d': 'wi-cloudy',
        '04n': 'wi-cloudy',
        '09d': 'wi-showers',
        '09n': 'wi-showers',
        '10d': 'wi-day-rain',
        '10n': 'wi-night-alt-rain',
        '11d': 'wi-thunderstorm',
        '11n': 'wi-thunderstorm',
        '13d': 'wi-snow',
        '13n': 'wi-snow',
        '50d': 'wi-fog',
        '50n': 'wi-fog'
    };
    
    return iconMap[iconCode] || 'wi-na';
}

function getMostFrequent(arr) {
    return arr.sort((a, b) =>
        arr.filter(v => v === a).length - arr.filter(v => v === b).length
    ).pop();
}