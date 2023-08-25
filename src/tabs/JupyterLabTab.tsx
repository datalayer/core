import { useState } from 'react';
import {
  NetworkIcon, LegoSquareBlueIcon, SparklesIcon, OutputIcon, ShuffleIcon,
  LevelSliderIcon, FileIcon, HardDriveIcon, JupyterServerIcon
} from '@datalayer/icons-react';
import { Box, NavList } from '@primer/react';
import { JupyterFrontEndProps } from '../Datalayer';
import Plugins from './jupyterlab/Plugins';
import FileTypes from './jupyterlab/FileTypes';
import Drives from './jupyterlab/Drives';
import Models from './jupyterlab/Models';
import Widgets from './jupyterlab/Widgets';
import WidgetExtensions from './jupyterlab/WidgetExtensions';
import Settings from './jupyterlab/Settings';
import IPyWidgets from './jupyterlab/IPyWidgets';
import Server from './jupyterlab/Server';

const JupyterLabTab = (props: JupyterFrontEndProps) => {
  const { app } = props;
  const [nav, setNav] = useState(1);
  return (
    <>
      <Box sx={{display: 'flex'}}>
        <Box>
          <NavList sx={{
              '> *': {
                paddingTop: '0px'
              }
            }}>
            <NavList.Item aria-current={nav === 1 ? 'page' : undefined} onClick={e => setNav(1)}>
              <NavList.LeadingVisual>
                <NetworkIcon />
              </NavList.LeadingVisual>
              Plugins
            </NavList.Item>
            <NavList.Item aria-current={nav === 2 ? 'page' : undefined} onClick={e => setNav(2)}>
              <NavList.LeadingVisual>
                <FileIcon />
              </NavList.LeadingVisual>
              File Types
            </NavList.Item>
            <NavList.Item aria-current={nav === 3 ? 'page' : undefined} onClick={e => setNav(3)}>
              <NavList.LeadingVisual>
                <ShuffleIcon colored/>
              </NavList.LeadingVisual>
              Models
            </NavList.Item>
            <NavList.Item aria-current={nav === 4 ? 'page' : undefined} onClick={e => setNav(4)}>
              <NavList.LeadingVisual>
                <HardDriveIcon colored/>
              </NavList.LeadingVisual>
              Drives
            </NavList.Item>
            <NavList.Item aria-current={nav === 5 ? 'page' : undefined} onClick={e => setNav(5)}>
              <NavList.LeadingVisual>
                <LegoSquareBlueIcon colored/>
              </NavList.LeadingVisual>
              Widgets
            </NavList.Item>
            <NavList.Item aria-current={nav === 6 ? 'page' : undefined} onClick={e => setNav(6)}>
              <NavList.LeadingVisual>
                <SparklesIcon colored/>
              </NavList.LeadingVisual>
              Widget Extensions
            </NavList.Item>
            <NavList.Item aria-current={nav === 7 ? 'page' : undefined} onClick={e => setNav(7)}>
              <NavList.LeadingVisual>
                <OutputIcon colored/>
              </NavList.LeadingVisual>
              IPyWidgets
            </NavList.Item>
            <NavList.Item aria-current={nav === 8 ? 'page' : undefined} onClick={e => setNav(8)}>
              <NavList.LeadingVisual>
                <LevelSliderIcon colored/>
              </NavList.LeadingVisual>
              Settings
            </NavList.Item>
            <NavList.Item aria-current={nav === 9 ? 'page' : undefined} onClick={e => setNav(9)}>
              <NavList.LeadingVisual>
                <JupyterServerIcon colored/>
              </NavList.LeadingVisual>
              Server
            </NavList.Item>
          </NavList>
        </Box>
        <Box ml={3} sx={{ width: '100%'}}>
          {(nav === 1) && <Plugins app={app} />}
          {(nav === 2) && <FileTypes app={app} />}
          {(nav === 3) && <Models app={app} />}
          {(nav === 4) && <Drives app={app} />}
          {(nav === 5) && <Widgets app={app} />}
          {(nav === 6) && <WidgetExtensions app={app} />}
          {(nav === 7) && <IPyWidgets app={app} />}
          {(nav === 8) && <Settings app={app} />}
          {(nav === 9) && <Server app={app} />}
        </Box>
      </Box>
    </>
  );
}

export default JupyterLabTab;
