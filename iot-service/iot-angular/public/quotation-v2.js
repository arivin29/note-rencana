/* ══════════════════════════════════════════════════════════════════════════
   DEVETEK Quotation Generator v2 - JavaScript
   ══════════════════════════════════════════════════════════════════════════ */

// ── Global State ────────────────────────────────────────────────────────────
let pricingData = null;
let packages = []; // Array of saved packages
let editingPackageIndex = -1; // -1 means adding new, >= 0 means editing
let services = {
    cloud: { plan: '', planName: '', devices: 0, months: 12, discount: 0, total: 0 },
    items: [] // Other services with qty
};

// Current package being built (in modal)
let currentPackage = {
    type: null,
    typeName: '',
    nodeItem: null,
    name: '',
    description: '',
    items: {
        sensors: [],
        power: [],
        enclosure: [],
        kabel: [],
        connectivity: [],
        protection: [],
        tiang: []
    },
    qty: 1
};

// ── Initialize ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    await loadPricingData();
    generateQuoteNumber();
    renderAll();
    lucide.createIcons();
    
    // Event listeners
    document.getElementById('cloud-devices').addEventListener('input', updateCloudTotal);
    document.getElementById('cloud-duration').addEventListener('change', updateCloudTotal);
    document.getElementById('discount-percent').addEventListener('input', updateSummary);
    document.getElementById('package-qty').addEventListener('input', updatePackageTotal);
});

// ── Load Pricing Data ───────────────────────────────────────────────────────
async function loadPricingData() {
    try {
        const response = await fetch('pricing-config.json');
        pricingData = await response.json();
        console.log('Pricing data loaded:', pricingData);
        
        // Populate cloud plans
        populateCloudPlans();
        
        // Populate services
        renderServices();
        
        // Update type prices in modal
        updateTypePrices();
        
    } catch (error) {
        console.error('Failed to load pricing data:', error);
        showToast('Gagal memuat data harga', 'error');
    }
}

// ── Generate Quote Number ───────────────────────────────────────────────────
function generateQuoteNumber() {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const quoteNumber = `QUO-${year}${month}${day}-${random}`;
    document.getElementById('quote-number').textContent = quoteNumber;
}

// ── Update Type Prices ──────────────────────────────────────────────────────
function updateTypePrices() {
    if (!pricingData || !pricingData.hardware || !pricingData.hardware.nodes) return;
    
    pricingData.hardware.nodes.forEach(node => {
        // Map node id to element id
        const typeId = node.id.replace('node-', ''); // "node-type-a" -> "type-a"
        const priceEl = document.getElementById(`price-${typeId}`);
        if (priceEl) {
            priceEl.textContent = formatCurrency(node.sellingPrice);
        }
    });
}

// ── Populate Cloud Plans ────────────────────────────────────────────────────
function populateCloudPlans() {
    const grid = document.getElementById('cloud-plans-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    if (!pricingData.subscriptions) return;
    
    pricingData.subscriptions.forEach(sub => {
        const card = document.createElement('div');
        card.className = 'cloud-plan-card';
        card.dataset.planId = sub.id;
        card.onclick = () => selectCloudPlan(sub.id);
        
        card.innerHTML = `
            ${sub.popular ? '<div class="popular-badge">Popular</div>' : ''}
            <div class="plan-name">${sub.name}</div>
            <div class="plan-price">
                <span class="amount">${formatCurrency(sub.pricePerDevice)}</span>
                <span class="unit">/device/bulan</span>
            </div>
            <div class="plan-cost">
                <span class="cost-label">Cost:</span> ${formatCurrency(sub.costPerDevice)}/dev
            </div>
        `;
        
        grid.appendChild(card);
    });
}

// ── Select Cloud Plan ───────────────────────────────────────────────────────
function selectCloudPlan(planId) {
    // Update selection UI
    document.querySelectorAll('.cloud-plan-card').forEach(card => {
        card.classList.toggle('selected', card.dataset.planId === planId);
    });
    
    // Store selected plan
    services.cloud.plan = planId;
    
    // Recalculate total
    updateCloudTotal();
}

// ── Update Cloud Total ──────────────────────────────────────────────────────
function updateCloudTotal() {
    const planId = services.cloud?.plan || '';
    const devices = parseInt(document.getElementById('cloud-devices').value) || 0;
    const durationSelect = document.getElementById('cloud-duration');
    const months = parseInt(durationSelect?.value) || 12;
    
    let total = 0;
    let planName = '';
    let discount = 0;
    
    if (planId && devices > 0) {
        const plan = pricingData.subscriptions?.find(s => s.id === planId);
        if (plan) {
            planName = plan.name;
            
            // Get discount based on duration
            if (months >= 24) discount = 15;
            else if (months >= 12) discount = 10;
            else if (months >= 6) discount = 5;
            
            const discountMultiplier = 1 - (discount / 100);
            const pricePerDevice = plan.pricePerDevice * discountMultiplier;
            total = pricePerDevice * devices * months;
        }
    }
    
    // Update services object
    services.cloud = { 
        plan: planId, 
        planName: planName,
        devices, 
        months, 
        discount,
        total 
    };
    
    // Update UI
    const totalSection = document.getElementById('cloud-total-section');
    const totalDisplay = document.getElementById('cloud-total');
    const detailDisplay = document.getElementById('cloud-summary-detail');
    
    if (total > 0) {
        totalSection.style.display = 'flex';
        totalDisplay.textContent = formatCurrency(total);
        detailDisplay.textContent = `${planName} × ${devices} device × ${months} bulan${discount > 0 ? ` (diskon ${discount}%)` : ''}`;
    } else {
        totalSection.style.display = 'none';
    }
    
    updateSummary();
}

// ── Render Services ─────────────────────────────────────────────────────────
function renderServices() {
    const tbody = document.getElementById('services-list');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!pricingData.services || pricingData.services.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#666;">Tidak ada layanan</td></tr>';
        return;
    }
    
    pricingData.services.forEach(service => {
        const existingItem = services.items.find(i => i.id === service.id);
        const qty = existingItem ? existingItem.qty : 0;
        const customPrice = existingItem ? existingItem.customPrice : service.sellingPrice;
        const total = customPrice * qty;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="service-name">${service.name}</div>
                <div class="service-sku">${service.sku}</div>
            </td>
            <td class="service-price">${formatCurrency(service.sellingPrice)}</td>
            <td>
                <input type="number" 
                       value="${customPrice}" 
                       onchange="updateServicePrice('${service.id}', this.value)">
            </td>
            <td>
                <div class="qty-controls">
                    <button class="qty-btn" onclick="updateServiceQty('${service.id}', -1)">-</button>
                    <span class="qty-value">${qty}</span>
                    <button class="qty-btn" onclick="updateServiceQty('${service.id}', 1)">+</button>
                </div>
            </td>
            <td class="total-cell">${formatCurrency(total)}</td>
        `;
        tbody.appendChild(tr);
    });
}

function updateServiceQty(serviceId, delta) {
    const service = pricingData.services.find(s => s.id === serviceId);
    if (!service) return;
    
    let item = services.items.find(i => i.id === serviceId);
    
    if (!item) {
        item = {
            id: serviceId,
            sku: service.sku,
            name: service.name,
            customPrice: service.sellingPrice,
            qty: 0
        };
        services.items.push(item);
    }
    
    item.qty = Math.max(0, item.qty + delta);
    
    // Remove if qty is 0
    if (item.qty === 0) {
        services.items = services.items.filter(i => i.id !== serviceId);
    }
    
    renderServices();
    updateSummary();
}

function updateServicePrice(serviceId, price) {
    let item = services.items.find(i => i.id === serviceId);
    if (item) {
        item.customPrice = parseFloat(price) || 0;
        renderServices();
        updateSummary();
    }
}

// ══════════════════════════════════════════════════════════════════════════
// PACKAGE MODAL FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════

function openAddPackageModal() {
    // Reset editing index (this is a new package)
    editingPackageIndex = -1;
    
    // Reset current package
    currentPackage = {
        type: null,
        typeName: '',
        nodeItem: null,
        name: '',
        description: '',
        items: {
            sensors: [],
            power: [],
            enclosure: [],
            kabel: [],
            connectivity: [],
            protection: [],
            tiang: []
        },
        qty: 1
    };
    
    // Reset modal title
    const modalTitle = document.querySelector('#add-package-modal .modal-header h3');
    if (modalTitle) {
        modalTitle.innerHTML = `<i data-lucide="package-plus"></i> Tambah Paket Baru`;
    }
    
    // Reset form fields
    document.getElementById('package-name').value = '';
    document.getElementById('package-desc').value = '';
    document.getElementById('package-qty').value = 1;
    
    // Show step 1
    document.getElementById('step-select-type').classList.add('active');
    document.getElementById('step-configure').classList.remove('active');
    
    // Reset type selection
    document.querySelectorAll('.type-card').forEach(card => card.classList.remove('selected'));
    
    // Show modal
    document.getElementById('add-package-modal').classList.add('active');
    document.getElementById('btn-save-package').disabled = true;
    
    lucide.createIcons();
}

function closeAddPackageModal() {
    document.getElementById('add-package-modal').classList.remove('active');
}

function selectNodeType(typeId) {
    // Convert "type-a" to "node-type-a" for lookup
    const nodeId = `node-${typeId}`;
    const node = pricingData.hardware.nodes.find(n => n.id === nodeId);
    if (!node) {
        console.error('Node not found:', nodeId);
        return;
    }
    
    currentPackage.type = typeId;
    currentPackage.typeName = node.name;
    currentPackage.nodeItem = {
        id: node.id,
        sku: node.sku,
        name: node.name,
        costPrice: node.costPrice,
        sellPrice: node.sellingPrice,
        customPrice: node.sellingPrice,
        qty: 1
    };
    
    // Highlight selected
    document.querySelectorAll('.type-card').forEach(card => card.classList.remove('selected'));
    event.currentTarget.classList.add('selected');
    
    // Go to step 2
    setTimeout(() => {
        document.getElementById('step-select-type').classList.remove('active');
        document.getElementById('step-configure').classList.add('active');
        document.getElementById('selected-type-name').textContent = node.name;
        
        // Render all category lists from hardware section
        const hw = pricingData.hardware;
        renderCategoryItems('sensors', hw.sensors || []);
        renderCategoryItems('power', hw.power || []);
        renderCategoryItems('enclosure', hw.enclosure || []);
        renderCategoryItems('kabel', hw.kabel || []);
        renderCategoryItems('connectivity', hw.connectivity || []);
        renderCategoryItems('protection', hw.protection || []);
        renderCategoryItems('tiang', hw.tiang || []);
        
        // Enable save button
        document.getElementById('btn-save-package').disabled = false;
        
        updatePackageTotal();
        lucide.createIcons();
    }, 200);
}

function backToTypeSelection() {
    document.getElementById('step-configure').classList.remove('active');
    document.getElementById('step-select-type').classList.add('active');
}

function switchConfigTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.config-tabs .tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `tab-${tabName}`);
    });
}

// ── Render Category Items ───────────────────────────────────────────────────
function renderCategoryItems(category, items, filter = 'all') {
    const tbody = document.getElementById(`${category}-list`);
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!items || items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:#666; padding:20px;">Tidak ada item</td></tr>';
        return;
    }
    
    let filteredItems = items;
    if (filter !== 'all' && category === 'sensors') {
        filteredItems = items.filter(item => item.category === filter);
    }
    
    filteredItems.forEach(item => {
        // Check if already in current package
        const existingItem = currentPackage.items[category].find(i => i.id === item.id);
        const qty = existingItem ? existingItem.qty : 0;
        const customPrice = existingItem ? existingItem.customPrice : item.sellingPrice;
        const total = customPrice * qty;
        const margin = item.sellingPrice > 0 ? Math.round((1 - item.costPrice / customPrice) * 100) : 0;
        const marginClass = margin >= 30 ? 'good' : 'low';
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="sku">${item.sku}</td>
            <td>
                <div class="product-name">${item.name}</div>
                <div class="product-brand">
                    ${item.brand || 'Generic'}
                    <span class="badge ${item.stock === 'ready' ? 'ready' : 'indent'}">${item.stock === 'ready' ? 'Ready' : 'Indent'}</span>
                </div>
            </td>
            <td class="cost-price">${formatCurrency(item.costPrice)}</td>
            <td class="sell-price">${formatCurrency(item.sellingPrice)}</td>
            <td class="margin ${marginClass}">${margin}%</td>
            <td>
                <input type="number" 
                       value="${customPrice}" 
                       data-category="${category}"
                       data-id="${item.id}"
                       onchange="updateItemCustomPrice('${category}', '${item.id}', this.value)">
            </td>
            <td>
                <div class="qty-controls">
                    <button class="qty-btn" onclick="updateItemQty('${category}', '${item.id}', -1)">-</button>
                    <span class="qty-value">${qty}</span>
                    <button class="qty-btn" onclick="updateItemQty('${category}', '${item.id}', 1)">+</button>
                </div>
            </td>
            <td class="total-cell">${qty > 0 ? formatCurrency(total) : '-'}</td>
            <td></td>
        `;
        tbody.appendChild(tr);
    });
}

function updateItemQty(category, itemId, delta) {
    const sourceItem = pricingData.hardware[category]?.find(i => i.id === itemId);
    if (!sourceItem) {
        console.error('Source item not found:', category, itemId);
        return;
    }
    
    let item = currentPackage.items[category].find(i => i.id === itemId);
    
    if (!item && delta > 0) {
        // Add new item
        item = {
            id: sourceItem.id,
            sku: sourceItem.sku,
            name: sourceItem.name,
            costPrice: sourceItem.costPrice,
            sellPrice: sourceItem.sellingPrice,
            customPrice: sourceItem.sellingPrice,
            qty: 0
        };
        currentPackage.items[category].push(item);
    }
    
    if (item) {
        item.qty = Math.max(0, item.qty + delta);
        
        // Remove if qty is 0
        if (item.qty === 0) {
            currentPackage.items[category] = currentPackage.items[category].filter(i => i.id !== itemId);
        }
    }
    
    // Re-render category
    renderCategoryItems(category, pricingData.hardware[category] || []);
    updatePackageTotal();
}

function updateItemCustomPrice(category, itemId, price) {
    const item = currentPackage.items[category].find(i => i.id === itemId);
    if (item) {
        item.customPrice = parseFloat(price) || 0;
        renderCategoryItems(category, pricingData.hardware[category] || []);
        updatePackageTotal();
    }
}

// ── Update Package Total ────────────────────────────────────────────────────
function updatePackageTotal() {
    let unitPrice = 0;
    let itemCount = 0;
    
    // Add node price
    if (currentPackage.nodeItem) {
        unitPrice += currentPackage.nodeItem.customPrice;
        itemCount++;
    }
    
    // Add all category items
    Object.keys(currentPackage.items).forEach(category => {
        currentPackage.items[category].forEach(item => {
            unitPrice += item.customPrice * item.qty;
            itemCount += item.qty;
        });
    });
    
    const packageQty = parseInt(document.getElementById('package-qty').value) || 1;
    currentPackage.qty = packageQty;
    const totalPrice = unitPrice * packageQty;
    
    document.getElementById('selected-items-count').textContent = itemCount;
    document.getElementById('package-unit-price').textContent = formatCurrency(unitPrice);
    document.getElementById('package-total-price').textContent = formatCurrency(totalPrice);
}

// ── Filter Sensors ──────────────────────────────────────────────────────────
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-btn')) {
        const filter = e.target.dataset.filter;
        
        // Update active state
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        
        // Re-render with filter
        renderCategoryItems('sensors', pricingData.hardware?.sensors || [], filter);
    }
});

// ── Save Package ────────────────────────────────────────────────────────────
function savePackage() {
    const name = document.getElementById('package-name').value.trim();
    const description = document.getElementById('package-desc').value.trim();
    
    if (!name) {
        showToast('Nama paket harus diisi', 'error');
        return;
    }
    
    // Calculate unit price
    let unitPrice = currentPackage.nodeItem ? currentPackage.nodeItem.customPrice : 0;
    const allItems = [currentPackage.nodeItem];
    
    Object.keys(currentPackage.items).forEach(category => {
        currentPackage.items[category].forEach(item => {
            unitPrice += item.customPrice * item.qty;
            allItems.push({ ...item, category });
        });
    });
    
    const pkg = {
        id: editingPackageIndex >= 0 ? packages[editingPackageIndex].id : Date.now().toString(),
        type: currentPackage.type,
        typeName: currentPackage.typeName,
        name: name,
        description: description,
        nodeItem: currentPackage.nodeItem,
        items: JSON.parse(JSON.stringify(currentPackage.items)),
        unitPrice: unitPrice,
        qty: currentPackage.qty,
        totalPrice: unitPrice * currentPackage.qty
    };
    
    // Check if editing or adding new
    if (editingPackageIndex >= 0) {
        packages[editingPackageIndex] = pkg;
        showToast(`Paket "${name}" berhasil diupdate`, 'success');
    } else {
        packages.push(pkg);
        showToast(`Paket "${name}" berhasil ditambahkan`, 'success');
    }
    
    // Reset editing index
    editingPackageIndex = -1;
    
    closeAddPackageModal();
    renderPackages();
    updateSummary();
}

// ── Render Packages ─────────────────────────────────────────────────────────
function renderPackages() {
    const container = document.getElementById('packages-list');
    const summary = document.getElementById('packages-summary');
    
    if (packages.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i data-lucide="package-open"></i>
                <p>Belum ada paket. Klik "Add Paket" untuk menambahkan.</p>
            </div>
        `;
        summary.style.display = 'none';
        lucide.createIcons();
        return;
    }
    
    let html = '';
    let totalPackagesPrice = 0;
    
    packages.forEach((pkg, index) => {
        totalPackagesPrice += pkg.totalPrice;
        
        // Build items list
        let itemsList = '';
        if (pkg.nodeItem) {
            itemsList += `<li><span>${pkg.nodeItem.name}</span><span>${formatCurrency(pkg.nodeItem.customPrice)}</span></li>`;
        }
        Object.keys(pkg.items).forEach(category => {
            pkg.items[category].forEach(item => {
                if (item.qty > 0) {
                    itemsList += `<li><span>${item.name} x${item.qty}</span><span>${formatCurrency(item.customPrice * item.qty)}</span></li>`;
                }
            });
        });
        
        html += `
            <div class="package-card" data-index="${index}">
                <div class="package-card-header" onclick="togglePackageDetails(${index})">
                    <div class="package-card-info">
                        <span class="package-type-badge">${pkg.typeName}</span>
                        <span class="package-name">${pkg.name}</span>
                        <span class="package-desc">${pkg.description || ''}</span>
                    </div>
                    <div class="package-card-meta">
                        <span class="package-qty">${pkg.qty} unit × ${formatCurrency(pkg.unitPrice)}</span>
                        <span class="package-price">${formatCurrency(pkg.totalPrice)}</span>
                        <div class="package-actions">
                            <button onclick="event.stopPropagation(); editPackage(${index})" title="Edit">
                                <i data-lucide="edit-2"></i>
                            </button>
                            <button class="danger" onclick="event.stopPropagation(); deletePackage(${index})" title="Hapus">
                                <i data-lucide="trash-2"></i>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="package-card-details">
                    <ul class="package-items-list">
                        ${itemsList}
                    </ul>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    summary.style.display = 'block';
    document.getElementById('total-packages-price').textContent = formatCurrency(totalPackagesPrice);
    
    lucide.createIcons();
}

function togglePackageDetails(index) {
    const card = document.querySelector(`.package-card[data-index="${index}"]`);
    card.classList.toggle('expanded');
}

function deletePackage(index) {
    if (!confirm('Hapus paket ini?')) return;
    packages.splice(index, 1);
    renderPackages();
    updateSummary();
    showToast('Paket dihapus', 'success');
}

function editPackage(index) {
    const pkg = packages[index];
    if (!pkg) {
        showToast('Paket tidak ditemukan', 'error');
        return;
    }
    
    console.log('Editing package:', pkg);
    
    // Store the index being edited
    editingPackageIndex = index;
    
    // Reset currentPackage with the existing package data
    currentPackage = {
        type: pkg.type,
        typeName: pkg.typeName,
        nodeItem: pkg.nodeItem ? { ...pkg.nodeItem } : null,
        name: pkg.name,
        description: pkg.description || '',
        items: JSON.parse(JSON.stringify(pkg.items || {
            sensors: [],
            power: [],
            enclosure: [],
            kabel: [],
            connectivity: [],
            protection: [],
            tiang: []
        })),
        qty: pkg.qty || 1
    };
    
    console.log('currentPackage set to:', currentPackage);
    
    // Open modal
    const modal = document.getElementById('add-package-modal');
    modal.classList.add('active');
    
    // Go directly to step 2 (configure items)
    document.getElementById('step-select-type').classList.remove('active');
    document.getElementById('step-configure').classList.add('active');
    
    // Update modal title
    const modalTitle = document.querySelector('#add-package-modal .modal-header h3');
    if (modalTitle) {
        modalTitle.innerHTML = `<i data-lucide="edit"></i> Edit Paket - ${pkg.typeName}`;
    }
    
    // Mark selected type
    document.querySelectorAll('.type-card').forEach(card => {
        card.classList.remove('selected');
        if (card.dataset.type === pkg.type) {
            card.classList.add('selected');
        }
    });
    
    // Fill in package name and description
    document.getElementById('package-name').value = pkg.name;
    document.getElementById('package-desc').value = pkg.description || '';
    document.getElementById('package-qty').value = pkg.qty;
    
    // Enable save button
    document.getElementById('btn-save-package').disabled = false;
    
    // Ensure all category arrays exist in currentPackage.items
    const categories = ['sensors', 'power', 'enclosure', 'kabel', 'connectivity', 'protection', 'tiang'];
    categories.forEach(category => {
        if (!currentPackage.items[category]) {
            currentPackage.items[category] = [];
        }
    });
    
    console.log('Items before render:', currentPackage.items);
    
    // Render items for all categories
    categories.forEach(category => {
        const items = pricingData.hardware?.[category] || [];
        console.log(`Rendering ${category}:`, items.length, 'items, existing:', currentPackage.items[category].length);
        renderCategoryItems(category, items);
    });
    
    // Activate first tab
    document.querySelector('.config-tabs .tab').click();
    
    // Update package total
    updatePackageTotal();
    
    lucide.createIcons();
}

// ══════════════════════════════════════════════════════════════════════════
// SUMMARY & CALCULATIONS
// ══════════════════════════════════════════════════════════════════════════

function updateSummary() {
    // Total packages
    const totalPackages = packages.reduce((sum, pkg) => sum + pkg.totalPrice, 0);
    
    // Total services
    const totalCloud = services.cloud.total;
    const totalOtherServices = services.items.reduce((sum, item) => sum + (item.customPrice * item.qty), 0);
    const totalServices = totalCloud + totalOtherServices;
    
    // Subtotal
    const subtotal = totalPackages + totalServices;
    
    // Discount
    const discountPct = parseFloat(document.getElementById('discount-percent').value) || 0;
    const discount = subtotal * (discountPct / 100);
    
    // DPP & PPN
    const dpp = subtotal - discount;
    const ppn = dpp * 0.11;
    const grandTotal = dpp + ppn;
    
    // Update display
    document.getElementById('summary-packages').textContent = formatCurrency(totalPackages);
    document.getElementById('summary-services').textContent = formatCurrency(totalServices);
    document.getElementById('summary-subtotal').textContent = formatCurrency(subtotal);
    document.getElementById('summary-discount').textContent = `- ${formatCurrency(discount)}`;
    document.getElementById('summary-dpp').textContent = formatCurrency(dpp);
    document.getElementById('summary-ppn').textContent = formatCurrency(ppn);
    document.getElementById('summary-grand').textContent = formatCurrency(grandTotal);
}

// ══════════════════════════════════════════════════════════════════════════
// RENDER ALL
// ══════════════════════════════════════════════════════════════════════════

function renderAll() {
    renderPackages();
    renderServices();
    updateSummary();
    lucide.createIcons();
}

// ══════════════════════════════════════════════════════════════════════════
// SAVE / LOAD / HISTORY
// ══════════════════════════════════════════════════════════════════════════

function saveQuotation() {
    const quoteNumber = document.getElementById('quote-number').textContent;
    const companyName = document.getElementById('company-name').value || 'Untitled';
    
    const data = {
        id: quoteNumber,
        companyName,
        picName: document.getElementById('pic-name').value,
        picPosition: document.getElementById('pic-position').value,
        picPhone: document.getElementById('pic-phone').value,
        picEmail: document.getElementById('pic-email').value,
        companyAddress: document.getElementById('company-address').value,
        projectNotes: document.getElementById('project-notes').value,
        packages,
        services,
        discountPercent: document.getElementById('discount-percent').value,
        paymentTerms: document.getElementById('payment-terms').value,
        validityDays: document.getElementById('validity-days').value,
        savedAt: new Date().toISOString(),
        grandTotal: document.getElementById('summary-grand').textContent
    };
    
    let history = JSON.parse(localStorage.getItem('quotation_v2_history') || '[]');
    const existingIndex = history.findIndex(h => h.id === quoteNumber);
    
    if (existingIndex >= 0) {
        history[existingIndex] = data;
    } else {
        history.unshift(data);
    }
    
    history = history.slice(0, 50);
    localStorage.setItem('quotation_v2_history', JSON.stringify(history));
    
    showToast(`Quotation ${quoteNumber} berhasil disimpan!`, 'success');
    renderHistory();
}

function loadQuotation(quoteId) {
    const history = JSON.parse(localStorage.getItem('quotation_v2_history') || '[]');
    const data = history.find(h => h.id === quoteId);
    
    if (!data) {
        showToast('Quotation tidak ditemukan', 'error');
        return;
    }
    
    document.getElementById('quote-number').textContent = data.id;
    document.getElementById('company-name').value = data.companyName || '';
    document.getElementById('pic-name').value = data.picName || '';
    document.getElementById('pic-position').value = data.picPosition || '';
    document.getElementById('pic-phone').value = data.picPhone || '';
    document.getElementById('pic-email').value = data.picEmail || '';
    document.getElementById('company-address').value = data.companyAddress || '';
    document.getElementById('project-notes').value = data.projectNotes || '';
    document.getElementById('discount-percent').value = data.discountPercent || '0';
    document.getElementById('payment-terms').value = data.paymentTerms || 'cbd';
    document.getElementById('validity-days').value = data.validityDays || '30';
    
    packages = data.packages || [];
    services = data.services || { cloud: { plan: '', planName: '', devices: 0, months: 12, discount: 0, total: 0 }, items: [] };
    
    // Update cloud inputs
    if (services.cloud.plan) {
        selectCloudPlan(services.cloud.plan);
    }
    document.getElementById('cloud-devices').value = services.cloud.devices || 0;
    document.getElementById('cloud-duration').value = services.cloud.months || 12;
    
    closeHistoryModal();
    renderAll();
    updateCloudTotal();
    showToast(`Quotation ${quoteId} berhasil dimuat!`, 'success');
}

function deleteQuotation(quoteId) {
    if (!confirm(`Hapus quotation ${quoteId}?`)) return;
    
    let history = JSON.parse(localStorage.getItem('quotation_v2_history') || '[]');
    history = history.filter(h => h.id !== quoteId);
    localStorage.setItem('quotation_v2_history', JSON.stringify(history));
    
    renderHistory();
    showToast(`Quotation ${quoteId} dihapus`, 'success');
}

function openHistoryModal() {
    renderHistory();
    document.getElementById('history-modal').classList.add('active');
}

function closeHistoryModal() {
    document.getElementById('history-modal').classList.remove('active');
}

function renderHistory() {
    const container = document.getElementById('history-list');
    const history = JSON.parse(localStorage.getItem('quotation_v2_history') || '[]');
    
    if (history.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i data-lucide="file-x"></i>
                <p>Belum ada quotation tersimpan</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }
    
    container.innerHTML = history.map(h => {
        const date = new Date(h.savedAt).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        return `
            <div class="history-item">
                <div class="history-info">
                    <div class="history-quote-no">${h.id}</div>
                    <div class="history-company">${h.companyName || 'No Company'}</div>
                    <div class="history-date">${date}</div>
                    <div class="history-total">${h.grandTotal || '-'}</div>
                </div>
                <div class="history-actions">
                    <button onclick="loadQuotation('${h.id}')" title="Load">
                        <i data-lucide="download"></i>
                    </button>
                    <button class="danger" onclick="deleteQuotation('${h.id}')" title="Delete">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    lucide.createIcons();
}

// ══════════════════════════════════════════════════════════════════════════
// EXPORT HTML
// ══════════════════════════════════════════════════════════════════════════

function exportHTML() {
    const quoteNumber = document.getElementById('quote-number').textContent;
    const companyName = document.getElementById('company-name').value || '-';
    const picName = document.getElementById('pic-name').value || '-';
    const picPosition = document.getElementById('pic-position').value || '-';
    const picPhone = document.getElementById('pic-phone').value || '-';
    const picEmail = document.getElementById('pic-email').value || '-';
    const companyAddress = document.getElementById('company-address').value || '-';
    const projectNotes = document.getElementById('project-notes').value || '';
    const paymentTerms = document.getElementById('payment-terms').selectedOptions[0].text;
    const validityDays = document.getElementById('validity-days').value;
    
    const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const validUntil = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    
    // Build package items
    let itemNo = 1;
    let packagesHTML = '';
    
    packages.forEach(pkg => {
        // Skip packages with 0 total price
        if (pkg.totalPrice <= 0 || pkg.qty <= 0) return;
        
        // Build detail list for this package
        let detailItems = [];
        if (pkg.nodeItem) {
            detailItems.push(pkg.nodeItem.name);
        }
        Object.keys(pkg.items).forEach(category => {
            pkg.items[category].forEach(item => {
                if (item.qty > 0) {
                    detailItems.push(`${item.name} x${item.qty}`);
                }
            });
        });
        
        packagesHTML += `
            <tr>
                <td class="center">${itemNo++}</td>
                <td>
                    <strong>${pkg.name}</strong><br>
                    <span class="details">${pkg.typeName}<br>${detailItems.join('<br>')}</span>
                </td>
                <td class="center">${pkg.qty} Unit</td>
                <td class="right">${formatCurrency(pkg.unitPrice)}</td>
                <td class="right">${formatCurrency(pkg.totalPrice)}</td>
            </tr>
        `;
    });
    
    // Cloud subscription - only show if total > 0
    if (services.cloud.total > 0 && services.cloud.devices > 0) {
        const plan = pricingData.subscriptions?.find(s => s.id === services.cloud.plan);
        const planName = plan ? plan.name : 'Cloud';
        packagesHTML += `
            <tr>
                <td class="center">${itemNo++}</td>
                <td>
                    <strong>${planName} Subscription</strong><br>
                    <span class="details">${services.cloud.devices} device x ${services.cloud.months} bulan</span>
                </td>
                <td class="center">1 Paket</td>
                <td class="right">${formatCurrency(services.cloud.total)}</td>
                <td class="right">${formatCurrency(services.cloud.total)}</td>
            </tr>
        `;
    }
    
    // Other services - only show if qty > 0 and has value
    services.items.forEach(item => {
        if (item.qty > 0 && item.customPrice > 0) {
            const total = item.customPrice * item.qty;
            packagesHTML += `
                <tr>
                    <td class="center">${itemNo++}</td>
                    <td>${item.name}</td>
                    <td class="center">${item.qty} ${item.name.includes('Tahun') ? 'Tahun' : 'Unit'}</td>
                    <td class="right">${formatCurrency(item.customPrice)}</td>
                    <td class="right">${formatCurrency(total)}</td>
                </tr>
            `;
        }
    });
    
    // Calculate totals
    const totalPackages = packages.reduce((sum, pkg) => sum + pkg.totalPrice, 0);
    const totalServices = services.cloud.total + services.items.reduce((sum, item) => sum + (item.customPrice * item.qty), 0);
    const subtotal = totalPackages + totalServices;
    const discountPct = parseFloat(document.getElementById('discount-percent').value) || 0;
    const discount = subtotal * (discountPct / 100);
    const dpp = subtotal - discount;
    const ppn = dpp * 0.11;
    const grandTotal = dpp + ppn;
    
    const htmlContent = `
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>${quoteNumber} - ${companyName}</title>
    <style>
        @page { size: A4; margin: 15mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10px; line-height: 1.4; color: #333; background: #f5f5f5; }
        .page { background: white; max-width: 210mm; margin: 20px auto; padding: 20mm 15mm; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        @media print { body { background: white; } .page { margin: 0; padding: 0; box-shadow: none; } .no-print { display: none !important; } }
        
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
        .logo { display: flex; align-items: center; gap: 8px; }
        .logo-icon { font-size: 28px; }
        .logo-text { font-size: 24px; font-weight: bold; color: #00d4aa; }
        .company-info { text-align: right; font-size: 9px; color: #666; }
        .company-info strong { color: #333; }
        
        .doc-info { margin-bottom: 15px; }
        .doc-info p { margin: 3px 0; }
        .doc-info strong { color: #333; }
        
        .title { text-align: left; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #00d4aa; }
        .title h1 { font-size: 11px; font-weight: 600; margin-bottom: 5px; }
        
        .intro { margin-bottom: 15px; font-size: 10px; }
        
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 9px; }
        th { background: #f8f9fa; padding: 8px 6px; text-align: left; font-weight: 600; border: 1px solid #ddd; }
        td { padding: 8px 6px; border: 1px solid #ddd; vertical-align: top; }
        .center { text-align: center; }
        .right { text-align: right; }
        .details { font-size: 8px; color: #666; line-height: 1.3; }
        
        .totals { width: 250px; margin-left: auto; margin-bottom: 20px; }
        .totals-row { display: flex; justify-content: space-between; padding: 5px 8px; border-bottom: 1px solid #eee; font-size: 10px; }
        .totals-row.grand { background: #00d4aa; color: white; font-weight: bold; border-radius: 4px; margin-top: 5px; }
        
        .terms { margin-bottom: 20px; font-size: 9px; }
        .terms h4 { margin-bottom: 8px; }
        .terms ul { padding-left: 18px; color: #666; }
        .terms li { margin-bottom: 3px; }
        
        .closing { margin-bottom: 30px; font-size: 10px; }
        
        .signature { display: flex; justify-content: flex-end; margin-top: 40px; }
        .signature-box { text-align: center; width: 150px; }
        .signature-line { margin-top: 50px; border-top: 1px solid #333; padding-top: 5px; font-size: 9px; }
        
        .print-btn { position: fixed; top: 20px; right: 20px; background: #00d4aa; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; cursor: pointer; }
    </style>
</head>
<body>
    <button class="print-btn no-print" onclick="window.print()">🖨️ Print / Save PDF</button>
    
    <div class="page">
        <div class="header">
            <div class="logo">
                <span class="logo-icon">⚡</span>
                <span class="logo-text">DEVETEK</span>
                <span style="margin-left: 10px; font-size: 11px; color: #666;">Let Technology Help You.</span>
            </div>
            <div class="company-info">
                <strong>PT Comon Cipta Inovasi</strong><br>
                Mutiara Karadenan Blok C 07 RT 005<br>
                Karadenan Cibinong<br>
                Kabupaten Bogor<br>
                0856 230 2229<br>
                devetek.com
            </div>
        </div>
        
        <div class="doc-info">
            <p>Bogor ${today}</p>
            <p>No : <strong>${quoteNumber}</strong></p>
            <p>Perihal : Penawaran Loger dan sensor</p>
            <p>Kepada : <strong>${companyName}</strong></p>
            <p>Up : ${picName}</p>
        </div>
        
        <div class="intro">
            <p>Sehubungan dengan adanya kebutuhan Hardware untuk perusahaan anda, maka bersama ini</p>
            <p>Kami berikan penawaran harga dengan spesifikasi sebagai berikut :</p>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th class="center" style="width: 30px;">NO</th>
                    <th>Nama Barang</th>
                    <th class="center" style="width: 60px;">JUMLAH</th>
                    <th class="right" style="width: 90px;">HARGA SATUAN</th>
                    <th class="right" style="width: 90px;">TOTAL</th>
                </tr>
            </thead>
            <tbody>
                ${packagesHTML}
            </tbody>
        </table>
        
        <div class="totals">
            <div class="totals-row">
                <span>Total</span>
                <span>Rp ${formatNumber(subtotal)}</span>
            </div>
            <div class="totals-row">
                <span>Ppn 11%</span>
                <span>Rp ${formatNumber(ppn)}</span>
            </div>
            <div class="totals-row grand">
                <span>GRAND TOTAL</span>
                <span>Rp ${formatNumber(grandTotal)}</span>
            </div>
        </div>
        
        <div class="terms">
            <ul>
                <li>Penawaran berlaku ${validityDays} hari setelah tanggal penawaran</li>
                <li>Pembayaran ${paymentTerms}</li>
                <li>Harga dapat berubah sewaktu-waktu sehubungan dengan perubahan kebijakan.</li>
                <li>FOB Jakarta</li>
            </ul>
        </div>
        
        <div class="closing">
            <p>Demikian penawaran harga ini, kami sangat berharap bisa melakukan kerjasama</p>
            <p>Atas perhatiannya kami ucapkan terimakasih</p>
        </div>
        
        <div class="signature">
            <div class="signature-box">
                <p>Hormat kami</p>
                <div class="signature-line">M. Dwi Nugroho</div>
            </div>
        </div>
    </div>
</body>
</html>`;

    const newWindow = window.open('', '_blank');
    newWindow.document.write(htmlContent);
    newWindow.document.close();
    
    showToast('Quotation dibuka di tab baru. Gunakan Ctrl+P untuk print/save PDF', 'success');
}

// ══════════════════════════════════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════════════════════════════════

function formatCurrency(amount) {
    return 'Rp ' + formatNumber(amount);
}

function formatNumber(amount) {
    return new Intl.NumberFormat('id-ID').format(Math.round(amount));
}

function resetAll() {
    if (!confirm('Reset semua data?')) return;
    
    packages = [];
    services = { cloud: { plan: '', planName: '', devices: 0, months: 12, discount: 0, total: 0 }, items: [] };
    
    document.getElementById('company-name').value = '';
    document.getElementById('pic-name').value = '';
    document.getElementById('pic-position').value = '';
    document.getElementById('pic-phone').value = '';
    document.getElementById('pic-email').value = '';
    document.getElementById('company-address').value = '';
    document.getElementById('project-notes').value = '';
    document.getElementById('discount-percent').value = '0';
    document.getElementById('cloud-devices').value = '0';
    document.getElementById('cloud-duration').value = '12';
    
    // Reset cloud plan selection
    document.querySelectorAll('.cloud-plan-card').forEach(card => {
        card.classList.remove('selected');
    });
    document.getElementById('cloud-total-section').style.display = 'none';
    
    generateQuoteNumber();
    renderAll();
    showToast('Data berhasil direset', 'success');
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}
