// admin/script.js

// Dynamic imports to prevent script crash if modules fail
let fb = null;
try {
    import('../shared/firebase-db.js').then(m => fb = m).catch(e => console.warn("Firebase listener disabled in this environment."));
} catch (e) {
    console.warn("Dynamic import not supported.");
}

// Bind to window for HTML onclick access
window.addNewProduct = addNewProduct;
window.deleteProduct = deleteProduct;
window.saveNewPrice = saveNewPrice;
window.openEditPrice = openEditPrice;
window.closeEditModal = closeEditModal;
window.searchProducts = searchProducts;
window.changeOrderStatus = changeOrderStatus;
window.logoutAdmin = logoutAdmin;
window.saveOrderStatus = saveOrderStatus;
window.openOrderStatus = openOrderStatus;
window.openOrderDetails = openOrderDetails;
window.printReceipt = printReceipt;
window.toggleUserStatus = toggleUserStatus;
window.createNewStaffAccount = createNewStaffAccount;
window.openCustomerPromo = openCustomerPromo;
window.saveCustomerPromo = saveCustomerPromo;
window.addNewPromo = addNewPromo;
window.deletePromo = deletePromo;

window.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    updateHeaderIdentity();

    if (window.location.pathname.includes('orders.html')) {
        fsListenToOrders((orders) => {
            renderAdminOrders(orders);
            if (window.lastOrderCount !== undefined && orders.length > window.lastOrderCount) {
                showNewOrderNotification();
            }
            window.lastOrderCount = orders.length;
        });
    }
    if (window.location.pathname.includes('prescriptions.html')) {
        fsListenToPrescriptions((prescriptions) => {
            renderAdminPrescriptions(prescriptions);
        });
    }
    if (window.location.pathname.includes('products.html')) {
        renderAdminProducts();
    }
    if (window.location.pathname.includes('promos.html')) {
        renderAdminPromos();
    }
    if (window.location.pathname.includes('users.html')) {
        renderStaffUsers();
    }
    if (window.location.pathname.includes('chats.html')) {
        // Handled in chats.html
    }
});

function showNewOrderNotification() {
    // Create a toast notification if possible, or simple alert
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--primary-color);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 12px;
        animation: slideIn 0.5s ease;
    `;
    toast.innerHTML = `
        <i class="fa-solid fa-bell-concierge" style="font-size: 1.5rem;"></i>
        <div>
            <div style="font-weight: 800;">طلب جديد في الانتظار!</div>
            <div style="font-size: 0.85rem; opacity: 0.9;">لقد تم استلام طلب جديد من العميل الآن.</div>
        </div>
    `;
    document.body.appendChild(toast);
    
    // Sound effect (optional mock)
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(e => console.log('Audio play failed', e));

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.5s ease forwards';
        setTimeout(() => toast.remove(), 500);
    }, 5000);
}

function checkAuth() {
    const session = JSON.parse(localStorage.getItem('admin_session'));
    const isLoginPage = window.location.pathname.includes('login.html');

    if (!session && !isLoginPage) {
        window.location.href = 'login.html';
        return;
    }

    if (session) {
        // Show superadmin features
        if (session.role === 'super_admin') {
            const addBtn = document.getElementById('addUserBtn');
            if (addBtn) addBtn.style.display = 'block';
        }

        // Double check status
        const users = getDB(DB_KEYS.USERS);
        const currentUser = users.find(u => u.id === session.id);
        if (currentUser && currentUser.status === 'suspended') {
            logoutAdmin();
        }
    }
}

function updateHeaderIdentity() {
    const session = JSON.parse(localStorage.getItem('admin_session'));
    if (!session) return;

    const nameEl = document.getElementById('adminNameDisplay');
    if (nameEl) {
        nameEl.innerText = session.name || session.username;
    }
}

function renderAdminOrders(ordersList) {
    const orders = ordersList || getDB(DB_KEYS.ORDERS);
    const tbody = document.querySelector('table tbody');
    if (!tbody) return;

    tbody.innerHTML = orders.map(order => `
        <tr>
            <td>${order.id}</td>
            <td>${order.customerName}</td>
            <td>${order.phone || '---'}</td>
            <td>${order.address || '---'}</td>
            <td>${new Date(order.date).toLocaleDateString('ar-EG')}</td>
            <td>${order.total} ج.م</td>
            <td><span class="status-badge ${getStatusClass(order.status)}">${order.status}</span></td>
            <td>
                <button class="action-icon" title="عرض التفاصيل" onclick="openOrderDetails('${order.id}')"><i class="fa-solid fa-eye"></i></button>
                <button class="action-icon" style="color: var(--secondary-color);" title="تحديث الحالة" onclick="openOrderStatus('${order.id}')"><i class="fa-solid fa-truck-fast"></i></button>
            </td>
        </tr>
    `).join('');
}

function getStatusClass(status) {
    if (status === 'مكتمل') return 'status-completed';
    if (status === 'ملغي') return 'status-cancelled';
    return 'status-pending';
}

// Products Management
function renderAdminProducts(filter = "") {
    const products = getDB(DB_KEYS.PRODUCTS);
    const tbody = document.getElementById('adminProductsTable');
    if (!tbody) return;

    const filtered = products.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()));

    tbody.innerHTML = filtered.map(p => `
        <tr>
            <td><div style="width: 40px; height: 40px; background: #eee; border-radius: 50%; display:flex; align-items:center; justify-content:center; color:#999; overflow:hidden;">
                ${p.image && p.image.startsWith('http') ? `<img src="${p.image}" style="width:100%; height:100%; object-fit:cover;">` : `<i class="fa-solid ${p.image || 'fa-capsules'}"></i>`}
            </div></td>
            <td>${p.name}</td>
            <td>${p.category}</td>
            <td>${p.price} ج.م</td>
            <td><span class="status-badge status-completed">متاح</span></td>
            <td>
                <button class="action-icon" title="تعديل السعر" onclick="openEditPrice('${p.id}', ${p.price})"><i class="fa-solid fa-edit"></i></button>
                <button class="action-icon delete" title="حذف" onclick="deleteProduct('${p.id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

async function addNewProduct() {
    const name = document.getElementById('newProdName').value;
    const cat = document.getElementById('newProdCat').value;
    const price = document.getElementById('newProdPrice').value;
    const img = document.getElementById('newProdImg').value;

    if (!name || !price) {
        alert('يرجى إدخال اسم المنتج وسعره على الأقل');
        return;
    }

    const newProd = {
        id: 'L' + Date.now(),
        name,
        category: cat,
        price: parseInt(price),
        image: img || 'https://via.placeholder.com/150',
        status: 'متاح',
        createdAt: new Date().toISOString()
    };

    // Use a try catch for the local part too just in case
    try {
        const products = getDB(DB_KEYS.PRODUCTS);
        products.unshift(newProd);
        setDB(DB_KEYS.PRODUCTS, products);
        renderAdminProducts();

        document.getElementById('newProdName').value = '';
        document.getElementById('newProdPrice').value = '';
        document.getElementById('newProdImg').value = '';

        showAdminToast('تم الحفظ محلياً بنجاح! جاري المزامنة مع السحابة...');

        if (fb) {
            const id = await fb.fsSaveProduct(newProd);
            // Confirm mapping
            const updated = getDB(DB_KEYS.PRODUCTS);
            const idx = updated.findIndex(p => p.id === newProd.id);
            if (idx !== -1) {
                updated[idx].id = id;
                setDB(DB_KEYS.PRODUCTS, updated);
            }
            showAdminToast('تمت المزامنة السحابية بنجاح.');
        }
    } catch (e) {
        console.error("Local/Sync Error:", e);
        showAdminToast('خطأ غير متوقع. يرجى المحاولة لاحقاً.', 'error');
    }
}

async function deleteProduct(id) {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج نهائياً؟')) return;
    
    try {
        const { fsDeleteProduct } = await import('../shared/firebase-db.js');
        await fsDeleteProduct(id);

        const products = getDB(DB_KEYS.PRODUCTS);
        const filtered = products.filter(p => p.id !== id);
        setDB(DB_KEYS.PRODUCTS, filtered);
        renderAdminProducts();
        showAdminToast('تم حذف المنتج بنجاح.');
    } catch (e) {
        console.error(e);
        showAdminToast('خطأ في الحذف من السحابة.', 'error');
    }
}

function openEditPrice(id, currentPrice) {
    document.getElementById('editProdId').value = id;
    document.getElementById('editProdPriceInput').value = currentPrice;
    document.getElementById('editPriceModal').style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('editPriceModal').style.display = 'none';
}

async function saveNewPrice() {
    const id = document.getElementById('editProdId').value;
    const newPrice = document.getElementById('editProdPriceInput').value;
    
    if (!newPrice || newPrice <= 0) return;

    try {
        const { fsSaveProduct } = await import('../shared/firebase-db.js');
        const products = getDB(DB_KEYS.PRODUCTS);
        const product = products.find(p => p.id === id);
        if (product) {
            product.price = parseInt(newPrice);
            await fsSaveProduct(product);
            setDB(DB_KEYS.PRODUCTS, products);
            renderAdminProducts();
            closeEditModal();
            showAdminToast('تم تحديث السعر بنجاح.');
        }
    } catch (e) {
        console.error(e);
        showAdminToast('خطأ في مزامنة السعر الجديد.', 'error');
    }
}

function searchProducts(val) {
    renderAdminProducts(val);
}

// Promos Management
function renderAdminPromos() {
    const promos = getDB(DB_KEYS.PROMOS);
    const tbody = document.getElementById('adminPromosTable');
    if (!tbody) return;

    tbody.innerHTML = promos.map(p => `
        <tr>
            <td><strong>${p.code}</strong></td>
            <td>${p.type === 'percentage' ? 'نسبة مئوية' : 'مبلغ ثابت'} (${p.value}${p.type === 'percentage' ? '%' : ' ج.م'})</td>
            <td>غير محدود</td>
            <td><span class="status-badge ${p.active ? 'status-completed' : 'status-cancelled'}">${p.active ? 'نشط' : 'معطل'}</span></td>
            <td>
                <button class="action-icon delete" title="حذف" onclick="deletePromo('${p.code}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

function addNewPromo() {
    const code = document.getElementById('newPromoCode').value.toUpperCase();
    const type = document.getElementById('newPromoType').value;
    const val = document.getElementById('newPromoValue').value;

    if (!code || !val) return;

    const promos = getDB(DB_KEYS.PROMOS);
    if (promos.find(p => p.code === code)) {
        alert('هذا الكود موجود بالفعل');
        return;
    }

    promos.push({ code, type, value: parseInt(val), active: true });
    setDB(DB_KEYS.PROMOS, promos);
    renderAdminPromos();
    showAdminToast('تم إنشاء الكود وتفعيله بنجاح.');
}

function deletePromo(code) {
    const promos = getDB(DB_KEYS.PROMOS);
    const filtered = promos.filter(p => p.code !== code);
    setDB(DB_KEYS.PROMOS, filtered);
    renderAdminPromos();
}

function logoutAdmin() {
    localStorage.removeItem("admin_session");
    window.location.href = "login.html";
}

// Staff Account Management
function renderStaffUsers() {
    const users = getDB(DB_KEYS.USERS);
    const tbody = document.getElementById('staffTableBody');
    if (!tbody) return;

    const session = JSON.parse(localStorage.getItem('admin_session'));

    tbody.innerHTML = users.map(u => `
        <tr>
            <td><strong>${u.name}</strong></td>
            <td>${u.username}</td>
            <td>${u.role === 'super_admin' ? 'مدير نظام' : 'موظف'}</td>
            <td><span class="status-badge ${u.status === 'active' ? 'status-completed' : 'status-cancelled'}">${u.status === 'active' ? 'نشط' : 'موقوف'}</span></td>
            <td>
                ${(session.role === 'super_admin' && u.id !== session.id) ? `
                    <button class="action-icon" title="${u.status === 'active' ? 'إيقاف الحساب' : 'تفعيل الحساب'}" onclick="toggleUserStatus('${u.id}')">
                        <i class="fa-solid ${u.status === 'active' ? 'fa-user-slash' : 'fa-user-check'}"></i>
                    </button>
                ` : ''}
            </td>
        </tr>
    `).join('');
}

function createNewStaffAccount() {
    const name = document.getElementById('newStaffName').value;
    const user = document.getElementById('newStaffUser').value;
    const pass = document.getElementById('newStaffPass').value;
    const role = document.getElementById('newStaffRole').value;

    if (!name || !user || !pass) {
        alert('برجاء إدخال كافة البيانات');
        return;
    }

    const users = getDB(DB_KEYS.USERS);
    if (users.find(u => u.username === user)) {
        alert('اسم المستخدم موجود بالفعل!');
        return;
    }

    const newUser = {
        id: generateId('USR-'),
        name: name,
        username: user,
        password: pass,
        role: role,
        status: 'active'
    };

    users.push(newUser);
    setDB(DB_KEYS.USERS, users);
    renderStaffUsers();
    document.getElementById('newUserModal').style.display = 'none';
    showAdminToast('تم إنشاء حساب الموظف بنجاح.');
}

function toggleUserStatus(id) {
    const users = getDB(DB_KEYS.USERS);
    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex !== -1) {
        const newStatus = users[userIndex].status === 'active' ? 'suspended' : 'active';
        users[userIndex].status = newStatus;
        setDB(DB_KEYS.USERS, users);
        renderStaffUsers();
        showAdminToast(`تم ${newStatus === 'suspended' ? 'إيقاف' : 'تفعيل'} الحساب بنجاح.`);
    }
}

// Customer Offers logic
function openCustomerPromo(name) {
    document.getElementById('promoUserName').innerText = 'إرسال عرض مخصص للعميل: ' + name;
    document.getElementById('customPromoCode').value = 'GIFT' + Math.floor(Math.random() * 100);
    document.getElementById('promoModal').style.display = 'flex';
}

function saveCustomerPromo() {
    const name = document.getElementById('promoUserName').innerText.replace('إرسال عرض مخصص للعميل: ', '');
    const code = document.getElementById('customPromoCode').value;
    const val = document.getElementById('customPromoValue').value;
    document.getElementById('promoModal').style.display = 'none';
    showAdminToast(`تم إرسال الكوبون (${code}) بخصم ${val}% للعميل ${name} بنجاح! سيصله إشعار بذلك.`);
}

// Order Management logic
function openOrderStatus(orderId) {
    document.getElementById('statusOrderId').innerText = 'تحديث حالة الطلب رقم: ' + orderId;
    document.getElementById('orderStatusModal').style.display = 'flex';
}

function saveOrderStatus() {
    const orderId = document.getElementById('statusOrderId').innerText.replace('تحديث حالة الطلب رقم: ', '');
    const radios = document.getElementsByName('orderStatusValue');
    let statusText = '';
    
    for (const radio of radios) {
        if (radio.checked) {
            statusText = radio.value;
            break;
        }
    }
    
    // Update in shared DB (Legacy localStorage support)
    const orders = getDB(DB_KEYS.ORDERS);
    const orderIndex = orders.findIndex(o => o.id === orderId);
    if (orderIndex !== -1) {
        orders[orderIndex].status = statusText;
        setDB(DB_KEYS.ORDERS, orders);
    }

    // Sync to Firestore
    import('../shared/firebase-db.js').then(m => {
        m.fsUpdateOrderStatus(orderId, statusText);
    });

    document.getElementById('orderStatusModal').style.display = 'none';
    showAdminToast(`تم تحديث حالة الطلب ${orderId} إلى: [${statusText}] بنجاح.`);
}

function renderAdminPrescriptions(list) {
    const tbody = document.querySelector('table tbody');
    if (!tbody || !window.location.pathname.includes('prescriptions.html')) return;

    tbody.innerHTML = list.map(rx => `
        <tr>
            <td>#${rx.id.substring(0,8)}</td>
            <td>${rx.customerName || 'عميل'} <br><small style="color:var(--text-muted)">${rx.customerPhone || ''}</small></td>
            <td>
                <img src="${rx.image}" style="width:50px; height:50px; border-radius:8px; cursor:pointer;" onclick="window.open('${rx.image}', '_blank')">
            </td>
            <td>${new Date(rx.createdAt).toLocaleString('ar-EG')}</td>
            <td>${rx.note || 'لا يوجد'}</td>
            <td><span class="status-badge status-pending">في انتظار المراجعة</span></td>
            <td>
                <button class="action-icon" style="color: var(--primary-color);" title="إنشاء طلب له"><i class="fa-solid fa-file-invoice-dollar"></i></button>
            </td>
        </tr>
    `).join('');
}

function openOrderDetails(orderId) {
    const orders = getDB(DB_KEYS.ORDERS);
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    document.getElementById('detailsOrderId').innerText = 'رقم الطلب: ' + orderId;
    document.getElementById('receiptName').innerText = order.customerName;
    document.getElementById('receiptPhone').innerText = order.phone || '---';
    document.getElementById('receiptAddress').innerText = order.address || '---';
    
    let itemsHTML = order.items.map(item => `
        <div style="display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px dashed var(--border-color);">
            <div>${item.name} <span style="color: var(--text-muted); font-size: 0.85rem; font-weight:800;">(الكمية: ${item.qty || 1})</span></div>
            <div style="font-weight: 800; color: var(--primary-color);">${item.price} ج.م</div>
        </div>
    `).join('');

    itemsHTML += `
        <div style="display: flex; justify-content: space-between; padding: 10px; border-bottom: none;">
            <div>خدمة التوصيل والشحن</div>
            <div style="font-weight: 800; color: var(--text-muted);">${order.shipping || 20} ج.م</div>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 10px; margin-top: 10px; border-top: 2px solid var(--border-color);">
            <div style="font-weight: 900; font-size: 1.1rem;">الإجمالي</div>
            <div style="font-weight: 900; font-size: 1.1rem; color: var(--primary-color);">${order.total} ج.م</div>
        </div>
    `;
    
    document.getElementById('orderDetailsList').innerHTML = itemsHTML;
    document.getElementById('orderDetailsModal').style.display = 'flex';
}

function printReceipt() {
    window.print();
}

// Global functions
function showAdminToast(msg, type = 'success') {
    // Check if a toast already exists, remove it
    const existing = document.querySelector('.admin-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `admin-toast ${type}`;
    toast.innerHTML = `
        <i class="fa-solid ${type === 'success' ? 'fa-check-circle' : 'fa-triangle-exclamation'}"></i>
        <span>${msg}</span>
    `;
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => toast.style.opacity = '1', 10);
    setTimeout(() => toast.style.transform = 'translateX(-50%) translateY(0)', 10);

    // Auto remove
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(100px)';
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}
