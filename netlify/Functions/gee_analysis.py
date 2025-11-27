# netlify/functions/gee_analysis/gee_analysis.py

import ee
import json
import datetime
import os
import tempfile
import sys
import logging

# تهيئة GEE (تم تعديلها للعمل مع متغيرات Netlify السرية)
def initialize_gee():
    gee_key_secret = os.environ.get('GEE_KEY_SECRET')
    if not gee_key_secret:
        raise Exception("GEE_KEY_SECRET environment variable is missing.")

    # استخدام ملف مؤقت للمصادقة (ضروري في بيئات Serverless)
    try:
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json') as temp_file:
            temp_file.write(gee_key_secret)
            key_path = temp_file.name
        
        ee.Initialize(service_account_file=key_path)
        return True
    except Exception as e:
        raise Exception(f"GEE Initialization Failed: {e}")
    finally:
        if 'key_path' in locals() and os.path.exists(key_path):
            os.remove(key_path)

# الدالة التحليلية الرئيسية لـ GEE (نفس المنطق السابق)
def run_gee_analysis(geojson_input):
    # (نفس الكود السابق لـ run_gee_analysis الذي يقوم بتصفية Sentinel-2 وحساب NDVI/NDWI)
    # للتوضيح: هذا الجزء يحتاج إلى كود GEE الكامل الذي أرسلته سابقاً
    
    # ... نستخدم نفس كود run_gee_analysis هنا ...
    
    # (لتجنب تكرار الكود الطويل، افترض أنك وضعت كود GEE هنا)
    
    # ... سيتم إرجاع weekly_results 
    weekly_results = [
        {"date": "2025-05-01", "ndvi_mean": 0.75, "water_mean": 0.15},
        {"date": "2025-05-08", "ndvi_mean": 0.78, "water_mean": 0.16},
    ] # بيانات وهمية للاختبار

    return weekly_results


# ---------------------------------------------------
# الدالة الرئيسية لـ Netlify (نقطة الدخول)
# ---------------------------------------------------
def handler(event, context):
    
    # 1. المصادقة مع GEE (لضمان أنها تعمل في كل استدعاء)
    try:
        initialize_gee()
    except Exception as e:
        return {
            "statusCode": 500,
            "headers": {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"},
            "body": json.dumps({"success": False, "message": f"GEE Auth/Init Error: {str(e)}"})
        }

    # 2. معالجة طلب POST
    if event['httpMethod'] != 'POST':
        return {
            "statusCode": 405,
            "headers": {"Access-Control-Allow-Origin": "*"},
            "body": json.dumps({"success": False, "message": "Method Not Allowed"})
        }

    # 3. جلب بيانات GeoJSON
    try:
        if event.get('body'):
            body = json.loads(event['body'])
            geojson_input = body.get('geojson')
        else:
            raise ValueError("No GeoJSON data received.")
        
        # 4. تشغيل التحليل
        analysis_results = run_gee_analysis(geojson_input)

        # 5. إرجاع النتيجة
        return {
            "statusCode": 200,
            "headers": {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"},
            "body": json.dumps({
                "success": True,
                "results": analysis_results,
                "message": "تحليل GEE اكتمل بنجاح"
            })
        }

    except Exception as e:
        # معالجة أي خطأ في وقت التشغيل
        return {
            "statusCode": 500,
            "headers": {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"},
            "body": json.dumps({"success": False, "message": f"Runtime Analysis Failed: {str(e)}"})
        }