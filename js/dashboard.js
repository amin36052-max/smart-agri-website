// بيانات المشروع (تقدر تعدلها)
let completed = [
  "رفع المشروع على GitHub",
  "ربط المشروع بـ Git",
  "تشغيل GitHub Pages"
];

let todo = [
  "تصميم الصفحة الرئيسية",
  "إضافة صفحة الخدمات",
  "دمج API من PlantLabs",
  "إضافة Dashboard متقدمة"
];

// حساب نسبة التقدم
let progress = Math.round((completed.length / (completed.length + todo.length)) * 100);

// عرض النسبة
document.getElementById("progressBar").style.width = progress + "%";
document.getElementById("progressText").innerText = progress + "% Completed";

// عرض المهام
let doneList = document.getElementById("doneList");
completed.forEach(task => {
  let li = document.createElement("li");
  li.textContent = "✓ " + task;
  doneList.appendChild(li);
});

let todoList = document.getElementById("todoList");
todo.forEach(task => {
  let li = document.createElement("li");
  li.textContent = task;
  todoList.appendChild(li);
});
