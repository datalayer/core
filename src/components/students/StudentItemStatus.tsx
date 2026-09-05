/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { IStudent } from '../../models';
import { StudentResultCircle } from './StudentResultCircle';

/**
 * What the status of a student on an item is read from.
 *
 * Named here by what is displayed rather than by the model it comes from: the
 * concrete `IStudentItem` lives with the content, in `@datalayer/agent-runtimes`,
 * and this package does not depend on the content models — see the note on
 * `IStudent`. Any student item satisfies this shape, so callers pass theirs as
 * they hold it.
 */
export interface IStudentItemStatusData {
  /** What the student worked on: an exercise, an assignment, a lesson… */
  itemType?: string;
  /** Whether a lesson or a dataset was gone through. */
  completed?: boolean;
  /** Set once the platform recorded an attempt. */
  id?: string;
  /** The code an exercise was answered with. */
  codeStudent?: string;
  /** The score of an exercise. */
  score?: number;
  /** What an assignment scored, and what it was out of. */
  nbgradesTotalScore?: number;
  nbgradesTotalPoints?: number;
  /** The individual checks of an assignment. */
  nbgrades?: any;
}

const getExerciseScore = (studentItem?: IStudentItemStatusData) => {
  if (studentItem && studentItem.score) {
    return studentItem.score;
  }
  return 0;
};

type Props = {
  student?: IStudent;
  studentItem?: IStudentItemStatusData;
};

export const StudentItemStatus = (props: Props) => {
  const { studentItem } = props;
  if (!studentItem) {
    return <StudentResultCircle status="none" label="No result yet" />;
  }
  switch (studentItem.itemType) {
    case 'dataset': {
      if (studentItem.completed === undefined) {
        return (
          <StudentResultCircle status="none" label="Dataset not started" />
        );
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
        return (
          <StudentResultCircle status="none" label="Exercise not started" />
        );
      }
      const passed = getExerciseScore(studentItem) > 0;
      return (
        <StudentResultCircle
          status={passed ? 'pass' : 'fail'}
          label={passed ? 'Exercise passed' : 'Exercise failed'}
        />
      );
    }
    case 'assignment': {
      const hasRecordedAttempt =
        Boolean(studentItem.id) ||
        studentItem.nbgradesTotalScore !== undefined ||
        studentItem.nbgradesTotalPoints !== undefined ||
        Boolean(studentItem.nbgrades);
      if (!hasRecordedAttempt) {
        return (
          <StudentResultCircle status="none" label="Assignment not graded" />
        );
      }
      const totalScore = studentItem.nbgradesTotalScore ?? 0;
      const totalPoints = studentItem.nbgradesTotalPoints ?? 0;
      const nbgrades = Array.isArray(studentItem.nbgrades)
        ? studentItem.nbgrades
        : [];
      const status =
        totalPoints === 0
          ? 'pass'
          : totalScore <= 0
            ? 'fail'
            : totalScore >= totalPoints
              ? 'pass'
              : 'partial';
      const tooltip =
        nbgrades.length > 0
          ? `Assignment graded: ${totalScore} / ${totalPoints} (${nbgrades.length} checks)`
          : `Assignment graded: ${totalScore} / ${totalPoints}`;
      return <StudentResultCircle status={status} label={tooltip} />;
    }
    default:
      return <StudentResultCircle status="none" label="No result yet" />;
  }
};

export default StudentItemStatus;
