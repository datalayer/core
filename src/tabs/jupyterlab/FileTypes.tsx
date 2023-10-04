import { useState, useEffect } from 'react';
import { LabelGroup, Label, Text, Box } from '@primer/react';
import { Table, DataTable, PageHeader } from '@primer/react/drafts';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { DatalayerProps } from '../../Datalayer';

class FileType implements DocumentRegistry.IFileType {
  private _fileType;
  constructor(fileType: any) {
    this._fileType = fileType;
  }
  get id() { return this._fileType.name }
  get name() { return this._fileType.name }
  get displayName() { return this._fileType.displayName }
  get fileFormat() { return this._fileType.fileFormat }
  get icon() { return this._fileType.icon }
  get extensions() { return this._fileType.extensions }
  get contentType() {return this._fileType.contentType() }
  get mimeTypes() { return this._fileType.mimeTypes() }
  get pattern()  { return this._fileType.pattern() }
  get iconClass() { return this._fileType.iconClass() }
  get iconLabel() { return this._fileType.iconLabel() }
}

const FileTypes = (props: DatalayerProps) => {
  const { jupyterFrontend } = props;
  const [fileTypes, setFileTypes] = useState<FileType[]>();
  useEffect(() => {
    if (jupyterFrontend) {
      const fileTypes = Array.from(jupyterFrontend.docRegistry.fileTypes());
      const jupyterlabFileTypes = fileTypes.map(fileType => new FileType(fileType));
      setFileTypes(jupyterlabFileTypes);    
    }
  }, [jupyterFrontend]);
  return (
    <>
      <PageHeader>
        <PageHeader.TitleArea>
          <PageHeader.Title>File Types</PageHeader.Title>
        </PageHeader.TitleArea>
      </PageHeader>
      { fileTypes &&
        <Table.Container>
          <Table.Title as="h2" id="file-types">
            File types
          </Table.Title>
          <Table.Subtitle as="p" id="file-types-subtitle">
            List of registered file types.
          </Table.Subtitle>
          <DataTable
            aria-labelledby="file-types"
            aria-describedby="file-types-subtitle" 
            data={fileTypes}
            columns={[
              // @ts-ignore
              {
                header: 'Icon',
                field: 'icon',
                renderCell: row => {
                  return row.icon ?
                    <Box sx={{width: 16, height: 16}}><row.icon.react /></Box>
                  :
                    <></>;
                }
              },
              {
                header: 'Name',
                field: 'name',
                renderCell: row => {
                  return row.name;
                }
              },
              {
                header: 'Display Name',
                field: 'displayName',
                renderCell: row => {
                  return <Text>{String(row.displayName)}</Text>
                }
              },
              {
                header: 'Extensions',
                field: 'extensions',
                renderCell: row => {
                  return (
                    <LabelGroup>
                      {row.extensions.map((extension: string) => <Label>{extension}</Label>)}
                    </LabelGroup>
                  );
                }
              },
              {
                header: 'File Format',
                field: 'fileFormat',
                renderCell: row => {
                  return <Label variant="primary">{String(row.fileFormat)}</Label>
                }
              },
            ]
          }
        />
      </Table.Container>
    }
    </>
  )
}

export default FileTypes;
