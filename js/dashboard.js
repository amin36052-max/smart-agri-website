/**
 * ========================================================================
 * js/dashboard.js - وظائف لوحة التحكم الرئيسية (SMART AGRI)
 * * المهام:
 * 1. معالجة إدخال GeoJSON والتحقق من صحته.
 * 2. إخفاء/إظهار لوحة التحكم.
 * 3. استدعاء API GEE للحصول على بيانات NDVI والمحتوى المائي.
 * 4. استدعاء OpenWeatherMap للحصول على توقعات الطقس.
 * 5. رسم البيانات باستخدام Chart.js.
 * ========================================================================
 */

// 1. المتغيرات العامة (Global Variables)
// (هذه المتغيرات يجب استبدالها بمفاتيحك الحقيقية لاحقاً)
const OPEN_WEATHER_API_KEY = 'df8e2b56de4d8b8b1581140a18fcc7';
// العنوان (URL) الخاص بالخادم الوسيط الذي سيقوم بتشغيل أكواد GEE
const GEE_BACKEND_URL = 'https://smart-agri-website.vercel.app/api'; 
console.log('OpenWeather Key Loaded:', OPEN_WEATHER_API_KEY)
// العناصر الأساسية في الصفحة
const geojsonInput = document.getElementById('geojson-input');
const fetchDataButton = document.getElementById('fetch-data-button');
const locationStatus = document.getElementById('location-status');
const dashboardContent = document.getElementById('dashboard-content');
const geojsonSection = document.querySelector('.geojson-input-section');

// متغيرات الرسوم البيانية (سيتم تهيئتها لاحقاً)
let ndviChartInstance = null;
let waterChartInstance = null;


// 2. الدالة الرئيسية للبدء (Event Listeners)
document.addEventListener('DOMContentLoaded', () => {
    // تعطيل الزر في البداية
    fetchDataButton.disabled = true;
    updateStatus('الرجاء إدخال بيانات GeoJSON ثم اضغط "تحليل ورصد الموقع".', 'info');

    // مراقبة تغيير الـ textarea للتحقق من صحة GeoJSON
    geojsonInput.addEventListener('input', checkGeoJsonValidity);
    
    // مراقبة النقر على زر التحليل
    fetchDataButton.addEventListener('click', startAnalysis);
});


// 3. دالة التحقق من صحة GeoJSON
function checkGeoJsonValidity() {
    const geojsonString = geojsonInput.value.trim();
    if (!geojsonString) {
        fetchDataButton.disabled = true;
        updateStatus('يجب إدخال بيانات GeoJSON.', 'error');
        return;
    }
    
    try {
        const geojsonData = JSON.parse(geojsonString);
        // تحقق مبدئي من شكل GeoJSON (يجب أن يكون Feature أو FeatureCollection)
        if (geojsonData.type && (geojsonData.type === 'Feature' || geojsonData.type === 'FeatureCollection')) {
            fetchDataButton.disabled = false;
            updateStatus('تم التحقق من GeoJSON بنجاح.', 'success');
        } else {
            throw new Error('الكائن ليس GeoJSON صالحاً (يجب أن يكون Feature أو FeatureCollection).');
        }
    } catch (e) {
        fetchDataButton.disabled = true;
        updateStatus('خطأ: بيانات GeoJSON غير صالحة أو التنسيق غير سليم.', 'error');
    }
}


// 4. دالة بدء التحليل (عند الضغط على الزر)
async function startAnalysis() {
    // إخفاء الـ GeoJSON وإظهار لوحة التحكم
    geojsonSection.style.display = 'none';
    dashboardContent.style.display = 'block';
    updateStatus('جارٍ سحب وتحليل البيانات من الأقمار الصناعية ومن OpenWeather...', 'loading');

    const geojsonString = geojsonInput.value.trim();
    const geojsonData = JSON.parse(geojsonString);

    // استخلاص الإحداثيات المركزية للطقس (سنستخدمها للـ OpenWeather)
    const centerCoords = extractCenterCoordinates(geojsonData);

    try {
        // تشغيل المهام بالتوازي لتقليل وقت الانتظار
        const [geeResult, weatherResult] = await Promise.all([
            fetchGeeData(geojsonData),
            fetchOpenWeather(centerCoords)
        ]);

        // 1. تحديث بيانات GEE ورسم المنحنيات
        updateKpisAndCharts(geeResult);

        // 2. تحديث بيانات الطقس والتوصيات
        updateWeatherAndRecommendations(weatherResult);

        updateStatus('اكتمل التحليل بنجاح.', 'success');
        
    } catch (error) {
        // في حال حدوث خطأ، نعرض رسالة خطأ ونعيد إظهار قسم الإدخال
        console.error("خطأ في التحليل:", error);
        updateStatus(`فشل التحليل: ${error.message}`, 'error');
        geojsonSection.style.display = 'block';
        dashboardContent.style.display = 'none';
    }
}


// 5. دوال جلب البيانات (يجب عليك إنشاء هذه الدوال على الخادم)

// 5.1 جلب بيانات GEE (NDVI والمحتوى المائي)
async function fetchGeeData(geojsonData) {
    // هذه الدالة تتطلب خادم وسيط (مثل Node.js أو PHP) لتنفيذ كود GEE
    const response = await fetch(GEE_BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ geojson: geojsonData, type: 'gee_analysis' })
    });

    if (!response.ok) {
        throw new Error(`فشل الاتصال بخادم GEE الوسيط: ${response.statusText}`);
    }
    return response.json();
}

// 5.2 جلب بيانات OpenWeather
async function fetchOpenWeather(coords) {
    if (!OPEN_WEATHER_API_KEY || !coords) {
         // نلقي خطأ لعدم وجود مفتاح
         throw new Error('مفتاح OpenWeather API غير موجود.');
    }
    
    const lat = coords.lat;
    const lon = coords.lon;
    
    // One Call API 3.0: نجلب التوقعات اليومية لمدة 7 أيام
    const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=current,minutely,hourly,alerts&appid=${OPEN_WEATHER_API_KEY}&units=metric&lang=ar`;

    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`فشل جلب بيانات الطقس: ${response.statusText}`);
    }
    return response.json();
}


// 6. دوال مساعدة (Helper Functions)

// 6.1 تحديث حالة الإدخال
function updateStatus(message, type = 'info') {
    locationStatus.textContent = message;
    locationStatus.className = `status-message ${type}`; // info, success, error, loading
}

// 6.2 استخلاص الإحداثيات المركزية (لتبسيط الأمر، نأخذ نقطة عشوائية من الـ GeoJSON)
function extractCenterCoordinates(geojsonData) {
    try {
        let geometry;

        // 1. تحديد الهندسة (Geometry)
        if (geojsonData.type === 'FeatureCollection' && geojsonData.features.length > 0) {
            // إذا كان FeatureCollection، نأخذ أول ميزة (Feature)
            geometry = geojsonData.features[0].geometry;
        } else if (geojsonData.type === 'Feature') {
            // إذا كان Feature، نأخذ الهندسة مباشرة
            geometry = geojsonData.geometry;
        } else {
            return null; // لا يوجد Feature أو FeatureCollection صالح
        }

        // 2. التحقق من نوع الهندسة (يجب أن يكون Polygon)
        if (geometry.type !== 'Polygon') {
            throw new Error("نوع الهندسة يجب أن يكون 'Polygon' لاستخلاص المركز.");
        }

        // 3. استخلاص أول نقطة (النقطة المركزية التقريبية)
        // المسار: coordinates[الحلقة الخارجية][أول نقطة]
        const coordinates = geometry.coordinates[0][0]; 
        
        // GeoJSON يستخدم الترتيب [lon, lat]
        // يجب أن نرجع {lat, lon}
        return { lat: coordinates[1], lon: coordinates[0] }; 
    } catch (e) {
        console.error("خطأ في استخلاص الإحداثيات المركزية:", e.message);
        return null;
    }
}

// 6.3 تحديث مؤشرات الأداء الرئيسية والرسوم البيانية (KPIs & Charts)
function updateKpisAndCharts(geeData) {
    
    // مثال على تحديث KPI (يجب أن يتم تعديل هذه الوظيفة بناءً على شكل بيانات GEE المرتجعة)
    const latestData = geeData.results.slice(-1)[0]; // آخر قراءة

    document.getElementById('kpi-health').textContent = (latestData.ndvi_mean * 100).toFixed(1) + '%';
    document.getElementById('kpi-water').textContent = (latestData.water_mean * 100).toFixed(1) + '%';
    document.getElementById('kpi-location').textContent = 'تم التحليل';

    // 6.4 رسم البيانات (NDVI و Water)
    // استدعاء دالة الرسم
    drawCharts(geeData.results);
}


// 6.5 تحديث بيانات الطقس والتوصيات
function updateWeatherAndRecommendations(weatherData) {
    // مثال على تحديث KPI الطقس اليومي
    const today = weatherData.daily[0];

    document.getElementById('kpi-weather-temp').textContent = `${today.temp.day.toFixed(0)}°C`;

    // مثال على إضافة توصية ري بسيطة بناءً على الطقس
    let recommendation = 'الوضع مستقر. استمر في جدول الري المعتاد.';
    if (today.temp.day > 35) {
        recommendation = '⚠️ توقعات بحرارة عالية! يوصى بزيادة طفيفة في الري أو التظليل.';
    } else if (today.rain > 5) {
        recommendation = '🌧️ توقعات بأمطار غزيرة. يوصى بإيقاف الري ليوم أو يومين.';
    }
    
    document.getElementById('suggested-action').textContent = recommendation;
    document.getElementById('last-analysis').textContent = new Date().toLocaleDateString('ar-EG');
    
    // يمكنك إضافة المزيد من المنطق والتوصيات هنا
}


// 6.6 دالة رسم الرسوم البيانية (Chart.js)
function drawCharts(data) {
    const dates = data.map(item => item.date);
    const ndviValues = data.map(item => item.ndvi_mean);
    const waterValues = data.map(item => item.water_mean);
    
    // تدمير النسخ القديمة لتجنب تكرار الرسوم
    if (ndviChartInstance) ndviChartInstance.destroy();
    if (waterChartInstance) waterChartInstance.destroy();

    // رسم منحنى NDVI
    ndviChartInstance = new Chart(
        document.getElementById('ndviChart'),
        {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'متوسط NDVI الأسبوعي',
                    data: ndviValues,
                    borderColor: 'rgb(56, 118, 29)', // لون أخضر أساسي
                    tension: 0.1,
                    fill: false
                }]
            },
            options: { 
                responsive: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: false, title: { display: true, text: 'NDVI' } }
                }
            }
        }
    );
    
    // رسم منحنى المحتوى المائي
    waterChartInstance = new Chart(
        document.getElementById('waterContentChart'),
        {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'المحتوى المائي (NDWI) الأسبوعي',
                    data: waterValues,
                    borderColor: 'rgb(74, 134, 232)', // لون أزرق
                    tension: 0.1,
                    fill: false
                }]
            },
            options: { 
                responsive: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: false, title: { display: true, text: 'NDWI' } }
                }
            }
        }
    );
}