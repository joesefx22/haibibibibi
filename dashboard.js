// script.js - ملف الجافاسكريبت الموحد لكل الوظائف والدوال

/**
 * 🚀 نظام إدارة الملاعب الموحد
 * يحتوي على كل الدوال والوظائف للإدمن، المالك، والموظف
 */

// =============================================
// 🔧 الإعدادات العامة والمتغيرات العالمية
// =============================================
class StadiumManagementSystem {
    constructor(role) {
        this.role = role; // 'admin', 'owner', 'employee'
        this.currentUser = null;
        this.userData = {};
        this.systemData = {
            stadiums: [],
            bookings: [],
            payments: [],
            users: [],
            timeSlots: [],
            notifications: [],
            activityLogs: [],
            pendingManagers: []
        };
        this.filters = {
            stadiums: {},
            bookings: {},
            payments: {},
            users: {},
            activityLogs: {}
        };
        this.charts = {};
        this.selectedStadium = null;
        this.currentAction = null;
        
        this.init();
    }

    // =============================================
    // 🎯 التهيئة الأساسية
    // =============================================
    async init() {
        console.log(`🚀 بدء تهيئة نظام ${this.role}...`);
        
        try {
            await this.checkAuthentication();
            await this.loadUserData();
            await this.loadInitialData();
            this.setupEventListeners();
            this.initializeCharts();
            this.startAutoRefresh();
            
            console.log(`✅ تم تهيئة نظام ${this.role} بنجاح`);
            this.showAlert(`مرحباً ${this.currentUser?.username || 'بالنظام'}`, 'success');
        } catch (error) {
            console.error('❌ خطأ في التهيئة:', error);
            this.handleApiError(error, 'init');
        }
    }

    // =============================================
    // 🔐 نظام المصادقة والأمان
    // =============================================
    async checkAuthentication() {
        const token = localStorage.getItem('authToken');
        const userData = localStorage.getItem('userData');
        
        if (!token || !userData) {
            this.redirectToLogin();
            return;
        }

        try {
            const response = await this.apiCall('/api/auth/verify', 'GET');
            if (response.success) {
                this.currentUser = response.user;
                this.userData = JSON.parse(userData);
                
                // التحقق من الصلاحيات
                if (!this.hasPermission(this.role)) {
                    this.redirectToUnauthorized();
                    return;
                }
            } else {
                this.redirectToLogin();
            }
        } catch (error) {
            console.error('خطأ في المصادقة:', error);
            this.redirectToLogin();
        }
    }

    hasPermission(requiredRole) {
        const userRole = this.currentUser?.role;
        const roleHierarchy = {
            'admin': ['admin', 'owner', 'employee'],
            'owner': ['owner', 'employee'],
            'employee': ['employee']
        };
        
        return roleHierarchy[requiredRole]?.includes(userRole) || false;
    }

    redirectToLogin() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        window.location.href = '/login.html';
    }

    redirectToUnauthorized() {
        window.location.href = '/unauthorized.html';
    }

    // =============================================
    // 📡 نظام الاتصال بالخادم
    // =============================================
    async apiCall(endpoint, method = 'GET', data = null) {
        const token = localStorage.getItem('authToken');
        const config = {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        };

        if (data && (method === 'POST' || method === 'PUT')) {
            config.body = JSON.stringify(data);
        }

        try {
            this.showLoading(true);
            const response = await fetch(endpoint, config);
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || 'خطأ في الخادم');
            }
            
            return result;
        } catch (error) {
            throw error;
        } finally {
            this.showLoading(false);
        }
    }

    // =============================================
    // 📊 دوال تحميل البيانات
    // =============================================
    async loadInitialData() {
        const loaders = [
            this.loadStadiums(),
            this.loadBookings(),
            this.loadPayments()
        ];

        // إضافة دوال إضافية حسب الصلاحية
        if (this.role === 'admin') {
            loaders.push(this.loadUsers(), this.loadPendingManagers(), this.loadActivityLogs());
        }
        
        if (this.role === 'owner' || this.role === 'admin') {
            loaders.push(this.loadTimeSlots(), this.loadNotifications());
        }

        await Promise.all(loaders);
        this.updateDashboard();
    }

    async loadStadiums() {
        try {
            const endpoint = this.role === 'admin' ? '/api/admin/stadiums' : '/api/owner/stadiums';
            const result = await this.apiCall(endpoint);
            this.systemData.stadiums = result.stadiums || [];
            this.updateStadiumsDisplay();
            this.populateStadiumFilters();
        } catch (error) {
            this.handleApiError(error, 'loadStadiums');
        }
    }

    async loadBookings(filters = {}) {
        try {
            let endpoint = '/api/bookings';
            if (this.role === 'admin') endpoint = '/api/admin/bookings';
            if (this.role === 'owner') endpoint = '/api/owner/bookings';
            if (this.role === 'employee') endpoint = '/api/employee/bookings';

            const queryParams = new URLSearchParams(filters).toString();
            const result = await this.apiCall(`${endpoint}?${queryParams}`);
            
            this.systemData.bookings = result.bookings || [];
            this.updateBookingsDisplay();
            this.updateRecentBookings();
        } catch (error) {
            this.handleApiError(error, 'loadBookings');
        }
    }

    async loadPayments() {
        try {
            const endpoint = this.role === 'admin' ? '/api/admin/payments' : '/api/owner/payments';
            const result = await this.apiCall(endpoint);
            this.systemData.payments = result.payments || [];
            this.updatePaymentsDisplay();
        } catch (error) {
            this.handleApiError(error, 'loadPayments');
        }
    }

    async loadUsers() {
        try {
            const result = await this.apiCall('/api/admin/users');
            this.systemData.users = result.users || [];
            this.updateUsersDisplay();
        } catch (error) {
            this.handleApiError(error, 'loadUsers');
        }
    }

    async loadTimeSlots(stadiumId = null, date = null) {
        try {
            let endpoint = '/api/time-slots';
            if (stadiumId && date) {
                endpoint = `/api/time-slots/${stadiumId}?date=${date}`;
            }
            
            const result = await this.apiCall(endpoint);
            this.systemData.timeSlots = result.timeSlots || [];
            this.updateTimeSlotsDisplay();
        } catch (error) {
            this.handleApiError(error, 'loadTimeSlots');
        }
    }

    async loadNotifications() {
        try {
            const result = await this.apiCall('/api/notifications');
            this.systemData.notifications = result.notifications || [];
            this.updateNotificationsDisplay();
        } catch (error) {
            this.handleApiError(error, 'loadNotifications');
        }
    }

    async loadActivityLogs() {
        try {
            const result = await this.apiCall('/api/admin/activity-logs');
            this.systemData.activityLogs = result.logs || [];
            this.updateActivityLogsDisplay();
        } catch (error) {
            this.handleApiError(error, 'loadActivityLogs');
        }
    }

    async loadPendingManagers() {
        try {
            const result = await this.apiCall('/api/admin/pending-managers');
            this.systemData.pendingManagers = result.managers || [];
            this.updatePendingManagersDisplay();
        } catch (error) {
            this.handleApiError(error, 'loadPendingManagers');
        }
    }

    // =============================================
    // 🏟️ دوال إدارة الملاعب
    // =============================================
    async createStadium(stadiumData) {
        try {
            const result = await this.apiCall('/api/stadiums', 'POST', stadiumData);
            this.showAlert('✅ تم إنشاء الملعب بنجاح', 'success');
            await this.loadStadiums();
            return result;
        } catch (error) {
            this.handleApiError(error, 'createStadium');
        }
    }

    async updateStadium(stadiumId, updateData) {
        try {
            const result = await this.apiCall(`/api/stadiums/${stadiumId}`, 'PUT', updateData);
            this.showAlert('✅ تم تحديث الملعب بنجاح', 'success');
            await this.loadStadiums();
            return result;
        } catch (error) {
            this.handleApiError(error, 'updateStadium');
        }
    }

    async deleteStadium(stadiumId) {
        try {
            const result = await this.apiCall(`/api/stadiums/${stadiumId}`, 'DELETE');
            this.showAlert('✅ تم حذف الملعب بنجاح', 'success');
            await this.loadStadiums();
            return result;
        } catch (error) {
            this.handleApiError(error, 'deleteStadium');
        }
    }

    async getStadiumStats(stadiumId) {
        try {
            const result = await this.apiCall(`/api/stadiums/${stadiumId}/stats`);
            return result.stats || {};
        } catch (error) {
            this.handleApiError(error, 'getStadiumStats');
            return {};
        }
    }

    // =============================================
    // 📅 دوال إدارة الحجوزات
    // =============================================
    async createBooking(bookingData) {
        try {
            const result = await this.apiCall('/api/bookings', 'POST', bookingData);
            this.showAlert('✅ تم إنشاء الحجز بنجاح', 'success');
            await this.loadBookings();
            return result;
        } catch (error) {
            this.handleApiError(error, 'createBooking');
        }
    }

    async confirmBooking(bookingId) {
        try {
            const endpoint = this.role === 'admin' ? 
                `/api/admin/bookings/${bookingId}/confirm` : 
                `/api/owner/bookings/${bookingId}/confirm`;
            
            const result = await this.apiCall(endpoint, 'POST');
            this.showAlert('✅ تم تأكيد الحجز بنجاح', 'success');
            await this.loadBookings();
            return result;
        } catch (error) {
            this.handleApiError(error, 'confirmBooking');
        }
    }

    async cancelBooking(bookingId, reason = '') {
        try {
            const endpoint = this.role === 'admin' ? 
                `/api/admin/bookings/${bookingId}/cancel` : 
                `/api/owner/bookings/${bookingId}/cancel`;
            
            const result = await this.apiCall(endpoint, 'POST', { reason });
            this.showAlert('✅ تم إلغاء الحجز بنجاح', 'success');
            await this.loadBookings();
            return result;
        } catch (error) {
            this.handleApiError(error, 'cancelBooking');
        }
    }

    async updateBookingStatus(bookingId, status) {
        try {
            const result = await this.apiCall(`/api/bookings/${bookingId}/status`, 'PUT', { status });
            this.showAlert(`✅ تم تحديث حالة الحجز إلى ${this.getStatusText(status)}`, 'success');
            await this.loadBookings();
            return result;
        } catch (error) {
            this.handleApiError(error, 'updateBookingStatus');
        }
    }

    // =============================================
    // 💰 دوال إدارة المدفوعات
    // =============================================
    async processPayment(paymentData) {
        try {
            const result = await this.apiCall('/api/payments', 'POST', paymentData);
            this.showAlert('✅ تم معالجة الدفع بنجاح', 'success');
            await this.loadPayments();
            return result;
        } catch (error) {
            this.handleApiError(error, 'processPayment');
        }
    }

    async refundPayment(paymentId, amount) {
        try {
            const result = await this.apiCall(`/api/payments/${paymentId}/refund`, 'POST', { amount });
            this.showAlert('✅ تم استرجاع المبلغ بنجاح', 'success');
            await this.loadPayments();
            return result;
        } catch (error) {
            this.handleApiError(error, 'refundPayment');
        }
    }

    async updatePaymentStatus(paymentId, status) {
        try {
            const result = await this.apiCall(`/api/payments/${paymentId}/status`, 'PUT', { status });
            this.showAlert(`✅ تم تحديث حالة الدفع إلى ${this.getPaymentStatusText(status)}`, 'success');
            await this.loadPayments();
            return result;
        } catch (error) {
            this.handleApiError(error, 'updatePaymentStatus');
        }
    }

    // =============================================
    // 👥 دوال إدارة المستخدمين (للأدمن فقط)
    // =============================================
    async createUser(userData) {
        try {
            const result = await this.apiCall('/api/admin/users', 'POST', userData);
            this.showAlert('✅ تم إنشاء المستخدم بنجاح', 'success');
            await this.loadUsers();
            return result;
        } catch (error) {
            this.handleApiError(error, 'createUser');
        }
    }

    async updateUser(userId, updateData) {
        try {
            const result = await this.apiCall(`/api/admin/users/${userId}`, 'PUT', updateData);
            this.showAlert('✅ تم تحديث بيانات المستخدم بنجاح', 'success');
            await this.loadUsers();
            return result;
        } catch (error) {
            this.handleApiError(error, 'updateUser');
        }
    }

    async deleteUser(userId) {
        try {
            const result = await this.apiCall(`/api/admin/users/${userId}`, 'DELETE');
            this.showAlert('✅ تم حذف المستخدم بنجاح', 'success');
            await this.loadUsers();
            return result;
        } catch (error) {
            this.handleApiError(error, 'deleteUser');
        }
    }

    async approveManager(userId) {
        try {
            const result = await this.apiCall(`/api/admin/users/${userId}/approve`, 'POST');
            this.showAlert('✅ تمت الموافقة على المدير بنجاح', 'success');
            await this.loadPendingManagers();
            await this.loadUsers();
            return result;
        } catch (error) {
            this.handleApiError(error, 'approveManager');
        }
    }

    async rejectManager(userId) {
        try {
            const result = await this.apiCall(`/api/admin/users/${userId}/reject`, 'POST');
            this.showAlert('✅ تم رفض طلب المدير بنجاح', 'success');
            await this.loadPendingManagers();
            await this.loadUsers();
            return result;
        } catch (error) {
            this.handleApiError(error, 'rejectManager');
        }
    }

    // =============================================
    // 🕒 دوال إدارة الساعات
    // =============================================
    async createTimeSlots(slotsData) {
        try {
            const result = await this.apiCall('/api/time-slots/batch', 'POST', slotsData);
            this.showAlert(`✅ تم إنشاء ${result.addedSlots} ساعة بنجاح`, 'success');
            await this.loadTimeSlots(slotsData.stadiumId, slotsData.date);
            return result;
        } catch (error) {
            this.handleApiError(error, 'createTimeSlots');
        }
    }

    async updateTimeSlot(slotId, updateData) {
        try {
            const result = await this.apiCall(`/api/time-slots/${slotId}`, 'PUT', updateData);
            this.showAlert('✅ تم تحديث الساعة بنجاح', 'success');
            return result;
        } catch (error) {
            this.handleApiError(error, 'updateTimeSlot');
        }
    }

    async deleteTimeSlot(slotId) {
        try {
            const result = await this.apiCall(`/api/time-slots/${slotId}`, 'DELETE');
            this.showAlert('✅ تم حذف الساعة بنجاح', 'success');
            return result;
        } catch (error) {
            this.handleApiError(error, 'deleteTimeSlot');
        }
    }

    async bulkUpdateTimeSlots(slotsData) {
        try {
            const result = await this.apiCall('/api/time-slots/bulk-update', 'PUT', slotsData);
            this.showAlert('✅ تم تحديث الساعات بنجاح', 'success');
            return result;
        } catch (error) {
            this.handleApiError(error, 'bulkUpdateTimeSlots');
        }
    }

    // =============================================
    // 🔔 دوال الإشعارات
    // =============================================
    async sendNotification(notificationData) {
        try {
            const result = await this.apiCall('/api/notifications/send', 'POST', notificationData);
            this.showAlert('✅ تم إرسال الإشعار بنجاح', 'success');
            await this.loadNotifications();
            return result;
        } catch (error) {
            this.handleApiError(error, 'sendNotification');
        }
    }

    async markNotificationAsRead(notificationId) {
        try {
            const result = await this.apiCall(`/api/notifications/${notificationId}/read`, 'PUT');
            await this.loadNotifications();
            return result;
        } catch (error) {
            this.handleApiError(error, 'markNotificationAsRead');
        }
    }

    async deleteNotification(notificationId) {
        try {
            const result = await this.apiCall(`/api/notifications/${notificationId}`, 'DELETE');
            this.showAlert('✅ تم حذف الإشعار بنجاح', 'success');
            await this.loadNotifications();
            return result;
        } catch (error) {
            this.handleApiError(error, 'deleteNotification');
        }
    }

    // =============================================
    // 📈 دوال التقارير والإحصائيات
    // =============================================
    async generateReport(reportData) {
        try {
            const result = await this.apiCall('/api/reports/generate', 'POST', reportData);
            this.showAlert('✅ تم إنشاء التقرير بنجاح', 'success');
            return result;
        } catch (error) {
            this.handleApiError(error, 'generateReport');
        }
    }

    async getDashboardStats() {
        try {
            const endpoint = this.role === 'admin' ? 
                '/api/admin/dashboard/stats' : 
                '/api/owner/dashboard/stats';
            
            const result = await this.apiCall(endpoint);
            return result.stats || {};
        } catch (error) {
            this.handleApiError(error, 'getDashboardStats');
            return {};
        }
    }

    async exportData(format, dataType, filters = {}) {
        try {
            const endpoint = `/api/export/${dataType}/${format}`;
            const result = await this.apiCall(endpoint, 'POST', { filters });
            
            // تحميل الملف
            this.downloadFile(result.fileUrl, `export-${dataType}-${new Date().toISOString().split('T')[0]}.${format}`);
            this.showAlert(`✅ تم تصدير البيانات بصيغة ${format.toUpperCase()}`, 'success');
            
            return result;
        } catch (error) {
            this.handleApiError(error, 'exportData');
        }
    }

    // =============================================
    // 🛠️ دوال المساعدة
    // =============================================
    showAlert(message, type = 'info') {
        const alertContainer = document.getElementById('alertsContainer');
        if (!alertContainer) return;

        const alertId = 'alert-' + Date.now();
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        alertContainer.appendChild(alert);
        
        // إزالة التنبيه تلقائياً بعد 5 ثواني
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 5000);
    }

    showLoading(show = true, message = 'جاري التحميل...') {
        let loadingElement = document.getElementById('loadingOverlay');
        
        if (show) {
            if (!loadingElement) {
                loadingElement = document.createElement('div');
                loadingElement.id = 'loadingOverlay';
                loadingElement.className = 'loading-overlay';
                loadingElement.innerHTML = `
                    <div class="text-center">
                        <div class="loading-spinner mb-3"></div>
                        <p class="text-white">${message}</p>
                    </div>
                `;
                document.body.appendChild(loadingElement);
            }
        } else {
            if (loadingElement) {
                loadingElement.remove();
            }
        }
    }

    formatCurrency(amount, currency = 'ج.م') {
        return new Intl.NumberFormat('ar-EG').format(amount) + ' ' + currency;
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('ar-EG');
    }

    formatTime(timeString) {
        return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('ar-EG', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    getStatusBadgeClass(status) {
        const classes = {
            'confirmed': 'bg-success',
            'pending': 'bg-warning',
            'cancelled': 'bg-danger',
            'completed': 'bg-info',
            'booked_confirmed': 'bg-success',
            'booked_unconfirmed': 'bg-warning',
            'played': 'bg-info',
            'missed': 'bg-danger'
        };
        return classes[status] || 'bg-secondary';
    }

    getStatusText(status) {
        const texts = {
            'confirmed': 'مؤكد',
            'pending': 'قيد الانتظار',
            'cancelled': 'ملغي',
            'completed': 'مكتمل',
            'booked_confirmed': 'مؤكد',
            'booked_unconfirmed': 'بانتظار التأكيد',
            'played': 'تم اللعب',
            'missed': 'لم يحضر'
        };
        return texts[status] || status;
    }

    getPaymentStatusText(status) {
        const texts = {
            'paid': 'مدفوع',
            'pending': 'قيد الانتظار',
            'failed': 'فاشل',
            'refunded': 'تم الاسترجاع'
        };
        return texts[status] || status;
    }

    getRoleText(role) {
        const texts = {
            'admin': 'مسؤول',
            'owner': 'مدير',
            'employee': 'موظف',
            'player': 'لاعب'
        };
        return texts[role] || role;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    downloadFile(url, filename) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // =============================================
    // 📊 دوال تحديث الواجهة
    // =============================================
    updateDashboard() {
        this.updateStatsCards();
        this.updateRecentActivity();
        this.updateCharts();
    }

    updateStatsCards() {
        const stats = this.calculateQuickStats();
        
        // تحديث بطاقات الإحصائيات
        if (document.getElementById('totalBookingsCount')) {
            document.getElementById('totalBookingsCount').textContent = stats.totalBookings;
        }
        if (document.getElementById('totalRevenueAmount')) {
            document.getElementById('totalRevenueAmount').textContent = this.formatCurrency(stats.totalRevenue);
        }
        if (document.getElementById('activePitchesCount')) {
            document.getElementById('activePitchesCount').textContent = stats.activeStadiums;
        }
        if (document.getElementById('pendingBookingsCount')) {
            document.getElementById('pendingBookingsCount').textContent = stats.pendingBookings;
        }
    }

    calculateQuickStats() {
        const today = new Date().toISOString().split('T')[0];
        
        return {
            totalBookings: this.systemData.bookings.length,
            totalRevenue: this.systemData.bookings
                .filter(b => b.status === 'confirmed' || b.status === 'completed')
                .reduce((sum, b) => sum + (b.amount || 0), 0),
            activeStadiums: this.systemData.stadiums.filter(s => s.is_active).length,
            pendingBookings: this.systemData.bookings.filter(b => b.status === 'pending').length,
            todayBookings: this.systemData.bookings.filter(b => b.date === today).length
        };
    }

    updateStadiumsDisplay() {
        const container = document.getElementById('stadiumsContainer');
        if (!container) return;

        if (this.systemData.stadiums.length === 0) {
            container.innerHTML = this.getEmptyState('map', 'لا توجد ملاعب', 'يمكنك إضافة ملاعب جديدة');
            return;
        }

        container.innerHTML = this.systemData.stadiums.map(stadium => `
            <div class="col-lg-6 col-xl-4 mb-4 fade-in">
                <div class="stadium-card card-hover">
                    <div class="stadium-image img-hover-zoom" 
                         style="background-image: url('${stadium.image || '/api/placeholder/400/300'}')">
                        <span class="stadium-badge">${stadium.type === 'natural' ? 'نجيلة طبيعية' : 'نجيلة صناعية'}</span>
                        <span class="stadium-price">${this.formatCurrency(stadium.price)}/ساعة</span>
                    </div>
                    <div class="p-3">
                        <h5 class="mb-2">${this.escapeHtml(stadium.name)}</h5>
                        <p class="text-muted mb-2">
                            <i class="bi bi-geo-alt me-1"></i>${this.escapeHtml(stadium.location)}
                        </p>
                        <p class="text-muted mb-2">
                            <i class="bi bi-calendar me-1"></i>${stadium.availability || 'متاح'}
                        </p>
                        <div class="d-flex justify-content-between align-items-center">
                            <div class="btn-group btn-group-sm">
                                ${this.role !== 'employee' ? `
                                    <button class="btn btn-outline-primary" onclick="system.editStadium(${stadium.id})">
                                        <i class="bi bi-pencil"></i>
                                    </button>
                                ` : ''}
                                <button class="btn btn-outline-info" onclick="system.viewStadiumDetails(${stadium.id})">
                                    <i class="bi bi-eye"></i>
                                </button>
                                ${this.role === 'admin' ? `
                                    <button class="btn btn-outline-danger" onclick="system.confirmDelete('stadium', ${stadium.id}, '${this.escapeHtml(stadium.name)}')">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    updateBookingsDisplay() {
        const table = document.getElementById('bookingsTable');
        if (!table) return;

        if (this.systemData.bookings.length === 0) {
            table.innerHTML = '<tr><td colspan="10" class="text-center text-muted py-4">لا توجد حجوزات</td></tr>';
            return;
        }

        table.innerHTML = this.systemData.bookings.map((booking, index) => `
            <tr class="fade-in">
                <td>${index + 1}</td>
                <td>${this.escapeHtml(booking.customer_name || 'غير معروف')}</td>
                <td>${this.escapeHtml(booking.pitch_name || 'غير معروف')}</td>
                <td>${booking.date}</td>
                <td>${this.formatTime(booking.time)}</td>
                <td>${this.formatCurrency(booking.amount)}</td>
                <td>${this.formatCurrency(booking.deposit_amount || 0)}</td>
                <td>
                    <span class="badge ${this.getStatusBadgeClass(booking.status)}">
                        ${this.getStatusText(booking.status)}
                    </span>
                </td>
                <td>${this.formatDate(booking.created_at)}</td>
                <td class="action-buttons">
                    ${this.getBookingActions(booking)}
                </td>
            </tr>
        `).join('');
    }

    getBookingActions(booking) {
        let actions = '';
        
        if (this.role !== 'employee') {
            if (booking.status === 'pending' && booking.deposit_amount === 0) {
                actions += `
                    <button class="btn btn-success btn-sm" onclick="system.confirmBooking('${booking.id}')">
                        <i class="bi bi-check-lg"></i> تأكيد
                    </button>
                `;
            }
            
            if (['confirmed', 'pending'].includes(booking.status)) {
                actions += `
                    <button class="btn btn-warning btn-sm" onclick="system.cancelBookingPrompt('${booking.id}')">
                        <i class="bi bi-x-circle"></i> إلغاء
                    </button>
                `;
            }
        }

        if (this.role === 'employee' && booking.status === 'booked_confirmed') {
            actions += `
                <button class="btn btn-success btn-sm" onclick="system.checkInPlayer('${booking.id}')">
                    <i class="bi bi-check2-circle"></i> تسجيل حضور
                </button>
            `;
        }

        actions += `
            <button class="btn btn-info btn-sm" onclick="system.showBookingDetails('${booking.id}')">
                <i class="bi bi-eye"></i> تفاصيل
            </button>
        `;

        return actions;
    }

    // =============================================
    // 🎯 دوال الإجراءات التفاعلية
    // =============================================
    async confirmDelete(type, id, name) {
        this.currentAction = { type, id, name };
        
        const message = this.getDeleteMessage(type, name);
        if (confirm(message)) {
            await this.executeDelete();
        }
    }

    getDeleteMessage(type, name) {
        const messages = {
            'stadium': `هل أنت متأكد من حذف الملعب "${name}"؟ سيتم حذف جميع البيانات المرتبطة به.`,
            'user': `هل أنت متأكد من حذف المستخدم "${name}"؟`,
            'booking': `هل أنت متأكد من حذف الحجز؟`,
            'payment': `هل أنت متأكد من حذف سجل الدفع؟`
        };
        return messages[type] || 'هل أنت متأكد من الحذف؟';
    }

    async executeDelete() {
        const { type, id } = this.currentAction;
        
        try {
            switch (type) {
                case 'stadium':
                    await this.deleteStadium(id);
                    break;
                case 'user':
                    await this.deleteUser(id);
                    break;
                // يمكن إضافة حالات أخرى
            }
        } catch (error) {
            this.handleApiError(error, 'executeDelete');
        }
    }

    cancelBookingPrompt(bookingId) {
        const reason = prompt('يرجى إدخال سبب الإلغاء (اختياري):');
        if (reason !== null) {
            this.cancelBooking(bookingId, reason);
        }
    }

    async checkInPlayer(bookingId) {
        try {
            const result = await this.apiCall(`/api/employee/bookings/${bookingId}/checkin`, 'POST');
            this.showAlert('✅ تم تسجيل حضور اللاعب بنجاح', 'success');
            await this.loadBookings();
        } catch (error) {
            this.handleApiError(error, 'checkInPlayer');
        }
    }

    // =============================================
    // 📈 دوال الرسوم البيانية
    // =============================================
    initializeCharts() {
        this.createBookingsChart();
        this.createRevenueChart();
        this.createStadiumsChart();
    }

    createBookingsChart() {
        const ctx = document.getElementById('bookingsChart')?.getContext('2d');
        if (!ctx) return;

        const last30Days = this.getLast30Days();
        const bookingsData = this.getBookingsByDate(last30Days);

        this.charts.bookings = new Chart(ctx, {
            type: 'line',
            data: {
                labels: last30Days.map(date => this.formatDate(date)),
                datasets: [{
                    label: 'عدد الحجوزات',
                    data: bookingsData,
                    borderColor: '#1a7f46',
                    backgroundColor: 'rgba(26, 127, 70, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'top' } },
                scales: { y: { beginAtZero: true } }
            }
        });
    }

    createRevenueChart() {
        const ctx = document.getElementById('revenueChart')?.getContext('2d');
        if (!ctx) return;

        const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'];
        const revenueData = [120, 150, 180, 200, 170, 220];

        this.charts.revenue = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [{
                    label: 'الإيرادات (ألف جنيه)',
                    data: revenueData,
                    backgroundColor: 'rgba(26, 127, 70, 0.8)',
                    borderColor: '#1a7f46',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'top' } }
            }
        });
    }

    createStadiumsChart() {
        const ctx = document.getElementById('stadiumsChart')?.getContext('2d');
        if (!ctx) return;

        const stadiumTypes = this.systemData.stadiums.reduce((acc, stadium) => {
            acc[stadium.type] = (acc[stadium.type] || 0) + 1;
            return acc;
        }, {});

        this.charts.stadiums = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(stadiumTypes).map(type => 
                    type === 'natural' ? 'طبيعية' : 'صناعية'
                ),
                datasets: [{
                    data: Object.values(stadiumTypes),
                    backgroundColor: ['#1a7f46', '#2ecc71', '#3498db', '#f39c12']
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'bottom' } }
            }
        });
    }

    getLast30Days() {
        const days = [];
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            days.push(date.toISOString().split('T')[0]);
        }
        return days;
    }

    getBookingsByDate(dates) {
        return dates.map(date => 
            this.systemData.bookings.filter(booking => booking.date === date).length
        );
    }

    // =============================================
    // 🔄 دوال التحديث التلقائي
    // =============================================
    startAutoRefresh() {
        // تحديث البيانات كل 5 دقائق
        setInterval(() => {
            if (document.visibilityState === 'visible') {
                this.loadInitialData();
            }
        }, 300000);

        // تحديث عند العودة للتبويب
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.loadInitialData();
            }
        });
    }

    // =============================================
    // 🎛️ إعداد معالجات الأحداث
    // =============================================
    setupEventListeners() {
        // فلترة البيانات
        this.setupFilters();
        
        // النماذج
        this.setupForms();
        
        // الأزرار العامة
        this.setupGeneralButtons();
        
        // الأحداث العامة
        this.setupGlobalEvents();
    }

    setupFilters() {
        // فلترة الملاعب
        const searchStadiums = document.getElementById('searchStadiums');
        if (searchStadiums) {
            searchStadiums.addEventListener('input', (e) => this.filterStadiums(e.target.value));
        }

        // فلترة الحجوزات
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => this.filterBookings({ status: e.target.value }));
        }

        // فلترة المدفوعات
        const paymentStatusFilter = document.getElementById('paymentStatusFilter');
        if (paymentStatusFilter) {
            paymentStatusFilter.addEventListener('change', (e) => this.filterPayments({ status: e.target.value }));
        }
    }

    setupForms() {
        // نموذج إضافة ملعب
        const addStadiumForm = document.getElementById('addStadiumForm');
        if (addStadiumForm) {
            addStadiumForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddStadium(new FormData(e.target));
            });
        }

        // نموذج الإشعارات
        const notificationForm = document.getElementById('notificationForm');
        if (notificationForm) {
            notificationForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSendNotification(new FormData(e.target));
            });
        }
    }

    setupGeneralButtons() {
        // زر التحديث
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadInitialData());
        }

        // زر التصدير
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.handleExport());
        }

        // زر تسجيل الخروج
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
    }

    setupGlobalEvents() {
        // تحديث التاريخ التلقائي
        const dateInputs = document.querySelectorAll('input[type="date"]');
        dateInputs.forEach(input => {
            if (!input.value) {
                input.value = new Date().toISOString().split('T')[0];
            }
        });

        // منع إرسال النماذج بالخطأ
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
            }
        });
    }

    // =============================================
    // 🛠️ دوال معالجة الأخطاء
    // =============================================
    handleApiError(error, context) {
        console.error(`❌ Error in ${context}:`, error);
        
        let userMessage = 'حدث خطأ غير متوقع';
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            userMessage = 'تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت.';
        } else if (error.message) {
            userMessage = error.message;
        }
        
        this.showAlert(`❌ ${userMessage}`, 'danger');
        this.logError({ context, error: error.message, timestamp: new Date().toISOString() });
    }

    logError(errorData) {
        const errorLogs = JSON.parse(localStorage.getItem('errorLogs') || '[]');
        errorLogs.push(errorData);
        if (errorLogs.length > 100) errorLogs.shift();
        localStorage.setItem('errorLogs', JSON.stringify(errorLogs));
    }

    // =============================================
    // 🎪 دوال إضافية للواجهة
    // =============================================
    getEmptyState(icon, title, message) {
        return `
            <div class="col-12">
                <div class="empty-state">
                    <i class="bi bi-${icon}"></i>
                    <h5>${title}</h5>
                    <p>${message}</p>
                </div>
            </div>
        `;
    }

    populateStadiumFilters() {
        const pitchFilter = document.getElementById('pitchFilter');
        if (pitchFilter) {
            pitchFilter.innerHTML = '<option value="">جميع الملاعب</option>' +
                this.systemData.stadiums.map(stadium => 
                    `<option value="${stadium.id}">${this.escapeHtml(stadium.name)}</option>`
                ).join('');
        }
    }

    updateRecentBookings() {
        const container = document.getElementById('recentBookingsTable');
        if (!container) return;

        const recentBookings = this.systemData.bookings.slice(0, 5);
        
        if (recentBookings.length === 0) {
            container.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">لا توجد حجوزات حديثة</td></tr>';
            return;
        }

        container.innerHTML = recentBookings.map(booking => `
            <tr class="fade-in">
                <td>${this.escapeHtml(booking.customer_name || 'غير معروف')}</td>
                <td>${this.escapeHtml(booking.pitch_name || 'غير معروف')}</td>
                <td>${booking.date}</td>
                <td>${this.formatTime(booking.time)}</td>
                <td>${this.formatCurrency(booking.amount)}</td>
                <td>
                    <span class="badge ${this.getStatusBadgeClass(booking.status)}">
                        ${this.getStatusText(booking.status)}
                    </span>
                </td>
                <td>
                    <button class="btn btn-info btn-sm" onclick="system.showBookingDetails('${booking.id}')">
                        <i class="bi bi-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // =============================================
    // 🔄 دوال تحت التطوير (Placeholders)
    // =============================================
    updatePaymentsDisplay() {
        // سيتم تنفيذها في المستقبل
    }

    updateUsersDisplay() {
        // سيتم تنفيذها في المستقبل
    }

    updateTimeSlotsDisplay() {
        // سيتم تنفيذها في المستقبل
    }

    updateNotificationsDisplay() {
        // سيتم تنفيذها في المستقبل
    }

    updateActivityLogsDisplay() {
        // سيتم تنفيذها في المستقبل
    }

    updatePendingManagersDisplay() {
        // سيتم تنفيذها في المستقبل
    }

    updateRecentActivity() {
        // سيتم تنفيذها في المستقبل
    }

    updateCharts() {
        // سيتم تنفيذها في المستقبل
    }

    filterStadiums(searchTerm) {
        // سيتم تنفيذها في المستقبل
    }

    filterPayments(filters) {
        // سيتم تنفيذها في المستقبل
    }

    handleAddStadium(formData) {
        // سيتم تنفيذها في المستقبل
    }

    handleSendNotification(formData) {
        // سيتم تنفيذها في المستقبل
    }

    handleExport() {
        // سيتم تنفيذها في المستقبل
    }

    editStadium(stadiumId) {
        // سيتم تنفيذها في المستقبل
    }

    viewStadiumDetails(stadiumId) {
        // سيتم تنفيذها في المستقبل
    }

    showBookingDetails(bookingId) {
        // سيتم تنفيذها في المستقبل
    }

    async loadUserData() {
        // سيتم تنفيذها في المستقبل
    }

    logout() {
        if (confirm('هل تريد تسجيل الخروج؟')) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            window.location.href = '/login.html';
        }
    }
}

// =============================================
// 🌟 التهيئة العامة
// =============================================
let system;

document.addEventListener('DOMContentLoaded', function() {
    // تحديد نوع المستخدم من الصفحة الحالية
    const currentPage = window.location.pathname;
    let userRole = 'player';
    
    if (currentPage.includes('admin')) userRole = 'admin';
    else if (currentPage.includes('owner')) userRole = 'owner';
    else if (currentPage.includes('employee')) userRole = 'employee';
    
    // تهيئة النظام
    system = new StadiumManagementSystem(userRole);
    
    // جعل النظام متاحاً globally للاستدعاء من الأحداث
    window.system = system;
    
    console.log('🚀 تم تحميل نظام إدارة الملاعب بنجاح');
});

// =============================================
// 🔧 دوال مساعدة عامة
// =============================================
function formatTimeDisplay(time) {
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    const suffix = hour >= 12 ? 'م' : 'ص';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${displayHour}:${m} ${suffix}`;
}

function escapeHtml(str) {
    if (str === undefined || str === null) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function showGlobalAlert(message, type = 'info') {
    if (window.system) {
        window.system.showAlert(message, type);
    } else {
        // fallback بسيط
        alert(message);
    }
}

// دوال التصدير للاستخدام الخارجي
window.StadiumManagementSystem = StadiumManagementSystem;
window.formatTimeDisplay = formatTimeDisplay;
window.escapeHtml = escapeHtml;
window.showGlobalAlert = showGlobalAlert;
