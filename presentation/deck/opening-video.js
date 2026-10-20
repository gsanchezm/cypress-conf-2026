// The Design viewer renders slide HTML through React. Inline on* attributes
// become string-valued React event props and crash the viewer, so controls use
// data attributes with delegated DOM listeners registered before it mounts.
(() => {
  const openingSlide = 'section[data-label="Opening Video"]';

  function videoIn(slide) {
    return slide?.querySelector('video[data-start-time="36"]');
  }

  function setToggleText(video) {
    const toggle = video.closest(openingSlide)?.querySelector('[data-video-action="toggle"]');
    if (toggle) toggle.textContent = video.paused ? 'Play with sound' : 'Pause';
  }

  window.addEventListener('loadedmetadata', (event) => {
    const video = event.target;
    if (!(video instanceof HTMLVideoElement) || !video.closest(openingSlide)) return;
    if (video.currentTime < 35.9) video.currentTime = 36;
  }, true);

  window.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest('[data-video-action]') : null;
    if (!button || !button.closest(openingSlide)) return;
    event.preventDefault();
    event.stopPropagation();
    const video = videoIn(button.closest(openingSlide));
    if (!video) return;
    if (button.getAttribute('data-video-action') === 'restart') video.currentTime = 36;
    if (video.paused || button.getAttribute('data-video-action') === 'restart') {
      video.muted = false;
      void video.play();
    } else {
      video.pause();
    }
    setToggleText(video);
  }, true);

  for (const type of ['play', 'pause', 'ended']) {
    window.addEventListener(type, (event) => {
      const video = event.target;
      if (!(video instanceof HTMLVideoElement) || !video.closest(openingSlide)) return;
      if (type === 'ended') video.currentTime = 36;
      setToggleText(video);
    }, true);
  }
})();
