# =========================================================================
# GEE Python Serverless Function (api/gee-analysis.py) - مُحسَّن لـ Vercel
# الوظيفة: استقبال GeoJSON، تحليل Sentinel-2 (NDVI & NDWI)، وإرجاع بيانات أسبوعية
# =========================================================================

import ee
import json
import datetime
from http.server import BaseHTTPRequestHandler
import os
import tempfile

# ---------------------------------------------------
# دالة المصادقة والتهيئة
# ---------------------------------------------------
def initialize_gee_service_account():
    """
    يقوم بإنشاء ملف مفتاح الخدمة المؤقت للمصادقة في بيئة Vercel.
    """
    gee_key_secret = os.environ.get('GEE_KEY_SECRET')
    
    if not gee_key_secret:
        raise EnvironmentError("متغير البيئة GEE_KEY_SECRET غير موجود أو فارغ.")

    # نستخدم ملف مؤقت لفك تشفير المفتاح السري، وهو ما تفضله GEE
    with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json') as temp_file:
        temp_file.write(gee_key_secret)
        key_path = temp_file.name

    try:
        # المصادقة باستخدام ملف المفتاح المؤقت
        ee.Initialize(service_account_file=key_path)
        return True
    except Exception as e:
        raise Exception(f"فشل تهيئة GEE: تأكد من صحة محتوى مفتاح JSON في المتغير السري. الخطأ: {e}")
    finally:
        # حذف الملف المؤقت بعد الاستخدام
        os.remove(key_path)
        
# ---------------------------------------------------
# دالة تحليل GEE الأساسية
# ---------------------------------------------------
def run_gee_analysis(geojson_input):
    """ تنفذ تحليل NDVI والمحتوى المائي (NDWI) لـ 6 أشهر أسبوعياً. """
    
    # 1. تحديد النطاق والمنطقة
    try:
        area_of_interest = ee.FeatureCollection(json.loads(geojson_input)).geometry()
    except Exception:
        raise ValueError("GeoJSON المُرسل غير صالح. يرجى التحقق من التنسيق.")
    
    # حساب نطاق التاريخ لـ 6 أشهر سابقة
    end_date = ee.Date(datetime.datetime.now())
    start_date = end_date.advance(-6, 'month')

    # 2. تصفية صور Sentinel-2
    s2_collection = (
        ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
        .filterDate(start_date, end_date)
        .filterBounds(area_of_interest)
        .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 10))  # سحب أقل من 10%
    )

    # 3. دالة لحساب NDVI و NDWI وإضافة المتوسطات إلى الصورة
    def add_indices(image):
        ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI')
        ndwi = image.normalizedDifference(['B8', 'B11']).rename('NDWI_Water')
        
        # دمج النطاقات وحساب الإحصائيات على المنطقة
        stats = image.addBands(ndvi).addBands(ndwi).reduceRegion(
            reducer=ee.Reducer.mean().setOutputs(['NDVI', 'NDWI_Water']),
            geometry=area_of_interest,
            scale=10, 
            maxPixels=1e9
        )
        
        return image.set({
            'date': image.date().format('YYYY-MM-dd'),
            'ndvi_mean': stats.get('NDVI'),
            'water_mean': stats.get('NDWI_Water')
        })

    collection_with_indices = s2_collection.map(add_indices)

    # 4. التجميع الأسبوعي والحصول على النتيجة
    n_weeks = end_date.difference(start_date, 'week').round().getInfo()
    
    weekly_results = []
    
    for i in range(int(n_weeks)):
        start = start_date.advance(i, 'week')
        
        # اختيار أول صورة في هذا الأسبوع للحصول على البيانات المحسوبة
        filtered_week = collection_with_indices.filterDate(start, start.advance(1, 'week'))
        
        if filtered_week.size().getInfo() > 0:
            first_image = filtered_week.first() 
            
            # يجب استخدام .getInfo() للحصول على القيمة النهائية
            ndvi_val = first_image.get('ndvi_mean').getInfo()
            water_val = first_image.get('water_mean').getInfo()
            
            # إذا كانت القيمة صالحة (ليست None)
            if ndvi_val is not None and water_val is not None:
                 weekly_results.append({
                    'date': start.format('YYYY-MM-dd').getInfo(),
                    'ndvi_mean': round(ndvi_val, 4), # تقريب النتائج
                    'water_mean': round(water_val, 4)
                })
            
    return weekly_results


# ---------------------------------------------------
# الـ Handler الخاص بـ Vercel Serverless Function
# ---------------------------------------------------
class handler(BaseHTTPRequestHandler):
    
    # دالة خاصة بمتطلبات CORS قبل الإرسال الفعلي
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-type', 'application/json')
        
        try:
            # 1. المصادقة أولاً
            initialize_gee_service_account()
            
            # 2. استقبال ومعالجة البيانات
            data = json.loads(post_data.decode('utf-8'))
            geojson_input = json.dumps(data.get('geojson')) # إعادة ترميزها للتأكد من أنها سلسلة نصية
            
            if not geojson_input:
                raise ValueError("GeoJSON input is missing.")

            # 3. تنفيذ التحليل
            analysis_results = run_gee_analysis(geojson_input)
            
            # 4. إرجاع النتيجة
            self.send_response(200)
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": True,
                "results": analysis_results,
                "message": "تحليل GEE اكتمل بنجاح"
            }).encode('utf-8'))

        except Exception as e:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(json.dumps({
                'success': False,
                'message': f"فشل في تحليل GEE: {str(e)}"
            }).encode('utf-8'))