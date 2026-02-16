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
		const formatter = new Intl.DateTimeFormat("en-US", {
			timeZone: "America/Chicago",
			weekday: "short",
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
		});

		const parts = formatter.formatToParts(new Date());
		let weekdayShort = "";
		let hourStr = "";
		let minuteStr = "";

		for (const part of parts) {
			if (part.type === "weekday") {
				weekdayShort = part.value;
			} else if (part.type === "hour") {
				hourStr = part.value;
			} else if (part.type === "minute") {
				minuteStr = part.value;
			}
		}

		const weekdayMap = {
			Sun: 0,
			Mon: 1,
			Tue: 2,
			Wed: 3,
			Thu: 4,
			Fri: 5,
			Sat: 6,
		};

		const day = weekdayMap[weekdayShort];
		const hour = parseInt(hourStr, 10);
		const minute = parseInt(minuteStr, 10);

		return { day, hour, minute };
	}

	/**
	 * Check if store is currently open
	 * @returns {Object} - { isOpen: boolean, message: string }
	 */
	function checkStoreStatus() {
		const { day: currentDay, hour: currentHour, minute: currentMinute } =
			getCurrentStoreTime();
		const currentTimeDecimal = currentHour + currentMinute / 60;

		const todaySchedule = STORE_SCHEDULE[currentDay];
		const isOpen =
			currentTimeDecimal >= todaySchedule.open &&
			currentTimeDecimal < todaySchedule.close;

		// Create descriptive message for screen readers
		let message = "";
		if (isOpen) {
			const closingHour =
				todaySchedule.close > 12
					? todaySchedule.close - 12
					: todaySchedule.close;
			const closingPeriod = todaySchedule.close >= 12 ? "PM" : "AM";
			message = `Open Now - Closes at ${closingHour}:00 ${closingPeriod}`;
		} else {
			// Find next opening time
			const nextDay = (currentDay + 1) % 7;

			// Check if opens later today
			if (currentTimeDecimal < todaySchedule.open) {
				const openingHour =
					todaySchedule.open > 12
						? todaySchedule.open - 12
						: todaySchedule.open;
				const openingPeriod = todaySchedule.open >= 12 ? "PM" : "AM";
				message = `Closed - Opens today at ${openingHour}:00 ${openingPeriod}`;
			} else {
				const nextSchedule = STORE_SCHEDULE[nextDay];
				const openingHour =
					nextSchedule.open > 12 ? nextSchedule.open - 12 : nextSchedule.open;
				const openingPeriod = nextSchedule.open >= 12 ? "PM" : "AM";
				message = `Closed - Opens ${nextSchedule.label} at ${openingHour}:00 ${openingPeriod}`;
			}
		}

		return { isOpen, message };
	}

	/**
	 * Update the status badge in the footer
	 * WCAG: Uses aria-live region for screen reader announcements
	 */
	function updateStatusBadge() {
		const statusBadge = document.getElementById("openStatus");
		if (!statusBadge) {
			console.warn("Status badge element not found");
			return;
		}

		const status = checkStoreStatus();
		const statusText = statusBadge.querySelector(".status-text");

		// Update visual status
		if (status.isOpen) {
			statusBadge.classList.remove("closed");
			statusBadge.classList.add("open");
			statusBadge.setAttribute("aria-label", status.message);
		} else {
			statusBadge.classList.remove("open");
			statusBadge.classList.add("closed");
			statusBadge.setAttribute("aria-label", status.message);
		}

		// Update text content (announced by aria-live region)
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
	 * Updates ARIA attributes, CSS classes, and overlay visibility
	 * @param {boolean} forceClose - If true, always close the menu
	 */
	function toggleMobileMenu(forceClose) {
		var hamburger = document.querySelector(".hamburger");
		var navMenu = document.querySelector(".nav-menu");
		var navOverlay = document.getElementById("navOverlay");

		if (!hamburger || !navMenu) {
			return;
		}

		var isCurrentlyOpen =
			hamburger.getAttribute("aria-expanded") === "true";
		var shouldOpen = forceClose ? false : !isCurrentlyOpen;

		hamburger.setAttribute("aria-expanded", String(shouldOpen));
		hamburger.classList.toggle("active", shouldOpen);
		navMenu.classList.toggle("active", shouldOpen);

		if (navOverlay) {
			navOverlay.classList.toggle("active", shouldOpen);
			navOverlay.setAttribute("aria-hidden", String(!shouldOpen));
		}

		if (DEBUG) {
			console.log("[Nav] Menu " + (shouldOpen ? "opened" : "closed"));
		}
	}

	/**
	 * Close the mobile menu (convenience wrapper)
	 */
	function closeMobileMenu() {
		toggleMobileMenu(true);
	}

	/**
	 * Initialize store hours functionality
	 */
	function init() {
		// Update status immediately on page load
		updateStatusBadge();

		// Update status every 60 seconds
		setInterval(updateStatusBadge, 60000);

		// Initialize mobile navigation toggle (hamburger menu)
		var hamburger = document.querySelector(".hamburger");
		var navMenu = document.querySelector(".nav-menu");
		var navOverlay = document.getElementById("navOverlay");

		if (hamburger && navMenu) {
			// Toggle menu on hamburger click (includes X close)
			hamburger.addEventListener("click", function () {
				toggleMobileMenu(false);
			});

			// Close menu when a nav link is clicked
			var navLinks = navMenu.querySelectorAll(".nav-link");
			for (var i = 0; i < navLinks.length; i++) {
				navLinks[i].addEventListener("click", closeMobileMenu);
			}

			// Close menu on overlay click (outside menu area)
			if (navOverlay) {
				navOverlay.addEventListener("click", closeMobileMenu);
			}

			// Close menu on Escape key press
			document.addEventListener("keydown", function (event) {
				if (event.key === "Escape" || event.key === "Esc") {
					var isOpen =
						hamburger.getAttribute("aria-expanded") === "true";
					if (isOpen) {
						closeMobileMenu();
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
		document.addEventListener("DOMContentLoaded", init);
	} else {
		init();
	}
})();
