/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useState, useEffect, useCallback } from 'react';
import { FormControl, Select } from '@primer/react';
import { Box } from '@datalayer/primer-addons';
import { useCache, useUser } from './../../hooks';
import { useLayoutStore } from '../../state';
import { IAnySpace } from '../../models';

export const SpaceSelect = () => {
  const user = useUser();
  const { organization, space, updateLayoutSpace } = useLayoutStore();
  const {
    refreshUserSpaces,
    getUserSpaces,
    refreshOrganizationSpaces,
    getOrganizationSpaces,
  } = useCache();
  const [spaces, setSpaces] = useState<IAnySpace[]>([]);
  const [_, setSelection] = useState<IAnySpace | undefined>(space);
  useEffect(() => {
    if (organization) {
      refreshOrganizationSpaces(organization.id).then(resp => {
        if (resp.success) {
          setSpaces(getOrganizationSpaces(organization.id));
        }
      });
    } else {
      refreshUserSpaces().then(resp => {
        if (resp.success) {
          setSpaces(getUserSpaces());
        }
      });
    }
  }, [user, organization]);
  const onSelectionChange = useCallback(
    (e: any) => {
      const selectedSpace = (e.target as HTMLSelectElement).value;
      const org =
        selectedSpace === undefined
          ? undefined
          : spaces[parseInt(selectedSpace, 10)];
      setSelection(org);
      updateLayoutSpace(org);
    },
    [setSelection, spaces],
  );
  return (
    <>
      <Box as="form">
        <FormControl>
          <FormControl.Label>Select a space</FormControl.Label>
          <FormControl.Caption>
            This will go with you while you navigate
          </FormControl.Caption>
          <Select
            block
            width="medium"
            onChange={onSelectionChange}
            placeholder="Please select an space..."
          >
            {spaces.map((sp, index) => (
              <Select.Option value={`${index}`} selected={sp.id === space?.id}>
                {sp.name}
              </Select.Option>
            ))}
          </Select>
        </FormControl>
      </Box>
    </>
  );
};

export default SpaceSelect;
