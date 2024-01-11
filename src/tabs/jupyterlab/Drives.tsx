import { useState, useEffect } from 'react';
import { Label, Text, Box } from '@primer/react';
import { Table, DataTable, PageHeader } from '@primer/react/drafts';
import { Contents } from '@jupyterlab/services';
import { DatalayerProps } from '../../Datalayer';

type Drive = Partial<Contents.IDrive> & {
  id: number,
}

const Drives = (props: DatalayerProps) => {
  const { jupyterFrontend } = props;
  const [ defaultDrive, setDefaultDrive] = useState<Drive>();
  const [drives, setDrives] = useState<Drive[]>();
  useEffect(() => {
    if (jupyterFrontend) {
      const defaultDrive: Contents.IDrive = (jupyterFrontend.serviceManager.contents as any)["_defaultDrive"];
      setDefaultDrive({
        id: -1,
        ...defaultDrive,
      });
      const drives = Array.from(((jupyterFrontend.serviceManager.contents as any)["_additionalDrives"] as Map<string, Contents.IDrive>).values());
      setDrives(drives.map((drive, id) => {
        return {
          id,
          ...drive,
          name: drive.name,
        }
      }));
    }
  }, [jupyterFrontend]);
  return (
    <>
      <PageHeader>
        <PageHeader.TitleArea>
          <PageHeader.Title>Drives</PageHeader.Title>
        </PageHeader.TitleArea>
      </PageHeader>
      <Box>
        <h3>Default Drive</h3>
        <Text>{defaultDrive?.name}</Text>
        <Label style={{marginLeft: 3}}>{defaultDrive?.sharedModelFactory?.collaborative ? 'collaborative' : 'non collaborative'}</Label>
      </Box>
      { drives &&
        <Table.Container>
          <Table.Title as="h2" id="repositories">
            Additional Drives
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
                header: 'Shared Model Factory',
                field: 'sharedModelFactory',
                renderCell: row => <Label>{row.sharedModelFactory?.collaborative ? 'collaborative' : 'non collaborative'}</Label>
              },
            ]}
          />
        </Table.Container>
      }
    </>
  )
}

export default Drives;
