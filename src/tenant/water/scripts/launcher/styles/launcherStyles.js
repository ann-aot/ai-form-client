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

        /* Close -----------------------------------------------------------------
           The bar is only a box to hang the X off. It is sized by the button inside
           it, and the X is taken out of the flow, so the card keeps the 150 x 46 the
           design gives it however long the label gets.

           Cornered and overlapping rather than sitting inside the card: the card is
           the width of its label and nothing else, and an X placed within it would
           either push the label along or sit on top of it. */
        .wp-chat-launcher-bar {
            position: relative;
            display: flex;
        }

        /* Always drawn, never on hover only. It is the way out of something pinned
           over the user's form, which a touch user has no way to hover for - and a
           control that appears only once the pointer is already there is no answer
           to "how do I get rid of this". 24px square for the same reason: it is the
           smallest comfortable target, whatever it is being pressed with. */
        .wp-chat-launcher-close {
            position: absolute;
            top: -8px;
            right: -8px;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
            padding: 0;
            background: #FFFFFF;
            color: #013366;
            /* The card underneath is near-white too, so the ring is what separates
               them - without it the X reads as a hole in the corner. */
            border: 1px solid #D7D3CF;
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 0.6px 1.8px rgba(0, 0, 0, 0.10);
            transition: background 0.15s ease, border-color 0.15s ease;
        }

        .wp-chat-launcher-close:hover {
            background: #EDEBE9;
            border-color: #013366;
        }

        .wp-chat-launcher-close:focus-visible {
            outline: 2px solid #013366;
            outline-offset: 1px;
        }

        .wp-chat-launcher-close-icon {
            width: 12px;
            height: 12px;
            fill: currentColor;
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

        /* - but not to the pointer that just retired it.
           Clicking the launcher hides the bubble while the pointer is still on the
           launcher, and the rule above would hand it straight back in the same frame.
           Same specificity as that rule and placed after it, so it wins while the
           class is set. JS clears the class when the pointer leaves, so hovering back
           later still borrows the message in the usual way. */
        .wp-chat-launcher-dismissed:hover .wp-chat-launcher-tooltip[hidden],
        .wp-chat-launcher-dismissed:focus-within .wp-chat-launcher-tooltip[hidden] {
            display: none;
        }

        .wp-chat-launcher-tooltip-body {
            position: relative;
            padding: 8px 12px;
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
