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
   * Each item must include: name, description, price, emoji, category, visualClass, menuAnchor.
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
    if (str == null) {
      return "";
    }
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
    var name = escapeHtml(item.name);
    var description = escapeHtml(item.description);
    var price = escapeHtml(item.price);
    var category = escapeHtml(item.category);
    var emoji = escapeHtml(item.emoji);
    var visualClass = escapeHtml(item.visualClass);
    var slideNumber = index + 1;

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
    var activeClass = isActive ? " active" : "";
    var ariaSelected = isActive ? "true" : "false";
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
    var $carousel = $("#featuredCarousel");
    if ($carousel.length === 0) {
      return;
    }

    var $track = $carousel.find(".carousel-track");
    var $dotsContainer = $carousel.find(".carousel-dots");
    var $btnPrev = $carousel.find(".carousel-btn--prev");
    var $btnNext = $carousel.find(".carousel-btn--next");

    var totalSlides = CAROUSEL_ITEMS.length;
    var currentIndex = 0;
    var autoPlayTimer = null;
    var isPaused = false;

    // Build slides
    var slidesHtml = "";
    for (var i = 0; i < totalSlides; i++) {
      slidesHtml += buildSlideHtml(CAROUSEL_ITEMS[i], i, totalSlides);
    }
    $track.html(slidesHtml);

    // Build dots
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
      // Wrap around
      if (index < 0) {
        index = totalSlides - 1;
      } else if (index >= totalSlides) {
        index = 0;
      }

      currentIndex = index;

      // Translate the track
      $track.css("transform", "translateX(-" + (currentIndex * 100) + "%)");

      // Update ARIA on the carousel region
      $carousel.attr(
        "aria-label",
        "Featured menu items - slide " + (currentIndex + 1) + " of " + totalSlides
      );

      // Update dots
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
      goToSlide(currentIndex + 1);
    }

    /**
     * Go back to the previous slide.
     */
    function prevSlide() {
      goToSlide(currentIndex - 1);
    }

    /**
     * Start the auto-play interval if not already running.
     */
    function startAutoPlay() {
      if (autoPlayTimer) {
        return;
      }
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
      if (autoPlayTimer) {
        clearInterval(autoPlayTimer);
        autoPlayTimer = null;
      }
    }

    // Prev / Next button clicks
    $btnPrev.on("click", function () {
      prevSlide();
    });

    $btnNext.on("click", function () {
      nextSlide();
    });

    // Dot clicks
    $dotsContainer.on("click", ".carousel-dot", function () {
      var targetIndex = parseInt($(this).data("dot-index"), 10);
      goToSlide(targetIndex);
    });

    // Keyboard navigation: Left/Right arrows when carousel or its children have focus
    $carousel.on("keydown", function (event) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        prevSlide();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        nextSlide();
      }
    });

    // Pause auto-play on hover so users can read without the slide changing
    $carousel.on("mouseenter focusin", function () {
      isPaused = true;
    });

    $carousel.on("mouseleave focusout", function () {
      isPaused = false;
    });

    // Set initial position and start auto-play
    goToSlide(0);
    startAutoPlay();
  }

  // Wait for DOM ready
  $(document).ready(function () {
    initCarousel();
  });
})(jQuery);
