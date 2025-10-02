import { Injectable, NotFoundException } from '@nestjs/common';
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
      // const user = await this.usersRepository.findOne({
      //   where: { id }, 
      //   select: ['id', 'email', 'name'], 
      // });

      // if (!user) {
      //   throw new NotFoundException(`User with ID ${id} not found`);
      // }

      return this.usersRepository.findOne({
          where: { id },
          select: ['id', 'email', 'name', 'phone', 'createdAt']
        });
    }

    async findAll() {
      return this.usersRepository.find({
        select: ['id', 'email', 'name', 'phone', 'createdAt'],
      });
    }

}
