import { useState, useEffect } from 'react';
import { JupyterFrontEnd } from '@jupyterlab/application';
import { ThemeProvider, BaseStyles, Box, } from '@primer/react';
import { UnderlineNav } from '@primer/react/drafts';
import { DatalayerGreenIcon, JupyterLabIcon } from '@datalayer/icons-react';
import AboutTab from './tabs/AboutTab';
import JupyterLabTab from './tabs/JupyterLabTab';
import { requestAPI } from './jupyterlab/handler';
import useZustandStore from './state/zustand';

export type DatalayerProps = {
  app?: JupyterFrontEnd;
}

const Datalayer = (props: DatalayerProps) => {
  const { app } = props;
  const tabIndex = useZustandStore((state) => state.tabIndex);
  const setTabIndex = useZustandStore((state) => state.setTabIndex);
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
                <UnderlineNav.Item aria-label="jupyterlab" aria-current={tabIndex === 0 ? "page" : undefined} icon={() => <JupyterLabIcon colored/>} onSelect={e => {e.preventDefault(); setTabIndex(0);}}>
                  JupyterLab
                </UnderlineNav.Item>
                <UnderlineNav.Item aria-label="about" aria-current={tabIndex === 1 ? "page" : undefined} icon={() => <DatalayerGreenIcon colored/>} onSelect={e => {e.preventDefault(); setTabIndex(1);}}>
                  About
                </UnderlineNav.Item>
              </UnderlineNav>
            </Box>
            <Box m={3}>
              {tabIndex === 0 && app && <JupyterLabTab app={app} />}
              {tabIndex === 1 && <AboutTab version={version} />}
            </Box>
          </Box>
        </BaseStyles>
      </ThemeProvider>
    </>
  );
}

export default Datalayer;
