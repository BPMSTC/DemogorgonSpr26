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
	var STORAGE_KEY = "codeBrewInquiries";

	// Minimum character lengths for validation
	var MIN_NAME_LENGTH = 2;
	var MIN_MESSAGE_LENGTH = 10;

	// Email validation pattern (standard RFC-compliant regex)
	var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

	/**
	 * Validate a single form field and display error message
	 * @param {jQuery} $field - The input/textarea jQuery element
	 * @param {jQuery} $errorSpan - The error message span jQuery element
	 * @returns {boolean} - True if the field is valid
	 */
	function validateField($field, $errorSpan) {
		var value = $.trim($field.val());
		var fieldName = $field.attr("name");
		var errorMessage = "";

		if (fieldName === "name") {
			if (value.length === 0) {
				errorMessage = "Full name is required.";
			} else if (value.length < MIN_NAME_LENGTH) {
				errorMessage =
					"Name must be at least " + MIN_NAME_LENGTH + " characters.";
			}
		} else if (fieldName === "email") {
			if (value.length === 0) {
				errorMessage = "Email address is required.";
			} else if (!EMAIL_PATTERN.test(value)) {
				errorMessage = "Please enter a valid email address.";
			}
		} else if (fieldName === "message") {
			if (value.length === 0) {
				errorMessage = "Message is required.";
			} else if (value.length < MIN_MESSAGE_LENGTH) {
				errorMessage =
					"Message must be at least " +
					MIN_MESSAGE_LENGTH +
					" characters.";
			}
		}

		// Update UI based on validation result
		if (errorMessage) {
			$field.removeClass("valid").addClass("invalid");
			$errorSpan.text(errorMessage);
			return false;
		} else {
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
		var isValid = true;

		// Validate each required field
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

		return isValid;
	}

	/**
	 * Save form submission to localStorage
	 * @param {Object} formData - The submitted form data
	 */
	function saveSubmission(formData) {
		var submissions = loadSubmissions();
		submissions.push(formData);

		try {
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
			var data = localStorage.getItem(STORAGE_KEY);
			return data ? JSON.parse(data) : [];
		} catch (e) {
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
		$feedbackDiv.removeClass("success error").text("").fadeOut(200);
	}

	/**
	 * Reset form fields and validation states
	 * @param {jQuery} $form - The form jQuery element
	 */
	function resetForm($form) {
		$form[0].reset();
		$form.find("input, textarea").removeClass("valid invalid");
		$form.find(".error-message").text("");
	}

	/**
	 * Initialize contact form event handlers
	 */
	function initContactForm() {
		var $form = $("#contactForm");
		var $submitBtn = $("#submitBtn");
		var $feedbackDiv = $("#formFeedback");

		if ($form.length === 0) {
			return;
		}

		// Real-time validation on blur for required fields
		$form.find("#name").on("blur", function () {
			validateField($(this), $("#nameError"));
		});

		$form.find("#email").on("blur", function () {
			validateField($(this), $("#emailError"));
		});

		$form.find("#message").on("blur", function () {
			validateField($(this), $("#messageError"));
		});

		// Clear error styling when user starts typing
		$form.find("input, textarea").on("input", function () {
			var $this = $(this);
			if ($this.hasClass("invalid")) {
				$this.removeClass("invalid");
				var errorId = $this.attr("id") + "Error";
				$("#" + errorId).text("");
			}
		});

		// Form submission handler
		$form.on("submit", function (event) {
			event.preventDefault();
			hideFeedback($feedbackDiv);

			if (!validateForm($form)) {
				showFeedback(
					$feedbackDiv,
					"Please fix the errors above before submitting.",
					"error"
				);
				return;
			}

			// Collect form data
			var formData = {
				name: $.trim($("#name").val()),
				email: $.trim($("#email").val()),
				subject: $.trim($("#subject").val()) || "(No subject)",
				message: $.trim($("#message").val()),
				submittedAt: new Date().toISOString(),
			};

			// Disable submit button to prevent double-submission
			$submitBtn.prop("disabled", true).text("Sending...");

			// Simulate brief network delay for realistic UX
			setTimeout(function () {
				saveSubmission(formData);

				showFeedback(
					$feedbackDiv,
					"Thank you, " +
						formData.name +
						"! Your message has been received. We'll get back to you soon.",
					"success"
				);

				resetForm($form);

				// Re-enable submit button
				$submitBtn.prop("disabled", false).text("Send Message");

				// Auto-hide success message after 8 seconds
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
