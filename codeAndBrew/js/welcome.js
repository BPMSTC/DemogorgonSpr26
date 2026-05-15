/**
 * Code & Brew - Welcome Dashboard
 * Reads user from sessionStorage and handles favorite drinks
 *
 * @format
 */

(function($) {
    "use strict";

    // Constants
    const SESSION_KEY   = "currentUser";
    const FAVORITES_KEY = "favoriteDrinks";

    // ===================================
    // Session Helper
    // ===================================

    /**
     * Get the current user from sessionStorage
     * @returns {Object|null} User object or null if not found
     */
    function getCurrentUser() {
        try {
            // Read the raw stored value for the current user key.
            const raw = sessionStorage.getItem(SESSION_KEY);
            // Parse it if it exists, or return null if no user is logged in.
            return raw ? JSON.parse(raw) : null;
        } catch (err) {
            console.error("Could not read session:", err);
            // Return null so the rest of the page degrades gracefully.
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
            // Read the stored JSON string that holds the user's saved drinks.
            const raw = localStorage.getItem(FAVORITES_KEY);
            // Parse it if data exists, or return an empty list for first-time users.
            return raw ? JSON.parse(raw) : [];
        } catch (err) {
            console.error("Could not read favorites:", err);
            // Return an empty list so the page still works if storage is unavailable.
            return [];
        }
    }

    /**
     * Persist favorites array to localStorage
     * @param {Array} favorites - Array of drink objects to save
     */
    function saveFavorites(favorites) {
        try {
            // Serialize the full list and write it back to persistent storage.
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
        // Load the existing list so we can append to it.
        const favorites = loadFavorites();
        // Build a new drink object with a unique id and the current timestamp.
        const newDrink = {
            // Use the current timestamp as a simple unique identifier.
            id:            Date.now(),
            name:          drink.name,
            size:          drink.size,
            // Default optional fields to an empty string if the user left them blank.
            customization: drink.customization || "",
            notes:         drink.notes || "",
            addedAt:       new Date().toISOString()
        };
        // Add the new drink to the end of the list.
        favorites.push(newDrink);
        // Write the updated list back to storage so it survives page reloads.
        saveFavorites(favorites);
        // Return the new drink so the caller can use it immediately if needed.
        return newDrink;
    }

    /**
     * Update an existing favorite drink by id
     * @param {number} id - Drink id to update
     * @param {Object} updates - Fields to update
     * @returns {boolean} True if found and updated
     */
    function updateFavorite(id, updates) {
        // Load the current list so we can find and modify the target drink.
        const favorites = loadFavorites();
        // Track whether we actually found and changed a drink.
        let found = false;
        // Walk through every drink looking for the one with the matching id.
        for (let i = 0; i < favorites.length; i++) {
            if (favorites[i].id === id) {
                // Overwrite the editable fields with the new values from the form.
                favorites[i].name          = updates.name;
                favorites[i].size          = updates.size;
                favorites[i].customization = updates.customization || "";
                favorites[i].notes         = updates.notes || "";
                found = true;
                // Stop searching once we have found and updated the right drink.
                break;
            }
        }
        // Only bother writing to storage if something actually changed.
        if (found) saveFavorites(favorites);
        // Let the caller know whether the update succeeded.
        return found;
    }

    /**
     * Delete a favorite drink by id
     * @param {number} id - Drink id to delete
     * @returns {boolean} True if found and deleted
     */
    function deleteFavorite(id) {
        // Load the full list so we can rebuild it without the deleted item.
        const favorites = loadFavorites();
        // Build a new list that contains every drink except the one being removed.
        const next = [];
        for (let i = 0; i < favorites.length; i++) {
            if (favorites[i].id !== id) next.push(favorites[i]);
        }
        // If the new list is shorter, we know the drink was found and removed.
        const deleted = next.length < favorites.length;
        // Persist the shortened list only if something was actually removed.
        if (deleted) saveFavorites(next);
        // Tell the caller whether the deletion was successful.
        return deleted;
    }

    /**
     * Find a favorite drink by id
     * @param {number} id - Drink id to find
     * @returns {Object|null} Drink object or null
     */
    function findFavorite(id) {
        // Load the list and scan it for the drink with the matching id.
        const favorites = loadFavorites();
        for (let i = 0; i < favorites.length; i++) {
            // Return the drink as soon as we find it — no need to keep looking.
            if (favorites[i].id === id) return favorites[i];
        }
        // Return null to signal that no matching drink was found.
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
        // Let jQuery do the escaping by setting it as text content and reading back the HTML.
        return $("<div>").text(text).html();
    }

    /**
     * Format an ISO date string to a readable date
     * @param {string} isoString - ISO date string
     * @returns {string} Formatted date e.g. "Jan 1, 2025"
     */
    function formatDate(isoString) {
        // Parse the ISO string into a Date object so we can apply locale formatting.
        const d = new Date(isoString);
        // Return a short, friendly date string in the user's locale.
        return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    }

    /**
     * Show a temporary toast notification
     * @param {string} message - Message to display
     * @param {string} type - "success" or "error"
     */
    function showToast(message, type) {
        // Default to success styling if no type is provided.
        type = type || "success";
        // Choose a background colour and icon that match the message type.
        const bgClass   = type === "success" ? "bg-success" : "bg-danger";
        const iconClass = type === "success" ? "fa-check-circle" : "fa-exclamation-circle";

        // Remove any toast that is already on screen before showing a new one.
        $(".toast-container").remove();

        // Build the Bootstrap toast HTML with the appropriate icon and message.
        const $toast = $(
            '<div class="toast-container position-fixed top-0 end-0 p-3" style="z-index:9999;">' +
            '<div class="toast align-items-center text-white ' + bgClass + ' border-0" role="alert">' +
            '<div class="d-flex">' +
            '<div class="toast-body"><i class="fas ' + iconClass + ' me-2"></i>' + escapeHtml(message) + "</div>" +
            '<button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>' +
            "</div></div></div>"
        );

        // Attach the toast to the body so it floats above all other content.
        $("body").append($toast);
        // Initialise Bootstrap's Toast with a 3-second auto-dismiss delay.
        const toast = new bootstrap.Toast($toast.find(".toast")[0], { delay: 3000 });
        toast.show();
        // Remove the entire container from the DOM once the toast has faded out.
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
        // Only build the customization row if the drink actually has one.
        const customizationRow = drink.customization
            ? '<div class="drink-detail-item">' +
              '<i class="fas fa-sliders-h"></i>' +
              '<div><strong>Customization:</strong><div>' + escapeHtml(drink.customization) + "</div></div>" +
              "</div>"
            : "";

        // Only build the notes row if the drink has notes attached.
        const notesRow = drink.notes
            ? '<div class="drink-detail-item">' +
              '<i class="fas fa-sticky-note"></i>' +
              '<div><strong>Notes:</strong><div>' + escapeHtml(drink.notes) + "</div></div>" +
              "</div>"
            : "";

        // Assemble and return the complete card element with header, details, and action buttons.
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
        // Load the latest list from storage so we always show current data.
        const favorites  = loadFavorites();
        const $container = $("#favoritesContainer");
        const $empty     = $("#emptyState");

        // Remove any cards left over from the previous render.
        $container.find(".drink-card").remove();

        // Show the empty-state prompt if the user has no favorites saved yet.
        if (favorites.length === 0) {
            $empty.show();
        } else {
            // Hide the empty state and draw a card for every saved drink.
            $empty.hide();
            for (let i = 0; i < favorites.length; i++) {
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
        // Stop any default form behaviour from triggering.
        e.preventDefault();
        // Read the values the user entered in the add-drink modal form.
        const name          = $("#drinkName").val().trim();
        const size          = $("#drinkSize").val();
        const customization = $("#drinkCustomization").val().trim();
        const notes         = $("#drinkNotes").val().trim();

        // Name and size are required — show an error and stop if either is missing.
        if (!name || !size) {
            showToast("Please fill in Drink Name and Size.", "error");
            return;
        }

        // Save the new drink and close the modal.
        addFavorite({ name: name, size: size, customization: customization, notes: notes });
        bootstrap.Modal.getInstance($("#addDrinkModal")[0]).hide();
        // Confirm the save with a brief success toast.
        showToast('"' + name + '" added to your favorites!');
        // Redraw the favorites grid to include the newly added drink.
        renderFavorites();
    }

    /**
     * Handle Edit button click — populate and open the edit modal
     * @param {Event} e - Click event
     */
    function handleEditClick(e) {
        // Stop any default behaviour associated with the button.
        e.preventDefault();
        // Read the drink id that was embedded in the clicked button's data attribute.
        const id    = parseInt($(this).data("id"), 10);
        // Look up the full drink object so we can pre-fill the form.
        const drink = findFavorite(id);
        // Stop if the drink no longer exists in storage.
        if (!drink) return;

        // Fill every modal field with the drink's current values.
        $("#editDrinkId").val(drink.id);
        $("#editDrinkName").val(drink.name);
        $("#editDrinkSize").val(drink.size);
        $("#editDrinkCustomization").val(drink.customization);
        $("#editDrinkNotes").val(drink.notes);

        // Open the edit modal so the user can make changes.
        new bootstrap.Modal($("#editDrinkModal")[0]).show();
    }

    /**
     * Handle Update button in the Edit modal
     * @param {Event} e - Click event
     */
    function handleUpdateDrink(e) {
        // Stop any default behaviour so we can handle the save ourselves.
        e.preventDefault();
        // Retrieve the id of the drink being edited from the hidden field.
        const id   = parseInt($("#editDrinkId").val(), 10);
        // Read the updated name and size from the form.
        const name = $("#editDrinkName").val().trim();
        const size = $("#editDrinkSize").val();

        // Name and size are required — alert the user and stop if either is blank.
        if (!name || !size) {
            showToast("Please fill in Drink Name and Size.", "error");
            return;
        }

        // Apply the changes to the stored drink record.
        updateFavorite(id, {
            name:          name,
            size:          size,
            customization: $("#editDrinkCustomization").val().trim(),
            notes:         $("#editDrinkNotes").val().trim()
        });

        // Close the modal now that the update is complete.
        bootstrap.Modal.getInstance($("#editDrinkModal")[0]).hide();
        // Let the user know their changes were saved.
        showToast('"' + name + '" updated successfully!');
        // Refresh the grid so the updated details are immediately visible.
        renderFavorites();
    }

    /**
     * Handle Remove button — confirm then delete
     * @param {Event} e - Click event
     */
    function handleDeleteClick(e) {
        // Stop any default behaviour on the button.
        e.preventDefault();
        // Read which drink the user wants to remove.
        const id    = parseInt($(this).data("id"), 10);
        const drink = findFavorite(id);
        // Stop if the drink is not found — it may have already been deleted.
        if (!drink) return;

        // Ask the user to confirm before permanently removing the drink.
        if (!confirm('Remove "' + drink.name + '" from your favorites?')) return;

        // Delete the drink from storage and show a brief confirmation.
        deleteFavorite(id);
        showToast('"' + drink.name + '" removed from favorites.');
        // Redraw the grid so the removed card disappears immediately.
        renderFavorites();
    }

    /**
     * Handle Order Again button
     * @param {Event} e - Click event
     */
    function handleOrderClick(e) {
        // Stop any default behaviour on the button.
        e.preventDefault();
        // Find the drink the user wants to reorder.
        const id    = parseInt($(this).data("id"), 10);
        const drink = findFavorite(id);
        // Show a coming-soon message since the ordering feature is not yet built.
        if (drink) showToast('Re-order for "' + drink.name + '" is coming soon.');
    }

    /**
     * Handle Logout — clear session and return to home page
     * @param {Event} e - Click event
     */
    function handleLogout(e) {
        // Prevent the link from navigating before we have cleaned up.
        e.preventDefault();
        // Ask the user to confirm before ending their session.
        if (confirm("Are you sure you want to log out?")) {
            // Remove the stored user data so they are treated as a guest on the next visit.
            sessionStorage.removeItem(SESSION_KEY);
            // Send them back to the main landing page.
            window.location.href = "../index.html";
        }
    }

    /**
     * Clear and reset the Add Drink form
     */
    function clearAddForm() {
        // Use the native reset method to clear all fields in the add-drink form at once.
        $("#addDrinkForm")[0].reset();
    }

    /**
     * Clear and reset the Edit Drink form
     */
    function clearEditForm() {
        // Use the native reset method to clear all fields in the edit-drink form at once.
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
        const user = getCurrentUser();

        // Show the logged-in username in the welcome heading if one is available.
        if (user && user.username) {
            $("#welcomeUsername").text(user.username);
        }

        // Favorite drink events (delegated so they work after re-render)
        // Use event delegation so these handlers still work on newly rendered cards.
        $(document).on("click", ".btn-edit",   handleEditClick);
        $(document).on("click", ".btn-delete", handleDeleteClick);
        $(document).on("click", ".btn-order",  handleOrderClick);

        // Modal buttons — wire up the save and update actions inside each modal.
        $("#saveDrinkBtn").on("click",   handleAddDrink);
        $("#updateDrinkBtn").on("click", handleUpdateDrink);

        // Clear forms when modals close so stale data does not pre-fill the next open.
        $("#addDrinkModal").on("hidden.bs.modal",  clearAddForm);
        $("#editDrinkModal").on("hidden.bs.modal", clearEditForm);

        // Logout (only bind if the button exists on this page)
        const $logoutBtn = $("#logoutBtn");
        if ($logoutBtn.length) {
            $logoutBtn.on("click", handleLogout);
        }

        // Initial render — draw the favorites grid as soon as the page is ready.
        renderFavorites();
    }

    // Wait for DOM ready
    $(document).ready(function() {
        init();
    });

})(jQuery);
