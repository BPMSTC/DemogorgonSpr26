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
        if (!username || username.trim().length < MIN_USERNAME_LENGTH) {
            return { valid: false, message: "Username must be at least " + MIN_USERNAME_LENGTH + " characters." };
        }
        if (username.trim().length > MAX_USERNAME_LENGTH) {
            return { valid: false, message: "Username must be no more than " + MAX_USERNAME_LENGTH + " characters." };
        }
        if (!/^[a-zA-Z0-9]+$/.test(username.trim())) {
            return { valid: false, message: "Username can only contain letters and numbers." };
        }
        return { valid: true, message: "" };
    }

    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {Object} { valid: boolean, message: string }
     */
    function validateEmail(email) {
        if (!email || email.trim().length === 0) {
            return { valid: false, message: "Email address is required." };
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            return { valid: false, message: "Please enter a valid email address." };
        }
        return { valid: true, message: "" };
    }

    /**
     * Check individual password requirements
     * @param {string} password - Password to check
     * @returns {Object} Map of requirement keys to pass/fail booleans
     */
    function checkPasswordRequirements(password) {
        return {
            length:    password.length >= MIN_PASSWORD_LENGTH,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number:    /[0-9]/.test(password),
            special:   PASSWORD_SPECIAL_CHARS_REGEX.test(password)
        };
    }

    /**
     * Validate password meets all requirements
     * @param {string} password - Password to validate
     * @returns {Object} { valid: boolean, message: string }
     */
    function validatePassword(password) {
        if (!password || password.length === 0) {
            return { valid: false, message: "Password is required." };
        }
        const reqs = checkPasswordRequirements(password);
        const allMet = reqs.length && reqs.uppercase && reqs.lowercase && reqs.number && reqs.special;
        if (!allMet) {
            return { valid: false, message: "Password does not meet all requirements below." };
        }
        return { valid: true, message: "" };
    }

    /**
     * Validate confirm password matches password
     * @param {string} password - Original password
     * @param {string} confirm - Confirmed password
     * @returns {Object} { valid: boolean, message: string }
     */
    function validateConfirmPassword(password, confirm) {
        if (!confirm || confirm.length === 0) {
            return { valid: false, message: "Please confirm your password." };
        }
        if (password !== confirm) {
            return { valid: false, message: "Passwords do not match." };
        }
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
        $field.removeClass("is-invalid").addClass("is-valid");
        $field.siblings(".invalid-feedback").text("");
    }

    /**
     * Mark a field as invalid with a message
     * @param {jQuery} $field - The input element
     * @param {string} message - Error message to display
     */
    function setInvalid($field, message) {
        $field.removeClass("is-valid").addClass("is-invalid");
        $field.siblings(".invalid-feedback").text(message);
    }

    /**
     * Clear all validation styling from a field
     * @param {jQuery} $field - The input element
     */
    function clearValidation($field) {
        $field.removeClass("is-valid is-invalid");
        $field.siblings(".invalid-feedback").text("");
    }

    /**
     * Update the password strength bar and label
     * @param {string} password - Current password value
     */
    function updateStrengthBar(password) {
        const reqs = checkPasswordRequirements(password);
        let metCount = 0;
        for (const key in reqs) {
            if (reqs[key]) metCount++;
        }

        let strength = "none";
        if (metCount <= 2) strength = "weak";
        else if (metCount === 3) strength = "fair";
        else if (metCount === 4) strength = "good";
        else if (metCount === 5) strength = "strong";

        const $fill = $(".strength-fill");
        const $label = $(".strength-level");

        $fill.removeClass("weak fair good strong");
        $label.removeClass("weak fair good strong");

        if (password.length > 0) {
            $fill.addClass(strength);
            $label.addClass(strength).text(strength.charAt(0).toUpperCase() + strength.slice(1));
        } else {
            $label.text("-");
        }
    }

    /**
     * Update the checklist of password requirements
     * @param {string} password - Current password value
     */
    function updateRequirementsList(password) {
        const reqs = checkPasswordRequirements(password);
        for (const key in reqs) {
            const $item = $(".requirement[data-requirement='" + key + "']");
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
        const username        = $("#username").val().trim();
        const email           = $("#email").val().trim();
        const password        = $("#password").val();
        const confirmPassword = $("#confirmPassword").val();
        const termsChecked    = $("#terms").is(":checked");

        const usernameResult        = validateUsername(username);
        const emailResult           = validateEmail(email);
        const passwordResult        = validatePassword(password);
        const confirmPasswordResult = validateConfirmPassword(password, confirmPassword);

        // Apply field-level visual feedback
        if (usernameResult.valid) {
            setValid($("#username"));
        } else {
            setInvalid($("#username"), usernameResult.message);
        }

        if (emailResult.valid) {
            setValid($("#email"));
        } else {
            setInvalid($("#email"), emailResult.message);
        }

        if (passwordResult.valid) {
            setValid($("#password"));
        } else {
            setInvalid($("#password"), passwordResult.message);
        }

        if (confirmPasswordResult.valid) {
            setValid($("#confirmPassword"));
        } else {
            setInvalid($("#confirmPassword"), confirmPasswordResult.message);
        }

        // Terms checkbox
        if (!termsChecked) {
            $("#terms").addClass("is-invalid");
            $("#terms").siblings(".invalid-feedback").show();
        } else {
            $("#terms").removeClass("is-invalid");
            $("#terms").siblings(".invalid-feedback").hide();
        }

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
        e.preventDefault();
        const targetId = $(this).data("target");
        const $input = $("#" + targetId);
        const $icon = $(this).find("i");

        if ($input.attr("type") === "password") {
            $input.attr("type", "text");
            $icon.removeClass("fa-eye").addClass("fa-eye-slash");
        } else {
            $input.attr("type", "password");
            $icon.removeClass("fa-eye-slash").addClass("fa-eye");
        }
    }

    /**
     * Handle password input: update strength bar and requirements list
     */
    function handlePasswordInput() {
        const password = $(this).val();
        updateStrengthBar(password);
        updateRequirementsList(password);

        // Re-validate confirm field if it already has a value
        if ($("#confirmPassword").val().length > 0) {
            const result = validateConfirmPassword(password, $("#confirmPassword").val());
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
        e.preventDefault();

        if (!validateAll()) {
            // Scroll to first error so the user sees it
            const $firstError = $(".is-invalid").first();
            if ($firstError.length) {
                $("html, body").animate({ scrollTop: $firstError.offset().top - 80 }, 300);
            }
            return false;
        }

        // All validation passed — save user to sessionStorage and redirect
        const userData = {
            username: $("#username").val().trim(),
            email:    $("#email").val().trim()
        };

        try {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(userData));
        } catch (err) {
            console.error("Could not write to sessionStorage:", err);
        }

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
        // Password show/hide toggles
        $(".toggle-password").on("click", togglePasswordVisibility);

        // Real-time password feedback
        $("#password").on("input", handlePasswordInput);

        // Blur validation (validate each field when the user leaves it)
        $("#username").on("blur", function() {
            var result = validateUsername($(this).val().trim());
            if (result.valid) { setValid($(this)); } else { setInvalid($(this), result.message); }
        });

        $("#email").on("blur", function() {
            var result = validateEmail($(this).val().trim());
            if (result.valid) { setValid($(this)); } else { setInvalid($(this), result.message); }
        });

        $("#password").on("blur", function() {
            var result = validatePassword($(this).val());
            if (result.valid) { setValid($(this)); } else { setInvalid($(this), result.message); }
        });

        $("#confirmPassword").on("blur", function() {
            var result = validateConfirmPassword($("#password").val(), $(this).val());
            if (result.valid) { setValid($(this)); } else { setInvalid($(this), result.message); }
        });

        // Terms checkbox
        $("#terms").on("change", function() {
            if ($(this).is(":checked")) {
                $(this).removeClass("is-invalid");
                $(this).siblings(".invalid-feedback").hide();
            }
        });

        // Form submit
        $("#registrationForm").on("submit", handleFormSubmit);
    }

    // Wait for DOM ready
    $(document).ready(function() {
        init();
    });

})(jQuery);
