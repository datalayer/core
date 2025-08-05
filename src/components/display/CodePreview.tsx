/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
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
