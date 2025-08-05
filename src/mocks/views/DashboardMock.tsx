/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { Box, Link, Text, LabelGroup, Label, ActionMenu, ActionList } from "@primer/react";
import { ArrowRightIcon, CloudIcon, StarIcon, DotFillIcon, RepoForkedIcon, LinkIcon } from "@primer/octicons-react";
import { ReactJsIcon } from "@datalayer/icons-react";
import { lazyWithPreload, WithSuspense } from "../../utils";
import { ECHART_MOCK_1, ECHART_MOCK_2, ECHART_MOCK_3, FlashMock } from "../../mocks";

const ReactECharts = WithSuspense(lazyWithPreload(() => import("echarts-for-react")), true);

export const DashboardMock = () => {
  return (
    <>
      <Box mb={3}>
        <FlashMock/>
      </Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 4,
        }}
      >
        <Box
          sx={{
            gridColumn: "1 / 3",
            minHeight: "200px",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingRight: 4
            }}
          >
            <Text
              as="h2"
              sx={{ borderLeft: "4px solid #28b899", paddingLeft: 2 }}
            >
              My latest work
            </Text>
            <Link>
              View all work
              <ArrowRightIcon />
            </Link>
          </Box>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 4,
            }}
          >
            <Box
              sx={{
                borderColor: "border.default",
                borderStyle: "solid",
                borderWidth: "1",
                borderRadius: "2",
                padding: 4,
              }}
            >
              <Text as="h3" sx={{ paddingBottom: 2 }}>
                clouder <Label>Public</Label>
              </Text>
              <Text
                as="p"
                sx={{ color: "fg.subtle", fontWeight: "semibold" }}
              >
                <CloudIcon
//                  sx={{ margin: "0 4px" }}
                />
                Create, manage and share Kubernetes clusters.
              </Text>
              <LabelGroup sx={{ paddingTop: 2, paddingBottom: 2 }}>
                <Label variant="accent">Kubernetes</Label>
                <Label variant="accent">cloud</Label>
                <Label variant="accent">kubernets-cluster</Label>
                <Label variant="accent">datalayer</Label>
              </LabelGroup>
              <Text
                as="p"
                sx={{
                  color: "fg.subtle",
                  "> *": { paddingLeft: 1, paddingRight: 1 },
                }}
              >
                <Text>
                  <DotFillIcon
//                    sx={{
//                      fill: "#4f729d",
//                      marginRight: 1,
//                      marginBottom: "3px",
//                    }}
                  />
                  Python
                </Text>
                <Text>
                  <RepoForkedIcon
//                    sx={{ marginRight: 1, marginBottom: "3px" }}
                  />
                  3
                </Text>
                <Text>
                  <StarIcon
//                    sx={{ marginRight: 1, marginBottom: "3px" }}
                  />
                  11
                </Text>
              </Text>
            </Box>
            <Box
              sx={{
                borderColor: "border.default",
                borderStyle: "solid",
                borderWidth: "1",
                borderRadius: "2",
                padding: 4,
              }}
            >
              <Text as="h3" sx={{ paddingBottom: 2 }}>
                jupyter-ui <Label>Public</Label>
              </Text>
              <Text as="p">
                <ReactJsIcon style={{ margin: "0 4px" }}></ReactJsIcon>
                React.js components 100% compatible with Jupyter.
                {" "}
                <Link href="https://jupyter-ui-storybook.datalayer.tech">https://jupyter-ui-storybook.datalayer.tech</Link>
              </Text>
              <LabelGroup sx={{ paddingTop: 2, paddingBottom: 2 }}>
                <Label variant="accent">data-science</Label>
                <Label variant="accent">data</Label>
                <Label variant="accent">ui</Label>
                <Label variant="accent">jupyter</Label>
                <Label>+4</Label>
              </LabelGroup>
              <Text
                as="p"
                sx={{
                  color: "fg.subtle",
                  "> *": { paddingLeft: 1, paddingRight: 1 },
                }}
              >
                <Text>
                  <DotFillIcon
                    /*
                    sx={{
                      fill: "#4f729d",
                      marginRight: 1,
                      marginBottom: "3px",
                    }}
                    */
                  />
                  Typescript
                </Text>
                <Text>
                  <RepoForkedIcon
//                    sx={{ marginRight: 1, marginBottom: "3px" }}
                  />
                  3
                </Text>
                <Text>
                  <StarIcon
//                    sx={{ marginRight: 1, marginBottom: "3px" }}
                  />
                  11
                </Text>
              </Text>
            </Box>
          </Box>
        </Box>
        <Box
          sx={{
            gridColumn: "3 / 4",
            gridRow: "1 / 3",
            minHeight: "200px",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingRight: 4
            }}
          >
            <Text
              as="h2"
              sx={{ borderLeft: "4px solid #28b899", paddingLeft: 2 }}
            >
              Usage
            </Text>
            <Link>
              More Usage
              <ArrowRightIcon />
            </Link>
          </Box>
          <Box
            sx={{
              borderColor: "border.default",
              borderStyle: "solid",
              borderWidth: "1",
              borderRadius: "2",
              padding: 4
            }}
          >
            <Box
              sx={{
                display: "inline-flex",
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Text as="h3" sx={{ marginRight: "20px" }}>
                Kernels Activity
              </Text>
              <ActionMenu>
                <ActionMenu.Button>
                  <Box sx={{ color: "fg.muted", display: "inline-block" }}>
                    View:
                  </Box>{" "}
                  {"All kernels"}
                </ActionMenu.Button>
                <ActionMenu.Overlay width="auto">
                  <ActionList selectionVariant="single">
                    <ActionList.Item selected>
                      All kernels
                    </ActionList.Item>
                  </ActionList>
                </ActionMenu.Overlay>
              </ActionMenu>
            </Box>
            <Text as="h3">Credits usage</Text>
            <Text as="p" sx={{color: 'fg.subtle'}}>Amount today</Text>
            <Text as="p" sx={{color: 'fg.subtle'}}>Balance yesterday</Text>
            <Text as="h3">Last invoice</Text>
            <Text as="p" sx={{color: 'fg.subtle', fontSize: '3', fontWeight: 'bold'}}>$216</Text>
          </Box>
        </Box>
        <Box
          sx={{
            gridColumn: "1 / 3",
            minHeight: "200px",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingRight: 4
            }}
          >
            <Text
              as="h2"
              sx={{ borderLeft: "4px solid #28b899", paddingLeft: 2 }}
            >
              Trending Notebooks
            </Text>
            <Link>
              All Notebooks
              <ArrowRightIcon />
            </Link>
          </Box>
          <Box
            sx={{
              borderColor: "border.default",
              borderStyle: "solid",
              borderWidth: "1",
              borderRadius: "2",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",

              "> :not(:last-child)": {
                borderRightColor: "border.default",
                borderRightStyle: "solid",
                borderRightWidth: "1",
              },
            }}
          >
            <Box
              sx={{
                padding: 4,
              }}
            >
              <Text as="h3">Notebook name abc</Text>
              <Text sx={{ color: "fg.subtle" }}>Subtitle comes here</Text>
              <Box sx={{ height: "300px", maxWidth: "380px" }}>
                <ReactECharts option={ECHART_MOCK_1} />;
              </Box>
              <Text
                as="p"
                sx={{ display: "flex", justifyContent: "space-between" }}
              >
                <Link>Link to somewhere</Link>
                <Link>
                  Second link<LinkIcon></LinkIcon>
                </Link>
              </Text>
            </Box>
            <Box
              sx={{
                padding: 4,
              }}
            >
              <Text as="h3">Notebook name abc</Text>
              <Text sx={{ color: "fg.subtle" }}>Subtitle comes here</Text>
              <Box sx={{ height: "300px", maxWidth: "380px" }}>
                <ReactECharts option={ECHART_MOCK_3} />;
              </Box>
              <Text
                as="p"
                sx={{ display: "flex", justifyContent: "space-between" }}
              >
                <Link>Link to somewhere</Link>
                <Link>
                  Second link<LinkIcon></LinkIcon>
                </Link>
              </Text>
            </Box>
            <Box
              sx={{
                padding: 4,
              }}
            >
              <Text as="h3">Notebook name abc</Text>
              <Text sx={{ color: "fg.subtle" }}>Subtitle comes here</Text>
              <Box sx={{ height: "300px", maxWidth: "380px" }}>
                <ReactECharts option={ECHART_MOCK_2} />;
              </Box>
              <Text
                as="p"
                sx={{ display: "flex", justifyContent: "space-between" }}
              >
                <Link>Link to somewhere</Link>
                <Link>
                  Second link<LinkIcon></LinkIcon>
                </Link>
              </Text>
            </Box>
          </Box>
        </Box>
      </Box>
    </>
  );
}

export default DashboardMock;
