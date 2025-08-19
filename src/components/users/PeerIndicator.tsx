/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useEffect, useState } from 'react';
import { Avatar, AvatarStack } from '@primer/react';
import type { Awareness } from 'y-protocols/awareness';
import { getAvatarURL, getRelativeTime } from '../../utils';

const AVATAR_SIZE = 28;

const SPACER_USER_AGENT = 'DatalayerSpacer';

const AWARENESS_NOTIFICATION_TIMEOUT_MS = 30_000;

enum NotificationType {
  PROGRESS = 'var(--borderColor-accent-emphasis)',
  ERROR = 'var(--borderColor-danger-emphasis)',
  SUCCESS = 'var(--borderColor-success-emphasis)',
}

const MSG_TO_NOTIFICATION = {
  '-1': NotificationType.ERROR,
  '0': NotificationType.PROGRESS,
  '1': NotificationType.SUCCESS,
};

/**
 * PeersIndicator properties
 */
export type IPeersIndicatorProps = {
  /**
   * Document awareness
   */
  awareness: Awareness;
  /**
   * Current user handle
   */
  currentUserHandle: string;
};

function isExpired(timestamp: number): boolean {
  // Timestamp is expired if older than 10 seconds ago
  return timestamp + AWARENESS_NOTIFICATION_TIMEOUT_MS < Date.now();
}

type PeerAvatar = {
  handle: string;
  avatarUrl?: string;
  displayName: string;
  initials: string;
  color: string;
  username: string;
  notification?: string;
  notificationType?: NotificationType;
};

function defaultAvatarSrc(color: string, text: string): string {
  const svg = `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="12" fill="${color}" stroke="none" /><text x="12" y="12" fill="black">${text}</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/**
 * Connected peers indicator
 */
export function PeersIndicator({
  awareness,
  currentUserHandle,
}: IPeersIndicatorProps): JSX.Element | null {
  const [peers, setPeers] = useState<PeerAvatar[]>([]);
  useEffect(() => {
    const onAwarenessChange = () => {
      const peers = awareness.getStates();
      setPeers(
        Array.from(peers.values())
          .filter(
            p =>
              p.user &&
              p.user?.name !== currentUserHandle &&
              !(p.user?.agent ?? '').startsWith(SPACER_USER_AGENT),
          )
          .reduce<PeerAvatar[]>((agg, peer) => {
            const user = peer.user;
            const notExpiredNotification = !isExpired(
              peer.notification?.timestamp ?? 0,
            );
            const newPeer = user.agent
              ? ({
                  // TODO pick something better
                  avatarUrl:
                    'https://static.vecteezy.com/system/resources/previews/006/662/139/large_2x/artificial-intelligence-ai-processor-chip-icon-symbol-for-graphic-design-logo-web-site-social-media-mobile-app-ui-illustration-free-vector.jpg',
                  color: user.color,
                  displayName: user.agent,
                  handle: 'agent',
                  initials: 'AI',
                  username: user.agent,
                  notification: notExpiredNotification
                    ? `${peer.notification?.message} ${getRelativeTime(new Date(peer.notification.timestamp))}`
                    : undefined,
                  notificationType:
                    notExpiredNotification &&
                    peer.notification?.message_type !== undefined
                      ? MSG_TO_NOTIFICATION[
                          peer.notification?.message_type.toString()
                        ]
                      : undefined,
                } satisfies PeerAvatar)
              : ({
                  avatarUrl: user.avatar_url,
                  color: user.color,
                  displayName: user.display_name,
                  handle: user.name,
                  initials: user.initials,
                  username: user.username,
                } satisfies PeerAvatar);

            // Ensure to display a peer only once
            if (!agg.map(p => p.username).includes(newPeer.username)) {
              agg.push(newPeer);
            }
            return agg;
          }, []),
      );
    };
    onAwarenessChange();
    awareness.on('change', onAwarenessChange);
    // Force regular update to update agent notification
    const updateInterval = setInterval(
      onAwarenessChange,
      AWARENESS_NOTIFICATION_TIMEOUT_MS / 3,
    );
    return () => {
      clearInterval(updateInterval);
      awareness.off('change', onAwarenessChange);
    };
  }, [awareness, currentUserHandle]);
  return (
    <AvatarStack>
      {peers.map(peer => {
        let title = `${peer.displayName}\n${peer.handle}`;
        if (peer.notification) {
          title += `\n${peer.notification}`;
        }
        return (
          <Avatar
            key={peer.displayName}
            sx={{
              border: peer.notificationType
                ? `var(--borderWidth-thick) solid ${peer.notificationType}`
                : 'none',
            }}
            title={title}
            src={
              peer.avatarUrl
                ? getAvatarURL(peer.avatarUrl)
                : defaultAvatarSrc(peer.color, peer.initials)
            }
            size={AVATAR_SIZE}
          />
        );
      })}
    </AvatarStack>
  );
}
