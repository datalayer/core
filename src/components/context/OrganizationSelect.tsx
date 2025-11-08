/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { ChangeEvent, useCallback, useEffect } from 'react';
import { Select } from '@primer/react';
import { useCache, useUser } from './../../hooks';
import { useLayoutStore } from '../../state';

const NO_ORGANIZATION_SELECTED_VALUE = 'NO_ORGANIZATION_SELECTED_VALUE';

export const OrganizationSelect = () => {
  const user = useUser();
  const { organization, updateLayoutOrganization, updateLayoutSpace } =
    useLayoutStore();
  const { useRefreshUserOrganizations, useUserOrganizations } = useCache();
  const { mutate: refreshUserOrganizationsMutate } =
    useRefreshUserOrganizations();
  const { data: organizations = [] } = useUserOrganizations();

  useEffect(() => {
    if (user) {
      refreshUserOrganizationsMutate();
    }
  }, [user, refreshUserOrganizationsMutate]);
  const onSelectionChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const selectedOrganization = event.target.value;
      const org =
        selectedOrganization === NO_ORGANIZATION_SELECTED_VALUE
          ? undefined
          : organizations[parseInt(selectedOrganization, 10)];
      updateLayoutOrganization(org);
      updateLayoutSpace(undefined);
    },
    [organizations, updateLayoutOrganization, updateLayoutSpace],
  );
  return (
    <>
      <Select block width="medium" onChange={onSelectionChange}>
        <Select.Option
          value={NO_ORGANIZATION_SELECTED_VALUE}
          selected={organization === undefined}
        >
          Please select an organization...
        </Select.Option>
        {organizations.map((org, index) => (
          <Select.Option
            key={org.id}
            value={`${index}`}
            selected={org.id === organization?.id}
          >
            {org.name}
          </Select.Option>
        ))}
      </Select>
    </>
  );
};

export default OrganizationSelect;
