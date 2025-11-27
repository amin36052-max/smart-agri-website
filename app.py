# app.py - الخادم الوسيط لـ SMART AGRI (باستخدام Python و Sentinel Hub)

from flask import Flask, request, jsonify
from flask_cors import CORS
import json
from datetime import datetime, timedelta
import random

# مكتبات Sentinel Hub
from sentinelhub import SHConfig, SentinelHubStatistical, BBox, CRS
from sentinelhub import DataCollection, MimeType
from sentinelhub.exceptions import SentinelHubServiceError

# مكتبات AOI
from shapely.geometry import Polygon, Point
from pyproj import Transformer

# -----------------------------------------------------------
# ⚠⚠ إعدادات Sentinel Hub - يجب استبدالها بمفاتيحك الحقيقية ⚠⚠
# -----------------------------------------------------------
CLIENT_ID = "78d16379-9b98-497a-b50f-3bcf0e1cafd6" 
CLIENT_SECRET = "PLAK2f90e37551414d53804804766f83247f"
CONFIG = SHConfig()
CONFIG.sh_client_id = CLIENT_ID
CONFIG.sh_client_secret = CLIENT_SECRET
# -----------------------------------------------------------

app = Flask(__name__)
# السماح للواجهة الأمامية (Frontend) بالوصول إلى هذا الخادم
CORS(app) 


# ==========================================================
# أ. دالة بيانات المحاكاة (كاحتياطي)
# ==========================================================
def generate_mock_data():
    """توليد بيانات محاكاة في حالة فشل الاتصال بـ API."""
    # توليد 6 قيم NDVI عشوائية بين 0.40 و 0.85
    ndvi_data = [random.uniform(0.40, 0.85) for _ in range(6)]
    latest_ndvi = ndvi_data[-1]
    
    # محاكاة بيانات رطوبة التربة
    moisture_values = [random.randint(30, 70) for _ in range(6)]
    latest_moisture = moisture_values[-1]
    
    alerts = []
    if latest_ndvi < 0.5:
        alerts.append(f"*تنبيه NDVI حرج (محاكاة):* انخفاض صحة المحصول ({latest_ndvi:.2f}).")
    
    return {
        "ndvi_values": [f"{v:.4f}" for v in ndvi_data],
        "latest_ndvi": f"{latest_ndvi:.4f}",
        "moisture_estimate": latest_moisture,
        "analysis_timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        "message": "تم استخدام بيانات محاكاة (فشل اتصال API).",
        "is_mock": True
    }


# ==========================================================
# ب. دالة تحديد منطقة الدراسة (AOI)
# ==========================================================
def determine_aoi(lat_str, lon_str, polygon_input_str, buffer_distance_m=50):
    """تحدد AOI: إما بوليجون مدخل أو محيط 50 متر حول نقطة."""
    # 1. محاولة معالجة البوليجون المدخل (الأولوية)
    if polygon_input_str:
        try:
            # نتوقع أن المدخل هو مصفوفة إحداثيات GeoJSON
            coords = json.loads(polygon_input_str)
            
            # معالجة تنسيق [[[]]] أو [[]]
            if len(coords) == 1 and isinstance(coords[0][0], list):
                 coords = coords[0] 

            if isinstance(coords, list) and len(coords) >= 3 and isinstance(coords[0], list):
                
                polygon = Polygon(coords)
                
                if not polygon.is_valid:
                     return None, "البوليجون غير صحيح هندسياً."
                
                # إرجاع GeoJSON
                return json.loads(json.dumps(polygon._geo_interface_)), "تم استخدام البوليجون المُدخل."

        except Exception:
            pass

    # 2. إنشاء محيط (Buffer) إذا تم إدخال نقطة فقط
    if lat_str and lon_str:
        try:
            lat = float(lat_str)
            lon = float(lon_str)
            
            # تحويل الإحداثيات إلى UTM لإنشاء المحيط بالمتر
            utm_crs_string = f"+proj=utm +zone={int((lon + 180) / 6) + 1} +ellps=WGS84 +datum=WGS84 +units=m +no_defs"
            transformer_to_utm = Transformer.from_crs("EPSG:4326", utm_crs_string, always_xy=True)
            transformer_from_utm = Transformer.from_crs(utm_crs_string, "EPSG:4326", always_xy=True)
            
            point_utm = transformer_to_utm.transform(lon, lat)
            polygon_utm = Point(point_utm).buffer(buffer_distance_m)
            
            # تحويل المحيط مرة أخرى إلى WGS84
            wgs_coords = [
                transformer_from_utm.transform(x, y) 
                for x, y in polygon_utm.exterior.coords
            ]
            
            aoi_polygon = {"type": "Polygon", "coordinates": [wgs_coords]}
            return aoi_polygon, f"تم استخدام نقطة مرجعية وإنشاء محيط {buffer_distance_m}م."
            
        except ValueError:
            return None, "قيم خط الطول/العرض غير رقمية."

    return None, "يجب إدخال إحداثيات أو بوليجون صالح."


# ==========================================================
# ج. دالة جلب بيانات NDVI من Sentinel Hub
# ==========================================================
def fetch_ndvi_time_series(aoi_geojson, weeks=6):
    """تستدعي Sentinel Hub Statistical API لعمل سلسلة زمنية لـ NDVI."""
    
    # التحقق من أن المفاتيح موجودة قبل البدء
    if not CONFIG.sh_client_id or not CONFIG.sh_client_secret or CONFIG.sh_client_id == "YOUR_SENTINELHUB_CLIENT_ID":
        return None, "خطأ: لم يتم إدخال مفاتيح Sentinel Hub بشكل صحيح."

    # تحديد الفترة الزمنية (آخر 6 أسابيع)
    end_date = datetime.now()
    start_date = end_date - timedelta(weeks=weeks)
    time_range = (start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d'))
    
    # استخراج Bounding Box من الـ AOI
    coords = aoi_geojson["coordinates"][0]
    bbox_coords = [min(c[0] for c in coords), min(c[1] for c in coords), max(c[0] for c in coords), max(c[1] for c in coords)]
    bbox = BBox(bbox=bbox_coords, crs=CRS.WGS84)

    # Evalscript لحساب NDVI
    evalscript = """
        //VERSION=3
        function setup() {
            return {
                input: [{bands: ["B04", "B08", "dataMask"]}],
                output: [{id: "ndvi", bands: 1, sampleType: "FLOAT32"}]
            };
        }

        function evaluatePixel(samples) {
            let val = samples.B08 - samples.B04;
            let sum = samples.B08 + samples.B04;
            let ndvi = val / sum;
            return {ndvi: [ndvi]};
        }
    """
    
    # طلب الإحصائيات الأسبوعية
    aggregation = {
        "timeRange": {"from": time_range[0], "to": time_range[1]},
        "aggregationInterval": {"of": "P1W"}, # فاصل زمني أسبوعي
        "evalscript": evalscript,
        "width": 100, "height": 100
    }
    
    request = SentinelHubStatistical(
        aggregation=aggregation,
        input_data=[DataCollection.SENTINEL2_L1C.statistical_service(bbox=bbox)],
        geometry={"type": aoi_geojson["type"], "coordinates": aoi_geojson["coordinates"]},
        config=CONFIG
    )
    
    try:
        stats = request.get_data()[0]
        
        ndvi_values = []
        for period in stats["data"]:
            mean_ndvi = period["outputs"]["ndvi"]["metrics"]["mean"]
            ndvi_values.append(float(mean_ndvi) if mean_ndvi is not None else None)

        # ملء الفجوات (إذا كانت هناك أسابيع مفقودة بسبب الغيوم، نستخدم القيمة الصفرية أو الأخيرة)
        final_ndvi = [v if v is not None else 0.0 for v in ndvi_values]

        return final_ndvi, "تم جلب البيانات من Sentinel Hub بنجاح."
    
    except SentinelHubServiceError as e:
        return None, f"خطأ في API Sentinel Hub: {e.args[0]['error']['message']}"
    except Exception as e:
        return None, f"خطأ غير متوقع: {str(e)}"


# ==========================================================
# د. نقطة النهاية الرئيسية (Routing)
# ==========================================================
@app.route('/api/get_agri_data', methods=['GET'])
def get_agri_data():
    try:
        # استقبال المدخلات
        latitude_str = request.args.get('lat')
        longitude_str = request.args.get('lon')
        polygon_input = request.args.get('polygon')
        
        # 1. تحديد الـ AOI
        aoi_polygon_geojson, status_message = determine_aoi(latitude_str, longitude_str, polygon_input)
        
        if aoi_polygon_geojson is None:
            return jsonify({"error": status_message}), 400

        # 2. جلب بيانات NDVI الحقيقية
        ndvi_data, ndvi_status = fetch_ndvi_time_series(aoi_polygon_geojson)
        
        if ndvi_data is None:
            # العودة للمحاكاة في حالة فشل الاتصال
            mock_data = generate_mock_data()
            mock_data["message"] = f"{ndvi_status} (جاري استخدام محاكاة)"
            return jsonify(mock_data), 200

        # 3. بناء الرد النظيف
        latest_ndvi = ndvi_data[-1] if ndvi_data else 0.0
        
        # نستخدم المحاكاة للرطوبة مؤقتاً
        mock_data = generate_mock_data()
        
        final_response = {
            "ndvi_values": [f"{v:.4f}" for v in ndvi_data],
            "latest_ndvi": f"{latest_ndvi:.4f}",
            "moisture_estimate": mock_data['moisture_estimate'],
            "analysis_timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            "aoi_geojson": aoi_polygon_geojson, 
            "message": ndvi_status,
            "is_mock": False
        }
        
        return jsonify(final_response), 200

    except Exception as e:
        print(f"حدث خطأ عام: {str(e)}")
        return jsonify({"error": f"حدث خطأ داخلي في الخادم: {str(e)}"}), 500
if __name__ == '__main__':
    # تشغيل الخادم
    app.run(debug=True, host='0.0.0.0', port=5000)
    app.run(debug=True, host='0.0.0.0', port=5000)