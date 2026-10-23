/* Keep only overflowing table wrappers in the keyboard tab order. */
(() => {
	'use strict';
	const selector = '.wp-block-table[data-dirtbag-table-focus]';
	const tracked = new WeakSet();
	const update = (figure) => {
		if (figure.scrollWidth > figure.clientWidth) {
			if (figure.getAttribute('tabindex') !== '0') figure.setAttribute('tabindex', '0');
		} else {
			figure.removeAttribute('tabindex');
		}
	};
	const observe = (figure) => {
		if (tracked.has(figure)) return;
		tracked.add(figure);
		update(figure);
		if ('ResizeObserver' in window) {
			const observer = new ResizeObserver(() => {
				if (!figure.isConnected) {
					observer.disconnect();
					tracked.delete(figure);
				} else update(figure);
			});
			observer.observe(figure);
			const table = figure.querySelector('table');
			if (table) observer.observe(table);
		}
	};
	const scan = (root) => {
		if (root.matches?.(selector)) observe(root);
		root.querySelectorAll?.(selector).forEach(observe);
	};
	scan(document);
	window.addEventListener('resize', () => document.querySelectorAll(selector).forEach(update));
	// Core's enhanced query pagination can insert new table blocks.
	new MutationObserver((records) => {
		for (const record of records) {
			record.addedNodes.forEach(scan);
			const figure = record.target.closest?.(selector);
			if (figure) update(figure);
		}
	}).observe(document.body, { childList: true, subtree: true });
})();
