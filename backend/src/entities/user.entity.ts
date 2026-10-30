import {
  Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique,
} from 'typeorm';

export type UserRole = 'ADMIN' | 'CONTADOR' | 'CONSULTA';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  user_id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password_hash: string;

  @Column()
  full_name: string;

  @Column({ type: 'varchar', length: 20, default: 'CONSULTA' })
  role: UserRole;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;
}

@Entity('user_tenants')
@Unique(['user_id', 'tenant_id'])
export class UserTenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @Column()
  tenant_id: string;
}
