/**
 * ========================================================================
 * js/dashboard.js - وظائف لوحة التحكم (رصد محلي + طقس OpenWeather)
 * ========================================================================
 */

// 1. المتغيرات العامة (Global Variables)
// ** الرجاء استبدال 'YOUR_OPENWEATHER_API_KEY' بالمفتاح الفعلي الخاص بك **
const OPEN_WEATHER_API_KEY = 'df0e2b56de4d0d5b15811140a100fcc7';
const LOCAL_STORAGE_KEY = 'smart_agri_local_readings';

// العناصر الأساسية في الصفحة
const latInput = document.getElementById('lat-input');
const lonInput = document.getElementById('lon-input');
const dateInput = document.getElementById('date-input');
const ndviInput = document.getElementById('ndvi-input');
const moistureInput = document.getElementById('moisture-input');

const saveDataButton = document.getElementById('save-data-button');
const fetchWeatherButton = document.getElementById('fetch-weather-button');
const resetDataButton = document.getElementById('reset-data-button');
const locationStatus = document.getElementById('location-status');

// متغيرات الرسوم البيانية (سيتم تهيئتها لاحقاً)
let ndviChartInstance = null;
let moistureChartInstance = null;
let weatherChartInstance = null;


// 2. الدالة الرئيسية للبدء (Event Listeners)
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('dashboard: DOMContentLoaded');
        // تعيين تاريخ اليوم كقيمة افتراضية
        if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);

        // تحميل البيانات عند بدء التشغيل
        loadLocalDataAndRender();

        // ربط الأزرار بشكل آمن (تجنب الأخطاء إن لم يكن العنصر موجودًا)
        if (saveDataButton) saveDataButton.addEventListener('click', saveManualData);
        else console.warn('saveDataButton not found');

        if (fetchWeatherButton) fetchWeatherButton.addEventListener('click', fetchOpenWeather);
        else console.warn('fetchWeatherButton not found');

        if (resetDataButton) resetDataButton.addEventListener('click', resetAllData);
        else console.warn('resetDataButton not found');

    } catch (err) {
        console.error('Error during dashboard init:', err);
        updateStatus('حدث خطأ أثناء تهيئة لوحة التحكم. راجع الكونسول للتفاصيل.', 'error');
    }
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
    try {
        const data = localStorage.getItem(LOCAL_STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.warn('Unable to access localStorage or parse data:', e);
        return [];
    }
}

// 5. تحميل وعرض البيانات المحلية
function loadLocalDataAndRender() {
    const readings = getLocalReadings();

    if (readings.length === 0) {
        const kpiHealthEl = document.getElementById('kpi-health');
        const kpiMoistureEl = document.getElementById('kpi-moisture');
        if (kpiHealthEl) kpiHealthEl.textContent = '--';
        if (kpiMoistureEl) kpiMoistureEl.textContent = '--';
        if (ndviChartInstance) ndviChartInstance.destroy();
        if (moistureChartInstance) moistureChartInstance.destroy();
        return;
    }

    // تحديث مؤشرات الأداء الرئيسية (KPIs) بناءً على آخر قراءة
    const latest = readings[readings.length - 1];
    const kpiHealthEl = document.getElementById('kpi-health');
    const kpiMoistureEl = document.getElementById('kpi-moisture');
    const kpiLocationEl = document.getElementById('kpi-location');
    if (kpiHealthEl) kpiHealthEl.textContent = (latest.ndvi * 100).toFixed(1) + '%';
    if (kpiMoistureEl) kpiMoistureEl.textContent = latest.moisture.toFixed(0) + '%';
    if (kpiLocationEl) kpiLocationEl.textContent = `رصد بتاريخ: ${latest.date}`;

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
            // اقرأ النص الخام لتفادي أخطاء JSON parsing إذا لم يكن هناك JSON
            const raw = await response.text().catch(() => '');
            let msg = `خطأ في الاتصال (كود: ${response.status})`;
            try {
                const errorData = raw ? JSON.parse(raw) : null;
                if (errorData && errorData.message) msg = errorData.message;
            } catch (e) {
                // raw ليس JSON
                if (raw) msg = raw;
            }
            console.error('OpenWeather non-ok response:', response.status, raw);
            throw new Error(msg);
        }

        const weatherData = await response.json();
        console.log('OpenWeather data received:', weatherData);
        updateWeatherAndRecommendations(weatherData);
        // رسم المخططات وتحديث بطاقة التفاصيل عندما نحصل على One Call كامل
        try {
            if (weatherData && weatherData.daily) drawWeatherChart(weatherData.daily);
            if (weatherData && weatherData.current && weatherData.daily && weatherData.daily.length > 0) updateWeatherDetailsCard(weatherData.current, weatherData.daily[0]);
        } catch (e) {
            console.warn('Error updating charts/details from OneCall data:', e);
        }

    } catch (error) {
        const errMsg = String(error && error.message ? error.message : error || 'Unknown error');
        console.error('fetchOpenWeather error:', errMsg);
        // إذا كانت رسالة الخطأ تتعلق بخطة One Call 3.0 نحاول حلًا بديلاً
        if (errMsg.includes('One Call 3.0') || errMsg.includes('One Call by Call')) {
            updateStatus('فشل جلب الطقس: مفتاحك لا يملك صلاحية One Call 3.0 أو الخطة غير مفعّلة. سأحاول جلب الطقس الحالي كحل بديل.', 'error');
            try {
                await fetchCurrentWeatherFallback(lat, lon);
            } catch (e) {
                console.error('Fallback current weather also failed:', e);
                updateStatus('فشل جلب الطقس (التجربة البديلة فشلت). راجع الكونسول للمزيد من التفاصيل.', 'error');
            }
            return;
        }

        updateStatus(`فشل جلب الطقس: ${errMsg}. تأكد من تفعيل مفتاح OpenWeather API 3.0.`, 'error');
    }
}

// دالة بديلة: جلب الطقس الحالي باستخدام API القديم (current weather) لعرض قيم أساسية
async function fetchCurrentWeatherFallback(lat, lon) {
    if (!lat || !lon) throw new Error('الإحداثيات غير مُدخلة');
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPEN_WEATHER_API_KEY}&units=metric&lang=ar`;
    const resp = await fetch(url);
    if (!resp.ok) {
        const raw = await resp.text().catch(() => '');
        throw new Error(raw || `HTTP ${resp.status}`);
    }
    const data = await resp.json();
    console.log('Fallback current weather data:', data);

    // جهّز كائنات بسيطة متوافقة مع updateWeatherDetailsCard
    const current = {
        temp: data.main && data.main.temp ? data.main.temp : null,
        wind_speed: data.wind && data.wind.speed ? data.wind.speed : 0,
        wind_deg: data.wind && data.wind.deg ? data.wind.deg : 0,
        humidity: data.main && data.main.humidity ? data.main.humidity : 0,
        clouds: data.clouds && data.clouds.all ? data.clouds.all : 0,
        weather: data.weather || [{ description: (data.weather && data.weather[0] && data.weather[0].description) || '' }]
    };

    const daily0 = {
        sunrise: data.sys && data.sys.sunrise ? data.sys.sunrise : Math.floor(Date.now() / 1000) - 3600 * 6,
        sunset: data.sys && data.sys.sunset ? data.sys.sunset : Math.floor(Date.now() / 1000) + 3600 * 12,
        temp: { min: data.main && data.main.temp_min ? data.main.temp_min : data.main.temp, max: data.main && data.main.temp_max ? data.main.temp_max : data.main.temp },
        uvi: 0
    };

    // تحديث واجهة المستخدم بالقيم التي حصلنا عليها
    try {
        updateWeatherDetailsCard(current, daily0);
        const avgTemp = current.temp != null ? Math.round(current.temp) : '--';
        const kpi = document.getElementById('kpi-weather-temp');
        if (kpi) kpi.textContent = current.temp != null ? `${avgTemp}°C` : '--';
        updateStatus('تم جلب بيانات الطقس الحالية بنجاح (حل بديل لأن One Call 3.0 غير متوفر).', 'success');
    } catch (e) {
        console.error('Error updating UI from fallback:', e);
        throw e;
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

// ---------------
// دالة إعادة ضبط البيانات والواجهة
// ---------------
function resetAllData() {
    if (!confirm('هل أنت متأكد من مسح جميع بيانات الرصد المحفوظة محلياً؟ لا يمكن التراجع عن هذا الإجراء.')) return;

    localStorage.removeItem(LOCAL_STORAGE_KEY);

    if (latInput) latInput.value = '';
    if (lonInput) lonInput.value = '';

    // إعادة تهيئة الواجهات
    const kpis = ['kpi-health', 'kpi-moisture', 'kpi-wind', 'kpi-weather-temp', 'kpi-location'];
    kpis.forEach(id => { const el = document.getElementById(id); if (el) el.textContent = '--'; });

    const alertList = document.getElementById('alert-list');
    if (alertList) alertList.innerHTML = '<li>ابدأ بإدخال أول قراءة يدوية.</li>';

    const suggested = document.getElementById('suggested-action');
    if (suggested) suggested.textContent = 'أدخل بياناتك للحصول على توصيات.';

    const last = document.getElementById('last-analysis');
    if (last) last.textContent = '--';

    // مسح القيم في بطاقة الطقس
    const weatherIds = ['current-temp-val', 'min-max-temp-val', 'weather-description', 'day-length', 'night-length', 'humidity-val', 'wind-speed-val', 'wind-dir-val', 'clouds-val'];
    weatherIds.forEach(id => { const el = document.getElementById(id); if (el) el.textContent = '--'; });

    // تدمير المخططات إن وُجدت
    if (ndviChartInstance) { try { ndviChartInstance.destroy(); } catch (e) { } ndviChartInstance = null; }
    if (moistureChartInstance) { try { moistureChartInstance.destroy(); } catch (e) { } moistureChartInstance = null; }

    updateStatus('تم مسح جميع بيانات الرصد والإعدادات المحلية.', 'info');
}

// دالة رسم مخطط توقعات الطقس الأسبوعي (تستخدم canvas id="weatherDetailsChart")
function drawWeatherChart(dailyData) {
    try {
        if (!dailyData || !Array.isArray(dailyData)) return;

        const labels = dailyData.map(d => {
            const dt = d.dt ? new Date(d.dt * 1000) : new Date();
            return dt.toLocaleDateString('ar-EG', { weekday: 'short', day: 'numeric' });
        });

        const maxTemps = dailyData.map(d => d.temp && d.temp.max ? d.temp.max : null);
        const minTemps = dailyData.map(d => d.temp && d.temp.min ? d.temp.min : null);
        // أحصل على سحُب اليوم (نسبة %) ومؤشر الأشعة فوق البنفسجية (UVI) إن توفر
        const cloudsPct = dailyData.map(d => (d.clouds != null ? d.clouds : (d.clouds_all != null ? d.clouds_all : 0)));
        const uviVals = dailyData.map(d => (d.uvi != null ? d.uvi : (d.uv_index != null ? d.uv_index : 0)));

        // دمر المخطط القديم إن وُجد
        if (weatherChartInstance) {
            try { weatherChartInstance.destroy(); } catch (e) { }
            weatherChartInstance = null;
        }

        const ctx = document.getElementById('weatherDetailsChart');
        if (!ctx) return;

        weatherChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'درجة الحرارة القصوى (°C)',
                        data: maxTemps,
                        borderColor: 'rgb(220, 80, 80)',
                        backgroundColor: 'rgba(220,80,80,0.15)',
                        tension: 0.2,
                        fill: true,
                        yAxisID: 'y'
                    },
                    {
                        label: 'درجة الحرارة الدنيا (°C)',
                        data: minTemps,
                        borderColor: 'rgb(80,130,220)',
                        backgroundColor: 'rgba(80,130,220,0.12)',
                        tension: 0.2,
                        fill: true,
                        yAxisID: 'y'
                    },
                    {
                        label: 'نسبة الغيوم (%)',
                        data: cloudsPct,
                        borderColor: 'rgb(120,120,120)',
                        backgroundColor: 'rgba(120,120,120,0.08)',
                        tension: 0.2,
                        fill: true,
                        yAxisID: 'y1'
                    },
                    {
                        label: 'مؤشر UV (UVI)',
                        data: uviVals,
                        borderColor: 'rgb(245,166,35)',
                        backgroundColor: 'rgba(245,166,35,0.08)',
                        tension: 0.2,
                        fill: false,
                        pointStyle: 'rectRot',
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: true } },
                scales: {
                    y: { beginAtZero: false, title: { display: true, text: 'درجة الحرارة (°C)' } },
                    y1: {
                        position: 'right',
                        beginAtZero: true,
                        ticks: { max: 100 },
                        title: { display: true, text: 'نسبة الغيوم (%) و UV' }
                    }
                }
            }
        });
    } catch (e) {
        console.warn('drawWeatherChart error:', e);
    }
}

// دالة لتحديث بطاقة تفاصيل الطقس الصغيرة و KPIs المرتبطة
function updateWeatherDetailsCard(current, daily0) {
    try {
        if (!current || !daily0) return;

        // درجة الحرارة الحالية ومتوسط اليوم
        const currentTemp = current.temp != null ? Math.round(current.temp) : '--';
        const minTemp = daily0.temp && daily0.temp.min != null ? Math.round(daily0.temp.min) : '--';
        const maxTemp = daily0.temp && daily0.temp.max != null ? Math.round(daily0.temp.max) : '--';

        const desc = current.weather && current.weather[0] && current.weather[0].description ? current.weather[0].description : '--';

        const sunrise = daily0.sunrise ? new Date(daily0.sunrise * 1000) : null;
        const sunset = daily0.sunset ? new Date(daily0.sunset * 1000) : null;
        const dayLength = (sunrise && sunset) ? ((sunset - sunrise) / 1000 / 3600) : null;
        const dayLengthStr = dayLength != null ? `${Math.floor(dayLength)}h ${Math.round((dayLength % 1) * 60)}m` : '--';
        const nightLengthStr = dayLength != null ? `${Math.floor(24 - dayLength)}h` : '--';

        const humidity = current.humidity != null ? `${current.humidity}%` : '--';
        const windSpeed = current.wind_speed != null ? `${current.wind_speed} m/s` : '--';
        const windDir = current.wind_deg != null ? degToCompass(current.wind_deg) : '--';
        const clouds = current.clouds != null ? `${current.clouds}%` : '--';

        const elCurrent = document.getElementById('current-temp-val');
        const elMinMax = document.getElementById('min-max-temp-val');
        const elDesc = document.getElementById('weather-description');
        const elDay = document.getElementById('day-length');
        const elNight = document.getElementById('night-length');
        const elHumidity = document.getElementById('humidity-val');
        const elWindSpeed = document.getElementById('wind-speed-val');
        const elWindDir = document.getElementById('wind-dir-val');
        const elClouds = document.getElementById('clouds-val');

        if (elCurrent) elCurrent.textContent = currentTemp !== '--' ? `${currentTemp}°C` : '--';
        if (elMinMax) elMinMax.textContent = `${minTemp}° / ${maxTemp}°`;
        if (elDesc) elDesc.textContent = desc;
        if (elDay) elDay.textContent = dayLengthStr;
        if (elNight) elNight.textContent = nightLengthStr;
        if (elHumidity) elHumidity.textContent = humidity;
        if (elWindSpeed) elWindSpeed.textContent = windSpeed;
        if (elWindDir) elWindDir.textContent = windDir;
        if (elClouds) elClouds.textContent = clouds;

        // تحديث KPIs
        const kpiTemp = document.getElementById('kpi-weather-temp');
        if (kpiTemp && currentTemp !== '--') kpiTemp.textContent = `${currentTemp}°C`;

        const kpiWind = document.getElementById('kpi-wind');
        if (kpiWind) kpiWind.textContent = windSpeed !== '--' ? windSpeed : '--';

    } catch (e) {
        console.warn('updateWeatherDetailsCard error:', e);
    }
}

// مساعدة لتحويل اتجاه الرياح من درجات إلى اتجاهات بوصفية
function degToCompass(num) {
    // نستخدم 8 اتجاهات لتسمية أبسط وواضحة بالعربية
    if (num == null || isNaN(num)) return '--';
    const val = Math.floor((num / 45) + 0.5) % 8;
    const arr = ['شمالي', 'شمالي شرقي', 'شرقي', 'جنوب شرقي', 'جنوبي', 'جنوبي غربي', 'غربي', 'شمالي غربي'];
    return arr[val];
}