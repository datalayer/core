/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { Heading, Text } from "@primer/react";
import { Box } from "@datalayer/primer-addons";
import { IStudentItem } from "../../models";

export const NbGradesDetails = (props: {studentItem?: IStudentItem}) => {
  const { studentItem } = props;
  return (
    studentItem && studentItem?.nbgrades ?
      <Box>
        <Box>
          <Heading sx={{fontSize: 1}}>Grades</Heading>
        </Box>
        <Box mt={3}>
          {
            studentItem?.nbgrades.map(nb => {
              return <Box><Text sx={{fontSize: "small"}}>{nb.grade_id_s}: {nb.score_f}</Text></Box>
            })
          }
        </Box>
        <Box mt={3}>
          <Heading sx={{fontSize: 1}}>Total</Heading>
        </Box>
        <Box mt={3}>
          {studentItem?.nbgradesTotalScore} / {studentItem?.nbgradesTotalPoints}
        </Box>
      </Box>
    :
      <Box>
        <Box>
          <Heading sx={{fontSize: 1}}>Grades</Heading>
        </Box>
        <Box mt={3}>
          Please grade your assignment.
        </Box>
      </Box>
  )
}

export default NbGradesDetails;
