/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Heading,
  Text,
  Button,
  Label,
  Spinner,
  Flash,
} from '@primer/react';
import {
  CpuIcon,
  ZapIcon,
  PackageIcon,
  AlertIcon,
} from '@primer/octicons-react';
import { useCoreStore } from '@datalayer/core';
import { COLORS } from '../constants/colors';
import { useEnvironments } from '../stores/environmentStore';

// Import Environment type from the store
type Environment = {
  name: string;
  language?: string;
  title?: string;
  description?: string;
  dockerImage?: string;
  condaEnvironment?: string;
  pipRequirements?: string;
  tags?: string[];
  isDefault?: boolean;
  image?: string;
  resources?: {
    cpu?: { min?: number; max?: number; default?: number };
    memory?: { min?: number; max?: number; default?: number };
    gpu?: { min?: number; max?: number; default?: number };
  };
};

const EnvironmentsList: React.FC = () => {
  const [selectedEnv, setSelectedEnv] = useState<string | null>(null);
  const { configuration, setConfiguration } = useCoreStore();

  // Use the environment store for caching
  const {
    environments,
    isLoading: loading,
    error,
    fetchIfNeeded,
  } = useEnvironments();

  const fetchEnvironments = useCallback(async () => {
    try {
      // Check if user is authenticated
      if (!configuration?.token) {
        console.info('Please login to view available environments');
        return;
      }

      // Use the cached store fetch which handles caching automatically
      await fetchIfNeeded();

      // Set the current environment as selected
      if (configuration.cpuEnvironment) {
        setSelectedEnv(configuration.cpuEnvironment);
      } else if (environments.length > 0) {
        // Default to first environment
        setSelectedEnv(environments[0].name);
      }
    } catch (err) {
      console.error('Failed to fetch environments:', err);
      // Error is handled by the store
    }
  }, [
    configuration?.token,
    configuration?.cpuEnvironment,
    fetchIfNeeded,
    environments,
  ]);

  useEffect(() => {
    fetchEnvironments();
  }, [fetchEnvironments]);

  const handleSelectEnvironment = async (envName: string) => {
    setSelectedEnv(envName);

    // Update the store configuration
    if (configuration) {
      const isGPUEnv = envName === 'ai-env' || envName.includes('gpu');

      setConfiguration({
        ...configuration,
        cpuEnvironment: !isGPUEnv ? envName : configuration.cpuEnvironment,
        gpuEnvironment: isGPUEnv ? envName : configuration.gpuEnvironment,
      });
    }
  };

  const getEnvironmentIcon = (env: Environment) => {
    const isGPU =
      env.name === 'ai-env' ||
      env.name.includes('gpu') ||
      env.name.includes('ai');
    return isGPU ? <ZapIcon size={24} /> : <CpuIcon size={24} />;
  };

  const getEnvironmentType = (env: Environment) => {
    const isGPU =
      env.name === 'ai-env' ||
      env.name.includes('gpu') ||
      env.name.includes('ai');
    return isGPU ? 'GPU' : 'CPU';
  };

  const formatResources = (resources: Record<string, unknown>) => {
    if (!resources) return [];

    const formatted = [];
    if (resources.cpu) {
      formatted.push(`${resources.cpu} CPU cores`);
    }
    if (resources.memory) {
      formatted.push(`${resources.memory} RAM`);
    }
    if (resources.gpu && resources.gpu !== '0') {
      formatted.push(`${resources.gpu} GPU`);
    }
    return formatted;
  };

  // Parse HTML description to extract structured data
  const parseEnvironmentDescription = (description: string) => {
    if (!description) return null;

    // Extract image URL
    const imgMatch = description.match(/<img\s+src="([^"]+)"[^>]*>/);
    const imageUrl = imgMatch ? imgMatch[1] : null;

    // Extract main description (bold text)
    const mainDescMatch = description.match(/<b>([^<]+)<\/b>/);
    const mainDescription = mainDescMatch ? mainDescMatch[1] : '';

    // Extract GPU details
    const gpuMatch = description.match(/GPU detail:\s*([^<]+)/);
    const gpuDetail = gpuMatch ? gpuMatch[1].trim() : '';

    // Extract packages
    const packagesMatch = description.match(/Packages:\s*([^<]+)/);
    const packages = packagesMatch
      ? packagesMatch[1].trim().replace(/\.\.\.$/, '')
      : '';

    return {
      imageUrl,
      mainDescription,
      gpuDetail,
      packages: packages ? packages.split(',').map(p => p.trim()) : [],
    };
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Heading as="h2" sx={{ mb: 2 }}>
          Runtime Environments
        </Heading>
        <Text sx={{ color: 'fg.subtle' }}>
          Select a computing environment for your notebooks and runtimes
        </Text>
      </Box>

      {!configuration?.token && (
        <Flash variant="warning" sx={{ mb: 3 }}>
          <AlertIcon /> Please login to view and select runtime environments
        </Flash>
      )}

      {loading && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            py: 6,
            gap: 2,
          }}
        >
          <Spinner size="large" sx={{ color: COLORS.brand.primary }} />
          <Text sx={{ color: 'fg.muted' }}>Loading environments...</Text>
        </Box>
      )}

      {error && !loading && (
        <Flash variant="danger" sx={{ mb: 3 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text>{error}</Text>
            <Button size="small" onClick={fetchEnvironments}>
              Retry
            </Button>
          </Box>
        </Flash>
      )}

      {!loading && environments.length > 0 && (
        <Box>
          {environments.map(env => (
            <Box
              key={env.name}
              sx={{
                p: 3,
                mb: 2,
                bg: 'canvas.subtle',
                border: '1px solid',
                borderColor:
                  selectedEnv === env.name
                    ? COLORS.brand.primary
                    : 'border.default',
                borderRadius: 2,
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: COLORS.brand.primaryLight,
                  bg: 'canvas.default',
                },
                '&:focus-visible': {
                  outline: '2px solid',
                  outlineColor: COLORS.brand.primary,
                  outlineOffset: '2px',
                },
              }}
              onClick={() => handleSelectEnvironment(env.name)}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelectEnvironment(env.name);
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={`Select ${env.title || env.name} environment`}
              aria-pressed={selectedEnv === env.name}
            >
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start',
                  mb: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'start', gap: 2 }}>
                  <Box
                    sx={{
                      color: 'fg.muted',
                      minWidth: 40,
                      '&:focus-visible': {
                        outline: '2px solid',
                        outlineColor: COLORS.brand.primary,
                        outlineOffset: '2px',
                        borderRadius: 1,
                      },
                    }}
                  >
                    {(() => {
                      const parsed = parseEnvironmentDescription(
                        env.description || ''
                      );
                      return parsed?.imageUrl ? (
                        <img
                          src={parsed.imageUrl}
                          width="40"
                          height="40"
                          alt={`${env.title || env.name} environment`}
                          style={{ display: 'block' }}
                        />
                      ) : (
                        getEnvironmentIcon(env)
                      );
                    })()}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        mb: 1,
                      }}
                    >
                      <Heading as="h3" sx={{ fontSize: 2 }}>
                        {env.title || env.name}
                      </Heading>
                      <Label size="small" variant="default">
                        {getEnvironmentType(env)}
                      </Label>
                    </Box>

                    {(() => {
                      const parsed = parseEnvironmentDescription(
                        env.description || ''
                      );
                      if (parsed && parsed.mainDescription) {
                        return (
                          <>
                            <Text
                              sx={{
                                fontSize: 1,
                                color: 'fg.default',
                                fontWeight: 'bold',
                                mb: 1,
                              }}
                            >
                              {parsed.mainDescription}
                            </Text>
                            {parsed.gpuDetail && (
                              <Text
                                sx={{
                                  fontSize: 1,
                                  color: 'fg.muted',
                                  mb: 1,
                                }}
                              >
                                GPU: {parsed.gpuDetail}
                              </Text>
                            )}
                            {parsed.packages.length > 0 && (
                              <Box sx={{ mt: 1 }}>
                                <Text
                                  sx={{
                                    fontSize: 0,
                                    color: 'fg.subtle',
                                    mb: 1,
                                  }}
                                >
                                  <strong>Packages:</strong>
                                </Text>
                                <Box
                                  sx={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: 1,
                                  }}
                                >
                                  {parsed.packages
                                    .slice(0, 6)
                                    .map((pkg, idx) => (
                                      <Label key={idx} size="small">
                                        {pkg}
                                      </Label>
                                    ))}
                                  {parsed.packages.length > 6 && (
                                    <Label size="small" variant="default">
                                      and more
                                    </Label>
                                  )}
                                </Box>
                              </Box>
                            )}
                          </>
                        );
                      } else {
                        return (
                          <Text sx={{ fontSize: 1, color: 'fg.muted', mb: 2 }}>
                            {env.description || `Environment: ${env.name}`}
                          </Text>
                        );
                      }
                    })()}

                    {env.image && (
                      <Text
                        sx={{
                          fontSize: 0,
                          color: 'fg.subtle',
                          fontFamily: 'mono',
                          mt: 1,
                        }}
                      >
                        Image: {env.image}
                      </Text>
                    )}
                  </Box>
                </Box>

                {selectedEnv === env.name && (
                  <Button
                    size="small"
                    aria-label={`${env.title || env.name} is currently selected`}
                    sx={{
                      backgroundColor: COLORS.brand.primary,
                      color: 'white',
                      cursor: 'default',
                      '&:hover': {
                        backgroundColor: COLORS.brand.primary,
                      },
                      '&:focus-visible': {
                        outline: '2px solid',
                        outlineColor: COLORS.palette.white,
                        outlineOffset: '2px',
                      },
                    }}
                  >
                    Selected
                  </Button>
                )}
              </Box>

              {env.resources && (
                <Box
                  sx={{
                    mt: 2,
                    pt: 2,
                    borderTop: '1px solid',
                    borderColor: 'border.muted',
                  }}
                >
                  <Text sx={{ fontSize: 0, fontWeight: 'bold', mb: 1 }}>
                    <PackageIcon size={14} /> Resources:
                  </Text>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {formatResources(env.resources).map((resource, idx) => (
                      <Label key={idx} size="small">
                        {resource}
                      </Label>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          ))}
        </Box>
      )}

      {!loading && environments.length === 0 && !error && (
        <Box
          sx={{
            textAlign: 'center',
            py: 6,
            px: 3,
            bg: 'canvas.subtle',
            borderRadius: 2,
          }}
        >
          <Text sx={{ color: 'fg.muted' }}>
            No environments available. Please check your connection.
          </Text>
        </Box>
      )}

      {configuration?.token && environments.length > 0 && (
        <Box sx={{ mt: 4, p: 4, bg: 'canvas.subtle', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
            <Text sx={{ fontSize: 1, color: 'fg.muted', fontWeight: 'bold' }}>
              Selected Environment:
            </Text>
            <Text sx={{ fontSize: 1, color: 'fg.default' }}>
              {selectedEnv || 'None'}
            </Text>
          </Box>
          <Text
            sx={{ fontSize: 0, color: 'fg.subtle', mt: 2, lineHeight: 1.5 }}
          >
            This environment will be used when creating new runtimes and
            notebooks.
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default EnvironmentsList;
