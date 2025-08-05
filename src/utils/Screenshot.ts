/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import html2canvas from 'html2canvas';

export const takeHTMLNodeScreenshot = async (node: HTMLDivElement): Promise<string> => {
  const sc = html2canvas(node, {
    width: node.getBoundingClientRect().width,
    height: node.getBoundingClientRect().height,
  });
  return sc.then((canvas) => {
    const croppedCanvas = document.createElement('canvas');
    const croppedCanvasContext = croppedCanvas.getContext('2d');
    const top = 0;
    const left = 0;
    const width = canvas.width;
    const height = canvas.height;
    croppedCanvas.width = width;
    croppedCanvas.height = height;
    croppedCanvasContext?.drawImage(
      canvas,
      left, top, width, height,
      left, top, width, height,
    );
//    const type = 'image/jpeg';
    const type = 'image/png';
    const quality = 1;
    const outputshotData = croppedCanvas.toDataURL(type, quality);
    return outputshotData;
  });
}
