/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as secretsAPI from '../secrets';
import { requestDatalayerAPI } from '../../DatalayerApi';

// Mock the DatalayerApi module
vi.mock('../../DatalayerApi', () => ({
  requestDatalayerAPI: vi.fn(),
}));

// Mock token for tests
const MOCK_JWT_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjk5OTk5OTk5OTl9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

describe('Secrets API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createSecret', () => {
    it('should create a secret with base64 encoded value', async () => {
      const mockResponse = {
        success: true,
        message: 'Secret created',
        secret: {
          uid: 'secret-123',
          variant_s: 'password',
          name_s: 'test_secret',
          description_t: 'Test secret',
          value_s: 'YmFzZTY0X2VuY29kZWQ=', // base64 for "base64_encoded"
        },
      };
      vi.mocked(requestDatalayerAPI).mockResolvedValue(mockResponse);

      const result = await secretsAPI.createSecret(MOCK_JWT_TOKEN, {
        variant: 'password',
        name: 'test_secret',
        description: 'Test secret',
        value: 'plain_text_value',
      });

      expect(requestDatalayerAPI).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: expect.stringContaining('/secrets'),
          body: expect.objectContaining({
            name: 'test_secret',
            variant: 'password',
            description: 'Test secret',
            value: expect.any(String), // Should be base64 encoded
          }),
        }),
      );
      expect(result).toEqual(mockResponse);
    });

    it('should use default variant if not provided', async () => {
      const mockResponse = {
        success: true,
        message: 'Secret created',
        secret: {
          uid: 'secret-123',
          variant_s: 'generic',
          name_s: 'test_secret',
          description_t: '',
          value_s: 'encoded',
        },
      };
      vi.mocked(requestDatalayerAPI).mockResolvedValue(mockResponse);

      await secretsAPI.createSecret(MOCK_JWT_TOKEN, {
        name: 'test_secret',
        value: 'plain_value',
      });

      expect(requestDatalayerAPI).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            variant: 'generic',
          }),
        }),
      );
    });

    it('should validate required name field', async () => {
      await expect(
        secretsAPI.createSecret(MOCK_JWT_TOKEN, {
          name: '',
          value: 'value',
        } as any),
      ).rejects.toThrow('Secret name is required');
    });

    it('should validate required value field', async () => {
      await expect(
        secretsAPI.createSecret(MOCK_JWT_TOKEN, {
          name: 'test',
          value: '',
        } as any),
      ).rejects.toThrow('Secret value is required');
    });

    it('should handle 409 conflict errors', async () => {
      vi.mocked(requestDatalayerAPI).mockRejectedValue({
        response: { status: 409 },
      });

      await expect(
        secretsAPI.createSecret(MOCK_JWT_TOKEN, {
          name: 'duplicate_secret',
          value: 'value',
        }),
      ).rejects.toThrow(
        "Secret with name 'duplicate_secret' already exists. Please use a different name.",
      );
    });
  });

  describe('listSecrets', () => {
    it('should list all secrets', async () => {
      const mockResponse = {
        success: true,
        message: 'Secrets retrieved',
        secrets: [
          {
            uid: 'secret-1',
            variant_s: 'password',
            name_s: 'secret1',
            description_t: 'First secret',
            value_s: 'encoded1',
          },
          {
            uid: 'secret-2',
            variant_s: 'key',
            name_s: 'secret2',
            description_t: 'Second secret',
            value_s: 'encoded2',
          },
        ],
      };
      vi.mocked(requestDatalayerAPI).mockResolvedValue(mockResponse);

      const result = await secretsAPI.listSecrets(MOCK_JWT_TOKEN);

      expect(requestDatalayerAPI).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: expect.stringContaining('/secrets'),
        }),
      );
      expect(result.secrets).toHaveLength(2);
      expect(result.secrets[0].name_s).toBe('secret1');
    });

    it('should validate token', async () => {
      await expect(secretsAPI.listSecrets('')).rejects.toThrow();
    });
  });

  describe('getSecret', () => {
    it('should get a specific secret', async () => {
      const mockResponse = {
        success: true,
        message: 'Secret retrieved',
        secret: {
          uid: 'secret-123',
          variant_s: 'key',
          name_s: 'api_key',
          description_t: 'API Key',
          value_s: 'encoded_value',
        },
      };
      vi.mocked(requestDatalayerAPI).mockResolvedValue(mockResponse);

      const result = await secretsAPI.getSecret(MOCK_JWT_TOKEN, 'secret-123');

      expect(requestDatalayerAPI).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: expect.stringContaining('/secrets/secret-123'),
        }),
      );
      expect(result.secret.uid).toBe('secret-123');
      expect(result.secret.name_s).toBe('api_key');
    });

    it('should handle 404 errors', async () => {
      vi.mocked(requestDatalayerAPI).mockRejectedValue({
        response: { status: 404 },
      });

      await expect(
        secretsAPI.getSecret(MOCK_JWT_TOKEN, 'nonexistent'),
      ).rejects.toThrow("Secret 'nonexistent' not found.");
    });

    it('should validate secretId parameter', async () => {
      await expect(secretsAPI.getSecret(MOCK_JWT_TOKEN, '')).rejects.toThrow(
        'Secret ID is required',
      );
    });
  });

  describe('updateSecret', () => {
    it('should update a secret', async () => {
      const mockResponse = {
        success: true,
        message: 'Secret updated',
        secret: {
          uid: 'secret-123',
          variant_s: 'password',
          name_s: 'updated_name',
          description_t: 'Updated description',
          value_s: 'new_encoded_value',
        },
      };
      vi.mocked(requestDatalayerAPI).mockResolvedValue(mockResponse);

      const result = await secretsAPI.updateSecret(
        MOCK_JWT_TOKEN,
        'secret-123',
        { description: 'Updated description' },
      );

      expect(requestDatalayerAPI).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PUT',
          url: expect.stringContaining('/secrets/secret-123'),
          body: expect.objectContaining({
            description: 'Updated description',
          }),
        }),
      );
      expect(result.secret.description_t).toBe('Updated description');
    });

    it('should encode value if provided in update', async () => {
      const mockResponse = {
        success: true,
        message: 'Secret updated',
        secret: {
          uid: 'secret-123',
          variant_s: 'password',
          name_s: 'test',
          description_t: 'desc',
          value_s: 'encoded',
        },
      };
      vi.mocked(requestDatalayerAPI).mockResolvedValue(mockResponse);

      await secretsAPI.updateSecret(MOCK_JWT_TOKEN, 'secret-123', {
        value: 'new_plain_value',
      });

      expect(requestDatalayerAPI).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            value: expect.any(String), // Should be base64 encoded
          }),
        }),
      );
    });

    it('should handle 404 errors', async () => {
      vi.mocked(requestDatalayerAPI).mockRejectedValue({
        response: { status: 404 },
      });

      await expect(
        secretsAPI.updateSecret(MOCK_JWT_TOKEN, 'nonexistent', {
          description: 'test',
        }),
      ).rejects.toThrow("Secret 'nonexistent' not found.");
    });
  });

  describe('deleteSecret', () => {
    it('should delete a secret', async () => {
      vi.mocked(requestDatalayerAPI).mockResolvedValue({
        success: true,
        message: 'Secret deleted',
      });

      await expect(
        secretsAPI.deleteSecret(MOCK_JWT_TOKEN, 'secret-123'),
      ).resolves.not.toThrow();

      expect(requestDatalayerAPI).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'DELETE',
          url: expect.stringContaining('/secrets/secret-123'),
        }),
      );
    });

    it('should handle 404 errors', async () => {
      vi.mocked(requestDatalayerAPI).mockRejectedValue({
        response: { status: 404 },
      });

      await expect(
        secretsAPI.deleteSecret(MOCK_JWT_TOKEN, 'nonexistent'),
      ).rejects.toThrow("Secret 'nonexistent' not found.");
    });

    it('should validate secretId parameter', async () => {
      await expect(secretsAPI.deleteSecret(MOCK_JWT_TOKEN, '')).rejects.toThrow(
        'Secret ID is required',
      );
    });
  });
});
