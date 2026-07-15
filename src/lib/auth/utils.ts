import bcrypt from "bcryptjs";

export const bcryptjs = {
  hash: async (password: string, saltRounds: number): Promise<string> => {
    return bcrypt.hash(password, saltRounds);
  },
  compare: async (password: string, hash: string): Promise<boolean> => {
    return bcrypt.compare(password, hash);
  },
};