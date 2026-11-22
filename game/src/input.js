// Keyboard and pointer input. One-shot presses (confirm, pause, restart,
// mute, play-a-card) are queued as events and taken once by the loop, so a
// press between two frames is never lost and never counted twice. Pointer
// moves only track the hovered card; clicks are queued with coordinates.
export const EV_CONFIRM = 'confirm';
export const EV_PAUSE = 'pause';
export const EV_MUTE = 'mute';
export const EV_RESTART = 'restart';

export function createInput(canvas) {
  const queue = [];
  let hover = { x: -1, y: -1 };

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    if (event.code === 'Space' || event.code === 'Enter') {
      queue.push({ type: EV_CONFIRM });
      event.preventDefault();
    } else if (event.code === 'KeyP' || event.code === 'Escape') {
      queue.push({ type: EV_PAUSE });
      event.preventDefault();
    } else if (event.code === 'KeyM') {
      queue.push({ type: EV_MUTE });
    } else if (event.code === 'KeyR') {
      queue.push({ type: EV_RESTART });
    } else if (/^Digit[1-7]$/.test(event.code)) {
      queue.push({ type: 'play', index: Number(event.code.slice(5)) - 1 });
      event.preventDefault();
    }
  });
  // A key released while the tab is hidden never sends keyup; nothing here is
  // held, so there is nothing to let go of.
  canvas.addEventListener('pointermove', (event) => {
    hover = { x: event.clientX, y: event.clientY };
  });
  canvas.addEventListener('pointerdown', (event) => {
    queue.push({ type: 'click', x: event.clientX, y: event.clientY });
  });

  return {
    hover() {
      return hover;
    },
    takeEvents() {
      const taken = queue.slice();
      queue.length = 0;
      return taken;
    },
  };
}
