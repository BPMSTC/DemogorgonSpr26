/**
 * Code & Brew - Homepage Featured Items Carousel
 * Auto-playing carousel with manual nav, keyboard support, and ARIA attributes.
 *
 * @format
 */

(function ($) {
  "use strict";

  /** Auto-advance delay in milliseconds (4 seconds) */
  var AUTO_PLAY_DELAY = 4000;

  /**
   * Featured menu items data shown in the carousel.
   * Add or edit entries here to change what appears on the homepage.
   * Each item must include: name, description, price, emoji, category, visualClass.
   * @type {Array<Object>}
   */
  var CAROUSEL_ITEMS = [
    {
      id: 1,
      name: "Signature Espresso",
      description:
        "Bold, rich shots pulled from our house blend — the foundation of every great coffee moment at Code & Brew.",
      price: "$3.00",
      emoji: "☕",
      category: "Espresso Drinks",
      visualClass: "carousel-slide-visual--espresso",
    },
    {
      id: 2,
      name: "Vanilla Cold Brew",
      description:
        "Smooth cold brew steeped for 24 hours with a hint of pure vanilla. Refreshing in every single sip.",
      price: "$5.00",
      emoji: "🧊",
      category: "Cold Brew",
      visualClass: "carousel-slide-visual--cold-brew",
    },
    {
      id: 3,
      name: "Fresh Croissant",
      description:
        "Flaky, buttery layers baked fresh every morning by our pastry chef Quinton. Best paired with a latte.",
      price: "$3.50",
      emoji: "🥐",
      category: "Pastries",
      visualClass: "carousel-slide-visual--pastry",
    },
    {
      id: 4,
      name: "Matcha Latte",
      description:
        "Earthy ceremonial-grade matcha blended with silky steamed oat milk. A calm and focused cup.",
      price: "$5.00",
      emoji: "🍵",
      category: "Specialty Drinks",
      visualClass: "carousel-slide-visual--specialty",
    },
    {
      id: 5,
      name: "Cappuccino",
      description:
        "Equal parts espresso, steamed milk, and velvety foam. A timeless coffeehouse classic done right.",
      price: "$4.50",
      emoji: "☕",
      category: "Espresso Drinks",
      visualClass: "carousel-slide-visual--espresso",
    },
    {
      id: 6,
      name: "Double Chocolate Cookie",
      description:
        "Quinton's most-requested item — chewy, fudgy, loaded with chocolate chips, and made fresh daily.",
      price: "$2.50",
      emoji: "🍪",
      category: "Pastries",
      visualClass: "carousel-slide-visual--pastry",
    },
  ];

  /**
   * Escape a string for safe insertion into HTML to prevent XSS.
   * @param {string} str - Raw string to escape
   * @returns {string} HTML-escaped string
   */
  function escapeHtml(str) {
    // Return an empty string rather than crashing on null or undefined input.
    if (str == null) {
      return "";
    }
    // Replace every HTML-special character with its safe entity equivalent.
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /**
   * Build the HTML for a single carousel slide.
   * @param {Object} item - Carousel item data object
   * @param {number} index - Zero-based slide index
   * @param {number} total - Total number of slides
   * @returns {string} HTML string for the slide element
   */
  function buildSlideHtml(item, index, total) {
    // Sanitize every field before embedding it in HTML.
    var name = escapeHtml(item.name);
    var description = escapeHtml(item.description);
    var price = escapeHtml(item.price);
    var category = escapeHtml(item.category);
    var emoji = escapeHtml(item.emoji);
    var visualClass = escapeHtml(item.visualClass);
    // Convert the zero-based index to a human-friendly slide number.
    var slideNumber = index + 1;

    // Assemble and return the full slide markup as a string.
    return (
      "<div " +
        "class=\"carousel-slide\" " +
        "role=\"group\" " +
        "aria-roledescription=\"slide\" " +
        "aria-label=\"" + slideNumber + " of " + total + ": " + name + "\" " +
        "data-slide-index=\"" + index + "\">" +
        "<div " +
          "class=\"carousel-slide-visual " + visualClass + "\" " +
          "role=\"img\" " +
          "aria-label=\"" + category + " item: " + name + "\">" +
          emoji +
        "</div>" +
        "<div class=\"carousel-slide-content\">" +
          "<span class=\"carousel-slide-category\">" + category + "</span>" +
          "<h3 class=\"carousel-slide-name\">" + name + "</h3>" +
          "<p class=\"carousel-slide-description\">" + description + "</p>" +
          "<p class=\"carousel-slide-price\">" + price + "</p>" +
          "<a href=\"#menu\" class=\"carousel-slide-link\">View on Menu</a>" +
        "</div>" +
      "</div>"
    );
  }

  /**
   * Build the HTML for a single dot indicator button.
   * @param {number} index - Zero-based slide index
   * @param {boolean} isActive - Whether this dot represents the current slide
   * @returns {string} HTML string for the dot button
   */
  function buildDotHtml(index, isActive) {
    // Add the active CSS class only for the dot that matches the current slide.
    var activeClass = isActive ? " active" : "";
    // Tell screen readers whether this dot's slide is the one being shown.
    var ariaSelected = isActive ? "true" : "false";
    // Return the fully constructed dot button markup.
    return (
      "<button " +
        "class=\"carousel-dot" + activeClass + "\" " +
        "role=\"tab\" " +
        "aria-selected=\"" + ariaSelected + "\" " +
        "aria-label=\"Go to slide " + (index + 1) + "\" " +
        "data-dot-index=\"" + index + "\" " +
        "type=\"button\">" +
      "</button>"
    );
  }

  /**
   * Initialize the homepage featured-items carousel.
   * Builds slide and dot markup, wires up prev/next buttons, dot clicks,
   * keyboard navigation (Left/Right arrows), and starts the auto-play timer.
   *
   * What it does:
   *   Renders CAROUSEL_ITEMS into a sliding track with ARIA landmark roles,
   *   attaches event listeners for manual and keyboard navigation, and starts
   *   a setInterval that advances the carousel every AUTO_PLAY_DELAY ms.
   *   Auto-play pauses while the user is hovering or has keyboard focus on
   *   the carousel wrapper so it does not interrupt interaction.
   *
   * What it takes in:
   *   No parameters — reads from the DOM element #featuredCarousel and the
   *   module-level CAROUSEL_ITEMS array.
   *
   * What it returns:
   *   Nothing (void). All side-effects are DOM mutations and event listeners.
   */
  function initCarousel() {
    // Stop here if the carousel element does not exist on this page.
    var $carousel = $("#featuredCarousel");
    if ($carousel.length === 0) {
      return;
    }

    // Grab the inner containers we will populate with generated markup.
    var $track = $carousel.find(".carousel-track");
    var $dotsContainer = $carousel.find(".carousel-dots");
    var $btnPrev = $carousel.find(".carousel-btn--prev");
    var $btnNext = $carousel.find(".carousel-btn--next");

    // Record how many slides exist and set the starting position to the first.
    var totalSlides = CAROUSEL_ITEMS.length;
    var currentIndex = 0;
    // Keep a reference to the interval so it can be cleared later.
    var autoPlayTimer = null;
    // Track whether the user is hovering or focusing so we can pause the timer.
    var isPaused = false;

    // Build slides
    // Concatenate all slide HTML into one string before injecting it.
    var slidesHtml = "";
    for (var i = 0; i < totalSlides; i++) {
      slidesHtml += buildSlideHtml(CAROUSEL_ITEMS[i], i, totalSlides);
    }
    $track.html(slidesHtml);

    // Build dots
    // Generate one dot per slide, marking the first one as active.
    var dotsHtml = "";
    for (var d = 0; d < totalSlides; d++) {
      dotsHtml += buildDotHtml(d, d === 0);
    }
    $dotsContainer.html(dotsHtml);

    /**
     * Move the carousel track to show the slide at the given index.
     * Also updates ARIA attributes and dot active states.
     * @param {number} index - Target slide index (0-based)
     */
    function goToSlide(index) {
      // Wrap around so navigation loops from last slide back to first and vice versa.
      if (index < 0) {
        index = totalSlides - 1;
      } else if (index >= totalSlides) {
        index = 0;
      }

      // Save the new position so other functions know which slide is active.
      currentIndex = index;

      // Shift the track left by one full slide width for each step past the first.
      $track.css("transform", "translateX(-" + (currentIndex * 100) + "%)");

      // Tell screen readers which slide is now in view.
      $carousel.attr(
        "aria-label",
        "Featured menu items - slide " + (currentIndex + 1) + " of " + totalSlides
      );

      // Update dots — only the dot for the current slide should be highlighted.
      $dotsContainer.find(".carousel-dot").each(function (i) {
        var isActive = i === currentIndex;
        $(this)
          .toggleClass("active", isActive)
          .attr("aria-selected", String(isActive));
      });
    }

    /**
     * Advance to the next slide.
     */
    function nextSlide() {
      // Move forward by one position (wraps automatically inside goToSlide).
      goToSlide(currentIndex + 1);
    }

    /**
     * Go back to the previous slide.
     */
    function prevSlide() {
      // Move backward by one position (wraps automatically inside goToSlide).
      goToSlide(currentIndex - 1);
    }

    /**
     * Start the auto-play interval if not already running.
     */
    function startAutoPlay() {
      // Do nothing if the timer is already active to avoid duplicate intervals.
      if (autoPlayTimer) {
        return;
      }
      // Advance the slide on each tick unless the user has paused interaction.
      autoPlayTimer = setInterval(function () {
        if (!isPaused) {
          nextSlide();
        }
      }, AUTO_PLAY_DELAY);
    }

    /**
     * Stop the auto-play interval.
     */
    function stopAutoPlay() {
      // Only attempt to clear the timer if one is actually running.
      if (autoPlayTimer) {
        clearInterval(autoPlayTimer);
        // Null the reference so startAutoPlay knows it is safe to create a new one.
        autoPlayTimer = null;
      }
    }

    // Wire up the previous button to step back one slide on click.
    $btnPrev.on("click", function () {
      prevSlide();
    });

    // Wire up the next button to step forward one slide on click.
    $btnNext.on("click", function () {
      nextSlide();
    });

    // Dot clicks — jump directly to whichever slide the clicked dot represents.
    $dotsContainer.on("click", ".carousel-dot", function () {
      var targetIndex = parseInt($(this).data("dot-index"), 10);
      goToSlide(targetIndex);
    });

    // Keyboard navigation: Left/Right arrows when carousel or its children have focus
    $carousel.on("keydown", function (event) {
      // Let the left arrow key move to the previous slide.
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        prevSlide();
      // Let the right arrow key move to the next slide.
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        nextSlide();
      }
    });

    // Pause auto-play on hover so users can read without the slide changing
    $carousel.on("mouseenter focusin", function () {
      isPaused = true;
    });

    // Resume auto-play once the user moves away or removes keyboard focus.
    $carousel.on("mouseleave focusout", function () {
      isPaused = false;
    });

    // Place the carousel on the first slide and kick off the auto-advance timer.
    goToSlide(0);
    startAutoPlay();
  }

  // Wait for DOM ready
  $(document).ready(function () {
    initCarousel();
  });
})(jQuery);
