/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { useEffect, useState } from 'react';
import { PageConfig, URLExt } from '@jupyterlab/coreutils';
import { EyeIcon, EyeClosedIcon, MarkGithubIcon } from '@primer/octicons-react';
import {
  Button,
  FormControl,
  Heading,
  Link,
  PageLayout,
  TextInput,
} from '@primer/react';
import { Box } from '@datalayer/primer-addons';
import { asUser, IAMProvidersSpecs, IIAMProviderSpec } from '../../models';
import { useIAMStore } from '../../state';
import { CenteredSpinner } from '../display';
import { isInsideJupyterLab, validateLength } from '../../utils';
import { useNavigate, useCache, useToast, useIAM } from '../../hooks';
import { LoginToken } from './LoginToken';

interface IFormData {
  handle?: string;
  password?: string;
}

interface IFormError {
  handle?: string;
  password?: string;
}

export interface ILoginProps {
  /**
   * Page heading
   */
  heading?: string;
  /**
   * Home page route
   */
  homeRoute: string;
  /**
   * Login page route
   */
  loginRoute?: string;
  /**
   * Join page route
   */
  joinRoute?: string;
  /**
   * Join confirmation route
   */
  joinConfirmRoute?: string;
  /**
   * Password route
   */
  passwordRoute?: string;
  /**
   * Show Email Login form
   */
  showEmailLogin?: boolean;
  /**
   * Show GitHub Login button
   */
  showGitHubLogin?: boolean;
  /**
   * Show token Login buttons
   */
  showTokenLogin?: boolean;
}

export const Login = (props: ILoginProps): JSX.Element => {
  const {
    heading,
    homeRoute,
    loginRoute,
    showEmailLogin = true,
    showGitHubLogin = true,
    showTokenLogin = true,
  } = props;
  const { useLogin, useOAuth2AuthorizationURL } = useCache({ loginRoute });

  const loginMutation = useLogin();
  const getOAuth2URLMutation = useOAuth2AuthorizationURL();

  const { loginAndNavigate, setLogin } = useIAM();
  const {
    externalToken,
    iamProvidersAuthorizationURL,
    addIAMProviderAuthorizationURL,
    iamRunUrl,
    logout,
    checkIAMToken,
  } = useIAMStore();
  const { enqueueToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingWithToken, setLoadingWithToken] = useState<number>(-1);
  const [formValues, setFormValues] = useState<IFormData>({
    handle: undefined,
    password: undefined,
  });
  const [validationResult, setValidationResult] = useState<IFormError>({
    handle: undefined,
    password: undefined,
  });
  const [passwordVisibility, setPasswordVisibility] = useState(false);
  useEffect(() => {
    const initIAMProvider = (iamProvider: IIAMProviderSpec) => {
      const callbackURI = isInsideJupyterLab()
        ? URLExt.join(
            PageConfig.getBaseUrl(),
            iamProvider.oauth2CallbackServerRoute,
          )
        : location.protocol +
          '//' +
          location.hostname +
          ':' +
          location.port +
          iamProvider.oauth2CallbackUIRoute;
      const queryArgs: Record<string, string> = {
        provider: iamProvider.name,
        callback_uri: callbackURI,
      };
      /*
      const xsrfTokenMatch = document.cookie.match('\\b_xsrf=([^;]*)\\b');
      if (xsrfTokenMatch) {
        queryArgs['xsrf'] = xsrfTokenMatch[1];
      }
      */
      getOAuth2URLMutation.mutate(queryArgs, {
        onSuccess: authUrl => {
          if (authUrl) {
            addIAMProviderAuthorizationURL(iamProvider.name, authUrl);
          } else {
            console.error(
              `Failed to get the Login URL from Datalayer IAM for provider ${iamProvider.name}.`,
            );
          }
        },
      });
    };
    if (!iamProvidersAuthorizationURL[IAMProvidersSpecs.GitHub.name]) {
      initIAMProvider(IAMProvidersSpecs.GitHub);
    }
    if (!iamProvidersAuthorizationURL[IAMProvidersSpecs.LinkedIn.name]) {
      initIAMProvider(IAMProvidersSpecs.LinkedIn);
    }
  }, [iamRunUrl, iamProvidersAuthorizationURL, addIAMProviderAuthorizationURL]);
  useEffect(() => {
    if (externalToken) {
      setLoadingWithToken(1);
      loginAndNavigate(
        externalToken,
        logout,
        checkIAMToken,
        navigate,
        homeRoute,
      )
        .catch(error => {
          console.debug('Failed to login with token from cookie..', error);
          enqueueToast('Failed to check authentication.', { variant: 'error' });
        })
        .finally(() => {
          setLoadingWithToken(-1);
        });
    }
  }, [externalToken]);
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      submit();
    }
  };
  const handleHandleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormValues(prevFormValues => ({
      ...prevFormValues,
      handle: event.target.value,
    }));
  };
  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormValues(prevFormValues => ({
      ...prevFormValues,
      password: event.target.value,
    }));
  };
  const submit = async () => {
    if (
      loading ||
      validationResult.handle !== '' ||
      validationResult.password !== ''
    ) {
      return;
    }
    setLoading(true);
    loginMutation.mutate(
      {
        handle: formValues.handle!,
        password: formValues.password!,
      },
      {
        onSuccess: (resp: any) => {
          if (resp.success) {
            setValidationResult({ handle: '', password: '' });
            const user = asUser(resp.user);
            const token = resp.token;
            setLogin(user, token);
            navigate(homeRoute);
          } else {
            enqueueToast('Failed to login. Check your username and password.', {
              variant: 'warning',
            });
            setValidationResult({
              handle: '',
              password: 'Invalid credentials',
            });
            console.debug(
              `Failed to login: ${resp.message}`,
              resp.errors ?? '',
            );
          }
        },
        onSettled: () => {
          setLoading(false);
        },
      },
    );
  };
  useEffect(() => {
    setValidationResult({
      ...validationResult,
      handle:
        formValues.handle === undefined
          ? undefined
          : validateLength(formValues.handle, 1)
            ? ''
            : 'Your username may not be empty.',
      password:
        formValues.password === undefined
          ? undefined
          : validateLength(formValues.password, 1)
            ? ''
            : 'Your password may not be empty.',
    });
  }, [formValues]);
  return (
    <PageLayout
      containerWidth="medium"
      padding="normal"
      style={{ overflow: 'visible', minHeight: 'calc(100vh - 45px)' }}
    >
      <PageLayout.Header>
        <Heading>{heading || 'Login to Datalayer'}</Heading>
      </PageLayout.Header>
      <PageLayout.Content>
        {loadingWithToken < 0 ? (
          <>
            <Box display="flex">
              {showEmailLogin && (
                <Box sx={{ label: { marginTop: 2 }, paddingRight: '10%' }}>
                  <Box mt={5}>
                    <FormControl required>
                      <FormControl.Label>Your username</FormControl.Label>
                      <TextInput
                        autoFocus
                        placeholder="Your username"
                        value={formValues.handle}
                        onChange={handleHandleChange}
                        onKeyDown={handleKeyDown}
                      />
                      {validationResult.handle && (
                        <FormControl.Validation
                          variant={
                            validationResult.handle ? 'error' : 'success'
                          }
                        >
                          {validationResult.handle}
                        </FormControl.Validation>
                      )}
                    </FormControl>
                  </Box>
                  <Box>
                    <FormControl required>
                      <FormControl.Label>Your password</FormControl.Label>
                      <TextInput
                        placeholder="Your password"
                        type={passwordVisibility ? 'text' : 'password'}
                        value={formValues.password}
                        onChange={handlePasswordChange}
                        onKeyDown={handleKeyDown}
                        trailingAction={
                          <TextInput.Action
                            onClick={() => {
                              setPasswordVisibility(!passwordVisibility);
                            }}
                            icon={passwordVisibility ? EyeClosedIcon : EyeIcon}
                            aria-label={
                              passwordVisibility
                                ? 'Hide password'
                                : 'Show password'
                            }
                            sx={{ color: 'var(--fgColor-muted)' }}
                          />
                        }
                        sx={{ overflow: 'visible' }}
                      />
                      {validationResult.password && (
                        <FormControl.Validation
                          variant={
                            validationResult.password ? 'error' : 'success'
                          }
                        >
                          {validationResult.password}
                        </FormControl.Validation>
                      )}
                    </FormControl>
                  </Box>
                  <Box mt={5}>
                    <Button
                      variant="primary"
                      disabled={
                        loading ||
                        validationResult.handle !== '' ||
                        validationResult.password !== ''
                      }
                      onClick={submit}
                    >
                      {loading
                        ? 'Login…'
                        : heading
                          ? 'Login with Datalayer'
                          : 'Login'}
                    </Button>
                    <Box pt={6} />
                    {/*
                    <Link href="https://datalayer.app/join" target="_blank">
                        Don't have an account?
                      </Link>
                    <Box pt={1} />
                    */}
                    <Link href="https://datalayer.app/password" target="_blank">
                      Forgot password?
                    </Link>
                    {/*joinRoute && (
                      <>
                        <Link
                          href="#"
                          onClick={() => {
                            navigate(joinRoute);
                          }}
                        >
                          Don't have an account?
                        </Link>
                        <Box pt={3} />
                      </>
                    )*/}
                    {/*passwordRoute && (
                      <Link
                        href="#"
                        onClick={() => {
                          navigate(passwordRoute);
                        }}
                      >
                        Forgot password?
                      </Link>
                    )*/}
                    {/*joinRoute && joinConfirmRoute && (
                      <>
                        <Box pt={3} />
                        <Link
                          href=""
                          onClick={() => {
                            navigate(joinConfirmRoute);
                          }}
                        >
                          Activate your account with a code
                        </Link>
                      </>
                    )*/}
                  </Box>
                </Box>
              )}
              <Box>
                <Box
                  display="flex"
                  flexDirection="column"
                  sx={{ margin: 'auto' }}
                >
                  {showGitHubLogin &&
                    iamProvidersAuthorizationURL[
                      IAMProvidersSpecs.GitHub.name
                    ] && (
                      <Button
                        leadingVisual={MarkGithubIcon}
                        href={
                          iamProvidersAuthorizationURL[
                            IAMProvidersSpecs.GitHub.name
                          ]
                        }
                        as="a"
                        style={{ margin: '10px 0' }}
                      >
                        Login with GitHub
                      </Button>
                    )}
                  {showTokenLogin && (
                    <LoginToken
                      homeRoute={homeRoute}
                      style={{ margin: '10px 0' }}
                    />
                  )}
                </Box>
              </Box>
            </Box>
          </>
        ) : loadingWithToken ? (
          <CenteredSpinner message="Checking authentication…" />
        ) : (
          <></>
        )}
      </PageLayout.Content>
    </PageLayout>
  );
};

export default Login;
