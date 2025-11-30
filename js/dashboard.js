/**
 * ========================================================================
 * js/dashboard.js - وظائف لوحة التحكم (رصد محلي + طقس OpenWeather)
 * ========================================================================
 */

// 1. المتغيرات العامة (Global Variables)
// ** الرجاء استبدال 'YOUR_OPENWEATHER_API_KEY' بالمفتاح الفعلي الخاص بك **
const OPEN_WEATHER_API_KEY = 'df8e2b56de4d8b8b1581140a18fcc7'; 
const LOCAL_STORAGE_KEY = 'smart_agri_local_readings';

// العناصر الأساسية في الصفحة
const latInput = document.getElementById('lat-input');
const lonInput = document.getElementById('lon-input');
const dateInput = document.getElementById('date-input');
const ndviInput = document.getElementById('ndvi-input');
const moistureInput = document.getElementById('moisture-input');

const saveDataButton = document.getElementById('save-data-button');
const fetchWeatherButton = document.getElementById('fetch-weather-button');
const locationStatus = document.getElementById('location-status');

// متغيرات الرسوم البيانية (سيتم تهيئتها لاحقاً)
let ndviChartInstance = null;
let moistureChartInstance = null;


// 2. الدالة الرئيسية للبدء (Event Listeners)
document.addEventListener('DOMContentLoaded', () => {
    // تعيين تاريخ اليوم كقيمة افتراضية
    dateInput.value = new Date().toISOString().slice(0, 10);
    
    // تحميل البيانات عند بدء التشغيل
    loadLocalDataAndRender();
    
    // مراقبة النقر على زر حفظ القراءة
    saveDataButton.addEventListener('click', saveManualData);
    
    // مراقبة النقر على زر جلب الطقس
    fetchWeatherButton.addEventListener('click', fetchOpenWeather);
});


// =================================================================
// قسم التخزين المحلي والرسوم البيانية (Manual Data)
// =================================================================

// 3. دالة حفظ البيانات اليدوية
function saveManualData() {
    const date = dateInput.value;
    const ndvi = parseFloat(ndviInput.value);
    const moisture = parseFloat(moistureInput.value);
    
    if (!date || isNaN(ndvi) || isNaN(moisture)) {
        updateStatus('الرجاء إدخال تاريخ وقيم NDVI والرطوبة بشكل صحيح.', 'error');
        return;
    }
    
    if (ndvi < 0 || ndvi > 1 || moisture < 0 || moisture > 100) {
        updateStatus('تأكد أن NDVI بين 0 و 1، والرطوبة بين 0 و 100.', 'error');
        return;
    }
    
    // تهيئة القراءة الجديدة
    const newReading = { date, ndvi, moisture };
    
    // تحميل السجل الحالي
    let readings = getLocalReadings();
    
    // إضافة القراءة الجديدة (أو تحديث قراءة موجودة بنفس التاريخ)
    readings = readings.filter(r => r.date !== date);
    readings.push(newReading);
    
    // الفرز حسب التاريخ
    readings.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // حفظ السجل المحدث
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(readings));
    
    updateStatus('تم حفظ القراءة بنجاح. يتم تحديث الرسوم البيانية...', 'success');
    
    // إعادة التحميل لعرض التحديثات
    loadLocalDataAndRender();
}

// 4. دالة جلب البيانات المحلية
function getLocalReadings() {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

// 5. تحميل وعرض البيانات المحلية
function loadLocalDataAndRender() {
    const readings = getLocalReadings();
    
    if (readings.length === 0) {
        document.getElementById('kpi-health').textContent = '--';
        document.getElementById('kpi-moisture').textContent = '--';
        if(ndviChartInstance) ndviChartInstance.destroy();
        if(moistureChartInstance) moistureChartInstance.destroy();
        return;
    }
    
    // تحديث مؤشرات الأداء الرئيسية (KPIs) بناءً على آخر قراءة
    const latest = readings[readings.length - 1];
    document.getElementById('kpi-health').textContent = (latest.ndvi * 100).toFixed(1) + '%';
    document.getElementById('kpi-moisture').textContent = latest.moisture.toFixed(0) + '%';
    document.getElementById('kpi-location').textContent = `رصد بتاريخ: ${latest.date}`;
    
    // رسم المنحنيات
    drawCharts(readings);
    
    // تحديث التوصيات بناءً على NDVI والرطوبة
    updateManualRecommendations(latest);
}

// 6. دالة رسم الرسوم البيانية (Chart.js)
function drawCharts(data) {
    const dates = data.map(item => item.date);
    const ndviValues = data.map(item => item.ndvi);
    const moistureValues = data.map(item => item.moisture);
    
    // تدمير النسخ القديمة
    if (ndviChartInstance) ndviChartInstance.destroy();
    if (moistureChartInstance) moistureChartInstance.destroy();

    // رسم منحنى NDVI
    ndviChartInstance = new Chart(
        document.getElementById('ndviChart'),
        {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'مؤشر NDVI',
                    data: ndviValues,
                    borderColor: 'rgb(56, 118, 29)', 
                    tension: 0.1,
                    fill: false
                }]
            },
            options: { 
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, max: 1.0, title: { display: true, text: 'NDVI' } } }
            }
        }
    );
    
    // رسم منحنى الرطوبة
    moistureChartInstance = new Chart(
        document.getElementById('moistureChart'),
        {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'نسبة الرطوبة (%)',
                    data: moistureValues,
                    borderColor: 'rgb(74, 134, 232)', 
                    tension: 0.1,
                    fill: false
                }]
            },
            options: { 
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, max: 100, title: { display: true, text: 'الرطوبة %' } } }
            }
        }
    );
}

// 7. دالة التوصيات اليدوية
function updateManualRecommendations(latestReading) {
    let recommendations = '';
    
    // توصيات NDVI
    if (latestReading.ndvi < 0.4) {
        recommendations += `<li><i class="fas fa-times-circle"></i> تنبيه NDVI: القراءة منخفضة جداً (${latestReading.ndvi})! يرجى فحص التسميد والتغذية.</li>`;
    } else if (latestReading.ndvi < 0.6) {
        recommendations += `<li><i class="fas fa-exclamation-triangle"></i> تنبيه NDVI: القراءة متوسطة إلى منخفضة. قد تحتاج لدفعة من النيتروجين.</li>`;
    } else {
         recommendations += `<li><i class="fas fa-check-circle"></i> NDVI: صحة المحصول جيدة جداً (${latestReading.ndvi})، استمر بالرعاية.</li>`;
    }
    
    // توصيات الرطوبة
    if (latestReading.moisture < 30) {
        recommendations += `<li><i class="fas fa-tint"></i> تنبيه الرطوبة: التربة جافة جداً (${latestReading.moisture}%)! يجب زيادة كمية و/أو تكرار الري فوراً.</li>`;
    } else if (latestReading.moisture > 75) {
        recommendations += `<li><i class="fas fa-water"></i> تنبيه الرطوبة: التربة مشبعة جداً (${latestReading.moisture}%)! يجب تقليل الري لتجنب تعفن الجذور.</li>`;
    }
    
    // قم بتحديث قائمة التنبيهات بالكامل (سيتم إضافة توصيات الطقس إليها لاحقاً)
    document.getElementById('alert-list').innerHTML = recommendations;
}


// =================================================================
// قسم الطقس (OpenWeather API)
// =================================================================

// 8. دالة جلب بيانات OpenWeather
async function fetchOpenWeather() {
    const lat = latInput.value;
    const lon = lonInput.value;

    if (!OPEN_WEATHER_API_KEY || !lat || !lon) {
        updateStatus('الرجاء إدخال إحداثيات صالحة و التأكد من مفتاح OpenWeather API.', 'error');
        return;
    }
    
    updateStatus('جارٍ جلب بيانات الطقس لمدة 7 أيام قادمة...', 'info');

    // One Call API 3.0: نجلب التوقعات اليومية لمدة 7 أيام
    const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely,hourly,alerts&appid=${OPEN_WEATHER_API_KEY}&units=metric&lang=ar`;

    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorData = await response.json();
             throw new Error(errorData.message || `خطأ في الاتصال (كود: ${response.status})`);
        }
        
        const weatherData = await response.json();
        updateWeatherAndRecommendations(weatherData);

    } catch (error) {
        updateStatus(`فشل جلب الطقس: ${error.message}. تأكد من تفعيل مفتاح OpenWeather API 3.0.`, 'error');
    }
}

// 9. تحديث بيانات الطقس والتوصيات
function updateWeatherAndRecommendations(weatherData) {
    const today = weatherData.daily[0];
    const dailyForecasts = weatherData.daily.slice(0, 7); 
    
    // تحديث KPI الطقس اليومي
    const avgTemp = (today.temp.day + today.temp.night) / 2;
    document.getElementById('kpi-weather-temp').textContent = `${avgTemp.toFixed(0)}°C`;
    
    // تحديث التوصيات (إضافة توصيات الطقس إلى قائمة التنبيهات الموجودة)
    let weatherRecommendations = '';
    
    const highTempDays = dailyForecasts.filter(day => day.temp.max > 35).length;
    const rainDays = dailyForecasts.filter(day => day.rain > 5).length; 

    if (highTempDays > 2) {
        weatherRecommendations += `<li><i class="fas fa-thermometer-three-quarters"></i> تنبيه حرارة: ${highTempDays} أيام حرارة عالية متوقعة (فوق 35°C). يوصى بزيادة طفيفة في الري الليلي أو التظليل.</li>`;
    } else if (rainDays > 0) {
        weatherRecommendations += `<li><i class="fas fa-cloud-showers-heavy"></i> توقعات بأمطار: ${rainDays} يوم أمطار غزيرة متوقعة. يوصى بإيقاف الري والتأكد من التصريف.</li>`;
    }
    
    // تحديث قائمة التنبيهات: إضافة توصيات الطقس إلى القائمة الحالية
    document.getElementById('alert-list').innerHTML += weatherRecommendations;

    if (weatherRecommendations) {
        document.getElementById('suggested-action').textContent = "تم إصدار توصيات جديدة بناءً على الطقس.";
    } else {
        document.getElementById('suggested-action').textContent = "الوضع مستقر لـ 7 أيام. استمر في الرصد.";
    }

    document.getElementById('last-analysis').textContent = new Date().toLocaleDateString('ar-EG');
    
    updateStatus('اكتمل تحديث بيانات الطقس بنجاح.', 'success');
}


// 10. دالة مساعدة
function updateStatus(message, type = 'info') {
    locationStatus.textContent = message;
    locationStatus.className = `status-message ${type}`; 
}