import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const root = process.cwd();
const port = Number(process.env.PORT || 4173);
const mime = {
  '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
  '.glsl':'text/plain; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml',
  '.json':'application/json; charset=utf-8','.woff2':'font/woff2'
};
const server=http.createServer((req,res)=>{
  const url=new URL(req.url || '/',`http://${req.headers.host}`);
  let pathname=decodeURIComponent(url.pathname);
  if(pathname==='/') pathname='/index.html';
  const safe=normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  let file=join(root,safe);
  if(!existsSync(file) || statSync(file).isDirectory()) file=join(root,'index.html');
  res.setHeader('Content-Type',mime[extname(file).toLowerCase()] || 'application/octet-stream');
  res.setHeader('Cache-Control','no-store');
  createReadStream(file).on('error',()=>{res.statusCode=404;res.end('Not found');}).pipe(res);
});
server.listen(port,'127.0.0.1',()=>console.log(`Night Parade: http://127.0.0.1:${port}`));
