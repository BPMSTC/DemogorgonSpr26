/**
 * Code & Brew - About Page
 * Handles animations and interactive elements on the about page
 *
 * @format
 */

(function($) {
    "use strict";

    // ===================================
    // Animations
    // ===================================

    /**
     * Add fade-in animation to elements when they scroll into view
     */
    function animateOnScroll() {
        // Grab every card and section element that should animate in.
        var $elements = $(".story-card, .mission-card, .value-item, .impact-card, .team-card, .stat-card");

        // Check each element individually to see if it is currently visible.
        $elements.each(function() {
            // Hold a reference to the current element being checked.
            var $element = $(this);
            // Find where the top edge of this element sits on the page.
            var elementTop = $element.offset().top;
            // Find where the bottom edge of this element sits on the page.
            var elementBottom = elementTop + $element.outerHeight();
            // Find where the visible area of the page currently starts.
            var viewportTop = $(window).scrollTop();
            // Find where the visible area of the page currently ends.
            var viewportBottom = viewportTop + $(window).height();

            // Trigger the animation only if this element overlaps the visible area.
            if (elementBottom > viewportTop && elementTop < viewportBottom) {
                // Mark the element so CSS can play the fade-in transition.
                $element.addClass("fade-in");
            }
        });
    }

    /**
     * Smooth scroll to section when navbar link is clicked
     * @param {Event} e - Click event
     */
    function handleSmoothScroll(e) {
        // Read the destination from the link's href attribute.
        var target = $(this).attr("href");

        // Only handle links that point to an anchor on the same page.
        if (target && target.startsWith("#")) {
            // Stop the browser's default jump-to-anchor behavior.
            e.preventDefault();

            // Look up the element the link is pointing to.
            var $target = $(target);
            // Only scroll if the target element actually exists on the page.
            if ($target.length) {
                // Animate the page scroll to land 80 pixels above the target so the navbar doesn't cover it.
                $("html, body").animate({
                    scrollTop: $target.offset().top - 80
                }, 600);
            }
        }
    }

    /**
     * Toggle mobile navigation menu
     */
    function handleMobileNav() {
        // Listen for clicks on the hamburger button.
        $(".hamburger").on("click", function() {
            // Check whether the menu is currently marked as open.
            var isExpanded = $(this).attr("aria-expanded") === "true";

            // Flip the aria-expanded value so screen readers know the new state.
            $(this).attr("aria-expanded", !isExpanded);
        });
    }

    /**
     * Add keyboard navigation support for cards
     */
    function addKeyboardSupport() {
        // Loop through every interactive card on the page.
        $(".mission-card, .value-item, .impact-card, .team-card").each(function() {
            // Only add a tab stop if the card doesn't already have one.
            if (!$(this).attr("tabindex")) {
                // Allow keyboard users to tab onto this card.
                $(this).attr("tabindex", "0");
            }
        });

        // Let keyboard users activate cards the same way a mouse click would.
        $(".mission-card, .value-item, .impact-card, .team-card").on("keypress", function(e) {
            // Treat Enter and Space as equivalent to a click.
            if (e.which === 13 || e.which === 32) {
                // Stop the page from scrolling on Space, which is its default behavior.
                e.preventDefault();
                // Fire a click event so any click handler on the card still runs.
                $(this).trigger("click");
            }
        });
    }

    /**
     * Initialize scroll progress indicator
     */
    function initScrollProgress() {
        // Create the thin bar element that will sit at the very top of the page.
        var $progress = $('<div class="scroll-progress"></div>');
        // Attach it to the body so it is always visible.
        $("body").append($progress);

        // Recalculate the bar width every time the user scrolls.
        $(window).on("scroll", function() {
            // How far the user has scrolled from the top.
            var scrollTop = $(window).scrollTop();
            // Total scrollable distance of the page.
            var docHeight = $(document).height() - $(window).height();
            // Convert the scroll position into a percentage of the total distance.
            var scrollPercent = (scrollTop / docHeight) * 100;
            // Stretch the bar to match how far through the page the user is.
            $progress.css("width", scrollPercent + "%");
        });
    }

    /**
     * Add CSS for scroll progress indicator
     */
    function addScrollProgressStyles() {
        // Define the styles that make the progress bar sit fixed at the top of the viewport.
        var styles = `
            .scroll-progress {
                position: fixed;
                top: 0;
                left: 0;
                height: 4px;
                background: linear-gradient(90deg, #800000, #ffd700);
                z-index: 9999;
                transition: width 0.1s ease;
            }
        `;
        // Inject the styles directly into the document head.
        $("<style>").text(styles).appendTo("head");
    }

    /**
     * Initialize all about page functionality
     */
    function init() {
        // Run an immediate check so elements already in view animate right away.
        animateOnScroll();
        // Keep checking as the user scrolls to animate newly visible elements.
        $(window).on("scroll", animateOnScroll);

        // Wire up smooth scrolling for every anchor link on the page.
        $('a[href^="#"]').on("click", handleSmoothScroll);

        // Set up the hamburger button behavior for small screens.
        handleMobileNav();

        // Make cards reachable and usable with just a keyboard.
        addKeyboardSupport();

        // Inject the styles before the bar element is created.
        addScrollProgressStyles();
        // Build and attach the scroll progress bar.
        initScrollProgress();

        // Give the DOM a brief moment to settle before the first animation pass.
        setTimeout(animateOnScroll, 100);
    }

    // Wait for DOM ready
    $(document).ready(function() {
        init();
    });

})(jQuery);
