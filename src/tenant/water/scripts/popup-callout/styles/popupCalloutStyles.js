/**
 * Styles for the popup continuation banner.
 *
 * It sits between the header and the message list as a band across the full width of
 * the modal, so it reads as chrome belonging to the window rather than as something
 * the assistant said. Colours come from the same palette as the rest of the widget,
 * in the notice-yellow family rather than the brand blue, because the banner is an
 * aside about the window and not part of the conversation.
 */
export const POPUP_CALLOUT_STYLES = `
        .wp-popup-callout {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            padding: 12px 12px 12px 16px;
            background: #FEF7E6;
            border-bottom: 1px solid #F3D07A;
            /* The list below scrolls; this must not, or the notice would scroll away
               from a user who has not read it yet. */
            flex: 0 0 auto;
            font-family: var(--wp-welcome-font, 'BCSans', sans-serif);
            color: #313132;
            box-sizing: border-box;
        }

        .wp-popup-callout[hidden] {
            display: none;
        }

        .wp-popup-callout-body {
            flex: 1 1 auto;
            min-width: 0;
        }

        .wp-popup-callout-message {
            margin: 0;
            font-size: 14px;
            font-weight: 700;
            line-height: 20px;
        }

        .wp-popup-callout-hint {
            margin: 4px 0 0;
            font-size: 14px;
            font-weight: 400;
            line-height: 20px;
        }

        .wp-popup-callout-hint[hidden] {
            display: none;
        }

        /* A link rather than a filled button: it is an optional convenience next to
           the message, and a second solid button this close to Send would read as
           part of the conversation controls. */
        .wp-popup-callout-action {
            margin-top: 6px;
            padding: 0;
            background: none;
            border: none;
            color: #00528D;
            font-family: inherit;
            font-size: 14px;
            font-weight: 700;
            line-height: 20px;
            text-align: left;
            text-decoration: underline;
            cursor: pointer;
        }

        .wp-popup-callout-action[hidden] {
            display: none;
        }

        .wp-popup-callout-action:hover {
            color: #003366;
        }

        .wp-popup-callout-action:focus-visible {
            outline: 2px solid #003366;
            outline-offset: 2px;
        }

        .wp-popup-callout-dismiss {
            flex: 0 0 auto;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
            padding: 0;
            background: none;
            border: none;
            border-radius: 2px;
            color: #313132;
            cursor: pointer;
        }

        .wp-popup-callout-dismiss:hover {
            background: rgba(0, 0, 0, 0.06);
        }

        .wp-popup-callout-dismiss:focus-visible {
            outline: 2px solid #003366;
            outline-offset: 1px;
        }

        .wp-popup-callout-dismiss-icon {
            width: 16px;
            height: 16px;
            fill: currentColor;
        }
`;
