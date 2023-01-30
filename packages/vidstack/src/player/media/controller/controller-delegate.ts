import { tick } from 'maverick.js';
import { DOMEvent, InferEventDetail, InferEventInit, noop } from 'maverick.js/std';

import type { MediaContext } from '../context';
import type { MediaEvents } from '../events';

export interface MediaControllerDelegate {
  dispatch<Type extends keyof MediaEvents>(
    type: Type,
    ...init: InferEventDetail<MediaEvents[Type]> extends void | undefined | never
      ? [init?: Partial<InferEventInit<MediaEvents[Type]>>]
      : [init: InferEventInit<MediaEvents[Type]>]
  ): void;

  ready(info: { duration: number }, trigger?: Event): Promise<void>;
}

export function createMediaControllerDelegate(
  { $element: $controller, $store, logger }: MediaContext,
  handle: (event: Event) => void,
): MediaControllerDelegate {
  if (__SERVER__) {
    return {
      dispatch: noop,
      ready: noop as () => Promise<void>,
    };
  }

  const dispatch: MediaControllerDelegate['dispatch'] = (type, ...init) => {
    handle(new DOMEvent<any>(type, init?.[0]));
  };

  async function ready(duration, trigger) {
    if ($store.canPlay) return;

    dispatch('can-play', { detail: { duration }, trigger });
    tick();

    if (__DEV__) {
      logger
        ?.infoGroup('-~-~-~-~-~-~-~-~- ✅ MEDIA READY -~-~-~-~-~-~-~-~-')
        .labelledLog('Media Store', { ...$store })
        .labelledLog('Trigger Event', trigger)
        .dispatch();
    }

    if ($store.canPlay && $store.autoplay && !$store.started) {
      await attemptAutoplay();
    }
  }

  async function attemptAutoplay() {
    $store.attemptingAutoplay = true;
    try {
      await $controller()!.play();
      dispatch('autoplay', { detail: { muted: $store.muted } });
    } catch (error) {
      dispatch('autoplay-fail', {
        detail: {
          muted: $store.muted,
          error: error as Error,
        },
      });
    } finally {
      $store.attemptingAutoplay = false;
    }
  }

  return {
    dispatch,
    ready,
  };
}
