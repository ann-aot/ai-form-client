/**
 * Styles for dragging the assistant around the window.
 *
 * Two jobs: saying which surfaces are grab handles, and keeping a drag in progress
 * from being read by the browser as a text selection or a page scroll.
 */
export const DRAG_STYLES = `
        /* 1. Handles -----------------------------------------------------------
           touch-action: none is what stops a touch drag scrolling the page
           underneath instead of moving the panel. It is deliberately not on
           .wp-chat-modal, which would take the message list's own scrolling with
           it - only on the header, which has nothing to scroll. */
        .wp-chat-header {
            cursor: move;
            touch-action: none;
        }

        /* The header's own controls are still buttons. Stated here rather than left
           to inherit, because the rule above would otherwise hand them a move
           cursor and make them look like part of the handle. */
        .wp-chat-header .wp-chat-header-button {
            cursor: pointer;
        }

        /* While paused, the whole panel is the handle. Its children are inert and
           pointer-events: none by then, so a press lands on the modal itself - and
           the one thing still worth doing with a paused assistant is moving it off
           the form the user is trying to read underneath it. */
        .wp-chat-modal-blocked {
            cursor: move;
            touch-action: none;
        }

        /* The launcher is a button the user can also move, so it keeps the pointer
           cursor its own stylesheet gives it; only the touch behaviour changes. */
        .wp-chat-launcher {
            touch-action: none;
        }

        /* 2. During a drag ------------------------------------------------------
           The pointer sweeps across the host page's form while dragging, and without
           this every field it crosses offers an I-beam and starts selecting text.
           The blanket !important is scoped to a class that exists only between
           pointerdown and pointerup. */
        body.wp-drag-active {
            cursor: move;
            user-select: none;
            -webkit-user-select: none;
        }

        body.wp-drag-active * {
            cursor: move !important;
            user-select: none !important;
            -webkit-user-select: none !important;
        }

        /* 3. Tooltip flip -------------------------------------------------------
           The launcher's message grows upward from a bottom-anchored box, so once
           the launcher is dragged near the top of the window the message would be
           off-screen. Flipping the wrapper puts it below the button instead.

           column-reverse rather than reordering the markup: the tooltip has to stay
           before the button in the DOM, where it is neither part of the button's
           accessible name nor in front of it in the tab order. */
        .wp-chat-launcher-flipped {
            flex-direction: column-reverse;
        }

        .wp-chat-launcher-flipped .wp-chat-launcher-tooltip {
            margin-top: 8px;
            margin-bottom: 0;
            padding-top: 14.3px;
            padding-bottom: 0;
        }

        /* Same rotated square, same half of it covered by the body - the body is now
           below the beak rather than above it, so the beak points up. */
        .wp-chat-launcher-flipped .wp-chat-launcher-tooltip-arrow {
            top: 10px;
            bottom: auto;
        }
`;
