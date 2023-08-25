import { Box, SubNav, Text } from '@primer/react';
import { JupyterFrontEndProps } from '../../Datalayer';

const Server = (props: JupyterFrontEndProps) => {
  return (
    <Box>
      <Box>
        <SubNav aria-label="Jupyter Server">
          <SubNav.Links>
            <SubNav.Link selected>
              Extensions
            </SubNav.Link>
            <SubNav.Link>
              Settings
            </SubNav.Link>
          </SubNav.Links>
        </SubNav>
      </Box>
      <Box>
        <Text>Server</Text>
      </Box>
    </Box>
  )
}

export default Server;
