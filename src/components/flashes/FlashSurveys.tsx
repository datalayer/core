/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { useEffect, useState } from 'react';
import { Text, Link } from '@primer/react';
import { FlashClosable } from '../../components/flashes';
import { Box } from "@datalayer/primer-addons";
import { useToast } from '../../hooks';
import { useCoreStore, useSurveysStore } from '../../state';
import { Survey2025_1 } from './surveys'

export const SURVEY_2025_1_NAME = "2025-1";

type IFlashSurveysProps = {
  surveyName?: string;
}

export const FlashSurveys = (props: IFlashSurveysProps) => {
  const { surveyName } = props;
  const { enqueueToast } = useToast();
  const [show, setShow] = useState(false);
  const { surveys, createSurvey } = useSurveysStore();
  const { configuration } = useCoreStore();
  useEffect(() => {
    if (surveys) {
      if (!surveys.get(SURVEY_2025_1_NAME)) {
        setShow(true);
      }
    }
  }, [surveys]);
  const onSubmit = (data, e) => {
    const { formData } = data;
    createSurvey(SURVEY_2025_1_NAME, formData);
    setShow(false);
    enqueueToast('Thank you for your answers.', { variant: 'success' });
  };
  return (
    <>
      {surveys && (show || surveyName) && !configuration.whiteLabel &&
        <FlashClosable variant="default">
          <Box>
            <Text as="h2">
              We'd love to know a bit more about you and your needs...
            </Text>
          </Box>
          <Box>
            <Survey2025_1
              formData={surveyName ? surveys.get(SURVEY_2025_1_NAME)?.form : undefined}
              onSubmit={onSubmit}
            />
          </Box>
          <Box mt={3}>
            <Text>
              The information you give will remain fully private, read our <Link href="https://datalayer.app/privacy" target="_blank">privacy policy</Link>.
            </Text>
          </Box>
        </FlashClosable>
      }
    </>
  );
}

export default FlashSurveys;
