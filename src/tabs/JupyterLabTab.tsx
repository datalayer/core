import {
  NetworkIcon,
  WidgetsIcon,
  PlusIcon,
  IpyWidgetsIcon,
  ShuffleIcon,
  SettingsIcon,
  FileIcon,
  HardDriveIcon,
  JupyterServerIcon
} from '@datalayer/icons-react';
import { Box, NavList } from '@primer/react';
import { DatalayerProps } from '../Datalayer';
import Plugins from './jupyterlab/Plugins';
import FileTypes from './jupyterlab/FileTypes';
import Drives from './jupyterlab/Drives';
import Models from './jupyterlab/Models';
import Widgets from './jupyterlab/Widgets';
import WidgetExtensions from './jupyterlab/WidgetExtensions';
import Settings from './jupyterlab/Settings';
import IPyWidgets from './jupyterlab/IPyWidgets';
import Server from './jupyterlab/Server';
import useStore from '../state';

const JupyterLabTab = (props: DatalayerProps) => {
  const { jupyterFrontend } = props;
  const { tab, setTab } = useStore();
  return (
    <>
      <Box sx={{ display: 'flex' }}>
        <Box>
          <NavList
            sx={{
              '> *': {
                paddingTop: '0px'
              }
            }}
          >
            <NavList.Item
              aria-current={tab === 0.0 ? 'page' : undefined}
              onClick={e => setTab(0.0)}
            >
              <NavList.LeadingVisual>
                <NetworkIcon />
              </NavList.LeadingVisual>
              Plugins
            </NavList.Item>
            <NavList.Item
              aria-current={tab === 0.1 ? 'page' : undefined}
              onClick={e => setTab(0.1)}
            >
              <NavList.LeadingVisual>
                <FileIcon />
              </NavList.LeadingVisual>
              File Types
            </NavList.Item>
            <NavList.Item
              aria-current={tab === 0.2 ? 'page' : undefined}
              onClick={e => setTab(0.2)}
            >
              <NavList.LeadingVisual>
                <ShuffleIcon />
              </NavList.LeadingVisual>
              Models
            </NavList.Item>
            <NavList.Item
              aria-current={tab === 0.3 ? 'page' : undefined}
              onClick={e => setTab(0.3)}
            >
              <NavList.LeadingVisual>
                <HardDriveIcon colored />
              </NavList.LeadingVisual>
              Drives
            </NavList.Item>
            <NavList.Item
              aria-current={tab === 0.4 ? 'page' : undefined}
              onClick={e => setTab(0.4)}
            >
              <NavList.LeadingVisual>
                <WidgetsIcon />
              </NavList.LeadingVisual>
              Widgets
            </NavList.Item>
            <NavList.Item
              aria-current={tab === 0.5 ? 'page' : undefined}
              onClick={e => setTab(0.5)}
            >
              <NavList.LeadingVisual>
                <PlusIcon />
              </NavList.LeadingVisual>
              Widget Extensions
            </NavList.Item>
            <NavList.Item
              aria-current={tab === 0.6 ? 'page' : undefined}
              onClick={e => setTab(0.6)}
            >
              <NavList.LeadingVisual>
                <IpyWidgetsIcon />
              </NavList.LeadingVisual>
              IPyWidgets
            </NavList.Item>
            <NavList.Item
              aria-current={tab === 0.7 ? 'page' : undefined}
              onClick={e => setTab(0.7)}
            >
              <NavList.LeadingVisual>
                <SettingsIcon />
              </NavList.LeadingVisual>
              Settings
            </NavList.Item>
            <NavList.Item
              aria-current={tab === 0.8 ? 'page' : undefined}
              onClick={e => setTab(0.8)}
            >
              <NavList.LeadingVisual>
                <JupyterServerIcon />
              </NavList.LeadingVisual>
              Server
            </NavList.Item>
          </NavList>
        </Box>
        <Box ml={3} sx={{ width: '100%' }}>
          {tab === 0.0 && <Plugins jupyterFrontend={jupyterFrontend} />}
          {tab === 0.1 && <FileTypes jupyterFrontend={jupyterFrontend} />}
          {tab === 0.2 && <Models jupyterFrontend={jupyterFrontend} />}
          {tab === 0.3 && <Drives jupyterFrontend={jupyterFrontend} />}
          {tab === 0.4 && <Widgets jupyterFrontend={jupyterFrontend} />}
          {tab === 0.5 && (
            <WidgetExtensions jupyterFrontend={jupyterFrontend} />
          )}
          {tab === 0.6 && <IPyWidgets jupyterFrontend={jupyterFrontend} />}
          {tab === 0.7 && <Settings jupyterFrontend={jupyterFrontend} />}
          {tab === 0.8 && <Server jupyterFrontend={jupyterFrontend} />}
        </Box>
      </Box>
    </>
  );
};

export default JupyterLabTab;
