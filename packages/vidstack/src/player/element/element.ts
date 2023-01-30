import { effect, getScope, onDispose, scoped, signal } from 'maverick.js';
import { AttributesRecord, defineCustomElement, onAttach, onConnect } from 'maverick.js/element';
import {
  camelToKebabCase,
  dispatchEvent,
  isNull,
  listenEvent,
  mergeProperties,
  noop,
} from 'maverick.js/std';

import { createLogPrinter } from '../../foundation/logger/log-printer';
import { IS_IOS } from '../../utils/support';
import { createMediaController } from '../media/controller/create';
import { useSourceSelection } from '../media/controller/source-selection';
import type { MediaState } from '../media/state';
import { mediaElementProps } from './props';
import type { MediaConnectEvent, MediaElement } from './types';

declare global {
  interface HTMLElementTagNameMap {
    'vds-media': MediaElement;
  }

  interface HTMLElementEventMap {
    'media-connect': MediaConnectEvent;
  }
}

const MEDIA_ATTRIBUTES: (keyof MediaState)[] = [
  'autoplay',
  'autoplayError',
  'canFullscreen',
  'canLoad',
  'canPlay',
  'ended',
  'error',
  'fullscreen',
  'loop',
  'media',
  'muted',
  'paused',
  'playing',
  'playsinline',
  'seeking',
  'started',
  'userIdle',
  'view',
  'waiting',
];

export const HLS_LISTENERS = Symbol(__DEV__ ? 'HLS_LISTENERS' : 0);

export const MediaDefinition = defineCustomElement<MediaElement>({
  tagName: 'vds-media',
  props: mediaElementProps,
  construct(this: MediaElement) {
    this[HLS_LISTENERS] = signal<string[]>([]);
    const addEventListener = this.addEventListener;
    this.addEventListener = function (type, handler, options) {
      if (type.startsWith('hls-')) this[HLS_LISTENERS].set((x) => [...x, type]);
      return addEventListener.call(this, type, handler, options);
    };
  },
  setup({ host, props, accessors }) {
    const scope = getScope()!,
      controller = createMediaController(props),
      $store = controller._context.$store;

    if (__DEV__) {
      const logPrinter = createLogPrinter(host.$el);
      effect(() => void (logPrinter.logLevel = props.$logLevel()));
    }

    onAttach(() => {
      controller._context.$element.set(host.el);
      listenEvent(host.el!, 'vds-find-media', ({ detail }) => detail(host.el));
    });

    onConnect(() => {
      dispatchEvent(host.el, 'media-connect', {
        detail: host.el!,
        bubbles: true,
        composed: true,
      });

      window.requestAnimationFrame(() => {
        if (isNull($store.canLoadPoster)) $store.canLoadPoster = true;
      });
    });

    useSourceSelection(props.$src, controller._context);

    const $attrs: AttributesRecord = {
      'ios-controls': () =>
        IS_IOS &&
        $store.media.includes('video') &&
        $store.controls &&
        (!props.$playsinline() || $store.fullscreen),
    };

    for (const prop of MEDIA_ATTRIBUTES) {
      $attrs[camelToKebabCase(prop as string)] = () => $store[prop] as string | number;
    }

    const userIdle = controller._request._user.idle;
    $attrs['user-idle'] = () => userIdle.idling;

    host.setAttributes($attrs);

    host.setCSSVars({
      '--media-aspect-ratio': props.$aspectRatio,
      '--media-buffered-amount': () => $store.bufferedAmount,
      '--media-current-time': () => $store.currentTime,
      '--media-duration': () => $store.duration,
      '--media-seekable-amount': () => $store.seekableAmount,
    });

    onDispose(() => {
      dispatchEvent(host.el, 'destroy');
    });

    return mergeProperties(
      {
        get user() {
          return controller._request._user;
        },
        get orientation() {
          return controller._request._orientation;
        },
        get provider() {
          return controller._context.$provider();
        },
        get $store() {
          return $store;
        },
        state: new Proxy($store, {
          // @ts-expect-error
          set: noop,
        }),
        subscribe: (callback) => scoped(() => effect(() => callback($store)), scope)!,
        startLoading: controller._start,
        play: controller._request._play,
        pause: controller._request._pause,
        enterFullscreen: controller._request._enterFullscreen,
        exitFullscreen: controller._request._exitFullscreen,
      },
      accessors(),
      controller._provider,
    );
  },
});
