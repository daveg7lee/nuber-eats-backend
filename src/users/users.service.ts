import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAccountInput } from './dtos/create-account.dto';
import { LoginInput } from './dtos/login.dto';
import { User } from './entities/user.entity';
import { JwtService } from 'src/jwt/jwt.service';
import { EditProfileInput } from './dtos/edit-profile.dto';
import { Verification } from './entities/verification.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Verification)
    private readonly verification: Repository<Verification>,
    private readonly jwtService: JwtService,
  ) {}

  async createAccount({
    email,
    password,
    role,
  }: CreateAccountInput): Promise<boolean> {
    const exists = await this.users.findOne({ where: { email } });
    if (exists) {
      throw new Error('There is a user with that email already');
    }
    const user = await this.users.save(
      this.users.create({ email, password, role }),
    );
    await this.verification.save(
      this.verification.create({
        user,
      }),
    );

    return true;
  }

  async login({ email, password }: LoginInput): Promise<string> {
    const user = await this.users.findOne({ where: { email } });
    if (!user) {
      throw new Error('User not found');
    }

    const isPasswordCorrect = await user.checkPassword(password);

    if (!isPasswordCorrect) {
      throw new Error('Wrong password');
    }

    const token = this.jwtService.sign(user.id);

    return token;
  }

  async findById(id: number): Promise<User> {
    return this.users.findOne({ where: { id } });
  }

  async editProfile(id: number, { email, password }: EditProfileInput) {
    const user = await this.users.findOne({ where: { id } });
    if (email) {
      user.email = email;
      user.verified = false;
      await this.verification.save(this.verification.create({ user }));
    }
    if (password) {
      user.password = password;
    }
    return this.users.save(user);
  }

  async verifyEmail(code: string): Promise<boolean> {
    const verification = await this.verification.findOne({
      where: { code },
      relations: ['user'],
    });
    if (verification) {
      console.log(verification);
      verification.user.verified = true;
      await this.users.save(verification.user);
      return true;
    }
    return false;
  }
}
