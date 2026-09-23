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
    closeLabel: 'Hide the assistant'
};

/**
 * Remembers that the user put the assistant away.
 *
 * sessionStorage for the same reason as the message above: the form posts back on
 * every Next and Save, and a button the user closed reappearing a moment later is
 * not a button that closed. Cleared the moment the chat is opened again, so the
 * assistant can never be gone for good - see clearHidden().
 */
export const LAUNCHER_HIDDEN_KEY = 'nrAiForm_launcherHidden';

// Material close - the same X the popup banner dismisses with, so the two ways out
// of the assistant look like the same control.
const CLOSE_ICON = `<svg class="wp-chat-launcher-close-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`;

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

/** True when the user closed the launcher earlier in this session. */
export function isLauncherHidden() {
    try {
        return !!sessionStorage.getItem(LAUNCHER_HIDDEN_KEY);
    } catch {
        // Storage blocked. Showing the launcher is the safer failure here - the
        // opposite one hides the only way in to the assistant.
        return false;
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
 *
 * The close control is a sibling of the button rather than something inside it: a
 * <button> cannot contain another one, and putting the X in the button's own content
 * would fold "Hide the assistant" into the accessible name of the control that opens
 * it. The bar exists solely to give the X a box to be positioned against, so that
 * hanging it off the corner does not move the card it belongs to.
 */
export function buildLauncherHtml(content = LAUNCHER_CONTENT) {
    return `
        <div class="wp-chat-launcher" id="wp-chat-launcher">
            <div class="wp-chat-launcher-tooltip" id="wp-chat-launcher-tooltip" role="status" hidden>
                <div class="wp-chat-launcher-tooltip-body"><span class="wp-chat-launcher-tooltip-text">${escapeHtml(content.tooltip)}</span><span class="wp-chat-launcher-tooltip-hint">${escapeHtml(content.dragHint)}</span></div>
                <span class="wp-chat-launcher-tooltip-arrow"></span>
            </div>
            <div class="wp-chat-launcher-bar">
                <button class="wp-chat-button" id="wp-chat-button" type="button"><span class="wp-chat-button-label">${escapeHtml(content.label)}</span><span class="wp-chat-launcher-badge" id="wp-chat-launcher-badge" aria-hidden="true" hidden>*</span></button>
                <button class="wp-chat-launcher-close" id="wp-chat-launcher-close" type="button" aria-label="${escapeHtml(content.closeLabel)}" title="${escapeHtml(content.closeLabel)}">${CLOSE_ICON}</button>
            </div>
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
 * @returns {{ hideTooltip: () => void, hideNotice: () => void,
 *   setMessage: (text: string|null) => void, hideLauncher: () => void,
 *   clearHidden: () => void, isHidden: () => boolean }}
 */
export function createLauncher({ root, content = LAUNCHER_CONTENT, notice = null }) {
    const tooltip = root ? root.querySelector('#wp-chat-launcher-tooltip') : null;
    const badge = root ? root.querySelector('#wp-chat-launcher-badge') : null;
    if (!tooltip) {
        return {
            hideTooltip: () => {},
            hideNotice: () => {},
            setMessage: () => {},
            hideLauncher: () => {},
            clearHidden: () => {},
            isHidden: () => false
        };
    }

    // The message's own line, not the whole bubble: the drag hint is a sibling
    // inside it, and rewriting the bubble's text would take the hint with it.
    const tooltipBody = tooltip.querySelector('.wp-chat-launcher-tooltip-text');
    // Found from the tooltip rather than from `root`, which callers pass either as
    // the launcher itself or as a container around it.
    const launcher = tooltip.closest('.wp-chat-launcher');
    const closeButton = launcher ? launcher.querySelector('#wp-chat-launcher-close') : null;
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
        // Hold the hover rule off until the pointer has actually left. The click that
        // retires this bubble is usually a click on the launcher itself, so without
        // this the bubble is hidden and handed straight back by :hover in the same
        // frame, and nothing appears to have happened.
        if (launcher) launcher.classList.add('wp-chat-launcher-dismissed');
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
     * Put the assistant away.
     *
     * The whole wrapper goes, not just the button - the bubble is anchored to the
     * button and would otherwise be left floating over the form on its own.
     *
     * Hiding is written down rather than only done, because the form posts back on
     * every Next and Save and rebuilds this widget from scratch. Without the record,
     * closing the launcher would last until the next click on the form.
     */
    function hideLauncher() {
        if (!launcher) return;
        hideTooltip();
        launcher.style.display = 'none';
        try {
            sessionStorage.setItem(LAUNCHER_HIDDEN_KEY, '1');
        } catch {
            // Storage blocked. It is closed for this page, and comes back on the
            // next postback - worse than intended, but not a stuck button.
        }
    }

    /**
     * Forget that it was ever closed.
     *
     * Called when the chat is opened by any route, which is what keeps closing the
     * launcher from being a one-way door: however the user gets back into the
     * assistant, the button is waiting for them when they leave it. Nothing here
     * shows the launcher - the caller owns that, and while the chat is open the
     * launcher is supposed to be hidden anyway.
     */
    function clearHidden() {
        try {
            sessionStorage.removeItem(LAUNCHER_HIDDEN_KEY);
        } catch {
            // Never written, so nothing to remove.
        }
    }

    if (closeButton) {
        closeButton.addEventListener('click', (event) => {
            // The launcher sits under this X, and its click opens the chat. Closing
            // the assistant must not open it on the way out.
            event.stopPropagation();
            hideLauncher();
        });
    }

    // The bubble is only withheld from the pointer that retired it. Once that pointer
    // is gone, hovering back is a fresh request for the message and gets it.
    if (launcher) {
        launcher.addEventListener('pointerleave', () => {
            launcher.classList.remove('wp-chat-launcher-dismissed');
        });
    }

    // Closed earlier in this session, and rebuilt by a postback since. Restored
    // before the first-visit message is considered, so a closed launcher cannot be
    // the thing a helper message is pointing at.
    if (isLauncherHidden() && launcher) {
        launcher.style.display = 'none';
    }

    // The asterisk is shown even where the message is not: a user returning after a
    // postback has already had the message dismissed out from under them.
    if (notice && badge) badge.hidden = false;

    const api = { hideTooltip, hideNotice, setMessage, hideLauncher, clearHidden, isHidden: isLauncherHidden };

    // A launcher the user has closed is not showing anyone a first-visit message.
    if (isLauncherHidden() || !shouldShowTooltip(seenKey)) {
        return api;
    }

    tooltip.hidden = false;
    DISMISS_EVENTS.forEach((eventName) => {
        document.addEventListener(eventName, hideTooltip, { capture: true, passive: true });
    });

    return api;
}
