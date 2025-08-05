/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { Token } from "@primer/react";
import { ProjectIcon } from "@primer/octicons-react";
import { StudentIcon } from "@datalayer/icons-react";
import { ISpaceVariant } from "../../models";

export const SpaceVariantToken = (props: { variant: ISpaceVariant}) => {
  const { variant } = props;
  switch (variant) {
    case ("default"):
      return <Token text="default" leadingVisual={ProjectIcon}/>
    case ("course"):
      return <Token text="course" leadingVisual={StudentIcon}/>
    default:
      return <></>
    }
}

export default SpaceVariantToken;
