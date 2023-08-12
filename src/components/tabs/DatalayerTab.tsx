import { Text } from '@primer/react';

const DatalayerTab = (props: {version: string}): JSX.Element => {
  const { version } = props;
  return (
    <>
      <Text>Version: {version}</Text>
    </>
  );
}

export default DatalayerTab;
