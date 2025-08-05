/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

const JUPYTERLAB_COLLABORATORS_COLORS = {
  '--jp-collaborator-color1': '#ffad8e',
  '--jp-collaborator-color2': '#dac83d',
  '--jp-collaborator-color3': '#72dd76',
  '--jp-collaborator-color4': '#00e4d0',
  '--jp-collaborator-color5': '#45d4ff',
  '--jp-collaborator-color6': '#e2b1ff',
  '--jp-collaborator-color7': '#ff9de6'
};

export const jpCssToColor = (cssVariableName: string) => {
  return (JUPYTERLAB_COLLABORATORS_COLORS as any)[
    cssVariableName.replaceAll('var(', '').replaceAll(')', '')
  ];
};

// export const RESERVATION_CIRCLE_COLOR_VAR = '--data-yellow-color';
export const RESERVATION_CIRCLE_COLOR = '#656D76';

// export const CREDITS_CIRCLE_COLOR_VAR = '--data-blue-color';
export const CREDITS_CIRCLE_COLOR = '#16A085';

export const JOINED_INVITE_COLOR = '#0366d6';

export const PENDING_INVITE_COLOR = '#cfd3d7';
