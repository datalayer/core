/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useCallback } from 'react';
import { Button, Text } from '@primer/react';
import { useCoreStore, useIAMStore } from '../../state';
import { useNavigate, useAuthorization } from '../../hooks';
import { FlashClosable } from '../../components/flashes';
import { CONTACT_ROUTE } from '../../routes';

export const FlashGuest = () => {
  const { configuration } = useCoreStore();
  const { user, logout } = useIAMStore();
  const { checkIsPlatformMember } = useAuthorization();
  const isPlatformMember = checkIsPlatformMember(user!);
  const navigate = useNavigate();
  const onRefreshPermission = useCallback(() => {
    logout();
    navigate('/jupyter/kernels/login');
  }, []);
  const onContactSupport = useCallback(() => {
    navigate(CONTACT_ROUTE);
  }, []);
  return (
    <>
      {!isPlatformMember &&
        <FlashClosable
          variant="warning"
          actions={
            <>
              <Button
                onClick={onRefreshPermission}
                title={'If your roles have recently been updated, you need to refresh your browser.'}
              >
                Refresh permissions
              </Button>
              <Button
                onClick={onContactSupport}
                title={'Contact the support to request the needed role.'}
              >
                {configuration?.whiteLabel
                  ? 'Contact the support'
                  : 'Datalayer support'}
              </Button>
            </>
          }
        >
          <Text>
            We appreciate your interest in joining Datalayer with a guest role.
            The platform administrator has been notified and will
            reach out to you to confirm the granting of your access.
          </Text>
        </FlashClosable>
      }
    </>
  );
}

export default FlashGuest;
