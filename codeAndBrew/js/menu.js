// Menu data and Logic
// Hold the full list of menu items once they have been loaded from the server.
let flatMenu = [];

// Grab the DOM elements we will be updating as the user interacts with the page.
const menuContainer = document.getElementById('menu-container');
const carouselIndicators = document.querySelector('.carousel-indicators');
const carouselInner = document.querySelector('.carousel-inner');
const searchInput = document.getElementById('search-input');
const sortSelect = document.getElementById('sort-select');

// Fetch data from JSON
async function fetchMenuData() {
    try {
        // Request the product catalogue from the server.
        const response = await fetch('js/catalogProducts.json');
        // Throw a descriptive error if the server returned a failure status.
        if (!response.ok) {
            throw new Error('Failed to load menu data');
        }
        // Parse the response body as JSON.
        const data = await response.json();
        // Return just the products array, which is all the rest of the page needs.
        return data.products;
    } catch (error) {
        console.error('Error fetching menu data:', error);
        // Show a friendly message in place of the menu if the request failed.
        if (menuContainer) {
            menuContainer.innerHTML = '<div class="col-12 text-center text-danger"><p>Failed to load menu. Please try again later.</p></div>';
        }
        // Return an empty list so the rest of the code does not crash.
        return [];
    }
}

function renderCarousel(items) {
    // Stop early if the carousel markup is missing from this page.
    if (!carouselIndicators || !carouselInner) return;

    // Pull out only the items that have been marked as featured.
    const featuredItems = items.filter(item => item.featured);

    // Wipe any previously rendered indicators and slides before rebuilding.
    carouselIndicators.innerHTML = '';
    carouselInner.innerHTML = '';

    // Find the outer carousel wrapper so we can show or hide the whole section.
    const carouselWrapper = document.getElementById('featuredCarousel');
    // If nothing is featured, hide the carousel entirely to avoid an empty shell.
    if (featuredItems.length === 0) {
        if (carouselWrapper) carouselWrapper.style.display = 'none';
        return;
    } else {
        // Make sure the carousel is visible when there are featured items.
        if (carouselWrapper) carouselWrapper.style.display = 'block';
    }

    // Build one indicator button and one slide for each featured item.
    featuredItems.forEach((item, index) => {
        // Create indicator
        // Build the dot/button that lets users jump directly to this slide.
        const indicator = document.createElement('button');
        indicator.type = 'button';
        indicator.dataset.bsTarget = '#featuredCarousel';
        indicator.dataset.bsSlideTo = index;
        indicator.ariaLabel = `Slide ${index + 1}`;
        // Mark the first indicator as the currently selected one.
        if (index === 0) {
            indicator.className = 'active';
            indicator.ariaCurrent = 'true';
        }
        carouselIndicators.appendChild(indicator);

        // Create carousel item
        // Build the slide container and mark the first as active so Bootstrap shows it.
        const carouselItem = document.createElement('div');
        carouselItem.className = `carousel-item ${index === 0 ? 'active' : ''}`;

        // Use placeholder image if no image provided or fallback
        // Fall back to a generated placeholder image when the item has no real photo.
        const bgImage = item.image ? item.image : 'https://placehold.co/800x400/3e2723/ffffff?text=' + encodeURIComponent(item.name);

        // Inject the image, name, description, price, and order button into the slide.
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
    // Stop early if the menu container does not exist on this page.
    if (!menuContainer) return;
    // Clear any cards that were rendered during a previous call.
    menuContainer.innerHTML = '';

    // Show a helpful message when no items match the current search or filter.
    if (items.length === 0) {
        menuContainer.innerHTML = '<div class="col-12 text-center py-5"><h4>No items found matching your search.</h4></div>';
        return;
    }

    // Build and append a card for every item in the list.
    items.forEach(item => {
        // Create the responsive column wrapper that controls how many cards appear per row.
        const cardWrapper = document.createElement('div');
        cardWrapper.className = 'col-md-6 col-lg-4 col-xl-3 mb-4';

        // Only generate the featured badge HTML for items that are actually featured.
        const featuredBadge = item.featured ? '<span class="position-absolute top-0 end-0 badge rounded-pill bg-warning text-dark m-2" style="z-index: 1;">Featured</span>' : '';

        // Using Bootstrap Card
        // Build the full card markup including icon, name, price, description, and order button.
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
    // Stop early if either control element is missing from the page.
    if (!searchInput || !sortSelect) return;

    // Read what the user typed and convert it to lower case for case-insensitive matching.
    const searchTerm = searchInput.value.toLowerCase();
    // Find out which sort order the user has chosen from the dropdown.
    const sortBy = sortSelect.value;

    // Keep only the items whose name, description, or category contains the search term.
    let filteredItems = flatMenu.filter(item =>
        item.name.toLowerCase().includes(searchTerm) ||
        item.description.toLowerCase().includes(searchTerm) ||
        item.category.toLowerCase().includes(searchTerm)
    );

    // Apply the chosen sort order to the filtered results.
    if (sortBy === 'price-low') {
        // Sort cheapest items first.
        filteredItems.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
        // Sort most expensive items first.
        filteredItems.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'name-asc') { // Fixed value from 'name' to 'name-asc' based on HTML
        // Sort items alphabetically by name.
        filteredItems.sort((a, b) => a.name.localeCompare(b.name));
    }

    // Redraw the menu grid with the filtered and sorted list.
    renderMenu(filteredItems);
}

// Event listeners
// Re-filter and re-render the menu every time the user types in the search box.
if (searchInput) {
    searchInput.addEventListener('input', filterAndSortMenu);
}
// Re-filter and re-render the menu every time the user changes the sort order.
if (sortSelect) {
    sortSelect.addEventListener('change', filterAndSortMenu);
}

// Initial render
document.addEventListener('DOMContentLoaded', async () => {
    // Fetch the full catalogue from the server and store it for filtering later.
    flatMenu = await fetchMenuData();
    // Populate the featured items carousel at the top of the page.
    renderCarousel(flatMenu);
    // Show all menu items in the grid below the carousel.
    renderMenu(flatMenu); // render full menu initially
});
