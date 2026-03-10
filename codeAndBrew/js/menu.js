// Menu data and Logic
let flatMenu = [];

const menuContainer = document.getElementById('menu-container');
const carouselIndicators = document.querySelector('.carousel-indicators');
const carouselInner = document.querySelector('.carousel-inner');
const searchInput = document.getElementById('search-input');
const sortSelect = document.getElementById('sort-select');

// Fetch data from JSON
async function fetchMenuData() {
    try {
        const response = await fetch('js/catalogProducts.json');
        if (!response.ok) {
            throw new Error('Failed to load menu data');
        }
        const data = await response.json();
        return data.products;
    } catch (error) {
        console.error('Error fetching menu data:', error);
        if (menuContainer) {
            menuContainer.innerHTML = '<div class="col-12 text-center text-danger"><p>Failed to load menu. Please try again later.</p></div>';
        }
        return [];
    }
}

function renderCarousel(items) {
    if (!carouselIndicators || !carouselInner) return;

    const featuredItems = items.filter(item => item.featured);
    
    carouselIndicators.innerHTML = '';
    carouselInner.innerHTML = '';

    const carouselWrapper = document.getElementById('featuredCarousel');
    if (featuredItems.length === 0) {
        if (carouselWrapper) carouselWrapper.style.display = 'none';
        return;
    } else {
        if (carouselWrapper) carouselWrapper.style.display = 'block';
    }

    featuredItems.forEach((item, index) => {
        // Create indicator
        const indicator = document.createElement('button');
        indicator.type = 'button';
        indicator.dataset.bsTarget = '#featuredCarousel';
        indicator.dataset.bsSlideTo = index;
        indicator.ariaLabel = `Slide ${index + 1}`;
        if (index === 0) {
            indicator.className = 'active';
            indicator.ariaCurrent = 'true';
        }
        carouselIndicators.appendChild(indicator);

        // Create carousel item
        const carouselItem = document.createElement('div');
        carouselItem.className = `carousel-item ${index === 0 ? 'active' : ''}`;
        
        // Use placeholder image if no image provided or fallback
        const bgImage = item.image ? item.image : 'https://placehold.co/800x400/3e2723/ffffff?text=' + encodeURIComponent(item.name);
        
        carouselItem.innerHTML = `
            <img src="${bgImage}" class="d-block w-100" alt="${item.name}" style="height: 400px; object-fit: cover; opacity: 0.9;">
            <div class="carousel-caption d-none d-md-block bg-dark bg-opacity-75 rounded p-4">
                <h3 class="display-5 fw-bold text-light">${item.name}</h3>
                <p class="lead text-light">${item.description}</p>
                <div class="mt-3">
                    <span class="badge bg-warning text-dark fs-5 me-2">$${item.price.toFixed(2)}</span>
                    <button class="btn btn-primary btn-sm">Order Now</button>
                </div>
            </div>
        `;
        carouselInner.appendChild(carouselItem);
    });
}

function renderMenu(items) {
    if (!menuContainer) return;
    menuContainer.innerHTML = '';
    
    if (items.length === 0) {
        menuContainer.innerHTML = '<div class="col-12 text-center py-5"><h4>No items found matching your search.</h4></div>';
        return;
    }

    items.forEach(item => {
        const cardWrapper = document.createElement('div');
        cardWrapper.className = 'col-md-6 col-lg-4 col-xl-3 mb-4';
        
        const featuredBadge = item.featured ? '<span class="position-absolute top-0 end-0 badge rounded-pill bg-warning text-dark m-2" style="z-index: 1;">Featured</span>' : '';

        // Using Bootstrap Card
        cardWrapper.innerHTML = `
            <div class="card h-100 shadow-sm border-0 position-relative">
                ${featuredBadge}
                <div class="card-header bg-transparent border-0 d-flex justify-content-between align-items-center pt-3 pb-0">
                    <span class="fs-1">${item.icon}</span>
                    <span class="badge bg-light text-dark border">${item.category}</span>
                </div>
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h5 class="card-title mb-0 fw-bold">${item.name}</h5>
                        <span class="text-primary fw-bold">$${item.price.toFixed(2)}</span>
                    </div>
                    <p class="card-text text-muted small">${item.description}</p>
                </div>
                <div class="card-footer bg-transparent border-0 pb-3">
                    <button class="btn btn-outline-primary w-100">Add to Order</button>
                </div>
            </div>
        `;
        menuContainer.appendChild(cardWrapper);
    });
}

function filterAndSortMenu() {
    if (!searchInput || !sortSelect) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    const sortBy = sortSelect.value; 

    let filteredItems = flatMenu.filter(item => 
        item.name.toLowerCase().includes(searchTerm) || 
        item.description.toLowerCase().includes(searchTerm) ||
        item.category.toLowerCase().includes(searchTerm)
    );

    if (sortBy === 'price-low') {
        filteredItems.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
        filteredItems.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'name-asc') { // Fixed value from 'name' to 'name-asc' based on HTML
        filteredItems.sort((a, b) => a.name.localeCompare(b.name));
    }

    renderMenu(filteredItems);
}

// Event listeners
if (searchInput) {
    searchInput.addEventListener('input', filterAndSortMenu);
}
if (sortSelect) {
    sortSelect.addEventListener('change', filterAndSortMenu);
}

// Initial render
document.addEventListener('DOMContentLoaded', async () => {
    flatMenu = await fetchMenuData();
    renderCarousel(flatMenu);
    renderMenu(flatMenu); // render full menu initially
});
