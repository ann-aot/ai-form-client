/**
 * Styles for the floating launcher and its first-visit helper message.
 *
 * The launcher wrapper is the fixed element, not the button: the tooltip has to sit
 * above the button and outside it (a div inside a <button> would join its accessible
 * name and swallow clicks), so both are children of one anchored box.
 */
export const LAUNCHER_STYLES = `
        /* 1. Anchor ------------------------------------------------------------- */
        .wp-chat-launcher {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 99998;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            font-family: var(--wp-welcome-font, 'BCSans', sans-serif);
            /* The wrapper is a box drawn around two things, not a surface. It is as
               tall as the message it holds, so anything hit-testable here is a strip
               of the form the user cannot click and a place the widget can be
               dragged from - neither of which it is meant to be. The controls below
               take the pointer back, one at a time. */
            pointer-events: none;
        }

        /* Handed back while the assistant is paused for a sub-form popup. The button
           is disabled then, and whether a disabled control still answers :hover is
           not something every browser agrees on - so the wrapper is made the hover
           target itself, which is what popupBlock.js counts on to get its explanation
           in front of the user. Dragging is refused separately, in the launcher's
           isHandle, so the wider target does not become a wider grip. */
        .wp-chat-launcher-blocked {
            pointer-events: auto;
        }

        /* 2. Button -------------------------------------------------------------
           Width hugs the label rather than being fixed: 12px of padding either side
           of "How can I help?" at 16px bold comes to the design's 150px on its own,
           and a fixed width would clip the label wherever BC Sans is not available.
           Height falls out the same way - 12 + 22 + 12 = the specified 46px.

           The card is near-white rather than blue: it sits over the form all the way
           down the page, and the shadow is what separates it, not a block of colour. */
        .wp-chat-button {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
            padding: 12px;
            background: #FAF9F8;
            color: #013366;
            border: none;
            border-radius: 12px;
            font-family: inherit;
            font-size: 16px;
            font-weight: 700;
            line-height: 22px;
            white-space: nowrap;
            cursor: pointer;
            /* Taken back from the wrapper. The button is the launcher as far as the
               pointer is concerned: what opens the chat, and the only surface the
               widget is dragged by. */
            pointer-events: auto;
            box-shadow:
                0 3.2px 7.2px rgba(0, 0, 0, 0.13),
                0 0.6px 1.8px rgba(0, 0, 0, 0.10);
            transition: background 0.2s ease;
        }

        .wp-chat-button:hover {
            background: #EDEBE9;
        }

        /* Focus is called out separately from hover: keyboard users need the same
           "this is interactive" signal that pointer users get. The ring is drawn
           inside the button, in the label's own blue - on a near-white card an
           outward ring would read as a second border against the page. */
        .wp-chat-button:focus-visible {
            outline: 2px solid #013366;
            outline-offset: -4px;
            background: #EDEBE9;
        }

        /* Notice marker ---------------------------------------------------------
           Inline beside the label rather than absolutely positioned in the corner:
           the button's width hugs its text, so a corner badge would sit half outside
           the rounded edge and clip. Spaced by the button's own 4px gap, and raised by
           align-self instead of by superscript so it cannot alter the line height.

           aria-hidden in the markup, because the asterisk is not information on its
           own - the message it marks is announced by the tooltip's role="status". */
        .wp-chat-launcher-badge {
            align-self: flex-start;
            color: #CE3E39;
            font-size: 18px;
            font-weight: 700;
            line-height: 14px;
        }

        .wp-chat-launcher-badge[hidden] {
            display: none;
        }

        /* 3. Helper message -----------------------------------------------------
           pointer-events: none is load-bearing, not cosmetic - the message stays on
           screen until the user closes it, and for all that time it is a card lying
           over the form. Everything under it has to stay clickable. Restated here
           rather than left to the wrapper so that this stays true of the message
           wherever else it is put. */
        .wp-chat-launcher-tooltip {
            width: 251px;
            max-width: calc(100vw - 40px);
            margin-bottom: 8px;
            position: relative;
            pointer-events: none;
            filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.15));
        }

        .wp-chat-launcher-tooltip[hidden] {
            display: none;
        }

        /* Bring the message back on hover, and on keyboard focus so it is not
           pointer-only. This deliberately overrides the [hidden] attribute rather
           than clearing it: the attribute records that the message has been answered
           - closed, or left behind on an earlier step - and hovering should not
           rewrite that history. It borrows the message for as long as the pointer
           stays.

           Matched on the wrapper but reached through the button: the wrapper takes no
           pointer events, and :hover still applies to the ancestors of whatever was
           hit. So the button is the trigger in practice, and a borrowed message
           cannot itself be hovered - which is what stops one parking over the form.
           It grows upward from the fixed bottom edge, so nothing below it shifts. */
        .wp-chat-launcher:hover .wp-chat-launcher-tooltip[hidden],
        .wp-chat-launcher:focus-within .wp-chat-launcher-tooltip[hidden] {
            display: block;
        }

        /* - but not to the pointer that just closed it.
           The dismiss button is inside the launcher, so the pointer is still hovering
           at the moment the bubble goes away, and the rule above would hand it back
           in the same frame: the X would look broken rather than the bubble closed.
           Same specificity as that rule and placed after it, so it wins while the
           class is set. JS clears the class when the pointer leaves, so hovering back
           later still borrows the message in the usual way.

           Hover only, deliberately. The other half of that rule, :focus-within, needs
           no guard - the click handler blurs the X, so focus has already left the
           launcher by the time the bubble goes. Guarding it as well would strand a
           keyboard user: there is no pointer to leave, so nothing would ever clear the
           class, and tabbing back would never bring the message again. */
        .wp-chat-launcher-dismissed:hover .wp-chat-launcher-tooltip[hidden] {
            display: none;
        }

        .wp-chat-launcher-tooltip-body {
            position: relative;
            /* Room on the right for the dismiss button, which is lifted out of the
               flow so it cannot push the message into a second line. */
            padding: 8px 36px 8px 12px;
            background: #FFFFFF;
            border-radius: 2px;
            color: #313132;
            font-family: inherit;
            font-size: 16px;
            font-weight: 400;
            line-height: 22px;
            text-align: left;
            box-sizing: border-box;
        }

        /* Dismiss ---------------------------------------------------------------
           The only part of the bubble that takes the pointer. The bubble itself is
           pointer-events: none so it can never block the form it overlaps, and that
           has to keep being true of everything except this 24px square. */
        .wp-chat-launcher-tooltip-dismiss {
            position: absolute;
            top: 4px;
            right: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
            padding: 0;
            background: none;
            border: none;
            border-radius: 50%;
            color: #6B655D;
            cursor: pointer;
            pointer-events: auto;
            transition: background 0.15s ease, color 0.15s ease;
        }

        .wp-chat-launcher-tooltip-dismiss:hover {
            background: rgba(45, 42, 38, 0.08);
            color: #2D2A26;
        }

        .wp-chat-launcher-tooltip-dismiss:focus-visible {
            outline: 2px solid #003366;
            outline-offset: 1px;
        }

        .wp-chat-launcher-tooltip-dismiss-icon {
            width: 14px;
            height: 14px;
            fill: currentColor;
        }
`;
