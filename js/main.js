// مجرد رسالة تظهر في الـ Console للتأكد أن الملف شغال
console.log("Main JS Loaded Successfully");

// مثال: فتح و غلق الـ Menu (لو عملنا Navbar في المستقبل)
const menuBtn = document.getElementById("menuBtn");
const navMenu = document.getElementById("navMenu");

if (menuBtn) {
  menuBtn.addEventListener("click", () => {
    navMenu.classList.toggle("open");
  });
}

// تجهيز المشروع لاستقبال API بعدين (ده placeholder)
async function fetchSatelliteData() {
  try {
    console.log("Preparing to connect with PlantLabs API...");
    // هنا هنضيف كود API بعدين
  } catch (error) {
    console.error("API Error:", error);
  }
}

menuBtn.addEventListener("click", () => {
  navMenu.classList.toggle("open");
});
window.addEventListener("load", () => {
  const elements = document.querySelectorAll(".fade-in");
  elements.forEach((el, i) => {
    setTimeout(() => {
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    }, i * 200);
  });
});
