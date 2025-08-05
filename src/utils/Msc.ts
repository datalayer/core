/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Utility function to format strings
 */
export const formatString = (input: string): string => {
  return input.trim().toLowerCase();
};

/**
 * Utility function to add numbers
 */
export const addNumbers = (a: number, b: number): number => {
  return a + b;
};

/**
 * Utility function to check if a value is defined
 */
export const isDefined = <T>(value: T | undefined | null): value is T => {
  return value !== undefined && value !== null;
};

/**
 * Utility function to delay execution
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};
