/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { Box } from '@datalayer/primer-addons';
import { IStudent, IStudentItem } from '../../models';
import { StudentResultCircle } from './StudentResultCircle';

const getExerciseScore = (studentItem?: IStudentItem) => {
  if (studentItem && studentItem.score) {
    return studentItem.score;
  }
  return 0;
};

type Props = {
  student?: IStudent;
  studentItem?: IStudentItem;
};

export const StudentItemStatus = (props: Props) => {
  const { studentItem } = props;
  if (!studentItem) {
    return <StudentResultCircle status="none" label="No result yet" />;
  }
  switch (studentItem.itemType) {
    case 'dataset': {
      if (studentItem.completed === undefined) {
        return <StudentResultCircle status="none" label="Dataset not started" />;
      }
      const completed = Boolean(studentItem.completed);
      return (
        <StudentResultCircle
          status={completed ? 'pass' : 'fail'}
          label={completed ? 'Dataset completed' : 'Dataset not completed'}
        />
      );
    }
    case 'lesson': {
      if (studentItem.completed === undefined) {
        return <StudentResultCircle status="none" label="Lesson not started" />;
      }
      const completed = Boolean(studentItem.completed);
      return (
        <StudentResultCircle
          status={completed ? 'pass' : 'fail'}
          label={completed ? 'Lesson completed' : 'Lesson not completed'}
        />
      );
    }
    case 'exercise': {
      const hasResult =
        Boolean(studentItem.id) ||
        Boolean(studentItem.codeStudent) ||
        studentItem.score !== undefined;
      if (!hasResult) {
        return <StudentResultCircle status="none" label="Exercise not started" />;
      }
      const passed = getExerciseScore(studentItem) > 0;
      return (
        <StudentResultCircle
          status={passed ? 'pass' : 'fail'}
          label={passed ? 'Exercise passed' : 'Exercise failed'}
        />
      );
    }
    case 'assignment':
      if (!studentItem.nbgrades || studentItem.nbgrades.length === 0) {
        return <StudentResultCircle status="none" label="Assignment not graded" />;
      }
      return (
        <Box display="flex" alignItems="center">
          {studentItem.nbgradesTotalScore !== undefined &&
            studentItem.nbgradesTotalPoints !== undefined && (
              <Box>
                {studentItem.nbgradesTotalScore} /{' '}
                {studentItem.nbgradesTotalPoints}
              </Box>
            )}
          <Box display="flex" ml={3}>
            {studentItem.nbgrades.map(grade => {
              const passed = grade.score_f === grade.points_f;
              return (
                <StudentResultCircle
                  key={grade.grade_id_s}
                  status={passed ? 'pass' : 'fail'}
                  label={`${grade.grade_id_s}: ${grade.score_f} / ${grade.points_f}`}
                />
              );
            })}
          </Box>
        </Box>
      );
    default:
      return <StudentResultCircle status="none" label="No result yet" />;
  }
};

export default StudentItemStatus;
