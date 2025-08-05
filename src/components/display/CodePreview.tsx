/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

export const CodePreview = (props: { code: string }) => {
  const { code } = props;
  return (
    <pre
      style={{
        fontSize: "12px",
        wordBreak: "break-all",
        wordWrap: "break-word",
        whiteSpace: "pre-wrap",
      }}
    >
      {code}
    </pre>
  );
};

export default CodePreview;
