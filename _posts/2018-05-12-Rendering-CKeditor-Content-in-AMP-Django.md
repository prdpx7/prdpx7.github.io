---
title: "Rendering CKeditor content in AMP page in Django"
excerpt: "all thanks to django template filter"
header:
    overlay_image: "/assets/images/header.jpg"
categories:
    - Django
author_profile: true
---
{% include toc icon="bars" title="Table of Contents"%}
{:toc}

## Prelude
So our team is struggling with CKEditor, not because it's used heavily for publishing blog pages in our product but because it renders html which can't be used for amp page.

## AMP
You know AMP right? the thing that google created so that your page loads faster in mobile.<br/>
The problem is that,  An amp page have limited html tags, no inline style and [other weird rules](https://www.ampproject.org/learn/overview/).

Suppose you have to render your blog content with django template engine, this is how you'll do generally
```html
{% raw %}
<html>
    <head>
        <!--
        https://www.ampproject.org/docs/fundamentals/discovery 
        !-->
        <link href="https://some-random-blog.com/the-blog-post/" rel="canonical"/>
        <title>{{blog.title}}</title>
    </head>
    <body>
        <h3>{{blog.title}}</h3>
        <div class="blog-short-description">
            {{blog.short_description}}
        </div>
        <div class="blog-content">
            <!-- this is the blog content written by content writer !-->
            {{blog.content|safe}}
        </div>
    </body>
</html>
{% endraw %}
```
## Problem
Now the thing is our blog's content which is written by some content writer who is using ckeditor, will render perfectly in normal webpages.<br/>
But for an amp page, we have to change html content of that particular blog which is in Database, so how could we do that?

Also CKEditor don't have any amp plugins otherwise i won't be writing this post!

## Our Solution
So what we did is created a custom django template filter for all our amp pages, which will convert our blog's content into amp compatible html.

So here it is:
{% gist prdpx7/f67ce628558b7872d6040aa25f75a292 %}

So to use this in amp page we will do just this
```html
{% raw %}
{% load ampconvert %}
<html>
    <head>
        <!--
        https://www.ampproject.org/docs/fundamentals/discovery 
        !-->
        <link href="https://some-random-blog.com/the-blog-post/" rel="canonical"/>
        <title>{{blog.title}}</title>
    </head>
    <body>
        <h3>{{blog.title}}</h3>
        <div class="blog-short-description">
            {{blog.short_description}}
        </div>
        <div class="blog-content">
            {{blog.content|ampconvert|safe}}
        </div>
    </body>
</html>
{% endraw %}
```
It's not a perfect solution but since there isn't any solution around we are going with it.

Before implementing, you might want to read some official [docs](https://docs.djangoproject.com/en/2.0/howto/custom-template-tags/).
