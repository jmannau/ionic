import { Animation } from '../../../interface';
import { getTimeGivenProgression } from '../../../utils/animation/cubic-bezier';
import { GestureDetail, createGesture } from '../../../utils/gesture';
import { clamp } from '../../../utils/helpers';

// Defaults for the card swipe animation
export const SwipeToCloseDefaults = {
  MIN_BACKDROP_OPACITY: 0.4,
  MIN_PRESENTING_SCALE: 0.95,
  MIN_Y_CARD: 44,
  MIN_Y_FULLSCREEN: 0,
  MIN_PRESENTING_Y: 0
};

export const createSwipeToCloseGesture = (
  el: HTMLIonModalElement,
  animation: Animation,
  onDismiss: () => void
) => {
  const height = el.offsetHeight;
  let isOpen = false;

  const canStart = (detail: GestureDetail) => {
    const target = detail.event.target as HTMLElement | null;

    if (target === null ||
       !(target as any).closest) {
      return true;
    }

    const content = target.closest('ion-content');
    if (content === null) {
      return true;
    }
    // Target is in the content so we don't start the gesture.
    // We could be more nuanced here and allow it for content that
    // does not need to scroll.
    return false;
  };

  const onStart = () => {
    animation.progressStart(true, (isOpen) ? 1 : 0);
  };

  const onMove = (detail: GestureDetail) => {
    const step = detail.deltaY / height;
    if (step < 0) { return; }

    animation.progressStep(step);
  };

  const onEnd = (detail: GestureDetail) => {
    const velocity = detail.velocityY;
    const step = detail.deltaY / height;
    if (step < 0) { return; }

    const threshold = (detail.deltaY + velocity * 1000) / height;

    const shouldComplete = threshold >= 0.5;
    let newStepValue = (shouldComplete) ? -0.001 : 0.001;

    if (!shouldComplete) {
      animation.easing('cubic-bezier(1, 0, 0.68, 0.28)');
      newStepValue += getTimeGivenProgression([0, 0], [1, 0], [0.68, 0.28], [1, 1], step)[0];
    } else {
      animation.easing('cubic-bezier(0.32, 0.72, 0, 1)');
      newStepValue += getTimeGivenProgression([0, 0], [0.32, 0.72], [0, 1], [1, 1], step)[0];
    }

    const duration = (shouldComplete) ? computeDuration(step * height, velocity) : computeDuration((1 - step) * height, velocity);
    isOpen = shouldComplete;

    animation
      .onFinish(() => {
        if (shouldComplete) {
          onDismiss();
        }
      })
      .progressEnd((shouldComplete) ? 1 : 0, newStepValue, duration);
  };

  return createGesture({
    el,
    gestureName: 'modalSwipeToClose',
    gesturePriority: 40,
    direction: 'y',
    threshold: 10,
    canStart,
    onStart,
    onMove,
    onEnd
  });
};

const computeDuration = (remaining: number, velocity: number) => {
  return clamp(100, remaining / Math.abs(velocity * 1.1), 400);
};
