/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Progress ring segment properties
 */
export interface IProgressRingItemProps {
  /**
   * Progress
   *
   * Value must be between 0 and 100.
   */
  progress: number;

  /**
   * Segment color.
   *
   * Default to foreground-color-accent
   */
  color?: string;
}

/**
 * Progress ring properties
 */
export interface IProgressRingProps
  extends React.SVGAttributes<SVGElement>,
    IProgressRingItemProps {
  /**
   * Accessible short description
   */
  title?: string;
}

export const PROGRESS_SEGMENTS: number = 44;

/**
 * Progress ring segment
 */
function Item(props: IProgressRingItemProps): JSX.Element {
  return (
    <circle
      className="determinate"
      style={{
        stroke: props.color ?? 'var(--fgColor-accent)',
        fill: 'none',
        strokeWidth: '2px',
        strokeLinecap: 'butt',
        transformOrigin: '50% 50%',
        transform: 'rotate(-90deg)',
        transition: 'all 0.2s ease-in-out',
        strokeDasharray: `${(PROGRESS_SEGMENTS * props.progress) / 100}px ${PROGRESS_SEGMENTS}px`,
      }}
      cx="8px"
      cy="8px"
      r="7px"
    />
  );
}

/**
 * Progress ring component
 *
 * Children {@link Item} must be order in decreasing progress order.
 */
export function ProgressRing(
  props: React.PropsWithChildren<IProgressRingProps>,
): JSX.Element {
  const { children, progress, color, title, ...others } = props;
  return (
    <svg
      className="dla-progress-ring"
      viewBox="0 0 16 16"
      role="progressbar"
      aria-valuenow={props.progress}
      aria-valuemin={0}
      aria-valuemax={100}
      {...others}
    >
      {title && <title>{title}</title>}
      <circle
        className="background"
        cx="8px"
        cy="8px"
        r="7px"
        style={{
          stroke: 'var(--control-bgColor-rest)',
          fill: 'none',
          strokeWidth: '2px',
        }}
      />
      {children ?? <Item progress={progress} color={color} />}
    </svg>
  );
}

ProgressRing.Item = Item;
