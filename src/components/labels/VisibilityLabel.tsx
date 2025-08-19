/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { Label } from '@primer/react';

export const VisibilityLabel = (props: { isPublic: boolean | undefined }) => {
  const { isPublic } = props;
  if (isPublic === undefined) {
    return <></>;
  }
  return isPublic ? (
    <Label variant="success" sx={{ marginLeft: 3 }}>
      Public
    </Label>
  ) : (
    <Label variant="danger" sx={{ marginLeft: 3 }}>
      Private
    </Label>
  );
};

export default VisibilityLabel;
