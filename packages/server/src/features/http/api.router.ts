import { Router } from 'express';

import authRouter from '~/features/auth/auth.router.js';

const apiRouter: Router = Router()
    .use('/', authRouter);

export default apiRouter;
