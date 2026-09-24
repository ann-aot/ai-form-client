/**
 * Floating launcher button and its first-visit helper message.
 *
 * The button is always present. The message beside it appears once and stays put:
 * user testing found that a message which cleared itself on the first scroll or
 * click was gone before anyone had noticed the assistant existed. Nothing the user
 * does to the form takes it away - it goes when they say so, when they open the
 * assistant, or when they move on to the next step of the form.
 */

/**
 * Where the message's state lives.
 *
 * sessionStorage rather than localStorage: "first landing" should mean once per
 * visit, not once ever. It also has to survive the form's full-page postbacks, which
 * rebuild the widget from scratch - keeping this in memory would re-show the message
 * on every Next/Save, which is exactly the interruption the story rules out.
 *
 * The value is not a flag but a record of how far the message has got:
 *   'page:<step>' - shown, not yet dismissed, on that step of the form
 *   '1'           - done with, by dismissal or by the user moving on
 * The step is what separates a postback from a page turn. A Posse form posts back on
 * nearly every interaction, and each one rebuilds this widget; a message that could
 * not tell those apart would either vanish at the first keystroke or follow the user
 * through the whole form.
 */
export const LAUNCHER_TOOLTIP_SEEN_KEY = 'nrAiForm_launcherTooltipSeen';

const SHOWN_ON_PREFIX = 'page:';
const SEEN_VALUE = '1';

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

function readState(seenKey) {
    try {
        return sessionStorage.getItem(seenKey);
    } catch {
        // Storage blocked (private mode, cookie policy). Showing the message is the
        // safer failure: worst case it reappears, rather than never appearing.
        return null;
    }
}

function writeState(seenKey, value) {
    try {
        sessionStorage.setItem(seenKey, value);
    } catch {
        // Nothing to do - the message simply may show again on the next page.
    }
}

/**
 * Whether to show the message now, given where the user is.
 *
 * Three cases, and the middle one is what the key format exists for: a rebuild on
 * the step the message was shown on is a postback, and the message it left on screen
 * has to come back as if nothing had happened.
 *
 * @param {string} seenKey - storage key this message records itself under
 * @param {string} pageKey - identifier for the step of the form now on screen
 */
function shouldShowTooltip(seenKey, pageKey) {
    const state = readState(seenKey);
    if (!state) return true;
    if (state === SEEN_VALUE) return false;

    // A step that cannot be read is not evidence that the user has moved to another
    // one. Step detection works off the form's own chrome and legitimately comes back
    // empty on some pages, and guessing wrong here costs the message - which is the
    // exact failure this story was raised to fix. Keeping it is the mild mistake.
    if (!pageKey) return true;

    if (state === `${SHOWN_ON_PREFIX}${pageKey}`) return true;

    // Shown on some other step, and never dismissed there. The user moved on, which
    // the story counts as having had the chance to read it.
    writeState(seenKey, SEEN_VALUE);
    return false;
}

/** Record that the message is on screen, on this step, still awaiting an answer. */
function markTooltipShown(seenKey, pageKey) {
    writeState(seenKey, `${SHOWN_ON_PREFIX}${pageKey}`);
}

/** Record that the message is finished with, and should not return on its own. */
function markTooltipSeen(seenKey) {
    writeState(seenKey, SEEN_VALUE);
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
            </div>
            <button class="wp-chat-button" id="wp-chat-button" type="button"><span class="wp-chat-button-label">${escapeHtml(content.label)}</span><span class="wp-chat-launcher-badge" id="wp-chat-launcher-badge" aria-hidden="true" hidden>*</span></button>
        </div>`;
}

/**
 * Show the helper message if this session has not finished with it, and give the
 * caller the handles that retire it.
 *
 * Nothing here listens to the user getting on with the form. The message is closed
 * only by the X, by opening the assistant (the caller's job - see hideTooltip), or
 * by arriving on a step other than the one it was shown on, which is settled by the
 * key above at the next build rather than watched for here.
 *
 * A `notice` replaces the first-visit message with a one-off of its own and marks
 * the button with an asterisk. It is not queued behind the first-visit message:
 * both occupy the same spot, and a notice is true only right now, whereas the
 * first-visit message is the same on any page the user reaches later.
 *
 * @param {object} options
 * @param {HTMLElement} options.root - element containing the launcher markup
 * @param {object} [options.content] - the content object the launcher was built from
 * @param {string} [options.pageKey] - identifier for the step of the form on screen,
 *   which is how a postback is told from a page turn
 * @param {{ text: string, seenKey: string }} [options.notice] - message to show in
 *   place of the first-visit one, under its own seen-key, with the asterisk
 * @returns {{ hideTooltip: (options?: { suppressHover?: boolean }) => void, hideNotice: () => void, setMessage: (text: string|null) => void }}
 */
export function createLauncher({ root, content = LAUNCHER_CONTENT, pageKey = '', notice = null }) {
    const tooltip = root ? root.querySelector('#wp-chat-launcher-tooltip') : null;
    const badge = root ? root.querySelector('#wp-chat-launcher-badge') : null;
    if (!tooltip) return { hideTooltip: () => {}, hideNotice: () => {}, setMessage: () => {} };

    // The message's own line, not the whole bubble: the drag hint is a sibling
    // inside it, and rewriting the bubble's text would take the hint with it.
    const tooltipBody = tooltip.querySelector('.wp-chat-launcher-tooltip-text');
    const dismissButton = tooltip.querySelector('#wp-chat-launcher-tooltip-dismiss');
    // The wrapper, because it is what :hover is matched against - hiding the bubble
    // while the pointer is still on it is not enough on its own to make it go.
    const launcher = tooltip.closest('.wp-chat-launcher');
    const message = notice ? notice.text : content.tooltip;
    const seenKey = notice ? notice.seenKey : LAUNCHER_TOOLTIP_SEEN_KEY;
    const page = String(pageKey ?? '');
    if (notice && tooltipBody) tooltipBody.textContent = message;

    // Whether something is currently saying the bubble should read otherwise.
    let overriding = false;

    /**
     * Hold the hover rule off until the pointer has actually left.
     *
     * The dismiss button sits inside the launcher, so at the moment the bubble goes
     * the pointer is still hovering the thing that brings it back. Without this the
     * bubble is hidden and handed straight back by :hover in the same frame, and the
     * X does nothing visible but remove itself.
     */
    function suppressHoverReshow() {
        if (launcher) launcher.classList.add('wp-chat-launcher-dismissed');
    }

    /**
     * Close the message for the rest of the session.
     *
     * The storage write is unconditional, ahead of any check on whether the bubble
     * is currently rendered. On a bubble that is only borrowed back by hover the
     * element is already `hidden`, so there is nothing to hide - but closing it has
     * to mean the same thing there as on the first showing, or the X would do
     * nothing on the one showing where the user went looking for it.
     *
     * @param {object} [options]
     * @param {boolean} [options.suppressHover] - whether to withhold the hover
     *   re-show until the pointer leaves. True for a dismissal made on the launcher,
     *   where the pointer is still on it. False where the launcher is about to leave
     *   the screen anyway: opening the assistant hides it, so there is no hover to
     *   fight, and a suppression set then would still be set when the launcher came
     *   back, with no pointerleave in between to clear it.
     */
    function hideTooltip({ suppressHover = true } = {}) {
        markTooltipSeen(seenKey);
        if (suppressHover) suppressHoverReshow();
        tooltip.hidden = true;
    }

    /**
     * Retire the notice for good.
     *
     * The asterisk outlives the message on purpose - the message goes once the user
     * has answered it one way or another, and the asterisk is then the only thing
     * left saying there is something here to come back to. Both go once the user has
     * actually opened the chat, which is what the notice was asking for.
     */
    function hideNotice() {
        if (badge) badge.hidden = true;
        hideTooltip({ suppressHover: false });
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
     * The only way the message closes while the user stays on this step.
     *
     * Nothing else on the page takes it away any more, which is the whole point of
     * the change: a message that cleared itself at the first scroll was gone before
     * anyone had read it. That makes this the message's only exit rather than the
     * polite version of one, so it has to work on both showings - the first-visit
     * one and the bubble borrowed back by hover.
     *
     * The asterisk is left alone. Dismissing the message is not the same as having
     * opened the chat, and the asterisk is what still says there is something here.
     */
    if (dismissButton) {
        dismissButton.addEventListener('click', () => {
            // Blurred first. The click focuses it, and a focused child keeps
            // :focus-within true on the wrapper - which is the same rule handing the
            // bubble back, by its other half.
            dismissButton.blur();
            hideTooltip();
        });
    }

    // The bubble is only withheld from the pointer that closed it. Once that pointer
    // is gone, hovering back is a fresh request for the message and gets it.
    if (launcher) {
        launcher.addEventListener('pointerleave', () => {
            launcher.classList.remove('wp-chat-launcher-dismissed');
        });
    }

    // The asterisk is shown even where the message is not: a user returning after a
    // postback has already had the message dismissed out from under them.
    if (notice && badge) badge.hidden = false;

    if (!shouldShowTooltip(seenKey, page)) {
        return { hideTooltip, hideNotice, setMessage };
    }

    tooltip.hidden = false;
    // Re-stamped on every build, not only the first. A postback rebuilds this widget
    // from scratch, and the stamp is what the next build reads to know it is looking
    // at the same step rather than a page the user has turned to.
    //
    // Withheld where the step is unknown, so that an unreadable page cannot overwrite
    // a good stamp with one nothing will ever match again.
    if (page) markTooltipShown(seenKey, page);

    return { hideTooltip, hideNotice, setMessage };
}
