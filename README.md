# Flemik API

[Application Website](https://www.flemik.com/)

**Test account to demo basic functionalities**:

- user: `githubtest`
- password: `githubtest`

An end-to-end clinical laboratory management software: payment control and test processing with the highest security standards, no matter where you are.

Flemik is the solution that captures data transmitted by a blood chemistry analyzer, encrypts it using the latest encryption technology, and sends it to our server which instantly transforms the analyzer data into understandable text for our clients. You can view this data on our website from any device and even convert it directly into a PDF file with a wide range of customizations to match your laboratory's standards. You can sign and digitally seal the PDF, and if desired, share it directly with the patient.

🛠: [Express](https://expressjs.com/), [Prisma](https://www.prisma.io/), [Socket.IO](https://socket.io/), [Filebase](https://filebase.com/), [NodeMailer](https://nodemailer.com/), [PKG](https://github.com/vercel/pkg),
📚: Self hosted and managed on a [Linode (Dallas, TX)](https://www.linode.com/) instance with [Mongo](https://www.mongodb.com/) Cluster and [Redis](https://redis.io/)
📱: https://github.com/walterdiazesa/medicina-app

# About Linode Instance

Connect to Linode:

```bash
ssh <username>@<api>
```

Display pm2 processes:

```bash
pm2 status
```

Output:
| id | name | namespace | version | mode | pid | uptime | ↺ | status | cpu | mem | user | watching |
|----|----------------|-----------|---------|------|-----|--------|---|--------|------|--------|------|----------|
| 1 | flemik-node | default | N/A | fork | 677 | 4M | 0 | online | 0% | 25.5mb | username | disabled |
| 2 | flemik-mongo-1 | default | N/A | fork | 683 | 4M | 0 | online | 0% | 35.7mb | username | disabled |
| 3 | flemik-mongo-2 | default | N/A | fork | 684 | 4M | 0 | online | 0% | 40.8mb | username | disabled |
| 4 | flemik-mongo-3 | default | N/A | fork | 689 | 4M | 0 | online | 0% | 38.8mb | username | disabled |
| 5 | flemik-redis | default | N/A | fork | 0 | 0 | 15| online| 0% | 0b | username | disabled |

| id  | module        | version | pid | status | ↺   | cpu | mem    | user     |
| --- | ------------- | ------- | --- | ------ | --- | --- | ------ | -------- |
| 0   | pm2-logrotate | 2.7.0   | 666 | online | 0   | 0%  | 34.3mb | username |

Display `X` pm2 env:

```bash
pm2 env <X>
```

Display pm2 conf:

```bash
pm2 conf
```

Output:

```bash
Module: pm2-logrotate
$ pm2 set pm2-logrotate:max_size 10M
$ pm2 set pm2-logrotate:retain 30
$ pm2 set pm2-logrotate:compress true
$ pm2 set pm2-logrotate:dateFormat DD-MM-YYYY_HH-mm-ss
$ pm2 set pm2-logrotate:workerInterval 3600
$ pm2 set pm2-logrotate:rotateInterval 0 0 \* \* \*
$ pm2 set pm2-logrotate:rotateModule true

Module: module-db-v2
$ pm2 set module-db-v2:pm2-logrotate [object Object]
```

Display nginx conf:

```bash
/etc/nginx/sites-available > cat default
```

Display last `X` logs `Y` process:

```bash
pm2 logs <Y> --lines <X>
```

Display MongoDB query:

```bash
mongo --port 2717 // (2717, 2727, 2737) until primary
use flemik
show collections
db.User.find().pretty()
```

Display redis query:

```bash
redis-cli
ping
```
