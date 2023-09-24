import { useState, useEffect } from 'react';
import { Label, Text } from '@primer/react';
import { Table, DataTable, PageHeader } from '@primer/react/drafts';
import { Contents } from '@jupyterlab/services';
import { DatalayerProps } from '../../Datalayer';

type Drive = Partial<Contents.IDrive> & {
  id: number,
}

const Drives = (props: DatalayerProps) => {
  const { app } = props;
  const [_, setDefaultDrive] = useState<Drive>();
  const [drives, setDrives] = useState<Drive[]>();
  useEffect(() => {
    if (app) {
      const defaultDrive: Contents.IDrive = (app.serviceManager.contents as any)["_defaultDrive"];
      setDefaultDrive({
        id: -1,
        ...defaultDrive,
      });
      const drives = Array.from(((app.serviceManager.contents as any)["_additionalDrives"] as Map<string, Contents.IDrive>).values());
      setDrives(drives.map((drive, id) => {
        return {
          id,
          ...drive,
        }
      }));
    }
  }, [app]);
  return (
    <>
      <PageHeader>
        <PageHeader.TitleArea>
          <PageHeader.Title>Drives</PageHeader.Title>
        </PageHeader.TitleArea>
      </PageHeader>
      { drives &&
        <Table.Container>
          <Table.Title as="h2" id="repositories">
            Drives
          </Table.Title>
          <Table.Subtitle as="p" id="repositories-subtitle">
            List of registered drives
          </Table.Subtitle>
          <DataTable
            aria-labelledby="file-types"
            aria-describedby="file-types-subtitle" 
            data={drives}
            columns={[
              // @ts-ignore
              {
                header: 'Name',
                field: 'name',
                renderCell: row => <Text>{row.name}</Text>
              },
              {
                header: 'sharedModelFactory',
                field: 'sharedModelFactory',
                renderCell: row => <Label>{String(row.sharedModelFactory?.collaborative)}</Label>
              },
            ]}
          />
        </Table.Container>
      }
    </>
  )
}

export default Drives;
