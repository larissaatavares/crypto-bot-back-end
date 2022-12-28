import express from 'express';
import bodyParser from 'body-parser';
import helmet from 'helmet';
const app = express();
app.use(bodyParser.json());
app.use(helmet());
export default app;