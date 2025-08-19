/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { ActionMenu, ActionList } from '@primer/react';
import {
  WorkflowIcon,
  ArchiveIcon,
  GearIcon,
  RocketIcon,
  CopyIcon,
  CommentIcon,
  BookIcon,
} from '@primer/octicons-react';

type Props = {
  title: string;
};

export const ActionMenuMock = (props: Props) => {
  const { title } = props;
  return (
    <ActionMenu>
      <ActionMenu.Button>{title}</ActionMenu.Button>
      <ActionMenu.Overlay width="auto">
        <ActionList>
          <ActionList.Item onSelect={() => alert('Workflows clicked')}>
            Workflows
            <ActionList.LeadingVisual>
              <WorkflowIcon />
            </ActionList.LeadingVisual>
          </ActionList.Item>
          <ActionList.Item onSelect={() => alert('Archived items clicked')}>
            Archived items
            <ActionList.LeadingVisual>
              <ArchiveIcon />
            </ActionList.LeadingVisual>
          </ActionList.Item>
          <ActionList.LinkItem href="/">
            Settings
            <ActionList.LeadingVisual>
              <GearIcon />
            </ActionList.LeadingVisual>
          </ActionList.LinkItem>
          <ActionList.Item onSelect={() => alert('Make a copy clicked')}>
            Make a copy
            <ActionList.LeadingVisual>
              <CopyIcon />
            </ActionList.LeadingVisual>
          </ActionList.Item>
          <ActionList.Divider />
          <ActionList.Group>
            <ActionList.GroupHeading>GitHub projects</ActionList.GroupHeading>
            <ActionList.LinkItem href="/">
              What&apos;s new
              <ActionList.LeadingVisual>
                <RocketIcon />
              </ActionList.LeadingVisual>
            </ActionList.LinkItem>
            <ActionList.LinkItem href="/">
              Give feedback
              <ActionList.LeadingVisual>
                <CommentIcon />
              </ActionList.LeadingVisual>
            </ActionList.LinkItem>
            <ActionList.LinkItem href="/">
              GitHub Docs
              <ActionList.LeadingVisual>
                <BookIcon />
              </ActionList.LeadingVisual>
            </ActionList.LinkItem>
          </ActionList.Group>
        </ActionList>
      </ActionMenu.Overlay>
    </ActionMenu>
  );
};

export default ActionMenuMock;
