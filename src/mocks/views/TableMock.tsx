/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { Box, LabelGroup, ActionMenu, ActionList, IconButton, Label, RelativeTime } from '@primer/react';
import { Table, DataTable } from '@primer/react/experimental';
import { KebabHorizontalIcon, DownloadIcon } from '@primer/octicons-react';
import { VisuallyHidden } from './../../components/display';

const now = Date.now()
const Second = 1000
const Minute = 60 * Second
const Hour = 60 * Minute
const Day = 24 * Hour
const Week = 7 * Day
const Month = 4 * Week

interface Repo {
  id: number
  name: string
  type: 'public' | 'internal'
  updatedAt: number
  securityFeatures: {
    dependabot: Array<string>
    codeScanning: Array<string>
  }
}

const data: Array<Repo> = [
  {
    id: 1,
    name: 'codeql-dca-worker',
    type: 'internal',
    updatedAt: now,
    securityFeatures: {
      dependabot: ['alerts', 'security updates'],
      codeScanning: ['report secrets'],
    },
  },
  {
    id: 2,
    name: 'aegir',
    type: 'public',
    updatedAt: now - 5 * Minute,
    securityFeatures: {
      dependabot: ['alerts'],
      codeScanning: ['report secrets'],
    },
  },
  {
    id: 3,
    name: 'strapi',
    type: 'public',
    updatedAt: now - 1 * Hour,
    securityFeatures: {
      dependabot: [],
      codeScanning: [],
    },
  },
  {
    id: 4,
    name: 'codeql-ci-nightlies',
    type: 'public',
    updatedAt: now - 6 * Hour,
    securityFeatures: {
      dependabot: ['alerts'],
      codeScanning: [],
    },
  },
  {
    id: 5,
    name: 'dependabot-updates',
    type: 'public',
    updatedAt: now - 1 * Day,
    securityFeatures: {
      dependabot: [],
      codeScanning: [],
    },
  },
  {
    id: 6,
    name: 'tsx-create-react-app',
    type: 'public',
    updatedAt: now - 1 * Week,
    securityFeatures: {
      dependabot: [],
      codeScanning: [],
    },
  },
  {
    id: 7,
    name: 'bootstrap',
    type: 'public',
    updatedAt: now - 1 * Month,
    securityFeatures: {
      dependabot: ['alerts'],
      codeScanning: [],
    },
  },
  {
    id: 8,
    name: 'docker-templates',
    type: 'public',
    updatedAt: now - 3 * Month,
    securityFeatures: {
      dependabot: ['alerts'],
      codeScanning: [],
    },
  },
]

function uppercase(input: string): string {
  return input[0].toUpperCase() + input.slice(1)
}

type Props = {
  title: string
}

export const TableMock = (props: Props) => {
  const { title } = props;
  return (
    <Box display="grid" sx={{ gap: 3 }}>
      <Table.Container>
        <Table.Title as="h2" id="repositories">
          {title}
        </Table.Title>
        <Table.Subtitle as="p" id="repositories-subtitle">
          A subtitle could appear here to give extra context to the data.
        </Table.Subtitle>
        <DataTable
          aria-labelledby="repositories"
          aria-describedby="repositories-subtitle"
          data={data}
          columns={[
            {
              header: 'Repository',
              field: 'name',
              rowHeader: true,
            },
            {
              header: 'Type',
              field: 'type',
              renderCell: row => {
                return <Label>{uppercase(row.type)}</Label>
              },
            },
            {
              header: 'Updated',
              field: 'updatedAt',
              renderCell: row => {
                return <RelativeTime date={new Date(row.updatedAt)} />
              },
            },
            {
              header: 'Dependabot',
              field: 'securityFeatures.dependabot',
              renderCell: row => {
                return row.securityFeatures.dependabot.length > 0 ? (
                  <LabelGroup>
                    {row.securityFeatures.dependabot.map(feature => {
                      return <Label key={feature}>{uppercase(feature)}</Label>
                    })}
                  </LabelGroup>
                ) : null
              },
            },
            {
              header: 'Code scanning',
              field: 'securityFeatures.codeScanning',
              renderCell: row => {
                return row.securityFeatures.codeScanning.length > 0 ? (
                  <LabelGroup>
                    {row.securityFeatures.codeScanning.map(feature => {
                      return <Label key={feature}>{uppercase(feature)}</Label>
                    })}
                  </LabelGroup>
                ) : null
              },
            },
            {
              id: 'actions',
              header: () => <VisuallyHidden>Actions</VisuallyHidden>,
              renderCell: row => {
                return (
                  <>
                    <IconButton
                      aria-label={`Download: ${row.name}`}
                      title={`Download: ${row.name}`}
                      icon={DownloadIcon}
                      variant="invisible"
                      onClick={() => {
                        alert(row)
                      }}
                    />
                    <ActionMenu>
                      <ActionMenu.Anchor>
                        <IconButton
                          aria-label={`Actions: ${row.name}`}
                          title={`Actions: ${row.name}`}
                          icon={KebabHorizontalIcon}
                          variant="invisible"
                        />
                      </ActionMenu.Anchor>
                      <ActionMenu.Overlay>
                        <ActionList>
                          <ActionList.Item
                            onSelect={() => {
                              alert(row);
                            }}
                          >
                            Copy row
                          </ActionList.Item>
                          <ActionList.Item>Edit row</ActionList.Item>
                          <ActionList.Item>Export row as CSV</ActionList.Item>
                          <ActionList.Divider />
                          <ActionList.Item variant="danger">Delete row</ActionList.Item>
                        </ActionList>
                      </ActionMenu.Overlay>
                    </ActionMenu>
                  </>
                )
              },
            },
          ]}
        />
      </Table.Container>
    </Box>
  )
}

export default TableMock;
