/**
 * Floating launcher button and its first-visit helper message.
 *
 * The button is always present. The message beside it appears once, to make help
 * discoverable, and gets out of the way the moment the user does anything at all -
 * the point is to be noticed, not to be dismissed.
 */

/**
 * Marks the helper message as already shown.
 *
 * sessionStorage rather than localStorage: "first landing" should mean once per
 * visit, not once ever. It also has to survive the form's full-page postbacks, which
 * rebuild the widget from scratch - keeping this in memory would re-show the message
 * on every Next/Save, which is exactly the interruption the story rules out.
 */
export const LAUNCHER_TOOLTIP_SEEN_KEY = 'nrAiForm_launcherTooltipSeen';

export const LAUNCHER_CONTENT = {
    /**
     * An offer, not a product name. The button is the only part of the assistant a
     * user sees before opening it, so it reads as the question they would ask rather
     * than the name of the thing that answers - the name is introduced inside, where
     * there is room to say what it is. PRODUCT_NAME is deliberately not used here.
     */
    label: 'How can I help?',
    tooltip: 'Select the icon at any time for help with your application.',
    /**
     * Said quietly under the message, because dragging is not what this button is
     * for - it is what to do when the button is in the way. It sits in the bubble
     * rather than on a native tooltip so it cannot fight the bubble for the same
     * hover, and it is second so a user who only reads the first line loses nothing.
     */
    dragHint: 'Drag to move it out of the way.',
    dismissLabel: 'Dismiss this message'
};

// Material close - the same X the popup banner dismisses with, so the two ways out
// of the same message look like the same control.
const DISMISS_ICON = `<svg class="wp-chat-launcher-tooltip-dismiss-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`;

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

/** True when the message under this key has not been shown in this session yet. */
function shouldShowTooltip(seenKey) {
    try {
        return !sessionStorage.getItem(seenKey);
    } catch {
        // Storage blocked (private mode, cookie policy). Showing the message is the
        // safer failure: worst case it reappears, rather than never appearing.
        return true;
    }
}

function markTooltipSeen(seenKey) {
    try {
        sessionStorage.setItem(seenKey, '1');
    } catch {
        // Nothing to do - the message simply may show again on the next page.
    }
}

/**
 * Build the launcher markup.
 *
 * The message is rendered hidden and revealed by createLauncher() only when this
 * session has not seen it, so a postback cannot flash it before the check runs.
 */
export function buildLauncherHtml(content = LAUNCHER_CONTENT) {
    return `
        <div class="wp-chat-launcher" id="wp-chat-launcher">
            <div class="wp-chat-launcher-tooltip" id="wp-chat-launcher-tooltip" role="status" hidden>
                <div class="wp-chat-launcher-tooltip-body"><span class="wp-chat-launcher-tooltip-text">${escapeHtml(content.tooltip)}</span><span class="wp-chat-launcher-tooltip-hint">${escapeHtml(content.dragHint)}</span><button class="wp-chat-launcher-tooltip-dismiss" id="wp-chat-launcher-tooltip-dismiss" type="button" aria-label="${escapeHtml(content.dismissLabel)}" title="${escapeHtml(content.dismissLabel)}">${DISMISS_ICON}</button></div>
                <span class="wp-chat-launcher-tooltip-arrow"></span>
            </div>
            <button class="wp-chat-button" id="wp-chat-button" type="button"><span class="wp-chat-button-label">${escapeHtml(content.label)}</span><span class="wp-chat-launcher-badge" id="wp-chat-launcher-badge" aria-hidden="true" hidden>*</span></button>
        </div>`;
}

/**
 * Show the helper message if this session has not seen it, and retire it on the
 * first sign of activity.
 *
 * Listeners are capture-phase and passive so they observe the interaction without
 * changing it, and they remove themselves after firing once.
 *
 * A `notice` replaces the first-visit message with a one-off of its own and marks
 * the button with an asterisk. It is not queued behind the first-visit message:
 * both occupy the same spot, and a notice is true only right now, whereas the
 * first-visit message is the same on any page the user reaches later.
 *
 * @param {object} options
 * @param {HTMLElement} options.root - element containing the launcher markup
 * @param {object} [options.content] - the content object the launcher was built from
 * @param {{ text: string, seenKey: string }} [options.notice] - message to show in
 *   place of the first-visit one, under its own seen-key, with the asterisk
 * @returns {{ hideTooltip: () => void, hideNotice: () => void, setMessage: (text: string|null) => void }}
 */
export function createLauncher({ root, content = LAUNCHER_CONTENT, notice = null }) {
    const tooltip = root ? root.querySelector('#wp-chat-launcher-tooltip') : null;
    const badge = root ? root.querySelector('#wp-chat-launcher-badge') : null;
    if (!tooltip) return { hideTooltip: () => {}, hideNotice: () => {}, setMessage: () => {} };

    // The message's own line, not the whole bubble: the drag hint is a sibling
    // inside it, and rewriting the bubble's text would take the hint with it.
    const tooltipBody = tooltip.querySelector('.wp-chat-launcher-tooltip-text');
    const dismissButton = tooltip.querySelector('#wp-chat-launcher-tooltip-dismiss');
    const message = notice ? notice.text : content.tooltip;
    const seenKey = notice ? notice.seenKey : LAUNCHER_TOOLTIP_SEEN_KEY;
    if (notice && tooltipBody) tooltipBody.textContent = message;

    // Whether something is currently saying the bubble should read otherwise.
    let overriding = false;

    // Anything that counts as the user getting on with their work.
    const DISMISS_EVENTS = ['scroll', 'click', 'keydown', 'touchstart', 'wheel', 'pointerdown'];

    function hideTooltip() {
        if (tooltip.hidden) return;
        tooltip.hidden = true;
        markTooltipSeen(seenKey);
        DISMISS_EVENTS.forEach((eventName) => {
            document.removeEventListener(eventName, hideTooltip, true);
        });
    }

    /**
     * Retire the notice for good.
     *
     * The asterisk outlives the message on purpose - the message steps aside as soon
     * as the user gets on with their work, and the asterisk is then the only thing
     * left saying there is something here to come back to. Both go once the user has
     * actually opened the chat, which is what the notice was asking for.
     */
    function hideNotice() {
        if (badge) badge.hidden = true;
        hideTooltip();
    }

    /**
     * Say something else for as long as it is true, then put the message back.
     *
     * The launcher's own message invites a click, so it is the wrong thing to be
     * offering while the button is out of use - and `disabled` does not silence it,
     * because the message is revealed by hovering the wrapper rather than the button.
     *
     * Only the wording changes here. Whether the bubble is showing, and whether hover
     * brings it back, stays the launcher's business; a caller saying what it should
     * read while something holds is not saying when it should appear.
     *
     * @param {string|null} text - the message to show, or null to restore the usual one
     */
    function setMessage(text) {
        if (!tooltipBody) return;
        if (text) {
            tooltipBody.textContent = text;
            overriding = true;
        } else if (overriding) {
            // Restored from the value captured at build time, never read back off the
            // element, so one override cannot become what the next one restores.
            tooltipBody.textContent = message;
            overriding = false;
        }
    }

    /**
     * A way out that the user chooses, rather than one that happens to them.
     *
     * The message already steps aside at the first sign of activity, so this button
     * changes no outcome - it changes who decided. A message with no visible way to
     * close it reads as something stuck there, which is the opposite of what a note
     * offering help should feel like.
     *
     * The click almost always arrives after the fact: the dismissal listeners above
     * watch `pointerdown` on the document, so the bubble is usually gone before this
     * fires at all. Wired anyway, because the button working must not depend on the
     * contents of that list.
     *
     * The asterisk is left alone. Dismissing the message is not the same as having
     * opened the chat, and the asterisk is what still says there is something here.
     */
    if (dismissButton) {
        dismissButton.addEventListener('click', hideTooltip);
    }

    // The asterisk is shown even where the message is not: a user returning after a
    // postback has already had the message dismissed out from under them.
    if (notice && badge) badge.hidden = false;

    if (!shouldShowTooltip(seenKey)) {
        return { hideTooltip, hideNotice, setMessage };
    }

    tooltip.hidden = false;
    DISMISS_EVENTS.forEach((eventName) => {
        document.addEventListener(eventName, hideTooltip, { capture: true, passive: true });
    });

    return { hideTooltip, hideNotice, setMessage };
}
