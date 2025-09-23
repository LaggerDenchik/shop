import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class CabinetsService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  
  async findUserById(id: number) {
    return this.usersRepository.findOne({
      where: { id }, 
      select: ['id', 'email', 'name'],
    });
  }

  async findAll() {
    return this.usersRepository.find();
  }

}
