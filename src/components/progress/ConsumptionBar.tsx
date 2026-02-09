/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useEffect, useMemo, useState } from 'react';
import { ProgressBar, Tooltip, Button } from '@primer/react';
import { Box } from '@datalayer/primer-addons';
import { useInterval } from 'usehooks-ts';

const CRITICAL_LEVEL = 90;

const WARNING_LEVEL = 75;

/**
 * Format seconds into a human-friendly string (e.g., "2h 15m", "45m", "30s")
 */
function formatTimeRemaining(seconds: number): string {
  if (seconds < 0) return '0s';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  if (minutes > 0) {
    return secs > 0 && minutes < 5 ? `${minutes}m ${secs}s` : `${minutes}m`;
  }
  return `${secs}s`;
}

/**
 * Consumption progress bar properties
 */
export interface IConsumptionBarProps {
  /**
   * Credits burning rate per second
   */
  burningRate: number;
  /**
   * Consumption start timestamp
   */
  startedAt: number;
  /**
   * Consumption expiration timestamp
   */
  expiredAt?: number;
  /**
   * Progress bar refresh interval in milliseconds
   */
  refreshInterval?: number;
  /**
   * Component CSS styles
   */
  style?: React.CSSProperties;
  /**
   * Callback on progress bar click event
   */
  onClick?: () => void;
  /**
   * Callback on progress update.
   *
   * Progress is a percentage between 0 and 100.
   * Duration is the kernel max duration in seconds.
   */
  onUpdate?: (progress: number, duration: number) => void;
}

/**
 * Consumption progress bar
 */
export function ConsumptionBar(props: IConsumptionBarProps): JSX.Element {
  const {
    expiredAt,
    startedAt,
    burningRate,
    onClick,
    onUpdate,
    refreshInterval = 2000,
    style,
  } = props;
  const duration = useMemo(
    () => (expiredAt ? expiredAt - startedAt : Date.now() / 1000 - startedAt),
    [expiredAt, startedAt],
  );
  const [progress, setProgress] = useState<number>(
    expiredAt
      ? Math.min(
          Math.max(0, ((Date.now() / 1000 - startedAt) / duration!) * 100),
          100,
        )
      : 100,
  );

  useEffect(() => {
    if (onUpdate) {
      onUpdate(progress, duration);
    }
  }, [onUpdate, progress, duration]);

  useInterval(() => {
    if (expiredAt) {
      setProgress(
        Math.min(
          Math.max(0, ((Date.now() / 1000 - startedAt) / duration!) * 100),
          100,
        ),
      );
    }
  }, refreshInterval);
  const bg = expiredAt
    ? progress! > CRITICAL_LEVEL
      ? 'danger.emphasis'
      : progress! > WARNING_LEVEL
        ? 'severe.emphasis'
        : 'success.emphasis'
    : 'neutral.emphasis';
  const burntCredits = duration * burningRate;
  const secondsRemaining = (1 - progress / 100) * duration;
  const title = duration
    ? `${formatTimeRemaining(secondsRemaining)} left - ${((progress / 100) * burntCredits).toFixed(2)} / ${burntCredits.toFixed(2)} credits`
    : `Started at ${new Date(startedAt * 1000).toISOString()} - ${burntCredits.toFixed(2)} credits consumed`;
  return (
    <>
      <Tooltip text={title} direction="w">
        <Button
          variant="invisible"
          onClick={onClick}
          onKeyDown={
            onClick
              ? event => {
                  if (event.key === 'Enter' || event.key === 'Space') {
                    onClick();
                  }
                }
              : undefined
          }
          tabIndex={onClick ? 0 : -1}
          sx={{ cursor: onClick ? 'pointer' : 'default' }}
        >
          <Box sx={{ width: '70px' }}>
            <ProgressBar
              style={style}
              animated={expiredAt ? false : true}
              bg={bg}
              progress={progress}
            />
          </Box>
        </Button>
      </Tooltip>
    </>
  );
}
