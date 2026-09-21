/**
 * Letting the user move the assistant out of the way.
 *
 * The widget is pinned to the bottom-right corner, which is the right place until it
 * is not: a Posse sub-form opens in a window around 700px wide, and a 420px panel
 * over that covers most of the form it is meant to be helping with.
 *
 * Dragging writes inline `left`/`top` and releases the `bottom`/`right` the
 * stylesheet pins things by. That is the whole mechanism - no transforms, because a
 * transformed ancestor turns every `position: fixed` descendant into a containing
 * block of its own, which would quietly re-anchor the tooltip and the menus.
 */

/**
 * Where the dragged positions live.
 *
 * sessionStorage for the same reason as the rest of the widget's state: a Posse form
 * posts back on nearly every interaction and rebuilds the widget from scratch, so a
 * position held in memory would snap back to the corner several times per step.
 *
 * One key holding both boxes rather than a key each - they are read and written
 * together, and a single parse keeps them from disagreeing.
 */
export const WIDGET_POSITIONS_KEY = 'nrAiForm_widgetPositions';

/** How close to a viewport edge a box may be parked. */
const EDGE_MARGIN = 8;

/**
 * How far the pointer must travel before this counts as a drag.
 *
 * The launcher is a button first: a press that wanders a pixel or two is someone
 * clicking, not someone moving, and must still open the chat.
 */
const DRAG_THRESHOLD_PX = 4;

/**
 * Below this width the modal is full-screen by stylesheet, and dragging is off.
 *
 * Mirrors the `@media (max-width: 480px)` block in client.js. Inline offsets would
 * outrank that rule and leave a full-screen panel hanging off the edge with no way
 * to bring it back, so positions are not merely ignored at this width - they are
 * taken off the element, and put back if the viewport grows again.
 */
const COMPACT_VIEWPORT_QUERY = '(max-width: 480px)';

/** Class worn by the document while a drag is in progress. */
const DRAGGING_CLASS = 'wp-drag-active';

function readPositions() {
    try {
        const raw = sessionStorage.getItem(WIDGET_POSITIONS_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        // Storage blocked, or something else wrote nonsense under this key. Starting
        // from the stylesheet's corner is the mild failure either way.
        return {};
    }
}

function writePosition(id, position) {
    try {
        const positions = readPositions();
        if (position) positions[id] = position;
        else delete positions[id];
        sessionStorage.setItem(WIDGET_POSITIONS_KEY, JSON.stringify(positions));
    } catch {
        // Nothing to do - the box stays where it was dragged for this page's life.
    }
}

/** A stored position, or null when there is not a usable one. */
function readPosition(id) {
    const stored = readPositions()[id];
    if (!stored || typeof stored !== 'object') return null;
    const { left, top } = stored;
    if (!Number.isFinite(left) || !Number.isFinite(top)) return null;
    return { left, top };
}

/**
 * Make a fixed-position box draggable.
 *
 * @param {object} options
 * @param {HTMLElement} options.element - the fixed box to move
 * @param {string} options.id - storage slot for this box's position
 * @param {(event: PointerEvent) => boolean} [options.isHandle] - whether a press here
 *   begins a drag. Defaults to anywhere on the element.
 * @param {(rect: DOMRect) => void} [options.onMove] - told where the box ended up,
 *   for anything that has to follow it
 * @returns {{ refresh: () => void, destroy: () => void }}
 */
export function createDraggable({ element, id, isHandle = () => true, onMove = null }) {
    if (!element) return { refresh: () => {}, destroy: () => {} };

    const compact = window.matchMedia(COMPACT_VIEWPORT_QUERY);

    let pointerId = null;
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let grabOffsetX = 0;
    let grabOffsetY = 0;
    let position = readPosition(id);
    let swallowClick = null;

    /**
     * Pull a position back inside the viewport.
     *
     * Load-bearing in more places than a window resize. A popup inherits its opener's
     * sessionStorage as it is created, so a position chosen in a maximised window
     * arrives in a 700px sub-form window pointing off-screen; expanding the chat
     * grows it downward from a `top` that suited the smaller box; and a phone
     * rotating changes both axes at once.
     */
    function clampToViewport(left, top) {
        const rect = element.getBoundingClientRect();
        const maxLeft = Math.max(EDGE_MARGIN, window.innerWidth - rect.width - EDGE_MARGIN);
        const maxTop = Math.max(EDGE_MARGIN, window.innerHeight - rect.height - EDGE_MARGIN);
        return {
            left: Math.min(Math.max(left, EDGE_MARGIN), maxLeft),
            top: Math.min(Math.max(top, EDGE_MARGIN), maxTop)
        };
    }

    /**
     * Anchor the box to its own top-left.
     *
     * `right` and `bottom` are cleared rather than left to be overridden. With a
     * width the stylesheet declares `!important` and all four offsets set, the box is
     * over-constrained, and which edge wins is a CSS tie-break that also flips with
     * writing direction - not something to rest a layout on.
     */
    function applyPosition(next) {
        element.style.left = `${next.left}px`;
        element.style.top = `${next.top}px`;
        element.style.right = 'auto';
        element.style.bottom = 'auto';
        if (onMove) onMove(element.getBoundingClientRect());
    }

    /** Hand the box back to the stylesheet's corner. */
    function clearPosition() {
        element.style.left = '';
        element.style.top = '';
        element.style.right = '';
        element.style.bottom = '';
        if (onMove) onMove(element.getBoundingClientRect());
    }

    /**
     * Re-apply the current position, clamped to what the viewport now is.
     *
     * A box that is not rendered measures zero, and clamping against that would park
     * it in the corner - so it is left alone and picked up again by the resize
     * observer when it comes back.
     */
    function refresh() {
        if (compact.matches) {
            clearPosition();
            return;
        }
        if (!position) return;
        if (!element.getClientRects().length) return;
        position = clampToViewport(position.left, position.top);
        applyPosition(position);
    }

    function onPointerMove(event) {
        if (event.pointerId !== pointerId) return;

        if (!dragging) {
            const travelled =
                Math.abs(event.clientX - startX) >= DRAG_THRESHOLD_PX ||
                Math.abs(event.clientY - startY) >= DRAG_THRESHOLD_PX;
            if (!travelled) return;
            dragging = true;
            document.body.classList.add(DRAGGING_CLASS);
        }

        position = clampToViewport(event.clientX - grabOffsetX, event.clientY - grabOffsetY);
        applyPosition(position);
    }

    function onPointerUp(event) {
        if (event.pointerId !== pointerId) return;

        element.removeEventListener('pointermove', onPointerMove);
        element.removeEventListener('pointerup', onPointerUp);
        element.removeEventListener('pointercancel', onPointerUp);
        try {
            element.releasePointerCapture(pointerId);
        } catch {
            // Capture already gone - the pointer left the window, or the browser took
            // it back. Nothing here depends on releasing it cleanly.
        }
        pointerId = null;

        if (!dragging) return;
        dragging = false;
        document.body.classList.remove(DRAGGING_CLASS);
        writePosition(id, position);

        /**
         * Eat the click this gesture is about to produce.
         *
         * The launcher's whole surface is a button, so letting that click through
         * would open the chat every time the user moved it. Capture phase on the
         * window, so it never reaches the button's own listener.
         */
        swallowClick = (clickEvent) => {
            clickEvent.stopPropagation();
            clickEvent.preventDefault();
            swallowClick = null;
        };
        window.addEventListener('click', swallowClick, { capture: true, once: true });
    }

    function onPointerDown(event) {
        // A drag that produced no click - a touch drag, mostly - would otherwise
        // leave the swallower armed and eat the user's next real click instead.
        if (swallowClick) {
            window.removeEventListener('click', swallowClick, { capture: true });
            swallowClick = null;
        }

        if (compact.matches) return;
        // Primary button only: a right-click is asking for a context menu.
        if (event.button !== 0) return;
        if (pointerId !== null) return;
        if (!isHandle(event)) return;

        const rect = element.getBoundingClientRect();
        pointerId = event.pointerId;
        dragging = false;
        startX = event.clientX;
        startY = event.clientY;
        grabOffsetX = event.clientX - rect.left;
        grabOffsetY = event.clientY - rect.top;

        try {
            element.setPointerCapture(pointerId);
        } catch {
            // Without capture the drag still works while the pointer stays over the
            // element, which is the common case; it just stops if it runs off.
        }
        element.addEventListener('pointermove', onPointerMove);
        element.addEventListener('pointerup', onPointerUp);
        element.addEventListener('pointercancel', onPointerUp);
    }

    element.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('resize', refresh);
    window.addEventListener('orientationchange', refresh);

    // Catches what a resize listener does not: the chat opening, the expand toggle
    // changing the panel's height, the launcher coming back when the chat is closed.
    // Applying a position never changes a size, so this cannot feed itself.
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(refresh);
    if (observer) observer.observe(element);

    // Older Safari has addListener only, and the handler is idempotent, so there is
    // nothing to weigh up beyond which one exists.
    if (typeof compact.addEventListener === 'function') compact.addEventListener('change', refresh);
    else if (typeof compact.addListener === 'function') compact.addListener(refresh);

    refresh();

    return {
        refresh,
        destroy() {
            element.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('resize', refresh);
            window.removeEventListener('orientationchange', refresh);
            if (observer) observer.disconnect();
        }
    };
}
