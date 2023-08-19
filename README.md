# Flemik API

[Application Website](https://www.flemik.com/)

**Test account to demo basic functionalities**:

- user: `githubtest`
- password: `githubtest`

An end-to-end clinical laboratory management software: payment control and test processing with the highest security standards, no matter where you are.

Flemik is the solution that captures data transmitted by a blood chemistry analyzer, encrypts it using the latest encryption technology, and sends it to our server which instantly transforms the analyzer data into understandable text for our clients. You can view this data on our website from any device and even convert it directly into a PDF file with a wide range of customizations to match your laboratory's standards. You can sign and digitally seal the PDF, and if desired, share it directly with the patient.

🛠: [Express](https://expressjs.com/), [Prisma](https://www.prisma.io/), [Socket.IO](https://socket.io/), [Filebase](https://filebase.com/), [NodeMailer](https://nodemailer.com/), [PKG](https://github.com/vercel/pkg),

📚: Self hosted, managed by CI/CD on a [Linode (Dallas, TX)](https://www.linode.com/) instance with [Mongo](https://www.mongodb.com/) Cluster and [Redis](https://redis.io/)

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

# Application Flow

- The tests will automatically be captured from the same network of the chemistry analyzer thanks to the **Chemistry analyzer listener**, then processed, and they will appear on the "`Exámenes`" tab with a pulse dot to indicate you have a new incoming test, without requiring manual refresh or interaction.
- You can be the owner of many laboratories, and be an employee for many others
- The employees of your laboratory/ies can be employees of other laboratories as well
- There are 3 different account privileges, each account consists of a combination of these privileges for each laboratory, **owner**, **manager** and **employee**

* Flemik is fully compatible with all different screen sizes

https://github.com/walterdiazesa/medicina-app/assets/58494087/08000692-9dc2-427b-b875-160138e8034b

### 1- Create an account for your laboratory, and wait for your **Chemistry analyzer listener** to be ready (just a couple seconds)

[RegisterLab](https://github.com/walterdiazesa/medicina-app/assets/58494087/16811726-e922-4c72-a7ac-1e9cfa52b2b5)

The [quick-start page](https://www.flemik.com/quick-start) will guide you on how to use the listener and platform

<img width="1728" alt="image" src="https://github.com/walterdiazesa/medicina-app/assets/58494087/1bd7c225-68bd-4c23-8900-296ace0f0d42">

### 2- Go to your laboratory settings page, and add employees to your laboratory

(You can also manage personalization settings for the laboratory from there, as well as uploading your laboratory stamp and signature)

- If the employee already has an account on the platform, it will be immediately added to your employee list, you can assign them manager privileges for your laboratory if you wish
- If the employee is not registered on the platform yet, it will receive a mail to direct them to the employee registration page (2.1), you will see the user's status as "`Pending from registration`"

[AddEmployees](https://github.com/walterdiazesa/medicina-app/assets/58494087/8ac45eb5-5e6e-4fca-8971-f4d834fd844d)

### 2.1- If you're a new employee on the platform you will receive an email invitation for the laboratory

<img width="1404" alt="image" src="https://github.com/walterdiazesa/medicina-app/assets/58494087/8fa53753-c553-44d1-b12b-7a2d965abd0e">

[RegisterAsEmployee](https://github.com/walterdiazesa/medicina-app/assets/58494087/fdc269bd-b3da-41b6-9b80-67435d99df6c)

Now you have 2 different listeners, one for each laboratory of which you're an employee/owner, you will also gain access to the tests of each laboratory you're related with

<img width="1728" alt="image" src="https://github.com/walterdiazesa/medicina-app/assets/58494087/19fad2fd-afd8-4cd7-bb89-76c6f37603f6">

If the laboratory assign you **Manager privileges** you will unlock a tab for "`Laboratorios`", in which you have in display all the laboratories' settings you're in charge of

<img width="1728" alt="image" src="https://github.com/walterdiazesa/medicina-app/assets/58494087/75d5d65f-6001-4736-b33a-69572603866c">

### 3- Add patients

You can create (or find) your patients either on the "`Pacientes`" tab or you can create them (or assign the patient's test) directly on the page of an specific test

[AddPatients](https://github.com/walterdiazesa/medicina-app/assets/58494087/6aafc5fb-d0e0-4e27-87ec-ceac1be2b99e)

### 4- Update test data, add observations, validate the test, print PDF, and send the link to the client's email

- An employee is required to verify a test by ensuring that all the values on the chemistry analyzer are properly calibrated. You have the option to personally validate the test on the test page or (if you have manager or owner privileges) to delegate this task to another colleague.

[RequestTestValidation](https://github.com/walterdiazesa/medicina-app/assets/58494087/788b1760-c742-45bb-94ab-561f7c8a5d5d)

- The employee will receive an email containing the test data, allowing them to perform the validation remotely without needing to log in to the platform. Alternatively, they can access a link to view and validate the test on the platform if they prefer.

<img width="1411" alt="image" src="https://github.com/walterdiazesa/medicina-app/assets/58494087/7b7dc50a-7279-4e58-9fb2-19dfc9ac3e55">

[ValidateTest](https://github.com/walterdiazesa/medicina-app/assets/58494087/e2b898f2-e394-4840-8c38-be9a5a5c9bbf)

- Assign the corresponding patient of the test to unlock the PDF

[UpdateTestData](https://github.com/walterdiazesa/medicina-app/assets/58494087/2d96cbef-76c2-43bc-b815-c3e9a6cdcc77)

The PDF can be seen without requiring any form of storage or authentication, using either the QR code or the [magic link](https://flemik.com/test/631fa6c48a24419e13859a35?access=ZUh1SFgzclJUTGckOG1MWHlWZ3BoQW8)

- If your laboratory has signature and/or stamp setup, you will also see it in the PDF

<img width="304" alt="image" src="https://github.com/walterdiazesa/medicina-app/assets/58494087/811916d2-1e73-457d-a2a7-692f77992062">

# Vitals

<img width="1237" alt="image" src="https://github.com/walterdiazesa/medicina-app/assets/58494087/bae70d19-9ec7-4a84-bdcb-c9e7ad53e097">
<img width="976" alt="image" src="https://github.com/walterdiazesa/medicina-app/assets/58494087/08dea4a8-8cb5-4e35-b7ce-2dcaf92b198d">
<img width="979" alt="image" src="https://github.com/walterdiazesa/medicina-app/assets/58494087/b2e34b0c-3da5-4f0e-a2a4-1687424d203e">
