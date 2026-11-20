/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { Heading, Text } from '@primer/react';
import { Box } from '@datalayer/primer-addons';
import { IconProps } from '@primer/octicons-react';
import clsx from 'clsx';

import styles from './../../../style/animation/Animation.module.css';

type IStepBlockProps = {
  date: string;
  title: string;
  description: string;
  StepIcon: React.FC<IconProps & { colored?: boolean }>;
};

export const StepBlock = (props: IStepBlockProps) => {
  const { date, title, description, StepIcon: BlockIcon } = props;
  return (
    <div className={styles.TimelineBarExample}>
      <Box className={styles.TimelineBarExample__row}>
        <Box className={styles.TimelineBarExample__end}>
          <Heading as="h1" className={styles.TimelineBarExample__slideIn}>
            {date}
          </Heading>
          <Text
            as="p"
            className={clsx(
              styles.TimelineBarExample__text,
              styles.TimelineBarExample__slideIn,
              styles['TimelineBarExample__slideIn--delayed'],
            )}
          >
            <Text className={styles.TimelineBarExample__highlightedText}>
              {title}
            </Text>{' '}
            {description}
          </Text>
          <BlockIcon size={100} colored />
        </Box>
        <div className={styles.TimelineBarExample__start}>
          <span className={styles.TimelineBarExample__line} />
          <span className={styles.TimelineBarExample__icon}>
            <BlockIcon size={24} fill="white" />
          </span>
        </div>
      </Box>
    </div>
  );
};

export default StepBlock;
