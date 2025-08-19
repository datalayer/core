/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import {
  AnimationProvider,
  Stack,
  Heading,
  Text,
  Animate,
  Prose,
} from '@primer/react-brand';
import { IconProps } from '@primer/octicons-react';

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
    <AnimationProvider staggerDelayIncrement={200}>
      <div className={styles.TimelineBarExample}>
        <Stack direction="horizontal" padding="none" justifyContent="center">
          <Stack
            direction="vertical"
            className={styles.TimelineBarExample__end}
          >
            <Heading as="h1" size="6" animate="slide-in-right">
              {date}
            </Heading>
            <Text
              className={styles.TimelineBarExample__text}
              as="p"
              size="600"
              animate="slide-in-right"
            >
              <Text
                className={styles.TimelineBarExample__highlightedText}
                size="600"
              >
                {title}
              </Text>{' '}
              <Prose html={description} />
            </Text>
            <BlockIcon size={100} colored />
            {/* <Button variant="subtle" size="large" as="a" href="https://datalayer.io">Datalayer</Button> */}
          </Stack>
          <div className={styles.TimelineBarExample__start}>
            <Animate
              className={styles.TimelineBarExample__line}
              animate={{ variant: 'fill-in-top' }}
            />
            <span className={styles.TimelineBarExample__icon}>
              <BlockIcon size={24} fill="white" />
            </span>
          </div>
        </Stack>
      </div>
    </AnimationProvider>
  );
};

export default StepBlock;
