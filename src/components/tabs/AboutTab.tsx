import { useState } from 'react';
import { Pagehead, Label, Text, Link, Box } from '@primer/react';
import PirateSkull2Icon from '@datalayer/icons-react/eggs/PirateSkull2Icon';

type Props = {
  version: string,
}

const AboutTab = (props: Props): JSX.Element => {
  const { version } = props;
  const [pirate, setPirate] = useState(false);
  return (
    <>
      <Pagehead as="h3">Datalayer <Label>{version}</Label></Pagehead>
      <Box>
        {pirate ?
          <PirateSkull2Icon size={500} onClick={e => setPirate(false)}/>
        :
          <img src="https://assets.datalayer.tech/releases/0.2.0-omalley.png" onClick={e => setPirate(true)}/>
        }
      </Box>
      <Box>
        <Link href="https://datalayer.tech/docs/releases/0.2.0-omalley" target="_blank">
          <Text as="h4">O'Malley release</Text>
        </Link>
      </Box>
    </>
  );
}

export default AboutTab;
