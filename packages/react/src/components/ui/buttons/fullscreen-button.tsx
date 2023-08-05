import * as React from 'react';
import { composeRefs, createReactComponent, type ReactElementProps } from 'maverick.js/react';
import { FullscreenButtonInstance } from '../../primitives/instances';
import { Primitive } from '../../primitives/nodes';

/* -------------------------------------------------------------------------------------------------
 * FullscreenButton
 * -----------------------------------------------------------------------------------------------*/

const FullscreenButtonBridge = createReactComponent(FullscreenButtonInstance);

export interface FullscreenButtonProps
  extends ReactElementProps<FullscreenButtonInstance, HTMLButtonElement> {
  asChild?: boolean;
  children?: React.ReactNode;
  ref?: React.Ref<HTMLButtonElement>;
}

/**
 * A button for toggling the fullscreen mode of the player.
 *
 * @docs {@link https://www.vidstack.io/docs/react/player/components/buttons/fullscreen-button}
 * @see {@link https://www.vidstack.io/docs/react/player/core-concepts/fullscreen}
 */
const FullscreenButton = React.forwardRef<HTMLButtonElement, FullscreenButtonProps>(
  ({ children, ...props }, forwardRef) => {
    return (
      <FullscreenButtonBridge {...(props as Omit<FullscreenButtonProps, 'ref'>)}>
        {(props) => (
          <Primitive.button type="button" {...props} ref={composeRefs(props.ref, forwardRef)}>
            {children}
          </Primitive.button>
        )}
      </FullscreenButtonBridge>
    );
  },
);

FullscreenButton.displayName = 'FullscreenButton';
export { FullscreenButton };
