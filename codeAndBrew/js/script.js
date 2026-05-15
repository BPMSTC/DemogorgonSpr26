/**
 * Code & Brew - DEM-24: Store Hours & Location
 * Handles dynamic "Open Now" / "Closed" badge based on current time
 * WCAG Compliant with ARIA live regions
 *
 * @format
 */

(function () {
	"use strict";

	// Debug flag - set to true to enable console logging
	const DEBUG = false;

	/**
	 * Store Hours Schedule
	 * @type {Record<number, {open: number, close: number, label: string}>}
	 */
	const STORE_SCHEDULE = {
		// Day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
		0: { open: 9, close: 18, label: "Sunday" }, // 9 AM - 6 PM
		1: { open: 7, close: 19, label: "Monday" }, // 7 AM - 7 PM
		2: { open: 7, close: 19, label: "Tuesday" }, // 7 AM - 7 PM
		3: { open: 7, close: 19, label: "Wednesday" }, // 7 AM - 7 PM
		4: { open: 7, close: 19, label: "Thursday" }, // 7 AM - 7 PM
		5: { open: 7, close: 19, label: "Friday" }, // 7 AM - 7 PM
		6: { open: 8, close: 20, label: "Saturday" }, // 8 AM - 8 PM
	};

	/**
	 * Get current store time in America/Chicago timezone
	 * @returns {{ day: number, hour: number, minute: number }}
	 */
	function getCurrentStoreTime() {
		// Set up a formatter that will give us parts for the Chicago timezone specifically.
		const formatter = new Intl.DateTimeFormat("en-US", {
			timeZone: "America/Chicago",
			weekday: "short",
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
		});

		// Break the current moment into labelled parts we can inspect individually.
		const parts = formatter.formatToParts(new Date());
		// Prepare placeholders for the values we need to extract.
		let weekdayShort = "";
		let hourStr = "";
		let minuteStr = "";

		// Pull out just the weekday, hour, and minute from all the formatted parts.
		for (const part of parts) {
			if (part.type === "weekday") {
				weekdayShort = part.value;
			} else if (part.type === "hour") {
				hourStr = part.value;
			} else if (part.type === "minute") {
				minuteStr = part.value;
			}
		}

		// Map the short weekday name to the numeric day index used in STORE_SCHEDULE.
		const weekdayMap = {
			Sun: 0,
			Mon: 1,
			Tue: 2,
			Wed: 3,
			Thu: 4,
			Fri: 5,
			Sat: 6,
		};

		// Convert the extracted strings into numbers the rest of the code can compare.
		const day = weekdayMap[weekdayShort];
		const hour = parseInt(hourStr, 10);
		const minute = parseInt(minuteStr, 10);

		// Return the day, hour, and minute as a plain object.
		return { day, hour, minute };
	}

	/**
	 * Check if store is currently open
	 * @returns {Object} - { isOpen: boolean, message: string }
	 */
	function checkStoreStatus() {
		// Get today's day number and the current hour and minute in store local time.
		const { day: currentDay, hour: currentHour, minute: currentMinute } =
			getCurrentStoreTime();
		// Express the time as a single decimal so it is easy to compare against schedule hours.
		const currentTimeDecimal = currentHour + currentMinute / 60;

		// Look up today's opening and closing hours from the schedule.
		const todaySchedule = STORE_SCHEDULE[currentDay];
		// The store is open when the current time falls within today's window.
		const isOpen =
			currentTimeDecimal >= todaySchedule.open &&
			currentTimeDecimal < todaySchedule.close;

		// Create descriptive message for screen readers
		let message = "";
		if (isOpen) {
			// Convert the closing hour from 24-hour to 12-hour format.
			const closingHour =
				todaySchedule.close > 12
					? todaySchedule.close - 12
					: todaySchedule.close;
			const closingPeriod = todaySchedule.close >= 12 ? "PM" : "AM";
			// Tell the user when the store will close today.
			message = `Open Now - Closes at ${closingHour}:00 ${closingPeriod}`;
		} else {
			// Find next opening time
			const nextDay = (currentDay + 1) % 7;

			// Check if opens later today
			if (currentTimeDecimal < todaySchedule.open) {
				// The store has not opened yet — show the opening time for today.
				const openingHour =
					todaySchedule.open > 12
						? todaySchedule.open - 12
						: todaySchedule.open;
				const openingPeriod = todaySchedule.open >= 12 ? "PM" : "AM";
				message = `Closed - Opens today at ${openingHour}:00 ${openingPeriod}`;
			} else {
				// The store has already closed — show when it opens tomorrow.
				const nextSchedule = STORE_SCHEDULE[nextDay];
				const openingHour =
					nextSchedule.open > 12 ? nextSchedule.open - 12 : nextSchedule.open;
				const openingPeriod = nextSchedule.open >= 12 ? "PM" : "AM";
				message = `Closed - Opens ${nextSchedule.label} at ${openingHour}:00 ${openingPeriod}`;
			}
		}

		// Return both the boolean result and the human-readable message together.
		return { isOpen, message };
	}

	/**
	 * Update the status badge in the footer
	 * WCAG: Uses aria-live region for screen reader announcements
	 */
	function updateStatusBadge() {
		// Find the badge element that shows the open/closed state.
		const statusBadge = document.getElementById("openStatus");
		// Stop gracefully if the badge is not present on this page.
		if (!statusBadge) {
			console.warn("Status badge element not found");
			return;
		}

		// Work out whether the store is currently open and get the message to show.
		const status = checkStoreStatus();
		const statusText = statusBadge.querySelector(".status-text");

		// Update visual status
		if (status.isOpen) {
			// Switch to the green open style and update the accessible label.
			statusBadge.classList.remove("closed");
			statusBadge.classList.add("open");
			statusBadge.setAttribute("aria-label", status.message);
		} else {
			// Switch to the red closed style and update the accessible label.
			statusBadge.classList.remove("open");
			statusBadge.classList.add("closed");
			statusBadge.setAttribute("aria-label", status.message);
		}

		// Update text content (announced by aria-live region)
		// Update the visible text so screen readers pick up the change.
		if (statusText) {
			statusText.textContent = status.message;
		}

		// Log for debugging (only when DEBUG is enabled)
		if (DEBUG) {
			console.log(`[${new Date().toLocaleTimeString()}] Store Status:`, status);
		}
	}

	/**
	 * Toggle the mobile navigation menu open or closed
	 * Updates ARIA attributes, CSS classes, overlay visibility, and body scroll
	 * @param {boolean} forceClose - If true, always close the menu
	 */
	function toggleMobileMenu(forceClose) {
		// Locate the three elements that make up the mobile nav experience.
		const hamburger = document.querySelector(".hamburger");
		const navMenu = document.querySelector(".nav-menu");
		const navOverlay = document.getElementById("navOverlay");

		// Stop early if the essential nav elements are not on this page.
		if (!hamburger || !navMenu) {
			return;
		}

		// Read the current state to decide whether to open or close.
		const isCurrentlyOpen =
			hamburger.getAttribute("aria-expanded") === "true";
		// If forceClose is true we always close; otherwise we flip the current state.
		const shouldOpen = forceClose ? false : !isCurrentlyOpen;

		// Update the hamburger button and menu to reflect the new state.
		hamburger.setAttribute("aria-expanded", String(shouldOpen));
		hamburger.classList.toggle("active", shouldOpen);
		navMenu.classList.toggle("active", shouldOpen);

		// Show or hide the semi-transparent overlay behind the menu.
		if (navOverlay) {
			navOverlay.classList.toggle("active", shouldOpen);
			// Tell screen readers whether the overlay is currently interactive.
			navOverlay.setAttribute("aria-hidden", String(!shouldOpen));
		}

		// Prevent body scroll when menu is open
		// Lock page scrolling while the nav panel is open so it feels like a drawer.
		document.body.style.overflow = shouldOpen ? "hidden" : "";

		if (DEBUG) {
			console.log("[Nav] Menu " + (shouldOpen ? "opened" : "closed"));
		}
	}

	/**
	 * Close the mobile menu (convenience wrapper)
	 */
	function closeMobileMenu() {
		// Delegate to toggleMobileMenu with forceClose set to always close.
		toggleMobileMenu(true);
	}

	/**
	 * Initialize store hours functionality
	 */
	function init() {
		// Update status immediately on page load
		updateStatusBadge();

		// Update status every 60 seconds so the badge stays accurate without a page reload.
		setInterval(updateStatusBadge, 60000);

		// Initialize mobile navigation toggle (hamburger menu)
		// Locate the nav controls before attaching any event listeners.
		const hamburger = document.querySelector(".hamburger");
		const navMenu = document.querySelector(".nav-menu");
		const navOverlay = document.getElementById("navOverlay");

		if (hamburger && navMenu) {
			// Store event handlers to prevent duplicate listeners
			// Define the Escape key handler so it can be referenced consistently.
			var handleEscapeKey = function (event) {
				if (event.key === "Escape") {
					var isOpen =
						hamburger.getAttribute("aria-expanded") === "true";
					// Only close the menu if it is actually open.
					if (isOpen) {
						closeMobileMenu();
						// Return focus to the hamburger button so keyboard users are not stranded.
						hamburger.focus();
					}
				}
			};

			// Define a debounced resize handler so we avoid closing the menu on every pixel change.
			var resizeTimer;
			var handleResize = function () {
				// Debounce resize events and only close if menu is open
				// Cancel any in-flight timer before starting a new one.
				clearTimeout(resizeTimer);
				resizeTimer = setTimeout(function () {
					// If the viewport is now wide enough for the desktop nav, close the mobile menu.
					if (
						window.innerWidth >= 769 &&
						hamburger.getAttribute("aria-expanded") === "true"
					) {
						closeMobileMenu();
					}
				}, 150);
			};

			// Toggle menu on hamburger click (includes X close)
			hamburger.addEventListener("click", function () {
				toggleMobileMenu(false);
			});

			// Close menu when a nav link is clicked
			// Let users navigate by clicking a link without having to manually close the menu.
			const navLinks = navMenu.querySelectorAll(".nav-link");
			for (let i = 0; i < navLinks.length; i++) {
				navLinks[i].addEventListener("click", closeMobileMenu);
			}

			// Close menu on overlay click (outside menu area) with focus management
			// Clicking outside the panel should dismiss it and return focus to the trigger.
			if (navOverlay) {
				navOverlay.addEventListener("click", function () {
					closeMobileMenu();
					hamburger.focus();
				});
			}

			// Close menu on Escape key press
			// Allow keyboard users to dismiss the menu without reaching for the close button.
			document.addEventListener("keydown", function (event) {
				if (event.key === "Escape" || event.key === "Esc") {
					const isOpen =
						hamburger.getAttribute("aria-expanded") === "true";
					// Only act if the menu is open so we do not interfere with other Escape uses.
					if (isOpen) {
						closeMobileMenu();
						// Move focus back to the hamburger so the user knows where they are.
						hamburger.focus();
					}
				}
			});
		}

		if (DEBUG) {
			console.log("DEM-24: Store Hours & Location initialized");
		}
	}

	// Wait for DOM to be ready
	if (document.readyState === "loading") {
		// The DOM is not ready yet — wait for it before running init.
		document.addEventListener("DOMContentLoaded", init);
	} else {
		// The DOM is already available, so we can run init right now.
		init();
	}
})();
