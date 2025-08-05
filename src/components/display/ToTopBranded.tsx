/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { Button } from "@primer/react-brand";
import { MoveToTopIcon }from '@primer/octicons-react';

export const ToTopBranded = () => {
  return (
    <div style={{position: 'fixed', bottom: '50px', left: '100px'}}>
      <Button leadingVisual={<MoveToTopIcon />} hasArrow={false} size="small" onClick={e => window.scrollTo(0, 0)}>Go Top</Button>
    </div>
  )
}

export default ToTopBranded;
