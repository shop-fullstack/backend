import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { SupabaseService } from '../src/common/supabase/supabase.service';
import * as bcrypt from 'bcrypt';
import { App } from 'supertest/types';

jest.mock('bcrypt');

/**
 * E2E 통합 테스트
 * 전체 파이프라인: ValidationPipe → Guard → Controller → Service → Interceptor/Filter
 * Supabase만 모킹하여, 나머지 NestJS 인프라는 실제로 동작
 */
describe('App E2E', () => {
  let app: INestApplication;
  let mockSupabaseClient: {
    from: jest.Mock;
    rpc: jest.Mock;
  };

  // JWT 토큰 생성을 위한 실제 로그인 흐름 시뮬레이션
  let validToken: string;

  beforeAll(async () => {
    mockSupabaseClient = {
      from: jest.fn(),
      rpc: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SupabaseService)
      .useValue({
        getClient: () => mockSupabaseClient,
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    // 유효한 토큰을 얻기 위해 로그인 수행
    const loginBuilder = createChainBuilder({
      data: {
        id: 'user-1',
        email: 'test@bizmart.com',
        password: 'hashed-pw',
        company_name: '테스트 카페',
        business_type: '카페/베이커리',
        grade: '일반',
      },
      error: null,
    });
    mockSupabaseClient.from = jest.fn().mockReturnValue(loginBuilder);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const loginRes = await request(app.getHttpServer() as App)
      .post('/auth/login')
      .send({ email: 'test@bizmart.com', password: 'password123' });

    validToken = loginRes.body.data.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => jest.clearAllMocks());

  // ─── Helper ────────────────────────────────────────────────
  function createChainBuilder(result: {
    data: unknown;
    error: { message: string } | null;
    count?: number | null;
  }) {
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
    for (const m of methods) {
      builder[m] = jest.fn().mockReturnValue(builder);
    }
    builder.single = jest.fn().mockResolvedValue(result);
    builder.range = jest.fn().mockResolvedValue({
      ...result,
      count: result.count ?? null,
    });
    return builder;
  }

  // ═══════════════════════════════════════════════════════════
  // AUTH
  // ═══════════════════════════════════════════════════════════
  describe('Auth E2E', () => {
    describe('POST /auth/register', () => {
      it('201 — 올바른 데이터로 회원가입 성공', async () => {
        const emailCheck = createChainBuilder({
          data: null,
          error: { message: 'not found' },
        });
        const insertResult = createChainBuilder({
          data: {
            id: 'new-uuid',
            email: 'new@bizmart.com',
            business_type: '카페/베이커리',
            grade: '일반',
          },
          error: null,
        });
        mockSupabaseClient.from = jest
          .fn()
          .mockReturnValueOnce(emailCheck)
          .mockReturnValueOnce(insertResult);
        (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

        const res = await request(app.getHttpServer() as App)
          .post('/auth/register')
          .send({
            email: 'new@bizmart.com',
            password: 'password123',
            business_number: '123-45-67890',
            business_type: '카페/베이커리',
            company_name: '새 카페',
            owner_name: '홍길동',
          });

        expect(res.status).toBe(201);
        expect(res.body.statusCode).toBe(201);
        expect(res.body.message).toBe('회원가입이 완료되었습니다');
        expect(res.body.data.access_token).toBeDefined();
        expect(res.body.data.user.email).toBe('new@bizmart.com');
      });

      it('400 — 이메일 형식 아닐 때 DTO 검증 실패', async () => {
        const res = await request(app.getHttpServer() as App)
          .post('/auth/register')
          .send({
            email: 'not-email',
            password: 'password123',
            business_number: '123',
            business_type: '카페',
            company_name: '카페',
            owner_name: '홍',
          });

        expect(res.status).toBe(400);
        expect(res.body.statusCode).toBe(400);
        expect(res.body.message).toContain('이메일');
      });

      it('400 — 비밀번호 8자 미만', async () => {
        const res = await request(app.getHttpServer() as App)
          .post('/auth/register')
          .send({
            email: 'test@bizmart.com',
            password: 'short',
            business_number: '123',
            business_type: '카페',
            company_name: '카페',
            owner_name: '홍',
          });

        expect(res.status).toBe(400);
        expect(res.body.message).toContain('8자');
      });

      it('400 — 필수 필드 누락', async () => {
        const res = await request(app.getHttpServer() as App)
          .post('/auth/register')
          .send({
            email: 'test@bizmart.com',
            password: 'password123',
          });

        expect(res.status).toBe(400);
      });

      it('400 — 허용되지 않은 필드 전송 시 거부', async () => {
        const res = await request(app.getHttpServer() as App)
          .post('/auth/register')
          .send({
            email: 'test@bizmart.com',
            password: 'password123',
            business_number: '123',
            business_type: '카페',
            company_name: '카페',
            owner_name: '홍',
            hacker_field: 'inject',
          });

        expect(res.status).toBe(400);
      });
    });

    describe('POST /auth/login', () => {
      it('200 — 올바른 자격 증명', async () => {
        const builder = createChainBuilder({
          data: {
            id: 'user-1',
            email: 'test@bizmart.com',
            password: 'hashed',
            company_name: '카페',
            business_type: '카페/베이커리',
            grade: '일반',
          },
          error: null,
        });
        mockSupabaseClient.from = jest.fn().mockReturnValue(builder);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        const res = await request(app.getHttpServer() as App)
          .post('/auth/login')
          .send({ email: 'test@bizmart.com', password: 'password123' });

        expect(res.status).toBe(200);
        expect(res.body.data.access_token).toBeDefined();
      });

      it('401 — 잘못된 비밀번호', async () => {
        const builder = createChainBuilder({
          data: {
            id: 'user-1',
            email: 'test@bizmart.com',
            password: 'hashed',
            company_name: '카페',
            business_type: '카페',
            grade: '일반',
          },
          error: null,
        });
        mockSupabaseClient.from = jest.fn().mockReturnValue(builder);
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

        const res = await request(app.getHttpServer() as App)
          .post('/auth/login')
          .send({ email: 'test@bizmart.com', password: 'wrongpassword' });

        expect(res.status).toBe(401);
      });
    });

    describe('POST /auth/logout', () => {
      it('200 — 유효한 토큰으로 로그아웃', async () => {
        const res = await request(app.getHttpServer() as App)
          .post('/auth/logout')
          .set('Authorization', `Bearer ${validToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data).toBeNull();
      });

      it('401 — 토큰 없이 로그아웃 시도', async () => {
        const res = await request(app.getHttpServer() as App).post(
          '/auth/logout',
        );

        expect(res.status).toBe(401);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════
  // USERS
  // ═══════════════════════════════════════════════════════════
  describe('Users E2E', () => {
    describe('GET /users/me', () => {
      it('200 — 인증된 유저 정보 반환', async () => {
        const builder = createChainBuilder({
          data: {
            id: 'user-1',
            email: 'test@bizmart.com',
            business_number: '123',
            business_type: '카페/베이커리',
            company_name: '카페',
            owner_name: '홍길동',
            grade: '일반',
            created_at: '2025-01-01',
          },
          error: null,
        });
        mockSupabaseClient.from = jest.fn().mockReturnValue(builder);

        const res = await request(app.getHttpServer() as App)
          .get('/users/me')
          .set('Authorization', `Bearer ${validToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.email).toBe('test@bizmart.com');
      });

      it('401 — 토큰 없이 접근', async () => {
        const res = await request(app.getHttpServer() as App).get('/users/me');
        expect(res.status).toBe(401);
      });
    });

    describe('PATCH /users/me', () => {
      it('200 — 사업자 정보 수정', async () => {
        const builder = createChainBuilder({
          data: {
            id: 'user-1',
            email: 'test@bizmart.com',
            business_number: '123',
            business_type: '식당/외식업',
            company_name: '새 식당',
            owner_name: '홍길동',
            grade: '일반',
            created_at: '2025-01-01',
          },
          error: null,
        });
        mockSupabaseClient.from = jest.fn().mockReturnValue(builder);

        const res = await request(app.getHttpServer() as App)
          .patch('/users/me')
          .set('Authorization', `Bearer ${validToken}`)
          .send({ company_name: '새 식당', business_type: '식당/외식업' });

        expect(res.status).toBe(200);
        expect(res.body.data.company_name).toBe('새 식당');
      });
    });
  });

  // ═══════════════════════════════════════════════════════════
  // PRODUCTS
  // ═══════════════════════════════════════════════════════════
  describe('Products E2E', () => {
    describe('GET /products', () => {
      it('200 — 인증 없이 상품 목록 조회', async () => {
        const builder = createChainBuilder({
          data: [{ id: 'p1', name: '커피' }],
          error: null,
          count: 1,
        });
        mockSupabaseClient.from = jest.fn().mockReturnValue(builder);

        const res = await request(app.getHttpServer() as App).get('/products');

        expect(res.status).toBe(200);
        expect(res.body.data.items).toBeDefined();
      });

      it('200 — 인기순 정렬 시 rpc 호출', async () => {
        mockSupabaseClient.rpc = jest.fn().mockResolvedValue({
          data: [{ id: 'p1', name: '커피', total: 10 }],
          error: null,
        });

        const res = await request(app.getHttpServer() as App).get(
          '/products?sort=popular',
        );

        expect(res.status).toBe(200);
        expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
          'get_popular_products',
          expect.any(Object),
        );
      });

      it('400 — 잘못된 sort 값', async () => {
        const res = await request(app.getHttpServer() as App).get(
          '/products?sort=invalid',
        );

        expect(res.status).toBe(400);
      });

      it('400 — limit가 101 이상', async () => {
        const res = await request(app.getHttpServer() as App).get(
          '/products?limit=101',
        );

        expect(res.status).toBe(400);
      });

      it('400 — page가 0', async () => {
        const res = await request(app.getHttpServer() as App).get(
          '/products?page=0',
        );

        expect(res.status).toBe(400);
      });
    });

    describe('GET /products/:id', () => {
      it('200 — 상품 상세 조회', async () => {
        const builder = createChainBuilder({
          data: { id: 'p1', name: '커피', origin: '콜롬비아' },
          error: null,
        });
        mockSupabaseClient.from = jest.fn().mockReturnValue(builder);

        const res = await request(app.getHttpServer() as App).get(
          '/products/p1',
        );

        expect(res.status).toBe(200);
        expect(res.body.data.name).toBe('커피');
      });

      it('404 — 존재하지 않는 상품', async () => {
        const builder = createChainBuilder({
          data: null,
          error: { message: 'not found' },
        });
        mockSupabaseClient.from = jest.fn().mockReturnValue(builder);

        const res = await request(app.getHttpServer() as App).get(
          '/products/nonexistent',
        );

        expect(res.status).toBe(404);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════
  // ORDERS
  // ═══════════════════════════════════════════════════════════
  describe('Orders E2E', () => {
    describe('POST /orders', () => {
      it('201 — 주문 생성 성공', async () => {
        mockSupabaseClient.rpc = jest.fn().mockResolvedValue({
          data: {
            order_id: 'BM-20250330-0001',
            total_amount: 55000,
            status: '주문완료',
          },
          error: null,
        });

        const res = await request(app.getHttpServer() as App)
          .post('/orders')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            items: [
              {
                product_id: '550e8400-e29b-41d4-a716-446655440000',
                quantity: 2,
              },
            ],
            delivery_address: '서울시 마포구',
          });

        expect(res.status).toBe(201);
        expect(res.body.message).toBe('주문이 완료되었습니다');
        expect(res.body.data.order_id).toBe('BM-20250330-0001');
      });

      it('400 — items 빈 배열', async () => {
        const res = await request(app.getHttpServer() as App)
          .post('/orders')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            items: [],
            delivery_address: '서울시',
          });

        expect(res.status).toBe(400);
        expect(res.body.message).toContain('1개 이상');
      });

      it('400 — product_id가 UUID 형식이 아님', async () => {
        const res = await request(app.getHttpServer() as App)
          .post('/orders')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            items: [{ product_id: 'not-uuid', quantity: 1 }],
            delivery_address: '서울시',
          });

        expect(res.status).toBe(400);
      });

      it('400 — quantity가 0', async () => {
        const res = await request(app.getHttpServer() as App)
          .post('/orders')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            items: [
              {
                product_id: '550e8400-e29b-41d4-a716-446655440000',
                quantity: 0,
              },
            ],
            delivery_address: '서울시',
          });

        expect(res.status).toBe(400);
      });

      it('400 — delivery_address 누락', async () => {
        const res = await request(app.getHttpServer() as App)
          .post('/orders')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            items: [
              {
                product_id: '550e8400-e29b-41d4-a716-446655440000',
                quantity: 1,
              },
            ],
          });

        expect(res.status).toBe(400);
      });

      it('401 — 인증 없이 주문 시도', async () => {
        const res = await request(app.getHttpServer() as App)
          .post('/orders')
          .send({
            items: [
              {
                product_id: '550e8400-e29b-41d4-a716-446655440000',
                quantity: 1,
              },
            ],
            delivery_address: '서울시',
          });

        expect(res.status).toBe(401);
      });
    });

    describe('GET /orders', () => {
      it('200 — 내 주문 목록', async () => {
        const builder = createChainBuilder({
          data: null,
          error: null,
        });
        builder.order = jest.fn().mockResolvedValue({
          data: [
            {
              order_number: 'BM-001',
              status: '주문완료',
              total_amount: 50000,
              delivery_date: '2025-04-01',
              is_cold: false,
              created_at: '2025-03-30',
            },
          ],
          error: null,
        });
        mockSupabaseClient.from = jest.fn().mockReturnValue(builder);

        const res = await request(app.getHttpServer() as App)
          .get('/orders')
          .set('Authorization', `Bearer ${validToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data[0].id).toBe('BM-001');
      });

      it('401 — 인증 없이 접근', async () => {
        const res = await request(app.getHttpServer() as App).get('/orders');
        expect(res.status).toBe(401);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════
  // TREND
  // ═══════════════════════════════════════════════════════════
  describe('Trend E2E', () => {
    describe('GET /trend/report', () => {
      it('200 — 트렌드 리포트 조회', async () => {
        mockSupabaseClient.rpc = jest.fn().mockResolvedValue({
          data: [
            {
              rank: 1,
              product_id: 'p1',
              name: '커피',
              category: '식자재',
              order_count: 100,
              change: 'up',
            },
          ],
          error: null,
        });

        const res = await request(app.getHttpServer() as App)
          .get('/trend/report?period=weekly&limit=5')
          .set('Authorization', `Bearer ${validToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.period).toBe('weekly');
        expect(res.body.data.ranking).toHaveLength(1);
      });

      it('400 — 잘못된 period 값', async () => {
        const res = await request(app.getHttpServer() as App)
          .get('/trend/report?period=daily')
          .set('Authorization', `Bearer ${validToken}`);

        expect(res.status).toBe(400);
      });

      it('401 — 인증 없이 접근', async () => {
        const res = await request(app.getHttpServer() as App).get(
          '/trend/report',
        );
        expect(res.status).toBe(401);
      });
    });

    describe('GET /trend/best', () => {
      it('200 — 업종별 베스트셀러 조회', async () => {
        mockSupabaseClient.rpc = jest.fn().mockResolvedValue({
          data: [
            {
              rank: 1,
              product_id: 'p1',
              name: '커피',
              category: '식자재',
              order_count: 50,
            },
          ],
          error: null,
        });

        const res = await request(app.getHttpServer() as App)
          .get('/trend/best?type=카페/베이커리')
          .set('Authorization', `Bearer ${validToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.business_type).toBe('카페/베이커리');
      });

      it('400 — type 파라미터 누락', async () => {
        const res = await request(app.getHttpServer() as App)
          .get('/trend/best')
          .set('Authorization', `Bearer ${validToken}`);

        expect(res.status).toBe(400);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 응답 형식 검증
  // ═══════════════════════════════════════════════════════════
  describe('Response Format', () => {
    it('성공 응답은 항상 { statusCode, message, data } 형식', async () => {
      const builder = createChainBuilder({
        data: [{ id: 'p1' }],
        error: null,
        count: 1,
      });
      mockSupabaseClient.from = jest.fn().mockReturnValue(builder);

      const res = await request(app.getHttpServer() as App).get('/products');

      expect(res.body).toHaveProperty('statusCode');
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('data');
    });

    it('에러 응답은 항상 { statusCode, message, error } 형식', async () => {
      const res = await request(app.getHttpServer() as App).get('/users/me');

      expect(res.body).toHaveProperty('statusCode');
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('error');
    });
  });
});
