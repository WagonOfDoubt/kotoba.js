# ことば.js
<p align="center">
  <img src="https://raw.githubusercontent.com/WagonOfDoubt/kotoba.js/master/html/.static/img/kotoba_logo_md.png" alt="kotoba logo"/>
</p>

Yet another imageboard engine written with node.js

This project is in active development. Most things are not implemented, so don’t try to use this in production yet. Pull requests are welcome.

## Core design ideas

Despite the fact that there are many modern imageboard engines, obsolete engines like Wakaba, Kusaba and their forks are still very popular choice even for new imageboards. Those classic engines have minimal, yet sufficient set of features and familiar look. However, they have code that is no longer supported, written for obsolete versions of interpreters, don’t follow commonly accepted standards, have known unfixed bugs, and very hard to maintain. Most of them have HTML that still uses tables for layout and CSS that is not optimized for mobile. Last, but not least, installation and deployment can be a nightmare, especially for unexperienced users, with vague installation instructions and undocumented dependencies.

The goal of this project is to create feature-rich engine that looks and feels very familiar, but does not have the issues of classic imageboard engines. The ease of administration is highest priority. The installation process is automated and just cannot be easier; all customization is accessible through admin panel – no more source files editing for basic configuration. Kotoba.js can be deployed on almost any hosting and works right away out of the box.

Kotoba.js principles:

- Frontend should be compatible with most standard Wakaba/Kusaba based imageboards, therefore third-party code like [Dollchan Extension Tools](https://github.com/SthephanShinkufag/Dollchan-Extension-Tools) and [Overchan-Android](https://github.com/AliceCA/Overchan-Android) require minimal modifications.
- However, third party tools should not be necessary as most of features that they add are implemented in engine itself.
- Templates must generate valid HTML5, use semantic elements and provide machine-readable output as much as possible.
- Basic features like posting and reading should work without JavaScript enabled in browser.
- Containerized application easy to deploy and get up and running. Easiest installation with no special skills required.
- It should be highly customizable and user-friendly.


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
