/* Classic: the footer as it has always been. The shared base does the work (the letters rise as they arrive,
   the steel follows the light), so this scene adds nothing: no layer, no tween, no listener. */
const idle = () => {};

export default {
  id: 'classic',
  name: 'Classic',
  mount() {
    return { play: idle, pause: idle, resume: idle, still: idle, destroy: idle };
  },
};
