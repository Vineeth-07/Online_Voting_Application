# Online Voting Application

It is an Online Voting Application built by using Node.js , it consists of two user roles...
1)Admin 2)Voter

## 1)Admin

- Admin can create multiple elections.
- Each election consist of multiple questions.
- Admin adds the voters by giving voter ID and password.
- After creating questions and voters, admin can launch the election and it provides publicURL where voters can vote through using publicURL.
- At last admin ends the election and checks the results.

## 2)Voter

- Voter visits the publicURL given by the admin.
- Login by using default credentials provided by admin.
- After login voter can be able to vote for the questions and submits the result.

## To Run Locally

- Install postgresql and update your username and password in config.json
- To start the postgresql server

```
sudo service postgresql start
```

- Install dependencies

```
npm install
```

- Create database

```
npx sequlize-cli db:create
```

- Migrate database

```
npx sequlize-cli db:migrate
```

- Run locally at port 3000

```
npm start
```

- Run test cases

```
npm test
```

## Screenshots

![1](https://user-images.githubusercontent.com/112814848/213916221-ec2281dd-00b6-4491-b0ad-614fd2463028.png)
![2](https://user-images.githubusercontent.com/112814848/213916273-329402c0-9f22-422e-b1a7-a3f3e78d7d91.png)
![3](https://user-images.githubusercontent.com/112814848/213916274-1358fdb7-2f31-4f88-b923-902ebbaeee1d.png)
![4](https://user-images.githubusercontent.com/112814848/213916275-d9caec04-61c7-42ca-b2a6-01b411387d0b.png)
![5](https://user-images.githubusercontent.com/112814848/213916278-b4eb2674-c373-44d4-996d-363c923e5300.png)
![6](https://user-images.githubusercontent.com/112814848/213916279-ba72d663-4910-4fe6-b869-d426892a17a3.png)
![7](https://user-images.githubusercontent.com/112814848/213951864-0e02a960-e1ae-4a66-8ee9-636be568a98e.png)
![8](https://user-images.githubusercontent.com/112814848/213916282-d09c4734-88fd-4f1c-9727-ac2a2b343c8f.png)

## Live Application Url

https://vineeth-voting-application.onrender.com

## Demo Video

https://www.loom.com/share/e04991a1008f44da8ac7f6d9f15f1629
