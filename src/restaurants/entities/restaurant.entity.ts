import { Field, ObjectType } from '@nestjs/graphql';
import { IsString, Length } from 'class-validator';

@ObjectType()
export class Restaurant {
  @Field(() => String)
  @IsString()
  @Length(5, 10)
  name: string;
}
