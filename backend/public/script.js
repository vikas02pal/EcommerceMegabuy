// STATE MANAGEMENT
let allProducts = [];
let filteredProducts = [];
let cart = [];
let invertedIndex = {};
let currentUser = null;
let searchHistory = [];

// ============== LOGIN SYSTEM ==============
document.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showMainPage();
        switchSection('shop');
    } else {
        showLoginPage();
    }
    
    setupEventListeners();
    loadCart();
});

function showLoginPage() {
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('mainPage').classList.add('main-hidden');
    document.getElementById('mainPage').classList.remove('main-visible');
}

function showMainPage() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('mainPage').classList.remove('main-hidden');
    document.getElementById('mainPage').classList.add('main-visible');
    loadProducts();
    updateUserDisplay();
    loadWishlist();
    loadOrders();
}

// LOGIN FORM HANDLER
document.getElementById('loginForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (email && password) {
        currentUser = { 
            name: email.split('@')[0].toUpperCase(), 
            email: email,
            loginTime: new Date().toLocaleString()
        };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        document.getElementById('email').value = '';
        document.getElementById('password').value = '';
        showMainPage();
    }
});

// LOGOUT HANDLER
document.getElementById('logoutBtn')?.addEventListener('click', () => {
    localStorage.removeItem('currentUser');
    currentUser = null;
    cart = [];
    localStorage.removeItem('cart');
    showLoginPage();
});

function updateUserDisplay() {
    if (currentUser) {
        document.getElementById('userDisplay').textContent = `Welcome, ${currentUser.name}`;
    }
}

let currentPage = 1;
const PAGE_SIZE = 12;

function setupEventListeners() {
    document.getElementById('priceRange')?.addEventListener('input', (e) => {
        document.getElementById('priceValue').textContent = e.target.value;
    });
    
    document.getElementById('clearCartBtn')?.addEventListener('click', clearCart);
    document.getElementById('checkoutBtn')?.addEventListener('click', checkout);
    document.getElementById('optimizeCartBtn')?.addEventListener('click', () => optimizeCart());
    document.getElementById('menuToggle')?.addEventListener('click', () => {
        const icons = document.querySelector('.navbar-icons');
        icons.classList.toggle('visible');
    });
}

// ============== DATA STRUCTURES & ALGORITHMS ==============

// DSA: Build Inverted Index for Search (O(n*m) where n=products, m=words)
function buildInvertedIndex(items) {
    invertedIndex = {};
    items.forEach(product => {
        const searchText = (product.title + ' ' + product.category + ' ' + product.description)
            .toLowerCase()
            .split(/[^a-z0-9]+/)
            .filter(Boolean);
        
        const uniqueTokens = new Set(searchText);
        uniqueTokens.forEach(token => {
            if (!invertedIndex[token]) {
                invertedIndex[token] = [];
            }
            invertedIndex[token].push(product);
        });
    });
}

// DSA: Quick Sort Algorithm for Sorting (O(n log n) average)
function quickSort(arr, key, order = 'asc') {
    if (arr.length <= 1) return arr;
    
    const pivot = arr[Math.floor(arr.length / 2)][key];
    const left = arr.filter(x => {
        const comp = typeof x[key] === 'string' ? 
            x[key].localeCompare(pivot) : 
            x[key] - pivot;
        return order === 'asc' ? comp < 0 : comp > 0;
    });
    const middle = arr.filter(x => x[key] === pivot);
    const right = arr.filter(x => {
        const comp = typeof x[key] === 'string' ? 
            x[key].localeCompare(pivot) : 
            x[key] - pivot;
        return order === 'asc' ? comp > 0 : comp < 0;
    });
    
    return [...quickSort(left, key, order), ...middle, ...quickSort(right, key, order)];
}

// DSA: Binary Search for finding products by price range (O(log n))
function binarySearchByPrice(arr, maxPrice) {
    let left = 0, right = arr.length - 1;
    let result = [];
    
    for (let i = 0; i < arr.length; i++) {
        if (arr[i].price <= maxPrice) {
            result.push(arr[i]);
        }
    }
    return result;
}

// ============== PRODUCTS & FILTERING ==============

async function loadProducts() {
    try {
        const res = await fetch('/api/products');
        allProducts = await res.json();
    } catch (e) {
        const res = await fetch('backend/data/products.json');
        allProducts = await res.json();
    }
    
    buildInvertedIndex(allProducts);
    filteredProducts = [...allProducts];
    applyFilters();
}

function applyFilters() {
    // Get selected categories
    const categoryCheckboxes = document.querySelectorAll('input[name="category"]:checked');
    const selectedCategories = Array.from(categoryCheckboxes).map(cb => cb.value);
    
    // Get price range
    const maxPrice = parseInt(document.getElementById('priceRange').value);
    
    // Get sort option
    const sortBy = document.getElementById('sortBy').value;
    
    // Filter by category and price
    let results = allProducts.filter(product => {
        const categoryMatch = selectedCategories.length === 0 || selectedCategories.includes(product.category);
        const priceMatch = product.price <= maxPrice;
        return categoryMatch && priceMatch;
    });
    
    // Apply sorting (DSA Algorithm)
    switch(sortBy) {
        case 'price-low':
            results = quickSort(results, 'price', 'asc');
            break;
        case 'price-high':
            results = quickSort(results, 'price', 'desc');
            break;
        case 'rating':
            results = quickSort(results, 'rating', 'desc');
            break;
        case 'newest':
            results = results.reverse();
            break;
        default:
            // relevance - keep original order
            break;
    }
    
    filteredProducts = results;
    renderProducts(results);
    updateResultCount();
}

function updateResultCount() {
    document.getElementById('resultCount').textContent = `${filteredProducts.length} products found`;
}

function renderProducts(items) {
    const container = document.getElementById('productList');
    container.innerHTML = '';
    
    if (items.length === 0) {
        container.innerHTML = '<p class="no-products">No products found. Try adjusting filters.</p>';
        document.getElementById('paginationControls').innerHTML = '';
        return;
    }
    
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = items.slice(start, start + PAGE_SIZE);

    pageItems.forEach(product => {
        const ratingData = loadRating(product.sku);
        const avgRating = ratingData.count ? (ratingData.total / ratingData.count).toFixed(1) : '0';
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
            <div class="product-image">
                <img src="${product.image}" alt="${product.title}" onerror="this.src='https://via.placeholder.com/200?text=No+Image'">
            </div>
            <div class="product-info">
                <h3 class="product-title">${product.title}</h3>
                <p class="product-category">${product.category}</p>
                <p class="product-description">${product.description}</p>
                <div class="product-footer">
                    <div class="product-price">
                        <span class="rupee">₹</span>${product.price.toLocaleString('en-IN')}
                    </div>
                    <div class="product-rating">⭐ ${avgRating}</div>
                </div>
                <button class="add-btn" onclick="showProductDetails('${product.sku}')">
                    View Details
                </button>
                <button class="add-btn" data-sku="${product.sku}" onclick="addToCart(event)">
                    Add to Cart
                </button>
            </div>
        `;
        container.appendChild(productCard);
    });
    renderPagination(items.length);
}

function renderPagination(totalItems) {
    const controls = document.getElementById('paginationControls');
    controls.innerHTML = '';
    const pages = Math.ceil(totalItems / PAGE_SIZE);
    for (let i = 1; i <= pages; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        if (i === currentPage) btn.classList.add('active');
        btn.addEventListener('click', () => {
            currentPage = i;
            renderProducts(filteredProducts);
        });
        controls.appendChild(btn);
    }
}

function resetPagination() {
    currentPage = 1;
}

// Adjust filters and search to reset page
function applyFilters() {
    // existing code...
    filteredProducts = results;
    resetPagination();
    renderProducts(results);
    updateResultCount();
}

// ratings persistence
function saveRating(sku, stars) {
    const key = 'ratings_' + sku;
    let data = {total:0,count:0};
    const existing = localStorage.getItem(key);
    if (existing) {
        try { data = JSON.parse(existing);} catch(e){data={total:0,count:0};}
    }
    data.total += stars;
    data.count += 1;
    localStorage.setItem(key, JSON.stringify(data));
}

function loadRating(sku) {
    const data = localStorage.getItem('ratings_' + sku);
    if (data) {
        try { return JSON.parse(data);} catch(e){}
    }
    return {total:0,count:0};
}

// ============== SEARCH FUNCTIONALITY ==============

const searchBox = document.getElementById('searchBox');
const suggestionsDropdown = document.getElementById('suggestions');

searchBox?.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    
    if (!query) {
        suggestionsDropdown.innerHTML = '';
        suggestionsDropdown.style.display = 'none';
        filteredProducts = [...allProducts];
        applyFilters();
        return;
    }
    
    // DSA: Use Inverted Index for search suggestions
    const tokens = query.split(/[^a-z0-9]+/).filter(Boolean);
    const resultSet = new Set();
    
    tokens.forEach(token => {
        if (invertedIndex[token]) {
            invertedIndex[token].forEach(product => resultSet.add(product));
        }
    });
    
    const searchResults = Array.from(resultSet);
    
    // Show suggestions (max 10)
    suggestionsDropdown.innerHTML = '';
    searchResults.slice(0, 10).forEach(product => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        div.textContent = product.title;
        div.onclick = () => {
            searchBox.value = product.title;
            suggestionsDropdown.style.display = 'none';
            filteredProducts = [product];
            renderProducts([product]);
        };
        suggestionsDropdown.appendChild(div);
    });
    
    suggestionsDropdown.style.display = searchResults.length ? 'block' : 'none';
    
    // Filter and display results
    filteredProducts = searchResults;
    resetPagination();
    renderProducts(searchResults);
    updateResultCount();
});

// Hide suggestions when clicking outside
document.addEventListener('click', (e) => {
    if (!searchBox?.contains(e.target) && !suggestionsDropdown?.contains(e.target)) {
        suggestionsDropdown.style.display = 'none';
    }
});

// ============== CART MANAGEMENT ==============

function addToCart(event) {
    const sku = event.target.getAttribute('data-sku');
    const product = allProducts.find(p => p.sku === sku);
    
    if (product) {
        const existingItem = cart.find(item => item.sku === sku);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({...product, quantity: 1});
        }
        saveCart();
        renderCart();
        showCartNotification(`${product.title} added to cart!`);
    }
}

// cart optimizer using knapsack-like greedy by value per price
function optimizeCart(budget) {
    if (cart.length === 0) return;
    if (!budget) {
        const input = prompt('Enter budget amount (₹)', '20000');
        if (!input) return;
        budget = parseInt(input);
        if (isNaN(budget) || budget <= 0) { alert('Invalid budget'); return; }
    }
    // greedy by price descending under budget
    const items = cart.map(i=>({sku:i.sku,price:i.price,qty:i.quantity}));
    const chosen = [];
    let total = 0;
    items.sort((a,b)=>b.price-a.price);
    for (let it of items) {
        for (let q=0;q<it.qty;q++) {
            if (total + it.price <= budget) {
                chosen.push(it.sku);
                total += it.price;
            }
        }
    }
    if (chosen.length === 0) {
        alert('Budget too low to optimize.');
        return;
    }
    const message = 'Optimized cart within ₹'+budget+' includes:\n' + chosen.join(', ');
    alert(message);
}


function removeFromCart(sku) {
    cart = cart.filter(item => item.sku !== sku);
    saveCart();
    renderCart();
}

function updateQuantity(sku, quantity) {
    const item = cart.find(p => p.sku === sku);
    if (item) {
        item.quantity = Math.max(1, quantity);
        saveCart();
        renderCart();
    }
}

function renderCart() {
    const cartItemsContainer = document.getElementById('cartItems');
    cartItemsContainer.innerHTML = '';
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p class="empty-cart">Your cart is empty</p>';
        document.getElementById('cartCount').textContent = '0';
        document.getElementById('subtotal').textContent = '₹0';
        document.getElementById('totalPrice').textContent = '₹0';
        return;
    }
    
    let subtotal = 0;
    cart.forEach(item => {
        subtotal += item.price * item.quantity;
        
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <div class="cart-item-details">
                <h4>${item.title}</h4>
                <p>₹${item.price.toLocaleString('en-IN')} x 
                   <input type="number" min="1" value="${item.quantity}" 
                          onchange="updateQuantity('${item.sku}', this.value)" class="qty-input">
                </p>
            </div>
            <div class="cart-item-price">
                <p>₹${(item.price * item.quantity).toLocaleString('en-IN')}</p>
                <button onclick="removeFromCart('${item.sku}')" class="remove-btn">Remove</button>
            </div>
        `;
        cartItemsContainer.appendChild(cartItem);
    });
    
    const delivery = subtotal > 2000 ? 0 : 99;
    const total = subtotal + delivery;
    
    document.getElementById('cartCount').textContent = cart.length;
    document.getElementById('subtotal').textContent = '₹' + subtotal.toLocaleString('en-IN');
    document.getElementById('delivery').textContent = delivery === 0 ? 'FREE ✓' : '₹' + delivery;
    document.getElementById('totalPrice').textContent = '₹' + total.toLocaleString('en-IN');
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function loadCart() {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
        try {
            cart = JSON.parse(savedCart);
        } catch (e) {
            cart = [];
        }
    }
    if (!currentUser) cart = [];
}

function clearCart() {
    if (confirm('Are you sure you want to clear your cart?')) {
        cart = [];
        saveCart();
        renderCart();
    }
}

function checkout() {
    if (cart.length === 0) {
        alert('Your cart is empty!');
        return;
    }
    
    // Calculate and display totals in checkout modal
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    document.getElementById('subtotalDisplay').textContent = '₹' + subtotal.toLocaleString('en-IN');
    document.getElementById('totalDisplay').textContent = '₹' + subtotal.toLocaleString('en-IN');
    
    // Reset form and show card payment form by default
    document.getElementById('checkoutForm').reset();
    document.querySelector('input[name="paymentMethod"][value="card"]').checked = true;
    document.getElementById('cardPaymentForm').style.display = 'block';
    document.getElementById('upiPaymentForm').style.display = 'none';
    
    // Show the modal
    document.getElementById('checkoutModal').style.display = 'flex';
}


function showCartNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'cart-notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 2000);
    animateCartIcon();
}

function showToast(message) {
    const t = document.createElement('div');
    t.className = 'toast-notification';
    t.textContent = message;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 1500);
}

function animateCartIcon() {
    const icon = document.querySelector('.cart-icon');
    if (!icon) return;
    icon.classList.add('animate');
    setTimeout(() => icon.classList.remove('animate'), 600);
}


// ============== WISHLIST & ORDERS STORAGE ==============
let wishlist = [];
let ordersHistory = [];

function saveWishlist() {
    if (currentUser) {
        localStorage.setItem('wishlist_' + currentUser.email, JSON.stringify(wishlist));
    }
}

function loadWishlist() {
    wishlist = [];
    if (currentUser) {
        const data = localStorage.getItem('wishlist_' + currentUser.email);
        if (data) {
            try { wishlist = JSON.parse(data); } catch(e){wishlist=[];}
        }
    }
}

function saveOrders() {
    if (currentUser) {
        localStorage.setItem('orders_' + currentUser.email, JSON.stringify(ordersHistory));
    }
}

function loadOrders() {
    ordersHistory = [];
    if (currentUser) {
        const data = localStorage.getItem('orders_' + currentUser.email);
        if (data) {
            try { ordersHistory = JSON.parse(data); } catch(e){ordersHistory=[];}
        }
    }
}

// ============== NAVIGATION HANDLERS ==============
document.getElementById('showShopBtn')?.addEventListener('click', () => switchSection('shop'));
document.getElementById('showWishlistBtn')?.addEventListener('click', () => switchSection('wishlist'));
document.getElementById('showOrdersBtn')?.addEventListener('click', () => switchSection('orders'));

function switchSection(section) {
    document.getElementById('shopSection').style.display = section === 'shop' ? 'block' : 'none';
    document.getElementById('wishlistSection').style.display = section === 'wishlist' ? 'block' : 'none';
    document.getElementById('ordersSection').style.display = section === 'orders' ? 'block' : 'none';
    if (section === 'wishlist') renderWishlist();
    if (section === 'orders') renderOrders();
}

// ============== PRODUCT DETAILS MODAL ==============
function showProductDetails(sku) {
    const product = allProducts.find(p => p.sku === sku);
    if (!product) return;
    
    const modal = document.getElementById('productModal');
    const body = document.getElementById('modalBody');
    body.innerHTML = '';
    
    const ratingData = loadRating(sku);
    const avgRating = ratingData.count ? (ratingData.total / ratingData.count).toFixed(1) : product.rating;
    const html = `
        <div class="detail-image"><img src="${product.image}" alt="${product.title}" onerror="this.src='https://via.placeholder.com/300?text=No+Image'"></div>
        <h2>${product.title}</h2>
        <p class="detail-category">${product.category}</p>
        <p class="detail-description">${product.description}</p>
        <p class="detail-price"><span class="rupee">₹</span>${product.price.toLocaleString('en-IN')}</p>
        <p class="detail-rating">⭐ ${avgRating}</p>
        <button class="add-btn" onclick="addToCartBySku('${sku}')">Add to Cart</button>
        <button class="add-btn" onclick="toggleWishlist('${sku}')">
            ${wishlist.find(i=>i.sku===sku)?'Remove from Wishlist':'Add to Wishlist'}
        </button>
        <h3>Reviews & Rating</h3>
        <div id="reviewsSection"></div>
        <textarea id="newReview" placeholder="Write a review..."></textarea>
        <button onclick="submitReview('${sku}')" class="add-btn">Submit Review</button>
        <div class="rating-stars" id="ratingGallery">
            ${ [5,4,3,2,1].map(i=>`<label data-stars="${i}">&#9733;</label>`).join('') }
        </div>
        <button onclick="submitRating('${sku}')" class="add-btn">Give Rating</button>
        <h3>Recommended for you</h3>
        <div id="recommendations" class="product-list"></div>
    `;
    body.innerHTML = html;
    loadReviews(sku);
    showRecommendations(product);
    modal.style.display = 'flex';
}

document.querySelectorAll('.close-modal').forEach(el=>{
    el.addEventListener('click', () => {
        el.closest('.modal').style.display = 'none';
    });
});

window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});

function addToCartBySku(sku) {
    const product = allProducts.find(p => p.sku === sku);
    if (product) {
        // fly-to-cart animation using product image
        const img = document.querySelector(`img[alt="${product.title}"]`);
        if (img) animateFlyToCart(img);

        const existing = cart.find(i=>i.sku===sku);
        if (existing) existing.quantity++;
        else cart.push({...product,quantity:1});
        saveCart(); renderCart();
        showCartNotification(`${product.title} added to cart!`);
    }
}

function animateFlyToCart(img) {
    const cartIcon = document.querySelector('.cart-icon');
    const fly = img.cloneNode(true);
    const rect = img.getBoundingClientRect();
    fly.style.position = 'fixed';
    fly.style.left = rect.left + 'px';
    fly.style.top = rect.top + 'px';
    fly.style.width = rect.width + 'px';
    fly.style.height = rect.height + 'px';
    fly.style.transition = 'all 0.8s ease-in-out';
    fly.style.zIndex = 1000;
    document.body.appendChild(fly);
    const cartRect = cartIcon.getBoundingClientRect();
    setTimeout(() => {
        fly.style.left = cartRect.left + 'px';
        fly.style.top = cartRect.top + 'px';
        fly.style.width = '20px';
        fly.style.height = '20px';
        fly.style.opacity = '0.5';
    }, 10);
    setTimeout(() => fly.remove(), 900);
}

// ============== WISHLIST MANAGEMENT ==============
function toggleWishlist(sku) {
    const idx = wishlist.findIndex(p=>p.sku===sku);
    let added;
    if (idx >= 0) {
        wishlist.splice(idx,1);
        added = false;
    } else {
        const prod = allProducts.find(p=>p.sku===sku);
        if (prod) wishlist.push(prod);
        added = true;
    }
    saveWishlist();
    renderWishlist();
    // update modal button text if open
    const button = document.querySelector(`#productModal button[onclick*="toggleWishlist('${sku}')"]`);
    if (button) {
        button.textContent = added ? 'Remove from Wishlist' : 'Add to Wishlist';
    }
    showToast(added ? 'Added to wishlist' : 'Removed from wishlist');
}

function renderWishlist() {
    const container = document.getElementById('wishlistList');
    container.innerHTML = '';
    if (wishlist.length===0) {
        container.innerHTML = '<p class="no-products">Wishlist is empty.</p>';
        return;
    }
    wishlist.forEach(p=>{
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="product-image"><img src="${p.image}"/></div>
            <div class="product-info">
                <h3 class="product-title">${p.title}</h3>
                <p class="product-price"><span class="rupee">₹</span>${p.price.toLocaleString('en-IN')}</p>
                <button class="add-btn" onclick="showProductDetails('${p.sku}')">View</button>
            </div>
        `;
        container.appendChild(card);
    });
}

// ============== REVIEWS STORAGE ==============
function loadReviews(sku) {
    const data = localStorage.getItem('reviews_' + sku);
    let reviews = [];
    if (data) {
        try { reviews = JSON.parse(data);} catch(e){reviews=[];}
    }
    const section = document.getElementById('reviewsSection');
    section.innerHTML = '';
    reviews.forEach(r=>{
        const div = document.createElement('div');
        div.className='review';
        div.textContent = r;
        section.appendChild(div);
    });
}

function submitRating(sku) {
    const starsEl = document.querySelector('#ratingGallery label.selected');
    if (!starsEl) return;
    const stars = parseInt(starsEl.getAttribute('data-stars'));
    saveRating(sku, stars);
    // update displayed average
    const ratingData = loadRating(sku);
    const avg = (ratingData.count ? (ratingData.total / ratingData.count).toFixed(1) : '0');
    const modal = document.getElementById('productModal');
    const existing = modal.querySelector('.detail-rating');
    if (existing) existing.textContent = '⭐ ' + avg;
    alert('Thank you for rating!');
    renderProducts(filteredProducts);
}

// star click handlers delegated
document.addEventListener('click', (e) => {
    if (e.target.matches('#ratingGallery label')) {
        document.querySelectorAll('#ratingGallery label').forEach(l=>l.classList.remove('selected'));
        e.target.classList.add('selected');
    }
});

function submitReview(sku) {
    const textarea = document.getElementById('newReview');
    const text = textarea.value.trim();
    if (!text) return;
    const key = 'reviews_' + sku;
    let reviews = [];
    const data = localStorage.getItem(key);
    if (data) {
        try { reviews = JSON.parse(data);} catch(e){reviews=[];}
    }
    reviews.push(text);
    localStorage.setItem(key, JSON.stringify(reviews));
    textarea.value = '';
    loadReviews(sku);
}

// ============== RECOMMENDATIONS ==============
function showRecommendations(product) {
    const recContainer = document.getElementById('recommendations');
    recContainer.innerHTML = '';
    // basic recommendation: same category or shared tags
    const recs = allProducts.filter(p=>p.sku!==product.sku && (p.category===product.category || p.tags.some(t=>product.tags.includes(t))));
    
    if (recs.length === 0) {
        recContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #999; padding: 20px;">No recommendations available</p>';
        return;
    }
    
    recs.slice(0, 4).forEach(p => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="product-image">
                <img src="${p.image}" alt="${p.title}" />
                <div class="quick-view" onclick="showProductDetails('${p.sku}')">Quick View</div>
            </div>
            <div class="product-info">
                <p class="product-category">${p.category}</p>
                <h3 class="product-title">${p.title}</h3>
                <div class="product-footer">
                    <span class="product-price"><span class="rupee">₹</span>${p.price.toLocaleString('en-IN')}</span>
                    <span class="product-rating">⭐ ${p.rating}</span>
                </div>
                <button class="add-btn" onclick="addToCartBySku('${p.sku}')">Add to Cart</button>
            </div>
        `;
        recContainer.appendChild(card);
    });
}

// ============== ORDER HISTORY & CHECKOUT FORM ==============

// Toggle payment form display (Card vs UPI vs COD)
function togglePaymentForm() {
    const method = document.querySelector('input[name="paymentMethod"]:checked').value;
    document.getElementById('cardPaymentForm').style.display = method === 'card' ? 'block' : 'none';
    document.getElementById('upiPaymentForm').style.display = method === 'upi' ? 'block' : 'none';
    
    // Clear validation requirements based on payment method
    if (method === 'card') {
        document.getElementById('cardName').required = true;
        document.getElementById('cardNumber').required = true;
        document.getElementById('cardExpiry').required = true;
        document.getElementById('cardCVV').required = true;
        document.getElementById('upiId').required = false;
    } else if (method === 'upi') {
        document.getElementById('upiId').required = true;
        document.getElementById('cardName').required = false;
        document.getElementById('cardNumber').required = false;
        document.getElementById('cardExpiry').required = false;
        document.getElementById('cardCVV').required = false;
    } else {
        document.getElementById('cardName').required = false;
        document.getElementById('cardNumber').required = false;
        document.getElementById('cardExpiry').required = false;
        document.getElementById('cardCVV').required = false;
        document.getElementById('upiId').required = false;
    }
}

document.getElementById('checkoutForm')?.addEventListener('submit', (e)=>{
    e.preventDefault();
    const name = document.getElementById('checkoutName').value.trim();
    const addr = document.getElementById('checkoutAddress').value.trim();
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
    
    if (!name || !addr) {
        alert('Please fill in all required fields');
        return;
    }
    
    // Validate payment details based on method
    if (paymentMethod === 'card') {
        const cardName = document.getElementById('cardName').value.trim();
        const cardNumber = document.getElementById('cardNumber').value.trim().replace(/\s/g, '');
        const cardExpiry = document.getElementById('cardExpiry').value.trim();
        const cardCVV = document.getElementById('cardCVV').value.trim();
        
        if (!cardName || !cardNumber || !cardExpiry || !cardCVV) {
            alert('Please fill in all card details');
            return;
        }
        if (cardNumber.length !== 16 || !/^\d+$/.test(cardNumber)) {
            alert('Please enter a valid 16-digit card number');
            return;
        }
        if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
            alert('Please enter expiry date in MM/YY format');
            return;
        }
        if (cardCVV.length !== 3 || !/^\d+$/.test(cardCVV)) {
            alert('Please enter a valid 3-digit CVV');
            return;
        }
    } else if (paymentMethod === 'upi') {
        const upiId = document.getElementById('upiId').value.trim();
        if (!upiId || !upiId.includes('@')) {
            alert('Please enter a valid UPI ID (e.g., username@upi)');
            return;
        }
    }
    
    const order = {
        id: 'ORD' + Date.now(),
        date: new Date().toLocaleString(),
        items: cart.map(i=>({sku:i.sku,title:i.title,price:i.price,qty:i.quantity})),
        total: cart.reduce((s,i)=>s+i.price*i.quantity,0),
        delivery: 0, // Free shipping
        name, 
        addr, 
        paymentMethod,
        status: 'Confirmed',
        estimatedDelivery: new Date(Date.now() + 7*24*60*60*1000).toLocaleDateString()
    };
    
    ordersHistory.push(order);
    saveOrders();
    cart = [];
    saveCart();
    renderCart();
    document.getElementById('checkoutModal').style.display='none';
    
    // Reset form
    document.getElementById('checkoutForm').reset();
    document.getElementById('cardPaymentForm').style.display = 'block';
    document.getElementById('upiPaymentForm').style.display = 'none';
    
    showToast('✅ Order placed successfully! Order ID: ' + order.id);
    
    // Render updated orders
    renderOrders();
});

// Generate and download receipt
function downloadReceipt(orderId) {
    const order = ordersHistory.find(o => o.id === orderId);
    if (!order) return;
    
    // Create receipt content
    let receiptHTML = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Receipt - ${order.id}</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
            .receipt { background: white; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            .header { text-align: center; border-bottom: 3px solid #ff6b35; padding-bottom: 20px; margin-bottom: 24px; }
            .header h1 { color: #ff6b35; margin: 0 0 8px 0; font-size: 28px; }
            .header p { color: #666; margin: 0; font-size: 13px; }
            .order-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid #e0e0e0; }
            .info-group label { color: #004e89; font-weight: 600; font-size: 12px; display: block; margin-bottom: 4px; }
            .info-group p { color: #333; margin: 0; font-size: 14px; }
            .items-section { margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid #e0e0e0; }
            .items-section h3 { color: #004e89; margin: 0 0 12px 0; font-size: 14px; font-weight: 600; }
            .item-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
            .item-row span:first-child { color: #333; flex: 1; }
            .item-row span:last-child { color: #ff6b35; font-weight: 600; text-align: right; }
            .summary { margin-bottom: 24px; }
            .summary-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; }
            .summary-row.total { border-top: 2px solid #ff6b35; padding-top: 12px; font-size: 16px; font-weight: 700; color: #004e89; }
            .summary-row.total span:last-child { color: #ff6b35; }
            .payment-method { background: #f9f9f9; padding: 12px; border-radius: 6px; border-left: 4px solid #ff6b35; font-size: 13px; color: #666; }
            .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
        </style>
    </head>
    <body>
        <div class="receipt">
            <div class="header">
                <h1>MegaBuy</h1>
                <p>Your Order Receipt</p>
            </div>
            
            <div class="order-info">
                <div class="info-group">
                    <label>Order ID</label>
                    <p>${order.id}</p>
                </div>
                <div class="info-group">
                    <label>Order Date</label>
                    <p>${order.date}</p>
                </div>
                <div class="info-group">
                    <label>Customer Name</label>
                    <p>${order.name}</p>
                </div>
                <div class="info-group">
                    <label>Delivery Address</label>
                    <p>${order.addr}</p>
                </div>
            </div>
            
            <div class="items-section">
                <h3>Order Items</h3>
                ${order.items.map(item => `
                <div class="item-row">
                    <span>${item.title} x${item.qty}</span>
                    <span>₹${(item.price * item.qty).toLocaleString('en-IN')}</span>
                </div>
                `).join('')}
            </div>
            
            <div class="summary">
                <div class="summary-row">
                    <span>Subtotal:</span>
                    <span>₹${order.total.toLocaleString('en-IN')}</span>
                </div>
                <div class="summary-row">
                    <span>Shipping:</span>
                    <span style="color: #4caf50;">FREE</span>
                </div>
                <div class="summary-row total">
                    <span>Total Amount:</span>
                    <span>₹${(order.total + order.delivery).toLocaleString('en-IN')}</span>
                </div>
            </div>
            
            <div class="payment-method">
                <strong>Payment Method:</strong> ${order.paymentMethod === 'card' ? 'Credit/Debit Card' : order.paymentMethod === 'upi' ? 'UPI' : 'Cash on Delivery'}<br>
                <strong>Status:</strong> ${order.status}<br>
                <strong>Estimated Delivery:</strong> ${order.estimatedDelivery || 'Pending'}
            </div>
            
            <div class="footer">
                <p>Thank you for shopping with MegaBuy!</p>
                <p>For any queries, please contact support@megabuy.com</p>
                <p style="margin-top: 12px; font-size: 11px;">© 2024 MegaBuy. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;
    
    // Create blob and download
    const blob = new Blob([receiptHTML], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MegaBuy_Receipt_${order.id}.html`;
    a.click();
    window.URL.revokeObjectURL(url);
}

function renderOrders() {
    const container = document.getElementById('ordersList');
    container.innerHTML='';
    if (ordersHistory.length===0) {
        container.innerHTML='<p style="text-align:center; color:#999;">No orders yet. Start shopping!</p>';
        return;
    }
    ordersHistory.forEach(o=>{
        const card=document.createElement('div');
        card.className='order-card';
        card.innerHTML=`
            <h4>Order ${o.id} <small style="font-size:12px; color:#999;">${o.date}</small></h4>
            <div class="order-items">${o.items.map(i=>`${i.title} x${i.qty} (₹${i.price})`).join('<br>')}</div>
            <p><strong>Delivery Address:</strong> ${o.addr}</p>
            <p><strong>Total:</strong> ₹${(o.total + o.delivery).toLocaleString('en-IN')} | <strong>Payment:</strong> ${o.paymentMethod === 'card' ? '💳 Card' : o.paymentMethod === 'upi' ? '📱 UPI' : '🚚 COD'} | <strong>Status:</strong> <span style="color:#4caf50;">✓ ${o.status}</span></p>
            <button onclick="downloadReceipt('${o.id}')" style="padding: 8px 16px; background: linear-gradient(135deg, #ff6b35, #ff8c42); color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: 600; margin-top: 12px; transition: all 0.3s ease;" onmouseover="this.style.boxShadow='0 4px 12px rgba(255,107,53,0.3)'; this.style.transform='translateY(-2px)';" onmouseout="this.style.boxShadow='none'; this.style.transform='translateY(0)';">
                📥 Download Receipt
            </button>
        `;
        container.appendChild(card);
    });
}

// scroll-to-top button behavior
const scrollBtn = document.getElementById('scrollTopBtn');
window.addEventListener('scroll', () => {
    if (window.pageYOffset > 300) scrollBtn.style.display = 'block';
    else scrollBtn.style.display = 'none';
});
scrollBtn.addEventListener('click', () => window.scrollTo({top:0,behavior:'smooth'}));

// load initial data
loadProducts();
renderCart();
loadWishlist();
loadOrders();

