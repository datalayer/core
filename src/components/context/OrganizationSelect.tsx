/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { useState, useEffect, useCallback } from "react";
import { Select } from "@primer/react";
import { useCache, useUser } from "./../../hooks";
import { useLayoutStore } from "../../state";
import { IAnyOrganization } from "../../models";

const NO_ORGANIZATION_SELECTED_VALUE = "NO_ORGANIZATION_SELECTED_VALUE";

export const OrganizationSelect = () => {
  const user = useUser();
  const { organization, updateLayoutOrganization, updateLayoutSpace } = useLayoutStore();
  const { refreshUserOrganizations, getUserOrganizations } = useCache();
  const [organizations, setOrganizations] = useState(getUserOrganizations());
  const [_, setSelection] = useState<IAnyOrganization | undefined>(organization);
  useEffect(() => {
    refreshUserOrganizations(user).then(resp => {
      if (resp.success) {
        setOrganizations(getUserOrganizations());
      }
    });
  }, [user]);
  const onSelectionChange = useCallback(
    (e: any) => {
      const selectedOrganization = (e.target as HTMLSelectElement).value;
      const org = selectedOrganization === NO_ORGANIZATION_SELECTED_VALUE
       ? undefined
       : organizations[parseInt(selectedOrganization, 10)];
      setSelection(org);
      updateLayoutOrganization(org);
      updateLayoutSpace(undefined);
    },
    [setSelection, organizations]
  );
  return (
    <>
      <Select
        block
        width="medium"
        onChange={onSelectionChange}
      >
        <Select.Option
          value={NO_ORGANIZATION_SELECTED_VALUE}
          selected={organization === undefined}
        >
          Please select an organization...
        </Select.Option>
        {organizations.map((org, index) => (
          <Select.Option
            value={`${index}`}
            selected={org.id === organization?.id}
          >
            {org.name}
          </Select.Option>
        ))}
      </Select>
    </>
  )
}

export default OrganizationSelect;
