/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

export const asGrowthKPIs = (k: any): IGrowthKPIs => {
  return {
    usersCount: k.users_count,
  }
}

export type IGrowthKPIs = {
  usersCount: number;
}

export default IGrowthKPIs;
