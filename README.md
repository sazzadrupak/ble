### How to build the backend application with docker
* Go to the project directory (Here the directory is APIs).
* Go to the backend directory.
* Open index.js file.
* In index.js file, go to line number 14. Match your host address with already provided those two (e.g. ['http://192.168.99.100:8080/v1', 'http://127.0.0.1:8080/v1']). If matched, then you are ready to build. If not, append your host address in line 14. 
(N.B. I have got '192.168.99.100' address from my docker toolbox in windows. And I have used '127.0.0.1' for my VM linux ubuntu host.)
* In my host machine, port 8080 is not used by any other services, so I have used it here. Check if 8080 port in your host machine is either free or not. If not then use the free one here in index.js at line 14, in backend->Dockerfile at line 13 and in APIs->docker-compose.yml file at line 12.
* Copy your host address and port (/v1 should not be there), go to api->swagger.yaml file and paste at line no 12 after host: .
* Hopefully the configuration is done. Let's build the backend application.
* Go to terminal. Be in the APIs directory. Run the following command:
```bash
docker-compose up --build
```

Now you will see the both backend and database (postgres) container is being build. I hope, both container has been build and up at this time in your machine.
* When you see the following output in your terminal:
```bash
backend    | Your server is listening on port 8080 (http://localhost:8080)
backend    | Swagger-ui is available on http://localhost:8080/docs
```
That means backend has been successfully build.
* Go to this url: http://localhost:8080/docs. You will see swagger ui. From here you can test the api.
* At this moment, I haven't deployed the project in any cloud server. So you can use the api's in your application like:
1. http://127.0.0.1:8080/v1/beaconRoom
2. http://127.0.0.1:8080/v1/course

N.B. If you faced any difficulties during this configuration and building, just take a screen shot and email me (mdsazzadul.islam@tuni.fi).

### Get into postgres db container DB shell
```bash
docker exec -it postgres psql -h postgres -d beacon_attendance -U TIE --password
```
The password is 'ZAQ!2wsx'

### Backend is also available on heroku.
The link is:
```bash
https://beacon-attendance-tie.herokuapp.com/docs/
```
And use the follwing format to use the api in your application:
```bash
https://beacon-attendance-tie.herokuapp.com/v1/beacon (to GET all beacon)
https://beacon-attendance-tie.herokuapp.com/v1/room (To GET all room)
```
For ajax call, follow the follwing format:
The link is:
```bash
$.ajax({
    url: 'https://beacon-attendance-tie.herokuapp.com/v1/user/login',
    headers: {
        'Content-Type':'application/json',
        "Accept": "*/*",
        "Cache-Control": "no-cache",
        "cache-control": "no-cache"
    },
    async: true,
    crossDomain: true,
    method: 'POST',
    dataType: 'json',
    "processData": false,
    data: JSON.stringify(body),
    success: function(result){
        console.log({result});
    },
    error: function(error) {
        console.log(error.status);
        console.log(error.responseText);
    }
});
```

### RUN the API test
1. use the command
```
docker exec -it backend bash
```
This will let you to get inside the backend container.
2. Run the command in container shell:
```
npm run test:api
```
** right now we have 237 api tests written.

### Run LINT test
1. use the command
```
docker exec -it backend bash
```
This will let you to get inside the backend container.
2. Run the command in container shell:
```
npm run lint
```

### Running Mobile Application

Android apk package for the mobile application can be found at [Android Application](https://course-gitlab.tuni.fi/tie-13106-ble_project/ble/tree/master/mobile-app/ble/releases/android)

To test the mobile application on an iOS device, some special environment is needed. Guide to the setup can be found [here](https://reactnative.dev/docs/getting-started). 
You need to select guideline for 'React Native CLI Quickstart' and choose the Development and Target OS as 'iOS'. 

### Running Web Application
Detailed guideline under web-app directory. /web-app/readme.md
