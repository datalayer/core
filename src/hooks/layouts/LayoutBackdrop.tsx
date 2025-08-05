/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */


import { useEffect } from "react";
import { Heading, Box, Spinner } from "@primer/react";
import { useBackdrop } from '..';
import { useLayoutStore, BackdropDisplay } from '../../state';

type IContentBackdropProps = {
  backdropDisplay: BackdropDisplay;
}

const BackdropContent = (props: IContentBackdropProps) => {
  const { backdropDisplay } = props;
  return (
    <Box style={{zIndex: 10999}}>
      { backdropDisplay.message ?
        <Box display="flex" style={{alignItems: "center"}}>
          <Box mr={3}>
            <Spinner size="large"/>
          </Box>
          <Box>
            <Heading sx={{fontSize: 5, color: 'white'}}>
              {backdropDisplay.message}
            </Heading>
          </Box>
        </Box>
      :
        <Spinner size="large"/>
      }
    </Box>
  )
}

export const LayoutBackdrop = () => {
  const { backdrop } = useLayoutStore();
  const { displayBackdrop, closeBackdrop } = useBackdrop();
  useEffect(() => {
    if (backdrop && backdrop.open) {
      displayBackdrop(() => <BackdropContent backdropDisplay={backdrop}/>);
    } else {
      closeBackdrop();
    }
  }, [backdrop]);
  return <></>
}

export default LayoutBackdrop;
