document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================================
    // ⚠ نقطة نهاية الخادم الوسيط (Backend) ⚠
    // يجب تغيير هذا الرابط إلى رابط الإنتاج الخاص بك (مثلاً: https://api.yourdomain.com/...)
    // ==========================================================
    const BACKEND_API_ENDPOINT = "http://127.0.0.1:5000/api/get_agri_data"; 
    
    // ==========================================================
    // مراجع عناصر الـ HTML
    // ==========================================================
    const latInput = document.getElementById('lat-input');
    const lonInput = document.getElementById('lon-input');
    const polygonInput = document.getElementById('polygon-input'); // حقل البوليجون الجديد
    const fetchDataButton = document.getElementById('fetch-data-button');
    const dashboardContent = document.getElementById('dashboard-content');
    const locationStatus = document.getElementById('location-status');

    // مراجع KPIs
    const kpiHealth = document.getElementById('kpi-health');
    const kpiMoisture = document.getElementById('kpi-moisture');
    const kpiWeather = document.getElementById('kpi-weather');
    const kpiLocation = document.getElementById('kpi-location');
    const alertList = document.getElementById('alert-list');
    const suggestedAction = document.getElementById('suggested-action');
    const lastAnalysis = document.getElementById('last-analysis');


    let ndviChartInstance = null;
    let moistureChartInstance = null;
    let currentInterval = null;


    // -----------------------------------------------------------------
    // 1. دالة توليد بيانات المحاكاة (كاحتياطي)
    // -----------------------------------------------------------------
    // ملاحظة: هذه الدالة يتم استدعاؤها في الـ Frontend في حالة فشل الاتصال بالخادم الوسيط نفسه
    // أما في حالة فشل Sentinel Hub API، فإن الـ Backend (app.py) هو من يرسل بيانات محاكاة.
    function generateMockData() {
        const ndviData = Array.from({ length: 6 }, () => (Math.random() * (0.85 - 0.40) + 0.40).toFixed(4)); 
        const latestNDVI = parseFloat(ndviData[ndviData.length - 1]);
        const moistureData = Array.from({ length: 6 }, () => Math.floor(Math.random() * (70 - 30) + 30));
        const latestMoisture = moistureData[moistureData.length - 1];
        
        const alerts = [];
        if (latestNDVI < 0.5) {
            alerts.push(`**تنبيه NDVI حرج (محاكاة):** انخفاض صحة المحصول (${latestNDVI}). يرجى فحص التسميد.`);
        }
        
        return {
            ndvi_values: ndviData,
            latest_ndvi: latestNDVI.toFixed(4),
            moisture_estimate: latestMoisture,
            weatherForecast: "صافٍ (محاكاة)",
            alerts: alerts.length > 0 ? alerts : ["لا توجد تنبيهات تستدعي القلق."],
            action: "استمر في جدول الري والتسميد الحالي (بيانات محاكاة).",
            analysis_timestamp: new Date().toLocaleTimeString('ar-EG'),
            is_mock: true
        };
    }


    // -----------------------------------------------------------------
    // 2. دالة جلب البيانات من الخادم الوسيط (Backend)
    // -----------------------------------------------------------------
    async function fetchRealDataFromBackend(lat, lon, polygon) {
        
        // بناء الطلب لإرسال الإحداثيات والـ Polygon
        const params = new URLSearchParams({
            lat: lat || '', 
            lon: lon || '',
            polygon: polygon || '' 
        });
        
        const requestUrl = `${BACKEND_API_ENDPOINT}?${params.toString()}`;

        try {
            const response = await fetch(requestUrl);
            
            if (!response.ok) {
                // إذا فشل الاتصال بالخادم الوسيط نفسه (مثلاً 404 أو 500)
                throw new Error(`خطأ في الخادم الوسيط (HTTP ${response.status})`);
            }

            const backendData = await response.json();
            
            // تحقق من وجود خطأ في البيانات المُرسلة من الخادم (مثل خطأ API)
            if (backendData.error) {
                console.error("خطأ من الخادم:", backendData.error);
                locationStatus.textContent = `فشل التحليل: ${backendData.error}`;
                locationStatus.style.color = 'red';
                // إظهار المحتوى السابق أو إظهار رسالة خطأ
                return generateMockData();
            }
            
            // تحويل استجابة الخادم البسيطة إلى هيكل جاهز للتحديث
            return {
                ndvi_values: backendData.ndvi_values || [],
                latest_ndvi: backendData.latest_ndvi || '0.0000',
                moisture_estimate: backendData.moisture_estimate || 0,
                weatherForecast: backendData.weatherForecast || "صافٍ (تقدير)",
                alerts: [backendData.message], // نستخدم رسالة الحالة كجزء من التنبيهات
                action: (parseFloat(backendData.latest_ndvi) < 0.65) ? "يُوصى بإجراء فحص ميداني ومتابعة الري." : "استمر في جدولك المعتاد.",
                analysis_timestamp: backendData.analysis_timestamp,
                is_mock: backendData.is_mock || false
            };
            
        } catch (error) {
            console.error("فشل الاتصال بالخادم الوسيط (CORS/Network):", error);
            // العودة لبيانات المحاكاة في حالة فشل الشبكة أو الـ CORS
            locationStatus.textContent = "خطأ في الاتصال بالخادم (تأكد من تشغيل app.py).";
            locationStatus.style.color = 'red';
            return generateMockData();
        }
    }

    // -----------------------------------------------------------------
    // 3. دالة تحديث الإحصائيات الرئيسية والرسوم البيانية
    // -----------------------------------------------------------------
    function updateDashboard(data) {
        
        // تحديث شريط الإحصائيات (KPIs)
        kpiHealth.textContent = data.latest_ndvi;
        kpiMoisture.textContent = `${data.moisture_estimate}%`;
        kpiWeather.textContent = data.weatherForecast;
        lastAnalysis.textContent = data.analysis_timestamp;
        suggestedAction.textContent = data.action;

        // تحديث حالة البطاقة بناءً على NDVI
        const latestNDVIValue = parseFloat(data.latest_ndvi);
        const kpiHealthCard = kpiHealth.closest('.kpi-card');
        if (kpiHealthCard) {
            kpiHealthCard.className = `kpi-card ${latestNDVIValue < 0.5 ? 'status-danger' : (latestNDVIValue < 0.7) ? 'status-warning' : 'status-ok'}`;
        }

        // تحديث التنبيهات
        updateAlerts(data.alerts, data.is_mock);
        
        // التأكد من أن البيانات رقمية قبل الرسم
        const ndviDataNumbers = data.ndvi_values.map(v => parseFloat(v));
        const moistureDataNumbers = [/* قائمة رطوبة 6 قيم */ 40, 45, 48, 46, 50, data.moisture_estimate];

        renderNDVIChart(ndviDataNumbers);
        renderMoistureChart(moistureDataNumbers);
    }
    
    // ... (باقي دوال المساعدة: updateAlerts, renderNDVIChart, renderMoistureChart) ...
    function updateAlerts(alerts, isMock) {
        alertList.innerHTML = '';
        if (isMock) {
            alerts.unshift('<li>*تنبيه:* يتم استخدام بيانات محاكاة.</li>');
        }
        alerts.forEach(alertText => {
            const li = document.createElement('li');
            li.innerHTML = alertText;
            alertList.appendChild(li);
        });
    }

    function renderNDVIChart(ndviData) {
        const ctx = document.getElementById('ndviChart').getContext('2d');
        const labels = ['أ-6', 'أ-5', 'أ-4', 'أ-3', 'أ-2', 'أ-1']; 

        if (ndviChartInstance) { ndviChartInstance.destroy(); }
        
        ndviChartInstance = new Chart(ctx, {
            type: 'line', data: { labels: labels, datasets: [{
                label: 'NDVI (مؤشر صحة المحصول)', data: ndviData, 
                borderColor: 'rgb(56, 142, 60)', backgroundColor: 'rgba(56, 142, 60, 0.1)',
                tension: 0.4, fill: true,
            }]},
            options: { scales: { y: { min: 0.3, max: 0.9, title: { display: true, text: 'قيمة NDVI' }}}}
        });
    }

    function renderMoistureChart(moistureData) {
        const ctx = document.getElementById('soilMoistureChart').getContext('2d');
        const labels = ['أ-6', 'أ-5', 'أ-4', 'أ-3', 'أ-2', 'أ-1']; 

        if (moistureChartInstance) { moistureChartInstance.destroy(); }
        
        moistureChartInstance = new Chart(ctx, {
            type: 'bar', data: { labels: labels, datasets: [{
                label: 'الرطوبة المقدرة (%)',
                data: moistureData, backgroundColor: 'rgba(66, 165, 245, 0.7)',
            }]},
            options: { scales: { y: { min: 20, max: 80, title: { display: true, text: 'الرطوبة (%)' }}}}
        });
    }


    // -----------------------------------------------------------------
    // 4. دالة الجلب والبدء بالتحديث الدوري
    // -----------------------------------------------------------------
    async function fetchAndStartUpdate(lat, lon, polygon) {
        
        // إيقاف التحديث الدوري السابق
        if (currentInterval) {
            clearInterval(currentInterval);
        }
        
        // إظهار حالة التحميل
        locationStatus.textContent = "جاري تحليل المنطقة...";
        locationStatus.style.color = 'blue';
        dashboardContent.style.display = 'none';

        // جلب أول دفعة من البيانات
        const data = await fetchRealDataFromBackend(lat, lon, polygon); 

        // إظهار لوحة التحكم وتحديثها بالبيانات الجديدة
        dashboardContent.style.display = 'block';
        kpiLocation.textContent = polygon ? 'البوليجون المُدخل' : `${lat}, ${lon}`;
        updateDashboard(data); 

        locationStatus.textContent = data.is_mock ? 'تم تحميل البيانات (باستخدام محاكاة).' : `${data.message}`;
        locationStatus.style.color = data.is_mock ? 'orange' : 'green';
        
        // بدء التحديث الدوري كل 5 دقائق
        currentInterval = setInterval(async () => {
            const newData = await fetchRealDataFromBackend(lat, lon, polygon);
            updateDashboard(newData);
        }, 300000); 
    }


    // -----------------------------------------------------------------
    // 5. منطق النقر على الزر (المدخلات)
    // -----------------------------------------------------------------
    fetchDataButton.addEventListener('click', () => {
        const lat = latInput.value.trim();
        const lon = lonInput.value.trim();
        const polygon = polygonInput.value.trim();

        if (lat === "" && lon === "" && polygon === "") {
            locationStatus.textContent = "الرجاء إدخال إحداثيات أو بوليجون صالح.";
            locationStatus.style.color = 'red';
            return;
        }
        
        // التحقق من أن المستخدم لم يدخل نصاً غير رقمي في الإحداثيات الأساسية
        if ((lat && isNaN(lat)) || (lon && isNaN(lon))) {
             locationStatus.textContent = "الرجاء إدخال إحداثيات رقمية صالحة.";
             locationStatus.style.color = 'red';
             return;
        }

        // إطلاق عملية الجلب
        fetchAndStartUpdate(lat, lon, polygon);
    });

    latInput.focus(); 
});