/**
 * Supabase 클라이언트 mock 헬퍼
 * 체이너블 쿼리 빌더 패턴을 모킹합니다.
 */

interface MockQueryResult {
  data: unknown;
  error: { message: string } | null;
  count?: number | null;
}

export function createMockQueryBuilder(result: MockQueryResult) {
  const builder: Record<string, jest.Mock> = {};
  const methods = [
    'select',
    'insert',
    'update',
    'delete',
    'eq',
    'neq',
    'ilike',
    'order',
    'range',
    'single',
  ];

  for (const method of methods) {
    builder[method] = jest.fn().mockReturnValue(builder);
  }

  // single()은 최종 결과를 반환해야 함
  builder['single'] = jest.fn().mockResolvedValue(result);

  // select()에 count 옵션이 있을 때 range() 후 결과 반환
  builder['range'] = jest.fn().mockResolvedValue({
    ...result,
    count: result.count ?? null,
  });

  // insert().select().single() 체인
  builder['insert'] = jest.fn().mockReturnValue(builder);
  builder['update'] = jest.fn().mockReturnValue(builder);
  builder['select'] = jest.fn().mockReturnValue(builder);

  return builder;
}

export function createMockSupabaseClient() {
  return {
    from: jest.fn(),
    rpc: jest.fn(),
  };
}

export function createMockSupabaseService(
  mockClient: ReturnType<typeof createMockSupabaseClient>,
) {
  return {
    getClient: jest.fn().mockReturnValue(mockClient),
  };
}
