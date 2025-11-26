// ======= 🎯 المتغيرات العالمية =======
let currentStadiums = [];
let selectedStadiumId = null;
let selectedTime = '';
let selectedDate = '';
let userFavorites = JSON.parse(localStorage.getItem('favoriteStadiums') || '[]');
let userSession = JSON.parse(localStorage.getItem('userSession') || '{}');
let currentBookings = [];
let goldenSlots = [];
let validatedVouchers = [];
let appliedCodeId = null;
let currentCancellationStep = 1;
let bookingState = {
    selectedField: null,
    selectedDate: new Date().toISOString().split('T')[0],
    selectedSlot: null
};

// ======= 🔐 نظام الأمان والتوجيه (من user.js) =======

function checkAuthenticationAndRole() {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    if (!token || !role || role !== 'player') {
        window.location.href = '/auth.html';
        return false;
    }
    return true;
}

function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    sessionStorage.clear();
    window.location.href = '/auth.html';
}

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

function updateUIForLoggedInUser() {
    const authLink = document.getElementById('authLink');
    if (authLink && userSession.name) {
        authLink.innerHTML = `<i class="bi bi-person me-1"></i>مرحباً، ${userSession.name}`;
        authLink.href = '#';
        authLink.onclick = () => loadView('profile');
    }
}

// ======= 🚀 نظام التهيئة الرئيسي =======

function initializeApp() {
    console.log('🚀 جاري تهيئة التطبيق...');
    
    // إعداد الوضع الليلي
    initTheme();
    
    // إعداد المستمعين للأحداث
    initEventListeners();
    
    // التحقق من حالة المستخدم
    checkAuthStatus();
    
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
    
    // تحميل الحجوزات الحالية
    loadCurrentBookings();
}

// ======= 🏟️ نظام الملاعب والعرض =======

async function loadStadiums(filters = {}) {
    try {
        showToast('جاري تحميل الملاعب...', 'info');
        
        // محاكاة API - بيانات افتراضية
        const stadiums = [
            {
                id: 1,
                name: "نادي الطيارة - الملعب الرئيسي",
                location: "المقطم - شارع التسعين",
                area: "mokatam",
                type: "artificial",
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
                type: "artificial",
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
                type: "natural",
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
        showToast('تم تحميل الملاعب بنجاح', 'success');
    } catch (err) {
        console.error('Error loading stadiums:', err);
        showToast('جارٍ استخدام البيانات المحلية', 'info');
    }
}

function renderStadiums(stadiums) {
    const container = document.getElementById('stadiumsContainer');
    if (!container) return;
    
    if (!stadiums || stadiums.length === 0) {
        container.innerHTML = getEmptyStateHTML('لا توجد ملاعب تطابق بحثك');
        return;
    }
    
    container.innerHTML = stadiums.map(stadium => {
        const isFavorite = userFavorites.includes(stadium.id);
        const nextSlot = stadium.nextAvailableSlot ? 
            `<div class="next-slot-badge">
               <i class="bi bi-clock"></i> التالي: ${stadium.nextAvailableSlot}
             </div>` : '';

        return `
            <div class="col-lg-4 col-md-6 mb-4">
                <div class="stadium-card h-100">
                    <div class="stadium-image" style="background-image: url('${stadium.image}')">
                        <span class="stadium-badge ${getAvailabilityClass(stadium.availabilityPercentage)}">
                            ${getAvailabilityText(stadium.availabilityPercentage)}
                        </span>
                        <span class="stadium-price">${stadium.price} ج.م/ساعة</span>
                        <span class="stadium-deposit">العربون: ${stadium.deposit} ج.م</span>
                    </div>
                    <div class="stadium-info">
                        <h4 class="stadium-title">${escapeHtml(stadium.name)}</h4>
                        <p class="stadium-location">
                            <i class="bi bi-geo-alt"></i> ${escapeHtml(stadium.location)}
                        </p>
                        
                        ${nextSlot}
                        
                        <div class="stadium-features">
                            ${stadium.features.map(feature => 
                                `<span class="feature">
                                    <i class="bi bi-check-circle"></i>${feature}
                                </span>`
                            ).join('')}
                        </div>
                        
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <div>
                                <div class="rating-stars">
                                    ${generateStarRating(stadium.rating)}
                                </div>
                                <div class="rating-text">${stadium.rating.toFixed(1)} (${stadium.totalRatings} تقييم)</div>
                            </div>
                            <button class="btn btn-outline-danger btn-sm favorite-btn" 
                                    data-stadium-id="${stadium.id}"
                                    onclick="toggleFavorite(${stadium.id})"
                                    title="${isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}">
                                <i class="bi bi-heart${isFavorite ? '-fill' : ''}"></i>
                            </button>
                        </div>

                        <div class="days-selector" id="day-selector-${stadium.id}"></div>

                        <div class="time-slots-container" id="slots-${stadium.id}">
                            <p class="text-muted text-center">اختر يوماً لعرض الأوقات المتاحة</p>
                        </div>

                        <button class="btn btn-primary w-100 mt-3" onclick="showBookingModal(${stadium.id})" id="bookBtn-${stadium.id}">
                            <i class="bi bi-credit-card me-2"></i>احجز وادفع العربون
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    updateFavoriteButtons();
    
    // إضافة منتقي الأيام لكل ملعب
    stadiums.forEach(stadium => {
        setTimeout(() => {
            const daySelectorContainer = document.getElementById(`day-selector-${stadium.id}`);
            if (daySelectorContainer) {
                daySelectorContainer.appendChild(createDaySelector(stadium.id));
            }
            
            checkBookingEligibility(stadium.id);
        }, 100);
    });
}

// ======= 📅 نظام الحجز المتقدم (من user.js) =======

function createDaySelector(stadiumId) {
    const daysContainer = document.createElement('div');
    
    const label = document.createElement('label');
    label.className = 'form-label';
    label.textContent = 'اختر يوم الحجز:';
    daysContainer.appendChild(label);

    const select = document.createElement('select');
    select.className = 'form-select day-select';
    select.onchange = () => loadStadiumSlots(stadiumId, select.value);

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'اختر اليوم';
    select.appendChild(defaultOption);

    const today = new Date();
    const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    
    for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(today.getDate() + i);
        
        const option = document.createElement('option');
        option.value = date.toISOString().split('T')[0];
        option.textContent = `${i === 0 ? 'انهرده' : dayNames[date.getDay()]} - ${date.getDate()} ${monthNames[date.getMonth()]}`;
        select.appendChild(option);
    }

    daysContainer.appendChild(select);
    return daysContainer;
}

async function loadStadiumSlots(stadiumId, date) {
    try {
        const slotsContainer = document.getElementById(`slots-${stadiumId}`);
        if (!slotsContainer) return;
        
        if (!date) {
            slotsContainer.innerHTML = '<p class="text-muted text-center">اختر يوماً لعرض الأوقات المتاحة</p>';
            return;
        }

        // محاكاة بيانات الساعات المتاحة
        const availableSlots = [
            { start_time: '16:00', end_time: '17:00', available: true },
            { start_time: '18:00', end_time: '19:00', available: true },
            { start_time: '20:00', end_time: '21:00', available: true },
            { start_time: '22:00', end_time: '23:00', available: false }
        ];
        
        slotsContainer.innerHTML = '';
        
        if (availableSlots.length === 0) {
            const message = document.createElement('p');
            message.className = 'text-danger text-center';
            message.textContent = 'لا توجد أوقات متاحة في هذا التاريخ';
            slotsContainer.appendChild(message);
            return;
        }
        
        availableSlots.forEach(slot => {
            const slotElement = document.createElement('div');
            slotElement.className = `time-slot ${slot.available ? 'available' : 'booked'}`;
            slotElement.setAttribute('role', 'button');
            slotElement.setAttribute('tabindex', '0');
            slotElement.dataset.start = slot.start_time;
            slotElement.dataset.end = slot.end_time;
            slotElement.textContent = `${formatTimeDisplay(slot.start_time)} - ${formatTimeDisplay(slot.end_time)}`;
            slotElement.innerHTML += !slot.available ? ' (محجوز)' : '';

            if (slot.available) {
                slotElement.addEventListener('click', () => selectTimeSlot(slotElement, stadiumId, slot.start_time, slot.end_time));
                slotElement.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        selectTimeSlot(slotElement, stadiumId, slot.start_time, slot.end_time);
                    }
                });
            } else {
                slotElement.style.cursor = 'not-allowed';
                slotElement.style.opacity = '0.6';
            }

            slotsContainer.appendChild(slotElement);
        });
        
    } catch (error) {
        console.error('Error loading slots:', error);
        const slotsContainer = document.getElementById(`slots-${stadiumId}`);
        slotsContainer.innerHTML = '<p class="text-danger text-center">حدث خطأ في تحميل الأوقات</p>';
    }
}

function selectTimeSlot(element, stadiumId, startTime, endTime) {
    const card = element.closest('.stadium-card');
    card.querySelectorAll('.time-slot').forEach(slot => {
        slot.classList.remove('selected');
    });
    
    element.classList.add('selected');
    selectedStadiumId = stadiumId;
    selectedTime = startTime;
    selectedDate = document.querySelector(`#day-selector-${stadiumId} .day-select`).value;
}

function formatTimeDisplay(time) {
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    const suffix = hour >= 12 && hour !== 24 ? 'م' : 'ص';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${displayHour}:${m} ${suffix}`;
}

// ======= 🎫 نظام الحجز والدفع =======

function showBookingModal(stadiumId) {
    if (!checkAuthStatus()) {
        showToast('يجب تسجيل الدخول أولاً', 'warning');
        window.location.href = '/login.html';
        return;
    }

    if (!selectedTime || !selectedDate) {
        showToast('⚠️ يرجى اختيار التاريخ والوقت أولاً', 'warning');
        return;
    }
    
    const stadium = currentStadiums.find(s => s.id === stadiumId);
    if (!stadium) return;
    
    // تعبئة بيانات الحجز
    document.getElementById('pitchId').value = stadiumId;
    document.getElementById('selectedTime').value = selectedTime;
    document.getElementById('selectedDate').value = selectedDate;
    
    const bookingDetails = document.getElementById('bookingDetails');
    bookingDetails.innerHTML = `
        <div class="alert alert-info">
            <h6>تفاصيل الحجز:</h6>
            <p class="mb-1"><strong>الملعب:</strong> ${stadium.name}</p>
            <p class="mb-1"><strong>التاريخ:</strong> ${selectedDate}</p>
            <p class="mb-1"><strong>الوقت:</strong> ${formatTimeDisplay(selectedTime)}</p>
            <p class="mb-0"><strong>العربون:</strong> ${stadium.deposit} ج.م</p>
        </div>
    `;
    
    // عرض المودال
    const modal = new bootstrap.Modal(document.getElementById('bookingModal'));
    modal.show();
}

// معالجة نموذج الحجز
document.getElementById('bookingForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (!checkAuthStatus()) {
        showToast('يجب تسجيل الدخول أولاً', 'warning');
        return;
    }

    const formData = new FormData(this);
    const name = formData.get('name');
    const phone = formData.get('phone');
    const stadiumId = formData.get('pitchId');
    const playersNeeded = parseInt(formData.get('playersNeeded')) || 0;
    
    if (!name || !phone) {
        showToast('⚠️ يرجى ملء جميع الحقول', 'warning');
        return;
    }
    
    const submitBtn = this.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="bi bi-clock me-2"></i>جاري المعالجة...';

    try {
        // محاكاة API الحجز
        const bookingData = {
            field_id: stadiumId,
            booking_date: selectedDate,
            start_time: selectedTime,
            end_time: selectedTime.replace(/(\d+):/, (match, hour) => `${parseInt(hour) + 1}:`),
            duration_hours: 1,
            players_needed: playersNeeded,
            code_id: appliedCodeId
        };

        const result = await apiRequest('/api/booking/create', 'POST', bookingData);

        if (result.deposit_required) {
            showToast('✅ تم تسجيل طلبك! سيتم توجيهك لصفحة الدفع.', 'success');
            setTimeout(() => {
                window.location.href = result.payment_url || '/payment.html';
            }, 2000);
        } else {
            showToast('✅ ' + result.message, 'success');
        }

        // إغلاق المودال
        const modal = bootstrap.Modal.getInstance(document.getElementById('bookingModal'));
        modal.hide();
        
        // إعادة تعيين النموذج
        this.reset();
        
        // إعادة تعيين الاختيارات
        selectedStadiumId = null;
        selectedTime = '';
        selectedDate = '';
        appliedCodeId = null;
        
    } catch (error) {
        console.error('Booking error:', error);
        showToast('❌ ' + (error.message || 'حدث خطأ في الحجز'), 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
});

// ======= ⭐ نظام المفضلة =======

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

// ======= 🎫 نظام الأكواد والڤاوتشرات (من التعديلات) =======

async function validateVoucher(inputId) {
    const voucherInput = document.getElementById(inputId);
    const voucherCode = voucherInput?.value?.trim();
    const resultContainer = document.getElementById('voucherResult');
    
    if (!voucherCode) {
        resultContainer.innerHTML = '';
        appliedCodeId = null;
        return; 
    }
    
    showLoading(true);

    try {
        // محاكاة API التحقق من الكود
        const response = await apiRequest("/api/codes/validate", 'POST', { 
            codeValue: voucherCode, 
            fieldId: selectedStadiumId 
        });

        appliedCodeId = response.codeId;
        showLoading(false);
        
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

    } catch (error) {
        showLoading(false);
        appliedCodeId = null;
        resultContainer.innerHTML = `
            <div class="alert alert-danger p-2 small m-0">
                ❌ ${error.message || 'الكود غير صالح.'}
            </div>
        `;
    }
}

// ======= 🔔 نظام الإشعارات (من التعديلات) =======

async function loadNotifications() {
    const badge = document.getElementById('notificationBadge');
    const list = document.getElementById('notificationsList');
    
    try {
        list.innerHTML = '<li><span class="dropdown-item text-center text-info">جاري التحميل...</span></li>';
        list.style.display = 'block';
        
        // محاكاة API الإشعارات
        const response = await apiRequest("/api/notifications", 'GET');
        const { notifications, unreadCount } = response;
        
        // تحديث العداد
        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
        
        // تحديث القائمة
        list.innerHTML = '';
        
        if (notifications.length === 0) {
            list.innerHTML = '<li><span class="dropdown-item text-muted text-center">لا توجد إشعارات.</span></li>';
        } else {
            notifications.forEach(n => {
                const item = document.createElement('li');
                item.innerHTML = `<a class="dropdown-item ${n.is_read ? 'text-muted' : 'fw-bold bg-light'}" href="#">
                    <i class="bi bi-bell${n.is_read ? '' : '-fill'}"></i> ${n.message}
                    <span class="d-block small text-end mt-1 text-secondary">${new Date(n.created_at).toLocaleString('ar-EG')}</span>
                </a>`;
                list.appendChild(item);
            });
        }
        
        list.innerHTML += '<li><hr class="dropdown-divider"></li>';
        list.innerHTML += `<li><a class="dropdown-item text-center text-muted" href="#" onclick="markAllAsRead(event)">وضع علامة مقروء على الكل</a></li>`;

    } catch (error) {
        console.error('فشل تحميل الإشعارات:', error);
        list.innerHTML = '<li><span class="dropdown-item text-danger">فشل تحميل الإشعارات.</span></li>';
    }
}

async function markAllAsRead(event) {
    if(event) event.preventDefault();
    try {
        showLoading(true);
        await apiRequest("/api/notifications/mark-all-read", 'POST');
        showLoading(false);
        showToast('تم تحديث جميع الإشعارات.', 'info');
        loadNotifications();
    } catch (error) {
        showLoading(false);
        showToast('فشل في وضع علامة مقروء.', 'error');
    }
}

// ======= 👤 نظام واجهات المستخدم (من user.js) =======

const views = {
    // 1. حجوزاتي
    'my-bookings': async () => {
        try {
            const bookings = await apiRequest('/player/bookings', 'GET');
            
            if (bookings.length === 0) {
                return `<div class="alert alert-warning">لا توجد لديك حجوزات سابقة أو قادمة.</div>`;
            }

            const htmlContent = bookings.map(b => {
                const statusClass = b.status === 'booked_confirmed' ? 'status-confirmed' : 
                                 b.status === 'booked_unconfirmed' ? 'status-unconfirmed' : 'status-cancelled';
                const statusText = b.status === 'booked_confirmed' ? 'مؤكد' : 
                                b.status === 'booked_unconfirmed' ? 'غير مؤكد (بانتظار الدفع)' : 'ملغاة';
                
                return `
                    <div class="card card-field mb-3">
                        <div class="card-body d-flex justify-content-between align-items-center">
                            <div>
                                <h5>${b.field_name} - ${b.location || 'غير محدد'}</h5>
                                <p class="text-muted mb-1">التاريخ: ${new Date(b.booking_date).toLocaleDateString()} من ${b.start_time} إلى ${b.end_time}</p>
                                <p class="mb-0">المبلغ الإجمالي: ${b.total_amount} جنيه، العربون: ${b.deposit_amount} جنيه.</p>
                            </div>
                            <span class="booking-status-badge ${statusClass}">${statusText}</span>
                        </div>
                    </div>
                `;
            }).join('');

            return `<h2 class="mb-4">📄 حجوزاتي السابقة والقادمة (${bookings.length})</h2>${htmlContent}`;

        } catch (error) {
            return `<div class="alert alert-danger">فشل في تحميل الحجوزات: ${error.message}</div>`;
        }
    },

    // 2. لاعبوني معاكم
    'team-requests': async () => {
        try {
            const requests = await apiRequest('/player/requests', 'GET');
            
            if (requests.length === 0) {
                return `<div class="alert alert-success">لا توجد طلبات لاعبين مفتوحة حالياً يمكنك الانضمام إليها.</div>`;
            }

            const htmlContent = requests.map(r => `
                <div class="card card-field mb-3">
                    <div class="card-body">
                        <h5>${r.field_name} - بتاريخ ${new Date(r.booking_date).toLocaleDateString()}</h5>
                        <p class="mb-1 text-muted">من: ${r.start_time} حتى: ${r.end_time}</p>
                        <p class="text-primary fw-bold">مطلوب: ${r.players_needed} لاعبين إضافيين.</p>
                        <p class="small">الحاجز: ${r.booker_name}</p>
                        <button class="btn btn-sm btn-outline-primary" onclick="joinTeamRequest(${r.request_id})">انضمام</button>
                    </div>
                </div>
            `).join('');

            return `<h2 class="mb-4">👥 طلبات الانضمام المفتوحة (${requests.length})</h2>${htmlContent}`;

        } catch (error) {
            return `<div class="alert alert-danger">فشل في تحميل طلبات اللاعبين: ${error.message}</div>`;
        }
    },

    // 3. ملفي الشخصي
    'profile': async () => {
        const profile = JSON.parse(sessionStorage.getItem('playerProfile')) || userSession;
        if (!profile) return `<div class="alert alert-danger">لا يمكن تحميل البيانات. يرجى تسجيل الخروج والدخول مجدداً.</div>`;
        
        return `
            <h2 class="mb-4">👤 تعديل الملف الشخصي</h2>
            <form id="profileForm" class="form-section">
                <div class="mb-3">
                    <label for="profileName" class="form-label">الاسم الكامل</label>
                    <input type="text" class="form-control" id="profileName" name="name" value="${profile.name}" required>
                </div>
                <div class="mb-3">
                    <label for="profileEmail" class="form-label">البريد الإلكتروني</label>
                    <input type="email" class="form-control" id="profileEmail" value="${profile.email}" disabled>
                </div>
                <div class="mb-3">
                    <label for="profilePhone" class="form-label">رقم الهاتف</label>
                    <input type="tel" class="form-control" id="profilePhone" name="phone" value="${profile.phone || ''}">
                </div>
                
                <hr>
                
                <h5 class="mt-4 mb-3">تغيير كلمة المرور (اختياري)</h5>
                <div class="mb-3">
                    <label for="currentPassword" class="form-label">كلمة المرور الحالية</label>
                    <input type="password" class="form-control" id="currentPassword" name="current_password">
                </div>
                <div class="mb-3">
                    <label for="newPassword" class="form-label">كلمة المرور الجديدة</label>
                    <input type="password" class="form-control" id="newPassword" name="password">
                </div>

                <button type="submit" class="btn btn-primary w-100 mt-4">حفظ التغييرات</button>
            </form>
        `;
    }
};

async function loadView(viewName) {
    const mainContent = document.getElementById('mainContent');
    if (!mainContent) return;

    mainContent.innerHTML = `<div class="container-fluid pt-5 text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div><p class="mt-2">جاري تحميل واجهة ${viewName}...</p></div>`;
    
    // تحديث القائمة النشطة
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });

    try {
        if (views[viewName]) {
            const html = await views[viewName]();
            mainContent.innerHTML = `<div class="container-fluid pt-4">${html}</div>`;
            
            if (viewName === 'profile') {
                document.getElementById('profileForm').addEventListener('submit', handleProfileUpdate);
            }
        } else {
            mainContent.innerHTML = `<div class="alert alert-warning">الواجهة المطلوبة غير موجودة.</div>`;
        }
    } catch (error) {
        mainContent.innerHTML = `<div class="alert alert-danger">حدث خطأ أثناء تحميل الواجهة: ${error.message}</div>`;
    }
}

async function handleProfileUpdate(e) {
    e.preventDefault();
    const form = e.target;
    const data = {
        name: form.name.value,
        phone: form.phone.value,
        current_password: form.current_password.value,
        password: form.password.value,
    };
    
    if (!data.current_password || !data.password) {
        delete data.current_password;
        delete data.password;
    }
    
    try {
        const result = await apiRequest('/user/profile', 'PUT', data);
        showToast(result.message, 'success');
        // تحديث بيانات الجلسة
        userSession = { ...userSession, ...data };
        localStorage.setItem('userData', JSON.stringify(userSession));
        updateUIForLoggedInUser();

    } catch (error) {
        showToast(error.message, 'error');
    }
}

// ======= 🏆 نظام الساعات الذهبية =======

async function loadGoldenSlots() {
    try {
        // محاكاة API الساعات الذهبية
        goldenSlots = await apiRequest('/api/golden-slots');
        updateGoldenSlotsDisplay();
    } catch (error) {
        console.error('Error loading golden slots:', error);
        goldenSlots = [];
    }
}

function updateGoldenSlotsDisplay() {
    // تطبيق الساعات الذهبية على الواجهة
    goldenSlots.forEach(slot => {
        const timeSlotElement = document.querySelector(`[data-start="${slot.start_time}"]`);
        if (timeSlotElement) {
            timeSlotElement.classList.add('golden');
            timeSlotElement.innerHTML += ' 👥';
        }
    });
}

async function joinTeamRequest(requestId) {
    if (!checkAuthStatus()) {
        showToast('يجب تسجيل الدخول أولاً', 'warning');
        return;
    }

    try {
        const result = await apiRequest(`/player/requests/${requestId}/join`, 'POST');
        showToast('✅ ' + result.message, 'success');
        loadView('team-requests');
    } catch (error) {
        showToast('❌ ' + error.message, 'error');
    }
}

// ======= 🗑️ نظام إلغاء الحجز =======

function cancelCurrentBooking() {
    if (currentBookings.length === 0) {
        showToast('لا توجد حجوزات حالية', 'error');
        return;
    }
    
    currentCancellationBooking = currentBookings[0];
    const bookingDate = new Date(currentCancellationBooking.date);
    const now = new Date();
    const hoursDiff = (bookingDate - now) / (1000 * 60 * 60);
    
    let policyText = '';
    if (hoursDiff > 48) {
        policyText = 'سيتم استرداد كامل المبلغ المدفوع + كود تعويض صالح لمدة 14 يوم.';
    } else if (hoursDiff > 24) {
        policyText = 'سيتم إصدار كود تعويض صالح لمدة 14 يوم (بدون استرداد نقدي).';
    } else {
        policyText = 'لا يمكن استرداد المبلغ أو إصدار كود تعويض للإلغاء في وقت متأخر.';
    }
    
    document.getElementById('cancellationPolicy').textContent = policyText;
    document.getElementById('finalCancellationInfo').textContent = policyText;
    
    currentCancellationStep = 1;
    resetCancellationSteps();
    
    const cancelModal = new bootstrap.Modal(document.getElementById('cancelBookingModal'));
    cancelModal.show();
}

function nextCancellationStep() {
    const currentStep = document.getElementById(`step${currentCancellationStep}`);
    const nextStep = document.getElementById(`step${currentCancellationStep + 1}`);
    
    if (currentCancellationStep === 1 && !document.getElementById('confirmCancellation').checked) {
        showToast('يرجى تأكيد رغبتك في الإلغاء', 'error');
        return;
    }
    
    if (currentCancellationStep === 2 && !document.getElementById('cancellationReason').value) {
        showToast('يرجى اختيار سبب الإلغاء', 'error');
        return;
    }
    
    if (currentStep && nextStep) {
        currentStep.classList.remove('active');
        currentStep.style.display = 'none';
        nextStep.classList.add('active');
        nextStep.style.display = 'block';
        currentCancellationStep++;
    }
    
    if (currentCancellationStep === 3) {
        document.getElementById('nextCancellationStep').style.display = 'none';
        document.getElementById('confirmCancellationBtn').style.display = 'block';
    }
}

function resetCancellationSteps() {
    for (let i = 1; i <= 3; i++) {
        const step = document.getElementById(`step${i}`);
        step.classList.remove('active');
        step.style.display = i === 1 ? 'block' : 'none';
        if (i === 1) step.classList.add('active');
    }
    
    document.getElementById('nextCancellationStep').style.display = 'block';
    document.getElementById('confirmCancellationBtn').style.display = 'none';
    
    document.getElementById('confirmCancellation').checked = false;
    document.getElementById('cancellationReason').value = '';
    document.getElementById('otherReason').style.display = 'none';
    document.getElementById('finalConfirm').checked = false;
}

async function confirmCancellation() {
    if (!document.getElementById('finalConfirm').checked) {
        showToast('يرجى الموافقة على سياسة الإلغاء', 'error');
        return;
    }

    const reason = document.getElementById('cancellationReason').value === 'آخر' ? 
                  document.getElementById('otherReason').value : 
                  document.getElementById('cancellationReason').value;

    try {
        const result = await apiRequest(`/api/bookings/${currentCancellationBooking.id}/cancel`, 'POST', {
            reason: reason
        });

        showToast(result.message, 'success');
        document.getElementById('bookingTracker').style.display = 'none';
        bootstrap.Modal.getInstance(document.getElementById('cancelBookingModal')).hide();
        loadCurrentBookings();
    } catch (error) {
        showToast(error.message || 'حدث خطأ أثناء إلغاء الحجز', 'error');
    }
}

// ======= 🛠️ دوال المساعدة =======

// دالة API عامة
async function apiRequest(url, method = 'GET', data = null) {
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        }
    };
    
    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }
    
    if (data && method !== 'GET') {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(url, options);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || 'حدث خطأ في الخادم');
        }
        
        return result;
    } catch (error) {
        throw error;
    }
}

// دوال المساعدة الأساسية
function showLoading(show = true) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = show ? 'flex' : 'none';
    }
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'bg-danger' : type === 'warning' ? 'bg-warning' : 'bg-success'}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 4000);
}

function escapeHtml(unsafe) {
    return String(unsafe)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

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

function getAvailabilityClass(percentage) {
    if (percentage < 30) return 'availability-low';
    if (percentage < 60) return 'availability-medium';
    return 'availability-high';
}

function getAvailabilityText(percentage) {
    if (percentage < 30) return 'محدود';
    if (percentage < 60) return 'متوسط';
    return 'متاح';
}

function getEmptyStateHTML(message) {
    return `
        <div class="col-12">
            <div class="empty-state">
                <i class="bi bi-search"></i>
                <h5>${message}</h5>
                <p>جرب تعديل فلتر البحث أو البحث بكلمات أخرى</p>
                <button class="btn btn-primary" onclick="resetFilters()">
                    <i class="bi bi-arrow-clockwise"></i> إعادة تعيين الفلاتر
                </button>
            </div>
        </div>`;
}

function checkBookingEligibility(stadiumId) {
    const token = localStorage.getItem('authToken');
    const bookBtn = document.getElementById(`bookBtn-${stadiumId}`);
    
    if (!token && bookBtn) {
        bookBtn.innerHTML = '<i class="bi bi-person me-2"></i>سجل الدخول أولاً';
        bookBtn.onclick = () => {
            showToast('يرجى تسجيل الدخول أولاً للحجز', 'warning');
            window.location.href = '/login.html';
        };
    }
}

function debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

// ======= 🎨 نظام الوضع الليلي =======

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

function setupFilters() {
    const searchInput = document.getElementById('searchStadiums');
    const areaFilter = document.getElementById('areaFilter');
    const priceFilter = document.getElementById('priceFilter');
    const ratingFilter = document.getElementById('ratingFilter');
    const sortFilter = document.getElementById('sortFilter');
    const typeFilter = document.getElementById('typeFilter');
    const availabilityFilter = document.getElementById('availabilityFilter');
    
    if (searchInput) {
        searchInput.addEventListener('input', debounce(filterStadiums, 300));
    }
    
    if (areaFilter) areaFilter.addEventListener('change', filterStadiums);
    if (priceFilter) priceFilter.addEventListener('change', filterStadiums);
    if (ratingFilter) ratingFilter.addEventListener('change', filterStadiums);
    if (sortFilter) sortFilter.addEventListener('change', filterStadiums);
    if (typeFilter) typeFilter.addEventListener('change', filterStadiums);
    if (availabilityFilter) availabilityFilter.addEventListener('change', filterStadiums);
}

function filterStadiums() {
    const searchTerm = document.getElementById('searchStadiums')?.value.toLowerCase() || '';
    const area = document.getElementById('areaFilter')?.value || '';
    const price = document.getElementById('priceFilter')?.value || '';
    const rating = document.getElementById('ratingFilter')?.value || '';
    const type = document.getElementById('typeFilter')?.value || '';
    const availability = document.getElementById('availabilityFilter')?.value || '';
    
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
    
    // فلترة بالنوع
    if (type) {
        filtered = filtered.filter(stadium => stadium.type === type);
    }
    
    // فلترة بالتوفر
    if (availability) {
        if (availability === 'available') {
            filtered = filtered.filter(stadium => stadium.availabilityPercentage > 50);
        } else if (availability === 'soon') {
            filtered = filtered.filter(stadium => stadium.availabilityPercentage <= 50 && stadium.availabilityPercentage > 0);
        }
    }
    
    renderStadiums(filtered);
    
    if (filtered.length === 0) {
        showToast('⚠️ لا توجد ملاعب تطابق بحثك', 'warning');
    }
}

function resetFilters() {
    const filters = ['areaFilter', 'typeFilter', 'ratingFilter', 'sortFilter', 'priceFilter', 'searchStadiums', 'availabilityFilter'];
    filters.forEach(filterId => {
        const element = document.getElementById(filterId);
        if (element) element.value = '';
    });
    
    loadStadiums();
    showToast('تم إعادة تعيين جميع الفلاتر', 'info');
}

// ======= 📊 دوال البيانات الإضافية =======

async function loadBanners() {
    try {
        const banners = await apiRequest('/api/homepage-banners?active=true');
        renderBanners(banners);
    } catch (error) {
        console.error('Error loading banners:', error);
        renderDefaultBanners();
    }
}

function renderBanners(banners) {
    const container = document.getElementById('bannersContainer');
    if (!container) return;
    
    container.innerHTML = banners.map(banner => `
        <div class="col-md-6 mb-3">
            <div class="banner-card">
                <div class="banner-image" style="background-image: url('${banner.image || 'https://placehold.co/600x400/667eea/white?text=عرض+خاص'}')">
                    ${banner.badge ? `<span class="banner-badge">${banner.badge}</span>` : ''}
                </div>
                <div class="banner-content">
                    <h5>${escapeHtml(banner.title)}</h5>
                    <p class="text-muted">${escapeHtml(banner.description)}</p>
                    ${banner.ctaText ? `
                        <button class="btn btn-primary w-100" onclick="${banner.ctaAction || 'showToast(\\'جاري التوجيه...\\', \\'info\\')'}">
                            ${banner.ctaText}
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

function renderDefaultBanners() {
    const container = document.getElementById('bannersContainer');
    container.innerHTML = `
        <div class="col-md-6 mb-3">
            <div class="banner-card">
                <div class="banner-image" style="background-image: url('https://placehold.co/600x400/667eea/white?text=خصم+25%')">
                    <span class="banner-badge">🔥 محدود</span>
                </div>
                <div class="banner-content">
                    <h5>خصم 25% على الحجوزات المسائية</h5>
                    <p class="text-muted">استمتع بخصم خاص على الحجوزات بعد الساعة 8 مساءً</p>
                    <button class="btn btn-primary w-100" onclick="showToast('جاري التوجيه للحجوزات المسائية', 'info')">
                        احجز الآن
                    </button>
                </div>
            </div>
        </div>
        <div class="col-md-6 mb-3">
            <div class="banner-card">
                <div class="banner-image" style="background-image: url('https://placehold.co/600x400/764ba2/white?text=لاعبوني+معاكم')">
                    <span class="banner-badge">👥 جديد</span>
                </div>
                <div class="banner-content">
                    <h5>لاعبوني معاكم - الساعات الذهبية</h5>
                    <p class="text-muted">انضم لمباريات جديدة واجذب لاعبين إضافيين لمباراتك</p>
                    <button class="btn btn-primary w-100" onclick="loadView('team-requests')">
                        اكتشف المزيد
                    </button>
                </div>
            </div>
        </div>
    `;
}

async function loadFeaturedStadiums() {
    try {
        const stadiums = await apiRequest('/api/stadiums?featured=true&limit=3');
        renderFeaturedStadiums(stadiums);
    } catch (error) {
        console.error('Error loading featured stadiums:', error);
    }
}

function renderFeaturedStadiums(stadiums) {
    const container = document.getElementById('featuredStadiumsContainer');
    if (!container) return;
    
    container.innerHTML = stadiums.map(stadium => `
        <div class="col-lg-4 col-md-6 mb-4">
            <div class="stadium-card h-100">
                <div class="stadium-image" style="background-image: url('${stadium.image}')">
                    <span class="featured-badge">⭐ مميز</span>
                    <span class="stadium-badge availability-high">الأكثر طلباً</span>
                    <span class="stadium-price">${stadium.price} ج.م/ساعة</span>
                </div>
                <div class="stadium-info">
                    <h4 class="stadium-title">${escapeHtml(stadium.name)}</h4>
                    <p class="stadium-location">
                        <i class="bi bi-geo-alt"></i> ${escapeHtml(stadium.location)}
                    </p>
                    
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <div>
                            <div class="rating-stars">
                                ${generateStarRating(stadium.rating)}
                            </div>
                            <div class="rating-text">${stadium.rating.toFixed(1)} (${stadium.totalRatings} تقييم)</div>
                        </div>
                    </div>

                    <button class="btn btn-primary w-100" onclick="showBookingModal(${stadium.id})">
                        <i class="bi bi-credit-card me-2"></i>احجز الآن
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

async function loadCurrentBookings() {
    try {
        const bookings = await apiRequest('/api/user/bookings');
        currentBookings = bookings.filter(b => 
            b.status === 'confirmed' && 
            new Date(b.date) > new Date()
        );
        
        if (currentBookings.length > 0) {
            showBookingTracker(currentBookings[0]);
        }
    } catch (error) {
        console.error('Error loading bookings:', error);
    }
}

function showBookingTracker(booking) {
    const tracker = document.getElementById('bookingTracker');
    const progress = document.getElementById('trackerProgress');
    
    if (!booking.createdAt) return;

    document.getElementById('trackerTitle').textContent = `متابعة حجز: ${escapeHtml(booking.pitchName)}`;
    document.getElementById('trackerDetails').textContent = 
        `الملعب: ${escapeHtml(booking.pitchName)} | التاريخ: ${escapeHtml(booking.date)} | الوقت: ${escapeHtml(booking.time)}`;
    
    const now = new Date();
    const bookingDate = new Date(booking.date);
    const createdAt = new Date(booking.createdAt);
    
    if (isNaN(bookingDate.getTime()) || isNaN(createdAt.getTime())) {
        return;
    }

    const totalTime = bookingDate - createdAt;
    const elapsedTime = now - createdAt;
    const progressPercent = Math.min((elapsedTime / totalTime) * 100, 100);
    
    progress.style.width = `${progressPercent}%`;
    
    const timeLeft = bookingDate - now;
    const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
    
    if (hoursLeft > 48) {
        document.getElementById('trackerStatus').textContent = `متبقي ${hoursLeft} ساعة للحجز - المبلغ المتبقي: ${booking.remainingAmount} جنيه`;
    } else if (hoursLeft > 0) {
        document.getElementById('trackerStatus').textContent = `متبقي ${hoursLeft} ساعة للحجز - يرجى دفع المبلغ المتبقي`;
    } else {
        document.getElementById('trackerStatus').textContent = 'تم انتهاء وقت الحجز';
    }
    
    tracker.style.display = 'block';
}

function viewBookingDetails() {
    if (currentBookings.length > 0) {
        const booking = currentBookings[0];
        showToast(`تفاصيل الحجز:\nالملعب: ${booking.pitchName}\nالتاريخ: ${booking.date}\nالوقت: ${booking.time}\nالمبلغ المتبقي: ${booking.remainingAmount} جنيه`, 'info');
    } else {
        showToast('لا توجد حجوزات حالية', 'error');
    }
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
    
    // نظام الإشعارات
    const notificationsToggle = document.getElementById('notificationsToggle');
    if (notificationsToggle) {
        notificationsToggle.addEventListener('click', loadNotifications);
    }
    
    // إعداد سبب الإلغاء
    const cancellationReason = document.getElementById('cancellationReason');
    if (cancellationReason) {
        cancellationReason.addEventListener('change', function() {
            const otherReason = document.getElementById('otherReason');
            if (otherReason) {
                otherReason.style.display = this.value === 'آخر' ? 'block' : 'none';
            }
        });
    }
    
    // إعداد أحداث النجوم في التقييم
    document.querySelectorAll('#ratingStars .star').forEach(star => {
        star.addEventListener('click', function() {
            const rating = parseInt(this.dataset.rating);
            document.getElementById('selectedRating').value = rating;
            
            document.querySelectorAll('#ratingStars .star').forEach(s => {
                const starRating = parseInt(s.dataset.rating);
                if (starRating <= rating) {
                    s.classList.add('active', 'bi-star-fill');
                    s.classList.remove('bi-star');
                } else {
                    s.classList.remove('active', 'bi-star-fill');
                    s.classList.add('bi-star');
                }
            });
        });
    });
}

// ======= 🚀 بدء التطبيق =======

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
