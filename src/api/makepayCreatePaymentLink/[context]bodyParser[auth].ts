import bodyParser from 'body-parser';

export default (request: any, response: any, next: any) => {
  bodyParser.json({ inflate: false })(request, response, next);
};
