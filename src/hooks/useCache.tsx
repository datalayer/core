/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { URLExt } from '@jupyterlab/coreutils';
import {
  BOOTSTRAP_USER_ONBOARDING,
  IAnyItem,
  IAnyOrganization,
  IAnySpace,
  IAssignment,
  ICell,
  IContact,
  ICourse,
  IDataset,
  IDatasource,
  IDocument,
  IEnvironment,
  IExercise,
  IIAMToken,
  IInbound,
  IInvite,
  IItemType,
  ILesson,
  ILinkedInUser,
  INotebook,
  IOrganization,
  IOrganizationMember,
  IOutbound,
  IPage,
  ISchool,
  ISecret,
  ISpaceItem,
  IStudent,
  IStudentItem,
  ISurvey,
  ITeam,
  IUsage,
  IUser,
  IUserOnboarding,
  IUserSettings,
  LinkedInUser,
  WaitingListFormData,
  asContact,
  asDatasource,
  asInbound,
  asInvite,
  asOrganization,
  asOutbound,
  asPage,
  asSecret,
  asSpace,
  asSurvey,
  asTeam,
  asToken,
  asUsage,
  asUser,
} from "../models";
import { useCoreStore, useIAMStore } from '../state';
import { IPrice } from "./../components/checkout";
import { asDisplayName, namesAsInitials, asArray } from "../utils";
import { IAMProvidersSpecs, type IRESTBaseResponse } from '../models';
import { newUserMock } from './../mocks';
import { useRun } from "./useRun";
import { useAuthorization } from "./useAuthorization";

import { OUTPUTSHOT_PLACEHOLDER_DEFAULT_SVG } from './assets';

const CONTACTS_BY_HANDLE = new Map<string, IContact>();
const CONTACTS_BY_ID = new Map<string, IContact>();
const COURSES_BY_ID = new Map<string, ICourse>();
const COURSES_ENROLLMENTS_BY_ID = new Map<string, ICourse>();
const COURSES_INSTRUCTORS_BY_ID = new Map<string, ICourse>();
const DATASOURCES_BY_ID = new Map<string, IDatasource>();
const INBOUNDS_BY_HANDLE = new Map<string, IInbound>();
const INBOUNDS_BY_ID = new Map<string, IInbound>();
const INVITES_BY_TOKEN = new Map<string, IInvite>();
const ORGANISATIONS_BY_HANDLE = new Map<string, IOrganization>();
const ORGANISATIONS_BY_ID = new Map<string, IOrganization>();
const ORGANISATIONS_FOR_USER_BY_ID = new Map<string, IAnyOrganization>();
const OUTBOUNDS_BY_ID = new Map<string, IOutbound>();
const PAGES_BY_ID = new Map<string, IPage>();
const PUBLIC_COURSES_BY_ID = new Map<string, ICourse>();
const PUBLIC_ITEMS_BY_ID = new Map<string, ISpaceItem>();
const SCHOOLS_BY_ID = new Map<string, ISchool>();
const SECRETS_BY_ID = new Map<string, ISecret>();
const SPACES_BY_HANDLE_BY_ORGANISATION_HANDLE = new Map<string, Map<string, IAnySpace>>();
const SPACES_BY_ID_BY_ORGANISATION_ID = new Map<string, Map<string, IAnySpace>>();
const SPACES_FOR_USER_BY_HANDLE = new Map<string, IAnySpace>();
const SPACES_FOR_USER_BY_ID = new Map<string, IAnySpace>();
const SPACE_ASSIGNMENTS_BY_ID = new Map<string, IAssignment>();
const SPACE_CELLS_BY_ID = new Map<string, ICell>();
const SPACE_DATASETS_BY_ID = new Map<string, IDataset>();
const SPACE_DOCUMENTS_BY_ID = new Map<string, IDocument>();
const SPACE_ENVIRONMENTS_BY_ID = new Map<string, IEnvironment>();
const SPACE_EXERCISES_BY_ID = new Map<string, IExercise>();
const SPACE_ITEMS_CACHE = new Map<string, IAnyItem>();
const SPACE_LESSONS_BY_ID = new Map<string, ILesson>();
const SPACE_NOTEBOOKS_BY_ID = new Map<string, INotebook>();
const STUDENTS_BY_ID = new Map<string, IStudent>();
const STUDENT_ASSIGNMENTS_BY_ID = new Map<string, IAssignment>();
const TEAMS_BY_HANDLE = new Map<string, ITeam>();
const TEAMS_BY_ID = new Map<string, ITeam>();
const TEAMS_BY_ORGANIZATION_BY_ID = new Map<string, ITeam[]>();
const TOKENS_BY_ID = new Map<string, IIAMToken>();
const USERS_BY_HANDLE = new Map<string, IUser>();
const USERS_BY_ID = new Map<string, IUser>();

type CacheProps = {
  loginRoute?: string;
}

type ISearchOpts = {
  q: string;
  types: string[];
  max: number;
  public: boolean;
}

const DEFAULT_SEARCH_OPTS = {
  q: '*',
  types: ['page'],
  max: 3,
  public: true,
}


/**
 * Callbacks to RUN service.
 *
 * It assumes to be used within a {@link Router} component. If not
 * you must set the options `loginRoute` to `null` (raise an error _Unauthorized_
 * instead of redirecting to the login page).
 */
export const useCache = ({ loginRoute = '/login' }: CacheProps = {}) => {
  const { configuration } = useCoreStore();
  const { user } = useIAMStore();
  const { requestRun } = useRun({ loginRoute });
  const { checkIsOrganizationMember } = useAuthorization();

  // Caches -------------------------------------------------------------------

  const clearAllCaches = () => {
    CONTACTS_BY_HANDLE.clear();
    CONTACTS_BY_ID.clear();
    COURSES_BY_ID.clear();
    COURSES_ENROLLMENTS_BY_ID.clear();
    COURSES_INSTRUCTORS_BY_ID.clear();
    DATASOURCES_BY_ID.clear();
    INBOUNDS_BY_HANDLE.clear();
    INBOUNDS_BY_ID.clear();
    INVITES_BY_TOKEN.clear();
    ORGANISATIONS_BY_HANDLE.clear();
    ORGANISATIONS_BY_ID.clear();
    ORGANISATIONS_FOR_USER_BY_ID.clear();
    PAGES_BY_ID.clear();
    OUTBOUNDS_BY_ID.clear();
    PUBLIC_COURSES_BY_ID.clear();
    PUBLIC_ITEMS_BY_ID.clear();
    SCHOOLS_BY_ID.clear();
    SECRETS_BY_ID.clear();
    SPACES_BY_HANDLE_BY_ORGANISATION_HANDLE.clear();
    SPACES_BY_ID_BY_ORGANISATION_ID.clear();
    SPACES_FOR_USER_BY_HANDLE.clear();
    SPACES_FOR_USER_BY_ID.clear();
    SPACE_ASSIGNMENTS_BY_ID.clear();
    SPACE_CELLS_BY_ID.clear();
    SPACE_DATASETS_BY_ID.clear();
    SPACE_DOCUMENTS_BY_ID.clear();
    SPACE_ENVIRONMENTS_BY_ID.clear();
    SPACE_EXERCISES_BY_ID.clear();
    SPACE_ITEMS_CACHE.clear();
    SPACE_LESSONS_BY_ID.clear();
    SPACE_NOTEBOOKS_BY_ID.clear();
    STUDENTS_BY_ID.clear();
    STUDENT_ASSIGNMENTS_BY_ID.clear();
    TOKENS_BY_ID.clear();
    USERS_BY_HANDLE.clear();
    USERS_BY_ID.clear();
  }

  const clearCachedItems = () => {
    PUBLIC_ITEMS_BY_ID.clear();
    SPACE_ASSIGNMENTS_BY_ID.clear();
    SPACE_DATASETS_BY_ID.clear();
    SPACE_DOCUMENTS_BY_ID.clear();
    SPACE_ENVIRONMENTS_BY_ID.clear()
    SPACE_EXERCISES_BY_ID.clear()
    SPACE_ITEMS_CACHE.clear();
    SPACE_ITEMS_CACHE.clear();
    SPACE_LESSONS_BY_ID.clear();
    SPACE_NOTEBOOKS_BY_ID.clear();
    SPACE_CELLS_BY_ID.clear()
    SPACE_CELLS_BY_ID.clear();
  }

  // Authentication ------------------------------------------------------------------

  const login = (handle, password) => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/login`,
      method: 'POST',
      body: {
        handle,
        password,
      }
    });
  }

  const logout = () => {
    clearAllCaches();
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/logout`,
      method: 'GET',
    });
  }

  // Join ------------------------------------------------------------------

  const requestJoin = (handle, email, firstName, lastName, password, passwordConfirm) => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/join/request`,
      method: 'POST',
      body: {
        handle,
        email,
        firstName,
        lastName,
        password,
        passwordConfirm,
      }
    });
  }

  const requestJoinToken = (handle, email, firstName, lastName, password, passwordConfirm) => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/join/request/token`,
      method: 'POST',
      body: {
        handle,
        email,
        firstName,
        lastName,
        password,
        passwordConfirm,
      }
    });
  }

  const joinWithInvite = (formValues, token) => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/join/invites/token`,
      method: 'POST',
      body: {
        ...formValues,
        token,
      },
    });
  }

  const confirmJoinWithToken = (userHandle, token) => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/join/users/${userHandle}/tokens/${token}`,
      method: 'GET',
    });
  }

  // Password ------------------------------------------------------------------

  const changePassword = (handle, password, passwordConfirm) => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/password`,
      method: 'PUT',
      body: {
        handle,
        password,
        passwordConfirm,
      }
    });
  }

  const createTokenForPasswordChange = (handle, password, passwordConfirm) => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/password/token`,
      method: 'POST',
      body: {
        handle,
        password,
        passwordConfirm,
      }
    });
  }

  const confirmPassworkWithToken = (userHandle, token) => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/password/confirm/users/${userHandle}/tokens/${token}`,
      method: 'PUT',
    });
  }

  // OAuth2 -------------------------------------------------------------------

  const getOAuth2AuthorizationURL = async (queryArgs: Record<string, string>) => {
    return requestRun<{ success: boolean; autorization_url: string }>({
      url: URLExt.join(configuration.iamRunUrl, 'api/iam/v1/oauth2/authz/url') + URLExt.objectToQueryString(queryArgs),
      notifyOnError: false,
    });
  }

  const getOAuth2AuthorizationLinkURL = async (queryArgs: Record<string, string>) => {
    return requestRun<{ success: boolean; autorization_url: string }>({
      url: URLExt.join(configuration.iamRunUrl, 'api/iam/v1/oauth2/authz/url/link') + URLExt.objectToQueryString(queryArgs),
    });
  }

  // IAM Providers ------------------------------------------------------------

  const getGitHubProfile = async (accessToken: string) => {
    return fetch(IAMProvidersSpecs.GitHub.userInfoURL,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${accessToken}`,
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    ).then(resp => resp.json());
  }

  /*
   * CORS is not supported @see https://github.com/linkedin-developers/linkedin-api-js-client
   */
  const getLinkedinProfile = async (accessToken: string) => {
    return proxyGET(IAMProvidersSpecs.LinkedIn.userInfoURL, accessToken).then(resp => {
      return new LinkedInUser(resp.response);
    });
  }

  const postLinkedinShare = async (linkedinUser: ILinkedInUser, postText: string, accessToken: string) => {
    const POST_SHARE_REQUEST = {
      "author": linkedinUser.getUrn(),
      "lifecycleState": "PUBLISHED",
      "specificContent": {
        "com.linkedin.ugc.ShareContent": {
          "shareCommentary": {
            "text": postText
          },
          "shareMediaCategory": "NONE"
        }
      },
      "visibility": {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
      }
    };
    return proxyPOST(IAMProvidersSpecs.LinkedIn.postShareURL, POST_SHARE_REQUEST, accessToken);
  }

  const postLinkedinShareWithUpload = async (linkedinUser: ILinkedInUser, postText: string, uploadObject: string, accessToken: string) => {
    const REGISTER_UPLOAD_REQUEST = {
      "registerUploadRequest": {
        "recipes": [
          "urn:li:digitalmediaRecipe:feedshare-image"
        ],
        "owner": linkedinUser.getUrn(),
        "serviceRelationships": [
          {
            "relationshipType": "OWNER",
            "identifier": "urn:li:userGeneratedContent"
          }
        ]
      }
    };
    return proxyPOST(IAMProvidersSpecs.LinkedIn.registerUploadURL, REGISTER_UPLOAD_REQUEST, accessToken)
      .then(registerUploadReponse => {
        /*
        {
          "value": {
              "uploadMechanism": {
                  "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest": {
                      "headers": {},
                      "uploadUrl": "https://api.linkedin.com/mediaUpload/C5522AQGTYER3k3ByHQ/feedshare-uploadedImage/0?ca=vector_feedshare&cn=uploads&m=AQJbrN86Zm265gAAAWemyz2pxPSgONtBiZdchrgG872QltnfYjnMdb2j3A&app=1953784&sync=0&v=beta&ut=2H-IhpbfXrRow1"
                  }
              },
              "mediaArtifact": "urn:li:digitalmediaMediaArtifact:(urn:li:digitalmediaAsset:C5522AQGTYER3k3ByHQ,urn:li:digitalmediaMediaArtifactClass:feedshare-uploadedImage)",
              "asset": "urn:li:digitalmediaAsset:C5522AQGTYER3k3ByHQ"
          }
        }
        */
        const asset = registerUploadReponse.response.value.asset;
        const uploadURL = registerUploadReponse.response.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
        const UPLOAD_OBJECT_REQUEST = {
          uploadURL: uploadURL,
          content: uploadObject,
          userURN: linkedinUser.getUrn(),
        }
        return proxyPUT(uploadURL, UPLOAD_OBJECT_REQUEST, accessToken)
          .then(resp => {
            const share = {
              "author": linkedinUser.getUrn(),
              "lifecycleState": "PUBLISHED",
              "specificContent": {
                "com.linkedin.ugc.ShareContent": {
                  "shareCommentary": {
                    "text": postText
                  },
                  "shareMediaCategory": "IMAGE",
                  "media": [
                    {
                        "status": "READY",
                        "description": {
                            "text": "Datalayer Notebook"
                        },
                        "media": asset,
                        "title": {
                            "text": "Datalayer Notebook"
                        }
                    }
                  ]
                }
              },
              "visibility": {
                "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
              }
            };
            return proxyPOST(IAMProvidersSpecs.LinkedIn.postShareURL, share, accessToken);
          }
        );
      }
    );
  }

  // Proxy -------------------------------------------------------------------

  const proxyGET = async (url: string, token: string) => {
    return requestRun({
      url: URLExt.join(configuration.iamRunUrl, 'api/iam/v1/proxy/request'),
      method: 'POST',
      body: {
        request_method: 'GET',
        request_url: url,
        request_token: token,
      }
    });
  }

  const proxyPOST = async (url: string, body: {}, token: string) => {
    return requestRun({
      url: URLExt.join(configuration.iamRunUrl, 'api/iam/v1/proxy/request'),
      method: 'POST',
      body: {
        request_method: 'POST',
        request_url: url,
        request_token: token,
        request_body: body,
      }
    });
  }

  const proxyPUT = async (url: string, body: {}, token: string) => {
    return requestRun({
      url: URLExt.join(configuration.iamRunUrl, 'api/iam/v1/proxy/request'),
      method: 'POST',
      body: {
        request_method: 'PUT',
        request_url: url,
        request_token: token,
        request_body: body,
      }
    });
  }

  // Waiting List -------------------------------------------------------------

  const registerToWaitingList = (formData: WaitingListFormData) => {
    requestRun<{ success: boolean }>({
      url: `${configuration.growthRunUrl}/api/growth/v1/waitinglist/register`,
      method: 'POST',
      body: {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        affiliation: formData.affiliation || ''
      }
    })
    .then(resp => {
      // Special case, make the error very explicit to the user...
      if (!resp.success) {
        alert('Sorry, something has gone wrong... Please send an email to eric@datalayer.io to register to the waiting list.');
      }
    })
    .catch(err => {
      // Special case, make the error very explicit to the user...
      console.error(err);
      alert('Sorry, something has gone wrong... Please send an email to eric@datalayer.io to register to the waiting list.');
    });
  };

  // Profile ------------------------------------------------------------------

  const getMe = async (token?: string) => {
    const resp = await requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/me`,
      method: 'GET',
      token
    });
    const me = resp.me;
    if (me) {
      const user: IUser = asUser(me);
      return user;
    }
    return null;
  }

  const updateMe = (email, firstName, lastName) => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/me`,
      method: 'PUT',
      body: {
        email,
        firstName,
        lastName,
      }
    });
  }

  const whoami = () => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/whoami`,
      method: 'GET',
    });
  }

  const requestEmailUpdate = (email) => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/me/email`,
      method: 'PUT',
      body: {
        email,
      }
    });
  }

  const confirmEmailUpdate = (token) => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/me/email`,
      method: 'POST',
      body: {
        token,
      }
    });
  }

  // Onboarding ---------------------------------------------------------------

  const updateUserOnboarding = (onboarding: IUserOnboarding) => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/onboardings`,
      method: 'PUT',
      body: {
        onboarding,
      }
    });
  }

  // Settings -----------------------------------------------------------------

  const updateUserSettings = (userId: string, settings: IUserSettings) => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/users/${userId}/settings`,
      method: 'PUT',
      body: {
        aiagents_url_s: settings.aiAgentsUrl,
        can_invite_b: settings.canInvite || false,
      },
    });
  }

  // Pages ------------------------------------------------------------------

  const toPage = (s: any) => {
    if (s) {
      const page = asPage(s);
      PAGES_BY_ID.set(s.uid, page);
      return page;
    }
  }

  const createPage = (page: Omit<IPage, 'id'>) => {
    return requestRun({
      url: `${configuration.libraryRunUrl}/api/library/v1/pages`,
      method: 'POST',
      body: { ...page }
    }).then(resp => {
      if (resp.success) {
        if (resp.page) {
          const pageId = resp.page.uid;
          PAGES_BY_ID.set(pageId, {
            ...page,
            id: pageId,
          });
        }
      }
      return resp;
    });
  }

  const updatePage = (page: Pick<IPage, "id" | "name" | "description" | "tags" >) => {
    return requestRun({
      url: `${configuration.libraryRunUrl}/api/library/v1/pages/${page.id}`,
      method: 'PUT',
      body: { 
        name: page.name,
        description: page.description,
        tags: page.tags,
      },
    }).then(resp => {
      if (resp.success) {
        if (resp.page) {
          toPage(resp.page);
        }
      }
      return resp;
    });
  }

  const deletePage = (page: IPage) => {
    return requestRun({
      url: `${configuration.libraryRunUrl}/api/library/v1/pages/${page.id}`,
      method: 'DELETE',
    });
  }

  const getPage = (pageId: string) => PAGES_BY_ID.get(pageId);

  const clearCachedPages = () => PAGES_BY_ID.clear();

  const refreshPage = (pageId: string) => {
    return requestRun({
      url: `${configuration.libraryRunUrl}/api/library/v1/pages/${pageId}`,
      method: 'GET',
    }).then(resp => {
      if (resp.success) {
        if (resp.page) {
          toPage(resp.page);
        }
      }
      return resp;
    });
  }

  const getPages = () => {
    return Array.from(PAGES_BY_ID.values());
  }

  const refreshPages = () => {
    return requestRun({
      url: `${configuration.libraryRunUrl}/api/library/v1/pages`,
      method: 'GET',
    }).then(resp => {
      if (resp.success) {
        const pages = resp.pages;
        if (pages) {
          PAGES_BY_ID.clear();
          pages.forEach(page => {
            toPage(page);
          });
        }
      }
      return resp;
    });

  }

  // Datasources ------------------------------------------------------------------

  const toDatasource = (s: any) => {
    if (s) {
      const datasource: IDatasource = asDatasource(s);
      DATASOURCES_BY_ID.set(s.uid, datasource);
      return datasource;
    }
  }

  const createDatasource = (datasource: Omit<IDatasource, 'id'>) => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/datasources`,
      method: 'POST',
      body: { ...datasource }
    }).then(resp => {
      if (resp.success) {
        if (resp.datasource) {
          toDatasource(resp.datasource);
        }
      }
      return resp;
    });
  }

  const updateDatasource = (datasource: IDatasource) => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/datasources/${datasource.id}`,
      method: 'PUT',
      body: { ...datasource }
    }).then(resp => {
      if (resp.success) {
        if (resp.datasource) {
          toDatasource(resp.datasource);
        }
      }
      return resp;
    });
  }

  const getDatasource = (datasourceId: string) => DATASOURCES_BY_ID.get(datasourceId);

  const clearCachedDatasources = () => DATASOURCES_BY_ID.clear();

  const refreshDatasource = (datasourceId: string) => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/datasources/${datasourceId}`,
      method: 'GET',
    }).then(resp => {
      if (resp.success) {
        if (resp.datasource) {
          toDatasource(resp.datasource);
        }
      }
      return resp;
    });
  }

  const getDatasources = () => {
    return Array.from(DATASOURCES_BY_ID.values());
  }

  const refreshDatasources = () => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/datasources`,
      method: 'GET',
    }).then(resp => {
      if (resp.success) {
        const datasources = resp.datasources;
        if (datasources) {
          SECRETS_BY_ID.clear();
          datasources.forEach(datasource => {
            toDatasource(datasource);
          });
        }
      }
      return resp;
    });

  }

  // Secrets ------------------------------------------------------------------

  const toSecret = (s: any) => {
    if (s) {
      const secret: ISecret = asSecret(s);
      SECRETS_BY_ID.set(s.uid, secret);
      return secret;
    }
  }

  const createSecret = (secret: Omit<ISecret, 'id'>) => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/secrets`,
      method: 'POST',
      body: { ...secret }
    }).then(resp => {
      if (resp.success) {
        if (resp.secret) {
          toSecret(resp.secret);
        }
      }
      return resp;
    });
  }

  const updateSecret = (secret: ISecret) => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/secrets/${secret.id}`,
      method: 'PUT',
      body: { ...secret }
    }).then(resp => {
      if (resp.success) {
        if (resp.secret) {
          toSecret(resp.secret);
        }
      }
      return resp;
    });
  }

  const deleteSecret = (secret: ISecret) => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/secrets/${secret.id}`,
      method: 'DELETE',
   });
  }

  const getSecret = (secretId: string) => SECRETS_BY_ID.get(secretId);

  const clearCachedSecrets = () => SECRETS_BY_ID.clear();

  const refreshSecret = (secretId: string) => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/secrets/${secretId}`,
      method: 'GET',
    }).then(resp => {
      if (resp.success) {
        if (resp.secret) {
          toSecret(resp.secret);
        }
      }
      return resp;
    });
  }

  const getSecrets = () => {
    return Array.from(SECRETS_BY_ID.values());
  }

  const refreshSecrets = () => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/secrets`,
      method: 'GET',
    }).then(resp => {
      if (resp.success) {
        const secrets = resp.secrets;
        if (secrets) {
          SECRETS_BY_ID.clear();
          secrets.forEach(secret => {
            toSecret(secret);
          });
        }
      }
      return resp;
    });

  }

  // Tokens ------------------------------------------------------------------

  const toToken = (s: any) => {
    if (s) {
      const token: IIAMToken = asToken(s);
      TOKENS_BY_ID.set(s.uid, token);
      return token;
    }
  }

  const createToken = (token: Omit<IIAMToken, 'id' | 'value'>) => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/tokens`,
      method: 'POST',
      body: {
        ...token,
        expirationDate: token.expirationDate.getTime(),
      }
    }).then(resp => {
      if (resp.success) {
        if (resp.token) {
          toToken(resp.token);
        }
      }
      return resp;
    });
  }

  const updateToken = (token: IIAMToken) => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/tokens/${token.id}`,
      method: 'PUT',
      body: { ...token }
    }).then(resp => {
      if (resp.success) {
        if (resp.token) {
          toToken(resp.token);
        }
      }
      return resp;
    });
  }

  const getToken = (tokenId: string) => TOKENS_BY_ID.get(tokenId);

  const clearCachedTokens = () => TOKENS_BY_ID.clear();

  const refreshToken = (tokenId: string) => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/tokens/${tokenId}`,
      method: 'GET',
    }).then(resp => {
      if (resp.success) {
        if (resp.token) {
          toToken(resp.token);
        }
      }
      return resp;
    });
  }

  const getTokens = () => {
    return Array.from(TOKENS_BY_ID.values());
  }

  const refreshTokens = () => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/tokens`,
      method: 'GET',
    }).then(resp => {
      if (resp.success) {
        const tokens = resp.tokens;
        if (tokens) {
          TOKENS_BY_ID.clear();
          tokens.forEach(token => {
            toToken(token);
          });
        }
      }
      return resp;
    });

  }

  // Layout -------------------------------------------------------------------

  const refreshLayout = (accountHandle: string, spaceHandle?: string, user?: IUser) => {
    return requestRun({
      url: `${configuration.spacerRunUrl}/api/spacer/v1/layouts/accounts/${accountHandle}${spaceHandle !== undefined ? '/spaces/' + spaceHandle : ''}`,
      method: 'GET',
    }).then(resp => {
      if (resp.success) {
        if (resp.user) {
          toUser(resp.user);
        }
        let organization: IOrganization | undefined = undefined;
        if (resp.organization) {
          organization = toOrganization(resp.organization);
          if (user && checkIsOrganizationMember(user, organization)) {
            ORGANISATIONS_FOR_USER_BY_ID.set(organization.id, organization);
          }
        }
        if (resp.space) {
          const space = toSpace(resp.space);
          if (organization) {
            let osById = SPACES_BY_ID_BY_ORGANISATION_ID.get(organization.id);
            if (!osById) {
              osById = new Map<string, IAnySpace>();
              SPACES_BY_ID_BY_ORGANISATION_ID.set(organization.id, osById);
            }
            osById.set(space.id, space);
            let osByHandle = SPACES_BY_HANDLE_BY_ORGANISATION_HANDLE.get(organization.handle);
            if (!osByHandle) {
              osByHandle = new Map<string, IAnySpace>();
              SPACES_BY_HANDLE_BY_ORGANISATION_HANDLE.set(organization.handle, osByHandle);
            }
            osByHandle.set(space.handle, space);
          } else {
            SPACES_FOR_USER_BY_HANDLE.set(space.handle, space);
            SPACES_FOR_USER_BY_ID.set(space.id, space)
          }  
        }
      }
      return resp;
    });
  }

  // Invites -------------------------------------------------------------------

  const requestInvite = (firstName: string, lastName: string, email: string, socialUrl: string) => {
    return requestRun({
      url: `${configuration.growthRunUrl}/api/growth/v1/invites/request`,
      method: 'POST',
      body: {
        first_name: firstName,
        last_name: lastName,
        email: email,
        social_url: socialUrl,
      }
   });
  }

  const sendInvite = (invite: IInvite) => {
    return requestRun({
      url: `${configuration.growthRunUrl}/api/growth/v1/invites`,
      method: 'POST',
      body: {
        email: invite.to.email,
        firstName: invite.to.firstName,
        lastName: invite.to.lastName,
        message: invite.message,
        brand: invite.brand,
      }
    });
  }

  const getInvite = (token: string) => INVITES_BY_TOKEN.get(token);

  const clearCachedInvites = () => INVITES_BY_TOKEN.clear();

  const refreshInvite = (token: string) => {
    return requestRun({
      url: `${configuration.growthRunUrl}/api/growth/v1/invites/tokens/${token}`,
      method: 'GET',
    }).then(resp => {
      if (resp.success) {
        const i = resp.invite;
        if (i) {
          const invite = asInvite(i);
          if (invite.token) {
            INVITES_BY_TOKEN.set(invite.token, invite);
          }
        }
      }
      return resp;
    });
  }

  const getInvites = () => {
    return Array.from(INVITES_BY_TOKEN.values());
  }

  const refreshInvites = (accountId: string) => {
    return requestRun({
      url: `${configuration.growthRunUrl}/api/growth/v1/invites/users/${accountId}`,
      method: 'GET',
    }).then(resp => {
      if (resp.success) {
        resp.invites.forEach(i => {
          const invite = asInvite(i);
          if (invite.token) {
            INVITES_BY_TOKEN.set(invite.token, invite);
          }
        });
      }
      return resp;
    });
  }

  const putInvite = (token: string) => {
    return requestRun({
      url: `${configuration.growthRunUrl}/api/growth/v1/invites/tokens/${token}`,
      method: 'PUT',
   });
  }

  // Accounts -------------------------------------------------------------------

  const refreshAccount = (accountHandle: string) => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/accounts/${accountHandle}`,
      method: 'GET',
    }).then(resp => {
      if (resp.success) {
        if (resp.user) {
          toUser(resp.user);
        }
        if (resp.organization) {
          toOrganization(resp.organization);
        }
      }
      return resp;
    });
  }


  // Contacts ---------------------------------------------------------------------

  const toContact = (c: any) => {
    if (c) {
      const contact: IContact = asContact(c);
      CONTACTS_BY_ID.set(contact.id, contact);
      CONTACTS_BY_HANDLE.set(contact.handle, contact);
      return contact;
    }
  }

  const getContactById = (contactId: string) => CONTACTS_BY_ID.get(contactId);

  const getContactByHandle = (contactHandle: string) => CONTACTS_BY_HANDLE.get(contactHandle);

  const createContact = (contact: IContact) => {
    return requestRun({
      url: `${configuration.growthRunUrl}/api/growth/v1/contacts`,
      method: 'POST',
      body: {
        contact,
      }
    }).then(resp => {
      if (resp.success) {
        toContact(resp.contact);
      }
      return resp;
    });
  }

  const updateContact = (contactId, contact: IContact) => {
    return requestRun({
      url: `${configuration.growthRunUrl}/api/growth/v1/contacts/${contactId}`,
      method: 'PUT',
      body: {
        contact,
      }
    }).then(resp => {
      if (resp.success) {
        toContact(resp.contact);
      }
      return resp;
    });
  }

  const refreshContact = (contactId: string) => {
    return requestRun({
      url: `${configuration.growthRunUrl}/api/growth/v1/contacts/${contactId}`,
      method: 'GET',
    }).then(resp => {
      if (resp.success) {
        toContact(resp.contact);
      }
      return resp;
    });
  }

  const searchContacts = (query: string) => {
    return requestRun({
      url: `${configuration.growthRunUrl}/api/growth/v1/contacts/search`,
      method: 'POST',
      body: {
        query,
      }
    }).then(resp => {
      if (resp.success) {
        const contacts = resp.contacts.map(contact => toContact(contact));
        resp.contacts = contacts;
      }
      return resp;
    });
  }

  const assignTagToContact = (contactId, tagName) => {
    return requestRun({
      url: `${configuration.growthRunUrl}/api/growth/v1/contacts/${contactId}/tags/${tagName}`,
      method: 'POST',
    });
  }

  const unassignTagFromContact = (contactId, tagName) => {
    return requestRun({
      url: `${configuration.growthRunUrl}/api/growth/v1/contacts/${contactId}/tags/${tagName}`,
      method: 'DELETE',
    });
  }

  const deleteContact = (contactId: string) => {
    return requestRun({
      url: `${configuration.growthRunUrl}/api/growth/v1/contacts/${contactId}`,
      method: 'DELETE',
    });
  }

  const sendInviteToContact = (contact: IContact, message: string) => {
    return requestRun({
      url: `${configuration.growthRunUrl}/api/growth/v1/contacts/invites`,
      method: 'POST',
      body: {
        contactId: contact.id,
        message,
      }
   });
  }

  // Contacts Enrich ----------------------------------------------------------

  const enrichContactEmail = (contactId, useDomain) => {
    return requestRun({
      url: `${configuration.growthRunUrl}/api/growth/v1/contacts/${contactId}/enrich/email?useDomain=${useDomain}`,
      method: 'GET',
    });
  }

  const enrichContactLinkedin = (contactId) => {
    return requestRun({
      url: `${configuration.growthRunUrl}/api/growth/v1/contacts/${contactId}/enrich/linkedin`,
      method: 'GET',
    });
  }

  const sendLinkedinConnectionRequest = (contact: IContact, message: string) => {
    return requestRun({
      url: `${configuration.growthRunUrl}/api/growth/v1/contacts/${contact.id}/connect/linkedin`,
      method: 'POST',
      body: {
        message,
      }
    }).then(resp => {
      if (resp.success) {
        toContact(resp.contact);
      }
      return resp;
    });
  }

  // Contacts Links -----------------------------------------------------------

  const linkUserWithContact = (userId, contactId) => {
    return requestRun({
      url: `${configuration.growthRunUrl}/api/growth/v1/users/${userId}/contacts/${contactId}`,
      method: 'POST',
    });
  }

  const unlinkUserFromContact = (userId, contactId) => {
    return requestRun({
      url: `${configuration.growthRunUrl}/api/growth/v1/users/${userId}/contacts/${contactId}`,
      method: 'DELETE',
    });
  }

  // Users --------------------------------------------------------------------

  const toUser = (u: any) => {
    if (u) {
      const user: IUser = asUser(u);
      USERS_BY_ID.set(user.id, user);
      USERS_BY_HANDLE.set(user.handle, user);
      return user;
    }
  }

  const getUser = (id: string) => USERS_BY_ID.get(id);

  const getUserByHandle = (handle: string) => USERS_BY_HANDLE.get(handle);

  const refreshUser = (userId: string) => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/users/${userId}`,
      method: 'GET',
    }).then(resp => {
      if (resp.success) {
        toUser(resp.user);
      }
      return resp;
    });
  }

  const searchUsers = (namingPattern: string) => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/users/search`,
      method: 'POST',
      body: {
        namingPattern
      }
    }).then(resp => {
      if (resp.success) {
        const users = resp.users.map(user => toUser(user));
        resp.users = users;
      }
      return resp;
    });
  }

  // User Roles ---------------------------------------------------------------

  const assignRoleToUser = (userId, roleName) => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/users/${userId}/roles/${roleName}`,
      method: 'POST',
    });
  }

  const unassignRoleFromUser = (userId, roleName) => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/users/${userId}/roles/${roleName}`,
      method: 'DELETE',
    });
  }

  // Organizations -------------------------------------------------------------------

  const toOrganization = (org: any) => {
    const organization = asOrganization(org);
    ORGANISATIONS_BY_ID.set(organization.id, organization);
    ORGANISATIONS_BY_HANDLE.set(organization.handle, organization);
    return organization;
  }

  const createOrganization = (organization: Partial<IOrganization>) => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/organizations`,
      method: 'POST',
      body: {
        handle: organization.handle,
        name: organization.name,
        description: organization.description,
      }
    }).then(resp => {
      const organization = toOrganization(resp.organization);
      ORGANISATIONS_FOR_USER_BY_ID.set(organization.id, organization);
      return resp;
    });
  }

  const getOrganizationById = (organizationId: string) => ORGANISATIONS_BY_ID.get(organizationId);

  const getOrganizationByHandle = (organizationHandle: string) => ORGANISATIONS_BY_HANDLE.get(organizationHandle);

  const clearCachedOrganizations = () => {
    ORGANISATIONS_BY_HANDLE.clear()
    ORGANISATIONS_BY_ID.clear();
    ORGANISATIONS_FOR_USER_BY_ID.clear();
  }

  const refreshOrganization = (user: IUser, organizationId: string) => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/organizations/${organizationId}`,
      method: 'GET',
    }).then(resp => {
      if (resp.success) {
        const org = resp.organization;
        if (org) {
          const organization = toOrganization(org);
          if (checkIsOrganizationMember(user, organization)) {
            ORGANISATIONS_FOR_USER_BY_ID.set(organizationId, organization);
          }
        }
      }
      return resp;
    });
  }

  const updateOrganization = (organization: Partial<IAnyOrganization>) => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/organizations/${organization.id}`,
      method: 'PUT',
      body: {
        name: organization.name,
        description: organization.description,
      }
    }).then(resp => {
      if (resp.success) {
        const org = getOrganizationById(organization.id!);
        if (org) {
          org.name = organization.name!;
          org.description = organization.description!;
        }
      }
      return resp;
    });
  }

  const getUserOrganizations = () => Array.from(ORGANISATIONS_FOR_USER_BY_ID.values());

  const getUserOrganizationById = (organizationId: string) => ORGANISATIONS_FOR_USER_BY_ID.get(organizationId);

  const refreshUserOrganizations = (user: IUser) => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/organizations`,
      method: 'GET',
    }).then(resp => {
      if (resp.success) {
        resp.organizations.forEach(org => {
          const organization = toOrganization(org);
          if (checkIsOrganizationMember(user, organization)) {
            ORGANISATIONS_FOR_USER_BY_ID.set(organization.id, organization);
          }
        });
      }
      return resp;
    });
  }

  const addMemberToOrganization = (organizationId: string, userId: string) => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/organizations/${organizationId}/members/${userId}`,
      method: 'POST',
   });
  }

  const removeMemberFromOrganization = (organizationId: string, userId: string) => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/organizations/${organizationId}/members/${userId}`,
      method: 'DELETE',
   });
  }

  const addRoleToOrganizationMember = (organizationId: string, userId: string, roleName: string) => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/organizations/${organizationId}/members/${userId}/roles/${roleName}`,
      method: 'POST',
   });
  }

  const removeRoleFromOrganizationMember = (organizationId: string, userId: string, roleName: string) => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/organizations/${organizationId}/members/${userId}/roles/${roleName}`,
      method: 'DELETE',
   });
  }

  // Teams -------------------------------------------------------------------

  const toTeam = (org: any, organizationId: string) => {
    const team = asTeam(org, organizationId);
    TEAMS_BY_ID.set(team.id, team);
    TEAMS_BY_HANDLE.set(team.handle, team);
    return team;
  }

  const createTeam = (team: Partial<ITeam>, organization: IAnyOrganization) => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/teams`,
      method: 'POST',
      body: {
        handle: team.handle,
        name: team.name,
        description: team.description,
        organizationId: organization.id,
      }
    }).then(resp => {
      const team = toTeam(resp.team, organization.id);
      TEAMS_BY_HANDLE.set(team.handle, team);
      TEAMS_BY_ID.set(team.id, team);
      return resp;
    });
  }

  const getTeamById = (teamId: string) => TEAMS_BY_ID.get(teamId);

  const getTeamByHandle = (teamHandle: string) => TEAMS_BY_HANDLE.get(teamHandle);

  const clearCachedTeams = () => {
    TEAMS_BY_HANDLE.clear();
    TEAMS_BY_ID.clear();
  }

  const refreshTeam = (teamId: string, organizationId: string) => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/teams/${teamId}`,
      method: 'GET',
    }).then(resp => {
      if (resp.success) {
        const t = resp.team;
        if (t) {
          const team = toTeam(t, organizationId);
          TEAMS_BY_HANDLE.set(team.handle, team);
          TEAMS_BY_ID.set(team.id, team);
        }
      }
      return resp;
    });
  }

  const updateTeam = (team: Partial<ITeam>) => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/teams/${team.id}`,
      method: 'PUT',
      body: {
        name: team.name,
        description: team.description,
      }
    }).then(resp => {
      if (resp.success) {
        const t = resp.team;
        if (t) {
          const tt = toTeam(t, team.organization!.id);
          TEAMS_BY_HANDLE.set(team.handle!, tt);
          TEAMS_BY_ID.set(team.id!, tt);
        }
      }
      return resp;
    });
  }

  const getTeamsByOrganizationId = (organizationId: string) => TEAMS_BY_ORGANIZATION_BY_ID.get(organizationId);

  const refreshTeams = (organizationId: string) => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/organizations/${organizationId}/teams`,
      method: 'GET',
    }).then(resp => {
      if (resp.success) {
        const teams = resp.teams.map(t => {
          const team = toTeam(t, organizationId);
          TEAMS_BY_HANDLE.set(team.handle, team);
          TEAMS_BY_ID.set(team.id, team);
          return team;
        });
        TEAMS_BY_ORGANIZATION_BY_ID.set(organizationId, teams);
      }
      return resp;
    });
  }

  const addMemberToTeam = (teamId: string, userId: string) => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/teams/${teamId}/members/${userId}`,
      method: 'POST',
   });
  }

  const removeMemberFromTeam = (teamId: string, userId: string) => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/teams/${teamId}/members/${userId}`,
      method: 'DELETE',
   });
  }

  const addRoleToTeamMember = (teamId: string, userId: string, roleName: string) => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/teams/${teamId}/members/${userId}/roles/${roleName}`,
      method: 'POST',
   });
  }

  const removeRoleFromTeamMember = (teamId: string, userId: string, roleName: string) => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/teams/${teamId}/members/${userId}/roles/${roleName}`,
      method: 'DELETE',
   });
  }

  // Schools -------------------------------------------------------------------

  const getSchools = () => {
    return Array.from(SCHOOLS_BY_ID.values());
  }

  const refreshSchools = () => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/organizations/schools`,
      method: 'GET',
    }).then(resp => {
      if (resp.success) {
        resp.orgs.forEach(s => {
          var dean = undefined;
          const students = new Array<IUser>();
          const members = new Array<IUser>();
          const courses = new Array<ICourse>();
          const school: ISchool = {
            id: s.uid,
            type: 'school',
            handle: s.handle_s,
            name: s.name_t,
            description: s.description_t,
            dean,
            members,
            students,
            courses,
            public: s.public_b,
            creationDate: new Date(s.creation_ts_dt),
            setMembers(members: IOrganizationMember[]) {
              this.members = members;
            }
          }
          SCHOOLS_BY_ID.set(school.id, school);
        });
      }
      return resp;
    });
  }

  // Spaces -------------------------------------------------------------------

  const toSpace = (spc: any) => {
    const space = asSpace(spc);
    return space;
  }
  
  const createSpace = (space: Partial<IAnySpace>, organization?: IAnyOrganization) => {
    const seedSpaceId = (space.variant === 'course')
      ? (space as ICourse).seedSpace?.id
      : undefined
    return requestRun({
      url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces`,
      method: 'POST',
      body: {
        name: space.name,
        description: space.description,
        variant: space.variant,
        public: space.public,
        spaceHandle: space.handle,
        organizationId: organization?.id,
        seedSpaceId,
      }
    }).then(resp => {
      const spc = resp.space;
      if (spc) {
        const space = toSpace(spc);
        if (organization) {
          let os = SPACES_BY_ID_BY_ORGANISATION_ID.get(organization.id);
          if (!os) {
            os = new Map<string, IAnySpace>();
            SPACES_BY_ID_BY_ORGANISATION_ID.set(organization.id, os);
          }
          os.set(space.id, space);
        } else {
          SPACES_FOR_USER_BY_HANDLE.set(space.handle, space);
          SPACES_FOR_USER_BY_ID.set(space.id, space)
        }  
      }
      return resp;
    });
  }

  const getOrganizationSpace = (organizationId: string, spaceId: string) => {
    const organizationSpaces = SPACES_BY_ID_BY_ORGANISATION_ID.get(organizationId);
    return organizationSpaces ? organizationSpaces.get(spaceId) : undefined;
  }

  const getOrganizationSpaceByHandle = (organizationHandle: string, spaceHandle: string) => {
    const organizationSpaces = SPACES_BY_HANDLE_BY_ORGANISATION_HANDLE.get(organizationHandle);
    return organizationSpaces ? organizationSpaces.get(spaceHandle) : undefined;
  }

  const refreshOrganizationSpace = (organizationId: string, spaceId: string) => {
    return requestRun({
      url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/${spaceId}/organizations/${organizationId}`,
      method: 'GET',
    }).then(resp => {
      if (resp.success) {
        const spc = resp.space;
        if (spc) {
          const space = toSpace(spc);
          let os = SPACES_BY_ID_BY_ORGANISATION_ID.get(organizationId);
          if (!os) {
            os = new Map<string, IAnySpace>();
            SPACES_BY_ID_BY_ORGANISATION_ID.set(organizationId, os);
          }
          os.set(space.id, space);
        }
      }
      return resp;
    });
  }

  const exportSpace = (spaceId: string) => {
    return requestRun({
      url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/${spaceId}/export`,
      method: 'GET',
   });
  }

  const updateOrganizationSpace = (organization: IAnyOrganization, space: Partial<IAnySpace>) => {
    return requestRun({
      url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/${space.id}/organizations/${organization.id}`,
      method: 'PUT',
      body: {
        name: space.name,
        description: space.description,
      }
    }).then(resp => {
      if (resp.success) {
        const spc = getOrganizationSpace(organization.id, space.id!);
        if (spc) {
          spc.name = space.name!;
          spc.description = space.description!;
        }
      }
      return resp;
    });
  }

  const getOrganizationSpaces = (organizationId: string) => {
    const spaces = SPACES_BY_ID_BY_ORGANISATION_ID.get(organizationId);
    if (spaces) {
      return Array.from(spaces.values());
    }
    return [];
  }

  const refreshOrganizationSpaces = (organizationId: string) => {
    return requestRun({
      url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/organizations/${organizationId}`,
      method: 'GET',
    }).then(resp => {
      if (resp.success) {
        resp.spaces.forEach(org => {
          const space = toSpace(org);
          let organizationSpaces = SPACES_BY_ID_BY_ORGANISATION_ID.get(organizationId);
          if (!organizationSpaces) {
            organizationSpaces = new Map<string, IAnySpace>();
            SPACES_BY_ID_BY_ORGANISATION_ID.set(organizationId, organizationSpaces);
          }
          organizationSpaces.set(space.id, space);
        });
      }
      return resp;
    });
  }

  const getUserSpaces = () => Array.from(SPACES_FOR_USER_BY_ID.values());

  const refreshUserSpaces = () => {
    return requestRun({
      url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/users/me`,
      method: 'GET',
    }).then(resp => {
      if (resp.success) {
        resp.spaces.forEach(spc => {
          const space = toSpace(spc);
          SPACES_FOR_USER_BY_HANDLE.set(space.handle, space);
          SPACES_FOR_USER_BY_ID.set(space.id, space);
        });
      }
      return resp;
    });
  }

  const getUserSpace = (userId: string) => SPACES_FOR_USER_BY_ID.get(userId);
  const getUserSpaceByHandle = (userHandle: string) => SPACES_FOR_USER_BY_HANDLE.get(userHandle);

  const refreshUserSpace = (userId: string, spaceId: string) => {  
    return requestRun({
      url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/${spaceId}/users/${userId}`,
      method: 'GET',
    }).then(resp => {
      if (resp.success) {
        const spc = resp.space;
        if (spc) {
          const space = toSpace(spc);
          SPACES_FOR_USER_BY_HANDLE.set(space.handle, space);
          SPACES_FOR_USER_BY_ID.set(spaceId, space);
        }
      }
      return resp;
    });
  }

  const updateSpace = (space: Partial<IAnySpace>) => {
    return requestRun({
      url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/${space.id}/users/${user?.id}`,
      method: 'PUT',
      body: {
        name: space.name,
        description: space.description,
      }
    }).then(resp => {
      if (resp.success) {
        const spc = getUserSpace(space.id!);
        if (spc) {
          spc.name = space.name!;
          spc.description = space.description!;
        }
      }
      return resp;
    });
  }

  const addMemberToOrganizationSpace = (organizationId: string, spaceId: string, accountId: string) => {
    return requestRun({
      url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/${spaceId}/organizations/${organizationId}/members/${accountId}`,
      method: 'POST',
   });
  }

  const removeMemberFromOrganizationSpace = (organizationId: string, spaceId: string, accountId: string) => {
    return requestRun({
      url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/${spaceId}/organizations/${organizationId}/members/${accountId}`,
      method: 'DELETE',
    }).then(resp => {
//      if (resp.success) {
//        OR.delete(accountHandle);
//      }
      return resp;
    });
  }

  const makeSpacePublic = (spaceId: string) => {
    return requestRun({
      url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/${spaceId}/public`,
      method: 'PUT',
    })
  }

  const makeSpacePrivate = (spaceId: string) => {
    return requestRun({
      url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/${spaceId}/private`,
      method: 'PUT',
    })
  }

  // Courses -------------------------------------------------------------------

  const toStudentItem = (raw_student_item: any, itemId: string) => {
    const studentItem: IStudentItem = {
      id: raw_student_item.uid,
      type: 'student_item',
      student: user,
      points: raw_student_item.points_i ?? 0,
      completed: raw_student_item.completed_b,
      itemId,
      itemType: raw_student_item.item_type_s,
      pass: raw_student_item.pass_b,
      codeStudent: raw_student_item.code_student_t,
      invalid: raw_student_item.invalid_b,
      invalidReason: raw_student_item.invalid_reason_t,
      nbgrades: raw_student_item.nbgrades,
      nbgradesTotalPoints: raw_student_item.nbgrades_total_points_f,
      nbgradesTotalScore: raw_student_item.nbgrades_total_score_f,
    };
    return studentItem;
  }

  const toStudent = (raw_student: any, courseId: string) => {
    let student: IStudent | undefined = undefined;
    if (raw_student) {
      const user = toUser(raw_student);
      if (user) {
        let studentItems: Map<string, IStudentItem> | undefined;
        if (raw_student.student_items) {
          studentItems = new Map<string, IStudentItem>();
          raw_student.student_items.forEach(raw_student_item => {
            const itemId = raw_student_item.item_uid;
            const studentItem = toStudentItem(raw_student_item, itemId);
            studentItems?.set(itemId, studentItem);
          });
        }
        student = {
          ...user,
          studentItems,
        }
        STUDENTS_BY_ID.set(courseId + '-' + student.id, student);
      }
    }
    return student;
  }

  const toCourse = (raw_course: any, cache: Map<string, ICourse>) => {
    const owner = newUserMock();
    USERS_BY_ID.set(owner.id, owner);
    let instructor: IUser | undefined = undefined;
    if (raw_course.members) {
      let raw_instructor = raw_course.members;
      if (Array.isArray(raw_instructor)) {
        raw_instructor = raw_instructor[0];
      }
      instructor = {
        id: raw_instructor.uid,
        handle: raw_instructor.handle_s,
        email: raw_instructor.email_s,
        firstName: raw_instructor.first_name_t,
        lastName: raw_instructor.last_name_t,
        initials: namesAsInitials(raw_instructor.to_first_name_t, raw_instructor.to_last_name_t),
        displayName: asDisplayName(raw_instructor.first_name_t, raw_instructor.last_name_t),
        roles: [],
        iamProviders: [],
        setRoles: (roles: string[]) => {},
        unsubscribedFromOutbounds: false,
        onboarding: BOOTSTRAP_USER_ONBOARDING,
        linkedContactId: undefined,
        events: [],
        settings: {}
      }
      USERS_BY_ID.set(instructor.id, instructor);
    }
    let students: Map<string, IUser> | undefined = undefined;
    if (raw_course.students) {
      students = new Map<string, IUser>();
      raw_course.students.forEach(raw_stud => {
        const student = toStudent(raw_stud, raw_course.uid);
        if (student) {
          students!.set(student.id, student);
        }
      })
    }
    let itemIds = new Array<string>();
    let raw_item_uids: string = raw_course.item_uids_s;
    if (raw_item_uids && raw_item_uids !== '()') {
      raw_item_uids = raw_item_uids.replace('(', '').replace(')', '');
      itemIds = raw_item_uids.split(' ');
    }
    let items = new Array<ISpaceItem>();
    if (raw_course.items) {
      raw_course.items.forEach(item => {
        const i = toItem(item);
        items.push(i);
      })
    }
    const course: ICourse = {
      id: raw_course.uid,
      handle: raw_course.handle_s,
      type: 'space',
      variant: "course",
      name: raw_course.name_t,
      description: raw_course.description_t,
      creationDate: new Date(raw_course.creation_ts_dt),
      public: raw_course.public_b ?? false,
      items,
      itemIds,
      instructor,
      students,
      owner,
    }
    cache.set(course.id, course);
    return course;
  }
  
  const getCourse = (courseId: string) => COURSES_BY_ID.get(courseId);

  const updateCourse = (courseId, name, description) => {
    return requestRun({
      url: `${configuration.spacerRunUrl}/api/spacer/v1/courses/${courseId}`,
      method: 'PUT',
      body: {
        name,
        description,
      }
    });

  }

  const refreshCourse = (courseId: string) => {
    return requestRun({
      url: `${configuration.spacerRunUrl}/api/spacer/v1/courses/${courseId}`,
      method: 'GET',
    }).then(resp => {
      if (resp.success) {
        const raw_course = resp.course;
        if (raw_course) {
          toCourse(raw_course, COURSES_BY_ID);
        }
      }
      return resp;
    });
  }

  const enrollStudentToCourse = (courseId: string, studentId: string) => {
    return requestRun({
      url: `${configuration.spacerRunUrl}/api/spacer/v1/courses/${courseId}/enrollments/students/${studentId}`,
      method: 'POST',
   });
  }

  const removeStudentFromCourse = (courseId: string, studentId: string) => {
    return requestRun({
      url: `${configuration.spacerRunUrl}/api/spacer/v1/courses/${courseId}/enrollments/students/${studentId}`,
      method: 'DELETE',
    }).then(resp => {
      if (resp.success) {
        STUDENTS_BY_ID.delete(courseId);
      }
      return resp;
    });
  }

  const getStudent = (courseId, studentId) => STUDENTS_BY_ID.get(courseId + '-' + studentId);

  const refreshStudent = (courseId, studentHandle) => {
    return requestRun({
      url: `${configuration.spacerRunUrl}/api/spacer/v1/courses/${courseId}/enrollments/students/${studentHandle}`,
      method: 'GET',
    }).then(resp => {
      if (resp.success) {
        toStudent(resp.student, courseId);
      }
      return resp;
    });
  }

  const getPublicCourses = () => Array.from(PUBLIC_COURSES_BY_ID.values());

  const refreshPublicCourses = () => {
    return requestRun({
      url: `${configuration.libraryRunUrl}/api/library/v1/courses/public`,
      method: 'GET',
    }).then(resp => {
      if (resp.success) {
        resp.courses.forEach(course => {
          toCourse(course, PUBLIC_COURSES_BY_ID);
        });
      }
      return resp;
    })
  };

  const getInstructorCourses = () => Array.from(COURSES_INSTRUCTORS_BY_ID.values());

  const refreshInstructorCourses = () => {
    return requestRun({
      url: `${configuration.spacerRunUrl}/api/spacer/v1/instructors/${user?.id}/courses`,
      method: 'GET',
    }).then(resp => {
      if (resp.success) {
        resp.courses.forEach(course => {
          toCourse(course, COURSES_INSTRUCTORS_BY_ID);
        });
      }
      return resp;
    });
  }

  const getCoursesEnrollments = () => Array.from(COURSES_ENROLLMENTS_BY_ID.values());

  const refreshCoursesEnrollments = () => {
    return requestRun({
      url: `${configuration.spacerRunUrl}/api/spacer/v1/courses/enrollments/me`,
      method: 'GET',
    }).then(resp => {
      if (resp.success) {
        resp.enrollments.forEach(enrollment => {
          toCourse(enrollment, COURSES_ENROLLMENTS_BY_ID);
        });
      }
      return resp;
    });
  }

  const confirmCourseItemCompletion = (courseId: any, itemType: IItemType, itemId: string, completed: boolean) => {
    return requestRun({
      url: `${configuration.spacerRunUrl}/api/spacer/v1/assignments/${courseId}/types/${itemType}/items/${itemId}/complete`,
      method: 'PUT',
      body: {
        completed,
      }
   });
  }

  const setCourseItems = (courseId, itemIds) => {
    return requestRun({
      url: `${configuration.spacerRunUrl}/api/spacer/v1/courses/${courseId}/items`,
      method: 'PUT',
      body: {
        itemIds,
      }
    });

  }

  // Surveys ---------------------------------------------------------------------

  const getUserSurveys = (userId: string) => {
    return requestRun({
      url: `${configuration.growthRunUrl}/api/growth/v1/surveys/users/${userId}`,
      method: 'GET',
    }).then(resp => {
      if (resp.success && resp.surveys) {
        const surveyArray = resp.surveys.map(survey => asSurvey(survey));
        const surveysMap = new Map<string, ISurvey>();
        surveyArray.forEach(survey => surveysMap.set(survey.name, survey));
        resp.surveys = surveyArray;
        resp.surveysMap = surveysMap;
      }
      return resp;
    });
  }



  // Inbounds ---------------------------------------------------------------------

  const toInbound = (u: any) => {
    if (u) {
      const inbound: IInbound = asInbound(u);
      INBOUNDS_BY_ID.set(inbound.id, inbound);
      INBOUNDS_BY_HANDLE.set(inbound.handle, inbound);
      return inbound;
    }
  }

  const getInbound = (id: string) => INBOUNDS_BY_ID.get(id);

  const getInboundByHandle = (handle: string) => INBOUNDS_BY_HANDLE.get(handle);

  const refreshInbound = (userId: string) => {
    return requestRun({
      url: `${configuration.inboundsRunUrl}/api/inbounds/v1/inbounds/${userId}`,
      method: 'GET',
    }).then(resp => {
      if (resp.success) {
        toInbound(resp.user);
      }
      return resp;
    });
  }

  const getInbounds = () => {
    return requestRun({
      url: `${configuration.inboundsRunUrl}/api/inbounds/v1/inbounds`,
      method: 'GET',
    }).then(resp => {
      if (resp.success) {
        const inbounds = resp.inbounds.map(user => toInbound(user));
        resp.inbounds = inbounds;
      }
      return resp;
    });
  }

  // Outbounds ---------------------------------------------------------------------

  const toOutbound = (u: any) => {
    if (u) {
      const user: IOutbound = asOutbound(u);
      OUTBOUNDS_BY_ID.set(user.id, user);
      return user;
    }
  }

  const getOutbound = (id: string) => OUTBOUNDS_BY_ID.get(id);

  const refreshOutbound = (outboundId: string) => {
    return requestRun({
      url: `${configuration.growthRunUrl}/api/growth/v1/outbounds/${outboundId}`,
      method: 'GET',
    }).then(resp => {
      if (resp.success) {
        const outbound = toOutbound(resp.outbound);
        resp.outbound = outbound;
      }
      return resp;
    });
  }

  const getOutbounds = () => {
    return requestRun({
      url: `${configuration.growthRunUrl}/api/growth/v1/outbounds`,
      method: 'GET',
    }).then(resp => {
      if (resp.success) {
        const outbounds = resp.outbounds.map(outbound => toOutbound(outbound));
        resp.outbounds = outbounds;
      }
      return resp;
    });
  }

  const draftBulkEmailsOutbounds = (params: any) => {
    return requestRun({
      url: `${configuration.growthRunUrl}/api/growth/v1/outbounds/emails/bulk/draft`,
      method: 'POST',
      body: params,
   });
  }

  const tryBulkEmailsOutbounds = (outboundId: string) => {
    return requestRun({
      url: `${configuration.growthRunUrl}/api/growth/v1/outbounds/${outboundId}/try`,
      method: 'POST',
      body: {},
   });
  }

  const launchBulkEmailsOutbounds = (outboundId: string) => {
    return requestRun({
      url: `${configuration.growthRunUrl}/api/growth/v1/outbounds/${outboundId}/launch`,
      method: 'POST',
      body: {},
   });
  }

  const sendOutboundEmailToUser = (userId: string, recipient: string, subject: string, content: string) => {
    return requestRun({
      url: `${configuration.growthRunUrl}/api/growth/v1/outbounds/email`,
      method: 'POST',
      body: {
        userId,
        recipient,
        subject,
        content,
      },
   });
  }

  const enableUserMFA = () => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/mfa`,
      method: 'PUT',
    });
  }
  
  const disableUserMFA = () => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/mfa`,
      method: 'DELETE',
    });
  }

  const validateUserMFACode = (userUid, code: string) => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/mfa`,
      method: 'POST',
      body: {
        userUid,
        code,
      },
    });
  }

  const subscribeUserToOutbounds = (userId: string) => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/outbounds/users/${userId}`,
      method: 'PUT',
    });
  }

  const unsubscribeUserFromOutbounds = (userId: string) => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/outbounds/users/${userId}`,
      method: 'DELETE',
    });
  }

  const unsubscribeContactFromOutbounds = (contactId: string) => {
    return requestRun({
      url: `${configuration.growthRunUrl}/api/growth/v1/contacts/unsubscribe/${contactId}`,
      method: 'GET',
    });
  }

  const unsubscribeInviteeFromOutbounds = (token: string) => {
    return requestRun({
      url: `${configuration.growthRunUrl}/api/growth/v1/outbounds/unsubscribe/${token}`,
      method: 'GET',
    });
  }

  const deleteOutbound = (outboundId: string) => {
    return requestRun({
      url: `${configuration.growthRunUrl}/api/growth/v1/outbounds/${outboundId}`,
      method: 'DELETE',
    });
  }

  // Items --------------------------------------------------------------

  const toItem: any = (item: any) => {
    if (!item.type_s) {
      console.error("No type_s found on item", item);
      return {};
    }
    switch(item.type_s) {
      case 'assignment':
        return toAssignment(item);
      case 'cell':
        return toCell(item)
      case 'dataset':
        return toDataset(item);
      case 'document':
        return toDocument(item)
      case 'exercise':
        return toExercise(item);
      case 'lesson':
        return toLesson(item);
      case 'notebook':
        return toNotebook(item)
      case 'page':
        return toPage(item)
      default:
        return {};
    }
  }

  const clearCachedPublicItems = () => PUBLIC_ITEMS_BY_ID.clear();

  const getPublicItems = () => Array.from(PUBLIC_ITEMS_BY_ID.values());

  const refreshPublicItems = () => {
    return requestRun({
      url: `${configuration.libraryRunUrl}/api/library/v1/items/public`,
      method: 'GET',
    }).then(resp => {
      if (resp.success) {
        resp.items.forEach(i => {
          const item = toItem(i);
          PUBLIC_ITEMS_BY_ID.set(item.id, item);
        });
      }
      return resp;
    })
  };

  const getSpaceItems = () => Array.from(SPACE_ITEMS_CACHE.values());

  const refreshSpaceItems = (spaceId: string) => {
    return requestRun({
      url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/${spaceId}/items`,
      method: 'GET',
    }).then(resp => {
      if (resp.success) {
        if (resp.items) {
          asArray(resp.items).forEach(itm => {
            const item = toItem(itm);
            SPACE_ITEMS_CACHE.set(item.id, item);
          });  
        }
      }
      return resp;
    })
  };

  const makeItemPublic = (id: string) => {
    return requestRun({
      url: `${configuration.libraryRunUrl}/api/library/v1/items/${id}/public`,
      method: 'PUT',
    })
  }

  const makeItemPrivate = (id: string) => {
    return requestRun({
      url: `${configuration.libraryRunUrl}/api/library/v1/items/${id}/private`,
      method: 'PUT',
    })
  }

  const deleteItem = (itemId: string) => {
    return requestRun({
      url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/items/${itemId}`,
      method: 'DELETE',
    }).then(resp => {
      if (resp.success) {
        SPACE_ASSIGNMENTS_BY_ID.delete(itemId);
        SPACE_CELLS_BY_ID.delete(itemId);
        SPACE_DATASETS_BY_ID.delete(itemId);
        SPACE_DOCUMENTS_BY_ID.delete(itemId);
        SPACE_ENVIRONMENTS_BY_ID.delete(itemId);
        SPACE_EXERCISES_BY_ID.delete(itemId);
        SPACE_ITEMS_CACHE.delete(itemId);
        SPACE_LESSONS_BY_ID.delete(itemId);
        SPACE_NOTEBOOKS_BY_ID.delete(itemId);
      }
      return resp;
    });
  };

  // Search ------------------------------------------------------------------

  const searchPublicItems = (opts: ISearchOpts = DEFAULT_SEARCH_OPTS) => {
    const { q, types, max } = opts;
    const queryArgs: Record<string, string> = {
      q,
      types: `${types.join(' ')}`,
      max: max.toFixed(0).toString(),
      public: 'true',
    };
    return requestRun({
      url: `${configuration.libraryRunUrl}/api/library/v1/search${URLExt.objectToQueryString(queryArgs)}`,
      method: 'GET',
    }).then(resp => {
      if (resp.success) {
        const items = new Array<any>();
        resp.items.forEach(i => {
          const item = toItem(i);
          items.push(item);
        });
        resp.items = items;
      }
      return resp;
    });
  }

  // Datasets ------------------------------------------------------------------

  const toDataset = (raw_dataset) => {
    const owner = newUserMock();
    USERS_BY_ID.set(owner.id, owner);
    const dataset: IDataset = {
      id: raw_dataset.uid,
      type: 'dataset',
      name: raw_dataset.name_t,
      description: raw_dataset.description_t,
      fileName: raw_dataset.file_name_s,
      datasetExtension: raw_dataset.dataset_extension_s,
      contentLength: raw_dataset.content_length_i,
      contentType: raw_dataset.content_type_s,
      mimeType: raw_dataset.mimetype_s,
      path: raw_dataset.s3_path_s,
      cdnUrl: raw_dataset.cdn_url_s,
      creationDate: new Date(raw_dataset.creation_ts_dt),
      public: raw_dataset.public_b ?? false,
      lastPublicationDate: raw_dataset.creation_ts_dt ? new Date(raw_dataset.creation_ts_dt) : undefined,
      owner,
      space: {
        handle: raw_dataset.handle_s,
      },
      organization: {
        handle: raw_dataset.handle_s,
      }
    }
    SPACE_DATASETS_BY_ID.set(dataset.id, dataset);
    return dataset;
  }

  const getDataset = (id) => SPACE_DATASETS_BY_ID.get(id);

  const refreshDataset = (id: string) => {
    return requestRun({
      url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/items/${id}`,
      method: 'GET',
    }).then(resp => {
      if (resp.success) {
        const d = resp.item;
        if (d) {
          toDataset(d);
        }
      }
      return resp;
    });
  }

  const getSpaceDatasets = () => Array.from(SPACE_DATASETS_BY_ID.values());

  const refreshSpaceDatasets = (space: IAnySpace, organization?: IAnyOrganization) => {
    const url =
      `${configuration.spacerRunUrl}/api/spacer/v1/spaces/${space.id}/items/types/dataset`
    return requestRun({
      url,
      method: 'GET',
    }).then(resp => {
      if (resp.success) {
        resp.items.forEach(d => {
          toDataset(d);
        });
      }
      return resp;
    });
  }

  const updateDataset = (id, name, description) => {
    return requestRun({
      url: `${configuration.spacerRunUrl}/api/spacer/v1/datasets/${id}`,
      method: 'PUT',
      body: {
        name,
        description,
      }
    });
  }

  // Cells ------------------------------------------------------------------

  const toCell = (cl) => {
    const owner = newUserMock();
    USERS_BY_ID.set(owner.id, owner);
    const cell: ICell = {
      id: cl.uid,
      type: 'cell',
      name: cl.name_t,
      description: cl.description_t,
      source: cl.source_t,
      creationDate: new Date(cl.creation_ts_dt),
      public: cl.public_b ?? false,
      lastPublicationDate: cl.last_publication_ts_dt ? new Date(cl.last_publication_ts_dt) : undefined,
      outputshotUrl: cl.outputshot_url_s || '',
      outputshotData: OUTPUTSHOT_PLACEHOLDER_DEFAULT_SVG,
      owner,
      space: {
        handle: cl.handle_s,
      },
      organization: {
        handle: cl.handle_s,
      },
    }
    SPACE_CELLS_BY_ID.set(cell.id, cell);
    return cell;
  }

  const getCell = (id: string) => SPACE_CELLS_BY_ID.get(id);

  const refreshCell = (id: string) => {
    return requestRun({
      url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/items/${id}`,
      method: 'GET',
    }).then(resp => {
      if (resp.success) {
        const cell = resp.item;
        if (cell) {
          toCell(cell);
        }
      }
      return resp;
    });
  }

  const getSpaceCells = () => Array.from(SPACE_CELLS_BY_ID.values());

  const refreshSpaceCells = (space: IAnySpace, organization?: IAnyOrganization) => {
    const url =
      `${configuration.spacerRunUrl}/api/spacer/v1/spaces/${space.id}/items/types/cell`
    return requestRun({
      url,
      method: 'GET',
    }).then(resp => {
      if (resp.success) {
        resp.items.forEach(cell => {
          toCell(cell);
        });
      }
      return resp;
    });
  }

  const updateCell = (cell: {
      id: string;
      name: string;
      description: string;
      source: string;
      outputshotUrl?: string;
      outputshotData?: string;
      spaceId: string;
    }
   ) => {
    return requestRun({
      url: `${configuration.spacerRunUrl}/api/spacer/v1/cells/${cell.id}`,
      method: 'PUT',
      body: cell
    });
  };

  const cloneCell = (cellId: string) => {
    return requestRun({
      url: `${configuration.spacerRunUrl}/api/spacer/v1/cells/${cellId}/clone`,
      method: 'POST',
    }).then(resp => {
      if (resp.success) {
        toCell(resp.cell);
      }
      return resp;
    });
  }

  // Notebooks ------------------------------------------------------------------

  const toNotebook = (raw_notebook) => {
    const owner = newUserMock();
    USERS_BY_ID.set(owner.id, owner);
    const notebook: INotebook = {
      id: raw_notebook.uid,
      type: 'notebook',
      name: raw_notebook.name_t,
      description: raw_notebook.description_t,
      nbformat: raw_notebook.model_s ? JSON.parse(raw_notebook.model_s) : undefined,
      public: raw_notebook.public_b ?? false,
      creationDate: new Date(raw_notebook.creation_ts_dt),
      lastUpdateDate: raw_notebook.last_update_ts_dt ? new Date(raw_notebook.last_update_ts_dt) : undefined,
      lastPublicationDate: raw_notebook.creation_ts_dt ? new Date(raw_notebook.creation_ts_dt) : undefined,
      datasets: [],
      owner,
      space: {
        handle: raw_notebook.handle_s,
      },
      organization: {
        handle: raw_notebook.handle_s,
      }
    }
    SPACE_NOTEBOOKS_BY_ID.set(notebook.id, notebook);
    return notebook;
  }

  const getNotebook = (notebookId) => SPACE_NOTEBOOKS_BY_ID.get(notebookId);

  const refreshNotebook = (notebookId: string) => {
    return requestRun({
      url: `${configuration.spacerRunUrl}/api/spacer/v1/notebooks/${notebookId}`,
      method: 'GET',
    }).then(resp => {
      if (resp.success) {
        const notebook = resp.notebook;
        if (notebook) {
          toNotebook(notebook);
        }
      }
      return resp;
    });
  }

  const getSpaceNotebooks = () => Array.from(SPACE_NOTEBOOKS_BY_ID.values());

  const getSpaceNotebook = (id) => SPACE_NOTEBOOKS_BY_ID.get(id);

  const refreshSpaceNotebooks = (space: IAnySpace, organization?: IAnyOrganization) => {
    const url =
      `${configuration.spacerRunUrl}/api/spacer/v1/spaces/${space.id}/items/types/notebook`
    return requestRun({
      url,
      method: 'GET',
    }).then(resp => {
      if (resp.success) {
        resp.items.forEach(n => {
          toNotebook(n);
        });
      }
      return resp;
    });
  }
  const cloneNotebook = (notebookId: string) => {
    return requestRun({
      url: `${configuration.spacerRunUrl}/api/spacer/v1/notebooks/${notebookId}/clone`,
      method: 'POST',
    }).then(resp => {
      if (resp.success) {
        toNotebook(resp.notebook);
      }
      return resp;
    });
  }

  const updateNotebook = (id, name, description) => {
    return requestRun({
      url: `${configuration.spacerRunUrl}/api/spacer/v1/notebooks/${id}`,
      method: 'PUT',
      body: {
        name,
        description,
      }
    });
  }

  const updateNotebookModel = (notebookId, nbformat) => {
    return requestRun({
      url: `${configuration.spacerRunUrl}/api/spacer/v1/notebooks/${notebookId}/model`,
      method: 'PUT',
      body: {
        nbformat,
      }
    });
  }

  // Documents ------------------------------------------------------------------

  const toDocument = (doc) => {
    const owner = newUserMock();
    USERS_BY_ID.set(owner.id, owner);
    const document: IDocument = {
      id: doc.uid,
      type: 'document',
      name: doc.name_t,
      description: doc.description_t,
      model: doc.model_s ? JSON.parse(doc.model_s) : undefined,
      public: doc.public_b ?? false,
      creationDate: new Date(doc.creation_ts_dt),
      lastUpdateDate: doc.last_update_ts_dt ? new Date(doc.last_update_ts_dt) : undefined,
      lastPublicationDate: doc.creation_ts_dt ? new Date(doc.creation_ts_dt) : undefined,
      owner,
      space: {
        handle: doc.handle_s,
      },
      organization: {
        handle: doc.handle_s,
      }
    }
    SPACE_DOCUMENTS_BY_ID.set(document.id, document);
    return document;
  }

  const getDocument = (id) => SPACE_DOCUMENTS_BY_ID.get(id);

  const refreshDocument = (id: string) => {
    return requestRun({
      url: `${configuration.spacerRunUrl}/api/spacer/v1/lexicals/${id}`,
      method: 'GET',
    }).then(resp => {
      if (resp.success) {
        const document = resp.document;
        if (document) {
          toDocument(document);
        }
      }
      return resp;
    });
  }

  const getSpaceDocuments = () => Array.from(SPACE_DOCUMENTS_BY_ID.values());

  const getSpaceDocument = (id) => SPACE_DOCUMENTS_BY_ID.get(id);

  const refreshSpaceDocuments = (space: IAnySpace, organization?: IAnyOrganization) => {
    const url =
      `${configuration.spacerRunUrl}/api/spacer/v1/spaces/${space.id}/items/types/document`
    return requestRun({
      url,
      method: 'GET',
    }).then(resp => {
      if (resp.success) {
        resp.items.forEach(n => {
          toDocument(n);
        });
      }
      return resp;
    });
  }

  const cloneDocument = (documentId: string) => {
    return requestRun({
      url: `${configuration.spacerRunUrl}/api/spacer/v1/lexicals/${documentId}/clone`,
      method: 'POST',
    }).then(resp => {
      if (resp.success) {
        toDocument(resp.document);
      }
      return resp;
    });
  }

  const updateDocument = (id, name, description) => {
    return requestRun({
      url: `${configuration.spacerRunUrl}/api/spacer/v1/lexicals/${id}`,
      method: 'PUT',
      body: {
        name,
        description,
      }
    });
  }

  const updateDocumentModel = (id, model) => {
    return requestRun({
      url: `${configuration.spacerRunUrl}/api/spacer/v1/lexicals/${id}/model`,
      method: 'PUT',
      body: {
        model,
      }
    });
  }

  // Environments ------------------------------------------------------------------

  const toEnvironment = (env: any, cache: Map<string, IEnvironment>) => {
    const owner = newUserMock();
    USERS_BY_ID.set(owner.id, owner);
    const environment: IEnvironment = {
      id: env.uid,
      type: 'environment',
      name: env.name_t,
      description: env.description_t,
      creationDate: new Date(env.creation_ts_dt),
      public: env.public_b ?? false,
      lastPublicationDate: env.creation_ts_dt ? new Date(env.creation_ts_dt) : undefined,
      owner,
      space: {
        handle: env.handle_s,
      },
      organization: {
        handle: env.handle_s,
      }
    }
    cache.set(environment.id, environment);
    return environment;
  }

  const getEnvironment = (id: string) => SPACE_ENVIRONMENTS_BY_ID.get(id);

  const refreshEnvironment = (id: string) => {
    return requestRun({
      url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/items/${id}`,
      method: 'GET',
    }).then(resp => {
      if (resp.success) {
        const env = resp.item;
        if (env) {
          toEnvironment(env, SPACE_ENVIRONMENTS_BY_ID);
        }
      }
      return resp;
    });
  }

  const getSpaceEnvironments = () => Array.from(SPACE_ENVIRONMENTS_BY_ID.values());

  const refreshSpaceEnvironments = (space: IAnySpace, organization?: IAnyOrganization) => {
    const url =
      `${configuration.spacerRunUrl}/api/spacer/v1/spaces/${space.id}/items/types/environment`
    return requestRun({
      url,
      method: 'GET',
    }).then(resp => {
      if (resp.success) {
        resp.items.forEach(d => {
          toEnvironment(d, SPACE_ENVIRONMENTS_BY_ID);
        });
      }
      return resp;
    });
  }

  // Lessons ------------------------------------------------------------------

  const toLesson = (raw_lesson) => {
    const owner = newUserMock();
    USERS_BY_ID.set(owner.id, owner);
    const lesson: ILesson = {
      id: raw_lesson.uid,
      type: 'lesson',
      name: raw_lesson.name_t,
      description: raw_lesson.description_t,
      nbformat: raw_lesson.model_s ? JSON.parse(raw_lesson.model_s) : undefined,
      public: raw_lesson.public_b ?? false,
      creationDate: new Date(raw_lesson.creation_ts_dt),
      lastUpdateDate: raw_lesson.last_update_ts_dt ? new Date(raw_lesson.last_update_ts_dt) : undefined,
      lastPublicationDate: raw_lesson.creation_ts_dt ? new Date(raw_lesson.creation_ts_dt) : undefined,
      owner,
      space: {
        handle: raw_lesson.handle_s,
      },
      organization: {
        handle: raw_lesson.handle_s,
      },      
      datasets: [],
    }
    SPACE_LESSONS_BY_ID.set(lesson.id, lesson);
    return lesson;
  }

  const getLesson = (id) => SPACE_LESSONS_BY_ID.get(id);

  const refreshLesson = (id: string) => {
    return requestRun({
      url: `${configuration.spacerRunUrl}/api/spacer/v1/lessons/${id}`,
      method: 'GET',
    }).then(resp => {
      if (resp.success) {
        const lesson = resp.lesson;
        if (lesson) {
          toLesson(lesson);
        }
      }
      return resp;
    });
  }

  const getSpaceLessons = () => Array.from(SPACE_LESSONS_BY_ID.values());

  const getSpaceLesson = (id) => SPACE_LESSONS_BY_ID.get(id);

  const refreshSpaceLessons = (space: IAnySpace, organization?: IAnyOrganization) => {
    const url =
      `${configuration.spacerRunUrl}/api/spacer/v1/spaces/${space.id}/items/types/lesson`
    return requestRun({
      url,
      method: 'GET',
    }).then(resp => {
      if (resp.success) {
        resp.items.forEach(n => {
          toLesson(n);
        });
      }
      return resp;
    });
  }

  const cloneLesson = (lessonId: string) => {
    return requestRun({
      url: `${configuration.spacerRunUrl}/api/spacer/v1/notebooks/${lessonId}/clone`,
      method: 'POST',
    }).then(resp => {
      if (resp.success) {
        toLesson(resp.notebook);
      }
      return resp;
    });
  }

  // Exercises ------------------------------------------------------------------

  const toExercise = (ex: any) => {
    const owner = newUserMock();
    USERS_BY_ID.set(owner.id, owner);
    const exercise: IExercise = {
      id: ex.uid,
      type: 'exercise',
      name: ex.name_t,
      description: ex.description_t,
      help: ex.help_t,
      codePre: ex.code_pre_t,
      codeQuestion: ex.code_question_t,
      codeSolution: ex.code_solution_t,
      codeTest: ex.code_test_t,
      public: ex.public_b ?? false,
      creationDate: new Date(ex.creation_ts_dt),
      lastUpdateDate: ex.last_update_ts_dt ? new Date(ex.last_update_ts_dt) : undefined,
      lastPublicationDate: ex.creation_ts_dt ? new Date(ex.creation_ts_dt) : undefined,
      owner,
      space: {
        handle: ex.handle_s,
      },
      organization: {
        handle: ex.handle_s,
      },      
      datasets: [],
    }
    SPACE_EXERCISES_BY_ID.set(exercise.id, exercise);
    return exercise;
  }

  const getExercise = (id: string) => SPACE_EXERCISES_BY_ID.get(id);

  const refreshExercise = (id: string) => {
    return requestRun({
      url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/items/${id}`,
      method: 'GET',
    }).then(resp => {
      if (resp.success) {
        const exercise = resp.item;
        if (exercise) {
          toExercise(exercise);
        }
      }
      return resp;
    });
  }

  const getSpaceExercises = () => {
    return Array.from(SPACE_EXERCISES_BY_ID.values());
  }

  const refreshSpaceExercises = (space: IAnySpace, organization?: IAnyOrganization) => {
    const url =
      `${configuration.spacerRunUrl}/api/spacer/v1/spaces/${space.id}/items/types/exercise`
    return requestRun({
      url,
      method: 'GET',
    }).then(resp => {
      if (resp.success) {
        resp.items.forEach(d => {
          toExercise(d);
        });
      }
      return resp;
    });
  }

  const cloneExercise = (exerciseId: string) => {
    return requestRun({
      url: `${configuration.spacerRunUrl}/api/spacer/v1/exercises/${exerciseId}/clone`,
      method: 'POST',
    }).then(resp => {
      if (resp.success) {
        toExercise(resp.exercise);
      }
      return resp;
    });
  }

  const updateExercise = ({
    id,
    name,
    description,
    help,
    codePre,
    codeSolution,
    codeQuestion,
    codeTest,
  }) => {
    return requestRun({
      url: `${configuration.spacerRunUrl}/api/spacer/v1/exercises/${id}`,
      method: 'PUT',
      body: {
        name,
        description,
        help,
        codePre,
        codeSolution,
        codeQuestion,
        codeTest,
      }
   });
  }

  const updateExercisePoints = (id, codeStudent, points) => {
    return requestRun({
      url: `${configuration.spacerRunUrl}/api/spacer/v1/exercises/${id}/points`,
      method: 'PUT',
      body: {
        codeStudent,
        points,
      }
   });
  }

  // Assignments ------------------------------------------------------------------

  const toAssignment = (raw_assignment: any) => {
    const owner = newUserMock();
    USERS_BY_ID.set(owner.id, owner);
    let studentItem: IStudentItem | undefined = undefined;
    if (raw_assignment.student_items) {
      raw_assignment.student_items.forEach(student_item => {
        studentItem = {
          id: student_item.uid,
          type: "student_item",
          itemId: student_item.item_uid,
          itemType: student_item.item_type_s,
          nbgrades: student_item.nbgrades,
          nbgradesTotalPoints: student_item.nbgrades_total_points_f,
          nbgradesTotalScore: student_item.nbgrades_total_score_f,
        }
      })
    }
    USERS_BY_ID.set(owner.id, owner);
    const assignment: IAssignment = {
      id: raw_assignment.uid,
      type: 'assignment',
      name: raw_assignment.name_t,
      description: raw_assignment.description_t,
      nbformat: raw_assignment.model_s ? JSON.parse(raw_assignment.model_s) : undefined,
      public: raw_assignment.public_b ?? false,
      creationDate: new Date(raw_assignment.creation_ts_dt),
      lastUpdateDate: raw_assignment.last_update_ts_dt ? new Date(raw_assignment.last_update_ts_dt) : undefined,
      lastPublicationDate: raw_assignment.creation_ts_dt ? new Date(raw_assignment.creation_ts_dt) : undefined,
      studentItem,
      datasets: [],
      owner,
      space: {
        handle: raw_assignment.handle_s,
      },
      organization: {
        handle: raw_assignment.handle_s,
      },
    }
    SPACE_ASSIGNMENTS_BY_ID.set(assignment.id, assignment);
    STUDENT_ASSIGNMENTS_BY_ID.set(assignment.id, assignment);
    return assignment;
  }

  const getAssignment = (assignmentId) => SPACE_ASSIGNMENTS_BY_ID.get(assignmentId);

  const refreshAssignment = (assignmentId: string) => {
    return requestRun({
      url: `${configuration.spacerRunUrl}/api/spacer/v1/assignments/${assignmentId}`,
      method: 'GET',
    }).then(resp => {
      if (resp.success) {
        const assignment = resp.assignment;
        if (assignment) {
          toAssignment(assignment);
        }
      }
      return resp;
    });
  }

  const getAssignmentForStudent = (assignmentId: string) => STUDENT_ASSIGNMENTS_BY_ID.get(assignmentId);

  const refreshAssignmentForStudent = (courseId: string, user: IUser, assignmentId: string) => {
    return requestRun({
      url: `${configuration.spacerRunUrl}/api/spacer/v1/assignments/${assignmentId}/courses/${courseId}/students/${user.id}`,
      method: 'GET',
    }).then(resp => {
      if (resp.success) {
        const assignment = resp.assignment;
        if (assignment) {
          toAssignment(assignment);
        }
      }
      return resp;
    });
  }

  const resetAssignmentForStudent = (courseId: string, user: IUser, assignmentId: string) => {
    return requestRun({
      url: `${configuration.spacerRunUrl}/api/spacer/v1/assignments/${assignmentId}/reset`,
      method: 'POST',
    }).then(resp => {
      if (resp.success) {
        const assignment = resp.assignment;
        if (assignment) {
          toAssignment(assignment);
        }
      }
      return resp;
    });
  }

  const gradeAssignmentForStudent = (courseId: string, user: IUser, assignmentId: string, model: any) => {
    return requestRun({
      url: `${configuration.spacerRunUrl}/api/spacer/v1/assignments/${assignmentId}/students/${user.id}/grade`,
      method: 'PUT',
      body: {
        model,
      }
    }).then(resp => {
      if (resp.success) {
        const assignment = resp.assignment;
        if (assignment) {
          toAssignment(assignment);
        }
      }
      return resp;
    });
  }

  const getSpaceAssignments = () => Array.from(SPACE_ASSIGNMENTS_BY_ID.values());

  const getSpaceAssignment = (id) => SPACE_ASSIGNMENTS_BY_ID.get(id);

  const refreshSpaceAssignments = (space: IAnySpace, organization?: IAnyOrganization) => {
    const url =
      `${configuration.spacerRunUrl}/api/spacer/v1/spaces/${space.id}/items/types/assignment`
    return requestRun({
      url,
      method: 'GET',
    }).then(resp => {
      if (resp.success) {
        resp.items.forEach(n => {
          toAssignment(n);
        });
      }
      return resp;
    });
  }

  const cloneAssignment = (assignmentId: string) => {
    return requestRun({
      url: `${configuration.spacerRunUrl}/api/spacer/v1/notebooks/${assignmentId}/clone`,
      method: 'POST',
    }).then(resp => {
      if (resp.success) {
        toAssignment(resp.notebook);
      }
      return resp;
    });
  }

  const getAssignmentStudentVersion = (assignmentId) => {
    return requestRun({
      url: `${configuration.spacerRunUrl}/api/spacer/v1/assignments/${assignmentId}/student_version`,
      method: 'GET',
    });
  }

  // Prices -------------------------------------------------------------------

  const refreshStripePrices = () => {
    return requestRun<IRESTBaseResponse & { prices: IPrice[] }>({
      url: `${configuration.iamRunUrl}/api/iam/stripe/v1/prices`,
      method: 'GET',
    });
  }

  // Checkout -------------------------------------------------------------------

  const createCheckoutSession = (product, location) => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/stripe/v1/checkout/session`,
      method: 'POST',
      body: {
        price_id: product?.id,
        return_url: `${location.protocol}//${location.host}${location.pathname.split('/').slice(0, -1).join('/')}`
      }
    })
    .then(data => data.client_secret)
    .catch(error => {
      console.error('Failed to create Stripe checkout session.', error);
    });
  }

  // Credits -------------------------------------------------------------------

  const burnCredit = (credits) => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/usage/credits`,
      method: "DELETE",
      body: {
        credits,
      }
    });
  }

  const getUserCredits = (userId) => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/usage/credits/users/${userId}`,
      method: "GET",
    });
  }

  const updateUserCredits = (userId, credits, brand) => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/usage/credits/users/${userId}`,
      method: "PUT",
      body: {
        credits,
        brand,
      }
    });
  }

  const updateUserCreditsQuota = (userId: string, quota?: number) => {
    return requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/usage/quota`,
      method: "PUT",
      body: {
        user_uid: userId,
        quota,
        reset: "0",
      }
    });
  }

  // Usages -------------------------------------------------------------------

  /**
   * Get user usages
   */
  const getUsages = async (): Promise<{
    success: boolean;
    message: string;
    usages?: IUsage[];
  }> => {
    const data = await requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/usage/user`,
      method: "GET",
    });
    data.usages = (data.usages ?? []).map(u => asUsage(u));
    return data;
  }

  /**
   * Get user usages
   */
  const getUsagesForUser = async (userId: string): Promise<{
    success: boolean;
    message: string;
    usages?: IUsage[];
  }> => {
    const data = await requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/usage/users/${userId}`,
      method: "GET",
    });
    data.usages = (data.usages ?? []).map(u => asUsage(u));
    return data;
  }

  /**
   * Get platform usages
   */
  const getPlatformUsages = async (): Promise<{
    success: boolean;
    message: string;
    usages?: IUsage[];
  }> => {
    const data = await requestRun({
      url: `${configuration.iamRunUrl}/api/iam/v1/usage/platform`,
      method: "GET",
    });
    data.usages = (data.usages ?? []).map(u => asUsage(u));
    return data;
  }


  // Support ------------------------------------------------------------------

  const requestPlatformSupport = (subject, message, email, brand) => {
    return requestRun({
      url: `${configuration.supportRunUrl}/api/support/v1/support/request`,
      method: 'POST',
      body: {
        subject,
        message,
        email,
        brand,
      }
    });
  }

  const requestPlatformSupport2 = (accountHandle, firstName, lastName, email, message) => {
    return requestRun({
      url: `${configuration.supportRunUrl}/api/support/v1/support/request2`,
      method: 'POST',
      body: {
        accountHandle,
        firstName,
        lastName,
        email,
        message,
      }
    });
  }

  // Growth ------------------------------------------------------------------

  const getGrowthKPI = () => {
    return requestRun({
      url: `${configuration.growthRunUrl}/api/growth/v1/kpis`,
      method: 'GET',
    });
  }

  // --------------------------------------------------------------------------

  return {
    addMemberToOrganization,
    addMemberToOrganizationSpace,
    addMemberToTeam,
    addRoleToOrganizationMember,
    addRoleToTeamMember,
    assignRoleToUser,
    assignTagToContact,
    burnCredit,
    changePassword,
    clearAllCaches,
    clearCachedDatasources,
    clearCachedInvites,
    clearCachedItems,
    clearCachedOrganizations,
    clearCachedPages,
    clearCachedPublicItems,
    clearCachedSecrets,
    clearCachedTeams,
    clearCachedTokens,
    cloneAssignment,
    cloneCell,
    cloneDocument,
    cloneExercise,
    cloneLesson,
    cloneNotebook,
    confirmCourseItemCompletion,
    confirmEmailUpdate,
    confirmJoinWithToken,
    confirmPassworkWithToken,
    createCheckoutSession,
    createContact,
    createDatasource,
    createOrganization,
    createPage,
    createSecret,
    createSpace,
    createTeam,
    createToken,
    createTokenForPasswordChange,
    deleteContact,
    deleteItem,
    deleteOutbound,
    deletePage,
    deleteSecret,
    disableUserMFA,
    draftBulkEmailsOutbounds,
    enableUserMFA,
    enrichContactEmail,
    enrichContactLinkedin,
    enrollStudentToCourse,
    exportSpace,
    getAssignment,
    getAssignmentForStudent,
    getAssignmentStudentVersion,
    getCell,
    getContactByHandle,
    getContactById,
    getCourse,
    getCoursesEnrollments,
    getDataset,
    getDatasource,
    getDatasources,
    getDocument,
    getEnvironment,
    getExercise,
    getGitHubProfile,
    getGrowthKPI,
    getInbound,
    getInboundByHandle,
    getInbounds,
    getInstructorCourses,
    getInvite,
    getInvites,
    getLesson,
    getLinkedinProfile,
    getMe,
    getNotebook,
    getOAuth2AuthorizationLinkURL,
    getOAuth2AuthorizationURL,
    getOrganizationByHandle,
    getOrganizationById,
    getOrganizationSpace,
    getOrganizationSpaceByHandle,
    getOrganizationSpaces,
    getOutbound,
    getOutbounds,
    getPage,
    getPages,
    getPlatformUsages,
    getPublicCourses,
    getPublicItems,
    getSchools,
    getSecret,
    getSecrets,
    getSpaceAssignment,
    getSpaceAssignments,
    getSpaceCells,
    getSpaceDatasets,
    getSpaceDocument,
    getSpaceDocuments,
    getSpaceEnvironments,
    getSpaceExercises,
    getSpaceItems,
    getSpaceLesson,
    getSpaceLessons,
    getSpaceNotebook,
    getSpaceNotebooks,
    getStudent,
    getTeamByHandle,
    getTeamById,
    getTeamsByOrganizationId,
    getToken,
    getTokens,
    getUsages,
    getUsagesForUser,
    getUser,
    getUserByHandle,
    getUserCredits,
    getUserOrganizationById,
    getUserOrganizations,
    getUserSpace,
    getUserSpaceByHandle,
    getUserSpaces,
    getUserSurveys,
    gradeAssignmentForStudent,
    joinWithInvite,
    launchBulkEmailsOutbounds,
    linkUserWithContact,
    login,
    logout,
    makeItemPrivate,
    makeItemPublic,
    makeSpacePrivate,
    makeSpacePublic,
    postLinkedinShare,
    postLinkedinShareWithUpload,
    proxyGET,
    proxyPOST,
    proxyPUT,
    putInvite,
    refreshAccount,
    refreshAssignment,
    refreshAssignmentForStudent,
    refreshCell,
    refreshContact,
    refreshCourse,
    refreshCoursesEnrollments,
    refreshDataset,
    refreshDatasource,
    refreshDatasources,
    refreshDocument,
    refreshEnvironment,
    refreshExercise,
    refreshInbound,
    refreshInstructorCourses,
    refreshInvite,
    refreshInvites,
    refreshLayout,
    refreshLesson,
    refreshNotebook,
    refreshOrganization,
    refreshOrganizationSpace,
    refreshOrganizationSpaces,
    refreshOutbound,
    refreshPage,
    refreshPages,
    refreshPublicCourses,
    refreshPublicItems,
    refreshSchools,
    refreshSecret,
    refreshSecrets,
    refreshSpaceAssignments,
    refreshSpaceCells,
    refreshSpaceDatasets,
    refreshSpaceDocuments,
    refreshSpaceEnvironments,
    refreshSpaceExercises,
    refreshSpaceItems,
    refreshSpaceLessons,
    refreshSpaceNotebooks,
    refreshStripePrices,
    refreshStudent,
    refreshTeam,
    refreshTeams,
    refreshToken,
    refreshTokens,
    refreshUser,
    refreshUserOrganizations,
    refreshUserSpace,
    refreshUserSpaces,
    registerToWaitingList,
    removeMemberFromOrganization,
    removeMemberFromOrganizationSpace,
    removeMemberFromTeam,
    removeRoleFromOrganizationMember,
    removeRoleFromTeamMember,
    removeStudentFromCourse,
    requestEmailUpdate,
    requestInvite,
    requestJoin,
    requestJoinToken,
    requestPlatformSupport,
    requestPlatformSupport2,
    resetAssignmentForStudent,
    searchContacts,
    searchPublicItems,
    searchUsers,
    sendInvite,
    sendInviteToContact,
    sendLinkedinConnectionRequest,
    sendOutboundEmailToUser,
    setCourseItems,
    subscribeUserToOutbounds,
    toInbound,
    toOutbound,
    tryBulkEmailsOutbounds,
    unassignRoleFromUser,
    unassignTagFromContact,
    unlinkUserFromContact,
    unsubscribeContactFromOutbounds,
    unsubscribeInviteeFromOutbounds,
    unsubscribeUserFromOutbounds,
    updateCell,
    updateContact,
    updateCourse,
    updateDataset,
    updateDatasource,
    updateDocument,
    updateDocumentModel,
    updateExercise,
    updateExercisePoints,
    updateMe,
    updateNotebook,
    updateNotebookModel,
    updateOrganization,
    updateOrganizationSpace,
    updatePage,
    updateSecret,
    updateSpace,
    updateTeam,
    updateToken,
    updateUserCredits,
    updateUserCreditsQuota,
    updateUserOnboarding,
    updateUserSettings,
    validateUserMFACode,
    whoami,
  };

}

export default useCache;
