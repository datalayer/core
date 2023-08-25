import { SubNav } from '@primer/react';
import { JupyterFrontEndProps } from '../../Datalayer';

const Server = (props: JupyterFrontEndProps) => {
  return (
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
  )
}

export default Server;
