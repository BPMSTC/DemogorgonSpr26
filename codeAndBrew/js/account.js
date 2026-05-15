/**
 * Code & Brew - Account Creation
 * Validates registration form and redirects to welcome page on success
 *
 * @format
 */

(function($) {
    "use strict";

    // Constants
    const MIN_PASSWORD_LENGTH = 8;
    const MIN_USERNAME_LENGTH = 3;
    const MAX_USERNAME_LENGTH = 20;
    const PASSWORD_SPECIAL_CHARS_REGEX = /[!@#$%^&*]/;
    const SESSION_KEY = "currentUser";

    // ===================================
    // Validators
    // ===================================

    /**
     * Validate username format
     * @param {string} username - Username to validate
     * @returns {Object} { valid: boolean, message: string }
     */
    function validateUsername(username) {
        // Reject the username if it is missing or too short.
        if (!username || username.trim().length < MIN_USERNAME_LENGTH) {
            return { valid: false, message: "Username must be at least " + MIN_USERNAME_LENGTH + " characters." };
        }
        // Reject the username if it exceeds the maximum allowed length.
        if (username.trim().length > MAX_USERNAME_LENGTH) {
            return { valid: false, message: "Username must be no more than " + MAX_USERNAME_LENGTH + " characters." };
        }
        // Reject the username if it contains anything other than letters and numbers.
        if (!/^[a-zA-Z0-9]+$/.test(username.trim())) {
            return { valid: false, message: "Username can only contain letters and numbers." };
        }
        // All checks passed — the username is acceptable.
        return { valid: true, message: "" };
    }

    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {Object} { valid: boolean, message: string }
     */
    function validateEmail(email) {
        // Reject a blank email field.
        if (!email || email.trim().length === 0) {
            return { valid: false, message: "Email address is required." };
        }
        // Reject anything that does not look like a proper email address.
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            return { valid: false, message: "Please enter a valid email address." };
        }
        // The email looks valid.
        return { valid: true, message: "" };
    }

    /**
     * Check individual password requirements
     * @param {string} password - Password to check
     * @returns {Object} Map of requirement keys to pass/fail booleans
     */
    function checkPasswordRequirements(password) {
        // Return a snapshot of which rules the password currently satisfies.
        return {
            // Password must be at least the minimum number of characters.
            length:    password.length >= MIN_PASSWORD_LENGTH,
            // Password must contain at least one capital letter.
            uppercase: /[A-Z]/.test(password),
            // Password must contain at least one lowercase letter.
            lowercase: /[a-z]/.test(password),
            // Password must contain at least one digit.
            number:    /[0-9]/.test(password),
            // Password must contain at least one of the allowed special characters.
            special:   PASSWORD_SPECIAL_CHARS_REGEX.test(password)
        };
    }

    /**
     * Validate password meets all requirements
     * @param {string} password - Password to validate
     * @returns {Object} { valid: boolean, message: string }
     */
    function validatePassword(password) {
        // Reject an empty password field immediately.
        if (!password || password.length === 0) {
            return { valid: false, message: "Password is required." };
        }
        // Run the full requirements check to see which rules pass.
        const reqs = checkPasswordRequirements(password);
        // The password is only valid when every single requirement is met.
        const allMet = reqs.length && reqs.uppercase && reqs.lowercase && reqs.number && reqs.special;
        // Let the user know they still have unmet requirements.
        if (!allMet) {
            return { valid: false, message: "Password does not meet all requirements below." };
        }
        // Every rule passed — the password is strong enough.
        return { valid: true, message: "" };
    }

    /**
     * Validate confirm password matches password
     * @param {string} password - Original password
     * @param {string} confirm - Confirmed password
     * @returns {Object} { valid: boolean, message: string }
     */
    function validateConfirmPassword(password, confirm) {
        // Reject a blank confirmation field.
        if (!confirm || confirm.length === 0) {
            return { valid: false, message: "Please confirm your password." };
        }
        // Reject if the two entries do not match exactly.
        if (password !== confirm) {
            return { valid: false, message: "Passwords do not match." };
        }
        // Both fields match — the confirmation is valid.
        return { valid: true, message: "" };
    }

    // ===================================
    // UI Helpers
    // ===================================

    /**
     * Mark a field as valid
     * @param {jQuery} $field - The input element
     */
    function setValid($field) {
        // Remove any error styling and apply the green success style.
        $field.removeClass("is-invalid").addClass("is-valid");
        // Clear any error text that was previously shown below the field.
        $field.siblings(".invalid-feedback").text("");
    }

    /**
     * Mark a field as invalid with a message
     * @param {jQuery} $field - The input element
     * @param {string} message - Error message to display
     */
    function setInvalid($field, message) {
        // Remove any success styling and apply the red error style.
        $field.removeClass("is-valid").addClass("is-invalid");
        // Show the specific reason why this field failed validation.
        $field.siblings(".invalid-feedback").text(message);
    }

    /**
     * Clear all validation styling from a field
     * @param {jQuery} $field - The input element
     */
    function clearValidation($field) {
        // Strip both valid and invalid classes so the field looks neutral again.
        $field.removeClass("is-valid is-invalid");
        // Remove any error text so nothing misleading is left on screen.
        $field.siblings(".invalid-feedback").text("");
    }

    /**
     * Update the password strength bar and label
     * @param {string} password - Current password value
     */
    function updateStrengthBar(password) {
        // Find out which requirements the current password satisfies.
        const reqs = checkPasswordRequirements(password);
        // Start counting how many rules are currently met.
        let metCount = 0;
        // Tally up every rule that returned true.
        for (const key in reqs) {
            if (reqs[key]) metCount++;
        }

        // Translate the count of met requirements into a strength label.
        let strength = "none";
        if (metCount <= 2) strength = "weak";
        else if (metCount === 3) strength = "fair";
        else if (metCount === 4) strength = "good";
        else if (metCount === 5) strength = "strong";

        // Grab the visual bar and its text label.
        const $fill = $(".strength-fill");
        const $label = $(".strength-level");

        // Remove any previous strength colour before applying the new one.
        $fill.removeClass("weak fair good strong");
        $label.removeClass("weak fair good strong");

        // Only apply a colour class when the user has typed something.
        if (password.length > 0) {
            // Colour the bar and set the label to match the strength level.
            $fill.addClass(strength);
            $label.addClass(strength).text(strength.charAt(0).toUpperCase() + strength.slice(1));
        } else {
            // Show a dash when the password field is empty.
            $label.text("-");
        }
    }

    /**
     * Update the checklist of password requirements
     * @param {string} password - Current password value
     */
    function updateRequirementsList(password) {
        // Re-evaluate which requirements pass with the latest password value.
        const reqs = checkPasswordRequirements(password);
        // Go through every requirement and update its visual state.
        for (const key in reqs) {
            // Find the checklist item that corresponds to this requirement.
            const $item = $(".requirement[data-requirement='" + key + "']");
            // Mark it as met or unmet depending on the result.
            if (reqs[key]) {
                $item.addClass("met");
            } else {
                $item.removeClass("met");
            }
        }
    }

    // ===================================
    // Form Validation
    // ===================================

    /**
     * Run validation on all fields; return true only if every field passes
     * @returns {boolean} Whether the entire form is valid
     */
    function validateAll() {
        // Read the current value from each form field.
        const username        = $("#username").val().trim();
        const email           = $("#email").val().trim();
        const password        = $("#password").val();
        const confirmPassword = $("#confirmPassword").val();
        // Check whether the user has ticked the terms checkbox.
        const termsChecked    = $("#terms").is(":checked");

        // Run the individual validators for each field.
        const usernameResult        = validateUsername(username);
        const emailResult           = validateEmail(email);
        const passwordResult        = validatePassword(password);
        const confirmPasswordResult = validateConfirmPassword(password, confirmPassword);

        // Apply field-level visual feedback
        // Show green or red styling on the username field based on its result.
        if (usernameResult.valid) {
            setValid($("#username"));
        } else {
            setInvalid($("#username"), usernameResult.message);
        }

        // Show green or red styling on the email field based on its result.
        if (emailResult.valid) {
            setValid($("#email"));
        } else {
            setInvalid($("#email"), emailResult.message);
        }

        // Show green or red styling on the password field based on its result.
        if (passwordResult.valid) {
            setValid($("#password"));
        } else {
            setInvalid($("#password"), passwordResult.message);
        }

        // Show green or red styling on the confirm password field based on its result.
        if (confirmPasswordResult.valid) {
            setValid($("#confirmPassword"));
        } else {
            setInvalid($("#confirmPassword"), confirmPasswordResult.message);
        }

        // Terms checkbox
        // Highlight the checkbox if the user has not agreed to the terms yet.
        if (!termsChecked) {
            $("#terms").addClass("is-invalid");
            $("#terms").siblings(".invalid-feedback").show();
        } else {
            // Remove the error highlight once the box is checked.
            $("#terms").removeClass("is-invalid");
            $("#terms").siblings(".invalid-feedback").hide();
        }

        // The entire form is only valid when every field and the checkbox pass.
        return (
            usernameResult.valid &&
            emailResult.valid &&
            passwordResult.valid &&
            confirmPasswordResult.valid &&
            termsChecked
        );
    }

    // ===================================
    // Event Handlers
    // ===================================

    /**
     * Toggle password field visibility
     * @param {Event} e - Click event
     */
    function togglePasswordVisibility(e) {
        // Stop the button from submitting the form.
        e.preventDefault();
        // Find out which password field this toggle button controls.
        const targetId = $(this).data("target");
        // Grab the password field and the eye icon inside the button.
        const $input = $("#" + targetId);
        const $icon = $(this).find("i");

        // Switch between showing and hiding the password characters.
        if ($input.attr("type") === "password") {
            // Show the characters as plain text.
            $input.attr("type", "text");
            // Change the icon to the slashed eye to indicate the password is now visible.
            $icon.removeClass("fa-eye").addClass("fa-eye-slash");
        } else {
            // Hide the characters behind dots again.
            $input.attr("type", "password");
            // Change the icon back to the open eye.
            $icon.removeClass("fa-eye-slash").addClass("fa-eye");
        }
    }

    /**
     * Handle password input: update strength bar and requirements list
     */
    function handlePasswordInput() {
        // Read the password as the user types it.
        const password = $(this).val();
        // Refresh the colour bar to reflect the new strength level.
        updateStrengthBar(password);
        // Tick or untick each requirement item to match the current password.
        updateRequirementsList(password);

        // Re-validate confirm field if it already has a value
        // If the user has already typed something in the confirm field, check it again in case it no longer matches.
        if ($("#confirmPassword").val().length > 0) {
            const result = validateConfirmPassword(password, $("#confirmPassword").val());
            // Update the confirm field styling to match the latest comparison.
            if (result.valid) {
                setValid($("#confirmPassword"));
            } else {
                setInvalid($("#confirmPassword"), result.message);
            }
        }
    }

    /**
     * Handle form submission — validate then redirect on success
     * @param {Event} e - Submit event
     */
    function handleFormSubmit(e) {
        // Stop the browser from doing a traditional page reload on submit.
        e.preventDefault();

        // Run all validators and abort if anything fails.
        if (!validateAll()) {
            // Scroll the page up to the first field showing an error.
            const $firstError = $(".is-invalid").first();
            if ($firstError.length) {
                $("html, body").animate({ scrollTop: $firstError.offset().top - 80 }, 300);
            }
            return false;
        }

        // All validation passed — save user to sessionStorage and redirect
        // Package the user's details to carry over to the welcome page.
        const userData = {
            username: $("#username").val().trim(),
            email:    $("#email").val().trim()
        };

        // Write the user data to sessionStorage so the welcome page can read it.
        try {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(userData));
        } catch (err) {
            console.error("Could not write to sessionStorage:", err);
        }

        // Send the user to the welcome page now that registration is complete.
        window.location.href = "welcome.html";
        return false;
    }

    // ===================================
    // Initialisation
    // ===================================

    /**
     * Bind all event listeners
     */
    function init() {
        // Wire up the show/hide toggle buttons for both password fields.
        $(".toggle-password").on("click", togglePasswordVisibility);

        // Update the strength bar and requirement list as the user types their password.
        $("#password").on("input", handlePasswordInput);

        // Blur validation (validate each field when the user leaves it)
        // Check the username when the user moves focus away from that field.
        $("#username").on("blur", function() {
            var result = validateUsername($(this).val().trim());
            if (result.valid) { setValid($(this)); } else { setInvalid($(this), result.message); }
        });

        // Check the email when the user moves focus away from that field.
        $("#email").on("blur", function() {
            var result = validateEmail($(this).val().trim());
            if (result.valid) { setValid($(this)); } else { setInvalid($(this), result.message); }
        });

        // Check the password when the user moves focus away from that field.
        $("#password").on("blur", function() {
            var result = validatePassword($(this).val());
            if (result.valid) { setValid($(this)); } else { setInvalid($(this), result.message); }
        });

        // Check that the confirmation matches the password when the user leaves that field.
        $("#confirmPassword").on("blur", function() {
            var result = validateConfirmPassword($("#password").val(), $(this).val());
            if (result.valid) { setValid($(this)); } else { setInvalid($(this), result.message); }
        });

        // Terms checkbox
        // Clear the checkbox error styling as soon as the user ticks the box.
        $("#terms").on("change", function() {
            if ($(this).is(":checked")) {
                $(this).removeClass("is-invalid");
                $(this).siblings(".invalid-feedback").hide();
            }
        });

        // Hand off form submission to our custom handler.
        $("#registrationForm").on("submit", handleFormSubmit);
    }

    // Wait for DOM ready
    $(document).ready(function() {
        init();
    });

})(jQuery);
