/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { Link } from "@primer/react"
import { Banner } from "@primer/react/experimental"
import { useNavigate } from "../../hooks";

export const NoAutomationBanner = () => {
  const navigate = useNavigate();
  return (
    <>
      <Banner
        title="Warning"
        description={
          <>
            We don't have bandwidth to automate this feature. <Link href="" onClick={e => navigate('/contact', e)}>Please reach out</Link> to prioritize this.
          </>
        }
        primaryAction={<Banner.PrimaryAction onClick={e => navigate('/contact', e)}>Reach out</Banner.PrimaryAction>}
        variant="warning"
      />
    </>
  )
}

export default NoAutomationBanner;
