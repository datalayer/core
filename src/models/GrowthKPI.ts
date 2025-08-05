/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
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
