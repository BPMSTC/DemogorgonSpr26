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
        var $elements = $(".story-card, .mission-card, .value-item, .impact-card, .team-card, .stat-card");
        
        $elements.each(function() {
            var $element = $(this);
            var elementTop = $element.offset().top;
            var elementBottom = elementTop + $element.outerHeight();
            var viewportTop = $(window).scrollTop();
            var viewportBottom = viewportTop + $(window).height();
            
            // Check if element is in viewport
            if (elementBottom > viewportTop && elementTop < viewportBottom) {
                $element.addClass("fade-in");
            }
        });
    }

    /**
     * Smooth scroll to section when navbar link is clicked
     * @param {Event} e - Click event
     */
    function handleSmoothScroll(e) {
        var target = $(this).attr("href");
        
        // Only handle anchor links that start with #
        if (target && target.startsWith("#")) {
            e.preventDefault();
            
            var $target = $(target);
            if ($target.length) {
                $("html, body").animate({
                    scrollTop: $target.offset().top - 80
                }, 600);
            }
        }
    }

    /**
     * Animate numbers counting up to their final value
     */
    function animateStats() {
        var $stats = $(".stat-number");
        var animated = false;
        
        function countUp($element) {
            var target = $element.text();
            var isPlus = target.includes("+");
            var numericValue = parseInt(target.replace(/[^0-9]/g, ""), 10);
            
            if (isNaN(numericValue)) return;
            
            var current = 0;
            var increment = Math.ceil(numericValue / 50);
            var duration = 1500;
            var steps = Math.ceil(duration / 30);
            var stepIncrement = Math.ceil(numericValue / steps);
            
            var interval = setInterval(function() {
                current += stepIncrement;
                if (current >= numericValue) {
                    current = numericValue;
                    clearInterval(interval);
                }
                
                var displayValue = current.toLocaleString();
                if (isPlus && current === numericValue) {
                    displayValue += "+";
                }
                
                $element.text(displayValue);
            }, 30);
        }
        
        function checkStatsInView() {
            if (animated) return;
            
            var $statsSection = $("#stats");
            if ($statsSection.length === 0) return;
            
            var sectionTop = $statsSection.offset().top;
            var sectionBottom = sectionTop + $statsSection.outerHeight();
            var viewportTop = $(window).scrollTop();
            var viewportBottom = viewportTop + $(window).height();
            
            if (sectionBottom > viewportTop && sectionTop < viewportBottom) {
                animated = true;
                $stats.each(function() {
                    countUp($(this));
                });
            }
        }
        
        $(window).on("scroll", checkStatsInView);
        checkStatsInView(); // Check on page load
    }

    /**
     * Toggle mobile navigation menu
     */
    function handleMobileNav() {
        $(".navbar-toggler").on("click", function() {
            var $icon = $(this).find(".navbar-toggler-icon");
            var isExpanded = $(this).attr("aria-expanded") === "true";
            
            // Update aria-expanded for accessibility
            $(this).attr("aria-expanded", !isExpanded);
        });
    }

    /**
     * Add keyboard navigation support for cards
     */
    function addKeyboardSupport() {
        $(".mission-card, .value-item, .impact-card, .team-card").each(function() {
            // Make cards focusable
            if (!$(this).attr("tabindex")) {
                $(this).attr("tabindex", "0");
            }
        });
        
        // Add keyboard support for card interactions
        $(".mission-card, .value-item, .impact-card, .team-card").on("keypress", function(e) {
            // Enter or Space key
            if (e.which === 13 || e.which === 32) {
                e.preventDefault();
                $(this).trigger("click");
            }
        });
    }

    /**
     * Initialize scroll progress indicator
     */
    function initScrollProgress() {
        var $progress = $('<div class="scroll-progress"></div>');
        $("body").append($progress);
        
        $(window).on("scroll", function() {
            var scrollTop = $(window).scrollTop();
            var docHeight = $(document).height() - $(window).height();
            var scrollPercent = (scrollTop / docHeight) * 100;
            $progress.css("width", scrollPercent + "%");
        });
    }

    /**
     * Add CSS for scroll progress indicator
     */
    function addScrollProgressStyles() {
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
        $("<style>").text(styles).appendTo("head");
    }

    /**
     * Initialize all about page functionality
     */
    function init() {
        // Animate elements on scroll
        animateOnScroll();
        $(window).on("scroll", animateOnScroll);
        
        // Smooth scroll for anchor links
        $('a[href^="#"]').on("click", handleSmoothScroll);
        
        // Animate statistics
        animateStats();
        
        // Mobile navigation
        handleMobileNav();
        
        // Keyboard accessibility
        addKeyboardSupport();
        
        // Scroll progress indicator
        addScrollProgressStyles();
        initScrollProgress();
        
        // Trigger animation check on page load
        setTimeout(animateOnScroll, 100);
    }

    // Wait for DOM ready
    $(document).ready(function() {
        init();
    });

})(jQuery);