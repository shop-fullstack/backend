import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from './supabase.service';

// createClient를 모킹
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn().mockReturnValue({
    from: jest.fn(),
    rpc: jest.fn(),
  }),
}));

import { createClient } from '@supabase/supabase-js';

describe('SupabaseService', () => {
  let service: SupabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupabaseService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              const env: Record<string, string> = {
                SUPABASE_URL: 'https://test.supabase.co',
                SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
              };
              return env[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<SupabaseService>(SupabaseService);
  });

  it('SUPABASE_URL과 SERVICE_ROLE_KEY로 createClient를 호출해야 한다', () => {
    expect(createClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-service-key',
    );
  });

  it('getClient()가 Supabase 클라이언트를 반환해야 한다', () => {
    const client = service.getClient();

    expect(client).toBeDefined();
    expect(client.from).toBeDefined();
    expect(client.rpc).toBeDefined();
  });

  it('여러 번 호출해도 같은 클라이언트를 반환해야 한다 (싱글톤)', () => {
    const client1 = service.getClient();
    const client2 = service.getClient();

    expect(client1).toBe(client2);
  });
});
