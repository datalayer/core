/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { AlertIcon } from "@primer/octicons-react";
import { Flash, Link } from "@primer/react";
import { useNavigate } from "../../hooks";

export const FlashMock = () => {
  const navigate = useNavigate();
  return (
    <Flash variant="warning" style={{ marginBottom: 10 }}>
      <AlertIcon/> This is a mock content. <Link href="#" onClick={e => navigate('/contact', e)}>Contact us</Link> if you'd like to know more about this feature.
    </Flash>
  );
}

export default FlashMock;
