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
           pointer-events: none is load-bearing, not cosmetic - the message overlaps
           the form, and the story requires that it never blocks interaction. */
        .wp-chat-launcher-tooltip {
            width: 251px;
            max-width: calc(100vw - 40px);
            margin-bottom: 8px;
            padding-bottom: 14.3px;
            position: relative;
            pointer-events: none;
            filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.15));
        }

        .wp-chat-launcher-tooltip[hidden] {
            display: none;
        }

        /* Bring the message back on hover, and on keyboard focus so it is not
           pointer-only. This deliberately overrides the [hidden] attribute rather
           than clearing it: the attribute records that the first-visit showing is
           over, and hovering should not rewrite that history - it just borrows the
           message for as long as the pointer stays.

           The wrapper is the trigger, not the button, so the message keeps itself
           open once it appears above the cursor. It grows upward from the fixed
           bottom edge, so nothing below it shifts. */
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
           later still borrows the message in the usual way. */
        .wp-chat-launcher-dismissed:hover .wp-chat-launcher-tooltip[hidden],
        .wp-chat-launcher-dismissed:focus-within .wp-chat-launcher-tooltip[hidden] {
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

        /* Withheld from a bubble that is only being borrowed.
           The rule above brings the message back under the pointer after its showing
           is over; there is nothing to dismiss about a bubble that already leaves the
           moment the pointer does, and offering to close it would suggest the closing
           meant something. Keeping it out of the rendering also keeps it out of the
           tab order, so it cannot be reached when it cannot be seen. */
        .wp-chat-launcher-tooltip[hidden] .wp-chat-launcher-tooltip-dismiss {
            display: none;
        }

        /* The beak is a rotated square whose top half is covered by the body above
           it, leaving the 11.3 x 5.65px triangle the design specifies. */
        .wp-chat-launcher-tooltip-arrow {
            position: absolute;
            bottom: 10px;
            left: 50%;
            width: 8px;
            height: 8px;
            background: #FFFFFF;
            transform: translateX(-50%) rotate(45deg);
        }
`;
