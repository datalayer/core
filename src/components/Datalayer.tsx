import { useState, useEffect } from 'react';
import { ThemeProvider, BaseStyles, Box } from '@primer/react';
import { DatalayerGreenIcon } from '@datalayer/icons-react';
import { UnderlineNav } from '@primer/react/drafts';
import DatalayerTab from './tabs/DatalayerTab';
import { requestAPI } from '../handler';

const Datalayer = (): JSX.Element => {
  const [tab, setTab] = useState(1);
  const [version, setVersion] = useState('');
  useEffect(() => {
    requestAPI<any>('get_config')
    .then(data => {
      setVersion(data.version);
    })
    .catch(reason => {
      console.error(
        `The Jupyter Server datalayer extension appears to be missing.\n${reason}`
      );
    });
  });
  return (
    <>
      <ThemeProvider>
        <BaseStyles>
          <Box style={{maxWidth: 700}}>
            <Box>
              <UnderlineNav>
                <UnderlineNav.Item aria-current="page" icon={() => <DatalayerGreenIcon colored/>} onSelect={e => {e.preventDefault(); setTab(1);}}>
                  Datalayer
                </UnderlineNav.Item>
              </UnderlineNav>
            </Box>
            <Box m={3}>
              {(tab === 1) && <DatalayerTab version={version} />}
            </Box>
          </Box>
        </BaseStyles>
      </ThemeProvider>
    </>
  );
}

export default Datalayer;
