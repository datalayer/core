import { useState, useEffect } from 'react';
import { JupyterFrontEnd } from '@jupyterlab/application';
import { ThemeProvider, BaseStyles, Box } from '@primer/react';
import { UnderlineNav } from '@primer/react/drafts';
import { DatalayerGreenIcon, JupyterBaseIcon } from '@datalayer/icons-react';
import AboutTab from './tabs/AboutTab';
import JupyterLabTab from './tabs/JupyterLabTab';
import { requestAPI } from '../handler';

export type JupyterFrontEndProps = {
  app?: JupyterFrontEnd;
}

const Datalayer = (props: JupyterFrontEndProps) => {
  const { app } = props;
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
          <Box>
            <Box>
              <UnderlineNav>
                <UnderlineNav.Item aria-current="page" icon={() => <JupyterBaseIcon colored/>} onSelect={e => {e.preventDefault(); setTab(1);}}>
                  JupyterLab
                </UnderlineNav.Item>
                <UnderlineNav.Item icon={() => <DatalayerGreenIcon colored/>} onSelect={e => {e.preventDefault(); setTab(2);}}>
                  About
                </UnderlineNav.Item>
              </UnderlineNav>
            </Box>
            <Box m={3}>
              {tab === 1 && app && <JupyterLabTab app={app} />}
              {tab === 2 && <AboutTab version={version} />}
            </Box>
          </Box>
        </BaseStyles>
      </ThemeProvider>
    </>
  );
}

export default Datalayer;
