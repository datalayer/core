import { useState, useEffect } from 'react';
import { Contents } from '@jupyterlab/services';
import { Label, Text } from '@primer/react';
import { Table, DataTable } from '@primer/react/drafts';
import { JupyterFrontEndProps } from '../../Datalayer';

type JupyterLabDrive = Partial<Contents.IDrive> & {
  id: number,
}

const Drives = (props: JupyterFrontEndProps) => {
  const { app } = props;
  const [_, setDefaultDrive] = useState<JupyterLabDrive>();
  const [drives, setDrives] = useState<JupyterLabDrive[]>();
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
