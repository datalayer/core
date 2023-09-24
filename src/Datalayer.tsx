import { useState, useEffect } from 'react';
import { JupyterFrontEnd } from '@jupyterlab/application';
import { ThemeProvider, BaseStyles, Box, } from '@primer/react';
import { UnderlineNav } from '@primer/react/drafts';
import { DatalayerGreenIcon, JupyterLabIcon } from '@datalayer/icons-react';
import AboutTab from './tabs/AboutTab';
import JupyterLabTab from './tabs/JupyterLabTab';
import { requestAPI } from './jupyterlab/handler';

export type DatalayerProps = {
  app?: JupyterFrontEnd;
}

const Datalayer = (props: DatalayerProps) => {
  const { app } = props;
  const [tab, setTab] = useState(1);
  const [version, setVersion] = useState('');
  useEffect(() => {
    requestAPI<any>('config')
    .then(data => {
      setVersion(data.version);
    })
    .catch(reason => {
      console.error(
        `Error while accessing the jupyter server datalayer extension.\n${reason}`
      );
    });
  });
  return (
    <>
      <ThemeProvider>
        <BaseStyles>
          <Box>
            <Box>
              <UnderlineNav aria-label="datalayer">
                <UnderlineNav.Item aria-label="jupyterlab" aria-current={tab === 1 ? "page" : undefined} icon={() => <JupyterLabIcon colored/>} onSelect={e => {e.preventDefault(); setTab(1);}}>
                  JupyterLab
                </UnderlineNav.Item>
                <UnderlineNav.Item aria-label="about" aria-current={tab === 2 ? "page" : undefined} icon={() => <DatalayerGreenIcon colored/>} onSelect={e => {e.preventDefault(); setTab(2);}}>
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
