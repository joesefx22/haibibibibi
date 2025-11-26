// =============================================
// 1. المتغيرات والمساعدات الأساسية
// =============================================
let appliedCodeId = null; // من ملف التعديلات 
let currentBookingId = null;
let currentFilters = {}; // لحفظ حالة الفلاتر

// محاكاة لـ apiRequest لاستخدام الدوال المأخوذة من user (1).js
// في التطبيق الفعلي، يجب استيراد هذه الدالة من ملف خارجي (مثل './api.js')
window.apiRequest = async (url, method = 'GET', data = null) => {
    // يمكنك هنا إضافة منطق Auth Token والتعامل مع الأخطاء العامة
    console.log(`API Call: ${method} ${url}`, data);
    return { 
        ok: true, 
        json: async () => { 
            if (url.includes('/api/areas')) return [{ id: 1, name: 'التجمع الخامس' }, { id: 2, name: 'الشيخ زايد' }];
            if (url.includes('/api/homepage-banners')) return getDefaultBanners();
            if (url.includes('/api/stadiums')) return getDefaultStadiums();
            if (url.includes('/api/ai/suggestions')) return getDefaultSuggestions();
            if (url.includes('/api/codes/validate')) return { message: 'تم تطبيق الخصم بنجاح', discountType: 'percent', discountValue: 10, codeId: 101 }; // محاكاة كود خصم
            if (url.includes('/user/profile')) return { name: 'زائر مميز', role: 'player' };
            if (url.includes('/player/requests')) return []; // لا توجد طلبات
            return {};
        },
        // إضافة خاصية ok للتعامل مع .ok في Fetch API
        ok: true, 
        status: 200 
    };
};

/**
 * دالة بسيطة لعرض التنبيهات (من new index (2).html)
 * @param {string} message 
 * @param {'success' | 'error' | 'warning' | 'info'} type 
 */
window.showToast = function(message, type = 'info') {
    const t = document.getElementById('toastNotification');
    if (!t) {
        // إذا لم يكن العنصر موجوداً، استخدم alert مؤقت
        console.warn(`Toast: ${message} (${type})`);
        // alert(message);
        return;
    }
    t.textContent = message;
    t.style.display = 'block';
    t.style.background = type === 'error' ? '#e74c3c' : type === 'warning' ? '#f39c12' : '#2ecc71';
    setTimeout(() => {
        t.style.display = 'none';
    }, 3500);
}

window.showLoading = function(show) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        if (show) {
            loadingOverlay.classList.remove('fade-out');
        } else {
            setTimeout(() => { // تأخير لإظهار تأثير الـ fade-out
                loadingOverlay.classList.add('fade-out');
            }, 500);
        }
    }
}

// =============================================
// 2. دوال الوظائف الأساسية (من new index (2).html و user (1).js)
// =============================================

/**
 * 🎫 التحقق من كود الخصم (من تعديلات علي اندكس القديم.txt)
 * @param {number} fieldId 
 */
window.validateVoucher = async function(fieldId) {
    const codeValue = document.getElementById('voucherCodeInput')?.value?.trim();
    const resultContainer = document.getElementById('voucherResult');
    
    if (!codeValue) {
        resultContainer.innerHTML = '';
        appliedCodeId = null;
        // يجب هنا استدعاء دالة لتحديث ملخص الحجز وإعادة حساب الإجمالي
        return;
    }
    
    window.showLoading(true);

    try {
        const response = await apiRequest("/api/codes/validate", 'POST', { 
            codeValue, 
            fieldId 
        });

        appliedCodeId = response.codeId; // حفظ مُعرّف الكود المطبق 
        window.showLoading(false);
        
        let discountText = '';
        if (response.discountType === 'percent') {
            discountText = `خصم: ${response.discountValue}%`;
        } else if (response.discountType === 'fixed') {
            discountText = `خصم: ${response.discountValue} ج.م`;
        }
        
        resultContainer.innerHTML = `
            <div class="alert alert-success p-2 small m-0">
                ✅ ${response.message} (${discountText})
            </div>
        `;
        // يجب استدعاء دالة لتحديث ملخص الحجز وإعادة حساب الإجمالي
        // updateBookingSummary(appliedCodeId); 

    } catch (error) {
        window.showLoading(false);
        resultContainer.innerHTML = `
            <div class="alert alert-danger p-2 small m-0">
                ❌ فشل: ${error.message}
            </div>
        `;
    }
}

/**
 * 🏟️ حجز الملعب (من new index (2).html)
 */
window.bookStadium = async function(fieldId, bookingDate, startTime, endTime, playersNeeded = 0) {
    // يمكن هنا استخدام appliedCodeId إذا كان متوفراً
    window.showLoading(true);
    try {
        const response = await apiRequest("/api/bookings/new", 'POST', { 
            fieldId, bookingDate, startTime, endTime, playersNeeded, appliedCodeId
        });
        window.showLoading(false);

        if (response.requiresPayment) {
            // توجيه لصفحة الدفع لدفع العربون 
            window.showToast("تم حجز الساعة مبدئياً. جاري التوجيه للدفع...", 'info');
            // تأكد أن /payment.html هو المسار الصحيح
            setTimeout(() => {
                window.location.href = `/payment.html?bookingId=${response.bookingId}`;
            }, 1000);
        } else {
            // حجز معلق لا يحتاج دفع عربون 
            window.showToast(response.message, 'info');
            // تحديث الواجهة
            loadStadiumDetails(fieldId); 
        }
    } catch (error) {
        window.showLoading(false);
        window.showToast(`فشل الحجز: ${error.message}`, 'error');
    }
}

/**
 * 🔐 التحقق من حالة المصادقة (من user (1).js)
 */
window.checkAuthenticationAndRole = function() {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (!token || !role || role !== 'player') {
        // تحديث زر تسجيل/دخول
        document.getElementById('loginLogoutBtn').textContent = 'تسجيل / دخول';
        document.getElementById('loginLogoutBtn').onclick = () => { window.location.href = '/login.html'; };
        return false;
    }
    // تحديث زر تسجيل/دخول
    document.getElementById('loginLogoutBtn').textContent = 'تسجيل خروج';
    document.getElementById('loginLogoutBtn').onclick = window.handleLogout;
    return true;
}

/**
 * 🚪 تسجيل الخروج (من user (1).js)
 */
window.handleLogout = function() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    sessionStorage.clear();
    window.location.reload(); 
}

// (يجب دمج جميع دوال تحميل وعرض البيانات الأخرى مثل loadStadiums, renderStadiums, loadAreas, loadBanners هنا)

// =============================================
// 3. دوال الواجهة والتفاعل (من index (5).html)
// =============================================

/**
 * 🌗 تبديل الوضع الليلي (من index (5).html)
 */
window.toggleTheme = function() {
    const body = document.body;
    const icon = document.getElementById('themeToggle').querySelector('i');

    if (body.classList.contains('night-mode')) {
        body.classList.remove('night-mode');
        icon.className = 'bi bi-moon';
        document.getElementById('themeToggle').title = 'الوضع الليلي';
        localStorage.setItem('theme', 'light');
    } else {
        body.classList.add('night-mode');
        icon.className = 'bi bi-sun';
        document.getElementById('themeToggle').title = 'الوضع النهاري';
        localStorage.setItem('theme', 'night');
    }
};

/**
 * 🚀 تهيئة التطبيق
 */
window.initializeApp = async function() {
    window.showLoading(true);
    
    try {
        // 1. إعداد الوضع الليلي
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'night') {
            document.body.classList.add('night-mode');
            document.getElementById('themeToggle').querySelector('i').className = 'bi bi-sun';
            document.getElementById('themeToggle').title = 'الوضع النهاري';
        }

        // 2. إعداد مستمعي الأحداث
        document.getElementById('themeToggle')?.addEventListener('click', window.toggleTheme);
        // (يجب إضافة مستمعي الفلاتر: searchInput, filterArea, filterType, datePicker هنا)
        // initEventListeners(); // يجب أن تحتوي على مستمعي scroll, toTop

        // 3. تحميل البيانات الأساسية
        window.checkAuthenticationAndRole();
        await Promise.all([
            loadAreas(),
            loadBanners(),
            fetchFeaturedStadiums(), // جلب الملاعب المميزة 
            // fetchStadiums(), // جلب الملاعب الرئيسية بعد تطبيق الفلاتر
        ]);

        window.showLoading(false);
        window.showToast('تم تحميل التطبيق بالكامل', 'success');
    } catch (error) {
        console.error('App initialization error:', error);
        window.showLoading(false);
    }
}

// =============================================
// 4. الدوال المساعدة (من user (1).js) - لتنظيم الـ SPA (Single Page App)
// =============================================

const views = {
    // 1. حجز جديد (واجهة الحجز الرئيسية)
    'booking': async () => {
        // يجب هنا دمج كود واجهة الحجز الكاملة
        return `
            <h2 class="mb-4">🏟️ حجز ملعب كرة قدم</h2>
            `;
    },
    // 2. طلبات الفريق
    'team-requests': async () => {
        // عرض طلبات الانضمام للفريق 
        return `
            <h2 class="mb-4">🤝 طلبات الانضمام للاعبين</h2>
            `;
    },
    // ... باقي الواجهات
};

// =============================================
// 5. بدء التشغيل
// =============================================

document.addEventListener('DOMContentLoaded', function() {
    window.initializeApp();
});
