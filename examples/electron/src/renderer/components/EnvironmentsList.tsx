import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Button,
  Label,
  Timeline,
  Spinner,
  Flash,
} from '@primer/react';
import {
  CheckCircleIcon,
  CpuIcon,
  ZapIcon,
  PackageIcon,
  AlertIcon,
} from '@primer/octicons-react';
import { useCoreStore } from '@datalayer/core';
import type { IDatalayerEnvironment } from '@datalayer/core';
import { useDatalayerAPI } from '../hooks/useDatalayerAPI';

const EnvironmentsList: React.FC = () => {
  const [environments, setEnvironments] = useState<IDatalayerEnvironment[]>([]);
  const [selectedEnv, setSelectedEnv] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { configuration, setConfiguration } = useCoreStore();
  const { getEnvironments: fetchEnvironmentsFromAPI, isElectron } =
    useDatalayerAPI();

  useEffect(() => {
    fetchEnvironments();
  }, []);

  const fetchEnvironments = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if user is authenticated
      if (!configuration?.token) {
        setError('Please login to view available environments');
        setEnvironments([]);
        return;
      }

      // Fetch environments using secure IPC if in Electron, otherwise show defaults
      if (isElectron) {
        const data = await fetchEnvironmentsFromAPI();
        console.log('Fetched environments via IPC:', data);
        setEnvironments(data);
      } else {
        // Fallback for non-Electron environment (shouldn't happen in production)
        console.warn(
          'Not in Electron environment, showing default environments'
        );
        setEnvironments([]);
      }

      // Set the current environment as selected
      if (configuration.cpuEnvironment) {
        setSelectedEnv(configuration.cpuEnvironment);
      } else if (environments.length > 0) {
        // Default to first environment
        setSelectedEnv(environments[0].name);
      }
    } catch (err) {
      console.error('Failed to fetch environments:', err);
      setError('Failed to load environments. Please try again.');

      // Show default environments as fallback
      setEnvironments([
        {
          name: 'python-cpu-env',
          display_name: 'Python CPU Environment',
          description:
            'Standard Python environment optimized for CPU computation',
          image: 'datalayer/python-cpu-env:latest',
          resources: {
            cpu: '4',
            memory: '32Gi',
            gpu: '0',
          },
        } as IDatalayerEnvironment,
        {
          name: 'ai-env',
          display_name: 'AI/GPU Environment',
          description: 'GPU-accelerated environment for AI and deep learning',
          image: 'datalayer/ai-env:latest',
          resources: {
            cpu: '8',
            memory: '64Gi',
            gpu: '1',
          },
        } as IDatalayerEnvironment,
      ]);
    } finally {
      setLoading(false);
    }
  };

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

  const getEnvironmentIcon = (env: IDatalayerEnvironment) => {
    const isGPU =
      env.name === 'ai-env' ||
      env.name.includes('gpu') ||
      (env.resources?.gpu && env.resources.gpu !== '0');
    return isGPU ? <ZapIcon size={24} /> : <CpuIcon size={24} />;
  };

  const getEnvironmentType = (env: IDatalayerEnvironment) => {
    const isGPU =
      env.name === 'ai-env' ||
      env.name.includes('gpu') ||
      (env.resources?.gpu && env.resources.gpu !== '0');
    return isGPU ? 'GPU' : 'CPU';
  };

  const formatResources = (resources: any) => {
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
          <Spinner size="large" />
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
        <Timeline>
          {environments.map(env => (
            <Timeline.Item key={env.name}>
              <Timeline.Badge>
                <CheckCircleIcon className="color-fg-success" />
              </Timeline.Badge>
              <Timeline.Body>
                <Box
                  sx={{
                    p: 3,
                    mb: 2,
                    bg: 'canvas.subtle',
                    border: '1px solid',
                    borderColor:
                      selectedEnv === env.name
                        ? 'accent.emphasis'
                        : 'border.default',
                    borderRadius: 2,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: 'accent.muted',
                      bg: 'canvas.default',
                    },
                  }}
                  onClick={() => handleSelectEnvironment(env.name)}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'start',
                      mb: 3,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'start', gap: 3 }}>
                      <Box sx={{ color: 'fg.muted', mt: 1, minWidth: 60 }}>
                        {(() => {
                          const parsed = parseEnvironmentDescription(
                            env.description || ''
                          );
                          return parsed?.imageUrl ? (
                            <img
                              src={parsed.imageUrl}
                              width="60"
                              height="60"
                              alt={env.name}
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
                          <Heading as="h3" sx={{ fontSize: 3 }}>
                            {env.display_name || env.name}
                          </Heading>
                          <Label
                            size="small"
                            variant={
                              getEnvironmentType(env) === 'GPU'
                                ? 'accent'
                                : 'default'
                            }
                          >
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
                                  <Box sx={{ mt: 2 }}>
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
                                        .slice(0, 8)
                                        .map((pkg, idx) => (
                                          <Label key={idx} size="small">
                                            {pkg}
                                          </Label>
                                        ))}
                                      {parsed.packages.length > 8 && (
                                        <Label size="small" variant="default">
                                          +{parsed.packages.length - 8} more
                                        </Label>
                                      )}
                                    </Box>
                                  </Box>
                                )}
                              </>
                            );
                          } else {
                            return (
                              <Text
                                sx={{ fontSize: 1, color: 'fg.muted', mb: 2 }}
                              >
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
                              mt: 2,
                            }}
                          >
                            Image: {env.image}
                          </Text>
                        )}
                      </Box>
                    </Box>

                    {selectedEnv === env.name && (
                      <Button variant="primary" size="small" disabled>
                        Selected
                      </Button>
                    )}
                  </Box>

                  {env.resources && (
                    <Box
                      sx={{
                        mt: 3,
                        pt: 3,
                        borderTop: '1px solid',
                        borderColor: 'border.muted',
                      }}
                    >
                      <Text sx={{ fontSize: 1, fontWeight: 'bold', mb: 2 }}>
                        <PackageIcon size={16} /> Resources:
                      </Text>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        {formatResources(env.resources).map((resource, idx) => (
                          <Label key={idx} size="small">
                            {resource}
                          </Label>
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>
              </Timeline.Body>
            </Timeline.Item>
          ))}
        </Timeline>
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
        <Box sx={{ mt: 4, p: 3, bg: 'canvas.subtle', borderRadius: 2 }}>
          <Text sx={{ fontSize: 1, color: 'fg.muted' }}>
            <strong>Selected Environment:</strong> {selectedEnv || 'None'}
          </Text>
          <Text sx={{ fontSize: 0, color: 'fg.subtle', mt: 1 }}>
            This environment will be used when creating new runtimes and
            notebooks.
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default EnvironmentsList;
