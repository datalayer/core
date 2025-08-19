/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React, { useState, useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Link as RouterLink,
} from 'react-router-dom';
import { Box, Button, Heading, Text } from '@primer/react';
import { useNavigate, useLocation, useParams, useHistory } from '../hooks';

/**
 * Component that uses our custom navigation hooks
 * This will be rendered inside the Router context
 */
const NavigationTester: React.FC = () => {
  const [navigationType, setNavigationType] = useState<string>('detecting...');
  const [renderCount, setRenderCount] = useState(0);

  // Our custom hooks - these should detect React Router and use it
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const history = useHistory();

  useEffect(() => {
    // Detect navigation type based on successful hook usage
    // If we get here without errors, React Router was detected
    setNavigationType('react-router');
    setRenderCount(prev => prev + 1);
  }, [location.pathname]);

  const handleProgrammaticNav = () => {
    navigate('/test-page');
  };

  const handleNavWithState = () => {
    navigate('/with-state', undefined, true, { state: { from: 'button' } });
  };

  const handleReplace = () => {
    history.replace('/replaced', { replaced: true });
  };

  const handleBack = () => {
    history.back();
  };

  const handleForward = () => {
    history.forward();
  };

  return (
    <Box sx={{ p: 4 }}>
      <Heading as="h2" sx={{ mb: 3 }}>
        Navigation Status
      </Heading>

      <Box
        sx={{
          mb: 4,
          p: 3,
          borderWidth: 1,
          borderStyle: 'solid',
          borderColor: 'border.default',
          borderRadius: 2,
        }}
      >
        <Text as="p" sx={{ mb: 2 }}>
          <strong>Detection:</strong>{' '}
          <Text as="span" sx={{ color: 'success.fg' }}>
            {navigationType}
          </Text>
        </Text>
        <Text as="p" sx={{ mb: 2 }}>
          <strong>Path:</strong> {location.pathname}
        </Text>
        <Text as="p" sx={{ mb: 2 }}>
          <strong>Search:</strong> {location.search || '(none)'}
        </Text>
        <Text as="p" sx={{ mb: 2 }}>
          <strong>Hash:</strong> {location.hash || '(none)'}
        </Text>
        <Text as="p" sx={{ mb: 2 }}>
          <strong>State:</strong> {JSON.stringify(location.state) || '(none)'}
        </Text>
        <Text as="p" sx={{ mb: 2 }}>
          <strong>Params:</strong> {JSON.stringify(params)}
        </Text>
        <Text as="p">
          <strong>Renders:</strong> {renderCount}
        </Text>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Heading as="h3" sx={{ mb: 2 }}>
          Test Our Hooks
        </Heading>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button onClick={handleProgrammaticNav}>
            Navigate to /test-page
          </Button>
          <Button onClick={handleNavWithState} variant="default">
            Navigate with State
          </Button>
          <Button onClick={handleReplace} variant="default">
            Replace Current
          </Button>
          <Button onClick={handleBack} variant="default">
            Back
          </Button>
          <Button onClick={handleForward} variant="default">
            Forward
          </Button>
        </Box>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Heading as="h3" sx={{ mb: 2 }}>
          Router Links
        </Heading>
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <RouterLink to="/">Home</RouterLink>
          <RouterLink to="/test-page">Test Page</RouterLink>
          <RouterLink to="/with-state">With State</RouterLink>
          <RouterLink to="/replaced">Replaced</RouterLink>
          <RouterLink to="/user/123">User 123</RouterLink>
        </Box>
      </Box>
    </Box>
  );
};

/**
 * Simple page components for routing
 */
const HomePage: React.FC = () => (
  <Box>
    <Heading as="h1" sx={{ mb: 3 }}>
      Home
    </Heading>
    <Text as="p">Testing React Router with our custom navigation hooks.</Text>
    <NavigationTester />
  </Box>
);

const TestPage: React.FC = () => (
  <Box>
    <Heading as="h1" sx={{ mb: 3 }}>
      Test Page
    </Heading>
    <Text as="p">You navigated here using our custom hooks!</Text>
    <NavigationTester />
  </Box>
);

const WithStatePage: React.FC = () => (
  <Box>
    <Heading as="h1" sx={{ mb: 3 }}>
      Page with State
    </Heading>
    <Text as="p">This page can receive state through navigation.</Text>
    <NavigationTester />
  </Box>
);

const ReplacedPage: React.FC = () => (
  <Box>
    <Heading as="h1" sx={{ mb: 3 }}>
      Replaced Page
    </Heading>
    <Text as="p">This page replaced the previous history entry.</Text>
    <NavigationTester />
  </Box>
);

const UserPage: React.FC = () => {
  const params = useParams();
  return (
    <Box>
      <Heading as="h1" sx={{ mb: 3 }}>
        User Page
      </Heading>
      <Text as="p">User ID from params: {JSON.stringify(params)}</Text>
      <NavigationTester />
    </Box>
  );
};

/**
 * React Router Navigation Example
 * Demonstrates our navigation hooks working with React Router
 */
export const ReactRouterNavigationExample: React.FC = () => {
  return (
    <BrowserRouter>
      <Box sx={{ minHeight: '100vh', p: 4 }}>
        <Box sx={{ mb: 4, p: 3, bg: 'canvas.subtle', borderRadius: 2 }}>
          <Heading as="h1" sx={{ mb: 2 }}>
            React Router Navigation Example
          </Heading>
          <Text as="p" sx={{ mb: 2 }}>
            This example shows our custom navigation hooks working with React
            Router. The hooks detect React Router context and use it
            automatically.
          </Text>
          <Text as="p" sx={{ color: 'success.fg', fontWeight: 'bold' }}>
            ✓ React Router is loaded and our hooks should detect it!
          </Text>
        </Box>

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/test-page" element={<TestPage />} />
          <Route path="/with-state" element={<WithStatePage />} />
          <Route path="/replaced" element={<ReplacedPage />} />
          <Route path="/user/:id" element={<UserPage />} />
        </Routes>
      </Box>
    </BrowserRouter>
  );
};

export default ReactRouterNavigationExample;
