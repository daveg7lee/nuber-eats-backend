import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from 'src/jwt/jwt.service';
import { MailService } from 'src/mail/mail.service';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Verification } from './entities/verification.entity';
import { UserService } from './users.service';

const MOCK_TOKEN = 'signed-token';

const mockRepository = () => ({
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
  findOneOrFail: jest.fn(),
});

const mockJwtService = {
  sign: jest.fn(() => MOCK_TOKEN),
  verify: jest.fn(),
};

const mockMailService = {
  sendVerificationEmail: jest.fn(),
};

type MockRepository<T> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe('UserService', () => {
  let service: UserService;
  let userRepository: MockRepository<User>;
  let verificationRepository: MockRepository<Verification>;
  let mailService: MailService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(Verification),
          useValue: mockRepository(),
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: MailService,
          useValue: mockMailService,
        },
      ],
    }).compile();
    service = module.get<UserService>(UserService);
    mailService = module.get(MailService);
    jwtService = module.get(JwtService);
    userRepository = module.get(getRepositoryToken(User));
    verificationRepository = module.get(getRepositoryToken(Verification));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createAccount', () => {
    const createAccountArgs = {
      email: 'daveg7lee@gmail.com',
      password: 'lalala',
      role: 0,
    };

    const verificationArgs = {
      user: createAccountArgs,
      code: 'testcode!!',
    };

    it('should fail if user exists', async () => {
      userRepository.findOne.mockResolvedValue({
        id: 1,
        email: 'daveg7lee@gmail.com',
      });
      const result = await service.createAccount(createAccountArgs);

      expect(result).toMatchObject({
        ok: false,
        error: 'There is a user with that email already',
      });
    });
    it('should create a new user', async () => {
      userRepository.findOne.mockResolvedValue(undefined);
      userRepository.create.mockReturnValue(createAccountArgs);
      userRepository.save.mockResolvedValue(createAccountArgs);
      verificationRepository.create.mockReturnValue(verificationArgs);
      verificationRepository.save.mockResolvedValue(verificationArgs);

      const result = await service.createAccount(createAccountArgs);

      expect(userRepository.create).toHaveBeenCalledTimes(1);
      expect(userRepository.create).toHaveBeenCalledWith(createAccountArgs);

      expect(userRepository.save).toHaveBeenCalledTimes(1);
      expect(userRepository.save).toHaveBeenCalledWith(createAccountArgs);

      expect(verificationRepository.create).toHaveBeenCalledTimes(1);
      expect(verificationRepository.create).toHaveBeenCalledWith({
        user: createAccountArgs,
      });

      expect(verificationRepository.save).toHaveBeenCalledTimes(1);
      expect(verificationRepository.save).toHaveBeenCalledWith(
        verificationArgs,
      );

      expect(mailService.sendVerificationEmail).toHaveBeenCalledTimes(1);
      expect(mailService.sendVerificationEmail).toHaveBeenCalledWith(
        createAccountArgs.email,
        verificationArgs.code,
      );

      expect(result).toEqual({ ok: true });
    });
    it('should fail on exception', async () => {
      userRepository.findOne.mockRejectedValue(new Error());
      const result = await service.createAccount(createAccountArgs);
      expect(result).toEqual({ ok: false, error: "Couldn't create account" });
    });
  });

  describe('login', () => {
    const loginArgs = {
      email: 'daveg7lee@gmail.com',
      password: 'lalala',
    };
    const mockedUser = {
      id: 1,
      checkPassword: jest.fn(),
    };
    it('should fail if user does not exist', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.login(loginArgs);

      expect(userRepository.findOne).toHaveBeenCalledTimes(1);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        select: ['password', 'id'],
        where: {
          email: loginArgs.email,
        },
      });
      expect(result).toEqual({
        ok: false,
        error: 'User not found',
      });
    });
    it('should fail if the password is wrong', async () => {
      mockedUser.checkPassword.mockResolvedValue(false);
      userRepository.findOne.mockResolvedValue(mockedUser);
      const result = await service.login(loginArgs);

      expect(result).toEqual({
        ok: false,
        error: 'Wrong password',
      });
    });
    it('should return token if password correct', async () => {
      mockedUser.checkPassword.mockResolvedValue(true);
      userRepository.findOne.mockResolvedValue(mockedUser);

      const result = await service.login(loginArgs);

      expect(jwtService.sign).toHaveBeenCalledTimes(1);
      expect(jwtService.sign).toHaveBeenCalledWith(mockedUser.id);

      expect(result).toEqual({
        ok: true,
        token: MOCK_TOKEN,
      });
    });
    it('should fail on exception', async () => {
      userRepository.findOne.mockRejectedValue(new Error());
      const result = await service.login(loginArgs);
      expect(result).toEqual({ ok: false, error: "Can't log user in." });
    });
  });
  describe('findById', () => {
    const findByIdArgs = {
      id: 1,
    };
    it('should find an existing user', async () => {
      userRepository.findOneOrFail.mockResolvedValue(findByIdArgs);

      const result = await service.findById(1);

      expect(result).toEqual({ ok: true, user: findByIdArgs });

      expect(userRepository.findOneOrFail).toHaveBeenCalledTimes(1);
      expect(userRepository.findOneOrFail).toHaveBeenCalledWith({
        where: { id: findByIdArgs.id },
      });
    });
    it('should fail if no user is found', async () => {
      userRepository.findOneOrFail.mockRejectedValue(new Error());

      const result = await service.findById(1);

      expect(result).toEqual({ ok: false, error: 'User Not Found' });
    });
  });

  describe('editProfile', () => {});

  it.todo('verifyEmail');
});
