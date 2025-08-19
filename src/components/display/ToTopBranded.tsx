/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { Button } from '@primer/react-brand';
import { MoveToTopIcon } from '@primer/octicons-react';

export const ToTopBranded = () => {
  return (
    <div style={{ position: 'fixed', bottom: '50px', left: '100px' }}>
      <Button
        leadingVisual={<MoveToTopIcon />}
        hasArrow={false}
        size="small"
        onClick={e => window.scrollTo(0, 0)}
      >
        Go Top
      </Button>
    </div>
  );
};

export default ToTopBranded;
