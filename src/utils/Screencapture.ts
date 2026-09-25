/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { toPng } from 'html-to-image';

/**
 * A picture of one rendered node, as a PNG data URL.
 *
 * This used `html2canvas`, which does not capture a node: it clones the
 * **whole document** into a hidden iframe and paints all of it, then crops.
 * On a rendered notebook that is every cell, every editor and every output,
 * and the clone is synchronous — the page froze for ten seconds or more with
 * the share dialog saying "preparing…", which reads as a hang, and on a
 * longer notebook it was one. `html-to-image` serialises the node's own
 * subtree into an SVG `foreignObject` and rasterises that: the work is
 * proportional to the output being shared, and it yields to the page.
 *
 * Cross-origin pictures are fetched for the clone, as before, so a cell
 * carrying an `<img>` from the web does not capture as a blank rectangle.
 */
export const takeHTMLNodeScreencapture = async (
  node: HTMLDivElement,
): Promise<string> => {
  const { backgroundColor } = getComputedStyle(node);
  return toPng(node, {
    // Crisp on a dense display, still a modest file for a text output.
    pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    // Outputs are usually transparent over the page's canvas: give the
    // picture that canvas rather than a transparent one.
    backgroundColor:
      backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)'
        ? backgroundColor
        : getComputedStyle(document.body).backgroundColor || '#ffffff',
    cacheBust: true,
  });
};
