# prdpx7.github.io

Personal blog. Built with [Hugo](https://gohugo.io/). Deployed to GitHub Pages via GitHub Actions.

## Local development

```
brew install hugo
hugo server -D
```

Site runs at `http://localhost:1313/`. The `-D` flag includes draft posts.

## Writing a new post

```
hugo new content posts/my-new-post.md
```

This creates `content/posts/my-new-post.md` with frontmatter. Edit the file, set `draft: false` when ready to publish.

### Frontmatter

```yaml
---
title: "Post title"
date: 2026-03-14
draft: false
---
```

### Embedding code

Fenced code blocks get syntax highlighting and a copy button automatically.

### Embedding a GitHub gist

```
{{</* gist USERNAME GIST_ID */>}}
```

## Deploy

Push to `master`. GitHub Actions builds and deploys to GitHub Pages automatically.

## Structure

```
hugo.toml            # site config
content/posts/       # blog posts (markdown)
layouts/             # html templates
assets/css/style.css # all styling
static/images/       # images, favicon
```
