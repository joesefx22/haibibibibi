// ======= 🎯 المتغيرات العالمية =======
let currentStadiums = [];
let selectedStadiumId = null;
let selectedTime = '';
let selectedDate = '';
let userFavorites = JSON.parse(localStorage.getItem('favoriteStadiums') || '[]');
let userSession = JSON.parse(localStorage.getItem('userSession') || '{}');
let currentBookings = [];
let goldenSlots = [];

// ======= 🚀 نظام التهيئة =======

// 1. التهيئة الرئيسية
function initializeApp() {
    console.log('🚀 جاري تهيئة التطبيق...');
    
    // إعداد الوضع الليلي
    initTheme();
    
    // إعداد المستمعين للأحداث
    initEventListeners();
    
    // تحميل البيانات
    loadInitialData();
    
    // إخفاء شاشة التحميل
    setTimeout(() => {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('fade-out');
        }
    }, 2000);
}

// 2. تحميل البيانات الأولية
function loadInitialData() {
    console.log('📥 جاري تحميل البيانات...');
    
    // تحميل الملاعب
    loadStadiums();
    
    // تحميل البانرز
    loadBanners();
    
    // تحميل الملاعب المميزة
    loadFeaturedStadiums();
    
    // تحميل الساعات الذهبية
    loadGoldenSlots();
    
    // التحقق من حالة المستخدم
    checkAuthStatus();
}

// 3. تحميل وعرض الملاعب
function loadStadiums(filters = {}) {
    console.log('🏟️ جاري تحميل الملاعب...');
    
    // بيانات افتراضية للملاعب
    const stadiums = [
        {
            id: 1,
            name: "نادي الطيارة - الملعب الرئيسي",
            location: "المقطم - شارع التسعين",
            area: "mokatam",
            price: 250,
            deposit: 75,
            image: "https://images.unsplash.com/photo-1575361204480-aadea25e6e68?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
            features: ["نجيلة صناعية", "كشافات ليلية", "غرف تبديل"],
            rating: 4.7,
            totalRatings: 128,
            availabilityPercentage: 80,
            nextAvailableSlot: "اليوم 6 مساءً"
        },
        {
            id: 2,
            name: "نادي الطيارة - الملعب الثاني",
            location: "المقطم - شارع التسعين",
            area: "mokatam",
            price: 220,
            deposit: 66,
            image: "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
            features: ["نجيلة صناعية", "إضاءة ليلية", "غرف تبديل"],
            rating: 4.5,
            totalRatings: 95,
            availabilityPercentage: 60,
            nextAvailableSlot: "غداً 4 عصراً"
        },
        {
            id: 3,
            name: "الراعي الصالح",
            location: "المقطم - شارع 9",
            area: "mokatam",
            price: 300,
            deposit: 90,
            image: "https://images.unsplash.com/photo-1543353072-4cf8a2d6a6e6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
            features: ["نجيلة طبيعية", "مقاعد جماهير", "كافيتريا"],
            rating: 4.8,
            totalRatings: 156,
            availabilityPercentage: 40,
            nextAvailableSlot: "اليوم 8 مساءً"
        }
    ];
    
    currentStadiums = stadiums;
    renderStadiums(stadiums);
}

// 4. عرض الملاعب في الواجهة
function renderStadiums(stadiums) {
    const container = document.getElementById('stadiumsContainer');
    if (!container) return;
    
    if (!stadiums || stadiums.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="bi bi-search display-1 text-muted"></i>
                <h4 class="text-muted mt-3">لا توجد ملاعب متاحة</h4>
            </div>
        `;
        return;
    }
    
    container.innerHTML = stadiums.map(stadium => {
        const isFavorite = userFavorites.includes(stadium.id);
        
        return `
            <div class="col-lg-4 col-md-6 mb-4">
                <div class="stadium-card h-100">
                    <div class="stadium-image" style="background-image: url('${stadium.image}')">
                        <span class="stadium-badge ${getAvailabilityClass(stadium.availabilityPercentage)}">
                            ${getAvailabilityText(stadium.availabilityPercentage)}
                        </span>
                        <span class="stadium-price">${stadium.price} ج.م/ساعة</span>
                    </div>
                    <div class="stadium-info">
                        <h4 class="stadium-title">${stadium.name}</h4>
                        <p class="text-muted mb-3">
                            <i class="bi bi-geo-alt"></i> ${stadium.location}
                        </p>
                        
                        <div class="rating-stars mb-2">
                            ${generateStarRating(stadium.rating)}
                        </div>
                        <small class="text-muted">${stadium.rating.toFixed(1)} (${stadium.totalRatings} تقييم)</small>
                        
                        <div class="mt-3">
                            ${stadium.features.map(feature => 
                                `<span class="badge bg-light text-dark me-1 mb-1">${feature}</span>`
                            ).join('')}
                        </div>
                        
                        <div class="days-selector mt-3" id="day-selector-${stadium.id}"></div>
                        
                        <div class="time-slots-container mt-2" id="slots-${stadium.id}">
                            <p class="text-muted text-center">اختر يوماً لعرض الأوقات المتاحة</p>
                        </div>
                        
                        <div class="d-flex gap-2 mt-3">
                            <button class="btn btn-outline-danger btn-sm favorite-btn" 
                                    data-stadium-id="${stadium.id}"
                                    onclick="toggleFavorite(${stadium.id})"
                                    title="${isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}">
                                <i class="bi bi-heart${isFavorite ? '-fill' : ''}"></i>
                            </button>
                            <button class="btn btn-primary flex-fill" onclick="showBookingModal(${stadium.id})">
                                <i class="bi bi-credit-card me-2"></i>احجز
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // إضافة منتقي الأيام لكل ملعب
    stadiums.forEach(stadium => {
        createDaySelector(stadium.id);
    });
}

// ======= 🎯 نظام الحجز =======

// 1. إنشاء منتقي الأيام
function createDaySelector(stadiumId) {
    const container = document.getElementById(`day-selector-${stadiumId}`);
    if (!container) return;
    
    const select = document.createElement('select');
    select.className = 'form-select';
    select.innerHTML = `
        <option value="">اختر يوم الحجز</option>
        <option value="today">اليوم</option>
        <option value="tomorrow">غداً</option>
        <option value="day-after-tomorrow">بعد غد</option>
    `;
    
    select.addEventListener('change', function() {
        loadTimeSlots(stadiumId, this.value);
    });
    
    container.appendChild(select);
}

// 2. تحميل الأوقات المتاحة
function loadTimeSlots(stadiumId, date) {
    const container = document.getElementById(`slots-${stadiumId}`);
    if (!container) return;
    
    if (!date) {
        container.innerHTML = '<p class="text-muted text-center">اختر يوماً لعرض الأوقات المتاحة</p>';
        return;
    }
    
    // أوقات افتراضية
    const timeSlots = [
        { time: '16:00', available: true },
        { time: '18:00', available: true },
        { time: '20:00', available: true },
        { time: '22:00', available: false }
    ];
    
    container.innerHTML = timeSlots.map(slot => `
        <div class="time-slot ${slot.available ? 'available' : 'booked'}" 
             onclick="${slot.available ? `selectTimeSlot(this, ${stadiumId}, '${slot.time}')` : ''}"
             style="${!slot.available ? 'cursor: not-allowed; opacity: 0.5;' : ''}">
            ${slot.time}
            ${!slot.available ? ' (محجوز)' : ''}
        </div>
    `).join('');
}

// 3. اختيار الوقت
function selectTimeSlot(element, stadiumId, time) {
    const container = element.parentElement;
    container.querySelectorAll('.time-slot').forEach(slot => {
        slot.classList.remove('selected');
    });
    
    element.classList.add('selected');
    
    selectedStadiumId = stadiumId;
    selectedTime = time;
}

// 4. عرض مودال الحجز
function showBookingModal(stadiumId) {
    if (!selectedTime) {
        showToast('⚠️ يرجى اختيار وقت الحجز أولاً', 'warning');
        return;
    }
    
    const stadium = currentStadiums.find(s => s.id === stadiumId);
    if (!stadium) return;
    
    // تعبئة بيانات الحجز
    document.getElementById('pitchId').value = stadiumId;
    document.getElementById('selectedTime').value = selectedTime;
    
    const bookingDetails = document.getElementById('bookingDetails');
    bookingDetails.innerHTML = `
        <div class="alert alert-info">
            <h6>تفاصيل الحجز:</h6>
            <p class="mb-1"><strong>الملعب:</strong> ${stadium.name}</p>
            <p class="mb-1"><strong>الوقت:</strong> ${selectedTime}</p>
            <p class="mb-0"><strong>العربون:</strong> ${stadium.deposit} ج.م</p>
        </div>
    `;
    
    // عرض المودال
    const modal = new bootstrap.Modal(document.getElementById('bookingModal'));
    modal.show();
}

// 5. معالجة نموذج الحجز
document.getElementById('bookingForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const name = formData.get('name');
    const phone = formData.get('phone');
    const stadiumId = formData.get('pitchId');
    
    if (!name || !phone) {
        showToast('⚠️ يرجى ملء جميع الحقول', 'warning');
        return;
    }
    
    // محاكاة عملية الحجز
    const submitBtn = this.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="bi bi-clock me-2"></i>جاري المعالجة...';
    
    setTimeout(() => {
        showToast('🎉 تم الحجز بنجاح! سيتم التواصل معك قريباً', 'success');
        
        // إغلاق المودال
        const modal = bootstrap.Modal.getInstance(document.getElementById('bookingModal'));
        modal.hide();
        
        // إعادة تعيين النموذج
        this.reset();
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        
        // إعادة تعيين الاختيارات
        selectedStadiumId = null;
        selectedTime = '';
        
    }, 2000);
});

// ======= ⭐ نظام المفضلة =======

// 1. تبديل المفضلة
function toggleFavorite(stadiumId) {
    let favorites = JSON.parse(localStorage.getItem('favoriteStadiums') || '[]');
    
    if (favorites.includes(stadiumId)) {
        favorites = favorites.filter(id => id !== stadiumId);
        showToast('تم إزالة الملعب من المفضلة', 'info');
    } else {
        favorites.push(stadiumId);
        showToast('تم إضافة الملعب إلى المفضلة', 'success');
    }
    
    localStorage.setItem('favoriteStadiums', JSON.stringify(favorites));
    updateFavoriteButtons();
}

// 2. تحديث أزرار المفضلة
function updateFavoriteButtons() {
    const favorites = JSON.parse(localStorage.getItem('favoriteStadiums') || '[]');
    
    document.querySelectorAll('.favorite-btn').forEach(btn => {
        const stadiumId = parseInt(btn.dataset.stadiumId);
        if (favorites.includes(stadiumId)) {
            btn.innerHTML = '<i class="bi bi-heart-fill text-danger"></i>';
            btn.title = 'إزالة من المفضلة';
        } else {
            btn.innerHTML = '<i class="bi bi-heart"></i>';
            btn.title = 'إضافة إلى المفضلة';
        }
    });
}

// ======= 🎨 نظام الوضع الليلي =======

// 1. تهيئة الوضع الليلي
function initTheme() {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;
    
    themeToggle.addEventListener('click', function() {
        document.body.classList.toggle('night-mode');
        const icon = this.querySelector('i');
        if (document.body.classList.contains('night-mode')) {
            icon.className = 'bi bi-sun';
            this.title = 'الوضع النهاري';
            localStorage.setItem('theme', 'night');
        } else {
            icon.className = 'bi bi-moon';
            this.title = 'الوضع الليلي';
            localStorage.setItem('theme', 'light');
        }
    });
    
    // تحميل الوضع المحفوظ
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'night') {
        document.body.classList.add('night-mode');
        themeToggle.querySelector('i').className = 'bi bi-sun';
        themeToggle.title = 'الوضع النهاري';
    }
}

// ======= 🔍 نظام البحث والفلترة =======

// 1. إعداد الفلاتر
function setupFilters() {
    const searchInput = document.getElementById('searchStadiums');
    const areaFilter = document.getElementById('areaFilter');
    const priceFilter = document.getElementById('priceFilter');
    const ratingFilter = document.getElementById('ratingFilter');
    const sortFilter = document.getElementById('sortFilter');
    
    if (searchInput) {
        searchInput.addEventListener('input', debounce(filterStadiums, 300));
    }
    
    if (areaFilter) areaFilter.addEventListener('change', filterStadiums);
    if (priceFilter) priceFilter.addEventListener('change', filterStadiums);
    if (ratingFilter) ratingFilter.addEventListener('change', filterStadiums);
    if (sortFilter) sortFilter.addEventListener('change', filterStadiums);
}

// 2. فلترة الملاعب
function filterStadiums() {
    const searchTerm = document.getElementById('searchStadiums')?.value.toLowerCase() || '';
    const area = document.getElementById('areaFilter')?.value || '';
    const price = document.getElementById('priceFilter')?.value || '';
    const rating = document.getElementById('ratingFilter')?.value || '';
    
    let filtered = currentStadiums;
    
    // فلترة بالبحث
    if (searchTerm) {
        filtered = filtered.filter(stadium => 
            stadium.name.toLowerCase().includes(searchTerm) ||
            stadium.location.toLowerCase().includes(searchTerm)
        );
    }
    
    // فلترة بالمنطقة
    if (area) {
        filtered = filtered.filter(stadium => stadium.area === area);
    }
    
    // فلترة بالسعر
    if (price) {
        const [min, max] = price.split('-').map(Number);
        filtered = filtered.filter(stadium => {
            if (max === 999) return stadium.price >= min;
            return stadium.price >= min && stadium.price <= max;
        });
    }
    
    // فلترة بالتقييم
    if (rating) {
        filtered = filtered.filter(stadium => stadium.rating >= parseFloat(rating));
    }
    
    renderStadiums(filtered);
    
    if (filtered.length === 0) {
        showToast('⚠️ لا توجد ملاعب تطابق بحثك', 'warning');
    }
}

// ======= 📱 نظام المستخدم =======

// 1. التحقق من حالة المصادقة
function checkAuthStatus() {
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    
    if (token && userData) {
        userSession = JSON.parse(userData);
        updateUIForLoggedInUser();
        return true;
    }
    return false;
}

// 2. تحديث واجهة المستخدم المسجل
function updateUIForLoggedInUser() {
    const loginBtn = document.querySelector('a[href="/login"]');
    if (loginBtn && userSession.name) {
        loginBtn.innerHTML = `<i class="bi bi-person me-1"></i>مرحباً، ${userSession.name}`;
        loginBtn.href = '/profile';
    }
}

// ======= 🛠️ دوال المساعدة =======

// 1. توليد نجوم التقييم
function generateStarRating(rating) {
    let stars = '';
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 1; i <= 5; i++) {
        if (i <= fullStars) {
            stars += '<i class="bi bi-star-fill text-warning"></i>';
        } else if (i === fullStars + 1 && hasHalfStar) {
            stars += '<i class="bi bi-star-half text-warning"></i>';
        } else {
            stars += '<i class="bi bi-star text-warning"></i>';
        }
    }
    
    return stars;
}

// 2. فئة التوفر
function getAvailabilityClass(percentage) {
    if (percentage < 30) return 'availability-low';
    if (percentage < 60) return 'availability-medium';
    return 'availability-high';
}

// 3. نص التوفر
function getAvailabilityText(percentage) {
    if (percentage < 30) return 'محدود';
    if (percentage < 60) return 'متوسط';
    return 'متاح';
}

// 4. الإشعارات
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'warning' ? 'bg-warning' : type === 'error' ? 'bg-danger' : 'bg-success'}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 4000);
}

// 5. Debounce للبحث
function debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

// ======= 📊 دوال البيانات =======

// 1. تحميل البانرز
function loadBanners() {
    const banners = [
        {
            id: 1,
            title: "خصم 25% على الحجوزات المسائية",
            description: "استمتع بخصم خاص على الحجوزات بعد الساعة 8 مساءً",
            image: "https://placehold.co/600x400/667eea/white?text=خصم+25%",
            badge: "🔥 محدود"
        },
        {
            id: 2,
            title: "لاعبوني معاكم - الساعات الذهبية",
            description: "انضم لمباريات جديدة واجذب لاعبين إضافيين لمباراتك",
            image: "https://placehold.co/600x400/764ba2/white?text=لاعبوني+معاكم",
            badge: "👥 جديد"
        }
    ];
    
    renderBanners(banners);
}

// 2. عرض البانرز
function renderBanners(banners) {
    const container = document.getElementById('bannersContainer');
    if (!container) return;
    
    container.innerHTML = banners.map(banner => `
        <div class="col-md-6 mb-3">
            <div class="banner-card">
                <div class="banner-image" style="background-image: url('${banner.image}')">
                    <span class="banner-badge">${banner.badge}</span>
                </div>
                <div class="banner-content">
                    <h5>${banner.title}</h5>
                    <p class="text-muted">${banner.description}</p>
                </div>
            </div>
        </div>
    `).join('');
}

// 3. تحميل الملاعب المميزة
function loadFeaturedStadiums() {
    const featured = currentStadiums.slice(0, 2).map(stadium => ({
        ...stadium,
        featured: true
    }));
    
    renderFeaturedStadiums(featured);
}

// 4. عرض الملاعب المميزة
function renderFeaturedStadiums(stadiums) {
    const container = document.getElementById('featuredStadiumsContainer');
    if (!container) return;
    
    container.innerHTML = stadiums.map(stadium => `
        <div class="col-lg-6 mb-4">
            <div class="stadium-card">
                <div class="stadium-image" style="background-image: url('${stadium.image}')">
                    <span class="featured-badge">⭐ مميز</span>
                    <span class="stadium-price">${stadium.price} ج.م/ساعة</span>
                </div>
                <div class="stadium-info">
                    <h4 class="stadium-title">${stadium.name}</h4>
                    <p class="text-muted">${stadium.location}</p>
                    <button class="btn btn-primary w-100" onclick="showBookingModal(${stadium.id})">
                        احجز الآن
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// 5. تحميل الساعات الذهبية
function loadGoldenSlots() {
    // محاكاة بيانات الساعات الذهبية
    goldenSlots = [
        {
            id: 1,
            stadiumId: 1,
            time: '18:00',
            playersNeeded: 3
        }
    ];
}

// ======= 🎯 إعداد المستمعين =======

function initEventListeners() {
    // التمرير لشريط التنقل
    window.addEventListener('scroll', function() {
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            if (window.scrollY > 100) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }
        
        // زر العودة لأعلى
        const toTopBtn = document.getElementById('toTop');
        if (toTopBtn) {
            toTopBtn.style.display = window.scrollY > 200 ? 'block' : 'none';
        }
    });
    
    // زر العودة لأعلى
    const toTopBtn = document.getElementById('toTop');
    if (toTopBtn) {
        toTopBtn.onclick = () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
    }
    
    // التنقل السلس
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // إعداد الفلاتر
    setupFilters();
}

// ======= 🚀 بدء التطبيق =======

// انتظار تحميل DOM
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 تم تحميل الصفحة');
    initializeApp();
});

// التأكد من تحميل Bootstrap
if (typeof bootstrap !== 'undefined') {
    console.log('✅ تم تحميل Bootstrap');
} else {
    console.error('❌ فشل تحميل Bootstrap');
}

console.log('🎯 تم تحميل التطبيق بنجاح');
