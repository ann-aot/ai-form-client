/**
 * Floating launcher button and its first-visit helper message.
 *
 * The button is always present. The message beside it appears once, to make help
 * discoverable, and gets out of the way the moment the user does anything at all -
 * the point is to be noticed, not to be dismissed.
 */
import { PRODUCT_NAME } from '../../shared/productName.js';

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
    label: PRODUCT_NAME,
    tooltip: 'Select the icon at any time for help with your application.'
};

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
                <div class="wp-chat-launcher-tooltip-body">${escapeHtml(content.tooltip)}</div>
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
 * @returns {{ hideTooltip: () => void, hideNotice: () => void }}
 */
export function createLauncher({ root, content = LAUNCHER_CONTENT, notice = null }) {
    const tooltip = root ? root.querySelector('#wp-chat-launcher-tooltip') : null;
    const badge = root ? root.querySelector('#wp-chat-launcher-badge') : null;
    if (!tooltip) return { hideTooltip: () => {}, hideNotice: () => {} };

    const tooltipBody = tooltip.querySelector('.wp-chat-launcher-tooltip-body');
    const message = notice ? notice.text : content.tooltip;
    const seenKey = notice ? notice.seenKey : LAUNCHER_TOOLTIP_SEEN_KEY;
    if (notice && tooltipBody) tooltipBody.textContent = message;

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

    // The asterisk is shown even where the message is not: a user returning after a
    // postback has already had the message dismissed out from under them.
    if (notice && badge) badge.hidden = false;

    if (!shouldShowTooltip(seenKey)) {
        return { hideTooltip, hideNotice };
    }

    tooltip.hidden = false;
    DISMISS_EVENTS.forEach((eventName) => {
        document.addEventListener(eventName, hideTooltip, { capture: true, passive: true });
    });

    return { hideTooltip, hideNotice };
}
