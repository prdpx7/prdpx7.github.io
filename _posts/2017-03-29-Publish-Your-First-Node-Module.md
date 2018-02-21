---
title: "Publish Your First Node Module"
excerpt: "a small tutorial on node,npm and git"
header:
    overlay_image: "/assets/images/nodejs_header.jpg"
categories:
    - Nodejs 
author_profile: false
---
{% include toc icon="bars" title="Table of Contents"%}
{:toc}

# Publish Your First Node Module 

## Pre-requisite
* Install [Nodejs](https://nodejs.org/en/download/).
* Create an account on [GitHub](https://github.com/) & [NPM](https://www.npmjs.com/signup).
* Basic knowledge of JS & git.

## NPM configuration
After installing nodejs and creating npm account, go to the terminal and run these commands.

```
npm set init.author.name "Pradeep Khileri"
npm set init.author.email "pradeepchoudhary009@gmail.com"
npm set init.author.url "https://prdpx7.github.io"
```

## Let's create our node module
* before naming your module, check if there is already a node module of same name!.
* here our sample node module's objective is to extract json data of python package from pypi registry.

* Create project dir and follow these steps. 
    ```
    mkdir pkgstat #let us name our project 'pkgstat'
    cd pkgstat
    npm init # do as it says and it will create package.json(a configuration file for your node module).
    ```
* Install dependencies for our project.
     we will use `got` module which will be used for making http request and extracting json content from web.
    ```
    npm install --save got # this will be installed locally,used only for current project.  
    ```
* Read more about [installing npm packages globally without sudo](https://github.com/sindresorhus/guides/blob/master/npm-global-without-sudo.md).
* Write the code for our module in `index.js`
    ```js
    'use strict';
    const got = require('got');
    const pypi = "https://pypi.python.org/pypi/pkg_name/json";
    function extractMetaData(jsonData, language){
        var pkgMeta = {};
        if(language == 'python'){
             pkgMeta.name = jsonData.info.name;
            pkgMeta.author = jsonData.info.author;
            pkgMeta.description = jsonData.info.summary;
            pkgMeta.url = jsonData.info.package_url;
            pkgMeta.source = jsonData.info.home_page;
            pkgMeta.license = jsonData.info.license;
            pkgMeta.version = jsonData.info.version;
        }
        pkgMeta.status = 200;
        return pkgMeta;
    }
    function setpkgURL(name,language){
        language = language.toLowerCase();
        var url = "";
        if(language == 'python'){
            url = pypi.replace('pkg_name', name);
        }
        else url = "language not supported"; //'got' will handle invalid http request.
        return url;
    }
    module.exports = (name,language) => {
        const url = setpkgURL(name, language);
        const headers = {'User-Agent':'got node module'};
        return got(url, {json:true, headers})
            .then(resp=>{
                return extractMetaData(resp.body, language);
            })
            .catch(err =>{
                return {status:404};
            })    
    }
    ```

## Writing Test for our Module
* testing is important because otherwise you have to manually test it again and again in node(repl) after making some changes in module.
* other developers can also test your module with `npm test` without headache.
* it's a good habit, so shut up and write tests for your node module.
* you can use [mocha](http://mochajs.org/), [ava](https://github.com/avajs/ava) or any other node testing module.(we will use [ava](https://github.com/avajs/ava)).
    ```
    npm install -g ava
    ava --init #make sure you are in our project directory where our module resides.
    ```
* write your test in `test.js`
    ```js
    import test from 'ava';
    import pkgstat from '.';
    test('cleanslate pkg in python(pip)', async t =>{
        const data = await pkgstat('cleanslate','python');
        t.is(data.author,'Pradeep Khileri');//matching response(since we know the returned json object(data) contents).
    })
    test('somePkgWhichDoesNotExist in SomeLanguageWhichDoesNotExist', async t =>{
        const data = await pkgstat('somePkgWhichDoesNotExist', 'SomeLanguageWhichDoesNotExist');
        t.is(data.status, 404);
    })
    ```
* run this test script.
    ```
    npm test # it will show which test was passed and which one didn't 
    ```
* write documentation for your node module.
    * [guide](https://guides.github.com/features/mastering-markdown/) on writing markdown.
    * write your documentation in readme.md file.
    * [this](https://github.com/prdpx7/pkgstat/blob/master/readme.md) is sample documentation of our node module.
* final project structure(more or less) will look like this.
    ```
    projectDirOfOurNodeModule
    |__node_modules/
    |__readme.md
    |__index.js
    |__test.js
    |__license
    |__package.json
    ```

## Publishing our node module.
* Publish your module to NPM (make sure you're in project directory).
```
npm login 
# fill out username,password and email
npm publish
```
* Create a github repo and push your code.
* you don't want to push `node_modules/` to github because these dependencies will be installed when someone will install your module.
* use tool like [GiG](https://github.com/prdpx7/GiG) for generating .gitignore files for your project.
* [read](https://guides.github.com/activities/hello-world/) more about github.

## Final Note
* this is just a smaller version of `pkgstat` module.
* the full source code of `pkgstat` is [here](https://github.com/prdpx7/pkgstat).
* other useful links -
    * an awesome tutorial on [node](https://github.com/workshopper/learnyounode#learn-you-the-nodejs-for-much-win)
    * more about [npm](https://docs.npmjs.com/getting-started/) 
    * [publishing node modules](https://quickleft.com/blog/creating-and-publishing-a-node-js-module/)
    * [Node Module Patterns](https://darrenderidder.github.io/talks/ModulePatterns/#/)
    * collection of resources on [nodejs](https://github.com/sindresorhus/awesome-nodejs#awesome-nodejs-)
