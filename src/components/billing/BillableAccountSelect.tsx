/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * BillableAccountSelect — self-contained dropdown that lets the user pick a
 * billable account (personal, organization, or eligible team) for runs that
 * consume wallet credits.
 *
 * Encapsulates eligibility merge logic and account-detail fetching. Callers
 * only need to provide a value/onChange pair and optionally observe the full
 * resolved account via `onSelectedAccountChange`.
 */

import { useCallback, useEffect, useMemo, Fragment } from 'react';
import {
  ActionList,
  ActionMenu,
  Button,
  Flash,
  FormControl,
  Label,
  Spinner,
  Text,
} from '@primer/react';
import {
  OrganizationIcon,
  PeopleIcon,
  PersonIcon,
} from '@primer/octicons-react';
import { Box } from '@datalayer/primer-addons';
import { useCache } from '../../hooks/useCache';
import { useSelectedPrincipal } from '../../hooks/useSelectedPrincipal';
import { useIAMStore } from '../../state';

export type BillableAccountType = 'user' | 'organization' | 'team';

export type BillableAccount = {
  accountUid: string;
  accountType: BillableAccountType;
  accountHandle: string;
  accountName: string;
  planName: string;
  isEligible: boolean;
  isPaidPlan: boolean;
  sourceOrganizationUid?: string;
  sourceOrganizationHandle?: string;
  teamHandle?: string;
};

export type BillableAccountSelectProps = {
  value: string;
  onChange: (accountUid: string) => void;
  onSelectedAccountChange?: (account: BillableAccount | undefined) => void;
  onAccountsResolved?: (state: {
    accounts: BillableAccount[];
    eligibleAccounts: BillableAccount[];
    isLoading: boolean;
    hasEligibleAccount: boolean;
  }) => void;
  disabled?: boolean;
  label?: string;
  caption?: string;
  emptyMessage?: string;
  flashMessage?: string;
  width?: string | number;
  preferOrganizationDefault?: boolean;
};

const PLAN_FREE_TERMS = ['free', 'starter'];
const PLAN_PRO_TERMS = ['pro', 'paid', 'team', 'enterprise', 'business'];

const BILLABLE_ACCOUNT_COOKIE = 'datalayer-billable-account-uid';
const BILLABLE_ACCOUNT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function readBillableAccountCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const escaped = BILLABLE_ACCOUNT_COOKIE.replace(
    /[.$?*|{}()[\]\\/+^]/g,
    '\\$&',
  );
  const match = document.cookie.match(
    new RegExp('(?:^|; )' + escaped + '=([^;]*)'),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function writeBillableAccountCookie(value: string): void {
  if (typeof document === 'undefined') return;
  document.cookie =
    `${BILLABLE_ACCOUNT_COOKIE}=${encodeURIComponent(value)};` +
    ` path=/; max-age=${BILLABLE_ACCOUNT_COOKIE_MAX_AGE}; SameSite=Lax`;
}

const planContains = (value: string, terms: string[]) =>
  terms.some(term => value.includes(term));

export function resolveBillablePlanTier(value: unknown): 'free' | 'pro' {
  const normalized = String(value ?? '').toLowerCase();
  if (!normalized || normalized === 'unknown') return 'free';
  if (planContains(normalized, PLAN_FREE_TERMS)) return 'free';
  if (planContains(normalized, PLAN_PRO_TERMS)) return 'pro';
  return 'free';
}

export function formatBillableAccountPlanLabel(planName: string): string {
  return resolveBillablePlanTier(planName) === 'pro'
    ? 'Team Plan'
    : 'Free Plan';
}

export function BillableAccountSelect({
  value,
  onChange,
  onSelectedAccountChange,
  onAccountsResolved,
  disabled = false,
  label = 'Run under',
  caption = 'Personal, organization, and eligible team accounts can be selected for billable assignment. For team billing, runtime runs are attributed to the parent organization while credits are consumed from the selected team wallet.',
  emptyMessage = 'No billable accounts available',
  flashMessage = 'Runs and credits are charged to the selected billable account. Wallet credits of that account are consumed; LLM token usage is tracked for visibility only. Accounts without an eligible plan or wallet balance are disabled.',
  width = 'min(100%, 520px)',
  preferOrganizationDefault = false,
}: BillableAccountSelectProps): JSX.Element {
  const { user } = useIAMStore();
  const {
    useEligibleSubscriptionAccounts,
    useSubscriptionAccountsDetails,
    useUserOrganizations,
  } = useCache();

  const { selectedPrincipalKind, selectedPrincipalUid } =
    useSelectedPrincipal();

  const userOrganizationsQuery = useUserOrganizations();
  const { data: eligibleAccountsRaw, isLoading: eligibleAccountsLoading } =
    useEligibleSubscriptionAccounts({
      refetchInterval: 10_000,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      staleTime: 0,
    });

  const eligibleAccounts = useMemo(
    () =>
      (eligibleAccountsRaw || []).map((entry: any) => ({
        accountUid: String(entry.account_uid || ''),
        accountType: String(entry.account_type || 'user'),
        accountHandle: String(entry.account_handle || '').trim(),
        accountName:
          String(entry.account_name || '').trim() ||
          String(entry.account_handle || '').trim() ||
          String(entry.account_uid || '').trim(),
        planName: String(
          entry?.subscription?.plan_name || entry?.plan?.plan_name || '',
        ).trim(),
      })),
    [eligibleAccountsRaw],
  );

  const personalAccountUid = String((user as any)?.id || '');
  const allContextAccounts = useMemo(() => {
    const accountMap = new Map<
      string,
      {
        accountUid: string;
        accountType: string;
        accountHandle: string;
        accountName: string;
        planName: string;
      }
    >();

    if (personalAccountUid) {
      accountMap.set(personalAccountUid, {
        accountUid: personalAccountUid,
        accountType: 'user',
        accountHandle: String((user as any)?.handle || '').trim(),
        accountName:
          String((user as any)?.handle || '').trim() || personalAccountUid,
        planName: '',
      });
    }

    for (const organization of (userOrganizationsQuery.data || []) as any[]) {
      const orgUid = String(organization?.uid || organization?.id || '').trim();
      if (!orgUid) continue;
      accountMap.set(orgUid, {
        accountUid: orgUid,
        accountType: 'organization',
        accountHandle: String(organization?.handle || '').trim(),
        accountName:
          String(organization?.handle || '').trim() ||
          String(organization?.name || '').trim() ||
          orgUid,
        planName: String(
          organization?.subscription?.plan_name ||
            organization?.plan_name ||
            '',
        ).trim(),
      });
    }

    return Array.from(accountMap.values());
  }, [personalAccountUid, user, userOrganizationsQuery.data]);

  const eligibleAccountByUid = useMemo(
    () => new Map(eligibleAccounts.map(a => [a.accountUid, a])),
    [eligibleAccounts],
  );

  const candidateUids = useMemo(() => {
    const values = new Set<string>();
    for (const a of allContextAccounts) values.add(a.accountUid);
    for (const a of eligibleAccounts) values.add(a.accountUid);
    if (value) values.add(value);
    return Array.from(values).filter(Boolean);
  }, [allContextAccounts, eligibleAccounts, value]);

  const { data: detailsRaw, isLoading: detailsLoading } =
    useSubscriptionAccountsDetails(candidateUids, {
      refetchInterval: 10_000,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      staleTime: 0,
    });

  const detailsByUid = useMemo(
    () =>
      new Map(
        (detailsRaw || []).map((entry: any) => [
          String(entry.account_uid || ''),
          entry,
        ]),
      ),
    [detailsRaw],
  );

  const accounts = useMemo<BillableAccount[]>(() => {
    const accountMap = new Map<string, (typeof allContextAccounts)[number]>();
    for (const a of allContextAccounts) accountMap.set(a.accountUid, a);
    for (const a of eligibleAccounts) accountMap.set(a.accountUid, a);

    const merged = Array.from(accountMap.values());
    const mergedByUid = new Map(merged.map(a => [a.accountUid, a]));

    return merged.map(account => {
      const eligible = eligibleAccountByUid.get(account.accountUid);
      const details = detailsByUid.get(account.accountUid);
      const accountType = String(
        details?.account_type || account.accountType || 'user',
      ) as BillableAccountType;
      const accountHandle = String(
        details?.account_handle || account.accountHandle || '',
      );
      const planName = String(
        details?.subscription?.plan_name ||
          eligible?.planName ||
          account.planName ||
          '',
      ).trim();

      const walletBalance = Number(
        accountType === 'team'
          ? (details?.wallet_balance ?? 0)
          : (details?.subscription?.wallet_balance ??
              details?.wallet_balance ??
              0),
      );
      const hasPositiveWallet =
        Number.isFinite(walletBalance) && walletBalance > 0;

      const isEligible =
        accountType === 'team'
          ? hasPositiveWallet
          : typeof details?.is_eligible === 'boolean'
            ? details.is_eligible ||
              (accountType === 'user' && hasPositiveWallet)
            : Boolean(eligible);

      const sourceOrganizationUid =
        accountType === 'team'
          ? String(details?.plan_source_account_uid || '').trim() || undefined
          : undefined;
      const sourceOrgDetails = sourceOrganizationUid
        ? detailsByUid.get(sourceOrganizationUid)
        : undefined;
      const sourceOrgMerged = sourceOrganizationUid
        ? mergedByUid.get(sourceOrganizationUid)
        : undefined;
      const sourceOrganizationHandle = sourceOrganizationUid
        ? String(
            sourceOrgDetails?.account_handle ||
              sourceOrgMerged?.accountHandle ||
              '',
          ).trim() || undefined
        : undefined;

      return {
        accountUid: account.accountUid,
        accountType,
        accountHandle,
        accountName: String(
          details?.account_name || account.accountName || account.accountUid,
        ),
        planName,
        isEligible,
        isPaidPlan: resolveBillablePlanTier(planName || 'free') === 'pro',
        sourceOrganizationUid,
        sourceOrganizationHandle,
        teamHandle: accountType === 'team' ? accountHandle : undefined,
      };
    });
  }, [
    allContextAccounts,
    eligibleAccounts,
    eligibleAccountByUid,
    detailsByUid,
  ]);

  const eligibleBillable = useMemo(
    () => accounts.filter(a => a.isEligible),
    [accounts],
  );
  const hasEligibleAccount = eligibleBillable.length > 0;
  const isLoading = eligibleAccountsLoading || detailsLoading;

  const storedBillableAccountUid = useMemo(
    () => readBillableAccountCookie(),
    [],
  );

  const preferredEligible = useMemo(() => {
    const fromCookie = storedBillableAccountUid
      ? eligibleBillable.find(
          account => account.accountUid === storedBillableAccountUid,
        )
      : undefined;
    if (fromCookie) return fromCookie;

    const personalEligible = eligibleBillable.find(
      a => a.accountType === 'user' && a.accountUid === personalAccountUid,
    );
    if (personalEligible) return personalEligible;

    const byPrincipal = selectedPrincipalUid
      ? eligibleBillable.find(account => {
          if (account.accountUid !== selectedPrincipalUid) return false;
          if (selectedPrincipalKind === 'organization')
            return account.accountType === 'organization';
          if (selectedPrincipalKind === 'team')
            return account.accountType === 'team';
          return account.accountType === 'user';
        })
      : undefined;
    if (byPrincipal) return byPrincipal;

    const firstOrg = eligibleBillable.find(
      a => a.accountType === 'organization',
    );
    if (preferOrganizationDefault && firstOrg) return firstOrg;
    return firstOrg || eligibleBillable[0];
  }, [
    storedBillableAccountUid,
    eligibleBillable,
    personalAccountUid,
    preferOrganizationDefault,
    selectedPrincipalKind,
    selectedPrincipalUid,
  ]);

  const handleAccountSelect = useCallback(
    (accountUid: string) => {
      writeBillableAccountCookie(accountUid);
      onChange(accountUid);
    },
    [onChange],
  );

  // Auto-select a sensible default when current value is empty/ineligible.
  useEffect(() => {
    if (isLoading) return;
    if (!preferredEligible) {
      if (value) onChange('');
      return;
    }
    const current = accounts.find(a => a.accountUid === value);
    if (!current || !current.isEligible) {
      writeBillableAccountCookie(preferredEligible.accountUid);
      onChange(preferredEligible.accountUid);
    }
  }, [isLoading, preferredEligible, accounts, value, onChange]);

  const selectedAccount = useMemo(
    () => accounts.find(a => a.accountUid === value),
    [accounts, value],
  );

  useEffect(() => {
    onSelectedAccountChange?.(selectedAccount);
  }, [selectedAccount, onSelectedAccountChange]);

  useEffect(() => {
    onAccountsResolved?.({
      accounts,
      eligibleAccounts: eligibleBillable,
      isLoading,
      hasEligibleAccount,
    });
  }, [
    accounts,
    eligibleBillable,
    isLoading,
    hasEligibleAccount,
    onAccountsResolved,
  ]);

  return (
    <FormControl>
      <FormControl.Label>{label}</FormControl.Label>
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <ActionMenu>
          <ActionMenu.Anchor>
            <Button
              variant="default"
              disabled={disabled || !hasEligibleAccount}
              sx={{ width, justifyContent: 'space-between' }}
            >
              {isLoading ? (
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 2,
                  }}
                >
                  <Spinner size="small" />
                  <Text sx={{ fontSize: 1 }}>Loading plan status...</Text>
                </Box>
              ) : selectedAccount ? (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    minWidth: 0,
                    gap: 2,
                  }}
                >
                  <Text
                    sx={{
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    @{selectedAccount.accountName}
                  </Text>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: 1,
                      flexShrink: 0,
                    }}
                  >
                    <Label
                      size="small"
                      variant="secondary"
                      title={
                        selectedAccount.accountType === 'organization'
                          ? 'Organization'
                          : selectedAccount.accountType === 'team'
                            ? 'Team'
                            : 'User'
                      }
                    >
                      {selectedAccount.accountType === 'organization' ? (
                        <OrganizationIcon size={12} />
                      ) : selectedAccount.accountType === 'team' ? (
                        <PeopleIcon size={12} />
                      ) : (
                        <PersonIcon size={12} />
                      )}
                    </Label>
                    <Label
                      size="small"
                      variant={
                        selectedAccount.isPaidPlan ? 'success' : 'attention'
                      }
                    >
                      {formatBillableAccountPlanLabel(selectedAccount.planName)}
                    </Label>
                  </Box>
                </Box>
              ) : !hasEligibleAccount ? (
                emptyMessage
              ) : (
                'Select a billable account'
              )}
            </Button>
          </ActionMenu.Anchor>
          <ActionMenu.Overlay width="large">
            <Box sx={{ p: 2 }}>
              <Flash variant="default">{flashMessage}</Flash>
            </Box>
            <ActionList selectionVariant="single">
              {isLoading ? (
                <ActionList.Item disabled>
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 2,
                    }}
                  >
                    <Spinner size="small" />
                    <Text sx={{ fontSize: 1 }}>Loading plan status...</Text>
                  </Box>
                </ActionList.Item>
              ) : !hasEligibleAccount ? (
                <ActionList.Item disabled>{emptyMessage}</ActionList.Item>
              ) : (
                (() => {
                  const typeOrder: Record<BillableAccountType, number> = {
                    user: 0,
                    organization: 1,
                    team: 2,
                  };
                  const sorted = [...accounts].sort(
                    (a, b) =>
                      (typeOrder[a.accountType] ?? 99) -
                      (typeOrder[b.accountType] ?? 99),
                  );
                  return sorted.map((account, idx) => {
                    const prevType =
                      idx > 0 ? sorted[idx - 1].accountType : undefined;
                    const showDivider =
                      prevType !== undefined &&
                      prevType !== account.accountType;
                    return (
                      <Fragment key={account.accountUid}>
                        {showDivider && <ActionList.Divider />}
                        <ActionList.Item
                          selected={account.accountUid === value}
                          disabled={!account.isEligible}
                          onSelect={() => {
                            if (account.isEligible) {
                              handleAccountSelect(account.accountUid);
                            }
                          }}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              width: '100%',
                              minWidth: 0,
                              gap: 2,
                            }}
                          >
                            <Text
                              sx={{
                                minWidth: 0,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              @{account.accountName}
                            </Text>
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                                gap: 1,
                                flexShrink: 0,
                              }}
                            >
                              <Label
                                size="small"
                                variant="secondary"
                                title={
                                  account.accountType === 'organization'
                                    ? 'Organization'
                                    : account.accountType === 'team'
                                      ? 'Team'
                                      : 'User'
                                }
                              >
                                {account.accountType === 'organization' ? (
                                  <OrganizationIcon size={12} />
                                ) : account.accountType === 'team' ? (
                                  <PeopleIcon size={12} />
                                ) : (
                                  <PersonIcon size={12} />
                                )}
                              </Label>
                              {!account.isEligible &&
                                account.accountType === 'team' && (
                                  <Label size="small" variant="attention">
                                    No credits
                                  </Label>
                                )}
                              <Label
                                size="small"
                                variant={
                                  account.isPaidPlan ? 'success' : 'attention'
                                }
                              >
                                {formatBillableAccountPlanLabel(
                                  account.planName,
                                )}
                              </Label>
                            </Box>
                          </Box>
                          <ActionList.Description variant="block">
                            {account.isEligible
                              ? 'Eligible'
                              : account.accountType === 'team'
                                ? 'Not eligible — no team credits allocated'
                                : 'Not eligible — activate a plan or add credits to use this account'}
                          </ActionList.Description>
                        </ActionList.Item>
                      </Fragment>
                    );
                  });
                })()
              )}
            </ActionList>
          </ActionMenu.Overlay>
        </ActionMenu>
      </Box>
      <FormControl.Caption>{caption}</FormControl.Caption>
    </FormControl>
  );
}

export default BillableAccountSelect;
