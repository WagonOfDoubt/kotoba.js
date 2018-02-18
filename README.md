# ことば.js
<p align="center">
  <img src="https://raw.githubusercontent.com/WagonOfDoubt/kotoba.js/master/html/.static/img/kotoba_logo_md.png" alt="kotoba logo"/>
</p>

Yet another imageboard engine written with node.js

This project is in active development. Almoust nothing implemented yet. Pull requests are welcome.

## Core design ideas

- Fronend should be compatible with most standard wakaba/kusaba based imageboards, therefore third-party code like [Dollchan Extension Tools](https://github.com/SthephanShinkufag/Dollchan-Extension-Tools) should with minimal modifications.
- Templates should generate 100% valid HTML5.
- Basic features like posting and reading should work without javascript enabled in browser
- Conainerized application easy to deploy and get up and running. Easiest installation with no spetial skills required.

## TODO

- [x] posts deletion
- [ ] staff permissions system
- [ ] bans and moderation features
- [ ] autoupdate and notifications
- [x] replies map
- [ ] personal settings stored on server

## License

MIT

## How to run

- install [Docker](https://docker.com/) and [Docker Compose](https://docs.docker.com/compose/install/)
- `git clone https://github.com/WagonOfDoubt/kotoba.js.git`
- `cd kotoba.js`
- `docker-compose up`
- go to [localhost/manage/registration](http://localhost/manage/registration) and create your admin account
- add any news to generate main page, add some boards and tweak other settings, have fun.

Note that kotoba.js will run in development mode. Do not try to use this in production.

## How it works

This containerized application consists of 3 main containers: nginx webserver, node application, and mongo database. Relationships between containers are shown below.

```
+----------------------------------------------------------------------+
|                 +--------------------------------------------------+ |
|                 |                                                  | |
|      +----------+---------+                                        | |
|      |                    |       Saves files to                   | |
|      |  html folder       +<----------------------------+          | |
|      |  (shared volume)   |                             |          | |
|      |                    +------+                      |          | |
|      |                    |      | Serves files from    |          | |
|      +----------+---------+      |                      |          | |
|                 |                V                      |          | |
|                 |         +------+------+        +------+-----+    | |
|                 |         |    Nginx    |        |  Node app  |    | |
<---------------->|<------->|   reverse   |  api   |            |    | |
|     Requests 80 | Port 80 |80  proxy    |requests|            |    | |
<---------------->|<------->|        3000 +<------>+ 3000       |    | |
|                 |         |             |        |            |    | |
|                 |         +-------------+        |    27017   |    | |
|                 |                                +------+-----+    | |
|                 |         +-------------+               ^          | |
|                 |         |   MongoDB   |               |          | |
|                 |         |             |               |          | |
|                 |         |      27017  +<--------------+          | |
|                 |         |             |                          | |
|                 |         |             |                          | |
|                 |         +-------------+                          | |
|                 |Docker                                            | |
|Docker Host      +--------------------------------------------------+ |
+----------------------------------------------------------------------+

```

The main node app handles api requests, modifies database and generates static html files which are saved to `/html` folder and served to end user by nginx webserver.
