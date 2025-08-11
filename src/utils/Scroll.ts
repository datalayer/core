/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

const easeInOutQuad = (t, b, c, d) => {
  t /= d / 2;
  if (t < 1) return (c / 2) * t * t + b;
  t--;
  return (-c / 2) * (t * (t - 2) - 1) + b;
};

const scrollGo = (element: HTMLElement, target: string, to, duration: number) => {
  const start = element.scrollTop,
    change = to - start,
    increment = 20;
  let currentTime = 0;
  const animateScroll = () => {
    currentTime += increment;
    const scrollTop: number = easeInOutQuad(
      currentTime,
      start,
      change,
      duration
    );
    element.scrollTop = scrollTop;
    if (currentTime < duration) {
      setTimeout(animateScroll, increment);
    }
    else {
      window.location.hash = target;
    }
  };
  animateScroll();
};

const smoothScroll = (target: string) => {
  const targetScroll = document.getElementById(target);
  scrollGo(document.body, target, targetScroll?.offsetTop, 1250);
};

export default smoothScroll;
