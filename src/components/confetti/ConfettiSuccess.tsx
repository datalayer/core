/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useWindowSize } from 'usehooks-ts';
import Confetti from 'react-confetti';

export const ConfettiSuccess = () => {
  const { width, height } = useWindowSize();
  return <Confetti width={width!} height={height!} />;
};

export default ConfettiSuccess;
