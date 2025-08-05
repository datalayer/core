/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { IAnyOrganization } from '../../models';

export type IOrganizationState = {
  organizations: IAnyOrganization[];
}

export type OrganizationState = IOrganizationState & {
  updateOrganizations: (organizations: IAnyOrganization[]) => void;
};

export const organizationStore = createStore<OrganizationState>((set, get) => ({
  organizations: [],
  updateOrganizations: (organizations: IAnyOrganization[]) => set((state: OrganizationState) => ({
    organizations
  })),
}));

export function useOrganizationStore(): OrganizationState;
export function useOrganizationStore<T>(selector: (state: OrganizationState) => T): T;
export function useOrganizationStore<T>(selector?: (state: OrganizationState) => T) {
  return useStore(organizationStore, selector!);
}

export default useOrganizationStore;
