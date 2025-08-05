/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

/**
 * AI Agent model
 */
export type IAIAgent = {
  /**
   * ID of the document monitored by the agent.
   */
  documentId: string;
  /**
   * ID of the runtime connected to the agent.
   * 
   * This is not the name of the remote pod but
   * the Jupyter Kernel ID of the process within it.
   */
  runtimeId?: string;
};

export default IAIAgent;
