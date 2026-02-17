/**
 * Code & Brew - Welcome Dashboard
 * Reads user from sessionStorage and handles favorite drinks
 *
 * @format
 */

(function($) {
    "use strict";

    // Constants
    var SESSION_KEY   = "currentUser";
    var FAVORITES_KEY = "favoriteDrinks";

    // ===================================
    // Session Helper
    // ===================================

    /**
     * Get the current user from sessionStorage
     * @returns {Object|null} User object or null if not found
     */
    function getCurrentUser() {
        try {
            var raw = sessionStorage.getItem(SESSION_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (err) {
            console.error("Could not read session:", err);
            return null;
        }
    }

    // ===================================
    // Favorites Storage (localStorage)
    // ===================================

    /**
     * Load all favorites from localStorage
     * @returns {Array} Array of drink objects
     */
    function loadFavorites() {
        try {
            var raw = localStorage.getItem(FAVORITES_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (err) {
            console.error("Could not read favorites:", err);
            return [];
        }
    }

    /**
     * Persist favorites array to localStorage
     * @param {Array} favorites - Array of drink objects to save
     */
    function saveFavorites(favorites) {
        try {
            localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
        } catch (err) {
            console.error("Could not save favorites:", err);
        }
    }

    /**
     * Add a new favorite drink
     * @param {Object} drink - Drink data { name, size, customization, notes }
     * @returns {Object} The saved drink with generated id and timestamp
     */
    function addFavorite(drink) {
        var favorites = loadFavorites();
        var newDrink = {
            id:            Date.now(),
            name:          drink.name,
            size:          drink.size,
            customization: drink.customization || "",
            notes:         drink.notes || "",
            addedAt:       new Date().toISOString()
        };
        favorites.push(newDrink);
        saveFavorites(favorites);
        return newDrink;
    }

    /**
     * Update an existing favorite drink by id
     * @param {number} id - Drink id to update
     * @param {Object} updates - Fields to update
     * @returns {boolean} True if found and updated
     */
    function updateFavorite(id, updates) {
        var favorites = loadFavorites();
        var found = false;
        for (var i = 0; i < favorites.length; i++) {
            if (favorites[i].id === id) {
                favorites[i].name          = updates.name;
                favorites[i].size          = updates.size;
                favorites[i].customization = updates.customization || "";
                favorites[i].notes         = updates.notes || "";
                found = true;
                break;
            }
        }
        if (found) saveFavorites(favorites);
        return found;
    }

    /**
     * Delete a favorite drink by id
     * @param {number} id - Drink id to delete
     * @returns {boolean} True if found and deleted
     */
    function deleteFavorite(id) {
        var favorites = loadFavorites();
        var next = [];
        for (var i = 0; i < favorites.length; i++) {
            if (favorites[i].id !== id) next.push(favorites[i]);
        }
        var deleted = next.length < favorites.length;
        if (deleted) saveFavorites(next);
        return deleted;
    }

    /**
     * Find a favorite drink by id
     * @param {number} id - Drink id to find
     * @returns {Object|null} Drink object or null
     */
    function findFavorite(id) {
        var favorites = loadFavorites();
        for (var i = 0; i < favorites.length; i++) {
            if (favorites[i].id === id) return favorites[i];
        }
        return null;
    }

    // ===================================
    // UI Helpers
    // ===================================

    /**
     * Escape HTML to prevent XSS when inserting user data
     * @param {string} text - Raw text
     * @returns {string} HTML-escaped text
     */
    function escapeHtml(text) {
        return $("<div>").text(text).html();
    }

    /**
     * Format an ISO date string to a readable date
     * @param {string} isoString - ISO date string
     * @returns {string} Formatted date e.g. "Jan 1, 2025"
     */
    function formatDate(isoString) {
        var d = new Date(isoString);
        return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    }

    /**
     * Show a temporary toast notification
     * @param {string} message - Message to display
     * @param {string} type - "success" or "error"
     */
    function showToast(message, type) {
        type = type || "success";
        var bgClass   = type === "success" ? "bg-success" : "bg-danger";
        var iconClass = type === "success" ? "fa-check-circle" : "fa-exclamation-circle";

        $(".toast-container").remove();

        var $toast = $(
            '<div class="toast-container position-fixed top-0 end-0 p-3" style="z-index:9999;">' +
            '<div class="toast align-items-center text-white ' + bgClass + ' border-0" role="alert">' +
            '<div class="d-flex">' +
            '<div class="toast-body"><i class="fas ' + iconClass + ' me-2"></i>' + escapeHtml(message) + "</div>" +
            '<button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>' +
            "</div></div></div>"
        );

        $("body").append($toast);
        var toast = new bootstrap.Toast($toast.find(".toast")[0], { delay: 3000 });
        toast.show();
        $toast.find(".toast").on("hidden.bs.toast", function() { $toast.remove(); });
    }

    // ===================================
    // Render Favorites
    // ===================================

    /**
     * Build and return a jQuery drink card element
     * @param {Object} drink - Drink data object
     * @returns {jQuery} Drink card element
     */
    function buildDrinkCard(drink) {
        var customizationRow = drink.customization
            ? '<div class="drink-detail-item">' +
              '<i class="fas fa-sliders-h"></i>' +
              '<div><strong>Customization:</strong><div>' + escapeHtml(drink.customization) + "</div></div>" +
              "</div>"
            : "";

        var notesRow = drink.notes
            ? '<div class="drink-detail-item">' +
              '<i class="fas fa-sticky-note"></i>' +
              '<div><strong>Notes:</strong><div>' + escapeHtml(drink.notes) + "</div></div>" +
              "</div>"
            : "";

        return $(
            '<div class="drink-card fade-in" data-id="' + drink.id + '">' +
            '<div class="drink-header">' +
            "<div>" +
            '<h3 class="drink-name">' + escapeHtml(drink.name) + "</h3>" +
            '<span class="drink-size">' + escapeHtml(drink.size) + "</span>" +
            "</div>" +
            '<div class="drink-icon"><i class="fas fa-mug-hot"></i></div>' +
            "</div>" +
            '<div class="drink-details">' +
            customizationRow +
            notesRow +
            '<div class="drink-detail-item">' +
            '<i class="fas fa-calendar-plus"></i>' +
            "<div><strong>Added:</strong><div>" + formatDate(drink.addedAt) + "</div></div>" +
            "</div>" +
            "</div>" +
            '<div class="drink-actions">' +
            '<button class="btn btn-primary btn-order" data-id="' + drink.id + '">' +
            '<i class="fas fa-shopping-cart"></i> Order Again</button>' +
            '<button class="btn btn-outline-secondary btn-edit" data-id="' + drink.id + '">' +
            '<i class="fas fa-edit"></i> Edit</button>' +
            '<button class="btn btn-outline-secondary btn-delete" data-id="' + drink.id + '">' +
            '<i class="fas fa-trash"></i> Remove</button>' +
            "</div>" +
            "</div>"
        );
    }

    /**
     * Render all favorite drinks into the grid
     */
    function renderFavorites() {
        var favorites  = loadFavorites();
        var $container = $("#favoritesContainer");
        var $empty     = $("#emptyState");

        $container.find(".drink-card").remove();

        if (favorites.length === 0) {
            $empty.show();
        } else {
            $empty.hide();
            for (var i = 0; i < favorites.length; i++) {
                $container.append(buildDrinkCard(favorites[i]));
            }
        }
    }

    // ===================================
    // Event Handlers
    // ===================================

    /**
     * Handle Save Favorite button in the Add modal
     * @param {Event} e - Click event
     */
    function handleAddDrink(e) {
        e.preventDefault();
        var name          = $("#drinkName").val().trim();
        var size          = $("#drinkSize").val();
        var customization = $("#drinkCustomization").val().trim();
        var notes         = $("#drinkNotes").val().trim();

        if (!name || !size) {
            showToast("Please fill in Drink Name and Size.", "error");
            return;
        }

        addFavorite({ name: name, size: size, customization: customization, notes: notes });
        bootstrap.Modal.getInstance($("#addDrinkModal")[0]).hide();
        showToast('"' + name + '" added to your favorites!');
        renderFavorites();
    }

    /**
     * Handle Edit button click — populate and open the edit modal
     * @param {Event} e - Click event
     */
    function handleEditClick(e) {
        e.preventDefault();
        var id    = parseInt($(this).data("id"), 10);
        var drink = findFavorite(id);
        if (!drink) return;

        $("#editDrinkId").val(drink.id);
        $("#editDrinkName").val(drink.name);
        $("#editDrinkSize").val(drink.size);
        $("#editDrinkCustomization").val(drink.customization);
        $("#editDrinkNotes").val(drink.notes);

        new bootstrap.Modal($("#editDrinkModal")[0]).show();
    }

    /**
     * Handle Update button in the Edit modal
     * @param {Event} e - Click event
     */
    function handleUpdateDrink(e) {
        e.preventDefault();
        var id   = parseInt($("#editDrinkId").val(), 10);
        var name = $("#editDrinkName").val().trim();
        var size = $("#editDrinkSize").val();

        if (!name || !size) {
            showToast("Please fill in Drink Name and Size.", "error");
            return;
        }

        updateFavorite(id, {
            name:          name,
            size:          size,
            customization: $("#editDrinkCustomization").val().trim(),
            notes:         $("#editDrinkNotes").val().trim()
        });

        bootstrap.Modal.getInstance($("#editDrinkModal")[0]).hide();
        showToast('"' + name + '" updated successfully!');
        renderFavorites();
    }

    /**
     * Handle Remove button — confirm then delete
     * @param {Event} e - Click event
     */
    function handleDeleteClick(e) {
        e.preventDefault();
        var id    = parseInt($(this).data("id"), 10);
        var drink = findFavorite(id);
        if (!drink) return;

        if (!confirm('Remove "' + drink.name + '" from your favorites?')) return;

        deleteFavorite(id);
        showToast('"' + drink.name + '" removed from favorites.');
        renderFavorites();
    }

    /**
     * Handle Order Again button
     * @param {Event} e - Click event
     */
    function handleOrderClick(e) {
        e.preventDefault();
        var id    = parseInt($(this).data("id"), 10);
        var drink = findFavorite(id);
        if (drink) showToast('Re-order for "' + drink.name + '" is coming soon.');
    }

    /**
     * Handle Logout — clear session and return to home page
     * @param {Event} e - Click event
     */
    function handleLogout(e) {
        e.preventDefault();
        if (confirm("Are you sure you want to log out?")) {
            sessionStorage.removeItem(SESSION_KEY);
            window.location.href = "../index.html";
        }
    }

    /**
     * Clear and reset the Add Drink form
     */
    function clearAddForm() {
        $("#addDrinkForm")[0].reset();
    }

    /**
     * Clear and reset the Edit Drink form
     */
    function clearEditForm() {
        $("#editDrinkForm")[0].reset();
    }

    // ===================================
    // Initialisation
    // ===================================

    /**
     * Initialise the welcome page
     */
    function init() {
        // Read user from session (set by account.js on successful registration)
        var user = getCurrentUser();

        if (user && user.username) {
            $("#welcomeUsername").text(user.username);
        }

        // Favorite drink events (delegated so they work after re-render)
        $(document).on("click", ".btn-edit",   handleEditClick);
        $(document).on("click", ".btn-delete", handleDeleteClick);
        $(document).on("click", ".btn-order",  handleOrderClick);

        // Modal buttons
        $("#saveDrinkBtn").on("click",   handleAddDrink);
        $("#updateDrinkBtn").on("click", handleUpdateDrink);

        // Clear forms when modals close
        $("#addDrinkModal").on("hidden.bs.modal",  clearAddForm);
        $("#editDrinkModal").on("hidden.bs.modal", clearEditForm);

        // Logout (only bind if the button exists on this page)
        var $logoutBtn = $("#logoutBtn");
        if ($logoutBtn.length) {
            $logoutBtn.on("click", handleLogout);
        }

        // Initial render
        renderFavorites();
    }

    // Wait for DOM ready
    $(document).ready(function() {
        init();
    });

})(jQuery);
