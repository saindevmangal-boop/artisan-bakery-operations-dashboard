const STORAGE_KEY_ORDERS = 'artisanBakeryOrders';
const STORAGE_KEY_INVENTORY = 'artisanBakeryInventory';

const navLinks = document.querySelectorAll('.nav-link');
const pages = document.querySelectorAll('.page-panel');
const connectionStatus = document.getElementById('connectionStatus');
const ordersSearch = document.getElementById('ordersSearch');
const ordersTableBody = document.getElementById('ordersTableBody');
const ordersEmptyState = document.getElementById('ordersEmptyState');
const inventoryList = document.getElementById('inventoryList');
const productSelect = document.getElementById('productSelect');
const orderForm = document.getElementById('orderForm');
const customerNameInput = document.getElementById('customerNameInput');
const orderQuantityInput = document.getElementById('orderQuantityInput');
const contactNumberInput = document.getElementById('contactNumberInput');
const orderFormFeedback = document.getElementById('orderFormFeedback');
const cancelOrderButton = document.getElementById('cancelOrderButton');
const completeAllButton = document.getElementById('completeAllButton');
const refreshOrdersButton = document.getElementById('refreshOrdersButton');
const dashboardTotalOrders = document.getElementById('dashboardTotalOrders');
const dashboardPendingOrders = document.getElementById('dashboardPendingOrders');
const dashboardCompletedOrders = document.getElementById('dashboardCompletedOrders');
const dashboardLowStock = document.getElementById('dashboardLowStock');
const dashboardStatusText = document.getElementById('dashboardStatusText');
const reportDailySales = document.getElementById('reportDailySales');
const reportProductsInStock = document.getElementById('reportProductsInStock');
const reportLowStockCount = document.getElementById('reportLowStockCount');
const reportOrdersToday = document.getElementById('reportOrdersToday');
const reportInventorySummary = document.getElementById('reportInventorySummary');

let orders = [];
let inventory = [];
let currentSearch = '';
let messageTimeout = null;

const seedInventory = [
  { id: 'croissant', name: 'Butter Croissant', stock: 22, threshold: 10, price: 3.5 },
  { id: 'baguette', name: 'Traditional Baguette', stock: 16, threshold: 8, price: 2.1 },
  { id: 'sourdough', name: 'Sourdough Loaf', stock: 9, threshold: 10, price: 5.0 },
  { id: 'danish', name: 'Fruit Danish', stock: 11, threshold: 8, price: 4.2 },
  { id: 'cookie', name: 'Chocolate Chip Cookie', stock: 18, threshold: 12, price: 2.25 },
  { id: 'muffin', name: 'Blueberry Muffin', stock: 7, threshold: 10, price: 3.0 }
];

const seedOrders = [
  { id: 'ORD-1001', customer: 'Mila', productId: 'croissant', quantity: 12, contact: '555-1024', status: 'Pending', createdAt: new Date().toISOString() },
  { id: 'ORD-1002', customer: 'Noah', productId: 'baguette', quantity: 3, contact: '555-2471', status: 'Completed', createdAt: new Date().toISOString() }
];

function sanitizeText(value) {
  const node = document.createTextNode(value);
  const div = document.createElement('div');
  div.appendChild(node);
  return div.innerHTML;
}

function setMessage(message, options = {}) {
  const { type = 'info', persist = false } = options;
  orderFormFeedback.textContent = message;
  orderFormFeedback.style.color = type === 'error' ? '#b31b1b' : '#111';
  if (messageTimeout) {
    window.clearTimeout(messageTimeout);
  }
  if (!persist) {
    messageTimeout = window.setTimeout(() => {
      orderFormFeedback.textContent = '';
    }, 4800);
  }
}

function reportAnalytics(action) {
  console.log(`[Analytics] User interacted with Static HTML Shell: ${action}`);
}

function updateNetworkStatus() {
  const online = navigator.onLine;
  connectionStatus.textContent = online ? 'Online mode enabled' : 'Offline mode enabled';
  connectionStatus.style.background = online ? '#111' : '#b31b1b';
}

function loadLocalData(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.warn(`Unable to load ${key}`, error);
    return fallback;
  }
}

function saveLocalData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.warn(`Unable to save ${key}`, error);
  }
}

function findProduct(productId) {
  return inventory.find((item) => item.id === productId) || { name: 'Unknown', stock: 0, threshold: 0, price: 0 };
}

function setActivePage(pageKey) {
  pages.forEach((page) => {
    page.classList.toggle('page-panel--active', page.dataset.page === pageKey);
  });
  navLinks.forEach((link) => {
    link.classList.toggle('active', link.dataset.page === pageKey);
  });
  if (pageKey === 'dashboard') renderDashboard();
  if (pageKey === 'orders') renderOrders();
  if (pageKey === 'inventory') renderInventory();
  if (pageKey === 'add-order') populateProductOptions();
  if (pageKey === 'reports') renderReports();
}

function countLowStock() {
  return inventory.filter((item) => item.stock <= item.threshold).length;
}

function renderDashboard() {
  const totalOrders = orders.length;
  const completedOrders = orders.filter((order) => order.status === 'Completed').length;
  const pendingOrders = totalOrders - completedOrders;
  const lowStockCount = countLowStock();
  dashboardTotalOrders.textContent = String(totalOrders);
  dashboardPendingOrders.textContent = String(pendingOrders);
  dashboardCompletedOrders.textContent = String(completedOrders);
  dashboardLowStock.textContent = String(lowStockCount);
  dashboardStatusText.textContent = lowStockCount > 0
    ? `There are ${lowStockCount} low stock item${lowStockCount === 1 ? '' : 's'} that need restocking.`
    : 'Inventory is in good shape. Continue processing orders smoothly.';
}

function renderOrders() {
  const filter = currentSearch.trim().toLowerCase();
  const visibleOrders = orders.filter((order) => {
    if (!filter) return true;
    return [order.id, order.customer, findProduct(order.productId).name, order.contact, order.status]
      .join(' ')
      .toLowerCase()
      .includes(filter);
  });
  ordersTableBody.innerHTML = '';
  if (visibleOrders.length === 0) {
    ordersEmptyState.hidden = false;
    return;
  }
  ordersEmptyState.hidden = true;
  visibleOrders.forEach((order) => {
    const row = document.createElement('tr');
    const product = findProduct(order.productId);
    row.innerHTML = `
      <td>${sanitizeText(order.id)}</td>
      <td>${sanitizeText(order.customer)}</td>
      <td>${sanitizeText(product.name)}</td>
      <td>${sanitizeText(String(order.quantity))}</td>
      <td>${sanitizeText(order.contact)}</td>
      <td>${sanitizeText(order.status)}</td>
      <td>
        <button type="button" class="button-secondary" data-action="toggle" data-order="${order.id}">${order.status === 'Completed' ? 'Mark pending' : 'Complete'}</button>
        <button type="button" class="button-secondary" data-action="remove" data-order="${order.id}">Remove</button>
      </td>
    `;
    ordersTableBody.appendChild(row);
  });
}

function renderInventory() {
  inventoryList.innerHTML = '';
  inventory.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'product-card';
    if (item.stock <= item.threshold) card.classList.add('product-card--low');
    card.innerHTML = `
      <h3 class="product-card__title">${sanitizeText(item.name)}</h3>
      <p class="product-card__meta">Stock: <strong>${sanitizeText(String(item.stock))}</strong></p>
      <p class="product-card__meta">Threshold: ${sanitizeText(String(item.threshold))}</p>
      <p class="product-card__meta">Price: $${sanitizeText(item.price.toFixed(2))}</p>
      <p class="product-card__meta">${item.stock <= item.threshold ? '<span class="product-pill">Low stock</span>' : '<span class="product-pill">Healthy stock</span>'}</p>
    `;
    inventoryList.appendChild(card);
  });
}

function renderReports() {
  const dailySales = orders
    .filter((order) => order.status === 'Completed')
    .reduce((sum, order) => sum + findProduct(order.productId).price * order.quantity, 0);
  const productsInStock = inventory.reduce((sum, item) => sum + item.stock, 0);
  const lowStockCount = countLowStock();
  reportDailySales.textContent = `$${dailySales.toFixed(2)}`;
  reportProductsInStock.textContent = String(productsInStock);
  reportLowStockCount.textContent = String(lowStockCount);
  reportOrdersToday.textContent = String(orders.length);
  reportInventorySummary.innerHTML = '';
  inventory.forEach((item) => {
    const listItem = document.createElement('li');
    listItem.textContent = `${item.name}: ${item.stock} in stock, threshold ${item.threshold}`;
    reportInventorySummary.appendChild(listItem);
  });
}

function populateProductOptions() {
  productSelect.innerHTML = '';
  inventory.forEach((item) => {
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = `${item.name} (${item.stock} available)`;
    productSelect.appendChild(option);
  });
}

function validateOrderForm() {
  const fields = [customerNameInput, orderQuantityInput, contactNumberInput];
  let valid = true;
  fields.forEach((field) => {
    const empty = !field.value.trim();
    field.classList.toggle('invalid', empty);
    field.setAttribute('aria-invalid', String(empty));
    if (empty) valid = false;
  });
  const quantity = Number(orderQuantityInput.value);
  if (Number.isNaN(quantity) || quantity < 1) {
    orderQuantityInput.classList.add('invalid');
    orderQuantityInput.setAttribute('aria-invalid', 'true');
    valid = false;
  }
  const selectedProduct = findProduct(productSelect.value);
  if (selectedProduct.stock < quantity) {
    setMessage(`Only ${selectedProduct.stock} ${selectedProduct.name} available.`, { type: 'error' });
    valid = false;
  }
  if (!valid) {
    setMessage('Please fix highlighted fields before submitting.', { type: 'error' });
  }
  return valid;
}

function clearOrderForm() {
  customerNameInput.value = '';
  orderQuantityInput.value = '';
  contactNumberInput.value = '';
  [customerNameInput, orderQuantityInput, contactNumberInput].forEach((field) => {
    field.classList.remove('invalid');
    field.setAttribute('aria-invalid', 'false');
  });
  setMessage('');
}

function generateOrderId() {
  return `ORD-${String(Date.now()).slice(-5)}`;
}

function saveState() {
  saveLocalData(STORAGE_KEY_ORDERS, orders);
  saveLocalData(STORAGE_KEY_INVENTORY, inventory);
}

function submitOrder(event) {
  event.preventDefault();
  setMessage('');
  if (!validateOrderForm()) return;
  const productId = productSelect.value;
  const quantity = Number(orderQuantityInput.value);
  const newOrder = {
    id: generateOrderId(),
    customer: customerNameInput.value.trim(),
    productId,
    quantity,
    contact: contactNumberInput.value.trim(),
    status: 'Pending',
    createdAt: new Date().toISOString(),
  };
  inventory = inventory.map((item) =>
    item.id === productId ? { ...item, stock: item.stock - quantity } : item
  );
  orders.unshift(newOrder);
  saveState();
  setMessage('Order submitted successfully.');
  reportAnalytics(`submitted order ${newOrder.id}`);
  clearOrderForm();
  populateProductOptions();
  setActivePage('orders');
}

function toggleOrderStatus(orderId) {
  orders = orders.map((order) =>
    order.id === orderId
      ? { ...order, status: order.status === 'Completed' ? 'Pending' : 'Completed' }
      : order
  );
  saveState();
  renderOrders();
  renderDashboard();
  renderReports();
  reportAnalytics(`toggled order ${orderId}`);
}

function removeOrder(orderId) {
  if (!window.confirm('Remove this order?')) return;
  orders = orders.filter((order) => order.id !== orderId);
  saveState();
  renderOrders();
  renderDashboard();
  renderReports();
  reportAnalytics(`removed order ${orderId}`);
}

function completeAllPending() {
  const pendingCount = orders.filter((order) => order.status === 'Pending').length;
  if (pendingCount === 0) {
    setMessage('No pending orders to complete.');
    return;
  }
  orders = orders.map((order) => ({ ...order, status: 'Completed' }));
  saveState();
  renderOrders();
  renderDashboard();
  renderReports();
  setMessage(`${pendingCount} pending ${pendingCount === 1 ? 'order has' : 'orders have'} been completed.`);
  reportAnalytics('completed all pending orders');
}

function handleOrderAction(event) {
  const button = event.target.closest('button');
  if (!button) return;
  const orderId = button.dataset.order;
  const action = button.dataset.action;
  if (!orderId || !action) return;
  if (action === 'toggle') toggleOrderStatus(orderId);
  if (action === 'remove') removeOrder(orderId);
}

function initialize() {
  updateNetworkStatus();
  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
  orders = loadLocalData(STORAGE_KEY_ORDERS, null) || seedOrders;
  inventory = loadLocalData(STORAGE_KEY_INVENTORY, null) || seedInventory;
  saveState();
  navLinks.forEach((link) => {
    link.addEventListener('click', () => setActivePage(link.dataset.page));
  });
  ordersSearch.addEventListener('input', (event) => {
    currentSearch = event.target.value;
    renderOrders();
  });
  orderForm.addEventListener('submit', submitOrder);
  cancelOrderButton.addEventListener('click', clearOrderForm);
  completeAllButton.addEventListener('click', completeAllPending);
  refreshOrdersButton.addEventListener('click', renderOrders);
  ordersTableBody.addEventListener('click', handleOrderAction);
  setActivePage('dashboard');
  populateProductOptions();
  renderInventory();
  renderReports();
}

initialize();
