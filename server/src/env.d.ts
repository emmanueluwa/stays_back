declare global {
  namespace NodeJS {
    interface ProcessEnv {
      CORS_ORIGIN: string;
      NODE_ENV: string;
      COOKIE_NAME: string;
      SESSION_SECRET: string;
      FORGET_PASSWORD_PREFIX: string;
      DATABASE_URL: string;
      REDIS_URL: string;
      PORT: string;
      DATASE_NAME: string;
      DATABASE_HOST: string;
      DATABASE_USERNAME: string;
      DATABASE_PASSWORD: string;
    }
  }
}

export {}
