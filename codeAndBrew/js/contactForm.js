/**
 * Code & Brew - DEM-27: Contact Form
 * Handles form validation, submission, and localStorage persistence
 * Uses jQuery for DOM interactions per team coding standards
 *
 * @format
 */

(function ($) {
	"use strict";

	// Storage key for localStorage submissions
	const STORAGE_KEY = "codeBrewInquiries";

	// Minimum character lengths for validation
	const MIN_NAME_LENGTH = 2;
	const MIN_MESSAGE_LENGTH = 10;

	// Email validation pattern (simplified email validation regex)
	const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

	/**
	 * Validate a single form field and display error message
	 * @param {jQuery} $field - The input/textarea jQuery element
	 * @param {jQuery} $errorSpan - The error message span jQuery element
	 * @returns {boolean} - True if the field is valid
	 */
	function validateField($field, $errorSpan) {
		// Strip whitespace and read which field we are dealing with.
		const value = $.trim($field.val());
		const fieldName = $field.attr("name");
		// Start with no error — we only populate this if something is wrong.
		let errorMessage = "";

		// Check the name field against its specific rules.
		if (fieldName === "name") {
			// Reject an empty name field.
			if (value.length === 0) {
				errorMessage = "Full name is required.";
			// Reject a name that is too short to be meaningful.
			} else if (value.length < MIN_NAME_LENGTH) {
				errorMessage =
					"Name must be at least " + MIN_NAME_LENGTH + " characters.";
			}
		// Check the email field against its specific rules.
		} else if (fieldName === "email") {
			// Reject an empty email field.
			if (value.length === 0) {
				errorMessage = "Email address is required.";
			// Reject anything that does not look like a real email address.
			} else if (!EMAIL_PATTERN.test(value)) {
				errorMessage = "Please enter a valid email address.";
			}
		// Check the message field against its specific rules.
		} else if (fieldName === "message") {
			// Reject an empty message field.
			if (value.length === 0) {
				errorMessage = "Message is required.";
			// Reject a message that is too short to be useful.
			} else if (value.length < MIN_MESSAGE_LENGTH) {
				errorMessage =
					"Message must be at least " +
					MIN_MESSAGE_LENGTH +
					" characters.";
			}
		}

		// Update UI based on validation result
		if (errorMessage) {
			// Highlight the field in red and show the reason it failed.
			$field.removeClass("valid").addClass("invalid");
			$errorSpan.text(errorMessage);
			return false;
		} else {
			// Highlight the field in green and clear any previous error text.
			$field.removeClass("invalid").addClass("valid");
			$errorSpan.text("");
			return true;
		}
	}

	/**
	 * Validate all required fields in the contact form
	 * @param {jQuery} $form - The form jQuery element
	 * @returns {boolean} - True if all fields are valid
	 */
	function validateForm($form) {
		// Assume the form is valid until a field fails.
		let isValid = true;

		// Validate each required field and combine the results with AND logic.
		// Running all three even on failure ensures every field shows its own error.
		isValid =
			validateField(
				$form.find("#name"),
				$form.find("#nameError")
			) && isValid;

		isValid =
			validateField(
				$form.find("#email"),
				$form.find("#emailError")
			) && isValid;

		isValid =
			validateField(
				$form.find("#message"),
				$form.find("#messageError")
			) && isValid;

		// Return whether every required field passed its check.
		return isValid;
	}

	/**
	 * Save form submission to localStorage
	 * @param {Object} formData - The submitted form data
	 */
	function saveSubmission(formData) {
		// Pull in any submissions that were saved during previous visits.
		const submissions = loadSubmissions();
		// Add the new submission to the end of the list.
		submissions.push(formData);

		try {
			// Write the updated list back to localStorage as a JSON string.
			localStorage.setItem(STORAGE_KEY, JSON.stringify(submissions));
		} catch (e) {
			// localStorage may be full or disabled
			console.warn("Could not save to localStorage:", e.message);
		}
	}

	/**
	 * Load all previous submissions from localStorage
	 * @returns {Array} - Array of saved submission objects
	 */
	function loadSubmissions() {
		try {
			// Read the raw JSON string stored under our key.
			const data = localStorage.getItem(STORAGE_KEY);
			// Parse it if data exists, otherwise return an empty list.
			return data ? JSON.parse(data) : [];
		} catch (e) {
			// If parsing fails for any reason, return an empty list to avoid crashing.
			return [];
		}
	}

	/**
	 * Display feedback message to the user
	 * @param {jQuery} $feedbackDiv - The feedback container jQuery element
	 * @param {string} message - The message text to display
	 * @param {string} type - "success" or "error"
	 */
	function showFeedback($feedbackDiv, message, type) {
		// Clear any previous colour state, apply the new one, set the text, and fade in.
		$feedbackDiv
			.removeClass("success error")
			.addClass(type)
			.text(message)
			.fadeIn(300);
	}

	/**
	 * Clear the feedback message
	 * @param {jQuery} $feedbackDiv - The feedback container jQuery element
	 */
	function hideFeedback($feedbackDiv) {
		// Remove colour classes, clear the text, and fade the element out.
		$feedbackDiv.removeClass("success error").text("").fadeOut(200);
	}

	/**
	 * Reset form fields and validation states
	 * @param {jQuery} $form - The form jQuery element
	 */
	function resetForm($form) {
		// Use the native form reset to clear all field values in one call.
		$form[0].reset();
		// Strip valid/invalid highlight classes from every input and textarea.
		$form.find("input, textarea").removeClass("valid invalid");
		// Wipe any error messages that are still visible below fields.
		$form.find(".error-message").text("");
	}

	/**
	 * Initialize contact form event handlers
	 */
	function initContactForm() {
		// Locate the key elements we will be working with throughout this function.
		const $form = $("#contactForm");
		const $submitBtn = $("#submitBtn");
		const $feedbackDiv = $("#formFeedback");

		// Stop early if the contact form does not exist on this page.
		if ($form.length === 0) {
			return;
		}

		// Cache error element selectors for better performance
		const $nameError = $("#nameError");
		const $emailError = $("#emailError");
		const $messageError = $("#messageError");

		// Real-time validation on blur for required fields
		// Validate the name field as soon as the user moves focus away from it.
		$form.find("#name").on("blur", function () {
			validateField($(this), $nameError);
		});

		// Validate the email field as soon as the user moves focus away from it.
		$form.find("#email").on("blur", function () {
			validateField($(this), $emailError);
		});

		// Validate the message field as soon as the user moves focus away from it.
		$form.find("#message").on("blur", function () {
			validateField($(this), $messageError);
		});

		// Clear error styling when user starts typing
		// Remove the red border as soon as the user starts correcting a field.
		$form.find("input, textarea").on("input", function () {
			const $this = $(this);
			if ($this.hasClass("invalid")) {
				$this.removeClass("invalid");
				// Derive the matching error element's id and clear its text.
				const errorId = $this.attr("id") + "Error";
				$("#" + errorId).text("");
			}
		});

		// Form submission handler
		$form.on("submit", function (event) {
			// Stop the browser from navigating away on form submit.
			event.preventDefault();
			// Clear any leftover feedback from a previous attempt.
			hideFeedback($feedbackDiv);

			// If any field fails validation, show an error banner and stop.
			if (!validateForm($form)) {
				showFeedback(
					$feedbackDiv,
					"Please fix the errors above before submitting.",
					"error"
				);
				return;
			}

			// Collect form data using FormData API to avoid redundant DOM queries
			// Pull values directly from the native form element for reliability.
			const nativeForm = $form[0];
			const fd = new FormData(nativeForm);

			// Build a clean object from the raw form values, with safe fallbacks.
			const formData = {
				name: $.trim(fd.get("name") || ""),
				email: $.trim(fd.get("email") || ""),
				// Use a placeholder subject if the user left that field blank.
				subject: $.trim(fd.get("subject") || "") || "(No subject)",
				message: $.trim(fd.get("message") || ""),
				// Record when this submission was made for reference.
				submittedAt: new Date().toISOString(),
			};

			// Disable submit button to prevent double-submission
			$submitBtn.prop("disabled", true).text("Sending...");

			// Simulate brief network delay for realistic UX
			setTimeout(function () {
				// Persist the submission so it is not lost when the page reloads.
				saveSubmission(formData);

				// Confirm to the user that their message was received.
				showFeedback(
					$feedbackDiv,
					"Thank you, " +
						formData.name +
						"! Your message has been received. We'll get back to you soon.",
					"success"
				);

				// Wipe all field values and validation styles ready for a new entry.
				resetForm($form);

				// Re-enable submit button so the user can send another message if needed.
				$submitBtn.prop("disabled", false).text("Send Message");

				// Auto-hide success message after 8 seconds
				// Remove the confirmation banner automatically so it does not clutter the page.
				setTimeout(function () {
					hideFeedback($feedbackDiv);
				}, 8000);
			}, 800);
		});
	}

	// Wait for DOM ready
	$(document).ready(function () {
		initContactForm();
	});
})(jQuery);
