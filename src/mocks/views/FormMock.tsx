/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useState } from 'react';
import {
  Box,
  FormControl,
  TextInputWithTokens,
  Autocomplete,
  Select,
  Textarea,
  Heading,
} from '@primer/react';

type Props = {
  title: string;
};

export const FormMock = (props: Props) => {
  const { title } = props;
  const [tokens, setTokens] = useState([
    { text: 'zero', id: '0' },
    { text: 'one', id: '1' },
    { text: 'two', id: '2' },
  ]);
  const onTokenRemove = tokenId => {
    setTokens(tokens.filter(token => token.id !== tokenId));
  };
  return (
    <Box display="grid" sx={{ gap: 3 }}>
      <Heading>{title}</Heading>
      <FormControl>
        <FormControl.Label>TextInputWithTokens</FormControl.Label>
        <TextInputWithTokens onTokenRemove={onTokenRemove} tokens={tokens} />
      </FormControl>
      <FormControl>
        <FormControl.Label>Autocomplete</FormControl.Label>
        <Autocomplete>
          <Autocomplete.Input block />
          <Autocomplete.Overlay>
            <Autocomplete.Menu
              items={[
                { text: 'css', id: '0' },
                { text: 'css-in-js', id: '1' },
                { text: 'styled-system', id: '2' },
                { text: 'javascript', id: '3' },
                { text: 'typescript', id: '4' },
                { text: 'react', id: '5' },
                { text: 'design-systems', id: '6' },
              ]}
              selectedItemIds={[]}
              aria-labelledby=""
            />
          </Autocomplete.Overlay>
        </Autocomplete>
      </FormControl>
      <FormControl>
        <FormControl.Label>Select</FormControl.Label>
        <Select>
          <Select.Option value="figma">Figma</Select.Option>
          <Select.Option value="css">Primer CSS</Select.Option>
          <Select.Option value="prc">Primer React components</Select.Option>
          <Select.Option value="pvc">Primer ViewComponents</Select.Option>
        </Select>
      </FormControl>
      <FormControl>
        <FormControl.Label>Textarea</FormControl.Label>
        <Textarea />
      </FormControl>
    </Box>
  );
};

export default FormMock;
