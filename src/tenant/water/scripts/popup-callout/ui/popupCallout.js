/**
 * The banner a popup shows to say the conversation carries over.
 *
 * Opening a sub-form (Add Well, Add a Purpose, Add Surface Water Source) replaces the
 * user's view with a new browser window, and the assistant in it starts collapsed
 * with no visible sign that it is the same conversation. The history is in fact
 * intact - the thread ID rides across in sessionStorage - so this is a banner about
 * something already true, not a feature that moves data.
 *
 * It also offers to enlarge the window, because the form opens these around 700px
 * wide and a 420px assistant beside a sub-form is a tight fit.
 */

/**
 * Shown once per popup window.
 *
 * sessionStorage is the right store twice over: a popup inherits its opener's copy at
 * creation, and the main form never shows this banner, so the key can only have been
 * written by this popup itself - which is what makes it survive the popup's own
 * postbacks without following the user into the next popup they open.
 */
export const POPUP_CALLOUT_SEEN_KEY = 'nrAiForm_popupCalloutSeen';

export const POPUP_CALLOUT_CONTENT = {
    message: "Hey! You can continue the conversation here \u2014 your chat history won't be lost.",
    hint: 'This window is small. You can make it bigger if you would like more room.',
    action: 'Make this window bigger',
    // Shown in place of the button when the browser declines to resize the window.
    actionFallback: 'Your browser would not resize the window. Drag its edge instead.',
    dismissLabel: 'Dismiss this message'
};

/**
 * The same message, for the launcher when the chat is closed.
 *
 * Its own seen-key: the launcher notice and the banner are two showings of one
 * message, and a user who saw it on the launcher should still get it inside the chat
 * they went on to open - that is where the window is, and where the offer to enlarge
 * it can be a button. The launcher tooltip cannot carry that button: it is
 * pointer-events: none by design so it never blocks the form underneath.
 */
export const POPUP_LAUNCHER_NOTICE_SEEN_KEY = 'nrAiForm_popupLauncherNoticeSeen';

export const POPUP_LAUNCHER_NOTICE = {
    text: `${POPUP_CALLOUT_CONTENT.message} ${POPUP_CALLOUT_CONTENT.hint}`,
    seenKey: POPUP_LAUNCHER_NOTICE_SEEN_KEY
};

/** How large to grow the popup, before clamping to what the screen actually has. */
const PREFERRED_WIDTH = 1100;
const PREFERRED_HEIGHT = 850;

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function hasSeenCallout() {
    try {
        return Boolean(sessionStorage.getItem(POPUP_CALLOUT_SEEN_KEY));
    } catch {
        // Storage blocked. Showing it again on the next postback is the milder
        // failure, so treat "cannot tell" as "not seen".
        return false;
    }
}

function markCalloutSeen() {
    try {
        sessionStorage.setItem(POPUP_CALLOUT_SEEN_KEY, '1');
    } catch {
        // Nothing to do - the banner may simply reappear.
    }
}

/**
 * Grow the window, clamped so it cannot run off the screen it is on.
 *
 * Only the space to the right of and below the window's own corner is available to
 * grow into, since resizeTo() keeps that corner fixed. Returns whether the window
 * actually changed size: browsers are inconsistent about honouring this and refuse
 * silently, so the caller checks rather than assumes.
 */
function enlargeWindow() {
    const widthBefore = window.outerWidth;
    const heightBefore = window.outerHeight;

    const roomRight = (screen.availLeft || 0) + screen.availWidth - window.screenX;
    const roomBelow = (screen.availTop || 0) + screen.availHeight - window.screenY;
    const targetWidth = Math.max(widthBefore, Math.min(PREFERRED_WIDTH, roomRight));
    const targetHeight = Math.max(heightBefore, Math.min(PREFERRED_HEIGHT, roomBelow));

    try {
        window.resizeTo(targetWidth, targetHeight);
    } catch {
        return false;
    }
    // A refused resize is silent, so compare rather than trust the call.
    return window.outerWidth > widthBefore || window.outerHeight > heightBefore;
}

/**
 * Build the banner markup.
 *
 * Rendered hidden: whether it belongs on screen depends on which window this is and
 * what the form window was doing, neither of which is known at markup time.
 */
export function buildPopupCalloutHtml(content = POPUP_CALLOUT_CONTENT) {
    return `
            <div class="wp-popup-callout" id="wp-popup-callout" role="status" hidden>
                <div class="wp-popup-callout-body">
                    <p class="wp-popup-callout-message">${escapeHtml(content.message)}</p>
                    <p class="wp-popup-callout-hint" id="wp-popup-callout-hint">${escapeHtml(content.hint)}</p>
                    <button class="wp-popup-callout-action" id="wp-popup-callout-resize" type="button">${escapeHtml(content.action)}</button>
                </div>
                <button class="wp-popup-callout-dismiss" id="wp-popup-callout-dismiss" type="button" aria-label="${escapeHtml(content.dismissLabel)}" title="${escapeHtml(content.dismissLabel)}">
                    <svg class="wp-popup-callout-dismiss-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                </button>
            </div>`;
}

/**
 * Wire the banner up.
 *
 * @param {object} options
 * @param {HTMLElement} options.root - element containing the banner markup
 * @param {object} [options.content] - the content object the banner was built from
 * @returns {{ show: () => void, dismiss: () => void }}
 */
export function createPopupCallout({ root, content = POPUP_CALLOUT_CONTENT }) {
    const callout = root ? root.querySelector('#wp-popup-callout') : null;
    if (!callout) return { show: () => {}, dismiss: () => {} };

    const hint = callout.querySelector('#wp-popup-callout-hint');
    const resizeButton = callout.querySelector('#wp-popup-callout-resize');
    const dismissButton = callout.querySelector('#wp-popup-callout-dismiss');

    function dismiss() {
        callout.hidden = true;
    }

    /**
     * Show the banner unless this window has already had it.
     *
     * Marked seen on display rather than on dismissal: the point is one appearance
     * per popup, and a user who ignores it should not meet it again after the next
     * postback.
     */
    function show() {
        if (hasSeenCallout()) return;
        callout.hidden = false;
        markCalloutSeen();
    }

    if (resizeButton) {
        resizeButton.addEventListener('click', () => {
            if (enlargeWindow()) {
                // The window is now as big as it is going to get, so the offer has
                // nothing left to offer.
                resizeButton.hidden = true;
                if (hint) hint.hidden = true;
                return;
            }
            resizeButton.hidden = true;
            if (hint) hint.textContent = content.actionFallback;
        });
    }

    if (dismissButton) {
        dismissButton.addEventListener('click', dismiss);
    }

    return { show, dismiss };
}
