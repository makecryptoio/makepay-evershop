import bodyParser from 'body-parser';

export default (request: any, response: any, next: any) => {
  bodyParser.raw({ type: '*/*' })(request, response, next);
};
