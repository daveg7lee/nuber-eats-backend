import * as jwt from 'jsonwebtoken';
import { Test } from '@nestjs/testing';
import { CONFIG_OPTIONS } from 'src/common/common.contants';
import { JwtService } from './jwt.service';

jest.mock('jsonwebtoken', () => {
  return {
    sign: jest.fn(() => 'token'),
  };
});

const TEST_KEY = 'test_key';
const USER_ID = 1;

describe('JwtService', () => {
  let service: JwtService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        JwtService,
        { provide: CONFIG_OPTIONS, useValue: { privateKey: TEST_KEY } },
      ],
    }).compile();

    service = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sign', () => {
    it('should return a signed token', async () => {
      service.sign(USER_ID);

      expect(jwt.sign).toHaveBeenCalledWith({ id: USER_ID }, TEST_KEY);
    });
  });

  describe('verify', () => {
    it('should return a decoded token', async () => {});
  });
});
