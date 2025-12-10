import bcrypt from 'bcrypt';

export class BcryptAdapter {
    static hashPassword( password: string ): string {
        return bcrypt.hashSync( password, 10 );
    }

    static comparePassword( hashedPassword, password ): boolean {
        return bcrypt.compareSync(password, hashedPassword);
    }
}