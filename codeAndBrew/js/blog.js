/**
 * Code & Brew - Blog Section
 * Handles article rendering, category filtering, read-more expansion,
 * and load-more pagination.
 *
 * Data uses a generic authorName string so it can later link to
 * user profile objects once the login/profile feature merges.
 *
 * @format
 */

(function ($) {
	"use strict";

	/** Number of articles to show per page */
	var ARTICLES_PER_PAGE = 3;

	/**
	 * Article data store
	 * Each article has an authorId placeholder for future profile linking.
	 * @type {Array<Object>}
	 */
	var ARTICLES = [
		{
			id: 1,
			title: "The Art of Pour Over: A Beginner's Guide",
			excerpt:
				"Pour over coffee is more than a brewing method — it's a ritual. Learn the basics and start your morning with intention.",
			fullText:
				"Pour over coffee has become a staple in specialty coffee shops around the world, and for good reason. The method gives you complete control over every variable: water temperature, pour speed, grind size, and brew time. Start with a medium-fine grind, heat your water to about 205°F, and pour in slow, concentric circles. The bloom — that initial pour where the grounds puff up — releases CO2 and sets the stage for a clean, nuanced cup. At Code & Brew, we recommend starting with our single-origin Ethiopian beans for a bright, fruity first pour over experience.",
			category: "brewing-tips",
			categoryLabel: "Brewing Tips",
			icon: "☕",
			authorName: "Blue (MavScriptBlu)",
			authorId: null,
			date: "2026-02-10",
		},
		{
			id: 2,
			title: "How Code & Brew Became Our Second Office",
			excerpt:
				"A group of local developers share how they found community, focus, and great coffee at Code & Brew.",
			fullText:
				"When our four-person startup needed a change of scenery from the cramped apartment we were working in, we stumbled into Code & Brew on a rainy Tuesday. The Wi-Fi was fast, the outlets were plentiful, and the cappuccinos were outstanding. Within a week we had a regular table. Within a month, we had met three other dev teams who worked there. The staff never rushed us out, the ambient noise was just right for focus, and the pastry chef Quinton started learning our orders. Six months later, Code & Brew isn't just where we work — it's where we belong.",
			category: "customer-stories",
			categoryLabel: "Customer Stories",
			icon: "👥",
			authorName: "Jordan M.",
			authorId: null,
			date: "2026-02-05",
		},
		{
			id: 3,
			title: "Single Origin vs. Blends: What's the Difference?",
			excerpt:
				"Understanding the beans in your cup can change how you taste coffee forever. Here's a breakdown of origins versus blends.",
			fullText:
				"Single origin coffees come from one specific region, farm, or lot. They showcase the terroir — the unique flavor fingerprint of the soil, altitude, and climate where they were grown. You might taste blueberry notes in an Ethiopian Yirgacheffe or chocolate undertones in a Colombian Huila. Blends, on the other hand, combine beans from multiple origins to create a balanced, consistent flavor profile. Neither is better; they serve different purposes. At Code & Brew, our house espresso is a blend designed for a smooth, rich shot, while our rotating single origins on pour over highlight what makes each region special.",
			category: "coffee-culture",
			categoryLabel: "Coffee Culture",
			icon: "🌍",
			authorName: "Seng",
			authorId: null,
			date: "2026-01-28",
		},
		{
			id: 4,
			title: "Cold Brew at Home: The 24-Hour Secret",
			excerpt:
				"Our baristas share the exact recipe behind the smooth, bold cold brew that keeps customers coming back.",
			fullText:
				"The secret to our cold brew is patience. We use a coarse grind — think sea salt texture — and a 1:8 coffee-to-water ratio. Combine them in a large jar or pitcher, give it a gentle stir, and refrigerate for 24 hours. No heat, no rush. After steeping, strain through a fine mesh sieve lined with cheesecloth. The result is a concentrate you can dilute with water or milk to taste. It's naturally sweeter and lower in acidity than hot-brewed coffee. Pro tip: make a double batch on Sunday and you'll have smooth cold brew all week.",
			category: "brewing-tips",
			categoryLabel: "Brewing Tips",
			icon: "🧊",
			authorName: "Tyler",
			authorId: null,
			date: "2026-01-20",
		},
		{
			id: 5,
			title: "From Burnout to Balance: A Developer's Coffee Journey",
			excerpt:
				"One regular shares how slowing down for a good cup of coffee helped her rethink work-life balance.",
			fullText:
				"I used to drink coffee like fuel — fast, forgettable, and from a pod machine. I was burning through 60-hour weeks and my code was suffering. A coworker dragged me to Code & Brew one afternoon and ordered me a cortado. I watched the barista pull the shot, steam the milk, and pour it with care. That four-ounce drink took five minutes to make and ten minutes to enjoy, and it was the first time in months I actually paused. Now I come in every morning before stand-up. That 20-minute ritual — ordering, waiting, sipping — resets my brain. My code reviews are cleaner, my PRs are smaller, and I actually enjoy my mornings again.",
			category: "customer-stories",
			categoryLabel: "Customer Stories",
			icon: "💻",
			authorName: "Priya K.",
			authorId: null,
			date: "2026-01-15",
		},
		{
			id: 6,
			title: "The Third Wave: How Specialty Coffee Changed Everything",
			excerpt:
				"From commodity to craft — a look at the movement that transformed how the world drinks coffee.",
			fullText:
				"The first wave of coffee was about access: instant coffee, diner pots, Maxwell House. The second wave, led by chains like Starbucks, introduced espresso drinks and the coffeehouse experience to the mainstream. The third wave treats coffee like wine — emphasizing origin, processing method, roast profile, and brewing technique. It's the reason you see tasting notes on bags and baristas competing in latte art championships. At Code & Brew, we source from third-wave roasters who pay fair prices to farmers and roast in small batches. Every cup tells a story that stretches from a hillside in Guatemala to your table in Stevens Point.",
			category: "coffee-culture",
			categoryLabel: "Coffee Culture",
			icon: "✨",
			authorName: "Blue (MavScriptBlu)",
			authorId: null,
			date: "2026-01-08",
		},
	];

	/** Current active category filter */
	var activeCategory = "all";

	/** Number of articles currently visible */
	var visibleCount = ARTICLES_PER_PAGE;

	/**
	 * Get articles filtered by the active category, sorted by date descending
	 * @returns {Array<Object>} Filtered articles sorted by date descending
	 */
	function getFilteredArticles() {
		// Start with either all articles or just the ones in the chosen category.
		var filtered;

		// If no filter is active, work with a copy of the full list.
		if (activeCategory === "all") {
			filtered = ARTICLES.slice();
		} else {
			// Keep only articles whose category matches the selected filter.
			filtered = ARTICLES.filter(function (article) {
				return article.category === activeCategory;
			});
		}

		// Sort by date descending (newest first). Dates are ISO strings (YYYY-MM-DD),
		// so string comparison is sufficient for chronological ordering.
		filtered.sort(function (a, b) {
			return b.date.localeCompare(a.date);
		});

		// Hand back the ready-to-display list.
		return filtered;
	}

	/**
	 * Escape a string for safe insertion into HTML
	 * @param {string} str - Raw string to escape
	 * @returns {string} HTML-escaped string
	 */
	function escapeHtml(str) {
		// Return an empty string rather than crashing on null or undefined input.
		if (str == null) {
			return "";
		}
		// Replace every character that has special meaning in HTML with its safe equivalent.
		return String(str)
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#39;");
	}

	/**
	 * Format an ISO date string to a readable format
	 * @param {string} isoDate - Date string in YYYY-MM-DD format
	 * @returns {string} Formatted date (e.g., "Feb 10, 2026")
	 */
	function formatDate(isoDate) {
		// Split the date string into its year, month, and day parts.
		var parts = isoDate.split("-");
		// Build a real Date object so we can query its month name.
		var date = new Date(
			parseInt(parts[0], 10),
			// Months are zero-indexed in JavaScript, so subtract 1.
			parseInt(parts[1], 10) - 1,
			parseInt(parts[2], 10)
		);
		// Human-readable month abbreviations in calendar order.
		var months = [
			"Jan", "Feb", "Mar", "Apr", "May", "Jun",
			"Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
		];
		// Combine the month abbreviation, day number, and full year into one string.
		return months[date.getMonth()] + " " + date.getDate() + ", " + date.getFullYear();
	}

	/**
	 * Build the HTML string for a single article card
	 * @param {Object} article - Article data object
	 * @returns {string} HTML string for the card
	 */
	function buildCardHtml(article) {
		// Sanitize every piece of article data before placing it inside HTML.
		var id = escapeHtml(article.id);
		var category = escapeHtml(article.category);
		var categoryLabel = escapeHtml(article.categoryLabel);
		var title = escapeHtml(article.title);
		var excerpt = escapeHtml(article.excerpt);
		var fullText = escapeHtml(article.fullText);
		var authorName = escapeHtml(article.authorName);
		var date = escapeHtml(article.date);
		var icon = escapeHtml(article.icon);
		// Assemble and return the complete card HTML as a single string.
		return (
			'<article class="blog-card" data-category="' + category + '" aria-label="' + title + '">' +
				'<div class="blog-card-thumb ' + category + '" aria-hidden="true">' +
					'<span>' + icon + '</span>' +
					'<span class="blog-card-category">' + categoryLabel + '</span>' +
				'</div>' +
				'<div class="blog-card-body">' +
					'<h3 class="blog-card-title">' + title + '</h3>' +
					'<p class="blog-card-excerpt">' + excerpt + '</p>' +
					'<div class="blog-card-full" id="blogFull-' + id + '">' +
						'<p>' + fullText + '</p>' +
					'</div>' +
					'<button class="blog-read-more" type="button" ' +
						'aria-expanded="false" ' +
						'aria-controls="blogFull-' + id + '" ' +
						'data-article-id="' + id + '">' +
						'Read More &rarr;' +
					'</button>' +
					'<div class="blog-card-meta">' +
						'<span class="blog-card-author">' + authorName + '</span>' +
						'<time class="blog-card-date" datetime="' + date + '">' +
							formatDate(article.date) +
						'</time>' +
					'</div>' +
				'</div>' +
			'</article>'
		);
	}

	/**
	 * Render article cards into the blog grid
	 * Applies current category filter and visible count
	 */
	function renderArticles() {
		// Grab the elements we will be updating during this render.
		var $grid = $("#blogGrid");
		var $empty = $("#blogEmpty");
		var $loadMore = $("#blogLoadMore");
		var $status = $("#blogStatus");

		// Get the articles that match the current filter, newest first.
		var filtered = getFilteredArticles();
		// Only show as many articles as the current pagination limit allows.
		var toShow = filtered.slice(0, visibleCount);

		// Remove all previously rendered cards so we start fresh.
		$grid.empty();

		// If there is nothing to show, reveal the empty-state message and stop.
		if (toShow.length === 0) {
			$empty.removeAttr("hidden");
			$loadMore.hide();
			$status.text("No articles found.");
			return;
		}

		// Hide the empty-state message since we have results to display.
		$empty.attr("hidden", "");

		// Build and insert cards
		// Concatenate HTML for all visible articles, then inject them in one go.
		var html = "";
		for (var i = 0; i < toShow.length; i++) {
			html += buildCardHtml(toShow[i]);
		}
		$grid.html(html);

		// Announce result count to screen readers
		$status.text("Showing " + toShow.length + " of " + filtered.length + " articles.");

		// Hide the load-more button once every filtered article is already visible.
		if (visibleCount >= filtered.length) {
			$loadMore.hide();
		} else {
			// More articles exist beyond what is shown — keep the button visible.
			$loadMore.show();
		}
	}

	/**
	 * Handle category filter button clicks
	 * @param {Event} event - Click event from a filter button
	 */
	function handleFilterClick(event) {
		// Identify which filter button was clicked.
		var $btn = $(event.currentTarget);
		var category = $btn.data("category");

		// Remove the active highlight from every button, then highlight only the one just clicked.
		$(".blog-filter-btn")
			.removeClass("active")
			.attr("aria-pressed", "false");
		$btn.addClass("active").attr("aria-pressed", "true");

		// Apply the new filter and reset to the first page of results.
		activeCategory = category;
		visibleCount = ARTICLES_PER_PAGE;

		// Redraw the grid with the updated filter applied.
		renderArticles();
	}

	/**
	 * Handle "Read More" button clicks to expand/collapse article content
	 * @param {Event} event - Click event from a read-more button
	 */
	function handleReadMore(event) {
		// Find the button that was clicked and which article it belongs to.
		var $btn = $(event.currentTarget);
		var articleId = $btn.data("article-id");
		// Locate the hidden full-text block for this article.
		var $fullContent = $("#blogFull-" + articleId);
		// Check whether the full text is currently showing.
		var isExpanded = $btn.attr("aria-expanded") === "true";

		// If it is already open, collapse it and restore the "Read More" label.
		if (isExpanded) {
			$fullContent.removeClass("visible");
			$btn.attr("aria-expanded", "false").html("Read More &rarr;");
		} else {
			// Otherwise open it and switch the button label to "Read Less".
			$fullContent.addClass("visible");
			$btn.attr("aria-expanded", "true").html("Read Less &larr;");
		}
	}

	/**
	 * Handle "Load More" button click to show additional articles
	 */
	function handleLoadMore() {
		// Expand the visible window by one page worth of articles.
		visibleCount += ARTICLES_PER_PAGE;
		// Re-render to show the newly unlocked articles.
		renderArticles();
	}

	/**
	 * Initialize blog section event handlers and render initial articles
	 */
	function initBlog() {
		// Bail out silently if the blog section does not exist on this page.
		var $blogSection = $("#blog");
		if ($blogSection.length === 0) {
			return;
		}

		// Draw the first batch of articles when the page loads.
		renderArticles();

		// Filter buttons (event delegation for performance)
		// Use delegation so we only need one listener on the parent container.
		$(".blog-filters").on("click", ".blog-filter-btn", handleFilterClick);

		// Read more buttons (delegated since cards are dynamically rendered)
		// Delegation is essential here because cards are rebuilt on every render.
		$("#blogGrid").on("click", ".blog-read-more", handleReadMore);

		// Wire up the load-more button to expand the list of visible articles.
		$("#loadMoreBtn").on("click", handleLoadMore);
	}

	// Wait for DOM ready
	$(document).ready(function () {
		initBlog();
	});
})(jQuery);
