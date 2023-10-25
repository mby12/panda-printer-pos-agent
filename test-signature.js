const crypto = require('crypto');

const hmac = crypto.createHmac(
  'sha256',
  '96aa9ec42242a9a62196281045705196a64e12b15e9160bbb630e38385b82700e7876fd5cc3a228dad634816f4ec4b80a258b2a5e5d26f30003211bc45e',
);

hmac.update(
  JSON.stringify([
    {
      userId: 1,
      id: 1,
      title: 'delectus aut autem',
      completed: false,
    },
  ]),
);
const signature = hmac.digest('hex');
console.log(signature);
