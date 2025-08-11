/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useMemo } from "react";
import { useTheme, Tooltip, Button } from "@primer/react";
import { Box } from "@datalayer/primer-addons";
import { IStudent, IStudentItem } from "../../models";

const getExercisePoints = (studentItem?: IStudentItem) => {
  if (studentItem && studentItem.points) {
    return studentItem.points;
  }
  return 0;
}

type Props = {
  student?: IStudent;
  studentItem?: IStudentItem;
}

export const StudentItemStatus = (props: Props) => {
  const { student, studentItem } = props;
  const { theme } = useTheme();
  const okColor = useMemo(() => theme?.colorSchemes.light.colors.success.muted, []);
  const nokColor = useMemo(() => theme?.colorSchemes.light.colors.severe.muted, []);
  if (student && studentItem) {
    switch(studentItem.itemType) {
      case('dataset'): {
        const datasetColor = studentItem?.completed ? okColor : nokColor;
        return <Box sx={{backgroundColor: datasetColor, width: '14px', height: '14px', borderRadius: 3}} ml={1} />
      }
      case('lesson'): {
        const lessonColor = studentItem?.completed ? okColor : nokColor;
        return <Box sx={{backgroundColor: lessonColor, width: '14px', height: '14px', borderRadius: 3}} ml={1} />
      }
      case('exercise'): {
        const exerciseColor = getExercisePoints(studentItem) > 0 ? okColor : nokColor;
        return <Box sx={{backgroundColor: exerciseColor, width: '14px', height: '14px', borderRadius: 3}} ml={1} />
      }
      case('assignment'):
        return (
          <Box display="flex">
            {(studentItem.nbgradesTotalScore !== undefined) && (studentItem.nbgradesTotalPoints !== undefined) &&
              <Box>
                {studentItem.nbgradesTotalScore} / {studentItem.nbgradesTotalPoints}
              </Box>
            }
            { studentItem.nbgrades &&
              <Box display="flex" ml={3}>
                {studentItem?.nbgrades.map(grade => {
                  const gradeColor = grade.score_f === grade.points_f ? okColor : nokColor;
                  return (
                    <Tooltip text={grade.grade_id_s}>
                      <Button variant="invisible">
                        <Box sx={{backgroundColor: gradeColor, width: '14px', height: '14px', borderRadius: 3}} ml={1} />
                      </Button>
                    </Tooltip>
                  )
                })}
              </Box>
            }
          </Box>
        )
      default:
        return <></>
    }
  }
  return <></>
}

export default StudentItemStatus;
