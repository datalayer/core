import { useState, useEffect } from 'react';
import { JupyterFrontEnd } from '@jupyterlab/application';
import { ThemeProvider, BaseStyles, Box, } from '@primer/react';
import { UnderlineNav } from '@primer/react';
import { DatalayerGreenPaddingIcon, JupyterLabIcon } from '@datalayer/icons-react';
import AboutTab from './tabs/AboutTab';
import JupyterLabTab from './tabs/JupyterLabTab';
import { requestAPI } from './jupyterlab/handler';
import useStore from './state/zustand';

export type DatalayerProps = {
  jupyterFrontend?: JupyterFrontEnd;
}

const Datalayer = (props: DatalayerProps) => {
  const { jupyterFrontend } = props;
  const { tab, setTab } = useStore();
  const intTab = Math.floor(tab);
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
                <UnderlineNav.Item aria-label="jupyterlab" aria-current={intTab === 0 ? "page" : undefined} icon={() => <JupyterLabIcon colored/>} onSelect={e => {e.preventDefault(); setTab(0.0);}}>
                  JupyterLab
                </UnderlineNav.Item>
                <UnderlineNav.Item aria-label="about" aria-current={intTab === 1 ? "page" : undefined} icon={() => <DatalayerGreenPaddingIcon colored/>} onSelect={e => {e.preventDefault(); setTab(1.0);}}>
                  About
                </UnderlineNav.Item>
              </UnderlineNav>
            </Box>
            <Box m={3}>
              {intTab === 0 && jupyterFrontend && <JupyterLabTab jupyterFrontend={jupyterFrontend} />}
              {intTab === 1 && <AboutTab version={version} />}
            </Box>
          </Box>
        </BaseStyles>
      </ThemeProvider>
    </>
  );
}

export default Datalayer;
