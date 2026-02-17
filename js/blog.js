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
				"Pour over coffee has become a staple in specialty coffee shops around the world, and for good reason. The method gives you complete control over every variable: water temperature, pour speed, grind size, and brew time. Start with a medium-fine grind, heat your water to about 205\u00B0F, and pour in slow, concentric circles. The bloom — that initial pour where the grounds puff up — releases CO2 and sets the stage for a clean, nuanced cup. At Code & Brew, we recommend starting with our single-origin Ethiopian beans for a bright, fruity first pour over experience.",
			category: "brewing-tips",
			categoryLabel: "Brewing Tips",
			icon: "\u2615",
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
			icon: "\uD83D\uDC65",
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
			icon: "\uD83C\uDF0D",
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
			icon: "\uD83E\uDDCA",
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
			icon: "\uD83D\uDCBB",
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
			icon: "\u2728",
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
	 * Get articles filtered by the active category
	 * @returns {Array<Object>} Filtered articles sorted by date descending
	 */
	function getFilteredArticles() {
		if (activeCategory === "all") {
			return ARTICLES.slice();
		}
		return ARTICLES.filter(function (article) {
			return article.category === activeCategory;
		});
	}

	/**
	 * Format an ISO date string to a readable format
	 * @param {string} isoDate - Date string in YYYY-MM-DD format
	 * @returns {string} Formatted date (e.g., "Feb 10, 2026")
	 */
	function formatDate(isoDate) {
		var parts = isoDate.split("-");
		var date = new Date(
			parseInt(parts[0], 10),
			parseInt(parts[1], 10) - 1,
			parseInt(parts[2], 10)
		);
		var months = [
			"Jan", "Feb", "Mar", "Apr", "May", "Jun",
			"Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
		];
		return months[date.getMonth()] + " " + date.getDate() + ", " + date.getFullYear();
	}

	/**
	 * Build the HTML string for a single article card
	 * @param {Object} article - Article data object
	 * @returns {string} HTML string for the card
	 */
	function buildCardHtml(article) {
		return (
			'<article class="blog-card" data-category="' + article.category + '" aria-label="' + article.title + '">' +
				'<div class="blog-card-thumb ' + article.category + '" aria-hidden="true">' +
					'<span>' + article.icon + '</span>' +
					'<span class="blog-card-category">' + article.categoryLabel + '</span>' +
				'</div>' +
				'<div class="blog-card-body">' +
					'<h3 class="blog-card-title">' + article.title + '</h3>' +
					'<p class="blog-card-excerpt">' + article.excerpt + '</p>' +
					'<div class="blog-card-full" id="blogFull-' + article.id + '">' +
						'<p>' + article.fullText + '</p>' +
					'</div>' +
					'<button class="blog-read-more" type="button" ' +
						'aria-expanded="false" ' +
						'aria-controls="blogFull-' + article.id + '" ' +
						'data-article-id="' + article.id + '">' +
						'Read More &rarr;' +
					'</button>' +
					'<div class="blog-card-meta">' +
						'<span class="blog-card-author">' + article.authorName + '</span>' +
						'<time class="blog-card-date" datetime="' + article.date + '">' +
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
		var $grid = $("#blogGrid");
		var $empty = $("#blogEmpty");
		var $loadMore = $("#blogLoadMore");

		var filtered = getFilteredArticles();
		var toShow = filtered.slice(0, visibleCount);

		// Clear grid
		$grid.empty();

		if (toShow.length === 0) {
			$empty.removeAttr("hidden");
			$loadMore.hide();
			return;
		}

		$empty.attr("hidden", "");

		// Build and insert cards
		var html = "";
		for (var i = 0; i < toShow.length; i++) {
			html += buildCardHtml(toShow[i]);
		}
		$grid.html(html);

		// Show/hide load more button
		if (visibleCount >= filtered.length) {
			$loadMore.hide();
		} else {
			$loadMore.show();
		}
	}

	/**
	 * Handle category filter button clicks
	 * @param {Event} event - Click event from a filter button
	 */
	function handleFilterClick(event) {
		var $btn = $(event.currentTarget);
		var category = $btn.data("category");

		// Update active state on buttons
		$(".blog-filter-btn")
			.removeClass("active")
			.attr("aria-pressed", "false");
		$btn.addClass("active").attr("aria-pressed", "true");

		// Apply filter and reset pagination
		activeCategory = category;
		visibleCount = ARTICLES_PER_PAGE;

		renderArticles();
	}

	/**
	 * Handle "Read More" button clicks to expand/collapse article content
	 * @param {Event} event - Click event from a read-more button
	 */
	function handleReadMore(event) {
		var $btn = $(event.currentTarget);
		var articleId = $btn.data("article-id");
		var $fullContent = $("#blogFull-" + articleId);
		var isExpanded = $btn.attr("aria-expanded") === "true";

		if (isExpanded) {
			$fullContent.removeClass("visible");
			$btn.attr("aria-expanded", "false").html("Read More &rarr;");
		} else {
			$fullContent.addClass("visible");
			$btn.attr("aria-expanded", "true").html("Read Less &larr;");
		}
	}

	/**
	 * Handle "Load More" button click to show additional articles
	 */
	function handleLoadMore() {
		visibleCount += ARTICLES_PER_PAGE;
		renderArticles();
	}

	/**
	 * Initialize blog section event handlers and render initial articles
	 */
	function initBlog() {
		var $blogSection = $("#blog");
		if ($blogSection.length === 0) {
			return;
		}

		// Render initial articles
		renderArticles();

		// Filter buttons (event delegation for performance)
		$(".blog-filters").on("click", ".blog-filter-btn", handleFilterClick);

		// Read more buttons (delegated since cards are dynamically rendered)
		$("#blogGrid").on("click", ".blog-read-more", handleReadMore);

		// Load more button
		$("#loadMoreBtn").on("click", handleLoadMore);
	}

	// Wait for DOM ready
	$(document).ready(function () {
		initBlog();
	});
})(jQuery);
